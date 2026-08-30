const activeRuns = new Map();
const ws3Utils = require('ws3-fca/src/utils');

const STOP_MESSAGES = new Set(['بانكاي ايقاف', 'بانكاي إيقاف']);
const START_PREFIX = 'بانكاي ';
const CYCLE_DELAY = 4000;

function getTargetID(event, body) {
  if (event.mentions && Object.keys(event.mentions).length > 0) {
    return String(Object.keys(event.mentions)[0]);
  }

  const targetID = body.slice(START_PREFIX.length).trim().split(/\s+/)[0];
  return targetID || null;
}

function stopRun(threadID) {
  const run = activeRuns.get(threadID);
  if (!run) return false;

  run.stopped = true;
  if (run.timer) clearTimeout(run.timer);
  activeRuns.delete(threadID);
  return true;
}

function callDirectGroupMemberAction(api, action, targetID, threadID) {
  return new Promise((resolve, reject) => {
    try {
      const ctx = api.ctx;
      if (!ctx || !ctx.mqttClient || typeof ctx.mqttClient.publish !== 'function') {
        throw new Error('اتصال MQTT غير متاح لتنفيذ بانكاي');
      }

      ctx.wsReqNumber = (ctx.wsReqNumber || 0) + 1;
      ctx.wsTaskNumber = (ctx.wsTaskNumber || 0) + 1;

      const queryPayload = action === 'add'
        ? {
            thread_key: parseInt(threadID, 10),
            contact_ids: [parseInt(targetID, 10)],
            sync_group: 1
          }
        : {
            thread_id: threadID,
            contact_id: targetID,
            sync_group: 1
          };

      const query = {
        label: action === 'add' ? '23' : '140',
        payload: JSON.stringify(queryPayload),
        queue_name: action === 'add' ? threadID : 'remove_participant_v2',
        task_id: ctx.wsTaskNumber
      };

      const context = {
        app_id: ctx.appID,
        payload: {
          epoch_id: parseInt(ws3Utils.generateOfflineThreadingID(), 10),
          tasks: [query],
          version_id: '24631415369801570'
        },
        request_id: ctx.wsReqNumber,
        type: 3
      };
      context.payload = JSON.stringify(context.payload);

      ctx.mqttClient.publish(
        '/ls_req',
        JSON.stringify(context),
        { qos: 1, retain: false },
        error => {
          if (error) reject(error);
          else resolve({ action, targetID, threadID });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function callGroupMemberAction(api, action, targetID, threadID) {
  if (api.ctx && api.ctx.mqttClient) {
    return callDirectGroupMemberAction(api, action, targetID, threadID);
  }

  if (typeof api.gcmember !== 'function') {
    throw new Error('اتصال MQTT و api.gcmember غير متاحين في نسخة ws3-fca الحالية');
  }

  const result = await api.gcmember(action, targetID, threadID);
  if (result && result.type === 'error_gc') {
    throw new Error(result.error || `فشل تنفيذ إجراء ${action}`);
  }
  return result;
}

async function runCycle(api, threadID, run) {
  if (run.stopped || activeRuns.get(threadID) !== run) return;

  try {
    await callGroupMemberAction(api, 'remove', run.targetID, threadID);
    if (run.stopped || activeRuns.get(threadID) !== run) return;

    await new Promise(resolve => setTimeout(resolve, 1000));
    if (run.stopped || activeRuns.get(threadID) !== run) return;

    await callGroupMemberAction(api, 'add', run.targetID, threadID);
    console.log(`[بانكاي] ✅ طرد وإضافة ${run.targetID} في ${threadID}`);
  } catch (error) {
    const reason = error && error.message ? error.message : String(error);
    console.error(`[بانكاي] توقف في ${threadID}: ${reason}`);
    stopRun(threadID);
    try {
      await api.sendMessage(
        `❌ توقف بانكاي: ${reason}`,
        threadID
      );
    } catch (_) {}
    return;
  }

  if (run.stopped || activeRuns.get(threadID) !== run) return;
  run.timer = setTimeout(() => {
    run.timer = null;
    runCycle(api, threadID, run).catch(error =>
      console.error('[بانكاي] خطأ في دورة التكرار:', error.message || error)
    );
  }, CYCLE_DELAY);
}

module.exports = {
  name: 'بانكاي',

  async execute(api, event) {
    const threadID = String(event.threadID || '');
    const body = (event.body || '').trim();
    if (!threadID || !body.startsWith('بانكاي')) return;

    if (STOP_MESSAGES.has(body)) {
      const stopped = stopRun(threadID);
      if (stopped) {
        try { await api.sendMessage('تم الايقاف يا اسطورة زيد', threadID); } catch (_) {}
      } else {
        try { await api.sendMessage('⚠️ لا يوجد بانكاي يعمل حالياً.', threadID); } catch (_) {}
      }
      return;
    }

    if (!body.startsWith(START_PREFIX)) {
      try {
        await api.sendMessage('⚠️ الصيغة: بانكاي [ID أو منشن]', threadID);
      } catch (_) {}
      return;
    }

    const targetID = getTargetID(event, body);
    if (!targetID || !/^\d+$/.test(targetID)) {
      try {
        await api.sendMessage('⚠️ يرجى كتابة ID صحيح أو عمل منشن للعضو.', threadID);
      } catch (_) {}
      return;
    }

    if (activeRuns.has(threadID)) {
      try {
        await api.sendMessage(
          '⚠️ بانكاي يعمل بالفعل. اكتب «بانكاي ايقاف» أولاً لإيقافه.',
          threadID
        );
      } catch (_) {}
      return;
    }

    const run = { targetID, stopped: false, timer: null };
    activeRuns.set(threadID, run);

    try {
      await api.sendMessage(
        `⚔️ بدأ بانكاي على ${targetID}\n🔁 طرد وإضافة كل 4 ثواني\n⏹️ للإيقاف: بانكاي ايقاف`,
        threadID
      );
    } catch (_) {}

    await runCycle(api, threadID, run);
  },

  stopAll() {
    for (const threadID of activeRuns.keys()) stopRun(threadID);
  },

  getActiveRuns() {
    return activeRuns;
  }
};