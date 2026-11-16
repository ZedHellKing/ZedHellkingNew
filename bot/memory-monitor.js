const MB = 1024 * 1024;

function createMemoryMonitor({
  warnMb,
  restartMb,
  cooldownMs,
  uptimeMs,
  memoryUsage = () => process.memoryUsage(),
  confirmChecks = 3,
  onWarn,
  onRestartRequest,
}) {
  let consecutiveHigh = 0;
  let warned = false;

  return {
    check() {
      const usage = memoryUsage();
      const snapshot = {
        rssMb: Math.round(usage.rss / MB),
        heapUsedMb: Math.round(usage.heapUsed / MB),
      };

      if (snapshot.rssMb >= warnMb) {
        if (!warned) {
          warned = true;
          onWarn(snapshot);
        }
      } else {
        warned = false;
      }

      consecutiveHigh = snapshot.rssMb >= restartMb ? consecutiveHigh + 1 : 0;
      if (consecutiveHigh >= confirmChecks && uptimeMs() >= cooldownMs) {
        consecutiveHigh = 0;
        onRestartRequest(snapshot);
        return { ...snapshot, restartRequested: true };
      }
      return { ...snapshot, restartRequested: false };
    },
  };
}

module.exports = { createMemoryMonitor };
