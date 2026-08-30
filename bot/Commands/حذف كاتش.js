function disableNicknameProtection(threadID) {
  try {
    const { commands } = require('../main');
    const catchCommand = commands.get('كاتش');
    const protectedNicknames = catchCommand &&
      typeof catchCommand.getProtectedNicknames === 'function'
      ? catchCommand.getProtectedNicknames()
      : null;

    if (protectedNicknames) protectedNicknames.delete(threadID);
  } catch (error) {
    console.error('[حذف كاتش] تعذر إيقاف حماية الكنيات:', error.message || error);
  }
}

module.exports = {
  name: 'حذف كاتش',

  async execute(api, event) {
    const threadID = String(event.threadID || '');
    if (!threadID) return;

    try {
      if (event.isGroup === false) {
        await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
        return;
      }

      let participants = Array.isArray(event.participantIDs)
        ? event.participantIDs.map(id => String(id)).filter(Boolean)
        : [];
      if (participants.length === 0) {
        const info = await api.getThreadInfo(threadID);
        if (!info || !info.isGroup) {
          await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
          return;
        }
        participants = (info.participantIDs || []).map(id => String(id)).filter(Boolean);
      }
      participants = [...new Set(participants)];

      // أوقف الحماية أولاً حتى لا تعيد أي كنية أثناء عملية المسح.
      disableNicknameProtection(threadID);

      if (participants.length === 0) {
        await api.sendMessage('✅ تم حذف كاتش وإيقاف حماية الكنيات.', threadID);
        return;
      }

      const results = await Promise.all(
        participants.map(async userID => {
          try {
            await api.nickname('', threadID, userID);
            return true;
          } catch (error) {
            console.error(`[حذف كاتش] فشل حذف كنية ${userID}:`, error.message || error);
            return false;
          }
        })
      );

      const failedCount = results.filter(success => !success).length;
      if (failedCount > 0) {
        await api.sendMessage(
          `⚠️ تم إيقاف حماية الكنيات، لكن تعذر حذف ${failedCount} كنية.`,
          threadID
        );
        return;
      }

      console.log(`[حذف كاتش] ✅ تم حذف كنيات ${participants.length} عضو في ${threadID}`);
      await api.sendMessage('✅ تم حذف كاتش ومسح كل الكنيات وإيقاف الحماية.', threadID);
    } catch (error) {
      console.error('[حذف كاتش] خطأ:', error.message || error);
      try {
        await api.sendMessage(
          `❌ تعذر حذف الكنيات: ${error.message || 'خطأ غير معروف'}`,
          threadID
        );
      } catch (_) {}
    }
  }
};