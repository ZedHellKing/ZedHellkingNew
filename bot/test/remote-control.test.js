const test = require("node:test");
const assert = require("node:assert/strict");
const { createRemoteControl } = require("../remote-control");

function createHarness(groups = [], { useDefaultGroups = false } = {}) {
  const messages = [];
  const executions = [];
  let nextMessageID = 0;
  let nextIncomingID = 0;

  const api = {
    async sendMessage(message, threadID) {
      const result = {
        messageID: `bot-${++nextMessageID}`,
        threadID: String(threadID),
      };
      messages.push({ message: String(message), ...result });
      return result;
    },
  };
  const commands = new Map([
    ["أوامر", { getCommandsMessage: () => "HELP COMMANDS" }],
    ...[
      "قصف",
      "ماهوراغا",
      "كاتش",
      "حذف كاتش",
      "بانكاي",
      "السياجين",
      "تثبيت",
      "رد",
      "يوت",
      "حالة",
    ].map((name) => [
      name,
      {
        async execute(_api, event) {
          executions.push({ name, event });
        },
      },
    ]),
  ]);
  const remoteOptions = {
    isAdmin: (senderID) => senderID === "admin-1",
  };
  if (!useDefaultGroups) remoteOptions.getGroups = async () => groups;
  const remote = createRemoteControl(remoteOptions);

  async function reply(body, options = {}) {
    const prompt = messages.at(-1);
    return remote.handleMessage(
      api,
      {
        body,
        threadID: "admin-dm",
        senderID: "admin-1",
        isGroup: false,
        messageID: `user-${++nextIncomingID}`,
        messageReply: {
          messageID: options.replyTo || prompt.messageID,
          senderID: "bot-id",
          body: prompt.message,
          attachments: [],
        },
        attachments: options.attachments || [],
        mentions: options.mentions || {},
      },
      commands,
    );
  }

  return { api, commands, executions, messages, remote, reply };
}

const sampleGroups = [
  { threadID: "group-1", threadName: "المجموعة الأولى", isGroup: true },
  { threadID: "group-2", threadName: "المجموعة الثانية", isGroup: true },
  { threadID: "group-3", threadName: "المجموعة الثالثة", isGroup: true },
];

test("shows the two-option menu only to an admin in a private conversation", async () => {
  const h = createHarness(sampleGroups);

  assert.equal(
    await h.remote.startMenu(
      h.api,
      { senderID: "not-admin", threadID: "admin-dm", isGroup: false },
      h.commands,
    ),
    false,
  );
  assert.equal(h.messages.length, 0);

  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  assert.match(h.messages.at(-1).message, /1 — قائمة الأوامر/);
  assert.match(h.messages.at(-1).message, /2 — التحكم عن بُعد/);

  await h.reply("1", { replyTo: "not-the-menu" });
  assert.equal(h.messages.length, 1, "unrelated replies do not advance the menu");
});

test("selecting 2 opens Mahuraga group selection and starts it in the chosen group", async () => {
  const h = createHarness(sampleGroups);
  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  await h.reply("2");
  assert.match(h.messages.at(-1).message, /2 — ماهوراغا/);

  await h.reply("2");
  assert.match(h.messages.at(-1).message, /المجموعة الثالثة/);
  await h.reply("3");

  assert.equal(h.executions.length, 1);
  assert.equal(h.executions[0].name, "ماهوراغا");
  assert.equal(h.executions[0].event.body, "ماهوراغا");
  assert.equal(h.executions[0].event.threadID, "group-3");
  assert.equal(h.executions[0].event.isGroup, true);
  assert.match(h.messages.at(-1).message, /المجموعة الثالثة/);
});

test("asks for a nickname before listing groups, then sends the catch command without requiring its prefix", async () => {
  const h = createHarness(sampleGroups);
  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  await h.reply("2");
  await h.reply("3");
  assert.match(h.messages.at(-1).message, /الكنية الجديدة/);

  await h.reply("نجمة الليل");
  assert.match(h.messages.at(-1).message, /المجموعة الثانية/);
  await h.reply("2");

  assert.equal(h.executions[0].name, "كاتش");
  assert.equal(h.executions[0].event.body, "كاتش نجمة الليل");
  assert.equal(h.executions[0].event.threadID, "group-2");
});

test("the image pin flow asks for a photo after the group is selected", async () => {
  const h = createHarness(sampleGroups);
  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  await h.reply("2");
  await h.reply("9");
  await h.reply("1");
  assert.match(h.messages.at(-1).message, /أرسل الصورة كرد/);

  await h.reply("صورة", {
    attachments: [{ type: "photo", url: "https://images.example/test.jpg" }],
  });
  assert.equal(h.executions[0].name, "تثبيت");
  assert.equal(h.executions[0].event.threadID, "group-1");
  assert.equal(
    h.executions[0].event.messageReply.attachments[0].url,
    "https://images.example/test.jpg",
  );
});

test("the default group loader includes named inbox and archived groups, not direct chats", async () => {
  const h = createHarness([], { useDefaultGroups: true });
  h.api.getThreadList = async (_limit, _timestamp, tags) => {
    if (tags[0] === "INBOX") {
      return [
        {
          threadID: "inbox-group",
          threadName: "مجموعة الوارد",
          timestamp: "200",
          isGroup: true,
        },
        {
          threadID: "private-chat",
          threadName: "محادثة خاصة",
          timestamp: "100",
          isGroup: false,
        },
      ];
    }
    return [
      {
        threadID: "archived-group",
        threadName: "مجموعة المؤرشفة",
        timestamp: "50",
        isGroup: true,
      },
    ];
  };

  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  await h.reply("2");
  await h.reply("2");

  assert.match(h.messages.at(-1).message, /مجموعة الوارد/);
  assert.match(h.messages.at(-1).message, /مجموعة المؤرشفة/);
  assert.doesNotMatch(h.messages.at(-1).message, /محادثة خاصة/);
});

test("group selection supports additional pages and Arabic-Indic digits", async () => {
  const groups = Array.from({ length: 17 }, (_, index) => ({
    threadID: `group-${index + 1}`,
    threadName: `Group ${index + 1}`,
    isGroup: true,
  }));
  const h = createHarness(groups);
  await h.remote.startMenu(
    h.api,
    { senderID: "admin-1", threadID: "admin-dm", isGroup: false },
    h.commands,
  );
  await h.reply("2");
  await h.reply("2");
  assert.match(h.messages.at(-1).message, /التالي/);

  await h.reply("التالي");
  assert.match(h.messages.at(-1).message, /17 — Group 17/);
  await h.reply("١٧");

  assert.equal(h.executions[0].event.threadID, "group-17");
});
