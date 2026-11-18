const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { createZedHellkingCommand } = require(path.join(__dirname, "..", "Commands", "zedhellking.js"));

const BOT_ID = "1000000000001";

function fakeApi(overrides = {}) {
  const kicks = [];
  const messages = [];
  const api = {
    getCurrentUserID: () => BOT_ID,
    removeUserFromGroup: async (userID, threadID) => {
      kicks.push({ userID: String(userID), threadID: String(threadID) });
      if (overrides.failKicks && overrides.failKicks.includes(String(userID))) {
        throw new Error("kick failed");
      }
    },
    getThreadInfo: async () => ({
      adminIDs: overrides.adminIDs || [{ id: BOT_ID }],
    }),
    sendMessage: async (body, threadID) => {
      messages.push({ body, threadID });
    },
  };
  return { api, kicks, messages };
}

function adminEvent(promotedIDs, threadID = "123") {
  return {
    type: "log:thread-admins",
    threadID,
    logMessageData: { ADMIN_IDS: promotedIDs },
  };
}

test("فعّال الأمر يرسل رسالة تأكيد", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true });
  assert.equal(messages.length, 1);
  assert.match(messages[0].body, /zedhellking/);
});

test("إعادة الأمر توقف الحماية", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true });
  await cmd.execute(api, { threadID: "123", isGroup: true });
  assert.match(messages[1].body, /إيقاف/);
});

test("عند تعيين البوت مسؤولاً يُطرد المُعيَّن ثم بقية المسؤولين", async () => {
  const cmd = createZedHellkingCommand();
  const { api, kicks } = fakeApi({
    adminIDs: [{ id: BOT_ID }, { id: "222" }, { id: "333" }],
  });
  await cmd.execute(api, { threadID: "123", isGroup: true });
  kicks.length = 0;
  await cmd.handleAdminAddEvent(api, adminEvent([BOT_ID, "999"]));
  assert.deepEqual(kicks.map((k) => k.userID), ["999", "222", "333"]);
});

test("لا تفعل شيئاً إذا عُيِّن مسؤول غير البوت", async () => {
  const cmd = createZedHellkingCommand();
  const { api, kicks } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: true });
  kicks.length = 0;
  await cmd.handleAdminAddEvent(api, adminEvent(["888"]));
  assert.equal(kicks.length, 0);
});

test("فشل الطرد لا يوقف بقية العمليات", async () => {
  const cmd = createZedHellkingCommand();
  const { api, kicks } = fakeApi({
    failKicks: ["999"],
    adminIDs: [{ id: BOT_ID }, { id: "222" }],
  });
  await cmd.execute(api, { threadID: "123", isGroup: true });
  kicks.length = 0;
  await cmd.handleAdminAddEvent(api, adminEvent([BOT_ID, "999"]));
  assert.deepEqual(kicks.map((k) => k.userID), ["999", "222"]);
});

test("الأمر لا يعمل خارج المجموعات", async () => {
  const cmd = createZedHellkingCommand();
  const { api, messages } = fakeApi();
  await cmd.execute(api, { threadID: "123", isGroup: false });
  assert.match(messages[0].body, /المجموعات فقط/);
});

test("الأحداث في مجموعة بلا حماية تُتجاهل", async () => {
  const cmd = createZedHellkingCommand();
  const { api, kicks } = fakeApi();
  await cmd.handleAdminAddEvent(api, adminEvent([BOT_ID]));
  assert.equal(kicks.length, 0);
});
