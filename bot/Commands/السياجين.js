const fs = require('fs');
const path = require('path');

const IDS_FILE = path.join(__dirname, '..', 'السياجين', 'ids.json');
const ADD_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    try {
      api.getThreadInfo(threadID, (error, info) => {
        if (error) reject(error);
        else resolve(info);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function addUserToGroup(api, userID, threadID) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    try {
      const result = api.addUserToGroup(userID, threadID, finish);
      if (result && typeof result.then === 'function') {
        result.then(() => finish()).catch(finish);
      }
    } catch (error) {
      finish(error);
    }
  });
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
      const threadInfo = await getThreadInfo(api, threadID);
      if (!threadInfo || !threadInfo.isGroup) {
        await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
        return;
      }

      const currentMembers = new Set(
        (threadInfo.participantIDs || []).map(id => String(id))
      );
      const botID = api.getCurrentUserID
        ? String(api.getCurrentUserID())
        : null;
      const pendingIDs = ids.filter(id => id !== botID && !currentMembers.has(id));

      if (pendingIDs.length === 0) {
        await api.sendMessage('✅ كل الأشخاص الموجودين في ملف السياجين داخل المجموعة بالفعل.', threadID);
        return;
      }

      await api.sendMessage(
        `⏳ جاري إضافة ${pendingIDs.length} شخص من ملف السياجين...`,
        threadID
      );

      let successCount = 0;
      const failedIDs = [];

      for (const userID of pendingIDs) {
        try {
          await addUserToGroup(api, userID, threadID);
          successCount++;
          console.log(`[السياجين] ✅ تمت إضافة ${userID} إلى ${threadID}`);
        } catch (error) {
          failedIDs.push(userID);
          console.error(`[السياجين] ❌ فشل إضافة ${userID}:`, error.message || error);
        }
        await sleep(ADD_DELAY_MS);
      }

      const resultLines = [
        `✅ انتهى أمر السياجين`,
        `تمت الإضافة: ${successCount}/${pendingIDs.length}`,
      ];

      if (failedIDs.length > 0) {
        resultLines.push(`❌ فشل: ${failedIDs.join(', ')}`);
      }

      await api.sendMessage(resultLines.join('\n'), threadID);
    } catch (error) {
      console.error('[السياجين] خطأ:', error.message || error);
      try {
        await api.sendMessage(`❌ حدث خطأ في أمر السياجين: ${error.message || error}`, threadID);
      } catch (_) {}
    }
  },
};