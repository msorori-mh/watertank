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

expect(auth.includes("signInWithPhonePassword"), "missing phone/password login helper");
expect(auth.includes("signUpWithPhonePassword"), "missing phone/password signup helper");
expect(/signInWithPassword\(\{[\s\S]*?phone: formatted,[\s\S]*?password/.test(auth),
  "phone/password login must use Supabase Auth");
expect(/signUp\(\{[\s\S]*?phone: formatted,[\s\S]*?password/.test(auth),
  "phone/password signup must use Supabase Auth");
expect(shared.includes('portal: Portal'), "shared customer/driver auth form missing");
expect(shared.includes("كلمة المرور يجب ألا تقل عن ٨ أحرف"), "password minimum missing");
expect(shared.includes("كلمتا المرور غير متطابقتين"), "password confirmation missing");
expect(!customerLogin.includes("sendOtp"), "customer login must not call OTP");
expect(!driverLogin.includes("sendOtp"), "driver login must not call OTP");
expect(!customerLogin.includes("signInWithGoogle"), "customer pilot login must not expose Google");
expect(!driverLogin.includes("signInWithGoogle"), "driver pilot login must not expose Google");
expect(customerProfile.includes('if (!coords)'), "customer location must be required");
expect(customerProfile.includes("description: description.trim()"), "customer address description must be saved");
expect(driverRegister.includes('if (!name.trim() || !phone.trim() || !plate.trim() || !city || !coords)'),
  "driver registration must require location");
expect(driverRegister.includes("lat: coords.lat, lng: coords.lng"), "driver location must be persisted");

if (failures.length) {
  console.error("PILOT-PHONE-PASSWORD-01 FAILED");
  for (const failure of failures) console.error(" -", failure);
  process.exit(1);
}
console.log("PILOT-PHONE-PASSWORD-01 PASS");
