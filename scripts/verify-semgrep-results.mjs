import { readFileSync } from "node:fs";

const reportPath = process.argv[2];

if (!reportPath) {
  console.error("Usage: node scripts/verify-semgrep-results.mjs <report.json>");
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const findings = Array.isArray(report.results) ? report.results : [];
const manifestPath = "android/app/src/main/AndroidManifest.xml";
const manifest = readFileSync(manifestPath, "utf8");

const launcherExportIsExpected =
  /android:name="\.MainActivity"[\s\S]*?android:exported="true"/.test(manifest) &&
  /android:name="android\.intent\.action\.MAIN"/.test(manifest) &&
  /android:name="android\.intent\.category\.LAUNCHER"/.test(manifest);

const accepted = [];
const blocking = [];

for (const finding of findings) {
  const ruleId = String(finding.check_id ?? "");
  const path = String(finding.path ?? "");
  const isLauncherFinding =
    path === manifestPath &&
    ruleId.endsWith("java.android.security.exported_activity.exported_activity") &&
    launcherExportIsExpected;

  (isLauncherFinding ? accepted : blocking).push(finding);
}

console.log(
  `Semgrep verification: ${findings.length} total, ${accepted.length} accepted launcher finding, ${blocking.length} blocking`,
);

if (blocking.length > 0) {
  for (const finding of blocking) {
    console.error(
      `${finding.extra?.severity ?? "UNKNOWN"} ${finding.check_id} ${finding.path}:${finding.start?.line ?? "?"}`,
    );
  }
  process.exit(1);
}
