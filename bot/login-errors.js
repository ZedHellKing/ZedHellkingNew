const CHECKPOINT_PATTERNS = [
  "checkpoint",
  "blocked",
  "unknown location",
  "verification",
];

const SESSION_EXPIRED_PATTERNS = [
  "retrieving userid",
  "not logged in",
  "login required",
  "appstate",
  "session expired",
];

function classifyError(err) {
  const text = String((err && (err.message || err.error)) || err || "").toLowerCase();
  if (CHECKPOINT_PATTERNS.some((p) => text.includes(p))) return "checkpoint";
  if (SESSION_EXPIRED_PATTERNS.some((p) => text.includes(p))) return "session_expired";
  return "transient";
}

module.exports = { classifyError };
