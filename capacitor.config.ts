import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعدادات Capacitor — وايت ماء (Production bundled app)
 *
 * كيف يعمل التطبيق:
 *   - APK/AAB يحتوي على ملفات الواجهة محلياً داخل الحزمة (webDir = dist).
 *   - لا يتم تحميل الواجهة من أي رابط خارجي (لا server.url) — متطلب Google Play.
 *   - الاتصال بالخادم يتم عبر HTTPS فقط.
 *
 * المتطلبات:
 *   - تنفيذ build ثم npx cap sync قبل بناء الحزمة.
 *   - الإنترنت مطلوب لعمل قاعدة البيانات والمصادقة والتحديثات الحيّة.
 */
const config: CapacitorConfig = {
  appId: 'app.wayetmaa.mobile',
  appName: 'وايت ماء',
  webDir: 'dist',


  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // عطّل debugging في Release
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0ea5e9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0ea5e9',
      overlaysWebView: false,
    },
    App: {
      // افتراضات افتراضية — يمكن تعديلها لاحقاً
    },
    Geolocation: {
      // الإعدادات الفعلية تُدار عبر صلاحيات Android
      // (ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION)
      // التي يضيفها plugin @capacitor/geolocation تلقائياً عند sync.
    },
  },
};

export default config;
