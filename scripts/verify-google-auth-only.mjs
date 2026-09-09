import { existsSync, readFileSync, readdirSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const customer = read("src/routes/customer.login.tsx");
const driver = read("src/routes/driver.login.tsx");
const google = read("src/lib/google-auth.ts");
const callback = read("src/routes/auth.callback.tsx");
const bridge = read("src/lib/mobile-oauth.ts");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const guards = read("src/lib/route-guards.ts");
const restore = read("src/lib/session-restore.ts");
const admin = read("src/routes/admin.login.tsx");
const auth = read("src/lib/auth.ts");

expect(customer.includes('<GoogleOnlyAuth portal="customer"'), "customer login must be Google-only");
expect(driver.includes('<GoogleOnlyAuth portal="driver"'), "driver login must be Google-only");
expect(!existsSync("src/components/PhonePasswordAuth.tsx"), "phone/password component must be removed");
expect(!existsSync("src/lib/demo-flag.ts"), "demo auth flag must be removed");
expect(/provider:\s*["']google["']/.test(google), "Google OAuth provider missing");
expect(/prompt:\s*["']select_account["']/.test(google), "Google account chooser must be shown");
expect(google.includes("app.wayetmaa.mobile://auth/callback"), "native OAuth callback missing");
expect(/exchangeCodeForSession\(code\)/.test(bridge), "mobile PKCE exchange missing");
expect(/appUrlOpen/.test(bridge), "mobile deep-link listener missing");
expect(manifest.includes('android:scheme="app.wayetmaa.mobile"'), "Android OAuth scheme missing");
expect(manifest.includes('android:host="auth"'), "Android OAuth host missing");
expect(/provider\s*!==\s*["']google["']/.test(callback), "callback must reject non-Google users");
expect(callback.includes('select("city,phone")') && callback.includes('.from("addresses")'),
  "customer callback must require profile and address completion");
expect(guards.includes('provider !== "google"'), "portal guards must reject non-Google sessions");
expect(restore.includes('"/customer/profile/complete"'), "session restore must gate incomplete customer profiles");
expect(admin.includes("adminLogin") && /signInWithPassword/.test(auth), "admin password login must remain available");

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(path);
  }
};
walk("src");
const forbidden = /DEMO_OTP|PHONE_PASSWORD_PILOT|signInWithPhonePassword|signUpWithPhonePassword|verifyOtpAndLogin/;
for (const path of sourceFiles) expect(!forbidden.test(read(path)), `legacy auth remains in ${path}`);

if (failures.length) {
  console.error("GOOGLE-AUTH-ONLY-01 FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("GOOGLE-AUTH-ONLY-01 PASS");
