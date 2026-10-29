const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createNewspaperStore } = require("../newspaper-store");
const { createNewspaperTextProvider } = require("../Commands/قصف");
const {
  createNewspaperCommand,
} = require("../Commands/تغير جريدة");

test("persists a replacement newspaper and reloads it after restart", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "newspaper-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "newspaper.json");
  const replacement = "عنوان الجريدة\nالسطر الثاني\nالسطر الثالث";
  const store = createNewspaperStore(filePath);

  assert.equal(store.get(), null);
  assert.equal(store.set(replacement), replacement);
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, "utf8")), {
    text: replacement,
  });
  assert.equal(createNewspaperStore(filePath).get(), replacement);
});

test("a changed newspaper replaces every qasf message and survives restart", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "qasf-newspaper-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "newspaper.json");
  const text = "جريدة جديدة\nسطر ثانٍ ✨\nأي نص يكتبه المشرف";
  const provider = createNewspaperTextProvider(createNewspaperStore(filePath));

  await createNewspaperCommand(provider).execute(
    { async sendMessage() {} },
    { body: `تغير جريدة\n${text}`, threadID: "thread-1" },
  );

  for (let index = 0; index < 8; index += 1) {
    assert.equal(provider.get(index), text);
  }

  const afterRestart = createNewspaperTextProvider(
    createNewspaperStore(filePath),
  );
  assert.equal(afterRestart.get(0), text);
  assert.equal(afterRestart.get(3), text);
});

test("rejects empty text without overwriting the saved newspaper", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "newspaper-store-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "newspaper.json");
  const store = createNewspaperStore(filePath);
  store.set("الجريدة الحالية");

  assert.throws(() => store.set(" \n "), /cannot be empty/i);
  assert.equal(createNewspaperStore(filePath).get(), "الجريدة الحالية");
});

test("the change-newspaper command saves multiline text and confirms success", async () => {
  const savedTexts = [];
  const replies = [];
  const command = createNewspaperCommand({
    setNewspaperText(text) {
      savedTexts.push(text);
    },
  });

  await command.execute(
    {
      async sendMessage(text, threadID) {
        replies.push({ text, threadID });
      },
    },
    {
      body: "تغير جريدة\nعنوان جديد\nمحتوى الجريدة",
      threadID: "thread-1",
    },
  );

  assert.deepEqual(savedTexts, ["عنوان جديد\nمحتوى الجريدة"]);
  assert.match(replies[0].text, /تم حفظ الجريدة الجديدة/);
  assert.equal(replies[0].threadID, "thread-1");
});

test("the change-newspaper command rejects an empty replacement", async () => {
  const savedTexts = [];
  const replies = [];
  const command = createNewspaperCommand({
    setNewspaperText(text) {
      savedTexts.push(text);
    },
  });

  await command.execute(
    {
      async sendMessage(text, threadID) {
        replies.push({ text, threadID });
      },
    },
    { body: "تغير جريدة", threadID: "thread-1" },
  );

  assert.deepEqual(savedTexts, []);
  assert.match(replies[0].text, /نص الجريدة الجديدة/);
});
