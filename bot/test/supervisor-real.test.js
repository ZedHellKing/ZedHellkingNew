const fs = require("fs");
const os = require("os");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSupervisor } = require("../supervisor");

function waitFor(check, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error("timed out"));
      }
    }, 50);
  });
}

test("real supervised child is restarted after a crash and stops on SIGTERM", { timeout: 30000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "supervisor-"));
  const historyPath = path.join(dir, "crash-history.json");
  const spawns = [];
  const crashes = [];
  const log = {
    info: (_cat, msg) => {
      if (msg === "تم تشغيل عملية البوت") spawns.push(msg);
    },
    warn() {},
    error: (_cat, msg) => crashes.push(msg),
  };
  let exitCode;
  const supervisor = createSupervisor({
    childScript: path.join(__dirname, "..", "support", "flaky-child.js"),
    config: { maxRestartAttempts: 0, reconnectInitialDelay: 1, reconnectMaxDelay: 1, reconnectJitter: 0 },
    log,
    crashHistoryPath: historyPath,
    onExit: (code) => {
      exitCode = code;
    },
    env: { ...process.env, FIXTURE_MARKER: path.join(dir, "marker") },
  });

  supervisor.start();
  await waitFor(() => spawns.length >= 2);
  supervisor.stop("test");
  await waitFor(() => exitCode !== undefined);

  assert.equal(exitCode, 0);
  assert.equal(crashes.length, 1);
  const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
  assert.equal(history.length, 1);
  assert.equal(history[0].type, "crash");
  assert.equal(history[0].code, 1);
});
