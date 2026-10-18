const fs = require("fs");
const path = require("path");
const {
  changeGroupImage: defaultChangeGroupImage,
  readGroupImage: defaultReadGroupImage,
} = require("./تثبيت/groupImage");

const DEFAULT_DATA_DIR = path.join(__dirname, "..", "data", "pinned-images");
const DEFAULT_STATE_PATH = path.join(__dirname, "..", "data", "pinned-images.json");
const STOP_MESSAGES = new Set(["تثبيت ايقاف", "تثبيت إيقاف"]);
const RESTORE_DELAY = 4000;
const IMAGE_CHECK_INTERVAL = 2000;

function loadState(statePath) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (!state || typeof state !== "object" || Array.isArray(state)) return {};
    return state;
  } catch (_) {
    return {};
  }
}

function imageURL(attachment) {
  return (
    attachment.url ||
    attachment.largePreviewUrl ||
    attachment.previewUrl ||
    attachment.thumbnailUrl
  );
}

function imageFingerprint(image) {
  try {
    const url = new URL(image);
    return `${url.hostname}${url.pathname}`;
  } catch (_) {
    return String(image);
  }
}

async function downloadImage(url, destination) {
  if (typeof fetch !== "function") {
    throw new Error("إصدار Node.js الحالي لا يدعم تنزيل الصور");
  }

  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`فشل تنزيل الصورة (${response.status})`);

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 15 * 1024 * 1024) {
    throw new Error("حجم الصورة أكبر من 15 ميجابايت");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("الصورة فارغة");
  if (bytes.length > 15 * 1024 * 1024) {
    throw new Error("حجم الصورة أكبر من 15 ميجابايت");
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}

function createPinCommand(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const statePath = options.statePath || DEFAULT_STATE_PATH;
  const downloadImageImpl = options.downloadImage || downloadImage;
  const changeImage = options.changeGroupImage || defaultChangeGroupImage;
  const readImage = options.readGroupImage || defaultReadGroupImage;
  const setTimeoutImpl = options.setTimeout || setTimeout;
  const clearTimeoutImpl = options.clearTimeout || clearTimeout;
  const setIntervalImpl = options.setInterval || setInterval;
  const clearIntervalImpl = options.clearInterval || clearInterval;
  const now = options.now || Date.now;

  const applying = new Set();
  const suppressEvents = new Map();
  const imageMonitors = new Map();
  const monitorChecks = new Set();
  const monitorErrors = new Set();
  const monitorEmptyResults = new Set();
  const restoreTimers = new Map();
  const imageBaselines = new Map();
  const pinnedImages = loadState(statePath);

  function saveState() {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(pinnedImages, null, 2));
      fs.renameSync(temporaryPath, statePath);
    } catch (error) {
      try {
        if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      } catch (_) {}
      throw error;
    }
  }

  function imagePath(threadID) {
    return path.join(dataDir, `${threadID.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`);
  }

  function clearRestoreTimer(threadID) {
    if (!restoreTimers.has(threadID)) return;
    clearTimeoutImpl(restoreTimers.get(threadID));
    restoreTimers.delete(threadID);
  }

  function isPinActive(config) {
    return Boolean(config && config.active !== false);
  }

  function stopImageMonitor(threadID) {
    if (imageMonitors.has(threadID)) {
      clearIntervalImpl(imageMonitors.get(threadID));
    }
    imageMonitors.delete(threadID);
    monitorChecks.delete(threadID);
    monitorErrors.delete(threadID);
    monitorEmptyResults.delete(threadID);
    imageBaselines.delete(threadID);
    clearRestoreTimer(threadID);
  }

  function stopPin(threadID) {
    const config = pinnedImages[threadID];
    if (!config) return false;

    stopImageMonitor(threadID);
    delete pinnedImages[threadID];
    suppressEvents.delete(threadID);
    saveState();
    try {
      if (config.path && fs.existsSync(config.path)) fs.unlinkSync(config.path);
    } catch (error) {
      console.error(
        `[تثبيت] تعذر حذف الصورة المحفوظة في ${threadID}:`,
        error.message || error,
      );
    }
    return true;
  }

  async function getReplyImage(api, event) {
    const reply = event && event.messageReply;
    const attachments =
      reply && Array.isArray(reply.attachments) ? reply.attachments : [];
    const attachment = attachments.find(
      (item) =>
        item &&
        (item.type === "photo" || item.type === "image") &&
        (imageURL(item) || item.ID || item.fbid || item.id),
    );
    if (!attachment) return null;

    let url = imageURL(attachment);
    const photoID = attachment.ID || attachment.fbid || attachment.id;
    if (!url && photoID && typeof api.resolvePhotoUrl === "function") {
      url = await api.resolvePhotoUrl(String(photoID));
    }
    if (!url) {
      throw new Error("تعذر استخراج رابط الصورة من رسالة الرد.");
    }
    return { attachment, url: String(url) };
  }

  async function updateImageBaseline(api, threadID) {
    const image = await readImage(api, threadID);
    if (!image) {
      imageBaselines.set(threadID, null);
      return null;
    }

    const fingerprint = imageFingerprint(image);
    imageBaselines.set(threadID, fingerprint);
    const config = pinnedImages[threadID];
    if (config && config.imageFingerprint !== fingerprint) {
      config.imageFingerprint = fingerprint;
      saveState();
    }
    return image;
  }

  async function applyPinnedImage(api, threadID, reason) {
    const config = pinnedImages[threadID];
    if (!isPinActive(config) || !config.path || applying.has(threadID)) return false;
    if (!fs.existsSync(config.path)) {
      console.error(`[تثبيت] ملف الصورة مفقود في ${threadID}`);
      return false;
    }

    applying.add(threadID);
    suppressEvents.set(threadID, now() + 2000);
    try {
      await changeImage(api, config.path, threadID);
      console.log(
        `[تثبيت] ✅ أُعيدت صورة المجموعة ${threadID}${reason ? ` (${reason})` : ""}`,
      );
      return true;
    } finally {
      applying.delete(threadID);
    }
  }

  function scheduleRestore(api, threadID, reason, resetTimer = false) {
    if (!isPinActive(pinnedImages[threadID])) return;

    // فحوصات المراقبة تتكرر كل ثانيتين؛ لا تسمح لها بتأجيل مؤقت الأربع ثواني.
    if (restoreTimers.has(threadID) && !resetTimer) return;
    clearRestoreTimer(threadID);

    console.log(
      `[تثبيت] رُصد تغيير صورة المجموعة ${threadID} — الإرجاع بعد 4 ثوانٍ...`,
    );
    const timer = setTimeoutImpl(async () => {
      if (restoreTimers.get(threadID) !== timer) return;
      restoreTimers.delete(threadID);

      try {
        if (!isPinActive(pinnedImages[threadID])) return;
        const restored = await applyPinnedImage(api, threadID, reason);
        if (restored) await updateImageBaseline(api, threadID);
      } catch (error) {
        console.error(`[تثبيت] فشل إرجاع الصورة:`, error.message || error);
      }
    }, RESTORE_DELAY);
    restoreTimers.set(threadID, timer);
  }

  function startImageMonitor(api, threadID) {
    if (!threadID || imageMonitors.has(threadID)) return;

    const monitor = setIntervalImpl(async () => {
      if (!isPinActive(pinnedImages[threadID])) {
        stopImageMonitor(threadID);
        return;
      }
      if (monitorChecks.has(threadID) || applying.has(threadID)) return;

      monitorChecks.add(threadID);
      try {
        const currentImage = await readImage(api, threadID);
        if (!currentImage) {
          const baseline = imageBaselines.get(threadID);
          if (baseline !== undefined && baseline !== null) {
            scheduleRestore(api, threadID, "حذف مرصود");
          } else if (!monitorEmptyResults.has(threadID)) {
            console.warn(
              `[تثبيت] فحص صورة المجموعة ${threadID} لم يُرجع رابط صورة صالحاً`,
            );
            monitorEmptyResults.add(threadID);
          }
          return;
        }

        const currentFingerprint = imageFingerprint(currentImage);
        const baseline = imageBaselines.get(threadID);
        if (baseline === undefined) {
          const savedFingerprint =
            pinnedImages[threadID].imageFingerprint || null;
          imageBaselines.set(threadID, savedFingerprint);
          if (!savedFingerprint || currentFingerprint !== savedFingerprint) {
            scheduleRestore(api, threadID, "تغيير مرصود");
          }
        } else if (baseline === null || currentFingerprint !== baseline) {
          scheduleRestore(api, threadID, "تغيير مرصود");
        }
        monitorErrors.delete(threadID);
        monitorEmptyResults.delete(threadID);
      } catch (error) {
        if (!monitorErrors.has(threadID)) {
          console.error(
            `[تثبيت] تعذر فحص صورة المجموعة ${threadID}:`,
            error.message || error,
          );
          monitorErrors.add(threadID);
        }
      } finally {
        monitorChecks.delete(threadID);
      }
    }, IMAGE_CHECK_INTERVAL);

    imageMonitors.set(threadID, monitor);
  }

  async function execute(api, event) {
    const threadID = String(event.threadID || "");
    const body = (event.body || "").trim();
    if (!threadID) return;

    if (event.isGroup === false) {
      await api.sendMessage("⚠️ استخدم أمر تثبيت داخل المجموعة.", threadID);
      return;
    }

    if (STOP_MESSAGES.has(body)) {
      if (stopPin(threadID)) {
        await api.sendMessage(
          "✅ تم إيقاف تثبيت الصورة وإلغاء الحماية.",
          threadID,
        );
      } else {
        await api.sendMessage(
          "⚠️ لا توجد صورة مثبتة في هذه المجموعة.",
          threadID,
        );
      }
      return;
    }

    let replyImage;
    try {
      replyImage = await getReplyImage(api, event);
    } catch (error) {
      console.error("[تثبيت] تعذر قراءة الصورة المردود عليها:", error.message || error);
      await api.sendMessage(`❌ تعذر قراءة الصورة: ${error.message || "خطأ غير معروف"}`, threadID);
      return;
    }
    if (!replyImage) {
      await api.sendMessage("⚠️ أرسل صورة في المجموعة، ثم ردّ عليها بكلمة: تثبيت", threadID);
      return;
    }

    const savedPath = imagePath(threadID);
    try {
      await api.sendMessage("⏳ جاري تثبيت الصورة كصورة للمجموعة...", threadID);
      await downloadImageImpl(replyImage.url, savedPath);
      pinnedImages[threadID] = {
        path: savedPath,
        sourceMessageID: event.messageReply.messageID || null,
        updatedAt: new Date().toISOString(),
        active: true,
      };
      saveState();

      const applied = await applyPinnedImage(api, threadID, "تثبيت جديد");
      if (!applied) throw new Error("تعذر تطبيق الصورة على المجموعة");

      try {
        await updateImageBaseline(api, threadID);
      } catch (error) {
        console.error("[تثبيت] تعذر قراءة صورة المجموعة بعد التثبيت:", error.message || error);
      }
      startImageMonitor(api, threadID);
      await api.sendMessage(
        "✅ تم تثبيت الصورة كصورة للمجموعة.\n🛡️ ستعود بعد 4 ثوانٍ إذا غيّرها أحد أو حذفها.",
        threadID,
      );
    } catch (error) {
      delete pinnedImages[threadID];
      try {
        if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
      } catch (_) {}
      try {
        saveState();
      } catch (saveError) {
        console.error("[تثبيت] تعذر حفظ حالة الإيقاف بعد الخطأ:", saveError.message || saveError);
      }
      console.error("[تثبيت] خطأ:", error.message || error);
      await api.sendMessage(
        `❌ تعذر تثبيت الصورة: ${error.message || "خطأ غير معروف"}`,
        threadID,
      );
    }
  }

  function handleGroupImageEvent(api, event) {
    const threadID = String(event.threadID || "");
    const config = pinnedImages[threadID];
    if (!threadID || !isPinActive(config) || applying.has(threadID)) return;

    const logData = event.logMessageData || {};
    const actorID = String(
      event.senderID ||
        event.author ||
        logData.actorFbId ||
        logData.actor_fbid ||
        "",
    );
    const botID =
      typeof api.getCurrentUserID === "function"
        ? String(api.getCurrentUserID() || "")
        : "";
    if (actorID && botID && actorID === botID) return;

    const suppressedUntil = suppressEvents.get(threadID) || 0;
    if (now() < suppressedUntil) return;
    scheduleRestore(api, threadID, "تغيير مرصود", true);
  }

  async function resumeAll(api) {
    for (const threadID of Object.keys(pinnedImages)) {
      const config = pinnedImages[threadID];
      if (!isPinActive(config)) continue;

      stopImageMonitor(threadID);
      const savedFingerprint = config.imageFingerprint || null;
      imageBaselines.set(threadID, savedFingerprint);

      try {
        const currentImage = await readImage(api, threadID);
        if (!currentImage) {
          scheduleRestore(api, threadID, "استعادة بعد الاتصال");
        } else {
          const currentFingerprint = imageFingerprint(currentImage);
          if (!savedFingerprint || currentFingerprint !== savedFingerprint) {
            scheduleRestore(api, threadID, "استعادة بعد الاتصال");
          }
        }
      } catch (error) {
        console.error(
          `[تثبيت] تعذر التحقق من صورة المجموعة عند الاتصال ${threadID}:`,
          error.message || error,
        );
        if (!savedFingerprint) {
          scheduleRestore(api, threadID, "استعادة صورة محفوظة");
        }
      }
      startImageMonitor(api, threadID);
    }
  }

  return {
    name: "تثبيت",
    execute,
    handleGroupImageEvent,
    resumeAll,
  };
}

module.exports = createPinCommand();
module.exports.createPinCommand = createPinCommand;
