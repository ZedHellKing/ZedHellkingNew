const fs = require("fs");
const path = require("path");
const { changeGroupImage } = require("../lib/groupImage");

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
const IMAGE_CHECK_INTERVAL = 1000;
const RESTORE_DELAY = 3000;

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return state && typeof state === "object" ? state : {};
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

  const restoreTimer = restoreTimers.get(threadID);
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimers.delete(threadID);
}

async function readCurrentImage(api, threadID) {
  if (!api || typeof api.getThreadInfo !== "function") {
    throw new Error("api.getThreadInfo غير متاحة");
  }
  const info = await api.getThreadInfo(threadID);
  return info && info.imageSrc ? String(info.imageSrc) : null;
}

async function updateImageBaseline(api, threadID) {
  const image = await readCurrentImage(api, threadID);
  imageBaselines.set(threadID, image);
  return image;
}

function scheduleRestore(api, threadID, reason) {
  if (restoreTimers.has(threadID)) return;

  console.log(
    `[تثبيت] رُصد اختلاف صورة المجموعة ${threadID} — الإرجاع بعد 3 ثوانٍ...`,
  );
  const timer = setTimeout(async () => {
    try {
      if (!pinnedImages[threadID]) return;
      await applyPinnedImage(api, threadID, reason);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (pinnedImages[threadID]) await updateImageBaseline(api, threadID);
    } catch (error) {
      console.error(`[تثبيت] فشل إرجاع الصورة:`, error.message || error);
    } finally {
      restoreTimers.delete(threadID);
    }
  }, RESTORE_DELAY);
  restoreTimers.set(threadID, timer);
}

function startImageMonitor(api, threadID) {
  if (!threadID || imageMonitors.has(threadID)) return;

  updateImageBaseline(api, threadID).catch((error) => {
    console.error(
      `[تثبيت] تعذر قراءة صورة المجموعة ${threadID}:`,
      error.message || error,
    );
  });

  const monitor = setInterval(async () => {
    if (!pinnedImages[threadID]) {
      stopImageMonitor(threadID);
      return;
    }
    if (monitorChecks.has(threadID) || applying.has(threadID)) return;

    monitorChecks.add(threadID);
    try {
      const currentImage = await readCurrentImage(api, threadID);
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
  if (!config || !config.path || applying.has(threadID)) return false;
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
      };
      saveState();
      await applyPinnedImage(api, threadID, "تثبيت جديد");
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
    if (!config) return;

    const suppressedUntil = suppressEvents.get(threadID) || 0;
    if (Date.now() < suppressedUntil) return;

    startImageMonitor(api, threadID);
    scheduleRestore(api, threadID, "تغيير مرصود");
  },

  async resumeAll(api) {
    for (const threadID of Object.keys(pinnedImages)) {
      await applyPinnedImage(api, threadID, "إعادة اتصال").catch((error) =>
        console.error(
          `[تثبيت] فشل استئناف ${threadID}:`,
          error.message || error,
        ),
      );
      startImageMonitor(api, threadID);
    }
  },
};
