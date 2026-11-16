function computeBackoffDelay({
  attempt,
  initialMs,
  maxMs,
  jitterRatio = 0,
  random = Math.random,
}) {
  const exponential = Math.min(maxMs, initialMs * 2 ** Math.max(0, attempt - 1));
  const spread = exponential * jitterRatio;
  const jittered = exponential - spread + random() * 2 * spread;
  return Math.max(0, Math.min(maxMs, Math.round(jittered)));
}

module.exports = { computeBackoffDelay };
