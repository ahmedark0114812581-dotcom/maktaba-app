# مكتبة (Maktaba) App

تطبيق لعرض الفيديوهات التعليمية مع لوحة تحكم إدارية.

## التشغيل

```bash
# تثبيت الاعتماديات
npm install

# تشغيل السيرفر
node admin-server.js

# تشغيل تطبيق Expo
npx expo start
```

## الإعدادات

أنشئ ملف `.env` بناءً على `.env.example`:

```bash
cp .env.example .env
```

ثم عدّل القيم حسب احتياجك.

## الـ API

- `GET /api/files` - قائمة الملفات
- `POST /api/files` - إضافة ملف (يتطلب مصادقة)
- `DELETE /api/files/:id` - حذف ملف (يتطلب مصادقة)
- `GET /api/videos` - قائمة الفيديوهات (مع pagination)
- `POST /api/videos` - إضافة فيديو (يتطلب مصادقة)
- `PATCH /api/videos/:id` - تعديل فيديو (يتطلب مصادقة)
- `DELETE /api/videos/:id` - حذف فيديو (يتطلب مصادقة)
- `POST /api/requests` - إضافة طلب
- `GET /api/analytics` - إحصائيات
- `POST /api/upload` - رفع فيديو (يتطلب مصادقة)

## الأمان

- السيرفر يتطلب `x-admin-token` للعمليات الإدارية
- جميع المدخلات يتم التحقق منها
- حماية من XSS و CSRF
- Rate limiting مدمج
