function createConnectionState({ now = () => Date.now() } = {}) {
  const state = {
    status: "starting",
    startedAt: now(),
    loggedIn: false,
    listenerActive: false,
    listenerStartedAt: null,
    lastConnectedAt: null,
    lastEventAt: null,
    lastMessageAt: null,
    lastLoginAt: null,
    lastReconnectSuccessAt: null,
    lastError: null,
    loginAttempts: 0,
    mqttAttempts: 0,
    attentionReason: null,
  };
  const alerted = new Set();

  return {
    snapshot() {
      return {
        ...state,
        ready: state.loggedIn && state.listenerActive,
        uptimeSeconds: Math.floor((now() - state.startedAt) / 1000),
      };
    },
    setStatus(status) {
      state.status = status;
    },
    markLoginSuccess() {
      Object.assign(state, {
        loggedIn: true,
        status: "connecting",
        lastLoginAt: now(),
        attentionReason: null,
      });
      alerted.clear();
    },
    markListenerStarted() {
      const at = now();
      if (state.mqttAttempts > 0) state.lastReconnectSuccessAt = at;
      Object.assign(state, {
        listenerActive: true,
        listenerStartedAt: at,
        lastConnectedAt: at,
        lastEventAt: at,
        status: "online",
      });
    },
    markListenerStopped() {
      Object.assign(state, { listenerActive: false, listenerStartedAt: null });
    },
    markNeedsAttention(reason) {
      Object.assign(state, {
        status: "needs_attention",
        loggedIn: false,
        listenerActive: false,
        listenerStartedAt: null,
        attentionReason: reason,
      });
    },
    markEvent() {
      state.lastEventAt = now();
    },
    markMessage() {
      state.lastMessageAt = now();
    },
    markError(kind) {
      state.lastError = { kind, at: now() };
    },
    markReconnectAttempt(kind) {
      if (kind === "login") state.loginAttempts += 1;
      else state.mqttAttempts += 1;
      return kind === "login" ? state.loginAttempts : state.mqttAttempts;
    },
    resetAttempts() {
      state.loginAttempts = 0;
      state.mqttAttempts = 0;
    },
    shouldAlert(key) {
      if (alerted.has(key)) return false;
      alerted.add(key);
      return true;
    },
  };
}

module.exports = { createConnectionState };
