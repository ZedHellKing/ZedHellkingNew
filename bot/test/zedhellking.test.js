const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { createZedHellkingCommand } = require(path.join(
  __dirname,
  "..",
  "Commands",
  "zedhellking.js",
));

const BOT_ID = "1000000000001";
const OWNER_ID = "2000000000002";

const isAdminFn = (id) => id === OWNER_ID;
isAdminFn.admins = [OWNER_ID];

function fakeApi(overrides = {}) {
  const kicks = [];
  const demotions = [];
  const promotions = [];
  const messages = [];
  let adminCall = 0;
  const adminRounds = overrides.adminRounds || [
    [{ id: BOT_ID }, { id: "222" }],
    [{ id: BOT_ID }, { id: "222" }, { id: "333" }],
    [{ id: BOT_ID }, { id: "333" }],
    [{ id: BOT_ID }],
  ];
  const api = {
    getCurrentUserID: () => BOT_ID,
    getThreadInfo: async () => {
      const round = adminRounds[Math.min(adminCall, adminRounds.length - 1)];
      adminCall += 1;
      return { adminIDs: overrides.adminIDs || round };
    },
    changeAdminStatus: async (threadID, userID, adminStatus) => {
      if (overrides.failAdminChange) throw new Error("admin change failed");
      if (adminStatus) promotions.push({ threadID, userID: String(userID) });
      else demotions.push({ threadID, userID: String(userID) });
    },
    sendMessage: async (body, threadID) => {
      messages.push({ body, threadID });
    },
  };
  return { api, kicks, demotions, promotions, messages };
}

function adminEvent(promotedIDs, threadID = "123", senderID = "444") {
  return {
    type: "log:thread-admins",
    threadID,
    senderID,
    logMessageData: { ADMIN_IDS: promotedIDs },
  };
}

function delayResolve() {
  return () => Promise.resolve();
}

test("تفعيل الأمر يرسل رسالة تأكيد ويسلّح المجموعة", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  assert.equal(messages.length, 1);
  assert.match(messages[0].body, /zedhellking|ᴢᴇᴅʜᴇʟʟᴋɪɴɢ/i);
  assert.match(
    messages[0].body,
    /(ꜱɪᴍᴘʟᴇ ʟɪꜰᴇ ꜰᴏʀᴍꜱ|ᴛʜᴇ ᴜɴᴋɴᴏᴡɴ ɪꜱ ʜᴇʀᴇ|ᴡᴇ ᴡɪʟʟ ꜱʜᴏᴡ ᴛʜᴇ ᴜɴɪᴠᴇʀꜱᴇ|ᴛʀᴀᴅɪᴛɪᴏɴ ᴘᴀᴄɪꜰɪᴇꜱ|ᴛʜᴇ ᴛᴇᴍᴘʟᴀʀꜱ ʀᴇꜱᴛʀᴀɪɴ|ᴏʀᴀ\.\.\. ᴛʜᴇ ᴇꜱꜱᴇɴᴄᴇ|ꜱᴏᴍᴇ ᴄᴏɴꜱɪᴅᴇʀ ᴜꜱ ᴇᴠɪʟ|ʟᴇᴛ ᴜꜱ ʀᴇᴍɪɴᴅ ᴛʜᴇ ᴜɴɪᴠᴇʀꜱᴇ|ʀᴇᴍᴏʀꜱᴇ ɪꜱ ꜰᴜᴛɪʟᴇ|ɪꜰ ᴛʜᴇʏ ᴡᴀɴᴛ ᴏʀᴀ|ᴏᴜʀ ʙʟᴀᴅᴇꜱ ᴄʀᴀᴠᴇ ʙᴀᴛᴛʟᴇ|ɴᴏ ᴍᴏʀᴇ ꜱᴀᴄʀᴇᴅ ᴏʀᴅᴇʀꜱ|ʜᴀʀᴍᴏɴʏ ʙʟᴏᴏᴍꜱ|ʟɪꜱᴛᴇɴ ᴛᴏ ᴛʜᴇ ᴄᴏꜱᴍᴏꜱ|ᴛʜᴇ ɢᴀʟᴀxʏ ᴡɪʟʟ ᴋɴᴏᴡ|ᴡᴇ\. ᴀʀᴇ\. ᴇɴʟɪɢʜᴛᴇɴᴇᴅ|ʙᴇʏᴏɴᴅ ᴛʜᴇ ʀᴇᴀᴄʜᴇꜱ|ᴏɴʟʏ ꜰᴏᴏʟꜱ ᴄʟɪɴɢ|ᴡᴇ ᴀʀᴇ ᴛʜᴇ ɢɪꜰᴛ|ᴡᴇ ᴀʀᴇ ᴢᴇᴅ|ʙᴇʜᴏʟᴅ! ᴛʜᴇ ᴘɪɴɴᴀᴄʟᴇ|ᴡᴇ ᴀʀᴇ ᴇᴠᴇʀʏᴡʜᴇʀᴇ|ᴀ ɴᴇᴡ ɢᴇɴᴇꜱɪꜱ|ᴏɴʟʏ ᴛɪᴍᴇ ᴄᴀɴ ᴊᴜᴅɢᴇ|ᴡᴇ ᴡᴀʟᴋ ᴛʜᴇ ᴘᴀᴛʜ|ᴛʜᴇ ᴛᴇᴍᴘʟᴀʀꜱ ᴘʀᴏᴍɪꜱᴇ|ᴡᴇ ʟᴇᴛ ᴛʜᴇ ᴍᴏɴꜱᴛᴇʀ|ᴡᴇ ɢᴀᴢᴇ ᴜᴘᴏɴ ᴛʜᴇ ꜱᴛᴀʀꜱ|ᴡᴇ ɢᴏ ᴡʜᴇʀᴇ ᴏᴛʜᴇʀꜱ)/,
  );
});

test("إعادة الأمر توقف الحماية", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  assert.match(messages[1].body, /إيقاف/);
});

test("عند تعيين البوت مسؤولاً يُزال مَن عيّنه أولاً ثم بقية المسؤولين ثم يُعيَّن المالك", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  demotions.length = 0;
  await cmd.handleEvent(api, adminEvent([BOT_ID], "123", "444"));
  assert.deepEqual(demotions.map((d) => d.userID), ["444", "222", "333"]);
  assert.deepEqual(promotions.map((p) => p.userID), [OWNER_ID]);
});

test("إزالة المشرفين تحدث كل ثانية", async () => {
  const gaps = [];
  let last = Date.now();
  const cmd = createZedHellkingCommand({
    delay: (ms) => {
      const now = Date.now();
      gaps.push(ms);
      last = now;
      return Promise.resolve();
    },
  });
  const { api, demotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  demotions.length = 0;
  await cmd.handleEvent(api, adminEvent([BOT_ID], "123", "444"));
  assert.deepEqual(gaps, [1000, 1000]);
  assert.equal(demotions.length, 3);
});

test("لا تفعل شيئاً إذا عُيِّن مسؤول غير البوت", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  await cmd.handleEvent(api, adminEvent(["888"]));
  assert.equal(demotions.length, 0);
  assert.equal(promotions.length, 0);
});

test("المالك ليس مشرفاً في البداية لكنه لا يُزال أثناء التنظيف ثم يُعيَّن", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi({
    adminRounds: [[{ id: BOT_ID }, { id: OWNER_ID }, { id: "555" }]],
  });
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  demotions.length = 0;
  await cmd.handleEvent(api, adminEvent([BOT_ID], "123", "444"));
  assert.equal(demotions.includes(OWNER_ID), false);
  assert.deepEqual(demotions.map((d) => d.userID), ["444", "555"]);
  assert.deepEqual(promotions.map((p) => p.userID), [OWNER_ID]);
});

test("فشل تغيير الدور لا يوقف بقية العمليات", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi({ failAdminChange: true });
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  await cmd.handleEvent(api, adminEvent([BOT_ID], "123", "444"));
  assert.equal(promotions.length, 0);
});

test("الأمر لا يعمل خارج المجموعات", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: false, senderID: OWNER_ID }, isAdminFn);
  assert.match(messages[0].body, /المجموعات فقط/);
});

test("المعيَّن مشرفاً هو إدمن main.js حتى لو أرسل الأمر إدمن آخر", async () => {
  const secondAdmin = "3000000000003";
  const isAdminTwo = (id) => id === OWNER_ID || id === secondAdmin;
  isAdminTwo.admins = [OWNER_ID, secondAdmin];
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, promotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: secondAdmin }, isAdminTwo);
  await cmd.handleEvent(api, adminEvent([BOT_ID], "123", "444"));
  assert.deepEqual(promotions.map((p) => p.userID), [OWNER_ID]);
});

test("الأحداث في مجموعة غير مسلّحة تُتجاهل", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions } = fakeApi();
  await cmd.handleEvent(api, adminEvent([BOT_ID]));
  assert.equal(demotions.length, 0);
});

test("رسالة نظام عن تعيين البوت تُطلق الحماية حتى بدون حدث رسمي", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  demotions.length = 0;
  await cmd.handleEvent(api, {
    type: "message",
    threadID: "123",
    senderID: "444",
    body: "You added 444 as a group admin.",
  });
  assert.equal(demotions.length > 0, true);
  assert.deepEqual(promotions.map((p) => p.userID), [OWNER_ID]);
});

test("رسالة نظام عن إزالة مشرف لا تُطلق الحماية", async () => {
  const cmd = createZedHellkingCommand({ delay: () => Promise.resolve() });
  const { api, demotions, promotions } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true, senderID: OWNER_ID }, isAdminFn);
  await cmd.handleEvent(api, {
    type: "message",
    threadID: "123",
    senderID: "444",
    body: "You removed 444 as a group admin.",
  });
  assert.equal(demotions.length, 0);
  assert.equal(promotions.length, 0);
});
