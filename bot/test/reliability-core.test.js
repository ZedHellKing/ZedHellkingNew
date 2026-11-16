const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { computeBackoffDelay } = require("../backoff");
const { loadConfig, ConfigError } = require("../config");
const { createLogger, redact } = require("../logger");
const { classifyError } = require("../login-errors");
const { createMessageDeduper } = require("../message-dedup");
const { acquireLock } = require("../process-lock");
const { createMemoryMonitor } = require("../memory-monitor");
const { createConnectionState } = require("../connection-state");

test("backoff grows exponentially, respects max and jitter bounds", () => {
  const base = { initialMs: 1000, maxMs: 8000, jitterRatio: 0 };
  assert.equal(computeBackoffDelay({ ...base, attempt: 1 }), 1000);
  assert.equal(computeBackoffDelay({ ...base, attempt: 3 }), 4000);
  assert.equal(computeBackoffDelay({ ...base, attempt: 50 }), 8000);

  const low = computeBackoffDelay({ ...base, attempt: 3, jitterRatio: 0.5, random: () => 0 });
  const high = computeBackoffDelay({ ...base, attempt: 3, jitterRatio: 0.5, random: () => 0.9999 });
  assert.equal(low, 2000);
  assert.ok(high > 5000 && high <= 6000);
});

test("config uses safe defaults and rejects bad values with every problem listed", () => {
  const defaults = loadConfig({});
  assert.equal(defaults.port, 3000);
  assert.equal(defaults.keepAliveEnabled, false);
  assert.equal(defaults.healthCheckInterval, 30);
  assert.equal(defaults.keepAliveInterval, 600);

  assert.throws(
    () => loadConfig({ PORT: "99999", RECONNECT_ENABLED: "maybe" }),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /PORT/);
      assert.match(error.message, /RECONNECT_ENABLED/);
      return true;
    },
  );
  assert.throws(
    () => loadConfig({ MEMORY_RESTART_MB: "100", MEMORY_WARNING_MB: "200" }),
    /MEMORY_RESTART_MB: يجب أن تكون أكبر/,
  );
  assert.throws(() => loadConfig({ KEEP_ALIVE_ENABLED: "true" }), /PUBLIC_BASE_URL/);
  assert.throws(() => loadConfig({ BOT_ADMIN_TOKEN: "short" }), /BOT_ADMIN_TOKEN/);
});

test("logger redacts cookies, tokens and passwords from metadata", () => {
  const lines = [];
  const logger = createLogger({
    write: (level, line) => lines.push(`${level} ${line}`),
    now: () => new Date("2026-01-01T00:00:00Z"),
  });
  logger.info("session", "saved", { cookie: "secret-value", count: 3, nested: { token: "abc", ok: "yes" } });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^INFO \[2026-01-01T00:00:00.000Z\] \[INFO\] \[session\] saved/);
  assert.doesNotMatch(lines[0], /secret-value/);
  assert.doesNotMatch(lines[0], /"abc"/);
  assert.deepEqual(redact({ password: "x" }), { password: "[REDACTED]" });
});

test("login errors are classified so checkpoints and expired sessions never retry", () => {
  assert.equal(classifyError(new Error("Checkpoint required")), "checkpoint");
  assert.equal(classifyError({ error: "Error retrieving userID" }), "session_expired");
  assert.equal(classifyError(new Error("ECONNRESET")), "transient");
});

test("message deduper accepts each id once and stays bounded", () => {
  const dedupe = createMessageDeduper({ capacity: 2 });
  assert.equal(dedupe.claim("a"), true);
  assert.equal(dedupe.claim("a"), false);
  dedupe.claim("b");
  dedupe.claim("c");
  assert.equal(dedupe.size(), 2);
  assert.equal(dedupe.claim("a"), true);
  assert.equal(dedupe.claim(undefined), true);
});

test("process lock blocks a second live holder and recovers from a stale lock", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lock-test-"));
  const lockPath = path.join(dir, "bot.lock");
  const release = acquireLock(lockPath, { pid: 111 });
  assert.throws(() => acquireLock(lockPath, { pid: 222, isAlive: () => true }), /PID 111/);
  release();
  assert.equal(fs.existsSync(lockPath), false);

  fs.writeFileSync(lockPath, "999999");
  const again = acquireLock(lockPath, { pid: 333, isAlive: () => false });
  assert.equal(fs.readFileSync(lockPath, "utf8"), "333");
  again();
});

test("memory monitor warns once and requests restart only after sustained high usage and cooldown", () => {
  const MB = 1024 * 1024;
  let rss = 600 * MB;
  const warnings = [];
  const restarts = [];
  let uptime = 10_000;
  const monitor = createMemoryMonitor({
    warnMb: 512,
    restartMb: 1024,
    cooldownMs: 60_000,
    uptimeMs: () => uptime,
    memoryUsage: () => ({ rss, heapUsed: 100 * MB }),
    confirmChecks: 3,
    onWarn: (s) => warnings.push(s),
    onRestartRequest: (s) => restarts.push(s),
  });

  monitor.check();
  monitor.check();
  assert.equal(warnings.length, 1);

  rss = 1200 * MB;
  monitor.check();
  monitor.check();
  monitor.check();
  assert.equal(restarts.length, 0, "cooldown not yet passed");

  uptime = 120_000;
  monitor.check();
  monitor.check();
  monitor.check();
  assert.equal(restarts.length, 1);
});

test("connection state is ready only when logged in and listening", () => {
  let now = 1_000;
  const conn = createConnectionState({ now: () => now });
  assert.equal(conn.snapshot().ready, false);
  conn.markLoginSuccess();
  assert.equal(conn.snapshot().ready, false);
  conn.markListenerStarted();
  assert.equal(conn.snapshot().ready, true);
  conn.markNeedsAttention("expired");
  const snap = conn.snapshot();
  assert.equal(snap.ready, false);
  assert.equal(snap.status, "needs_attention");
  assert.equal(conn.shouldAlert("expired"), true);
  assert.equal(conn.shouldAlert("expired"), false);
});
