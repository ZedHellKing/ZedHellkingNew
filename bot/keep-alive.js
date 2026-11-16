function createKeepAlive({ url, intervalMs, log, fetchImpl = fetch, timeoutMs = 15000 }) {
  let timer = null;
  let consecutiveFailures = 0;

  async function ping() {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures += 1;
      log.warn("keep-alive", "فشل فحص الخدمة الخارجي", {
        message: error.message,
        consecutiveFailures,
      });
    }
  }

  return {
    ping,
    start() {
      timer = setInterval(ping, intervalMs);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

module.exports = { createKeepAlive };
