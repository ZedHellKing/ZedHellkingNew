const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  OPENAI_MODEL,
  createZedAssistant,
} = require("../zed-assistant");
const { createZedCommand } = require("../Commands/زيد");

function makeTempDir(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zed-assistant-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function makeApi(botID = "zed-bot") {
  const messages = [];
  return {
    messages,
    getCurrentUserID: () => botID,
    async sendMessage(message, threadID) {
      messages.push({ message, threadID });
      if (message && typeof message === "object" && message.attachment) {
        await new Promise((resolve, reject) => {
          message.attachment.once("error", reject);
          message.attachment.once("end", resolve);
          message.attachment.resume();
        });
      }
    },
  };
}

function mentionEvent(body, overrides = {}) {
  return {
    body,
    threadID: "group-1",
    senderID: "member-1",
    isGroup: true,
    mentions: { "fbid:zed-bot": "Zed" },
    ...overrides,
  };
}

test("Zed only answers a real mention in an enabled group", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const requests = [];
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create(request) {
            requests.push(request);
            return { choices: [{ message: { content: "Gravity bends spacetime." } }] };
          },
        },
      },
    }),
    now: () => 10000,
  });

  await assistant.handleMessage(api, mentionEvent("Zed explain gravity"));
  assert.equal(api.messages.length, 0, "disabled groups stay silent");

  assistant.setEnabled("group-1", true);
  await assistant.handleMessage(api, {
    ...mentionEvent("explain gravity"),
    mentions: {},
  });
  assert.equal(api.messages.length, 0, "messages without a bot mention stay silent");

  await assistant.handleMessage(api, mentionEvent("Zed explain gravity"));
  assert.equal(api.messages.at(-1).message, "Gravity bends spacetime.");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, OPENAI_MODEL);
});

test("a bare mention gets a short reply even when it has no question", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    now: () => 10000,
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("@Zed"));

  assert.equal(api.messages.at(-1).message, "أنا زيد. اذكر سؤالك وسأجيبك.");
});

test("Zed's group enable state persists and remains separate by group", (t) => {
  const directory = makeTempDir(t);
  const statePath = path.join(directory, "zed-state.json");
  const first = createZedAssistant({ statePath });
  first.setEnabled("group-1", true);

  const afterRestart = createZedAssistant({ statePath });
  assert.equal(afterRestart.isEnabled("group-1"), true);
  assert.equal(afterRestart.isEnabled("group-2"), false);

  afterRestart.setEnabled("group-1", false);
  assert.equal(createZedAssistant({ statePath }).isEnabled("group-1"), false);
});

test("Zed uses AI to answer questions about himself and Jan", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const requests = [];
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create(request) {
            requests.push(request);
            return {
              choices: [{ message: { content: `AI answer ${requests.length}` } }],
            };
          },
        },
      },
    }),
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed مين هو زيد؟"));
  await assistant.handleMessage(api, mentionEvent("Zed من هو جان؟", {
    senderID: "member-2",
  }));
  await assistant.handleMessage(api, mentionEvent("Zed who is Jan?", {
    senderID: "member-3",
  }));
  await assistant.handleMessage(api, mentionEvent("Zed who is Zed?", {
    senderID: "member-4",
  }));
  assert.deepEqual(
    api.messages.map(({ message }) => message),
    ["AI answer 1", "AI answer 2", "AI answer 3", "AI answer 4"],
  );
  assert.equal(requests.length, 4);
  assert.ok(
    requests.every((request) =>
      request.messages[0].content.includes("fictional personas"),
    ),
  );
});

test("Zed answers an identity question with a leading tag when its mention ID differs", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const requests = [];
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create(request) {
            requests.push(request);
            return {
              choices: [{ message: { content: "AI-generated Zed answer." } }],
            };
          },
        },
      },
    }),
  });
  assistant.setEnabled("group-1", true);

  const handled = await assistant.handleMessage(
    api,
    mentionEvent("@Sukuna bot من هو زيد؟", {
      mentions: { "different-user-id": "Sukuna bot" },
    }),
  );

  assert.equal(handled, true);
  assert.equal(api.messages.at(-1).message, "AI-generated Zed answer.");
  assert.equal(requests.length, 1);
  assert.match(requests[0].messages[1].content, /من هو زيد/);
});

test("custom uncle question uses its requested reply while other questions use AI", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  let modelCalls = 0;
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create() {
            modelCalls += 1;
            return { choices: [{ message: { content: "A fresh AI reply." } }] };
          },
        },
      },
    }),
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(
    api,
    mentionEvent("Zed من هو خال محمد الأردني؟"),
  );
  assert.equal(api.messages.at(-1).message, "واحد ابن تين كلب");
  assert.equal(modelCalls, 0);

  await assistant.handleMessage(api, mentionEvent("Zed explain gravity", {
    senderID: "member-2",
  }));
  assert.equal(api.messages.at(-1).message, "A fresh AI reply.");
  assert.equal(modelCalls, 1);
});

test("AI handles romantic and insulting questions with the requested tone", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const replies = [
    "My heart belongs to someone special; distance never changes that.",
    "هل تقصد نفسك يا ابن المضحكة؟",
    "Are you talking about yourself, comedian?",
  ];
  let modelCalls = 0;
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create() {
            const content = replies[modelCalls++];
            return { choices: [{ message: { content } }] };
          },
        },
      },
    }),
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed مين أكثر شخص يحبه جان؟"));
  const romantic = api.messages.at(-1).message;
  assert.match(romantic, /^My heart belongs/);

  await assistant.handleMessage(api, mentionEvent("Zed يا غبي", {
    senderID: "member-2",
  }));
  const roast = api.messages.at(-1).message;
  assert.match(roast, /هل تقصد نفسك يا ابن المضحكة/);
  assert.doesNotMatch(roast, /دعس|اركبك|أقتلك|أضربك/);

  await assistant.handleMessage(api, mentionEvent("Zed you are an idiot", {
    senderID: "member-3",
  }));
  assert.match(api.messages.at(-1).message, /talking about yourself/);
  assert.equal(modelCalls, 3);
});

test("Zed explains AI usage limits instead of claiming a temporary connection error", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => ({
      chat: {
        completions: {
          async create() {
            throw Object.assign(new Error("rate limit"), { status: 429 });
          },
        },
      },
    }),
    logger: { error() {} },
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed explain gravity"));

  assert.match(api.messages.at(-1).message, /current AI usage limit/);
  assert.doesNotMatch(api.messages.at(-1).message, /مشكلة مؤقتة/);
});

test("enabling Zed welcomes new members with the GIF and a mention", async (t) => {
  const directory = makeTempDir(t);
  const statePath = path.join(directory, "zed-state.json");
  const gifPath = path.join(directory, "welcome.gif");
  fs.writeFileSync(gifPath, Buffer.from("GIF89a-test"));
  const assistant = createZedAssistant({ statePath, welcomeGifPath: gifPath });
  const api = makeApi();
  assistant.setEnabled("group-1", true);

  const sent = await assistant.handleJoinEvent(api, {
    logMessageType: "log:subscribe",
    threadID: "group-1",
    logMessageData: {
      addedParticipants: [
        { userFbId: "member-2", fullName: "New Member" },
        { userFbId: "zed-bot", fullName: "Zed" },
      ],
    },
  });

  assert.equal(sent, true);
  const welcome = api.messages.at(-1);
  assert.match(welcome.message.body, /𝓦𝓮𝓵𝓬𝓸𝓶𝓮/);
  assert.match(welcome.message.body, /New Member/);
  assert.equal(welcome.message.mentions[0].id, "member-2");
  assert.ok(welcome.message.attachment);
});

test("only an admin can change Zed's group state", async (t) => {
  const directory = makeTempDir(t);
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
  });
  const command = createZedCommand({ assistant });
  const api = makeApi();
  const event = {
    body: "زيد تشغيل",
    threadID: "group-1",
    senderID: "member-1",
    isGroup: true,
  };

  await command.execute(api, event, (senderID) => senderID === "admin-1");
  assert.equal(assistant.isEnabled("group-1"), false);

  await command.execute(
    api,
    { ...event, senderID: "admin-1" },
    (senderID) => senderID === "admin-1",
  );
  assert.equal(assistant.isEnabled("group-1"), true);

  await command.execute(
    { ...api, sendMessage: api.sendMessage.bind(api) },
    { ...event, body: "زيد إيقاف", senderID: "admin-1" },
    (senderID) => senderID === "admin-1",
  );
  assert.equal(assistant.isEnabled("group-1"), false);
});

test("a group admin can enable Zed without being a global bot admin", async (t) => {
  const directory = makeTempDir(t);
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
  });
  const command = createZedCommand({ assistant });
  const api = {
    ...makeApi(),
    async getThreadInfo() {
      return { adminIDs: ["fbid:member-1"] };
    },
  };

  const handled = await command.execute(
    api,
    {
      body: "زيد تشغيل",
      threadID: "group-1",
      senderID: "member-1",
      isGroup: true,
    },
    () => false,
  );

  assert.equal(handled, true);
  assert.equal(assistant.isEnabled("group-1"), true);
});
