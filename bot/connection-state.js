function createConnectionState({ now = () => Date.now() } = {}) {
  const state = {
    status: "starting",
    startedAt: now(),
    loggedIn: false,
    listenerActive: false,
    listenerStartedAt: null,
    lastEventAt: null,
    lastMessageAt: null,
    lastLoginAt: null,
    lastReconnectSuccessAt: null,
    lastError: null,
    reconnectAttempts: 0,
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
      const at = now();
      if (state.reconnectAttempts > 0) state.lastReconnectSuccessAt = at;
      Object.assign(state, {
        loggedIn: true,
        status: "connecting",
        lastLoginAt: at,
        attentionReason: null,
        reconnectAttempts: 0,
      });
      alerted.clear();
    },
    markListenerStarted() {
      const at = now();
      Object.assign(state, {
        listenerActive: true,
        listenerStartedAt: at,
        lastEventAt: at,
        status: "online",
      });
    },
    markListenerStopped() {
      Object.assign(state, { listenerActive: false, listenerStartedAt: null });
    },
    markLoggedOut() {
      Object.assign(state, { loggedIn: false, listenerActive: false, listenerStartedAt: null });
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
    markReconnectAttempt() {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts() {
      state.reconnectAttempts = 0;
    },
    shouldAlert(key) {
      if (alerted.has(key)) return false;
      alerted.add(key);
      return true;
    },
  };
}

module.exports = { createConnectionState };
