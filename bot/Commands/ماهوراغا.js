const qasf = require('./قصف');

const activeGroups = new Map();
const DELAY_MS = 4000;

function clearPendingTimer(state) {
  if (state && state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function isControlMessage(body) {
  return (
    body === 'ماهوراغا' ||
    body === 'ماهوراغا ايقاف' ||
    body === 'ماهوراغا إيقاف'
  );
}

function scheduleNewspaper(api, event) {
  const threadID = String(event.threadID || '');
  const state = activeGroups.get(threadID);
  if (!threadID || !state) return;

  clearPendingTimer(state);

  const timer = setTimeout(async () => {
    const currentState = activeGroups.get(threadID);
    if (!currentState || currentState.timer !== timer) return;

    currentState.timer = null;
    const newspaperNumber = currentState.cycleIndex++;
    try {
      await api.sendMessage(qasf.getNewspaperText(newspaperNumber), threadID);
      console.log(`[ماهوراغا] ✅ تم إرسال الجريدة #${newspaperNumber + 1} في ${threadID}`);
    } catch (error) {
      console.error(`[ماهوراغا] خطأ في إرسال الجريدة:`, error.message || error);
    }
  }, DELAY_MS);

  state.timer = timer;
}

module.exports = {
  name: 'ماهوراغا',

  async execute(api, event) {
    const threadID = String(event.threadID || '');
    const body = (event.body || '').trim();

    if (!threadID) return;

    if (body === 'ماهوراغا ايقاف' || body === 'ماهوراغا إيقاف') {
      const state = activeGroups.get(threadID);
      if (!state) {
        try { await api.sendMessage('⚠️ لا يوجد إرسال ماهوراغا يعمل حالياً.', threadID); } catch (e) {}
        return;
      }

      clearPendingTimer(state);
      activeGroups.delete(threadID);
      try {
        await api.sendMessage(qasf.getStopMessage(), threadID);
      } catch (e) {}
      console.log(`[ماهوراغا] ⏹️ توقف في ${threadID}`);
      return;
    }

    if (body !== 'ماهوراغا') return;

    if (event.isGroup === false) {
      try { await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID); } catch (e) {}
      return;
    }

    if (activeGroups.has(threadID)) {
      try { await api.sendMessage('⚠️ ماهوراغا تعمل بالفعل!', threadID); } catch (e) {}
      return;
    }

    activeGroups.set(threadID, { timer: null, cycleIndex: 0 });
    try {
      await api.sendMessage(qasf.getStartMessage(), threadID);
    } catch (e) {}
    console.log(`[ماهوراغا] ▶️ تم التفعيل في ${threadID} — الجريدة بعد 4 ثوانٍ من آخر رسالة`);
  },

  handleIncomingMessage(api, event) {
    const threadID = String(event.threadID || '');
    const body = (event.body || '').trim();
    if (!threadID || event.isGroup === false || isControlMessage(body)) return;

    const botID = api.getCurrentUserID ? api.getCurrentUserID() : null;
    if (botID && String(event.senderID || '') === String(botID)) return;

    scheduleNewspaper(api, event);
  },

  isActive(threadID) {
    return activeGroups.has(String(threadID));
  },
};