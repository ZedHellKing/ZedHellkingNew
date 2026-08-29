const fs = require('fs');

function parseFacebookResponse(response) {
  if (!response) return {};
  if (typeof response.body === 'object' && response.body !== null) return response.body;

  let body = Buffer.isBuffer(response.body)
    ? response.body.toString('utf8')
    : String(response.body || '');
  body = body.replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;\s*/, '').trim();

  try {
    return JSON.parse(body);
  } catch (_) {
    throw new Error(`استجابة غير مفهومة من فيسبوك: ${body.slice(0, 180)}`);
  }
}

function makeMessageID() {
  return `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Changes a Messenger group image using the authenticated ws3-fca session.
 * ws3-fca does not expose this legacy endpoint as a public API method.
 */
async function changeGroupImage(api, imagePath, threadID) {
  if (!api || !api.defaultFuncs || !api.ctx) {
    throw new Error('جلسة فيسبوك غير جاهزة');
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error('ملف الصورة المحفوظة غير موجود');
  }

  const uploadResponse = await api.defaultFuncs.postFormData(
    'https://upload.facebook.com/ajax/mercury/upload.php',
    api.ctx.jar,
    {
      images_only: 'true',
      'attachment[]': fs.createReadStream(imagePath)
    },
    {},
    api.ctx
  );
  const uploadData = parseFacebookResponse(uploadResponse);
  const metadata = uploadData.payload && uploadData.payload.metadata;
  const imageID = metadata && metadata[0] && metadata[0].image_id;
  if (!imageID) {
    throw new Error('فشل رفع الصورة إلى فيسبوك');
  }

  const messageID = makeMessageID();
  const timestamp = Date.now();
  const form = {
    client: 'mercury',
    action_type: 'ma-type:log-message',
    author: `fbid:${api.ctx.userID}`,
    author_email: '',
    ephemeral_ttl_mode: '0',
    is_filtered_content: false,
    is_filtered_content_account: false,
    is_filtered_content_bh: false,
    is_filtered_content_invalid_app: false,
    is_filtered_content_quasar: false,
    is_forward: false,
    is_spoof_warning: false,
    is_unread: false,
    log_message_type: 'log:thread-image',
    manual_retry_cnt: '0',
    message_id: messageID,
    offline_threading_id: messageID,
    source: 'source:chat:web',
    'source_tags[0]': 'source:chat',
    status: '0',
    thread_fbid: threadID,
    thread_id: threadID,
    timestamp,
    timestamp_absolute: 'Today',
    timestamp_relative: new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }),
    timestamp_time_passed: '0',
    thread_image_id: String(imageID)
  };

  const response = await api.defaultFuncs.post(
    'https://www.facebook.com/messaging/set_thread_image/',
    api.ctx.jar,
    form,
    api.ctx
  );
  const result = parseFacebookResponse(response);
  if (result && (result.error || result.errors)) {
    throw new Error(result.error_description || result.error || 'رفض فيسبوك تغيير صورة المجموعة');
  }
  return result;
}

module.exports = { changeGroupImage };