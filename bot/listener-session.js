function createStopper(handle) {
  if (typeof handle === "function") return () => handle();
  if (handle && typeof handle.stop === "function") return () => handle.stop();
  return null;
}

function silenceStatus({ listenerActive, lastEventAt, now, limitMs }) {
  if (!listenerActive) return "inactive";
  if (!lastEventAt) return "ok";
  return now - lastEventAt > limitMs ? "silent" : "ok";
}

function createListenerSession({ log }) {
  let stopper = null;
  let starting = false;
  let generation = 0;

  function stopCurrent(reason) {
    const current = stopper;
    stopper = null;
    if (!current) return false;
    try {
      current();
    } catch (error) {
      log.warn("listener", "خطأ أثناء إيقاف المستمع", { reason, message: error.message });
    }
    return true;
  }

  return {
    get active() {
      return stopper !== null || starting;
    },
    async start(api, onEvent) {
      if (stopper || starting) return { started: false, reason: "already_running" };
      starting = true;
      const myGeneration = generation;
      try {
        let handle;
        try {
          handle = await api.listenMqtt((err, event) => {
            if (myGeneration === generation) onEvent(err, event);
          });
        } catch (error) {
          if (myGeneration !== generation) return { started: false, reason: "superseded" };
          throw error;
        }
        if (myGeneration !== generation) {
          const late = createStopper(handle);
          if (late) late();
          return { started: false, reason: "superseded" };
        }
        stopper = createStopper(handle);
        if (!stopper) {
          generation += 1;
          throw new Error("مستمع فيسبوك لا يعيد دالة إيقاف");
        }
        return { started: true };
      } finally {
        starting = false;
      }
    },
    stop(reason) {
      generation += 1;
      return stopCurrent(reason);
    },
  };
}

module.exports = { createListenerSession, createStopper, silenceStatus };
