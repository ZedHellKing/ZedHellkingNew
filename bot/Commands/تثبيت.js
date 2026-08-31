const fs = require("fs");
const path = require("path");
const {
  changeGroupImage,
  readGroupImage,
} = require("./تثبيت/groupImage");

const dataDir = path.join(__dirname, "..", "data", "pinned-images");
const statePath = path.join(__dirname, "..", "data", "pinned-images.json");
const applying = new Set();
const suppressEvents = new Map();
const imageMonitors = new Map();
const monitorChecks = new Set();
const monitorErrors = new Set();
const restoreTimers = new Map();
const imageBaselines = new Map();
const pinnedImages = loadState();
const STOP_MESSAGES = new Set(["تثبيت ايقاف", "تثبيت إيقاف"]);
const RESTORE_DELAY = 4000;
const IMAGE_CHECK_INTERVAL = 2000;

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (!state || typeof state !== "object") return {};

    // الصور المحفوظة لا تعني أن الحماية يجب أن تبدأ بعد إعادة تشغيل البوت.
    // يجب على المستخدم كتابة "تثبيت" من جديد لبدء جلسة حماية جديدة.
    return Object.fromEntries(
      Object.entries(state).map(([threadID, config]) => [
        threadID,
        config && typeof config === "object"
          ? { ...config, active: false }
          : config,
      ]),
    );
  } catch (_) {
    return {};
  }
}

function saveState() {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(pinnedImages, null, 2));
}

function getReplyImage(event) {
  const reply = event && event.messageReply;
  const attachments =
    reply && Array.isArray(reply.attachments) ? reply.attachments : [];
  return attachments.find(
    (attachment) =>
      attachment &&
      (attachment.type === "photo" || attachment.type === "image") &&
      (attachment.url || attachment.largePreviewUrl || attachment.previewUrl),
  );
}

function imageURL(attachment) {
  return attachment.url || attachment.largePreviewUrl || attachment.previewUrl;
}

function imagePath(threadID) {
  return path.join(dataDir, `${threadID.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`);
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

function stopImageMonitor(threadID) {
  const monitor = imageMonitors.get(threadID);
  if (monitor) clearInterval(monitor);
  imageMonitors.delete(threadID);
  monitorChecks.delete(threadID);
  monitorErrors.delete(threadID);
  imageBaselines.delete(threadID);
  clearRestoreTimer(threadID);
}

function clearRestoreTimer(threadID) {
  const restoreTimer = restoreTimers.get(threadID);
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimers.delete(threadID);
}

function isPinActive(config) {
  return Boolean(config && config.active !== false);
}

function scheduleRestore(api, threadID, reason) {
  if (!isPinActive(pinnedImages[threadID])) return;
  clearRestoreTimer(threadID);

  console.log(
    `[تثبيت] رُصد تغيير صورة المجموعة ${threadID} — الإرجاع بعد 4 ثوانٍ...`,
  );
  const timer = setTimeout(async () => {
    if (restoreTimers.get(threadID) !== timer) return;
    restoreTimers.delete(threadID);

    try {
      if (!isPinActive(pinnedImages[threadID])) return;
      await applyPinnedImage(api, threadID, reason);
      await updateImageBaseline(api, threadID);
    } catch (error) {
      console.error(`[تثبيت] فشل إرجاع الصورة:`, error.message || error);
    }
  }, RESTORE_DELAY);
  restoreTimers.set(threadID, timer);
}

async function updateImageBaseline(api, threadID) {
  const image = await readGroupImage(api, threadID);
  if (image) imageBaselines.set(threadID, image);
  return image;
}

function startImageMonitor(api, threadID) {
  if (!threadID || imageMonitors.has(threadID)) return;

  const monitor = setInterval(async () => {
    if (!isPinActive(pinnedImages[threadID])) {
      stopImageMonitor(threadID);
      return;
    }
    if (monitorChecks.has(threadID) || applying.has(threadID)) return;

    monitorChecks.add(threadID);
    try {
      const currentImage = await readGroupImage(api, threadID);
      if (!currentImage) return;

      const baseline = imageBaselines.get(threadID);
      if (baseline === undefined) {
        imageBaselines.set(threadID, currentImage);
      } else if (currentImage !== baseline) {
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

async function applyPinnedImage(api, threadID, reason) {
  const config = pinnedImages[threadID];
  if (!isPinActive(config) || !config.path || applying.has(threadID)) return false;
  if (!fs.existsSync(config.path)) {
    console.error(`[تثبيت] ملف الصورة مفقود في ${threadID}`);
    return false;
  }

  applying.add(threadID);
  suppressEvents.set(threadID, Date.now() + 8000);
  try {
    await changeGroupImage(api, config.path, threadID);
    console.log(
      `[تثبيت] ✅ أُعيدت صورة المجموعة ${threadID}${reason ? ` (${reason})` : ""}`,
    );
    return true;
  } finally {
    applying.delete(threadID);
  }
}

module.exports = {
  name: "تثبيت",

  async execute(api, event) {
    const threadID = String(event.threadID || "");
    const body = (event.body || "").trim();
    if (!threadID) return;

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

    const attachment = getReplyImage(event);
    if (!attachment) {
      await api.sendMessage("⚠️ يجب الرد على صورة ثم كتابة: تثبيت", threadID);
      return;
    }

    const savedPath = imagePath(threadID);
    try {
      await api.sendMessage("⏳ جاري تثبيت الصورة كصورة للمجموعة...", threadID);
      await downloadImage(imageURL(attachment), savedPath);
      pinnedImages[threadID] = {
        path: savedPath,
        sourceMessageID: event.messageReply.messageID || null,
        updatedAt: new Date().toISOString(),
        active: true,
      };
      saveState();
      await applyPinnedImage(api, threadID, "تثبيت جديد");
      await updateImageBaseline(api, threadID).catch(() => {});
      startImageMonitor(api, threadID);
      await api.sendMessage(
        "✅ تم تثبيت الصورة كصورة للمجموعة.\n🛡️ الحماية مفعّلة — إذا غيّرها أحد ستعود تلقائياً.",
        threadID,
      );
    } catch (error) {
      delete pinnedImages[threadID];
      try {
        if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
      } catch (_) {}
      console.error("[تثبيت] خطأ:", error.message || error);
      await api.sendMessage(
        `❌ تعذر تثبيت الصورة: ${error.message || "خطأ غير معروف"}`,
        threadID,
      );
    }
  },

  handleGroupImageEvent(api, event) {
    const threadID = String(event.threadID || "");
    const config = pinnedImages[threadID];
    if (!isPinActive(config)) return;

    const suppressedUntil = suppressEvents.get(threadID) || 0;
    if (Date.now() < suppressedUntil) return;

    scheduleRestore(api, threadID, "تغيير مرصود");
  },

  async resumeAll(api) {
    for (const threadID of Object.keys(pinnedImages)) {
      if (!isPinActive(pinnedImages[threadID])) continue;
      // عند إعادة اتصال MQTT داخل نفس الجلسة لا نغيّر الصورة تلقائياً؛
      // نعيد تشغيل المراقب فقط. أما بعد إغلاق/فتح البوت فـ loadState
      // يجعل كل الصور غير مفعّلة حتى يكتب المستخدم "تثبيت" من جديد.
      startImageMonitor(api, threadID);
    }
  },
};
