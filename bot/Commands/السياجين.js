const fs = require('fs');
const path = require('path');

const IDS_FILE = path.join(__dirname, '..', 'السياجين', 'ids.json');

function loadIDs() {
  let rawIDs;

  try {
    rawIDs = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`تعذر قراءة ملف IDs: ${error.message}`);
  }

  if (!Array.isArray(rawIDs)) {
    throw new Error('ملف IDs يجب أن يحتوي على مصفوفة من الأرقام.');
  }

  const ids = [];
  const seen = new Set();

  for (const value of rawIDs) {
    const id = String(value).trim();
    if (!/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function getThreadInfo(api, threadID) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, info) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(info);
    };

    try {
      const result = api.getThreadInfo(threadID, finish);
      if (result && typeof result.then === 'function') {
        result.then(info => finish(null, info)).catch(finish);
      } else if (result && typeof result === 'object') {
        finish(null, result);
      }
    } catch (error) {
      finish(error);
    }
  });
}

async function addUsersToGroup(api, userIDs, threadID) {
  if (typeof api.gcmember !== 'function') {
    throw new Error('api.gcmember غير متاحة في نسخة ws3-fca الحالية');
  }

  const result = await api.gcmember('add', userIDs, threadID);
  if (result && result.type === 'error_gc') {
    throw new Error(result.error || 'فشل إضافة الأشخاص');
  }
  return result;
}

module.exports = {
  name: 'السياجين',

  async execute(api, event) {
    const threadID = String(event.threadID || '');
    if (!threadID) return;

    let ids;
    try {
      ids = loadIDs();
    } catch (error) {
      console.error('[السياجين] خطأ في ملف IDs:', error.message);
      await api.sendMessage(`❌ ${error.message}`, threadID);
      return;
    }

    if (ids.length === 0) {
      await api.sendMessage('⚠️ ملف السياجين فارغ. أضف IDs داخل bot/السياجين/ids.json', threadID);
      return;
    }

    try {
      if (event.isGroup === false) {
        await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
        return;
      }

      let participantIDs = Array.isArray(event.participantIDs)
        ? event.participantIDs.map(id => String(id)).filter(Boolean)
        : [];

      if (participantIDs.length === 0) {
        const threadInfo = await getThreadInfo(api, threadID);
        if (!threadInfo || !threadInfo.isGroup) {
          await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
          return;
        }
        participantIDs = (threadInfo.participantIDs || [])
          .map(id => String(id))
          .filter(Boolean);
      }

      const currentMembers = new Set(participantIDs);
      const botID = api.getCurrentUserID
        ? String(api.getCurrentUserID())
        : null;
      const pendingIDs = ids.filter(id => id !== botID && !currentMembers.has(id));

      if (pendingIDs.length === 0) {
        await api.sendMessage('✅ كل الأشخاص الموجودين في ملف السياجين داخل المجموعة بالفعل.', threadID);
        return;
      }

      try {
        await addUsersToGroup(api, pendingIDs, threadID);
        console.log(`[السياجين] ✅ تمت إضافة ${pendingIDs.length} شخص دفعة واحدة إلى ${threadID}`);
        await api.sendMessage('𝒚𝒐𝒖 𝒇𝒂𝒄𝒆 𝒕𝒉𝒆 𝒓𝒖𝒊𝒏𝒆𝒅 𝒌𝒊𝒏𝒈', threadID);
      } catch (error) {
        console.error('[السياجين] ❌ فشل الإضافة الجماعية:', error.message || error);
        await api.sendMessage(
          `❌ فشلت الإضافة الجماعية: ${error.message || error}`,
          threadID
        );
      }
    } catch (error) {
      console.error('[السياجين] خطأ:', error.message || error);
      try {
        await api.sendMessage(`❌ حدث خطأ في أمر السياجين: ${error.message || error}`, threadID);
      } catch (_) {}
    }
  },
};