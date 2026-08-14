# بوت مستر

بوت Facebook Messenger مكتوب بـ Node.js يستخدم مكتبة `ws3-fca`.

## كيفية التشغيل

```
cd bot && node index.js
```

أو شغّل workflow **بوت مستر** من واجهة Replit.

## المتطلبات

- ملف `bot/appstate.json` يحتوي على كوكيز فيسبوك صالحة

## تحديث الكوكيز

إذا توقف البوت برسالة "Error retrieving userID":
1. سجّل دخولك على فيسبوك في المتصفح
2. صدّر الكوكيز بصيغة JSON باستخدام إضافة Cookie-Editor أو EditThisCookie
3. استبدل محتوى `bot/appstate.json` بالكوكيز الجديدة

أو أرسلها عبر HTTP:
```
POST /updatecookies
Content-Type: application/json
Body: [... مصفوفة الكوكيز ...]
```

## الأوامر المتاحة

- `قصف / قصف ايقاف`
- `كاتش / مجموعة / جروب`
- `رد [كلمة]» [رد]`
- `يوت [اسم المقطع]`

## المنفذ

البوت يشغّل خادم Express على المنفذ `PORT` (افتراضياً 3000).
- `GET /` — حالة البوت
- `GET /ping` — فحص الحياة
- `POST /updatecookies` — تحديث الكوكيز

## User preferences
