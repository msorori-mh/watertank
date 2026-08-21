// MVP-02-CASH-ONLY-SCOPE verification contract.
// Run: node scripts/verify-mvp-cash-only.mjs
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// 1) customer order page is cash-only
const order = read("src/routes/customer.order.tsx");
expect(order.includes("create_cash_order"), "customer.order must use create_cash_order");
expect(!order.includes("create_wallet_order"), "customer.order must not call create_wallet_order");
expect(!/from\("wallets"\)/.test(order), "customer.order must not load wallets");
expect(!/paymentMethod/.test(order), "customer.order must not keep a paymentMethod选项 state");
expect(!/walletBalance/.test(order), "customer.order must not keep walletBalance state");
expect(!/\/customer\/wallet/.test(order), "customer.order must not link to /customer/wallet");
expect(/الدفع نقداً عند التسليم/.test(order) && /ادفع للسائق مباشرة/.test(order),
  "customer.order must show the static cash-on-delivery card");

// 2) navigation must not expose deferred routes
const navChecks = [
  ["src/components/CustomerBottomNav.tsx", ["/customer/wallet"]],
  ["src/components/DriverShell.tsx", ["/driver/earnings"]],
  ["src/components/AdminShell.tsx", [
    "/admin/commissions", "/admin/finance", "/admin/wallet-topups",
    "/admin/payment-methods", "/admin/driver-withdrawals",
  ]],
];
for (const [file, paths] of navChecks) {
  const src = read(file);
  for (const p of paths) expect(!src.includes(p), `${file} must not link to ${p}`);
}
// kept tabs
const bottom = read("src/components/CustomerBottomNav.tsx");
for (const p of ["/customer\"", "/customer/reports", "/customer/addresses", "/customer/settings"]) {
  expect(bottom.includes(p), `CustomerBottomNav must keep ${p}`);
}
const driverShell = read("src/components/DriverShell.tsx");
for (const p of ["/driver\"", "/driver/orders", "/driver/reports", "/driver/settings"]) {
  expect(driverShell.includes(p), `DriverShell must keep ${p}`);
}
const adminShell = read("src/components/AdminShell.tsx");
for (const p of ["/admin\"", "/admin/orders", "/admin/drivers", "/admin/customers", "/admin/cities", "/admin/reports"]) {
  expect(adminShell.includes(p), `AdminShell must keep ${p}`);
}

// 3) deferred routes redirect before running queries
const redirects = [
  ["src/routes/customer.wallet.tsx", "/customer"],
  ["src/routes/driver.earnings.tsx", "/driver"],
  ["src/routes/admin.commissions.tsx", "/admin"],
  ["src/routes/admin.finance.tsx", "/admin"],
  ["src/routes/admin.wallet-topups.tsx", "/admin"],
  ["src/routes/admin.payment-methods.tsx", "/admin"],
  ["src/routes/admin.driver-withdrawals.tsx", "/admin"],
];
for (const [file, to] of redirects) {
  const src = read(file);
  expect(src.includes(`beforeLoad: deferredFeatureGuard("${to}")`), `${file} must redirect to ${to} in beforeLoad`);
}
const guards = read("src/lib/route-guards.ts");
expect(/export function deferredFeatureGuard/.test(guards) && /throw redirect/.test(guards),
  "deferredFeatureGuard must throw a redirect");

if (failures.length) {
  console.error("MVP-02-CASH-ONLY-SCOPE verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("MVP-02-CASH-ONLY-SCOPE verification PASS");
