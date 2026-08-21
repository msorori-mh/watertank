// MVP-01-SECURITY-CLOSURE verification contract.
// Run: node scripts/verify-security-closure.mjs
import { readFileSync, readdirSync } from "node:fs";

const dir = "db/pending-migrations";
const file = readdirSync(dir).find((f) => f.includes("mvp01_security_closure"));
if (!file) fail("migration file missing in " + dir);
const sql = readFileSync(`${dir}/${file}`, "utf8");
const login = readFileSync("src/routes/admin.login.tsx", "utf8");
const auth = readFileSync("src/lib/wayet-auth.ts", "utf8");

const failures = [];
function expect(cond, msg) { if (!cond) failures.push(msg); }
function fail(msg) { console.error("FAIL:", msg); process.exit(1); }

expect(/REVOKE EXECUTE ON FUNCTION public\.promote_to_admin\(text\)/.test(sql), "missing REVOKE on promote_to_admin");
expect(/DROP FUNCTION IF EXISTS public\.promote_to_admin\(text\)/.test(sql), "missing DROP promote_to_admin");
for (const p of ["customer creates orders", "customer cancels own pending", "driver updates assigned orders", "driver claims approved order", "auth read drivers", "driver creates own withdrawal", "users create own notifications", "admin creates notifications", "order participants notify each other", "public read wallet-receipts"]) {
  expect(sql.includes(`DROP POLICY IF EXISTS "${p}"`), `missing DROP POLICY "${p}"`);
}
for (const p of ["driver reads own row", "admin reads drivers", "customer reads assigned driver", "wallet receipts owner reads", "admin can insert", "user can notify self", "order parties can notify each other"]) {
  expect(sql.includes(`CREATE POLICY "${p}"`), `missing CREATE POLICY "${p}"`);
}
expect(/resolve_order_price/.test(sql) && /_server_price/.test(sql), "create_wallet_order must use server-side price");
expect(/guard_driver_sensitive_columns/.test(sql) && /trg_guard_driver_sensitive_columns/.test(sql), "missing driver column guard trigger");
expect(/UPDATE storage\.buckets SET public = false WHERE id = 'wallet-receipts'/.test(sql), "wallet-receipts must be private");
expect(/auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\]/.test(sql), "wallet receipts read must use folder-path ownership");
expect(!/owner = auth\.uid\(\)/.test(sql), "wallet receipts read must not rely on owner column");
expect(!/(INSERT|UPDATE|DELETE)[^\n]*ON storage\.objects/.test(sql), "must not touch storage upload/update/delete policies");
expect(/o\.customer_id = auth\.uid\(\)[\s\S]{0,160}notifications\.user_id = d\.user_id/.test(sql), "customer sender must target the driver only");
expect(/d\.user_id = auth\.uid\(\)[\s\S]{0,120}notifications\.user_id = o\.customer_id/.test(sql), "driver sender must target the customer only");
expect(!/notifications\.user_id = o\.customer_id OR notifications\.user_id = d\.user_id/.test(sql), "recipient must be the opposite party, not any party");
expect(!/DROP POLICY IF EXISTS "admin updates orders"/.test(sql), "admin updates orders policy must stay untouched");

expect(!/adminSignup|setupCode|promote_to_admin/.test(login), "admin signup / setup code still present in admin.login.tsx");
expect(!/adminSignup|promote_to_admin/.test(auth), "adminSignup / promote_to_admin still present in wayet-auth.ts");

// DEMO_MODE must be dev-only: requires import.meta.env.DEV === true AND VITE_DEMO_AUTH === "true"
const demoLine = auth.split("\n").find((l) => /const DEMO_MODE\s*=/.test(l)) ?? "";
expect(/import\.meta\.env\.DEV === true/.test(demoLine), "DEMO_MODE must require import.meta.env.DEV === true");
expect(/import\.meta\.env\.VITE_DEMO_AUTH === "true"/.test(demoLine), "DEMO_MODE must require VITE_DEMO_AUTH === \"true\"");
expect(/&&/.test(demoLine), "DEMO_MODE must AND both conditions (dev + VITE_DEMO_AUTH)");

if (failures.length) {
  console.error("MVP-01-SECURITY-CLOSURE verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("MVP-01-SECURITY-CLOSURE verification PASS");
