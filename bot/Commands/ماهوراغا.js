const qasf = require('./قصف');
const timingStore = require('../timing-store');

const activeGroups = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearPendingTimer(state) {
  if (state && state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function scheduleNewspaper(api, event) {
  const threadID = String(event.threadID || '');
  const state = activeGroups.get(threadID);
  if (!threadID || !state) return;

  clearPendingTimer(state);
  const messageGeneration = ++state.messageGeneration;

  const timer = setTimeout(async () => {
    const currentState = activeGroups.get(threadID);
    if (
      !currentState ||
      currentState.timer !== timer ||
      currentState.messageGeneration !== messageGeneration
    ) {
      return;
    }

    currentState.timer = null;
    const newspaperNumber = currentState.cycleIndex++;
    try {
      // محاكاة الكتابة البشرية قبل إرسال الجريدة
      const typingTime = 3000 + Math.floor(Math.random() * 3000);
      await qasf.sendTyping(api, threadID, true);
      await sleep(typingTime);
      await qasf.sendTyping(api, threadID, false);

      await api.sendMessage(qasf.getNewspaperText(newspaperNumber), threadID);
      console.log(`[ماهوراغا] ✅ تم إرسال الجريدة #${newspaperNumber + 1} في ${threadID} (كتابة ${(typingTime / 1000).toFixed(1)}ث)`);
    } catch (error) {
      console.error(`[ماهوراغا] خطأ في إرسال الجريدة:`, error.message || error);
      try { await qasf.sendTyping(api, threadID, false); } catch (e) {}
    }
  }, timingStore.get("mahoraga"));

  state.timer = timer;
}

module.exports = {
  name: 'ماهوراغا',

  getDelay() {
    return timingStore.get("mahoraga");
  },

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

    activeGroups.set(threadID, {
      timer: null,
      cycleIndex: 0,
      messageGeneration: 0,
    });
    try {
      await api.sendMessage(qasf.getStartMessage(), threadID);
    } catch (error) {
      activeGroups.delete(threadID);
      console.error(`[ماهوراغا] خطأ في رسالة التشغيل:`, error.message || error);
      return;
    }
    console.log(`[ماهوراغا] ▶️ تم التفعيل في ${threadID} — تنتظر رسالة من المجموعة (كل دقيقة)`);
  },

  handleIncomingMessage(api, event) {
    const threadID = String(event.threadID || '');
    if (!threadID || event.isGroup === false) return;

    const botID = api.getCurrentUserID ? api.getCurrentUserID() : null;
    if (botID && String(event.senderID || '') === String(botID)) return;

    scheduleNewspaper(api, event);
  },

  isActive(threadID) {
    return activeGroups.has(String(threadID));
  },
};
