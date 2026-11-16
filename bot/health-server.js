const http = require("http");
const crypto = require("crypto");

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function digest(text) {
  return crypto.createHash("sha256").update(String(text)).digest();
}

function isAuthorized(req, adminToken) {
  const match = /^Bearer\s+(.+)$/.exec(req.headers.authorization || "");
  if (!match) return false;
  return crypto.timingSafeEqual(digest(match[1]), digest(adminToken));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function createHealthServer({ connectionState, memoryUsage = () => process.memoryUsage(), adminToken, handlers, log }) {
  function buildStatus() {
    const snap = connectionState.snapshot();
    const usage = memoryUsage();
    return {
      status: snap.status,
      ready: snap.ready,
      loggedIn: snap.loggedIn,
      listenerActive: snap.listenerActive,
      lastEventAt: snap.lastEventAt,
      lastMessageAt: snap.lastMessageAt,
      lastLoginAt: snap.lastLoginAt,
      lastReconnectSuccessAt: snap.lastReconnectSuccessAt,
      lastError: snap.lastError,
      loginAttempts: snap.loginAttempts,
      mqttAttempts: snap.mqttAttempts,
      lastConnectedAt: snap.lastConnectedAt,
      attentionReason: snap.attentionReason,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(usage.rss / 1048576),
        heapUsedMb: Math.round(usage.heapUsed / 1048576),
      },
    };
  }

  async function handleAdmin(req, res, url) {
    if (!adminToken) return sendJson(res, 404, { error: "not_found" });
    if (!isAuthorized(req, adminToken)) return sendJson(res, 401, { error: "unauthorized" });

    if (req.method === "GET" && url.pathname === "/testsend") {
      const threadID = url.searchParams.get("thread");
      if (!threadID) return sendJson(res, 400, { error: "thread_required" });
      const result = await handlers.testSend(threadID);
      return sendJson(res, result.ok ? 200 : 503, result);
    }

    if (req.method === "POST" && url.pathname === "/updatecookies") {
      let parsed;
      try {
        parsed = JSON.parse(await readBody(req));
      } catch {
        return sendJson(res, 400, { error: "invalid_json" });
      }
      const result = await handlers.updateCookies(parsed);
      return sendJson(res, result.ok ? 200 : 400, result);
    }

    return sendJson(res, 404, { error: "not_found" });
  }

  async function route(req, res) {
    const url = new URL(req.url, "http://localhost");
    const { pathname } = url;

    if (req.method === "GET") {
      if (pathname === "/health") return sendJson(res, 200, { status: "alive" });
      if (pathname === "/uptime") return sendJson(res, 200, { uptimeSeconds: Math.floor(process.uptime()) });
      if (pathname === "/") return sendJson(res, 200, buildStatus());
      if (pathname === "/status") return sendJson(res, 200, buildStatus());
      if (pathname === "/ready") {
        const snap = connectionState.snapshot();
        return sendJson(res, snap.ready ? 200 : 503, {
          ready: snap.ready,
          loggedIn: snap.loggedIn,
          listenerActive: snap.listenerActive,
          lastConnectedAt: snap.lastConnectedAt,
        });
      }
      if (pathname === "/ping") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("pong");
      }
    }

    if (pathname === "/testsend" || pathname === "/updatecookies") {
      return handleAdmin(req, res, url);
    }
    return sendJson(res, 404, { error: "not_found" });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((error) => {
      log.error("health", "خطأ في خادم الفحص", { message: error.message });
      if (!res.headersSent) sendJson(res, error.message === "body_too_large" ? 413 : 500, { error: "request_failed" });
    });
  });

  return {
    listen(port) {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          server.off("error", reject);
          resolve(server.address().port);
        });
      });
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

module.exports = { createHealthServer };
