const path = require("path");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const SETTINGS = [
  { env: "PORT", key: "port", type: "int", min: 1, max: 65535, def: 3000 },
  { env: "KEEP_ALIVE_ENABLED", key: "keepAliveEnabled", type: "bool", def: false },
  { env: "KEEP_ALIVE_INTERVAL", key: "keepAliveInterval", type: "int", min: 60, max: 86400, def: 600 },
  { env: "PUBLIC_BASE_URL", key: "publicBaseUrl", type: "url", def: "" },
  { env: "HEALTH_CHECK_INTERVAL", key: "healthCheckInterval", type: "int", min: 5, max: 3600, def: 30 },
  { env: "RECONNECT_ENABLED", key: "reconnectEnabled", type: "bool", def: true },
  { env: "RECONNECT_INITIAL_DELAY", key: "reconnectInitialDelay", type: "int", min: 1, max: 3600, def: 15 },
  { env: "RECONNECT_MAX_DELAY", key: "reconnectMaxDelay", type: "int", min: 1, max: 86400, def: 300 },
  { env: "RECONNECT_JITTER", key: "reconnectJitter", type: "float", min: 0, max: 1, def: 0.2 },
  { env: "RECONNECT_STABLE_SECONDS", key: "reconnectStableSeconds", type: "int", min: 30, max: 86400, def: 300 },
  { env: "MAX_RESTART_ATTEMPTS", key: "maxRestartAttempts", type: "int", min: 0, max: 100000, def: 0 },
  { env: "SESSION_SAVE_INTERVAL", key: "sessionSaveInterval", type: "int", min: 60, max: 86400, def: 1800 },
  { env: "MEMORY_WARNING_MB", key: "memoryWarningMb", type: "int", min: 16, max: 65536, def: 512 },
  { env: "MEMORY_RESTART_MB", key: "memoryRestartMb", type: "int", min: 16, max: 65536, def: 1024 },
  { env: "MEMORY_RESTART_COOLDOWN", key: "memoryRestartCooldown", type: "int", min: 60, max: 86400, def: 1800 },
  { env: "MEMORY_CONFIRM_CHECKS", key: "memoryConfirmChecks", type: "int", min: 1, max: 20, def: 3 },
  { env: "LISTENER_SILENCE_WARN", key: "listenerSilenceWarn", type: "int", min: 60, max: 604800, def: 3600 },
  { env: "MONITORING_ENABLED", key: "monitoringEnabled", type: "bool", def: true },
  { env: "BOT_ADMIN_TOKEN", key: "botAdminToken", type: "secret", def: "" },
  { env: "ALERT_THREAD_ID", key: "alertThreadId", type: "string", def: "" },
  { env: "APPSTATE_PATH", key: "appstatePath", type: "path", def: "" },
];

class ConfigError extends Error {}

function parseSetting(setting, text) {
  const rangeError = `يجب أن تكون بين ${setting.min} و${setting.max}`;
  switch (setting.type) {
    case "int": {
      if (!/^-?\d+$/.test(text)) return { error: "يجب أن تكون عددا صحيحا" };
      const value = Number(text);
      if (value < setting.min || value > setting.max) return { error: rangeError };
      return { value };
    }
    case "float": {
      const value = Number(text);
      if (!Number.isFinite(value)) return { error: "يجب أن تكون رقما" };
      if (value < setting.min || value > setting.max) return { error: rangeError };
      return { value };
    }
    case "bool": {
      const lower = text.toLowerCase();
      if (TRUE_VALUES.has(lower)) return { value: true };
      if (FALSE_VALUES.has(lower)) return { value: false };
      return { error: "يجب أن تكون true أو false" };
    }
    case "url": {
      try {
        const url = new URL(text);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return { error: "يجب أن يبدأ الرابط بـ http أو https" };
        }
      } catch {
        return { error: "رابط غير صالح" };
      }
      return { value: text.replace(/\/+$/, "") };
    }
    case "secret":
      if (text.length < 16) return { error: "يجب ألا يقل طولها عن 16 حرفا" };
      return { value: text };
    case "path":
      return { value: path.resolve(text) };
    default:
      return { value: text };
  }
}

function loadConfig(env = process.env) {
  const errors = [];
  const config = {};

  for (const setting of SETTINGS) {
    const text = String(env[setting.env] ?? "").trim();
    if (text === "") {
      config[setting.key] = setting.def;
      continue;
    }
    const result = parseSetting(setting, text);
    if (result.error) errors.push(`${setting.env}: ${result.error}`);
    else config[setting.key] = result.value;
  }

  if (errors.length === 0) {
    if (config.reconnectMaxDelay < config.reconnectInitialDelay) {
      errors.push("RECONNECT_MAX_DELAY: يجب ألا تكون أقل من RECONNECT_INITIAL_DELAY");
    }
    if (config.memoryRestartMb <= config.memoryWarningMb) {
      errors.push("MEMORY_RESTART_MB: يجب أن تكون أكبر من MEMORY_WARNING_MB");
    }
    if (config.keepAliveEnabled && !config.publicBaseUrl) {
      errors.push("PUBLIC_BASE_URL: مطلوب عند تفعيل KEEP_ALIVE_ENABLED");
    }
  }

  if (errors.length > 0) {
    throw new ConfigError(`إعدادات غير صحيحة:\n - ${errors.join("\n - ")}`);
  }

  return Object.freeze(config);
}

module.exports = { loadConfig, ConfigError };
