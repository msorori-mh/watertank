import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعدادات إنتاج Capacitor — وايت ماء
 *
 * وضع الإنتاج: التطبيق يُحمَّل من ملفات محلية داخل APK (مجلد dist/)،
 * ولا يعتمد على رابط Lovable. الاتصال بالإنترنت يبقى مطلوباً فقط
 * لاستدعاءات Supabase (Auth + REST + Realtime).
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.wayetmaa',
  appName: 'وايت ماء',
  webDir: 'dist',

  // ⚠️ لا يوجد server.url ولا server.cleartext — التطبيق يحمّل
  // الواجهة من الملفات المحزّمة داخل الـ APK.

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
    },
  },
};

export default config;
