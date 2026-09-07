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

## Product image storage

صور المنتجات الجديدة تستخدم **Backblaze B2** عبر Supabase Edge Function باسم `b2-images`.

- Bucket: `pasha-baby-products`
- Prefix: `products/`
- الرفع يتم فقط من حساب Admin مصرح له.
- مفاتيح B2 لا توجد داخل GitHub أو JavaScript المتصفح؛ محفوظة فقط داخل Supabase Edge Function Secrets:
  - `B2_KEY_ID`
  - `B2_APPLICATION_KEY`
- الداشبورد يضغط الصور تلقائياً إلى WebP بهدف يقارب `620 KB`، والـEdge Function يرفض أي ملف محسن أكبر من `700 KB`.
- يظهر عداد مساحة داخل الداشبورد.
- تنبيه داخلي عند `8 GB` ومنع رفع جديد قبل `9 GB` كطبقة حماية قبل حد التخزين المجاني.
- استبدال صورة الصنف يستخدم نفس مسار الصنف ويتم تنظيف النسخ القديمة في الخلفية حتى لا تتراكم المساحة.
- روابط الصور القديمة الموجودة على Supabase Storage تبقى مدعومة؛ الصور الجديدة تذهب إلى B2.

عند تدوير/استبدال مفتاح Backblaze، يتم تعديل القيم فقط من **Supabase → Edge Function Secrets** بدون إضافة المفتاح إلى المستودع.

## Safety

- لا يوجد `service_role` داخل الملفات التي تصل للمتصفح.
- لا توجد مفاتيح Backblaze داخل ملفات الواجهة أو GitHub.
- الكتابة على بيانات المتجر محمية بصلاحيات Supabase/RLS.
- بوابة رفع B2 محمية بـJWT وتتحقق من صلاحية إدارة المنيو قبل السماح بالرفع أو قراءة الاستخدام.
- كل Push يمر عبر Validate، ولا يتم Deploy إلا من `main`.
- بعد النشر يتم تشغيل Live Smoke + Retail Commerce checks.
- قاعدة فحص التسليم موثقة في `.github/AUDIT-HARDENING.md`.

## Important

بيانات المنتجات والأسعار والصور هي محتوى المتجر ويجب مراجعتها من صاحب المتجر قبل التسليم النهائي. الأصناف التي لا تحتوي صورة خاصة تستخدم Placeholder هوية Pasha Baby بدل صورة مكسورة.
