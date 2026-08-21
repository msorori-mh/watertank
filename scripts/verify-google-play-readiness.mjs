// GOOGLE-PLAY-READINESS-01 verification contract.
// Run: node scripts/verify-google-play-readiness.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8");
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// 1) public policy pages exist
expect(existsSync("src/routes/privacy.tsx"), "missing src/routes/privacy.tsx");
expect(existsSync("src/routes/account-deletion.tsx"), "missing src/routes/account-deletion.tsx");
const privacy = read("src/routes/privacy.tsx");
const deletion = read("src/routes/account-deletion.tsx");
expect(privacy.includes('createFileRoute("/privacy")'), "privacy route path must be /privacy");
expect(deletion.includes('createFileRoute("/account-deletion")'), "deletion route path must be /account-deletion");
expect(/dir="rtl"/.test(privacy) && /dir="rtl"/.test(deletion), "policy pages must be RTL");
for (const topic of ["رقم الهاتف", "العناوين", "الطلبات", "الإشعارات", "لا نبيع", "قسم الدعم داخل التطبيق"]) {
  expect(privacy.includes(topic), `privacy page must mention: ${topic}`);
}
expect(privacy.includes("/account-deletion"), "privacy page must link to /account-deletion");
for (const l of ["/customer/login", "/driver/login", "/privacy"]) {
  expect(deletion.includes(l), `account-deletion page must link to ${l}`);
}

// 2) unified delete-account component
const comp = read("src/components/DeleteAccountCard.tsx");
expect(comp.includes('DELETE_CONFIRM_PHRASE = "حذف حسابي"'), "confirmation phrase must be 'حذف حسابي'");
expect(comp.includes('supabase.rpc("delete_my_account"'), "component must call delete_my_account RPC");
expect(/signOut\(\)/.test(comp) && /nav\(\{ to: "\/" \}\)/.test(comp), "component must signOut then go home");
expect(/finalStep/.test(comp), "component must require a second confirmation step");
expect(/loading/.test(comp) && /setError/.test(comp), "component must handle loading and error states");
for (const f of ["src/routes/customer.settings.tsx", "src/routes/driver.settings.tsx"]) {
  const src = read(f);
  expect(src.includes("DeleteAccountCard"), `${f} must render DeleteAccountCard`);
}

// 3) pending (unapplied) migration
const pendingDir = "db/pending-migrations";
const file = readdirSync(pendingDir).find((f) => /2026082\d.*account_deletion/.test(f));
expect(Boolean(file), "missing pending account deletion migration in db/pending-migrations");
if (file) {
  const sql = read(`${pendingDir}/${file}`);
  expect(/CREATE OR REPLACE FUNCTION public\.delete_my_account\(\)/.test(sql), "migration must define public.delete_my_account()");
  expect(/SECURITY DEFINER/.test(sql), "delete_my_account must be SECURITY DEFINER");
  expect(/SET search_path =/.test(sql), "delete_my_account must set a safe search_path");
  expect(/auth\.uid\(\)/.test(sql) && /uid IS NULL/.test(sql), "must use auth.uid() and reject null");
  expect(/role = 'admin'/.test(sql) && /RAISE EXCEPTION/.test(sql), "must refuse admin accounts");
  expect(/REVOKE ALL ON FUNCTION public\.delete_my_account\(\) FROM PUBLIC/.test(sql), "must revoke from PUBLIC");
  expect(/GRANT EXECUTE ON FUNCTION public\.delete_my_account\(\) TO authenticated/.test(sql), "must grant execute to authenticated");
  expect(/DELETE FROM auth\.users WHERE id = uid/.test(sql), "must delete the auth user");
  for (const t of ["driver_withdrawal_requests", "drivers", "addresses", "notifications", "orders", "wallet_transactions", "wallet_topups", "wallets", "user_roles", "profiles"]) {
    expect(sql.includes(t), `migration must handle ${t}`);
  }
  expect(!/session_replication_role|DISABLE TRIGGER|ALTER TABLE[^\n]*DROP CONSTRAINT/i.test(sql),
    "migration must not disable triggers or bypass FKs");
}
const appliedDir = "supabase/migrations";
if (existsSync(appliedDir)) {
  const applied = readdirSync(appliedDir).filter((f) => /delete_my_account|account_deletion/.test(f));
  expect(applied.length === 0, "account deletion migration must stay pending, not in supabase/migrations");
  for (const f of readdirSync(appliedDir)) {
    if (f.endsWith(".sql")) {
      expect(!read(`${appliedDir}/${f}`).includes("delete_my_account"), `delete_my_account must not appear in applied migration ${f}`);
    }
  }
}

// 4) capacitor: bundled production app, HTTPS only, no live-reload server url
const cap = read("capacitor.config.ts");
expect(!/server:\s*\{[\s\S]*url:/.test(cap), "capacitor.config.ts must not define server.url");
expect(!/\burl:\s*['"]http/.test(cap), "capacitor.config.ts must not point at a remote url");
expect(/webDir:\s*['"]dist['"]/.test(cap), "capacitor webDir must be dist");
expect(/androidScheme:\s*['"]https['"]/.test(cap), "androidScheme must be https");
expect(/Production bundled app/.test(cap), "capacitor comment must describe a Production bundled app");
expect(!/Hot Reload/i.test(cap), "capacitor comment must not mention Hot Reload");

// 5) no background location permission requested anywhere in source
const bgHits = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|xml|json|jsonc|md)$/.test(e.name)) {
      const src = read(p);
      if (/ACCESS_BACKGROUND_LOCATION|backgroundLocation|watchPosition/.test(src)) bgHits.push(p);
    }
  }
};
walk("src");
for (const f of ["capacitor.config.ts"]) if (existsSync(f) && /ACCESS_BACKGROUND_LOCATION/.test(read(f))) bgHits.push(f);
expect(bgHits.length === 0, `background location must not be requested: ${bgHits.join(", ")}`);

// 6) deferred wallet/earnings links must stay hidden
const navChecks = [
  ["src/components/CustomerBottomNav.tsx", ["/customer/wallet"]],
  ["src/components/DriverShell.tsx", ["/driver/earnings"]],
  ["src/components/AdminShell.tsx", ["/admin/finance", "/admin/wallet-topups", "/admin/driver-withdrawals"]],
];
for (const [f, paths] of navChecks) {
  const src = read(f);
  for (const p of paths) expect(!src.includes(p), `${f} must not link to ${p}`);
}
for (const f of ["src/routes/customer.settings.tsx", "src/routes/driver.settings.tsx"]) {
  const src = read(f);
  expect(!src.includes("/customer/wallet"), `${f} must not link to /customer/wallet`);
  expect(!src.includes("/driver/earnings"), `${f} must not link to /driver/earnings`);
}

if (failures.length) {
  console.error("GOOGLE-PLAY-READINESS-01 verification FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("GOOGLE-PLAY-READINESS-01 verification PASS");
