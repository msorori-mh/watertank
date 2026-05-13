# بناء تطبيق Android لـ "وايت ماء"

## نظرة عامة

تم إعداد المشروع بنمط **Hot Reload**: التطبيق Native (APK) يحمّل واجهة الويب
من رابط Lovable المباشر داخل Android WebView. هذا الأسلوب يحل مشكلة أن
TanStack Start يحتاج SSR ولا يُنتج build ثابتاً للحزم داخل APK.

- `appId`: `app.lovable.wayetmaa`
- `appName`: `وايت ماء`
- مصدر الواجهة: `https://7237f033-42da-4c9f-8040-97b19f995dbb.lovableproject.com`

## الخطوات (تُنفَّذ على جهازك المحلي)

> Lovable Sandbox لا يستطيع بناء APK. تحتاج Android Studio + JDK 17 على جهازك.

```bash
# 1) صدّر المشروع إلى GitHub من Lovable ثم استنسخه محلياً
git clone <your-repo>
cd <your-repo>

# 2) ثبّت الاعتمادات
npm install

# 3) أضف منصّة Android (لمرة واحدة فقط)
npx cap add android

# 4) زامن إعدادات Capacitor + الإضافات مع المشروع الـ Native
npx cap sync android

# 5) افتح المشروع في Android Studio
npx cap open android
```

ثم من Android Studio:
- اختر `Build > Build Bundle(s) / APK(s) > Build APK(s)` للحصول على APK تجريبي.
- أو `Run` على جهاز/محاكي متّصل.

كلّما عدّلت الإعدادات في `capacitor.config.ts` أو حدّثت إضافة، شغّل
`npx cap sync` ثم أعد البناء.

## الصلاحيات

تُضاف تلقائياً عند `npx cap sync`:

| الصلاحية | المصدر |
|---|---|
| `INTERNET` | افتراضية في Capacitor Android |
| `ACCESS_FINE_LOCATION` | `@capacitor/geolocation` |
| `ACCESS_COARSE_LOCATION` | `@capacitor/geolocation` |

## App Icon و Splash Screen

الإعدادات الافتراضية في `capacitor.config.ts`:
- لون الخلفية: `#0ea5e9` (هوية وايت ماء).
- مدّة الإظهار: 1500ms.

لتخصيص الأيقونة، استخدم أداة `@capacitor/assets` بعد إضافة منصّة Android:

```bash
npm i -D @capacitor/assets
mkdir -p resources
# ضع: resources/icon.png (1024x1024) و resources/splash.png (2732x2732)
npx capacitor-assets generate --android
```

## التحقق من الميزات داخل WebView

| الميزة | الحالة |
|---|---|
| تسجيل الدخول (Supabase Auth + OTP وهمي 1234) | يعمل — جلسة عبر `localStorage` |
| Realtime (Supabase channels) | يعمل عبر WebSocket على HTTPS |
| GPS | يعمل عبر `navigator.geolocation` بعد منح صلاحية الموقع |
| إنشاء/تتبّع الطلبات | يعمل — RLS مطبّقة من الخادم |
| Routing داخلي + Deep Links | يعمل بدون إعداد إضافي (نفس الدومين) |

## مشاكل متبقية / قيود

1. **APK غير قابل للبناء داخل Lovable**: يلزم Android Studio محلياً.
2. **يحتاج اتصال إنترنت دائم** بحكم نمط Hot Reload.
3. للحصول على بناء **Offline-first** كامل يجب الانتقال لتصدير ثابت (SSG)
   من TanStack Start، وهو تغيير معماري كبير.
4. لإصدار Production نحتاج لاحقاً:
   - تغيير `server.url` لرابط نطاق الإنتاج.
   - توقيع APK بمفتاح Release.
   - رفع التطبيق على Play Console.
