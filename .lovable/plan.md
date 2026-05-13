## جعل التطبيق قابلاً للتثبيت كأيقونة على الجوال

سأضيف **Web App Manifest فقط** بدون Service Worker — هذا يكفي لظهور خيار "إضافة إلى الشاشة الرئيسية / تثبيت التطبيق" في Chrome و Safari وبقية المتصفحات، بدون أي مخاطر على المعاينة في Lovable أو على بياناتك المخزنة (لا cache، لا offline، لا تضارب مع OAuth أو Realtime).

### ما سأنفذه

1. **`public/manifest.webmanifest`** — يحتوي:
   - `name`: "وايت ماء"
   - `short_name`: "وايت"
   - `start_url`: `/`
   - `scope`: `/`
   - `display`: `standalone` (يفتح بدون شريط المتصفح)
   - `orientation`: `portrait`
   - `theme_color`: `#1a5276` (نفس لون السائق header)
   - `background_color`: `#ffffff`
   - `lang`: `ar`, `dir`: `rtl`
   - `icons`: مجموعة أيقونات (192×192، 512×512، و maskable للأندرويد)

2. **توليد الأيقونات** عبر `imagegen` بشعار قطرة ماء على خلفية بلون العلامة، وحفظها في `public/icons/`:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png`
   - `apple-touch-icon-180.png` (لـ iOS)

3. **تعديل `src/routes/__root.tsx`** لإضافة في الـ `<head>`:
   - `<link rel="manifest" href="/manifest.webmanifest">`
   - `<meta name="theme-color" content="#1a5276">`
   - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
   - `<meta name="apple-mobile-web-app-title" content="وايت">`

### ما لن أفعله (حسب أفضل الممارسات في Lovable)

- ❌ لن أضيف `vite-plugin-pwa` ولا Service Worker — يسبب cache stale ويكسر معاينة المحرر و OAuth.
- ❌ لن أضيف دعم offline — التطبيق يعتمد على Realtime والقاعدة.
- ❌ لن ألمس منطق الدخول أو الطلبات أو RLS.

### كيف يعمل للمستخدم

- **أندرويد (Chrome)**: بعد فتح التطبيق المنشور، يظهر تلقائياً banner "تثبيت التطبيق" أو من قائمة المتصفح ⋮ → "إضافة إلى الشاشة الرئيسية".
- **iOS (Safari)**: زر المشاركة → "إضافة إلى الشاشة الرئيسية".
- بعد التثبيت يفتح التطبيق ملء الشاشة بدون شريط العنوان وبأيقونة وايت.

### ملاحظة مهمة

- يعمل فقط على **الرابط المنشور** (`splash-magic-suite.lovable.app` أو دومين مخصص) — لا يعمل في معاينة المحرر داخل iframe.
- بعد التنفيذ يجب الضغط على **Update** في زر Publish لتفعيل التغييرات على الرابط العام.

اضغط Implement لتنفيذ الخطوات.