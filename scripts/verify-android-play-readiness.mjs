// ANDROID-READINESS-02 verification contract.
// Run: node scripts/verify-android-play-readiness.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// 0) native project exists
for (const f of [
  "android/build.gradle",
  "android/variables.gradle",
  "android/app/build.gradle",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/res/values/strings.xml",
  "android/keystore.properties.example",
]) expect(existsSync(f), `missing ${f}`);
if (failures.length) { report(); }

const vars = read("android/variables.gradle");
const appGradle = read("android/app/build.gradle");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const strings = read("android/app/src/main/res/values/strings.xml");
const cap = read("capacitor.config.ts");
const rootRoute = read("src/routes/__root.tsx");
const styles = read("src/styles.css");
const orderRoute = read("src/routes/customer.order.tsx");
const customerNav = read("src/components/CustomerBottomNav.tsx");
const driverShell = read("src/components/DriverShell.tsx");

// 1) package id + app name
expect(/applicationId ["']app\.wayetmaa\.mobile["']/.test(appGradle), "applicationId must be app.wayetmaa.mobile");
expect(/namespace = ["']app\.wayetmaa\.mobile["']/.test(appGradle), "namespace must be app.wayetmaa.mobile");
expect(/appId: ['"]app\.wayetmaa\.mobile['"]/.test(cap), "capacitor appId must be app.wayetmaa.mobile");
expect(strings.includes("وايت ماء"), "app_name must be وايت ماء");

// 2) API levels + version
expect(/compileSdkVersion = 36/.test(vars), "compileSdk must be 36");
expect(/targetSdkVersion = 36/.test(vars), "targetSdk must be 36");
const min = Number((vars.match(/minSdkVersion = (\d+)/) || [])[1]);
expect(min >= 23, `minSdk must stay at Capacitor's supported floor (got ${min})`);
expect(/versionCode 1\b/.test(appGradle), "versionCode must be 1");
expect(/versionName "1\.0\.0"/.test(appGradle), 'versionName must be "1.0.0"');

// 3) permissions
const declaredPermissions = (m) =>
  [...m.matchAll(/uses-permission\s+android:name="android\.permission\.([A-Z_]+)"/g)].map((x) => x[1]);
expect(manifest.includes("android.permission.INTERNET"), "INTERNET permission required");
expect(manifest.includes("android.permission.ACCESS_COARSE_LOCATION"), "ACCESS_COARSE_LOCATION required");
expect(manifest.includes("android.permission.ACCESS_FINE_LOCATION"), "ACCESS_FINE_LOCATION required");
for (const banned of [
  "ACCESS_BACKGROUND_LOCATION",
  "WRITE_EXTERNAL_STORAGE",
  "READ_EXTERNAL_STORAGE",
  "READ_MEDIA_IMAGES",
  "READ_MEDIA_VIDEO",
  "READ_MEDIA_AUDIO",
  "MANAGE_EXTERNAL_STORAGE",
  "QUERY_ALL_PACKAGES",
]) expect(!declaredPermissions(manifest).includes(banned), `manifest must not request ${banned}`);
const declared = declaredPermissions(manifest);
const allowed = new Set(["INTERNET", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]);
for (const p of declared) expect(allowed.has(p), `unexpected permission declared: ${p}`);

// 4) cleartext + launcher
expect(/usesCleartextTraffic="false"/.test(manifest), "usesCleartextTraffic must be false");
expect(/androidScheme:\s*['"]https['"]/.test(cap), "capacitor androidScheme must be https");
expect(/cleartext:\s*false/.test(cap), "capacitor cleartext must be false");
const launcher = manifest.slice(manifest.indexOf("<activity"), manifest.indexOf("</activity>"));
expect(/android:exported="true"/.test(launcher), "launcher activity must set exported=true");
expect(launcher.includes("android.intent.action.MAIN") && launcher.includes("android.intent.category.LAUNCHER"),
  "launcher activity must declare MAIN/LAUNCHER intent filter");

// 5) bundled web assets, no remote entry point
expect(!/server:\s*\{[\s\S]*?url:/.test(cap), "capacitor.config.ts must not define server.url");
expect(!/\burl:\s*['"]http/.test(cap), "capacitor.config.ts must not point at a remote url");
expect(/webDir:\s*['"]dist['"]/.test(cap), "capacitor webDir must be dist");

// 6) no signing material or secrets tracked
const scan = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "build", ".gradle", "dist"].includes(e.name)) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) scan(p);
    else {
      expect(!/\.(jks|keystore)$/.test(e.name), `signing material must not be committed: ${p}`);
      expect(e.name !== "keystore.properties", `keystore.properties must not be committed: ${p}`);
      expect(e.name !== "google-services.json", `google-services.json must not be committed: ${p}`);
    }
  }
};
scan("android");
const example = read("android/keystore.properties.example");
expect(/storeFile=/.test(example) && /keyAlias=/.test(example), "keystore example must document storeFile/keyAlias");
expect(!/(storePassword|keyPassword)=\S/.test(example), "keystore example must not contain real passwords");
const gitignore = read("android/.gitignore");
for (const rule of ["*.keystore", "*.jks", "keystore.properties"])
  expect(gitignore.includes(rule), `android/.gitignore must ignore ${rule}`);
expect(/hasReleaseSigning/.test(appGradle), "release signing must be conditional (gradle properties/env only)");
expect(!/storePassword\s+['"][^'"]+['"]/.test(appGradle), "build.gradle must not hardcode passwords");

// 7) package scripts
const pkg = JSON.parse(read("package.json"));
expect(pkg.scripts["android:sync"], "package.json must define android:sync");
expect(pkg.scripts["android:verify"], "package.json must define android:verify");
expect(pkg.scripts.build === "vite build", "existing build script must stay unchanged");
expect(
  pkg.scripts["build:android"] === "vite build --config vite.android.config.ts",
  "Android build must explicitly enable the SPA build mode",
);
expect(
  pkg.scripts["android:sync"].startsWith("bun run build:android"),
  "android:sync must build the official SPA shell first",
);

// 8) Android system navigation must not cover fixed bottom actions.
expect(rootRoute.includes('Capacitor.getPlatform() === "android"') && rootRoute.includes('classList.add("platform-android")'),
  "root route must mark the native Android platform for safe-area fallback");
expect(/html\.platform-android[\s\S]*--app-safe-bottom:[^;]*3rem/.test(styles),
  "Android must reserve a navigation-bar fallback when CSS safe-area is zero");
expect(styles.includes(".safe-fixed-bottom") && styles.includes(".safe-bottom-sheet"),
  "fixed actions and bottom sheets must have reusable safe-bottom utilities");
expect(/fixed bottom-0[\s\S]{0,160}safe-fixed-bottom/.test(orderRoute),
  "customer order confirmation bar must stay above Android navigation");
expect(customerNav.includes("safe-pb"), "customer bottom navigation must use the safe bottom inset");
expect(/fixed bottom-0[\s\S]{0,160}safe-pb/.test(driverShell),
  "driver bottom navigation must use the safe bottom inset");

const viteConfig = read("vite.android.config.ts");
const assetPrep = read("scripts/prepare-android-web-assets.mjs");
expect(existsSync("vite.android.config.ts"), "Android must use an isolated Vite config");
expect(viteConfig.includes('nitro({ preset: "node-server" })'), "Android SPA prerender must use a Node-compatible adapter");
expect(/spa:\s*\{\s*enabled:\s*true/.test(viteConfig), "Android build must enable TanStack SPA mode");
expect(assetPrep.includes(".output/public/_shell.html"), "asset preparation must require TanStack _shell.html");
expect(assetPrep.includes('copyFileSync(shell, "dist/index.html")'), "Capacitor root must use the official SPA shell");
expect(!assetPrep.includes('<div id="root"></div>'), "asset preparation must not synthesize an HTML bootstrap");

report();
function report() {
  if (failures.length) {
    console.error("ANDROID-READINESS-02 verification FAILED:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log("ANDROID-READINESS-02 verification PASS");
}
