const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// الاعتماد على الأداة والنظام في كالي مباشرة بدون مكتبات مدمجة مسببة للتجمد
const YTDL_PATH = 'yt-dlp';

function downloadAudio(query, outFile) {
  return new Promise((resolve, reject) => {
    const safeQuery = query.replace(/"/g, '\\"').replace(/`/g, '');
    
    // استخدام أمر لينكس الافتراضي المباشر للتحويل
    const cmd = `"${YTDL_PATH}" "ytsearch1:${safeQuery}" -x --audio-format mp3 --audio-quality 0 --no-playlist -o "${outFile}"`;
    
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

module.exports = {
  name: 'يوت',

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    if (!body.startsWith('يوت ')) return;
    const query = body.slice('يوت '.length).trim();
    if (!query) {
      try { await api.sendMessage('⚠️ مثال: يوت Imagine Dragons Believer', threadID); } catch (e) {}
      return;
    }

    try { await api.sendMessage(`🎵 جاري البحث عن: "${query}"...`, threadID); } catch (e) {}

    const tmpDir = path.join(__dirname, '..', 'tmp');
    const outFile = path.join(tmpDir, 'yot-' + Date.now() + '.mp3');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}

    try {
      await downloadAudio(query, outFile);

      const sizeMB = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
      console.log(`[يوت] إرسال ملف (${sizeMB} MB) إلى ${threadID}`);

      await api.sendMessage({ attachment: fs.createReadStream(outFile) }, threadID);

    } catch (err) {
      console.error(`[يوت] فشل:`, err.message);
      try { await api.sendMessage('❌ لم يُعثر علي المقطع أو فشل التحميل، جرب اسماً آخر.', threadID); } catch (e) {}
    } finally {
      cleanup(outFile);
    }
  }
};

