// SEC-DRIVERS-PAYOUT-EXPOSURE-01 verification contract (source-level).
// Run: node scripts/verify-driver-payout-privacy.mjs
import { readFileSync, readdirSync } from "node:fs";

const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

const detail = readFileSync("src/routes/customer.orders.$id.tsx", "utf8");
expect(!/from\("drivers"\)/.test(detail), "customer order detail must not query the drivers table directly");
expect(/rpc\("get_order_driver_public"/.test(detail), "customer order detail must use get_order_driver_public RPC");

const rollback = readdirSync("db/rollback").find((f) => f.includes("sec_drivers_payout_exposure"));
expect(!!rollback, "rollback script missing in db/rollback");
if (rollback) {
  const sql = readFileSync(`db/rollback/${rollback}`, "utf8");
  expect(/DROP FUNCTION IF EXISTS public\.get_order_driver_public/.test(sql), "rollback must drop the RPC");
  expect(/CREATE POLICY "customer reads assigned driver"/.test(sql), "rollback must restore the previous policy");
}

// No customer-facing route may select financial driver columns.
const FIN = /(balance|payout_|bank_account|transfer_phone|transfer_network|app_commission)/;
for (const f of readdirSync("src/routes").filter((f) => f.startsWith("customer."))) {
  const src = readFileSync(`src/routes/${f}`, "utf8");
  for (const m of src.matchAll(/from\("drivers"\)[^\n]*/g)) {
    expect(!FIN.test(m[0]), `${f} selects financial driver columns: ${m[0]}`);
    expect(false, `${f} must not read the drivers table directly`);
  }
}

if (failures.length) {
  console.error("SEC-DRIVERS-PAYOUT-EXPOSURE-01 verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("SEC-DRIVERS-PAYOUT-EXPOSURE-01 verification PASS");
