const fs = require('fs');
const path = require('path');

const SAVE_INTERVAL_MS = 5 * 60 * 1000; // كل 5 دقائق
const KEEPALIVE_INTERVAL_MS = 3 * 60 * 60 * 1000; // كل 3 ساعات
const MAX_COOKIE_AGE_HOURS = 48; // إعادة تسجيل دخول إجبارية بعد 48 ساعة

const appstatePath = path.join(__dirname, 'appstate.json');

let saveTimer = null;
let keepaliveTimer = null;
let loginTime = null;
let lastSaveAt = null;
let currentApi = null;
let onExpireCallback = null;

function saveAppState(api, reason) {
  if (!api || typeof api.getAppState !== 'function') return false;
  try {
    const state = api.getAppState();
    if (!state || state.length === 0) return false;
    const tmpPath = appstatePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
    fs.renameSync(tmpPath, appstatePath);
    lastSaveAt = Date.now();
    console.log(`[COOKIE] 💾 حفظ الكوكيز (${state.length} عنصر) — ${reason || 'دوري'}`);
    return true;
  } catch (e) {
    console.error(`[COOKIE] خطأ في حفظ الكوكيز:`, e.message || e);
    return false;
  }
}

function isLikelyExpired(api) {
  try {
    if (!api || typeof api.getCurrentUserID !== 'function') return true;
    const uid = api.getCurrentUserID();
    return !uid;
  } catch (e) {
    return true;
  }
}

function startCookieManager(api, options) {
  if (!api) return;
  currentApi = api;
  loginTime = Date.now();
  onExpireCallback = (options && typeof options.onExpire === 'function') ? options.onExpire : null;

  if (saveTimer) clearInterval(saveTimer);
  if (keepaliveTimer) clearInterval(keepaliveTimer);

  saveTimer = setInterval(() => {
    saveAppState(currentApi, 'حفظ دوري');
  }, SAVE_INTERVAL_MS);

  keepaliveTimer = setInterval(() => {
    if (!currentApi) return;

    const ageHours = (Date.now() - loginTime) / (60 * 60 * 1000);
    if (ageHours >= MAX_COOKIE_AGE_HOURS) {
      console.log(`[COOKIE] ⏰ الجلسة عمرها ${ageHours.toFixed(1)} ساعة — تجديد إجباري`);
      if (onExpireCallback) onExpireCallback();
      return;
    }

    if (isLikelyExpired(currentApi)) {
      console.log(`[COOKIE] ⚠️ الجلسة تبدو منتهية — إعادة تسجيل دخول`);
      if (onExpireCallback) onExpireCallback();
      return;
    }

    saveAppState(currentApi, 'فحص keepalive');
  }, KEEPALIVE_INTERVAL_MS);

  console.log(`[COOKIE] 🔄 تم تشغيل مدير الكوكيز (حفظ كل ${SAVE_INTERVAL_MS / 1000}ث / فحص كل ${KEEPALIVE_INTERVAL_MS / 3600000}س / حد أقصى ${MAX_COOKIE_AGE_HOURS}س)`);
}

function stopCookieManager() {
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
  currentApi = null;
  onExpireCallback = null;
  console.log(`[COOKIE] 🛑 تم إيقاف مدير الكوكيز`);
}

function getCookieStatus() {
  let fileExists = false;
  let cookieCount = 0;
  try {
    if (fs.existsSync(appstatePath)) {
      fileExists = true;
      const data = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
      if (Array.isArray(data)) cookieCount = data.length;
    }
  } catch (e) {}

  const sessionAgeHours = loginTime ? (Date.now() - loginTime) / (60 * 60 * 1000) : null;

  return {
    loginTime: loginTime ? new Date(loginTime).toISOString() : null,
    sessionAgeHours: sessionAgeHours !== null ? Number(sessionAgeHours.toFixed(2)) : null,
    lastSaveAt: lastSaveAt ? new Date(lastSaveAt).toISOString() : null,
    fileExists,
    cookieCount,
    maxAgeHours: MAX_COOKIE_AGE_HOURS,
  };
}

module.exports = { startCookieManager, stopCookieManager, saveAppState, getCookieStatus };
