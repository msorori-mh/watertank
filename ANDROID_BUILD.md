# بناء تطبيق Android — وايت ماء

## ⚠️ ملاحظة مهمة: هذه نسخة MVP تجريبية

هذه النسخة تستخدم آلية **Hot Reload المُحسّن**، وليست نسخة Production مستقلة بعد.

### كيف يعمل التطبيق حالياً

- APK لا يحتوي على ملفات الواجهة (HTML/CSS/JS) محلياً.
- عند تشغيل التطبيق، يحمّل الواجهة من رابط Lovable الثابت المنشور:
  ```
  https://project--7237f033-42da-4c9f-8040-97b19f995dbb.lovable.app
  ```
- أي تحديث للواجهة يصل للمستخدم **فوراً** بعد نشره من Lovable (بدون إعادة بناء APK).

### المتطلبات الحرجة

| المتطلب | الحالة |
|---------|--------|
| نشر المشروع من Lovable (زر Publish) | **إلزامي قبل بناء APK** |
| اتصال إنترنت دائم على الجهاز | **إلزامي لتشغيل التطبيق** |
| Supabase (Auth + Realtime + Database) | يعمل عبر الإنترنت |
| GPS الجغرافي | يعمل (صلاحيات تلقائية) |

### مزايا هذه النسخة

- ✅ تحديثات فورية بدون إعادة بناء/توزيع APK جديد
- ✅ لا تكسر معاينة Lovable ولا تطوير الميزات
- ✅ نشر سريع للاختبار والتجربة الأولية
- ✅ المنطق الكامل (طلبات/سائق/إدارة/مالية) يعمل كما في Web

### قيود هذه النسخة

- ❌ لا يعمل بدون إنترنت (لا يوجد offline mode)
- ❌ بطء أول تحميل حسب سرعة الاتصال
- ❌ غير مناسب للنشر النهائي على Google Play

---

## خطوات بناء APK

### 1. تجهيز البيئة المحلية (مرة واحدة)

```bash
# يجب توفر:
# - Node.js 18+
# - JDK 17
# - Android Studio + Android SDK
# - متغير ANDROID_HOME مضبوط
```

### 2. تصدير المشروع من Lovable

1. اضغط **GitHub → Connect to GitHub** في Lovable
2. استنسخ المستودع محلياً:
   ```bash
   git clone <your-repo-url>
   cd <project-folder>
   npm install
   ```

### 3. نشر المشروع من Lovable (إلزامي)

قبل بناء APK، اضغط **Publish** في Lovable للتأكد أن الرابط الثابت يعمل:
```
https://project--7237f033-42da-4c9f-8040-97b19f995dbb.lovable.app
```

اختبر الرابط في المتصفح أولاً للتأكد أنه يفتح التطبيق.

### 4. إضافة منصة Android

```bash
npx cap add android
npx cap sync android
```

### 5. بناء نسخة Debug (للاختبار)

```bash
npx cap open android
# داخل Android Studio: Build → Build APK
```

أو عبر CLI:
```bash
cd android
./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

### 6. بناء نسخة Release (للتوزيع)

#### أ) إنشاء keystore (مرة واحدة)

```bash
keytool -genkey -v -keystore wayetmaa-release.keystore \
  -alias wayetmaa -keyalg RSA -keysize 2048 -validity 10000
```

احتفظ بالملف وكلمة المرور في مكان آمن — فقدانهما يعني عدم قدرتك على تحديث التطبيق لاحقاً.

#### ب) إعداد التوقيع في `android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../wayetmaa-release.keystore')
            storePassword 'YOUR_PASSWORD'
            keyAlias 'wayetmaa'
            keyPassword 'YOUR_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

#### ج) بناء APK موقّع

```bash
cd android
./gradlew assembleRelease
# الناتج: android/app/build/outputs/apk/release/app-release.apk
```

#### د) أو AAB لـ Google Play

```bash
./gradlew bundleRelease
# الناتج: android/app/build/outputs/bundle/release/app-release.aab
```

---

## الاختبار على جهاز حقيقي

### قائمة فحص أساسية

- [ ] التطبيق يفتح ويعرض شاشة البداية (عميل + سائق)
- [ ] لا تظهر بطاقة "الإدارة" في تطبيق الجوال
- [ ] تسجيل دخول عميل جديد يعمل
- [ ] تسجيل دخول سائق جديد يعمل
- [ ] إنشاء طلب من العميل ينجح
- [ ] الطلب لا يظهر للسائق قبل اعتماد الإدارة
- [ ] Realtime يعمل (تحديث حالة الطلب فوري)
- [ ] صلاحية GPS تُطلب وتعمل
- [ ] تتبع موقع السائق يعمل

### اختبار GPS

- افتح صفحة السائق
- اقبل صلاحية الموقع عند الطلب
- تأكد أن `navigator.geolocation` يرجع إحداثيات صحيحة

### اختبار Realtime

- افتح التطبيق على جهازين (عميل + سائق)
- أنشئ طلباً من العميل
- اعتمد الطلب من لوحة الإدارة (web)
- يجب أن يظهر للسائق فوراً بدون refresh

---

## ملاحظات مهمة

### تغيير App ID لاحقاً (للنشر التجاري)

عند الجاهزية للنشر النهائي، غيّر `appId` من:
```
app.wayetmaa.mobile
```
إلى اسم تجاري رسمي مثل:
```
sa.yourcompany.wayetmaa
```

⚠️ **تحذير**: تغيير `appId` بعد النشر على Google Play يُعتبر تطبيقاً جديداً ولا يمكن للمستخدمين الترقية.

### الانتقال من MVP إلى Production

عندما يكتمل النظام ويُختبر بالكامل، يمكن إنشاء **نسخة SPA مستقلة** بإحدى طريقتين:

1. **مشروع منفصل** — استنساخ المشروع الحالي وتحويله إلى Vite SPA نقي.
2. **تحويل كامل** — إعادة هيكلة المشروع الحالي (سيكسر معاينة Lovable).

النسخة المستقلة ستعمل دون الحاجة لتحميل الواجهة من Lovable، وتدعم offline mode.

### إذا تغيّر الرابط المنشور

الرابط `project--{project-id}.lovable.app` ثابت ولا يتغير حتى لو أعدت تسمية المشروع. لكن إذا انتقل المشروع لمعرّف آخر، حدّث `server.url` في `capacitor.config.ts` ثم:
```bash
npx cap sync android
```
وأعد بناء APK.

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| شاشة بيضاء عند فتح التطبيق | تأكد أن المشروع منشور وأن الرابط يفتح في المتصفح |
| `net::ERR_INTERNET_DISCONNECTED` | لا يوجد إنترنت — هذه النسخة تتطلبه |
| GPS لا يعمل | افحص صلاحيات التطبيق في إعدادات Android |
| Realtime متقطع | افحص جودة الاتصال (WebSocket يحتاج اتصالاً مستقراً) |
| تسجيل الدخول لا يحفظ | افحص أن localStorage مفعّل في WebView |
