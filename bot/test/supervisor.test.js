const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createSupervisor, RESTART_EXIT_CODE } = require("../supervisor");

const silentLog = { info() {}, warn() {}, error() {} };

const config = {
  maxRestartAttempts: 0,
  reconnectInitialDelay: 1,
  reconnectMaxDelay: 4,
  reconnectJitter: 0,
};

function harness({ maxRestartAttempts = 0 } = {}) {
  const children = [];
  const timers = [];
  let clock = 0;
  const exits = [];
  const crashHistoryPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sup-")), "crash.json");

  const fork = () => {
    const child = new EventEmitter();
    child.killed = [];
    child.kill = (signal) => child.killed.push(signal);
    children.push(child);
    return child;
  };
  const schedule = (fn, ms) => {
    const timer = { fn, ms, cancelled: false };
    timers.push(timer);
    return timer;
  };
  const cancel = (timer) => {
    if (timer) timer.cancelled = true;
  };

  const supervisor = createSupervisor({
    childScript: "index.js",
    config: { ...config, maxRestartAttempts },
    log: silentLog,
    crashHistoryPath,
    onExit: (code) => exits.push(code),
    fork,
    now: () => clock,
    schedule,
    cancel,
    random: () => 0.5,
  });

  const runNextTimer = () => {
    const pending = timers.filter((t) => !t.cancelled && !t.done);
    assert.ok(pending.length > 0, "expected a pending timer");
    const timer = pending[0];
    timer.done = true;
    timer.fn();
  };

  return {
    supervisor,
    children,
    exits,
    runNextTimer,
    timers,
    advance: (ms) => {
      clock += ms;
    },
    history: () => JSON.parse(fs.readFileSync(crashHistoryPath, "utf8")),
  };
}

test("starts the bot as a child and marks the child as supervised", () => {
  const h = harness();
  h.supervisor.start();
  assert.equal(h.children.length, 1);
});

test("restarts after an unexpected exit and records the crash", () => {
  const h = harness();
  h.supervisor.start();
  h.advance(1000);
  h.children[0].emit("exit", 1, null);
  assert.equal(h.children.length, 1, "restart waits for the backoff timer");
  h.runNextTimer();
  assert.equal(h.children.length, 2);
  assert.equal(h.history()[0].type, "crash");
  assert.equal(h.history()[0].code, 1);
});

test("quick repeated crashes back off instead of looping", () => {
  const h = harness();
  h.supervisor.start();
  h.children[0].emit("exit", 1, null);
  const first = h.timers[h.timers.length - 1].ms;
  h.runNextTimer();
  h.children[1].emit("exit", 1, null);
  const second = h.timers[h.timers.length - 1].ms;
  assert.ok(second > first);
});

test("a planned memory restart exit code restarts without counting as a crash", () => {
  const h = harness();
  h.supervisor.start();
  h.children[0].emit("exit", RESTART_EXIT_CODE, null);
  assert.equal(h.history()[0].type, "planned_restart");
  assert.equal(h.timers[h.timers.length - 1].ms, 5000);
});

test("stops restarting once the configured maximum is exceeded", () => {
  const h = harness({ maxRestartAttempts: 1 });
  h.supervisor.start();
  h.children[0].emit("exit", 1, null);
  h.runNextTimer();
  h.children[1].emit("exit", 1, null);
  assert.deepEqual(h.exits, [1]);
});

test("host stop sends SIGTERM, exits cleanly and never restarts", () => {
  const h = harness();
  h.supervisor.start();
  h.supervisor.stop("SIGTERM");
  assert.deepEqual(h.children[0].killed, ["SIGTERM"]);
  h.children[0].emit("exit", 0, null);
  assert.deepEqual(h.exits, [0]);
  assert.equal(h.children.length, 1);
});

test("host stop during a pending restart exits without spawning again", () => {
  const h = harness();
  h.supervisor.start();
  h.children[0].emit("exit", 1, null);
  h.supervisor.stop("SIGINT");
  assert.deepEqual(h.exits, [0]);
  assert.equal(h.children.length, 1);
});

test("child that ignores SIGTERM is force-killed after the grace period", () => {
  const h = harness();
  h.supervisor.start();
  h.supervisor.stop("SIGTERM");
  const grace = h.timers.find((t) => t.ms === 15000);
  assert.ok(grace);
  grace.fn();
  assert.deepEqual(h.children[0].killed, ["SIGTERM", "SIGKILL"]);
});
