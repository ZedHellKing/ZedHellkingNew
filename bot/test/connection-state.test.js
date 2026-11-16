const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createConnectionState } = require("../connection-state");

test("login success does not reset MQTT or login attempt counters", () => {
  const conn = createConnectionState();
  conn.markReconnectAttempt("mqtt");
  conn.markReconnectAttempt("login");
  conn.markLoginSuccess();
  const snap = conn.snapshot();
  assert.equal(snap.mqttAttempts, 1);
  assert.equal(snap.loginAttempts, 1);
});

test("login and MQTT attempts are counted separately", () => {
  const conn = createConnectionState();
  assert.equal(conn.markReconnectAttempt("mqtt"), 1);
  assert.equal(conn.markReconnectAttempt("mqtt"), 2);
  assert.equal(conn.markReconnectAttempt("login"), 1);
});

test("resetAttempts clears both counters only when called", () => {
  const conn = createConnectionState();
  conn.markReconnectAttempt("mqtt");
  conn.markReconnectAttempt("login");
  conn.resetAttempts();
  const snap = conn.snapshot();
  assert.equal(snap.mqttAttempts, 0);
  assert.equal(snap.loginAttempts, 0);
});

test("a listener start after MQTT failures records last reconnect success and connect time", () => {
  let now = 1_000;
  const conn = createConnectionState({ now: () => now });
  conn.markReconnectAttempt("mqtt");
  now = 5_000;
  conn.markListenerStarted();
  const snap = conn.snapshot();
  assert.equal(snap.lastConnectedAt, 5_000);
  assert.equal(snap.lastReconnectSuccessAt, 5_000);
  assert.equal(snap.ready, false);
});

test("ready requires login and an active listener", () => {
  const conn = createConnectionState();
  conn.markLoginSuccess();
  assert.equal(conn.snapshot().ready, false);
  conn.markListenerStarted();
  assert.equal(conn.snapshot().ready, true);
  conn.markListenerStopped();
  assert.equal(conn.snapshot().ready, false);
});
