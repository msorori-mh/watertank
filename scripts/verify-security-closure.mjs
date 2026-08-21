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
for (const p of ["customer creates orders", "customer cancels own pending", "driver updates assigned orders", "driver claims approved order", "auth read drivers", "driver creates own withdrawal"]) {
  expect(sql.includes(`DROP POLICY IF EXISTS "${p}"`), `missing DROP POLICY "${p}"`);
}
for (const p of ["driver reads own row", "admin reads drivers", "customer reads assigned driver", "wallet receipts owner reads", "admin can insert", "user can notify self", "order parties can notify each other"]) {
  expect(sql.includes(`CREATE POLICY "${p}"`), `missing CREATE POLICY "${p}"`);
}
expect(/resolve_order_price/.test(sql) && /_server_price/.test(sql), "create_wallet_order must use server-side price");
expect(/guard_driver_sensitive_columns/.test(sql) && /trg_guard_driver_sensitive_columns/.test(sql), "missing driver column guard trigger");
expect(/UPDATE storage\.buckets SET public = false WHERE id = 'wallet-receipts'/.test(sql), "wallet-receipts must be private");
expect(!/"admin updates orders"/.test(sql), "admin updates orders policy must stay untouched");

expect(!/adminSignup|setupCode|promote_to_admin/.test(login), "admin signup / setup code still present in admin.login.tsx");
expect(!/adminSignup|promote_to_admin/.test(auth), "adminSignup / promote_to_admin still present in wayet-auth.ts");

if (failures.length) {
  console.error("MVP-01-SECURITY-CLOSURE verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("MVP-01-SECURITY-CLOSURE verification PASS");
