# بناء تطبيق Android لـ "وايت ماء" — وضع الإنتاج

## ملخص الوضع

| العنصر | القيمة |
|---|---|
| App ID | `app.lovable.wayetmaa` |
| App Name | `وايت ماء` |
| Web Dir | `dist/` (ملفات محزّمة داخل APK) |
| `server.url` | **معطّل** — لا اعتماد على رابط Lovable |
| الإنترنت مطلوب لـ | Supabase Auth + REST + Realtime + GPS Maps فقط |

---

## ⚠️ تنبيه معماري مهم — اقرأ قبل البناء

المشروع يستخدم **TanStack Start** الذي ينتج افتراضياً Cloudflare Worker
(SSR) وليس مجلد `dist/` ثابتاً جاهزاً للحزم في APK.

لتشغيل وضع الإنتاج فعلياً يلزم أحد المسارَين:

### المسار (أ) — Prerender جميع المسارات
أضف في `vite.config.ts`:
```ts
export default defineConfig({
  tanstackStart: {
    server: { entry: 'server' },
    prerender: {
      enabled: true,
      crawlLinks: true,
      routes: [
        '/', '/customer/login', '/driver/login', '/driver/register',
        '/admin/login',
      ],
    },
  },
});
```
ثم `npm run build` يُولّد HTML ثابت + أصول العميل في `dist/client/`.
عدّل `webDir` إلى `'dist/client'` في `capacitor.config.ts`.

### المسار (ب) — تحويل المشروع إلى Vite SPA
تغيير معماري كبير: استبدال TanStack Start بـ Vite + TanStack Router (SPA).
لا حاجة له ما دامت كل صفحاتنا تستخدم `supabase` browser client مباشرة
بدون `createServerFn` (وهو الوضع الحالي).

> الخبر الجيد: **لا توجد** أي `createServerFn` في `src/`، لذا الانتقال
> لـ SPA أو Prerender كامل ممكن دون فقدان منطق.

---

## خطوات بناء APK Release (محلياً)

> يلزم: Android Studio + JDK 17 + Android SDK + مفتاح توقيع Release.

### 1) بناء الواجهة
```bash
git clone <repo>
cd <repo>
npm install
npm run build           # يُنتج dist/
```

### 2) إضافة منصة Android
```bash
npx cap add android     # لمرة واحدة فقط
npx cap sync android    # ينسخ dist/ + الإضافات + يحدّث AndroidManifest
```

`npx cap sync` يحقن تلقائياً في `android/app/src/main/AndroidManifest.xml`:
- `android.permission.INTERNET`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

### 3) توليد أيقونة + Splash
```bash
npm i -D @capacitor/assets
mkdir -p resources
# ضع: resources/icon.png (1024×1024) و resources/splash.png (2732×2732)
npx capacitor-assets generate --android
```

### 4) إنشاء مفتاح توقيع Release
```bash
keytool -genkey -v -keystore wayet-release.keystore \
  -alias wayet -keyalg RSA -keysize 2048 -validity 10000
```
احفظ الـ keystore + كلمات المرور في مكان آمن (لا تضعها في Git).

### 5) ربط المفتاح بـ Gradle
في `android/app/build.gradle` أضف داخل `android { ... }`:
```gradle
signingConfigs {
    release {
        storeFile file('../../wayet-release.keystore')
        storePassword System.getenv('WAYET_STORE_PASS')
        keyAlias 'wayet'
        keyPassword System.getenv('WAYET_KEY_PASS')
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 6) بناء APK / AAB موقّع
```bash
cd android
./gradlew assembleRelease     # ينتج app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease       # ينتج .aab لـ Play Store
```

أو من Android Studio: `Build > Generate Signed Bundle / APK`.

---

## اختبارات إلزامية قبل النشر

### اختبار GPS
1. ثبّت APK على جهاز فعلي (لا محاكي).
2. افتح `العميل > طلب جديد > تحديد موقعي`.
3. يجب أن يظهر طلب صلاحية الموقع لأول مرة، ثم يُلتقط الإحداثيان.
4. إن لم يظهر الطلب: تأكد من تشغيل الموقع في إعدادات الهاتف.

### اختبار Realtime
1. سجّل دخول كعميل وأنشئ طلباً.
2. على جهاز/متصفح آخر سجّل دخول كمدير → اعتمد الطلب.
3. يجب أن تتحدّث حالة الطلب على شاشة العميل **خلال ثانيتين** بدون refresh.
4. إن لم تتحدّث: افحص أن WebSocket لـ `wss://*.supabase.co` يصل من الشبكة.

### اختبار Auth + Routing داخل WebView
1. سجّل دخول كسائق برقم تجريبي + OTP `1234`.
2. أعد تشغيل التطبيق — الجلسة يجب أن تبقى محفوظة (localStorage).
3. تنقّل بين تبويبات السائق — لا يجب ظهور 404 ولا فتح متصفح خارجي.

---

## تغيير App ID لاسم تجاري لاحقاً

`appId` الحالي: `app.lovable.wayetmaa`

عند اعتماد الاسم التجاري الرسمي (مثلاً `ye.wayetmaa.app`):

1. عدّل `capacitor.config.ts` → `appId`.
2. **احذف** مجلد `android/` كاملاً.
3. أعد `npx cap add android` لإعادة توليده بـ ID الجديد.
4. أعد توليد مفتاح توقيع جديد (لأن Play Store يربط ID بمفتاح).

> ⚠️ لا تغيّر `appId` بعد نشر التطبيق على Play Store — لن تستطيع تحديثه،
> سيُعتبر تطبيقاً جديداً.

---

## مشاكل متبقية / قيود

| القيد | التأثير |
|---|---|
| TanStack Start لا يُنتج `dist/` ثابتاً افتراضياً | يلزم تفعيل Prerender أو SPA — انظر "تنبيه معماري" أعلاه |
| لا بناء داخل Lovable | APK يُبنى محلياً فقط |
| يحتاج إنترنت للـ API | لا يعمل Offline-first (مقبول لتطبيق توصيل) |
| لا Push Notifications بعد | يحتاج إضافة `@capacitor/push-notifications` + Firebase |
| لا Deep Links مخصّصة | يكفي للـ Routing الداخلي حالياً |

## هل التطبيق Production-Ready؟

**جزئياً نعم** — على مستوى Capacitor + Android:
- ✅ إعدادات الإنتاج صحيحة (لا hot reload، لا cleartext).
- ✅ الصلاحيات مضبوطة.
- ✅ App ID + اسم + Splash + StatusBar جاهزة.
- ✅ خطوات Release موثّقة (keystore + signing).
- ⚠️ **يلزم إضافة Prerender** لتفعيل البناء كاملاً (سطرَين في `vite.config.ts`).
- ⚠️ يلزم اختبار فعلي على جهاز قبل النشر.
- ⏳ Push Notifications + تحليلات لاحقاً.
