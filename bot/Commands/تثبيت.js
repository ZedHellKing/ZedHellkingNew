const fs = require("fs");
const path = require("path");
const {
  changeGroupImage: defaultChangeGroupImage,
  readGroupImage: defaultReadGroupImage,
} = require("./تثبيت/groupImage");

const DEFAULT_DATA_DIR = path.join(__dirname, "..", "data", "pinned-images");
const STOP_MESSAGES = new Set(["تثبيت ايقاف", "تثبيت إيقاف"]);
const RESTORE_DELAY = 4000;
const IMAGE_CHECK_INTERVAL = 2000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

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
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("حجم الصورة أكبر من 15 ميجابايت");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("الصورة فارغة");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("حجم الصورة أكبر من 15 ميجابايت");
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}

function removeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error("[تثبيت] تعذر حذف الصورة المؤقتة:", error.message || error);
  }
}

function createPinCommand(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  const downloadImageImpl = options.downloadImage || downloadImage;
  const changeImage = options.changeGroupImage || defaultChangeGroupImage;
  const readImage = options.readGroupImage || defaultReadGroupImage;
  const setTimeoutImpl = options.setTimeout || setTimeout;
  const clearTimeoutImpl = options.clearTimeout || clearTimeout;
  const setIntervalImpl = options.setInterval || setInterval;
  const clearIntervalImpl = options.clearInterval || clearInterval;
  const now = options.now || Date.now;

  // الحالة في الذاكرة فقط: تختفي تلقائياً عند فصل البوت أو إعادة تشغيله.
  const pins = new Map();
  const baselines = new Map();
  const applying = new Set();
  const suppressEvents = new Map();
  const imageMonitors = new Map();
  const monitorChecks = new Set();
  const monitorErrors = new Set();
  const restoreTimers = new Map();

  function imagePath(threadID) {
    return path.join(dataDir, `${threadID.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`);
  }

  function clearRestoreTimer(threadID) {
    if (!restoreTimers.has(threadID)) return;
    clearTimeoutImpl(restoreTimers.get(threadID));
    restoreTimers.delete(threadID);
  }

  function stopImageMonitor(threadID) {
    if (imageMonitors.has(threadID)) {
      clearIntervalImpl(imageMonitors.get(threadID));
    }
    imageMonitors.delete(threadID);
    monitorChecks.delete(threadID);
    monitorErrors.delete(threadID);
  }

  function forgetPin(threadID) {
    const pin = pins.get(threadID);
    if (!pin) return false;

    stopImageMonitor(threadID);
    clearRestoreTimer(threadID);
    pins.delete(threadID);
    baselines.delete(threadID);
    suppressEvents.delete(threadID);
    removeFile(pin.path);
    return true;
  }

  function stopAll() {
    for (const threadID of [...pins.keys()]) forgetPin(threadID);
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
    baselines.set(threadID, image ? imageFingerprint(image) : null);
    return image;
  }

  async function applyPinnedImage(api, threadID, reason) {
    const pin = pins.get(threadID);
    if (!pin || applying.has(threadID)) return false;
    if (!fs.existsSync(pin.path)) {
      console.error(`[تثبيت] ملف الصورة مفقود في ${threadID}`);
      return false;
    }

    applying.add(threadID);
    suppressEvents.set(threadID, now() + 2000);
    try {
      await changeImage(api, pin.path, threadID);
      console.log(
        `[تثبيت] ✅ أُعيدت صورة المجموعة ${threadID}${reason ? ` (${reason})` : ""}`,
      );
      return true;
    } finally {
      applying.delete(threadID);
    }
  }

  function scheduleRestore(api, threadID, reason, resetTimer = false) {
    if (!pins.has(threadID)) return;

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
        if (!pins.has(threadID)) return;
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
      if (!pins.has(threadID)) {
        stopImageMonitor(threadID);
        return;
      }
      if (monitorChecks.has(threadID) || applying.has(threadID)) return;

      monitorChecks.add(threadID);
      try {
        const currentImage = await readImage(api, threadID);
        const baseline = baselines.get(threadID) || null;
        if (!currentImage) {
          if (baseline) scheduleRestore(api, threadID, "حذف مرصود");
        } else if (imageFingerprint(currentImage) !== baseline) {
          scheduleRestore(api, threadID, "تغيير مرصود");
        }
        monitorErrors.delete(threadID);
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
      if (forgetPin(threadID)) {
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
      pins.set(threadID, {
        path: savedPath,
        sourceMessageID: event.messageReply.messageID || null,
      });

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
      forgetPin(threadID);
      removeFile(savedPath);
      console.error("[تثبيت] خطأ:", error.message || error);
      await api.sendMessage(
        `❌ تعذر تثبيت الصورة: ${error.message || "خطأ غير معروف"}`,
        threadID,
      );
    }
  }

  function handleGroupImageEvent(api, event) {
    const threadID = String(event.threadID || "");
    if (!threadID || !pins.has(threadID) || applying.has(threadID)) return;

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

  return {
    name: "تثبيت",
    execute,
    handleGroupImageEvent,
    stopAll,
  };
}

module.exports = createPinCommand();
module.exports.createPinCommand = createPinCommand;
