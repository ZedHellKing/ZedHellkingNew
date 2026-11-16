const path = require("path");
const { login } = require("ws3-fca");
const { loadCommands, handleMessage, handleEvent, commands } = require("./main");
const { loadConfig, ConfigError } = require("./config");
const { createLogger } = require("./logger");
const { acquireLock } = require("./process-lock");
const { createSessionStore, validateAppState } = require("./session-store");
const { createConnectionState } = require("./connection-state");
const { classifyError } = require("./login-errors");
const { computeBackoffDelay } = require("./backoff");
const { createMessageDeduper } = require("./message-dedup");
const { createMemoryMonitor } = require("./memory-monitor");
const { createHealthServer } = require("./health-server");
const { createKeepAlive } = require("./keep-alive");
const { RESTART_EXIT_CODE } = require("./supervisor");

const LOGIN_OPTIONS = {
  listenEvents: true,
  selfListen: false,
  autoMarkDelivery: false,
  autoMarkRead: false,
  forceLogin: false,
  autoReconnect: true,
  online: true,
};

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : error);
  process.exit(1);
}

const log = createLogger();
const SESSION_FILE = config.appstatePath || path.join(__dirname, "appstate.json");
const isSupervised = process.env.BOT_SUPERVISED === "1";
const conn = createConnectionState();
const sessionStore = createSessionStore({ filePath: SESSION_FILE, log });
const deduper = createMessageDeduper();

let releaseLock = () => {};
if (!isSupervised) {
  try {
    releaseLock = acquireLock(path.join(__dirname, "data", "bot.lock"));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

let botApi = null;
let listenerAttached = false;
let listenerStarting = false;
let listenerGeneration = 0;
let listenerHandle = null;
let loginInFlight = false;
let reconnectTimer = null;
let shuttingDown = false;
let silenceWarned = false;
let monitorTimer = null;
let sessionTimer = null;
let keepAlive = null;

function alertOwner(key, text) {
  log.error("alert", text);
  if (!config.alertThreadId || !botApi || !conn.shouldAlert(key)) return;
  botApi
    .sendMessage(`تنبيه: ${text}`, config.alertThreadId)
    .catch((error) => log.warn("alert", "تعذر إرسال التنبيه إلى المالك", { message: error.message }));
}

function markAttention(key, text) {
  alertOwner(key, text);
  stopListener(key);
  conn.markNeedsAttention(text);
}

function stopHandle(handle) {
  try {
    if (handle && typeof handle.stop === "function") handle.stop();
  } catch (error) {
    log.warn("listener", "خطأ أثناء إيقاف المستمع", { message: error.message });
  }
}

function stopListener(reason) {
  listenerGeneration += 1;
  stopHandle(listenerHandle);
  listenerHandle = null;
  listenerAttached = false;
  botApi = null;
  conn.markListenerStopped();
  const pin = commands.get("تثبيت");
  if (pin && pin.stopAll) pin.stopAll();
  log.info("listener", "تم إيقاف مستمع الرسائل", { reason });
}

function persistSession() {
  if (!botApi) return;
  try {
    if (sessionStore.save(botApi.getAppState())) log.info("session", "تم حفظ الجلسة");
  } catch (error) {
    log.warn("session", "تعذر حفظ الجلسة", { message: error.message });
  }
}

function scheduleReconnect(reason) {
  if (shuttingDown || reconnectTimer) return;
  if (!config.reconnectEnabled) {
    conn.setStatus("stopped");
    log.warn("listener", "إعادة الاتصال التلقائي معطلة", { reason });
    return;
  }

  conn.markReconnectAttempt();
  const { reconnectAttempts } = conn.snapshot();
  if (config.maxRestartAttempts > 0 && reconnectAttempts > config.maxRestartAttempts) {
    markAttention("reconnect_limit", "تجاوز عدد محاولات إعادة الاتصال الحد المسموح، يلزم التدخل اليدوي");
    return;
  }

  const delay = computeBackoffDelay({
    attempt: reconnectAttempts,
    initialMs: config.reconnectInitialDelay * 1000,
    maxMs: config.reconnectMaxDelay * 1000,
    jitterRatio: config.reconnectJitter,
  });
  conn.setStatus("reconnecting");
  log.warn("listener", "انقطع الاتصال، جاري إعادة المحاولة", {
    reason,
    attempt: reconnectAttempts,
    delaySeconds: Math.round(delay / 1000),
  });
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot();
  }, delay);
}

function onListenerEvent(api, err, event) {
  if (err) {
    const kind = classifyError(err);
    conn.markError(kind);
    log.error("listener", "خطأ في مستمع الرسائل", {
      kind,
      message: err.message || err.error || err,
    });
    if (kind === "checkpoint") {
      markAttention("checkpoint", "فيسبوك طلب تحققا أمنيا أو قيد الحساب. أوقفت المحاولات، راجع الحساب ثم حدّث الكوكيز");
      return;
    }
    if (kind === "session_expired") {
      markAttention("session_expired", "انتهت صلاحية جلسة فيسبوك. حدّث الكوكيز عبر لوحة الإدارة");
      return;
    }
    stopListener("mqtt_error");
    scheduleReconnect("mqtt_error");
    return;
  }

  if (!event) return;
  conn.markEvent();

  if (event.type === "message" || event.type === "message_reply") {
    if (!deduper.claim(event.messageID)) return;
    conn.markMessage();
    Promise.resolve(handleMessage(api, event)).catch((error) =>
      log.error("messages", "خطأ في معالجة رسالة", { message: error.message || error }),
    );
    return;
  }

  try {
    handleEvent(api, event);
  } catch (error) {
    log.error("messages", "خطأ في معالجة حدث", { message: error.message });
  }
}

async function startListening(api) {
  if (listenerAttached || listenerStarting) return;
  listenerStarting = true;
  const generation = listenerGeneration;
  try {
    const handle = await api.listenMqtt((err, event) => {
      if (generation === listenerGeneration) onListenerEvent(api, err, event);
    });
    if (generation !== listenerGeneration) {
      stopHandle(handle);
      return;
    }
    listenerHandle = handle;
    listenerAttached = true;
    conn.markListenerStarted();
    log.info("listener", "مستمع الرسائل يعمل");
  } catch (error) {
    log.error("listener", "فشل بدء مستمع الرسائل", { message: error.message });
    if (generation === listenerGeneration) scheduleReconnect("listen_start_failed");
  } finally {
    listenerStarting = false;
  }
}

function onLogin(err, api) {
  loginInFlight = false;
  if (shuttingDown) return;

  if (err) {
    const kind = classifyError(err);
    conn.markError(kind);
    if (kind === "checkpoint") {
      markAttention("checkpoint", "فيسبوك طلب تحققا أمنيا أو قيد الحساب. أوقفت المحاولات، راجع الحساب ثم حدّث الكوكيز");
      return;
    }
    if (kind === "session_expired") {
      markAttention("session_expired", "انتهت صلاحية جلسة فيسبوك. حدّث الكوكيز عبر لوحة الإدارة");
      return;
    }
    log.error("login", "فشل تسجيل الدخول", { kind, message: err.message || err.error || err });
    scheduleReconnect("login_failed");
    return;
  }

  botApi = api;
  conn.markLoginSuccess();
  log.info("login", "تم تسجيل الدخول بنجاح");
  persistSession();

  if (api.ctx && api.ctx.lastSeqId) api.ctx.firstListen = true;
  loadCommands();
  startListening(api);

  try {
    const qasf = commands.get("قصف");
    if (qasf && qasf.resumeAll) qasf.resumeAll(api);
  } catch (error) {
    log.error("commands", "خطأ في استئناف قصف", { message: error.message });
  }
}

function startBot() {
  if (shuttingDown || loginInFlight || listenerAttached || listenerStarting) return;

  const appState = sessionStore.load();
  if (!appState) {
    markAttention("missing_session", "لا توجد جلسة فيسبوك صالحة. حدّث الكوكيز عبر لوحة الإدارة");
    return;
  }

  loginInFlight = true;
  conn.setStatus("connecting");
  log.info("login", "جاري تسجيل الدخول");
  login({ appState }, LOGIN_OPTIONS, onLogin);
}

function pruneApiCaches(api) {
  if (!api) return;
  if (Array.isArray(api._msgQueue)) api._msgQueue = [];
  for (const [cacheName, keep] of [["_messageCache", 50], ["_threadCache", 20]]) {
    const cache = api[cacheName];
    if (!cache) continue;
    const keys = Object.keys(cache);
    if (keys.length > keep) keys.slice(0, keys.length - keep).forEach((k) => delete cache[k]);
  }
}

const memoryMonitor = createMemoryMonitor({
  warnMb: config.memoryWarningMb,
  restartMb: config.memoryRestartMb,
  cooldownMs: config.memoryRestartCooldown * 1000,
  uptimeMs: () => process.uptime() * 1000,
  onWarn: (snapshot) => log.warn("memory", "استهلاك الذاكرة مرتفع", snapshot),
  onRestartRequest: (snapshot) => {
    log.warn("memory", "تجاوز استهلاك الذاكرة الحد المحدد، سيُعاد تشغيل الخدمة", {
      ...snapshot,
      limitMb: config.memoryRestartMb,
    });
    shutdown("memory_limit", RESTART_EXIT_CODE);
  },
});

function monitorTick() {
  memoryMonitor.check();
  pruneApiCaches(botApi);

  const snap = conn.snapshot();
  const silentMs = snap.lastEventAt ? Date.now() - snap.lastEventAt : 0;
  const silenceLimitMs = config.listenerSilenceWarn * 1000;
  if (snap.listenerActive && silentMs > silenceLimitMs) {
    if (!silenceWarned) {
      silenceWarned = true;
      log.warn("listener", "لم تصل أي أحداث من فيسبوك منذ فترة طويلة", {
        silentSeconds: Math.round(silentMs / 1000),
      });
    }
  } else {
    silenceWarned = false;
  }
}

async function testSend(threadID) {
  if (!botApi) return { ok: false, error: "not_ready" };
  try {
    await botApi.sendMessage("💀 تجريبة إرسال", threadID);
    return { ok: true, threadID };
  } catch (error) {
    log.warn("send", "فشل الإرسال التجريبي", { message: error.message });
    return { ok: false, error: "send_failed" };
  }
}

function updateCookies(body) {
  const check = validateAppState(body);
  if (!check.ok) return { ok: false, error: check.reason };
  try {
    sessionStore.save(body);
  } catch (error) {
    log.error("session", "تعذر حفظ الجلسة الجديدة", { message: error.message });
    return { ok: false, error: "save_failed" };
  }
  log.info("session", "تم تحديث الجلسة عبر لوحة الإدارة، جاري إعادة الاتصال");
  stopListener("cookies_updated");
  conn.resetReconnectAttempts();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot();
  }, 3000);
  return { ok: true };
}

const healthServer = createHealthServer({
  connectionState: conn,
  adminToken: config.botAdminToken,
  handlers: { testSend, updateCookies },
  log,
});

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  conn.setStatus("stopping");
  log.info("shutdown", "جاري إيقاف الخدمة بشكل آمن", { reason });

  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (monitorTimer) clearInterval(monitorTimer);
  if (sessionTimer) clearInterval(sessionTimer);
  if (keepAlive) keepAlive.stop();
  persistSession();
  stopListener("shutdown");
  healthServer.close().catch(() => {});
  releaseLock();
  process.exit(exitCode);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGHUP", () => log.info("bot", "تم استلام SIGHUP وتجاهله"));
process.on("uncaughtException", (error) => {
  log.error("fatal", "خطأ غير متوقع", { message: error.message });
  shutdown("uncaught_exception", 1);
});
process.on("unhandledRejection", (reason) => {
  log.error("fatal", "وعد غير معالج", { message: reason && reason.message ? reason.message : String(reason) });
});

async function boot() {
  const port = await healthServer.listen(config.port);
  log.info("bot", "بدء تشغيل البوت", { port, supervised: isSupervised, pid: process.pid });

  if (config.monitoringEnabled) {
    monitorTimer = setInterval(monitorTick, config.healthCheckInterval * 1000);
  }
  sessionTimer = setInterval(persistSession, config.sessionSaveInterval * 1000);

  if (config.keepAliveEnabled) {
    keepAlive = createKeepAlive({
      url: `${config.publicBaseUrl}/health`,
      intervalMs: config.keepAliveInterval * 1000,
      log,
    });
    keepAlive.start();
  }

  startBot();
}

boot().catch((error) => {
  log.error("fatal", "تعذر بدء الخدمة", { message: error.message });
  shutdown("boot_failed", 1);
});
