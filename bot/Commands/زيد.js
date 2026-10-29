"use strict";

const { createZedAssistant } = require("../zed-assistant");

const COMMAND_PATTERN = /^زيد\s+(تشغيل|ايقاف|إيقاف)$/u;

function normalizeFacebookID(id) {
  return String(id || "")
    .replace(/^(?:fb)?id[:.]/iu, "")
    .trim();
}

async function isAuthorizedGroupController(api, event, isAdmin) {
  const senderID = String(event.senderID || "");
  if (typeof isAdmin === "function" && isAdmin(senderID)) return true;
  if (event.isGroup === false || typeof api.getThreadInfo !== "function") {
    return false;
  }

  try {
    const info = await api.getThreadInfo(String(event.threadID || ""));
    const adminIDs = Array.isArray(info && info.adminIDs) ? info.adminIDs : [];
    return adminIDs.some((admin) => {
      const id =
        typeof admin === "object" && admin !== null
          ? admin.id || admin.userID || admin.userFbId
          : admin;
      return normalizeFacebookID(id) === normalizeFacebookID(senderID);
    });
  } catch {
    return false;
  }
}

function createZedCommand(options = {}) {
  const assistant = options.assistant || createZedAssistant(options);

  return {
    name: "زيد",

    async execute(api, event, isAdmin) {
      const body = String(event.body || "").trim();
      const match = COMMAND_PATTERN.exec(body);
      if (!match) return false;

      const threadID = String(event.threadID || "");
      if (!threadID) return false;
      if (event.isGroup === false) {
        await api.sendMessage("⚠️ أوامر زيد تعمل داخل المجموعات فقط.", threadID);
        return true;
      }

      if (!(await isAuthorizedGroupController(api, event, isAdmin))) {
        await api.sendMessage(
          "⚠️ أمر زيد متاح لمشرفي المجموعة فقط.",
          threadID,
        );
        return true;
      }

      const enabled = match[1] === "تشغيل";
      const changed = assistant.setEnabled(threadID, enabled);
      const message = enabled
        ? changed
          ? "✅ تم تشغيل زيد في هذه المجموعة. سيرد عند منشنه ويرحب بالأعضاء الجدد."
          : "ℹ️ زيد يعمل بالفعل في هذه المجموعة."
        : changed
          ? "⏹️ تم إيقاف زيد في هذه المجموعة؛ لن يرد على المنشن أو يرسل ترحيبًا."
          : "ℹ️ زيد متوقف بالفعل في هذه المجموعة.";
      await api.sendMessage(message, threadID);
      return true;
    },

    handleMessage(api, event) {
      return assistant.handleMessage(api, event);
    },

    handleJoinEvent(api, event) {
      return assistant.handleJoinEvent(api, event);
    },

    isEnabled(threadID) {
      return assistant.isEnabled(threadID);
    },
  };
}

const command = createZedCommand();
module.exports = { ...command, createZedCommand };
