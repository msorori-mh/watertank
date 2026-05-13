import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — وايت ماء
 *
 * ملاحظة مهمة: المشروع يستخدم TanStack Start (SSR) لذلك لا يوجد build ثابت
 * يصلح للحزم داخل الـ APK. لذا نستخدم نمط "hot reload" حيث يحمّل
 * التطبيق الواجهة من الرابط المنشور على Lovable مباشرة.
 *
 * بعد ربط المشروع بـ GitHub:
 *   1) git pull
 *   2) npm install
 *   3) npx cap add android
 *   4) npx cap sync
 *   5) npx cap open android   ← يفتح Android Studio لبناء الـ APK
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.wayetmaa',
  appName: 'وايت ماء',
  webDir: 'dist',
  server: {
    // يحمّل واجهة TanStack Start من رابط المعاينة المباشر للـ Sandbox
    url: 'https://7237f033-42da-4c9f-8040-97b19f995dbb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
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
    Geolocation: {
      // الصلاحيات تُضاف تلقائياً في AndroidManifest عبر @capacitor/geolocation
    },
  },
};

export default config;
