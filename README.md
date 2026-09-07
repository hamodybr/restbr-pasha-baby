# Pasha Baby Retail

نسخة مستقلة مخصصة لمتجر **پاشا بيبي** لمستلزمات الأطفال.

## Production

- Live: `https://pashababy.restbr.com`
- Admin: `https://pashababy.restbr.com/admin`
- Repository: `hamodybr/restbr-pasha-baby`
- Production branch: `main`
- Supabase project: `wlollfpmjzenhkjwxrqo`
- Store mode: Retail only
- Customer language: Arabic only / RTL
- Dashboard: Arabic with Pasha Baby light/dark theme

## Main capabilities

- أقسام وأصناف وخيارات وأسعار قابلة للإدارة.
- ألوان للمنتجات.
- خصومات بمبلغ ثابت بالدينار العراقي.
- حالات: متوفر، ظاهر، جديد، الأكثر طلباً، عرض مميز.
- ترتيب Drag & Drop للأقسام والأصناف وخيارات الصنف.
- سلة وطلب عبر WhatsApp.
- وصف مختصر داخل الكارت ونافذة تفاصيل كاملة.
- إعلان ومعلومات توصيل وأوقات عمل.
- PWA / Service Worker مع Offline fallback.
- استيراد وتصدير Excel وأدوات Backup.
- صلاحيات Admin عبر Supabase Auth + RLS.

## Safety

- لا يوجد `service_role` داخل الملفات التي تصل للمتصفح.
- الكتابة على بيانات المتجر محمية بصلاحيات Supabase/RLS.
- كل Push يمر عبر Validate، ولا يتم Deploy إلا من `main`.
- بعد النشر يتم تشغيل Live Smoke + Retail Commerce checks.
- قاعدة فحص التسليم موثقة في `.github/AUDIT-HARDENING.md`.

## Important

بيانات المنتجات والأسعار والصور هي محتوى المتجر ويجب مراجعتها من صاحب المتجر قبل التسليم النهائي. الأصناف التي لا تحتوي صورة خاصة تستخدم Placeholder هوية Pasha Baby بدل صورة مكسورة.
