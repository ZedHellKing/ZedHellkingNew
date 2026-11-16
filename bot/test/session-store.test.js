const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createSessionStore, validateAppState } = require("../session-store");

const log = { warn() {}, error() {}, info() {} };

function sampleState(extra = "") {
  return [
    { key: "c_user", value: "100000000000001", domain: ".facebook.com" },
    { key: "xs", value: `token${extra}`, domain: ".facebook.com" },
  ];
}

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "session-test-"));
  return path.join(dir, "appstate.json");
}

test("validateAppState rejects empty, malformed and incomplete sessions", () => {
  assert.equal(validateAppState([]).ok, false);
  assert.equal(validateAppState([{ key: "c_user" }]).ok, false);
  assert.equal(validateAppState([{ key: "c_user", value: "1" }]).ok, false);
  assert.equal(validateAppState(sampleState()).ok, true);
});

test("save writes atomically with restricted permissions and load returns it", () => {
  const filePath = tempFile();
  const store = createSessionStore({ filePath, log });
  assert.equal(store.save(sampleState()), true);
  assert.deepEqual(store.load(), sampleState());
  assert.equal(fs.readdirSync(path.dirname(filePath)).some((f) => f.includes(".tmp-")), false);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(filePath).mode & 0o777, 0o600);
  }
});

test("save skips unchanged state and keeps rotated backups", () => {
  const filePath = tempFile();
  const store = createSessionStore({ filePath, log });
  store.save(sampleState("1"));
  assert.equal(store.save(sampleState("1")), false);
  store.save(sampleState("2"));
  assert.ok(fs.existsSync(`${filePath}.bak.1`));
  assert.deepEqual(JSON.parse(fs.readFileSync(`${filePath}.bak.1`, "utf8")), sampleState("1"));
});

test("load falls back to a backup when the main file is corrupted", () => {
  const filePath = tempFile();
  const store = createSessionStore({ filePath, log });
  store.save(sampleState("good"));
  store.save(sampleState("newer"));
  fs.writeFileSync(filePath, "{ not json");
  const fresh = createSessionStore({ filePath, log });
  assert.deepEqual(fresh.load(), sampleState("good"));
});

test("a corrupted main file is never rotated over a good backup", () => {
  const filePath = tempFile();
  const store = createSessionStore({ filePath, log });
  store.save(sampleState("good"));
  store.save(sampleState("newer"));
  fs.writeFileSync(filePath, "garbage");
  store.save(sampleState("recovered"));
  assert.deepEqual(JSON.parse(fs.readFileSync(`${filePath}.bak.1`, "utf8")), sampleState("good"));
});

test("load returns null instead of silently using an unusable session", () => {
  const filePath = tempFile();
  fs.writeFileSync(filePath, JSON.stringify([{ key: "c_user", value: "1" }]));
  assert.equal(createSessionStore({ filePath, log }).load(), null);
  assert.equal(createSessionStore({ filePath: tempFile(), log }).load(), null);
});

test("save refuses invalid sessions and leaves the existing file untouched", () => {
  const filePath = tempFile();
  const store = createSessionStore({ filePath, log });
  store.save(sampleState("keep"));
  assert.throws(() => store.save([]));
  assert.deepEqual(store.load(), sampleState("keep"));
});
