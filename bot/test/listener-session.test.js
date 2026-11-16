const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createListenerSession, createStopper, silenceStatus } = require("../listener-session");

const silentLog = { warn() {}, info() {}, error() {} };

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("function return value is stopped by calling it", async () => {
  let stops = 0;
  const handle = () => {
    stops += 1;
  };
  const api = { listenMqtt: () => handle };
  const session = createListenerSession({ log: silentLog });
  await session.start(api, () => {});
  assert.equal(session.active, true);
  session.stop("test");
  assert.equal(stops, 1);
  assert.equal(session.active, false);
});

test("object return value with stop() is stopped through its method", async () => {
  let stops = 0;
  const handle = {
    stop() {
      stops += 1;
    },
  };
  const session = createListenerSession({ log: silentLog });
  await session.start({ listenMqtt: () => handle }, () => {});
  session.stop("test");
  assert.equal(stops, 1);
});

test("createStopper returns null for unsupported handles", () => {
  assert.equal(createStopper(undefined), null);
  assert.equal(createStopper({}), null);
});

test("a second start while listening does not create a second listener", async () => {
  let listens = 0;
  const api = {
    listenMqtt: () => {
      listens += 1;
      return () => {};
    },
  };
  const session = createListenerSession({ log: silentLog });
  await session.start(api, () => {});
  const again = await session.start(api, () => {});
  assert.equal(again.reason, "already_running");
  assert.equal(listens, 1);
});

test("reconnecting after stop leaves only one live listener", async () => {
  const stopped = [];
  let counter = 0;
  const api = {
    listenMqtt: () => {
      const id = ++counter;
      return () => stopped.push(id);
    },
  };
  const session = createListenerSession({ log: silentLog });
  await session.start(api, () => {});
  session.stop("reconnect");
  await session.start(api, () => {});
  assert.deepEqual(stopped, [1]);
  assert.equal(session.active, true);
  session.stop("shutdown");
  assert.deepEqual(stopped, [1, 2]);
});

test("events from a stopped listener are ignored", async () => {
  let fire;
  const api = {
    listenMqtt: (cb) => {
      fire = cb;
      return () => {};
    },
  };
  const received = [];
  const session = createListenerSession({ log: silentLog });
  await session.start(api, (err, event) => received.push(event));
  fire(null, { type: "message" });
  session.stop("test");
  fire(null, { type: "message" });
  assert.equal(received.length, 1);
});

test("stop during a pending listen stops the late listener and reports superseded", async () => {
  const pending = deferred();
  let lateStops = 0;
  const api = { listenMqtt: () => pending.promise };
  const session = createListenerSession({ log: silentLog });
  const starting = session.start(api, () => {});
  session.stop("early");
  pending.resolve(() => {
    lateStops += 1;
  });
  const result = await starting;
  assert.equal(result.started, false);
  assert.equal(result.reason, "superseded");
  assert.equal(lateStops, 1);
  assert.equal(session.active, false);
});

test("a stop that throws is logged and does not escape", async () => {
  const warnings = [];
  const log = { warn: (...args) => warnings.push(args), info() {}, error() {} };
  const session = createListenerSession({ log });
  await session.start({ listenMqtt: () => () => {
    throw new Error("boom");
  } }, () => {});
  assert.doesNotThrow(() => session.stop("test"));
  assert.equal(warnings.length, 1);
  assert.equal(session.active, false);
});

test("a listener without a stop function is rejected and its events are dropped", async () => {
  let fire;
  const api = {
    listenMqtt: (cb) => {
      fire = cb;
      return {};
    },
  };
  const received = [];
  const session = createListenerSession({ log: silentLog });
  await assert.rejects(session.start(api, (err, event) => received.push(event)));
  assert.equal(session.active, false);
  fire(null, { type: "message" });
  assert.equal(received.length, 0);
});

test("silenceStatus separates inactive, ok, and silent listeners", () => {
  const base = { now: 10_000, limitMs: 3_000 };
  assert.equal(silenceStatus({ ...base, listenerActive: false, lastEventAt: 0 }), "inactive");
  assert.equal(silenceStatus({ ...base, listenerActive: true, lastEventAt: 9_000 }), "ok");
  assert.equal(silenceStatus({ ...base, listenerActive: true, lastEventAt: 1_000 }), "silent");
});
