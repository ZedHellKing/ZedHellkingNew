const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  OPENROUTER_MODEL,
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
    mentions: { "zed-bot": "Zed" },
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
  assert.equal(requests[0].model, OPENROUTER_MODEL);
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

test("Zed gives fixed identity and Jan replies without calling OpenRouter", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  let modelCalls = 0;
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
    clientFactory: () => {
      modelCalls += 1;
      throw new Error("Special replies must not use the model.");
    },
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed مين أنت؟"));
  assert.match(api.messages.at(-1).message, /الأسطورة زيد/);
  await assistant.handleMessage(api, mentionEvent("Zed هل تعرف جان؟", {
    senderID: "member-2",
  }));
  assert.match(api.messages.at(-1).message, /الأسطورة جان/);
  assert.equal(modelCalls, 0);
});

test("Zed returns the requested romantic line in English and a non-threatening roast", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed مين أكثر شخص يحبه جان؟"));
  const romantic = api.messages.at(-1).message;
  assert.match(romantic, /^My heart belongs/);
  assert.match(romantic, /distance/);

  await assistant.handleMessage(api, mentionEvent("Zed يا غبي", {
    senderID: "member-2",
  }));
  const roast = api.messages.at(-1).message;
  assert.match(roast, /أذكى/);
  assert.doesNotMatch(roast, /دعس|اركبك|أقتلك|أضربك/);
});

test("image requests return a Pinterest search link without claiming an image was sent", async (t) => {
  const directory = makeTempDir(t);
  const api = makeApi();
  const assistant = createZedAssistant({
    statePath: path.join(directory, "zed-state.json"),
  });
  assistant.setEnabled("group-1", true);

  await assistant.handleMessage(api, mentionEvent("Zed هات صور قطط"));
  const reply = api.messages.at(-1).message;
  assert.match(reply, /pinterest\.com\/search\/pins/);
  assert.match(reply, /قطط/);
  assert.match(reply, /ما أقدر أرفق صور/);
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
