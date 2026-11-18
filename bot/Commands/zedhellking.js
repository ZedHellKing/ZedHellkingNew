const GUARD_MESSAGE =
  "🛡️ تم تفعيل حماية zedhellking في هذه المجموعة.\n" +
  "لو عيّن أحد البوت مسؤولاً: سيُطرد المسؤول المُعيَّن أولاً، " +
  "ثم يُطرد بقية المسؤولين، ويبقى البوت هو المسؤول الوحيد.";

function createZedHellkingCommand(options = {}) {
  const delay = options.delay || ((ms) => new Promise((r) => setTimeout(r, ms)));

  // الحماية في الذاكرة فقط: تتوقف عند إعادة تشغيل البوت.
  const guardThreads = new Set();

  function stopAll() {
    guardThreads.clear();
  }

  function adminIDsFromEvent(event) {
    const logData = (event && event.logMessageData) || {};
    const raw = logData.ADMIN_IDS || logData.adminIDs || logData.ADMIN_ID || [];
    if (Array.isArray(raw)) return raw.map((id) => String(id || "")).filter(Boolean);
    return String(raw || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  function adminIDsFromInfo(info) {
    const admins = (info && info.adminIDs) || [];
    return admins
      .map((admin) =>
        String((typeof admin === "object" ? (admin.id || admin.userID) : admin) || ""),
      )
      .filter(Boolean);
  }

  async function kickSafely(api, threadID, userID, label) {
    try {
      await api.removeUserFromGroup(userID, threadID);
      return true;
    } catch (error) {
      console.error(`[zedhellking] تعذر طرد ${label}:`, (error && error.message) || error);
      return false;
    }
  }

  async function handleAdminAddEvent(api, event) {
    const threadID = String((event && event.threadID) || "");
    if (!threadID || !guardThreads.has(threadID)) return;
    if (String(event.logMessageType || event.type || "") !== "log:thread-admins") return;

    const botID = String((api.getCurrentUserID && api.getCurrentUserID()) || "");
    const promoted = adminIDsFromEvent(event);
    if (!promoted.length) return;

    // الحماية تعمل فقط عندما يكون البوت نفسه هو المُعيَّن مسؤولاً.
    if (!promoted.includes(botID)) return;

    // طرد باقي المسؤولين المُعيَّنين في نفس الحدث أولاً.
    const promotedOthers = promoted.filter((id) => id !== botID);
    for (const userID of promotedOthers) {
      await kickSafely(api, threadID, userID, "العضو المُعيَّن");
      await delay(500);
    }

    // ثم طرد بقية مسؤولي المجموعة ليبقى البوت مسؤولاً وحيداً.
    let admins = [];
    try {
      const info = await api.getThreadInfo(threadID);
      admins = adminIDsFromInfo(info);
    } catch (error) {
      console.error("[zedhellking] تعذر قراءة مشرفي المجموعة:", (error && error.message) || error);
      return;
    }

    for (const adminID of admins) {
      if (adminID === botID || promotedOthers.includes(adminID)) continue;
      await kickSafely(api, threadID, adminID, "مسؤول");
      await delay(500);
    }
  }

  async function execute(api, event) {
    const threadID = String(event.threadID || "");
    if (!threadID) return;

    if (event.isGroup === false) {
      await api.sendMessage("⚠️ أمر zedhellking يعمل داخل المجموعات فقط.", threadID);
      return;
    }

    if (guardThreads.has(threadID)) {
      guardThreads.delete(threadID);
      await api.sendMessage("✅ تم إيقاف حماية zedhellking في هذه المجموعة.", threadID);
      return;
    }

    guardThreads.add(threadID);
    await api.sendMessage(GUARD_MESSAGE, threadID);
  }

  return {
    name: "zedhellking",
    execute,
    handleAdminAddEvent,
    stopAll,
  };
}

module.exports = createZedHellkingCommand();
module.exports.createZedHellkingCommand = createZedHellkingCommand;
