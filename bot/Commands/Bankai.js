module.exports = {
  name: 'بانكاي',

  async execute(api, event) {
    const threadID = String(event.threadID);
    const body = (event.body || '').trim();

    // التحقق من أن الرسالة تبدأ بكلمة "بانكاي"
    if (!body.startsWith('بانكاي')) return;

    try {
      let targetID = null;

      // 1. محاولة جلب الآيدي من المنشن (Mentions)
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = String(Object.keys(event.mentions)[0]);
      } else {
        // 2. جلب الآيدي إذا كُتب بعد كلمة بانكاي (مثال: بانكاي 1000xxxx)
        const args = body.split(' ');
        if (args.length > 1) {
          targetID = String(args[1]).trim();
        }
      }

      // إذا لم يجد البوت آيدي أو منشن صحيح بعد كلمة بانكاي
      if (!targetID || isNaN(targetID)) {
        try { 
          await api.sendMessage('⚠️ يرجى عمل منشن للعضو أو كتابة الـ ID الخاص به بعد كلمة بانكاي.', threadID); 
        } catch (e) {}
        return;
      }

      // إرسال البادئة (رسالة البداية)
      try { 
        await api.sendMessage("_ جــاري بـداء مـراســم البـانڪـاي 𝑆𝐴𝑍𝑂 _", threadID); 
      } catch (e) {}

      const startTime = Date.now();
      const duration = 15000; // 15 ثانية فقط

      // حلقة الطرد والإضافة المتكررة المخصصة للحساب الشخصي
      while (Date.now() - startTime < duration) {
        try {
          // طرد العضو
          await api.removeUserFromGroup(targetID, threadID);
          // انتظار نصف ثانية لتجنب الحظر السريع من فيسبوك
          await new Promise(resolve => setTimeout(resolve, 500)); 
          
          // إعادة إضافة العضو
          await api.addUserToGroup(targetID, threadID);
          // انتظار نصف ثانية أخرى قبل التكرار
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (loopError) {
          // في حال حدوث خطأ (مثل أن الحساب الشخصي ليس أدمن)، نضع تأخير بسيط لمنع تجميد البوت
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // إرسال رسالة النهاية بعد اكتمال الـ 15 ثانية
      try { 
        await api.sendMessage("_ تـم انهـاء بـانكـاي 𝑆𝐴𝑍𝑂 _", threadID); 
      } catch (e) {}

    } catch (generalError) {
      console.error(`[بانكاي] خطأ عام في الأمر:`, generalError.message || generalError);
    }
  }
};
