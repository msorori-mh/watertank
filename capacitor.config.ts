import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعدادات Capacitor — وايت ماء (نسخة MVP / Hot Reload المُحسّن)
 *
 * ⚠️ هذه نسخة تجريبية MVP وليست نسخة Production مستقلة.
 *
 * كيف يعمل التطبيق:
 *   - APK لا يحتوي على ملفات الواجهة محلياً.
 *   - عند فتح التطبيق، يحمّل الواجهة من رابط Lovable الثابت المنشور:
 *       https://project--7237f033-42da-4c9f-8040-97b19f995dbb.lovable.app
 *   - أي تحديث يصل للمستخدم فوراً بعد النشر من Lovable
 *     بدون الحاجة لإعادة بناء APK.
 *
 * المتطلبات:
 *   - يجب نشر المشروع أولاً من Lovable (زر Publish) قبل بناء APK.
 *   - اتصال إنترنت دائم مطلوب لتحميل الواجهة.
 *   - الإنترنت يبقى مطلوباً أيضاً لـ Supabase (Auth + REST + Realtime + GPS sync).
 */
const config: CapacitorConfig = {
  appId: 'app.wayetmaa.mobile',
  appName: 'وايت ماء',
  webDir: 'dist',

  // الواجهة تُحمَّل من رابط Lovable الثابت المنشور.
  // الرابط لا يتغير حتى لو أعيدت تسمية المشروع.
  server: {
    url: 'https://project--7237f033-42da-4c9f-8040-97b19f995dbb.lovable.app',
    cleartext: false, // HTTPS فقط — أكثر أماناً
    androidScheme: 'https',
  },

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
