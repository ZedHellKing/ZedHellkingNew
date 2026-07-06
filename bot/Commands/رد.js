const replyRules = new Map();

module.exports = {
  name: 'رد',

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    if (body.startsWith('رد ') && body.includes('»')) {
      const content = body.slice('رد '.length);
      const sepIdx = content.indexOf('»');
      const trigger = content.slice(0, sepIdx).trim();
      const response = content.slice(sepIdx + 1).trim();

      if (!trigger || !response) {
        try { await api.sendMessage('⚠️ الصيغة: رد [كلمة]» [الرد]', threadID); } catch (e) {}
        return;
      }

      if (!replyRules.has(threadID)) replyRules.set(threadID, new Map());
      replyRules.get(threadID).set(trigger.toLowerCase(), response);

      console.log(`[رد] "${trigger}" → "${response}" في ${threadID}`);
      try { await api.sendMessage(`✅ عند: ${trigger}\nأرد: ${response}`, threadID); } catch (e) {}
      return;
    }

    if (body.startsWith('رد حذف ')) {
      const trigger = body.slice('رد حذف '.length).trim().toLowerCase();
      const rules = replyRules.get(threadID);
      if (rules && rules.has(trigger)) {
        rules.delete(trigger);
        try { await api.sendMessage(`✅ حُذف الرد: ${trigger}`, threadID); } catch (e) {}
      } else {
        try { await api.sendMessage(`⚠️ لا رد لكلمة: ${trigger}`, threadID); } catch (e) {}
      }
      return;
    }

    if (body === 'رد قائمة') {
      const rules = replyRules.get(threadID);
      if (!rules || rules.size === 0) {
        try { await api.sendMessage('📋 لا ردود مسجلة.', threadID); } catch (e) {}
        return;
      }
      let list = '📋 الردود المسجلة:\n\n';
      rules.forEach((resp, trig) => { list += `• ${trig} » ${resp}\n`; });
      try { await api.sendMessage(list, threadID); } catch (e) {}
      return;
    }
  },

  async checkAutoReply(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim().toLowerCase();
    if (!body) return;

    const rules = replyRules.get(threadID);
    if (!rules || rules.size === 0) return;

    if (rules.has(body)) {
      try { await api.sendMessage(rules.get(body), threadID); } catch (e) {
        console.error('[رد تلقائي] خطأ:', e.message || e);
      }
    }
  }
};
