const test = require("node:test");
const assert = require("node:assert/strict");
const { createHealthServer } = require("../health-server");
const { createConnectionState } = require("../connection-state");

const silentLog = { error() {}, warn() {}, info() {} };

async function startServer(overrides = {}) {
  const connectionState = overrides.connectionState || createConnectionState();
  const handlers = overrides.handlers || {
    testSend: async (threadID) => ({ ok: true, threadID }),
    updateCookies: () => ({ ok: true }),
  };
  const server = createHealthServer({
    connectionState,
    adminToken: overrides.adminToken === undefined ? "admin-token-1234567890" : overrides.adminToken,
    handlers,
    log: silentLog,
    memoryUsage: () => ({ rss: 100 * 1048576, heapUsed: 50 * 1048576 }),
  });
  const port = await server.listen(0);
  return { base: `http://127.0.0.1:${port}`, server, connectionState };
}

test("health and uptime answer without depending on Facebook", async () => {
  const { base, server } = await startServer();
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, "alive");
    const uptime = await fetch(`${base}/uptime`);
    assert.equal(typeof (await uptime.json()).uptimeSeconds, "number");
  } finally {
    await server.close();
  }
});

test("ready reports 503 until login and listener are both active", async () => {
  const { base, server, connectionState } = await startServer();
  try {
    assert.equal((await fetch(`${base}/ready`)).status, 503);
    connectionState.markLoginSuccess();
    assert.equal((await fetch(`${base}/ready`)).status, 503);
    connectionState.markListenerStarted();
    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).ready, true);
  } finally {
    await server.close();
  }
});

test("status exposes operational data but no cookies or tokens", async () => {
  const { base, server, connectionState } = await startServer();
  try {
    connectionState.markLoginSuccess();
    const body = await (await fetch(`${base}/status`)).text();
    const parsed = JSON.parse(body);
    assert.equal(parsed.loggedIn, true);
    assert.equal(parsed.memory.rssMb, 100);
    assert.doesNotMatch(body, /cookie|appstate|xs"/i);
  } finally {
    await server.close();
  }
});

test("admin routes are hidden when no token is configured", async () => {
  const { base, server } = await startServer({ adminToken: "" });
  try {
    assert.equal((await fetch(`${base}/testsend?thread=1`)).status, 404);
  } finally {
    await server.close();
  }
});

test("admin routes require the bearer token", async () => {
  const { base, server } = await startServer();
  try {
    assert.equal((await fetch(`${base}/testsend?thread=1`)).status, 401);
    const ok = await fetch(`${base}/testsend?thread=42`, {
      headers: { Authorization: "Bearer admin-token-1234567890" },
    });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).threadID, "42");
  } finally {
    await server.close();
  }
});

test("updatecookies passes the parsed body to the handler and rejects bad JSON", async () => {
  let received = null;
  const { base, server } = await startServer({
    handlers: {
      testSend: async () => ({ ok: true }),
      updateCookies: (body) => {
        received = body;
        return body.length ? { ok: true } : { ok: false, error: "empty" };
      },
    },
  });
  const auth = { Authorization: "Bearer admin-token-1234567890", "Content-Type": "application/json" };
  try {
    const bad = await fetch(`${base}/updatecookies`, { method: "POST", headers: auth, body: "{oops" });
    assert.equal(bad.status, 400);
    const good = await fetch(`${base}/updatecookies`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify([{ key: "c_user", value: "1" }]),
    });
    assert.equal(good.status, 200);
    assert.equal(received.length, 1);
  } finally {
    await server.close();
  }
});
