const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createPinCommand } = require("../Commands/تثبيت");

function createHarness(root) {
  let nextTimerID = 0;
  const timeouts = new Map();
  const intervals = new Map();
  const messages = [];
  const downloadedURLs = [];
  const photoIDs = [];
  const imageChanges = [];
  const statePath = path.join(root, "pinned-images.json");
  const dataDir = path.join(root, "pinned-images");
  const shared = { currentImage: null, now: 10_000 };

  const api = {
    async sendMessage(message, threadID) {
      messages.push({ message: String(message), threadID: String(threadID) });
    },
    async resolvePhotoUrl(photoID) {
      photoIDs.push(photoID);
      return "https://cdn.example/replied-photo.jpg?signature=test";
    },
  };

  const command = createPinCommand({
    statePath,
    dataDir,
    now: () => shared.now,
    async downloadImage(url, destination) {
      downloadedURLs.push(url);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, Buffer.from("test-image"));
    },
    async changeGroupImage(_api, imagePath, threadID) {
      imageChanges.push({ imagePath, threadID });
      shared.currentImage = "https://cdn.example/pinned-group-image.jpg";
    },
    async readGroupImage() {
      return shared.currentImage;
    },
    setTimeout(callback, delay) {
      const id = ++nextTimerID;
      timeouts.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    setInterval(callback, delay) {
      const id = ++nextTimerID;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  });

  async function pinFromReply() {
    await command.execute(api, {
      body: "تثبيت",
      threadID: "group-1",
      isGroup: true,
      messageReply: {
        messageID: "photo-message-1",
        attachments: [{ type: "photo", ID: "photo-123", url: null }],
      },
    });
  }

  return {
    api,
    command,
    dataDir,
    downloadedURLs,
    imageChanges,
    intervals,
    messages,
    photoIDs,
    pinFromReply,
    shared,
    statePath,
    timeouts,
  };
}

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mister-pin-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("replying تثبيت to a photo resolves its photo ID and saves the group image locally", async (t) => {
  const h = createHarness(temporaryRoot(t));
  await h.pinFromReply();

  assert.deepEqual(h.photoIDs, ["photo-123"]);
  assert.deepEqual(h.downloadedURLs, [
    "https://cdn.example/replied-photo.jpg?signature=test",
  ]);
  assert.equal(h.imageChanges.length, 1);
  assert.equal(h.imageChanges[0].threadID, "group-1");
  assert.ok(fs.existsSync(path.join(h.dataDir, "group-1.jpg")));
  assert.match(h.messages.at(-1).message, /ستعود بعد 4 ثوانٍ/);
});

test("a group-image event keeps the four-second restore timer from being postponed by polling", async (t) => {
  const h = createHarness(temporaryRoot(t));
  await h.pinFromReply();
  h.shared.currentImage = "https://cdn.example/changed-image.jpg";
  h.shared.now = 12_001;

  h.command.handleGroupImageEvent(h.api, { threadID: "group-1" });
  const [[timerID, timer]] = h.timeouts;
  assert.equal(timer.delay, 4000);

  const [monitor] = h.intervals.values();
  await monitor.callback();
  assert.equal(h.timeouts.size, 1);
  assert.equal(h.timeouts.get(timerID), timer);

  await timer.callback();
  assert.equal(h.imageChanges.length, 2);
  assert.equal(
    h.shared.currentImage,
    "https://cdn.example/pinned-group-image.jpg",
  );
});

test("the monitor schedules restoration when a group image is deleted without an event", async (t) => {
  const h = createHarness(temporaryRoot(t));
  await h.pinFromReply();
  h.shared.currentImage = null;

  const [monitor] = h.intervals.values();
  await monitor.callback();

  assert.equal(h.timeouts.size, 1);
  const [[, timer]] = h.timeouts;
  assert.equal(timer.delay, 4000);
  await timer.callback();
  assert.equal(h.imageChanges.length, 2);
  assert.equal(
    h.shared.currentImage,
    "https://cdn.example/pinned-group-image.jpg",
  );
});

test("the monitor restores a deleted group image and resumes a saved pin after restart", async (t) => {
  const root = temporaryRoot(t);
  const beforeRestart = createHarness(root);
  await beforeRestart.pinFromReply();

  const afterRestart = createHarness(root);
  afterRestart.shared.currentImage = null;
  await afterRestart.command.resumeAll(afterRestart.api);

  assert.equal(afterRestart.timeouts.size, 1);
  const [[timerID, timer]] = afterRestart.timeouts;
  assert.equal(timer.delay, 4000);
  await timer.callback();

  assert.equal(afterRestart.imageChanges.length, 1);
  assert.equal(
    afterRestart.shared.currentImage,
    "https://cdn.example/pinned-group-image.jpg",
  );
  assert.ok(afterRestart.command);
  assert.ok(timerID);
});
