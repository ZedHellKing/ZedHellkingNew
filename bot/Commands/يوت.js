const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// استخدام أدوات النظام المثبتة في بيئة التشغيل.
const YTDL_PATH = 'yt-dlp';
const DENO_PATH = process.env.DENO_BIN || 'deno';
const YOUTUBE_STATE_PATH = path.join(__dirname, '..', 'data', 'youtube-state.json');

function downloadAudio(query, outFile) {
  return new Promise((resolve, reject) => {
    const safeQuery = query.replace(/"/g, '\\"').replace(/`/g, '');

    // استخدام Deno كـ JavaScript runtime لمساعدة yt-dlp مع YouTube
    const cmd = `"${YTDL_PATH}" --js-runtimes "deno:${DENO_PATH}" --remote-components ejs:github --extractor-args "youtube:player_client=web_embedded" "ytsearch1:${safeQuery}" -x --audio-format mp3 --audio-quality 0 --no-playlist -o "${outFile}"`;
    console.log(`[يوت] تنفيذ: ${cmd}`);

    exec(cmd, { timeout: 150000 }, (err, stdout, stderr) => {
      if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
        resolve();
      } else if (err) {
        console.error(`[يوت] yt-dlp stderr:`, stderr || err.message);
        reject(new Error(stderr || err.message));
      } else {
        reject(new Error('الملف لم يُنشأ'));
      }
    });
  });
}

function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {}
}

function createAvailability(statePath) {
  return {
    isEnabled() {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (typeof state.enabled !== 'boolean') {
          throw new Error('حالة يوت المحفوظة غير صالحة.');
        }
        return state.enabled;
      } catch (error) {
        if (error.code === 'ENOENT') return true;
        throw error;
      }
    },

    setEnabled(enabled) {
      if (typeof enabled !== 'boolean') {
        throw new TypeError('حالة يوت يجب أن تكون تشغيلًا أو إيقافًا.');
      }

      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
      try {
        fs.writeFileSync(
          temporaryPath,
          JSON.stringify({ enabled }, null, 2),
          { mode: 0o600 },
        );
        fs.renameSync(temporaryPath, statePath);
      } catch (error) {
        try {
          if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        } catch (cleanupError) {}
        throw new Error(`تعذر حفظ حالة يوت: ${error.message}`);
      }
    },
  };
}

function createYoutubeCommand({
  statePath = YOUTUBE_STATE_PATH,
  downloadAudio: downloadAudioImpl = downloadAudio,
} = {}) {
  const availability = createAvailability(statePath);

  return {
    name: 'يوت',

    isEnabled: availability.isEnabled,

    async setEnabled(api, event, enabled) {
      availability.setEnabled(enabled);
      const message = enabled
        ? '✅ تم تشغيل البحث عن الأغاني. يمكن للجميع استخدام «يوت [اسم الأغنية]».'
        : '⛔ تم إيقاف البحث عن الأغاني في جميع المجموعات.';
      try {
        await api.sendMessage(message, String(event.threadID));
      } catch (error) {
        console.error('[يوت] تعذر إرسال تأكيد تغيير الحالة:', error.message || error);
      }
    },

    async execute(api, event) {
      const threadID = String(event.threadID);
      const body = (event.body || '').trim();

      if (!body.startsWith('يوت ')) return;

      const query = body.slice('يوت '.length).trim();

      if (!query) {
        try {
          await api.sendMessage(
            '⚠️ مثال: يوت Imagine Dragons Believer',
            threadID
          );
        } catch (e) {}

        return;
      }

      try {
        if (!availability.isEnabled()) {
          await api.sendMessage(
            '⛔ البحث عن الأغاني متوقف حاليًا. يطلب من المشرف إرسال «تشغيل يوت».',
            threadID
          );
          return;
        }
      } catch (error) {
        console.error('[يوت] تعذر قراءة حالة البحث:', error.message || error);
        await api.sendMessage(
          '❌ تعذر التحقق من حالة البحث، لذلك لم يبدأ تحميل الأغنية. أخبر المشرف.',
          threadID
        ).catch(() => {});
        return;
      }

      try {
        await api.sendMessage(
          `🎵 جاري البحث عن: "${query}"...`,
          threadID
        );
      } catch (e) {}

      const tmpDir = path.join(__dirname, '..', 'tmp');
      const outFile = path.join(
        tmpDir,
        'yot-' + Date.now() + '.mp3'
      );

      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (e) {}

      try {
        await downloadAudioImpl(query, outFile);

        const sizeMB = (
          fs.statSync(outFile).size / (1024 * 1024)
        ).toFixed(2);

        console.log(
          `[يوت] إرسال ملف (${sizeMB} MB) إلى ${threadID}`
        );

        await api.sendMessage(
          {
            attachment: fs.createReadStream(outFile)
          },
          threadID
        );

      } catch (err) {
        console.error(`[يوت] فشل:`, err.message);

        try {
          await api.sendMessage(
            '❌ لم يُعثر علي المقطع أو فشل التحميل، جرب اسماً آخر.',
            threadID
          );
        } catch (e) {}

      } finally {
        cleanup(outFile);
      }
    }
  };
}

module.exports = createYoutubeCommand();
module.exports.createYoutubeCommand = createYoutubeCommand;
