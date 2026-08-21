# بناء تطبيق Android — وايت ماء

## نظرة عامة

- التطبيق **مُحزَّم (bundled)**: ملفات الواجهة تُنسخ داخل الحزمة (`webDir = dist`)، ولا يوجد أي `server.url` أو تحميل واجهة من رابط خارجي.
- الاتصال بالخادم عبر HTTPS فقط (`usesCleartextTraffic=false`).
- الإنترنت مطلوب لعمل قاعدة البيانات والمصادقة والتحديثات الحيّة.

| البند | القيمة |
|-------|--------|
| applicationId / package | `app.wayetmaa.mobile` |
| اسم التطبيق | وايت ماء |
| compileSdk / targetSdk | 36 |
| minSdk | 24 (الحد المدعوم مع Capacitor 8) |
| versionCode / versionName | 1 / 1.0.0 |
| الصلاحيات | `INTERNET`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` فقط |

الصلاحيات غير المطلوبة (وممنوعة): `ACCESS_BACKGROUND_LOCATION` وأي صلاحيات تخزين/وسائط.

## المتطلبات المحلية (مرة واحدة)

- Node.js 18+
- JDK 17
- Android Studio + Android SDK (API 36) مع ضبط `ANDROID_HOME`

## المزامنة

```bash
npm run android:sync    # build للويب + تجهيز dist/index.html + cap sync android
npm run android:verify  # فحص جاهزية Google Play للمشروع الأصلي
```

`npm run build` لم يتغيّر ويُستخدم كما هو لنشر الويب.

## بناء Debug

```bash
cd android
./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

## بناء Release

لا يوجد أي ملف مفاتيح أو أسرار داخل المستودع. التوقيع **اختياري** ويُقرأ من:

1. `android/keystore.properties` (مُستثنى من git) — انسخه من `android/keystore.properties.example`، أو
2. متغيرات البيئة:
   - `WAYETMAA_KEYSTORE_PATH` (مسار نسبةً إلى مجلد `android/`)
   - `WAYETMAA_KEYSTORE_PASSWORD`
   - `WAYETMAA_KEY_ALIAS`
   - `WAYETMAA_KEY_PASSWORD`

إذا لم تتوفر القيم الأربع، ينتج البناء ملفاً **غير موقّع (unsigned)**.

```bash
cd android
./gradlew bundleRelease    # AAB لـ Google Play
./gradlew assembleRelease  # APK
```

إنشاء keystore محلياً (لا تضعه في المستودع):

```bash
keytool -genkey -v -keystore wayetmaa-release.keystore \
  -alias wayetmaa -keyalg RSA -keysize 2048 -validity 10000
```

احتفظ بالملف وكلمة المرور في مكان آمن — فقدانهما يعني عدم القدرة على تحديث التطبيق لاحقاً.

## قائمة فحص قبل التسليم

- [ ] التطبيق يفتح ويعرض شاشة البداية (عميل + سائق)
- [ ] تسجيل دخول عميل / سائق يعمل
- [ ] إنشاء طلب نقدي ينجح، والطلب لا يظهر للسائق قبل اعتماد الإدارة
- [ ] Realtime يعمل (تحديث الحالة فوري)
- [ ] صلاحية الموقع تُطلب أثناء الاستخدام فقط، وروابط الخرائط تفتح
- [ ] Bottom Navigation يعمل للعميل والسائق، ولا يظهر في صفحات الإدارة
- [ ] Safe-area محترم، لا zoom غير مقصود، لا overflow أفقي
- [ ] صفحتا `/privacy` و `/account-deletion` تفتحان، وحذف الحساب يعمل من الإعدادات

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `The web assets directory (./dist) must contain an index.html` | نفّذ `npm run android:sync` (يجهّز `dist/index.html`) |
| شاشة بيضاء | تحقّق من Logcat وأن `cap sync` نُفّذ بعد آخر build |
| `JAVA_HOME` غير مضبوط | ثبّت JDK 17 واضبط المتغير |
| GPS لا يعمل | افحص صلاحيات التطبيق في إعدادات Android |
