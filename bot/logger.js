const SENSITIVE_KEY = /cookie|token|password|secret|appstate|authorization/i;
const MAX_STRING_LENGTH = 300;

function truncate(text) {
  const value = String(text);
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...`
    : value;
}

function redact(value, depth = 0) {
  if (value instanceof Error) return { name: value.name, message: truncate(value.message) };
  if (typeof value === "string") return truncate(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 3) return "[...]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item, depth + 1);
  }
  return out;
}

function defaultWrite(level, line) {
  if (level === "ERROR" || level === "WARN") console.error(line);
  else console.log(line);
}

function createLogger({ write = defaultWrite, now = () => new Date() } = {}) {
  function emit(level, category, message, meta) {
    const suffix = meta === undefined ? "" : ` ${JSON.stringify(redact(meta))}`;
    write(level, `[${now().toISOString()}] [${level}] [${category}] ${message}${suffix}`);
  }

  return {
    info: (category, message, meta) => emit("INFO", category, message, meta),
    warn: (category, message, meta) => emit("WARN", category, message, meta),
    error: (category, message, meta) => emit("ERROR", category, message, meta),
  };
}

module.exports = { createLogger, redact };
