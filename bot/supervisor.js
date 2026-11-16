const fs = require("fs");
const path = require("path");
const { fork: realFork } = require("child_process");
const { computeBackoffDelay } = require("./backoff");
const { writeFileAtomic } = require("./atomic-file");
const { loadConfig, ConfigError } = require("./config");
const { createLogger } = require("./logger");
const { acquireLock } = require("./process-lock");

const RESTART_EXIT_CODE = 75;
const RESTART_NOW_DELAY_MS = 5000;
const STABLE_UPTIME_MS = 5 * 60 * 1000;
const SHUTDOWN_GRACE_MS = 15000;
const CRASH_HISTORY_LIMIT = 50;

function readCrashHistory(historyPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createSupervisor({
  childScript,
  config,
  log,
  crashHistoryPath,
  onExit,
  env = process.env,
  fork = realFork,
  now = () => Date.now(),
  schedule = setTimeout,
  cancel = clearTimeout,
  random = Math.random,
}) {
  let child = null;
  let childStartedAt = 0;
  let finished = false;
  let stopping = false;
  let consecutiveFailures = 0;
  let restartTimer = null;
  let graceTimer = null;

  function recordCrash(entry) {
    try {
      const history = readCrashHistory(crashHistoryPath);
      history.push(entry);
      writeFileAtomic(crashHistoryPath, JSON.stringify(history.slice(-CRASH_HISTORY_LIMIT), null, 2));
    } catch (error) {
      log.warn("supervisor", "تعذر حفظ سجل الأعطال", { message: error.message });
    }
  }

  function scheduleSpawn(delayMs) {
    log.info("supervisor", `إعادة تشغيل البوت بعد ${Math.round(delayMs / 1000)} ثانية`);
    restartTimer = schedule(() => {
      restartTimer = null;
      spawnChild();
    }, delayMs);
  }

  function handleExit(exitedChild, code, signal) {
    if (finished || exitedChild !== child) return;
    finished = true;
    child = null;
    if (graceTimer) cancel(graceTimer);
    graceTimer = null;

    if (stopping) {
      onExit(0);
      return;
    }

    if (code === RESTART_EXIT_CODE) {
      recordCrash({ at: new Date(now()).toISOString(), type: "planned_restart", code });
      log.warn("supervisor", "طلب البوت إعادة تشغيل مخططة");
      scheduleSpawn(RESTART_NOW_DELAY_MS);
      return;
    }

    const uptimeMs = now() - childStartedAt;
    consecutiveFailures = uptimeMs >= STABLE_UPTIME_MS ? 1 : consecutiveFailures + 1;
    recordCrash({
      at: new Date(now()).toISOString(),
      type: "crash",
      code,
      signal,
      uptimeSeconds: Math.round(uptimeMs / 1000),
      consecutiveFailures,
    });
    log.error("supervisor", "توقفت عملية البوت بشكل غير متوقع", {
      code,
      signal,
      uptimeSeconds: Math.round(uptimeMs / 1000),
      consecutiveFailures,
    });

    if (config.maxRestartAttempts > 0 && consecutiveFailures > config.maxRestartAttempts) {
      log.error("supervisor", "تم تجاوز الحد الأقصى لمحاولات إعادة التشغيل، سيتوقف المشرف");
      onExit(1);
      return;
    }

    scheduleSpawn(computeBackoffDelay({
      attempt: consecutiveFailures,
      initialMs: config.reconnectInitialDelay * 1000,
      maxMs: config.reconnectMaxDelay * 1000,
      jitterRatio: config.reconnectJitter,
      random,
    }));
  }

  function spawnChild() {
    finished = false;
    childStartedAt = now();
    const current = fork(childScript, [], {
      stdio: "inherit",
      env: { ...env, BOT_SUPERVISED: "1" },
    });
    child = current;
    current.on("exit", (code, signal) => handleExit(current, code, signal));
    current.on("error", (error) => {
      log.error("supervisor", "تعذر تشغيل عملية البوت", { message: error.message });
      handleExit(current, null, "spawn_error");
    });
    log.info("supervisor", "تم تشغيل عملية البوت");
  }

  return {
    start() {
      spawnChild();
    },
    stop(reason) {
      if (stopping) return;
      stopping = true;
      log.info("supervisor", "طلب إيقاف الخدمة", { reason });
      if (restartTimer) cancel(restartTimer);
      restartTimer = null;
      if (!child) {
        onExit(0);
        return;
      }
      child.kill("SIGTERM");
      graceTimer = schedule(() => {
        log.warn("supervisor", "انتهت مهلة الإغلاق، سيتم إنهاء العملية قسرا");
        if (child) child.kill("SIGKILL");
      }, SHUTDOWN_GRACE_MS);
    },
  };
}

function runSupervisorMain() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) console.error(error.message);
    else console.error(error);
    process.exit(1);
  }

  const log = createLogger();
  const dataDir = path.join(__dirname, "data");
  let releaseLock;
  try {
    releaseLock = acquireLock(path.join(dataDir, "bot.lock"));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const supervisor = createSupervisor({
    childScript: path.join(__dirname, "index.js"),
    config,
    log,
    crashHistoryPath: path.join(dataDir, "crash-history.json"),
    onExit: (code) => {
      releaseLock();
      process.exit(code);
    },
  });

  process.on("SIGTERM", () => supervisor.stop("SIGTERM"));
  process.on("SIGINT", () => supervisor.stop("SIGINT"));
  supervisor.start();
}

if (require.main === module) runSupervisorMain();

module.exports = { createSupervisor, RESTART_EXIT_CODE };
