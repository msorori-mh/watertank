## إنشاء الحسابات التجريبية

سأقوم بإنشاء الحسابات مباشرة في قاعدة البيانات عبر migration SQL، بحيث:

- يستخدم السائق/العميل **نفس آلية الهاتف الحالية** (OTP=1234) — الإيميل الداخلي `phone-{number}@wayet.local` وكلمة المرور `wayet-pwd-{number}-secure` كما في `src/lib/wayet-auth.ts`.
- يتم تشغيل الـ trigger `handle_new_user` تلقائياً لإنشاء `profiles` و `user_roles`.
- بالنسبة للسائقين سيتم إضافة صف في `drivers` مع `license_status='approved'` ليظهروا فوراً كسائقين معتمدين.
- بالنسبة للأدمن سيتم إنشاء حساب بالإيميل وكلمة المرور المحددين، ثم إعطاؤه دور `admin` في `user_roles`.

### الحسابات

| النوع | الاسم | الهاتف / الإيميل | بيانات الدخول |
|---|---|---|---|
| سائق | عيسى حسين | 777333777 | OTP: 1234 |
| سائق | مروان حسين | 777444777 | OTP: 1234 |
| عميل | صدام حسين | 777111777 | OTP: 1234 |
| عميل | محمد حسين | 777222777 | OTP: 1234 |
| أدمن | — | mosrori201201@gmail.com | Login@692022 |

### المدينة الافتراضية للسائقين
سأستخدم أول مدينة نشطة موجودة في `cities`. إذا أردت مدينة محددة (مثلاً صنعاء) أخبرني.

### بيانات المركبة للسائقين (افتراضية قابلة للتعديل لاحقاً)
- `vehicle_plate`: `DRV-777333` و `DRV-777444`
- `vehicle_capacity`: 5000 لتر
- `availability`: `available`

### التنفيذ
سأنفذ ذلك عبر **migration واحدة** تحتوي على:
1. `INSERT` في `auth.users` مع `encrypted_password = crypt(...)` وحقول `raw_user_meta_data` المناسبة (phone/name/type/role) — هذا يطلق trigger `handle_new_user` فيُنشئ `profiles` و `user_roles` تلقائياً.
2. تأكيد الإيميل (`email_confirmed_at = now()`) حتى يعمل تسجيل الدخول مباشرة.
3. `INSERT` في `drivers` للسائقَين بـ `license_status='approved'`.
4. للأدمن: ضمان وجود `user_roles.role='admin'` (الـ trigger يقرأها من meta).

### ملاحظات
- إذا كان أحد الأرقام/الإيميلات مسجلاً مسبقاً ستُستخدم `ON CONFLICT DO NOTHING` لتجنب الفشل.
- لا تغيير على المنطق أو الواجهات.

اضغط Implement plan لتنفيذها.