const fs = require('fs');
const path = require('path');
const ws3Utils = require('ws3-fca/src/utils');

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
  if (api.ctx && api.ctx.mqttClient && typeof api.ctx.mqttClient.publish === 'function') {
    const added = [];
    const failed = [];

    for (const userID of userIDs) {
      try {
        await addUserOverMqtt(api, userID, threadID);
        added.push(userID);
        await sleep(800);
      } catch (error) {
        failed.push({
          userID,
          reason: error.message || String(error),
        });
      }
    }

    return { added, failed };
  }

  if (typeof api.gcmember !== 'function') {
    throw new Error('اتصال MQTT و api.gcmember غير متاحين في نسخة ws3-fca الحالية');
  }

  const result = await api.gcmember('add', userIDs, threadID);
  if (result && result.type === 'error_gc') {
    throw new Error(result.error || 'فشل إضافة الأشخاص');
  }
  return { added: userIDs, failed: [], result };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addUserOverMqtt(api, userID, threadID) {
  return new Promise((resolve, reject) => {
    const ctx = api.ctx;
    ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1;
    ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1;

    const query = {
      label: '23',
      payload: JSON.stringify({
        thread_key: parseInt(threadID, 10),
        contact_ids: [parseInt(userID, 10)],
        sync_group: 1,
      }),
      queue_name: threadID,
      task_id: ctx.wsTaskNumber,
    };

    const context = {
      app_id: ctx.appID,
      payload: {
        epoch_id: parseInt(ws3Utils.generateOfflineThreadingID(), 10),
        tasks: [query],
        version_id: '24631415369801570',
      },
      request_id: ctx.wsReqNumber,
      type: 3,
    };
    context.payload = JSON.stringify(context.payload);

    ctx.mqttClient.publish(
      '/ls_req',
      JSON.stringify(context),
      { qos: 1, retain: false },
      error => error ? reject(error) : resolve()
    );
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
      if (event.isGroup === false) {
        await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
        return;
      }

      const threadInfo = await getThreadInfo(api, threadID);
      if (!threadInfo || threadInfo.isGroup === false) {
        await api.sendMessage('⚠️ هذا الأمر يعمل داخل المجموعات فقط.', threadID);
        return;
      }

      const participantIDs = (threadInfo.participantIDs || [])
        .map(id => String(id))
        .filter(Boolean);
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
        const result = await addUsersToGroup(api, pendingIDs, threadID);
        const addedCount = result.added.length;
        const failedCount = result.failed.length;

        console.log(
          `[السياجين] ✅ تمت إضافة ${addedCount} من ${pendingIDs.length} شخص في ${threadID}`
        );

        if (failedCount === 0) {
          await api.sendMessage('𝒚𝒐𝒖 𝒇𝒂𝒄𝒆 𝒕𝒉𝒆 𝒓𝒖𝒊𝒏𝒆𝒅 𝒌𝒊𝒏𝒈', threadID);
        } else {
          await api.sendMessage(
            `⚠️ تمت إضافة ${addedCount} شخص، وتعذر إضافة ${failedCount}.`,
            threadID
          );
        }
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