// PILOT-PHONE-PASSWORD-01 source contract.
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const auth = read("src/lib/wayet-auth.ts");
const customerLogin = read("src/routes/customer.login.tsx");
const driverLogin = read("src/routes/driver.login.tsx");
const shared = read("src/components/PhonePasswordAuth.tsx");
const customerProfile = read("src/routes/customer.profile.complete.tsx");
const driverRegister = read("src/routes/driver.register.tsx");
const supabaseClient = read("src/integrations/supabase/client.ts");
const sessionRestore = read("src/lib/session-restore.ts");
const landing = read("src/routes/index.tsx");

expect(auth.includes("signInWithPhonePassword"), "missing phone/password login helper");
expect(auth.includes("signUpWithPhonePassword"), "missing phone/password signup helper");
expect(/signInWithPassword\(\{[\s\S]*?phone: formatted,[\s\S]*?password/.test(auth),
  "phone/password login must use Supabase Auth");
expect(/signUp\(\{[\s\S]*?phone: formatted,[\s\S]*?password/.test(auth),
  "phone/password signup must use Supabase Auth");
expect(shared.includes('portal: Portal'), "shared customer/driver auth form missing");
expect(shared.includes("كلمة المرور يجب ألا تقل عن ٨ أحرف"), "password minimum missing");
expect(shared.includes("كلمتا المرور غير متطابقتين"), "password confirmation missing");
expect(shared.includes('aria-label="رمز دولة اليمن الثابت"'), "Yemen +967 prefix must be rendered as a fixed, non-editable element");
expect(shared.includes('const fullPhone = `+967${localPhone}`;'), "authentication must compose the canonical +967 phone number internally");
expect(shared.includes('maxLength={9}'), "local Yemeni phone input must be limited to nine digits");
expect(shared.includes('/^7\\d{8}$/'), "local Yemeni mobile number must start with 7 and contain nine digits");
expect(!shared.includes('value={phone}'), "country prefix must not be stored inside the editable input");
expect(!customerLogin.includes("sendOtp"), "customer login must not call OTP");
expect(!driverLogin.includes("sendOtp"), "driver login must not call OTP");
expect(!customerLogin.includes("signInWithGoogle"), "customer pilot login must not expose Google");
expect(!driverLogin.includes("signInWithGoogle"), "driver pilot login must not expose Google");
expect(customerProfile.includes('if (!coords)'), "customer location must be required");
expect(customerProfile.includes("description: description.trim()"), "customer address description must be saved");
expect(
  driverRegister.includes('if (!name.trim())') &&
  driverRegister.includes('if (!phone.trim())') &&
  driverRegister.includes('if (!city)') &&
  driverRegister.includes('if (!plate.trim())') &&
  driverRegister.includes('if (!coords)'),
  "driver registration must require identity, vehicle, city and location fields",
);
expect(driverRegister.includes("lat: coords.lat, lng: coords.lng"), "driver location must be persisted");
expect(supabaseClient.includes("persistSession: true"), "Supabase session persistence must stay enabled");
expect(supabaseClient.includes("autoRefreshToken: true"), "Supabase token refresh must stay enabled");
expect(sessionRestore.includes("supabase.auth.getSession()"), "app startup must restore the saved Supabase session");
expect(sessionRestore.includes('return "/customer"'), "saved customer sessions must reopen the customer portal");
expect(sessionRestore.includes('return "/driver"'), "saved driver sessions must reopen the driver portal");
expect(sessionRestore.includes('return "/driver/register"'), "incomplete driver sessions must reopen registration");
expect(landing.includes("useSessionRestore()"), "mobile landing route must restore the session before showing login choices");
expect(customerLogin.includes("useSessionRestore()"), "customer login must bypass itself for a saved session");
expect(driverLogin.includes("useSessionRestore()"), "driver login must bypass itself for a saved session");

if (failures.length) {
  console.error("PILOT-PHONE-PASSWORD-01 FAILED");
  for (const failure of failures) console.error(" -", failure);
  process.exit(1);
}
console.log("PILOT-PHONE-PASSWORD-01 PASS");
