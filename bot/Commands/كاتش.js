const protectedNicknames = new Map();
const protectedGroupNames = new Map();
const protectedGroupNamesDelayed = new Map(); // { name, minMs, maxMs }
const activeNicknameJobs = new Set();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function changeNicknames(api, nickname, threadID, participants) {
  let successCount = 0;
  const failedParticipantIDs = [];

  for (let index = 0; index < participants.length; index++) {
    const uid = String(participants[index]);
    try {
      await api.nickname(nickname, threadID, uid);
      successCount++;
      console.log(`[كاتش] ✅ تم تغيير كنية ${uid}`);
    } catch (e) {
      console.error(`[كاتش] خطأ في كنية ${uid}:`, e.message || e);
      failedParticipantIDs.push(uid);
    }

    // انتظر ثانيتين كاملتين بعد كل محاولة قبل التعامل مع العضو التالي.
    if (index < participants.length - 1) await sleep(2000);
  }

  return { successCount, failedParticipantIDs };
}

module.exports = {
  name: 'كاتش',

  getProtectedNicknames() { return protectedNicknames; },
  getProtectedGroupNames() { return protectedGroupNames; },
  getProtectedGroupNamesDelayed() { return protectedGroupNamesDelayed; },

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    if (body.startsWith('كاتش ')) {
      const nickname = body.slice('كاتش '.length).trim();
      if (!nickname) {
        try { await api.sendMessage('⚠️ مثال: كاتش مستر', threadID); } catch (e) {}
        return;
      }

      if (activeNicknameJobs.has(threadID)) {
        try {
          await api.sendMessage('⏳ أمر كاتش يعمل بالفعل في هذه المجموعة. انتظر حتى ينتهي.', threadID);
        } catch (e) {}
        return;
      }

      activeNicknameJobs.add(threadID);
      try {
        try {
          await api.sendMessage(
            `⏳ جاري جلب أعضاء المجموعة وتغيير الكنيات بالتتابع (فاصل ثانيتين): ${nickname}`,
            threadID
          );
        } catch (e) {}

        const eventParticipants = Array.isArray(event.participantIDs)
          ? event.participantIDs.map(uid => String(uid)).filter(Boolean)
          : [];
        let info;
        let infoParticipants = [];
        let hasCompleteMemberList = false;

        try {
          info = await api.getThreadInfo(threadID);
          hasCompleteMemberList = !!info && Array.isArray(info.participantIDs);
          if (hasCompleteMemberList) {
            infoParticipants = info.participantIDs.map(uid => String(uid)).filter(Boolean);
          }
        } catch (e) {
          console.error('[كاتش] تعذر تحديث قائمة أعضاء المجموعة:', e.message || e);
        }

        const participants = [...new Set([...infoParticipants, ...eventParticipants])];
        if (participants.length === 0) {
          throw new Error('لم أتمكن من جلب قائمة أعضاء المجموعة');
        }

        console.log(`[كاتش] ${participants.length} عضو في المجموعة`);

        protectedNicknames.set(threadID, nickname);

        const { successCount, failedParticipantIDs } = await changeNicknames(
          api,
          nickname,
          threadID,
          participants
        );
        const failedCount = failedParticipantIDs.length;
        const completenessNote = hasCompleteMemberList
          ? ''
          : '\n⚠️ لم تتوفر قائمة المجموعة الكاملة؛ تمت معالجة الأعضاء الظاهرين في الرسالة فقط.';

        try {
          await api.sendMessage(
            `✅ اكتملت محاولة تغيير الكنيات إلى: ${nickname}\n` +
            `🟢 نجح: ${successCount}/${participants.length}\n` +
            `🔴 تعذّر: ${failedCount}\n` +
            `⏱️ الفاصل: ثانيتان بين كل عضو` +
            `${completenessNote}\n` +
            `🛡️ الحماية مفعّلة — أي تغيير سيُعاد تلقائياً`,
            threadID
          );
        } catch (e) {}

      } catch (e) {
        console.error('[كاتش] خطأ:', e.message || e);
        try {
          await api.sendMessage(`❌ تعذر إكمال أمر كاتش: ${e.message || 'حدث خطأ غير متوقع.'}`, threadID);
        } catch (_) {}
      } finally {
        activeNicknameJobs.delete(threadID);
      }
      return;
    }

    // جروب MIN|MAX الاسم — حماية مؤجلة بفاصل عشوائي
    if (body.startsWith('جروب ')) {
      const rest = body.slice('جروب '.length).trim();
      const match = rest.match(/^(\d+)\|(\d+)\s+(.+)$/);
      if (!match) {
        try { await api.sendMessage('⚠️ مثال: جروب 6|9 اسم المجموعة', threadID); } catch (e) {}
        return;
      }
      const minSec = parseInt(match[1], 10);
      const maxSec = parseInt(match[2], 10);
      const groupName = match[3].trim();
      if (minSec >= maxSec) {
        try { await api.sendMessage('⚠️ الحد الأدنى يجب أن يكون أصغر من الأقصى. مثال: جروب 6|9 اسم', threadID); } catch (e) {}
        return;
      }
      const minMs = minSec * 1000;
      const maxMs = maxSec * 1000;
      protectedGroupNamesDelayed.set(threadID, { name: groupName, minMs, maxMs });
      protectedGroupNames.delete(threadID); // إلغاء الحماية الفورية إن وجدت
      try {
        await api.gcname(groupName, threadID);
        await api.sendMessage(
          `✅ تم تغيير اسم المجموعة إلى: ${groupName}\n🛡️ الحماية مفعّلة (رجوع بعد ${minSec}-${maxSec}ث) — أي تغيير سيُعاد تلقائياً`,
          threadID
        );
        console.log(`[جروب] ✅ تم تغيير الاسم إلى "${groupName}" في ${threadID} (${minSec}-${maxSec}ث)`);
      } catch (e) {
        console.error('[جروب] خطأ:', e.message || e);
        try { await api.sendMessage('❌ حدث خطأ في تغيير الاسم.', threadID); } catch (_) {}
      }
      return;
    }

    if (body.startsWith('مجموعة ')) {
      const groupName = body.slice('مجموعة '.length).trim();
      if (!groupName) {
        try { await api.sendMessage('⚠️ مثال: مجموعة مستر', threadID); } catch (e) {}
        return;
      }

      protectedGroupNames.set(threadID, groupName);

      try {
        await api.gcname(groupName, threadID);
        await api.sendMessage(
          `✅ تم تغيير اسم المجموعة إلى: ${groupName}\n🛡️ الحماية مفعّلة — أي تغيير سيُعاد تلقائياً`,
          threadID
        );
        console.log(`[مجموعة] ✅ تم تغيير الاسم إلى "${groupName}" في ${threadID}`);
      } catch (e) {
        console.error('[مجموعة] خطأ:', e.message || e);
        try { await api.sendMessage('❌ حدث خطأ في تغيير الاسم.', threadID); } catch (_) {}
      }
      return;
    }
  },

  // حدث تغيير الكنية: type=event, logMessageType=log:user-nickname
  // logMessageData = untypedData من AdminTextMessage: { participant_id, nickname }
  handleNicknameEvent(api, event) {
    const threadID = String(event.threadID);
    const protectedName = protectedNicknames.get(threadID);
    if (!protectedName) return;

    const data = event.logMessageData || {};
    const changedUID = String(data.participant_id || data.participantID || event.userID || '');
    const newNickname = data.nickname || data.newNickname || '';

    if (!changedUID) return;
    if (newNickname === protectedName) return;

    console.log(`[حماية كنيات] رصد تغيير "${newNickname}" للعضو ${changedUID} — إعادة إلى "${protectedName}"...`);

    setTimeout(async () => {
      try {
        await api.nickname(protectedName, threadID, changedUID);
        console.log(`[حماية كنيات] ✅ أُعيدت كنية ${changedUID} إلى "${protectedName}"`);
      } catch (e) {
        console.error('[حماية كنيات] خطأ:', e.message || e);
      }
    }, 300);
  },

  // حدث تغيير اسم المجموعة: type=event, logMessageType=log:thread-name
  handleGroupNameEvent(api, event) {
    const threadID = String(event.threadID);
    const data = event.logMessageData || {};
    const newName = data.name || data.threadName || event.name || '';

    // وضع الحماية المؤجلة (جروب MIN|MAX)
    const delayedConfig = protectedGroupNamesDelayed.get(threadID);
    if (delayedConfig) {
      if (!newName || newName === delayedConfig.name) return;
      const delayMs = delayedConfig.minMs + Math.floor(Math.random() * (delayedConfig.maxMs - delayedConfig.minMs));
      console.log(`[حماية جروب] رصد تغيير إلى "${newName}" — إعادة بعد ${delayMs/1000}ث...`);
      setTimeout(async () => {
        try {
          await api.gcname(delayedConfig.name, threadID);
          console.log(`[حماية جروب] ✅ أُعيد الاسم إلى "${delayedConfig.name}"`);
        } catch (e) {
          console.error('[حماية جروب] خطأ:', e.message || e);
        }
      }, delayMs);
      return;
    }

    // وضع الحماية الفورية (مجموعة)
    const protectedName = protectedGroupNames.get(threadID);
    if (!protectedName) return;
    if (!newName || newName === protectedName) return;

    console.log(`[حماية مجموعة] رصد تغيير الاسم إلى "${newName}" — إعادة إلى "${protectedName}"...`);
    setTimeout(async () => {
      try {
        await api.gcname(protectedName, threadID);
        console.log(`[حماية مجموعة] ✅ أُعيد الاسم إلى "${protectedName}"`);
      } catch (e) {
        console.error('[حماية مجموعة] خطأ:', e.message || e);
      }
    }, 300);
  }
};
