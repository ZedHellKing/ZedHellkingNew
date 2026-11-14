"use strict";

const timingStore = require("../timing-store");

const SESSION_TTL_MS = 10 * 60 * 1000;

const HEADER = "⋯⌁⟖ 𝒁𝑬𝑫 𝑯𝑬𝑳𝑳𝑲𝑰𝑵𝑮 𝑩𝑶𝑻 ⃞⃟ ❞ ⟕⌁⋯";

const MENU = [
  HEADER,
  "",
  "╭━━━「 المؤقت 」━━━╮",
  "1 — تغير وقت قصف",
  "2 — تغير وقت ماهوراغا",
  "╰━━━━━━━━━━━━━━━━━━━━━━╯",
  "",
  "↩️ رد على هذه الرسالة بالرقم 1 أو 2.",
].join("\n");

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
}

// يقبل صيغ مثل: 2ق  /  2 د  /  2 ث  /  2  (الدقائق افتراضيةً)
function parseTimeInput(raw) {
  const normalized = normalizeDigits(raw).toLowerCase();
  const match = normalized.match(/^(\d+)\s*(ق|د|ث|s|m)?$/);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num) || num < 1) return null;
  const unit = match[2];
  if (unit === "ث" || unit === "s") return num * 1000;
  // ق / د / m / undefined → دقائق
  return num * 60 * 1000;
}

function formatDelay(ms) {
  if (ms % 60000 === 0) return `${ms / 60000} دقيقة`;
  if (ms % 1000 === 0) return `${ms / 1000} ثانية`;
  return `${ms} مللي ثانية`;
}

function makeSessionKey(adminID, threadID) {
  return JSON.stringify([String(adminID), String(threadID)]);
}

const sessions = new Map();

async function sendPrompt(api, session, message) {
  const result = await api.sendMessage(message, session.threadID);
  if (!result || !result.messageID) {
    throw new Error("لم تُرجع مكتبة البوت رقم رسالة القائمة.");
  }
  session.promptMessageID = String(result.messageID);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(session.key, session);
}

module.exports = {
  name: "المؤقت",

  async execute(api, event) {
    const adminID = String(event.senderID || "");
    const threadID = String(event.threadID || "");
    if (!adminID || !threadID) return;

    const key = makeSessionKey(adminID, threadID);
    const session = {
      key,
      adminID,
      threadID,
      phase: "menu",
      promptMessageID: null,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    sessions.set(key, session);
    try {
      await sendPrompt(api, session, MENU);
    } catch (e) {
      sessions.delete(key);
      console.error("[المؤقت] خطأ في إرسال القائمة:", e.message || e);
    }
  },

  async handleReply(api, event) {
    const adminID = String(event.senderID || "");
    const threadID = String(event.threadID || "");
    const key = makeSessionKey(adminID, threadID);
    const session = sessions.get(key);
    if (!session) return false;

    const replyID = event.messageReply && event.messageReply.messageID;
    if (!replyID || String(replyID) !== session.promptMessageID) return false;

    if (Date.now() > session.expiresAt) {
      sessions.delete(key);
      await api.sendMessage(
        "انتهت صلاحية جلسة المؤقت. اكتب «المؤقت» للبدء من جديد.",
        threadID,
      );
      return true;
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    const body = String(event.body || "").trim();

    try {
      if (session.phase === "menu") {
        const choice = normalizeDigits(body);
        if (choice === "1") {
          session.phase = "qasf-input";
          const current = timingStore.get("qasf");
          await sendPrompt(
            api,
            session,
            `${HEADER}\n\n⏱️ وقت قصف الحالي: ${formatDelay(current)}\nاكتب الوقت الجديد.\nمثال: 2ق (دقيقتين) أو 30 ث (ثلاثين ثانية).\n\n↩️ رد على هذه الرسالة بالوقت المطلوب.`,
          );
          return true;
        }
        if (choice === "2") {
          session.phase = "mahoraga-input";
          const current = timingStore.get("mahoraga");
          await sendPrompt(
            api,
            session,
            `${HEADER}\n\n⏱️ وقت ماهوراغا الحالي: ${formatDelay(current)}\nاكتب الوقت الجديد.\nمثال: 2ق (دقيقتين) أو 30 ث (ثلاثين ثانية).\n\n↩️ رد على هذه الرسالة بالوقت المطلوب.`,
          );
          return true;
        }
        await sendPrompt(
          api,
          session,
          `${MENU}\n\n⚠️ رد بالرقم 1 أو 2.`,
        );
        return true;
      }

      if (session.phase === "qasf-input" || session.phase === "mahoraga-input") {
        const storeKey = session.phase === "qasf-input" ? "qasf" : "mahoraga";
        const label = session.phase === "qasf-input" ? "قصف" : "ماهوراغا";
        const ms = parseTimeInput(body);
        if (ms === null) {
          await sendPrompt(
            api,
            session,
            `⚠️ صيغة غير صحيحة.\nاكتب مثلًا: 2ق (دقيقتين) أو 30 ث (ثلاثين ثانية).\n\n↩️ رد على هذه الرسالة بالوقت المطلوب.`,
          );
          return true;
        }
        timingStore.set(storeKey, ms);
        sessions.delete(key);
        await api.sendMessage(
          `${HEADER}\n\n✅ تم تغيير وقت ${label} إلى ${formatDelay(ms)}.`,
          threadID,
        );
        return true;
      }
    } catch (e) {
      sessions.delete(key);
      console.error("[المؤقت] خطأ:", e.message || e);
      await api.sendMessage(
        `❌ حدث خطأ في جلسة المؤقت. اكتب «المؤقت» للبدء من جديد.`,
        threadID,
      );
      return true;
    }

    sessions.delete(key);
    return true;
  },
};
