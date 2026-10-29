// ─── صمّام الأمان العالمي: لا يموت البوت أبداً ───
process.on('uncaughtException', (err) => {
  console.error('[الأسطورة جان] 🔴 خطأ غير متوقع:', err && err.message ? err.message : String(err));
  console.log('[الأسطورة جان] 🟢 استمرار... إعادة الاتصال خلال 10 ثواني');
  scheduleRestart(10000);
});

process.on('unhandledRejection', (reason) => {
  console.error('[الأسطورة جان] 🔴 وعد غير معالج:', reason && reason.message ? reason.message : String(reason));
  console.log('[الأسطورة جان] 🟢 استمرار...');
});

process.on('SIGTERM', () => {
  console.log('[الأسطورة جان] ⚠️ استلمت SIGTERM — البوت يتجاهلها ويكمل');
});

process.on('SIGHUP', () => {
  console.log('[الأسطورة جان] ⚠️ استلمت SIGHUP — البوت يتجاهلها ويكمل');
});

const fs = require('fs');
const path = require('path');
const express = require('express');
const { login } = require('ws3-fca');
const { loadCommands, handleMessage, handleEvent } = require('./main');

const PORT = process.env.PORT || 3000;
const app = express();

app.get('/', (req, res) => {
  res.json({
    status: botApi ? '🟢 بوت الأسطورة جان يعمل' : '🔴 جاري إعادة الاتصال...',
    bot: 'الأسطورة جان',
    loggedIn: !!botApi,
    uptime: Math.floor(process.uptime()) + ' ثانية',
    reconnectAttempts,
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => res.send('pong - الأسطورة جان حي ويعمل 💀'));

app.get('/testsend', async (req, res) => {
  const threadID = req.query.thread;
  if (!threadID || !botApi) return res.status(400).json({ error: 'bot not ready' });
  try {
    await botApi.sendMessage('💀 تجريبة إرسال', threadID);
    res.json({ success: true, threadID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/updatecookies', express.json(), (req, res) => {
  const appstatePath = path.join(__dirname, 'appstate.json');
  try {
    const cookies = req.body;
    if (!Array.isArray(cookies) || cookies.length === 0)
      return res.status(400).json({ error: 'Invalid cookies format.' });
    fs.writeFileSync(appstatePath, JSON.stringify(cookies, null, 2));
    console.log('[الأسطورة جان] ✅ تم تحديث الكوكيز عبر HTTP');
    res.json({ success: true, message: 'Cookies updated. Reconnecting...' });
    scheduleRestart(3000);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[الأسطورة جان] 🌐 خادم Uptime يعمل على المنفذ ${PORT}`);
});

let botApi = null;
let msgEmitter = null;
let isRestarting = false;
let reconnectAttempts = 0;

// ─── Heartbeat كل 30 ثانية ───
let heartbeatInterval = null;
function startHeartbeat(api) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    try {
      if (api && api.getCurrentUserID) {
        api.getCurrentUserID();
        console.log('[الأسطورة جان] 💓 Heartbeat');
      }
    } catch (e) {
      console.error('[الأسطورة جان] ⚠️ Heartbeat failed:', e.message);
    }
  }, 30000);
}

// ─── تنظيف الذاكرة كل 10 دقائق ───
function startMemorySweeper(api) {
  setInterval(() => {
    try {
      if (api && api._msgQueue && Array.isArray(api._msgQueue)) api._msgQueue = [];
      if (api && api._messageCache) {
        const keys = Object.keys(api._messageCache);
        if (keys.length > 50) keys.slice(0, keys.length - 50).forEach(k => delete api._messageCache[k]);
      }
      if (api && api._threadCache) {
        const keys = Object.keys(api._threadCache);
        if (keys.length > 20) keys.slice(0, keys.length - 20).forEach(k => delete api._threadCache[k]);
      }
      if (typeof global.gc === 'function') global.gc();
      console.log('[SYSTEM] 🟢 تنظيف الذاكرة');
    } catch (e) {}
  }, 10 * 60 * 1000);
}

// ─── حفظ appstate كل 30 دقيقة ───
function startAppstateSaver(api) {
  setInterval(() => {
    try {
      const state = api.getAppState();
      if (state && state.length > 0) {
        fs.writeFileSync(path.join(__dirname, 'appstate.json'), JSON.stringify(state, null, 2));
      }
    } catch (e) {}
  }, 30 * 60 * 1000);
}

// ─── المحرك الرئيسي: يعيد المحاولة دائماً ───
function startBot() {
  if (isRestarting) return;

  const appstatePath = path.join(__dirname, 'appstate.json');

  // لو الملف مش موجود → ننتظر ونحاول مجدداً
  if (!fs.existsSync(appstatePath)) {
    console.error('[الأسطورة جان] ❌ appstate.json غير موجود — إعادة المحاولة بعد 30 ثانية');
    setTimeout(startBot, 30000);
    return;
  }

  let appstate;
  try {
    appstate = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
  } catch (e) {
    console.error('[الأسطورة جان] ❌ خطأ في قراءة appstate.json:', e.message, '— إعادة بعد 30 ثانية');
    setTimeout(startBot, 30000);
    return;
  }

  console.log('[الأسطورة جان] 🚀 جاري تسجيل الدخول...');

  login(
    { appState: appstate },
    {
      listenEvents: true,
      selfListen: false,
      autoMarkDelivery: false,
      autoMarkRead: false,
      forceLogin: false,
      autoReconnect: true,
      online: true
    },
    (err, api) => {
      if (err) {
        const errStr = JSON.stringify(err);
        console.error('[الأسطورة جان] ❌ فشل تسجيل الدخول:', errStr);
        const errMsg = String(err.message || err.error || errStr);

        // فيسبوك حظر الجلسة → انتظر 5 دقائق
        if (errMsg.includes('retrieving userID') || errMsg.includes('blocked') || errMsg.includes('unknown location') || errMsg.includes('checkpoint')) {
          console.log('[الأسطورة جان] 🔴 checkpoint أو حظر — إعادة بعد 5 دقائق');
          isRestarting = false;
          setTimeout(startBot, 5 * 60 * 1000);
          return;
        }

        // أي خطأ آخر → انتظر مع backoff (15ث → 30ث → 60ث → 120ث max)
        reconnectAttempts++;
        const delay = Math.min(15000 * reconnectAttempts, 120000);
        console.log(`[الأسطورة جان] ⏳ إعادة بعد ${delay / 1000}ث (محاولة ${reconnectAttempts})`);
        isRestarting = false;
        setTimeout(startBot, delay);
        return;
      }

      console.log('[الأسطورة جان] ✅ تم تسجيل الدخول!');
      isRestarting = false;
      reconnectAttempts = 0;
      botApi = api;

      // حفظ فوري للـ appstate
      try {
        const state = api.getAppState();
        if (state && state.length > 0)
          fs.writeFileSync(appstatePath, JSON.stringify(state, null, 2));
        console.log('[الأسطورة جان] 💾 تم تحديث appstate.json');
      } catch (e) {}

      const ctx = api.ctx;
      if (ctx && ctx.lastSeqId) {
        ctx.firstListen = true;
        console.log(`[الأسطورة جان] 🔑 Sequence ID: ${ctx.lastSeqId}`);
      } else {
        console.log('[الأسطورة جان] ⚠️ لم يُعثر على irisSeqID');
      }

      loadCommands();
      startListening(api);
      startHeartbeat(api);
      startMemorySweeper(api);
      startAppstateSaver(api);

      // استئناف حلقات القصف بعد إعادة الاتصال
      try {
        const { commands } = require('./main');
        const qasf = commands.get('قصف');
        if (qasf && qasf.resumeAll) qasf.resumeAll(api);
        const pin = commands.get('تثبيت');
        if (pin && pin.resumeAll) pin.resumeAll(api);
      } catch (e) {
        console.error('[الأسطورة جان] خطأ في استئناف الحمايات:', e.message);
      }

      console.log('[الأسطورة جان] 🤖 بوت "الأسطورة جان" يعمل — لا يتوقف أبداً 💀');
      console.log('[الأسطورة جان] ─────────────────────────────────');
      console.log('[الأسطورة جان] 📋 الأوامر المتاحة:');
      console.log('[الأسطورة جان]   • زيد تشغيل / زيد إيقاف');
      console.log('[الأسطورة جان]   • بانكاي [ID] / بانكاي ايقاف');
      console.log('[الأسطورة جان]   • قصف / قصف ايقاف');
      console.log('[الأسطورة جان]   • ماهوراغا / ماهوراغا ايقاف');
      console.log('[الأسطورة جان]   • كاتش / مجموعة / جروب');
      console.log('[الأسطورة جان]   • تثبيت (بالرد على صورة)');
      console.log('[الأسطورة جان]   • رد [كلمة]» [رد]');
      console.log('[الأسطورة جان]   • حالة');
      console.log('[الأسطورة جان]   • يوت [اسم المقطع]');
      console.log('[الأسطورة جان] ─────────────────────────────────');
    }
  );
}

// ─── مستمع الأحداث ───
async function startListening(api) {
  try {
    const callback = (err, event) => {
      if (err) {
        console.error('[الأسطورة جان] ⚠️ خطأ في الاستماع:', JSON.stringify(err));
        const errMsg = String(err.message || err.error || err);

        // أخطاء جلسة → أعد تسجيل الدخول
        if (errMsg.includes('Not logged in') || errMsg.includes('sequence ID') ||
            errMsg.includes('appstate') || errMsg.includes('Failed to get')) {
          scheduleRestart(15000);
        } else {
          scheduleRestart(5000);
        }
        return;
      }

      if (!event) return;
      try {
        const type = event.type || 'unknown';
        const threadID = String(event.threadID || '');
        const senderID = String(event.senderID || '');
        const body = (event.body || '').substring(0, 50);
        if (type !== 'typ' && type !== 'read_receipt') {
          console.log(`[الأسطورة جان] 📩 type=${type} thread=${threadID} sender=${senderID} body="${body}"`);
        }
        if (type === 'message' || type === 'message_reply') {
          handleMessage(api, event);
        } else {
          handleEvent(api, event);
        }
      } catch (e) {
        console.error('[الأسطورة جان] ⚠️ خطأ في معالجة الحدث:', e.message);
      }
    };

    msgEmitter = await api.listenMqtt(callback);
    console.log('[الأسطورة جان] 👂 البوت يستمع...');
  } catch (e) {
    console.error('[الأسطورة جان] ❌ استثناء في startListening:', e.message);
    scheduleRestart(10000);
  }
}

// ─── جدولة إعادة الاتصال: لا تُكرر إذا كانت جارية ───
function scheduleRestart(delay) {
  if (isRestarting) return;
  isRestarting = true;

  try { if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; } } catch (e) {}
  try { if (msgEmitter && typeof msgEmitter.stop === 'function') msgEmitter.stop(); } catch (e) {}

  msgEmitter = null;
  botApi = null;

  reconnectAttempts++;
  const actualDelay = Math.min(delay * Math.max(reconnectAttempts, 1), 120000);
  console.log(`[الأسطورة جان] ⏳ إعادة الاتصال بعد ${actualDelay / 1000}ث (محاولة ${reconnectAttempts})`);

  setTimeout(() => {
    isRestarting = false;
    startBot();
  }, actualDelay);
}

startBot();
