// Prepares a self-contained web asset folder (dist/) for the bundled Capacitor app.
// The web build is SSR-first (dist/client + dist/server). Capacitor needs a static
// webDir with an index.html entry, so we flatten dist/client into dist/ and emit a
// client-rendered shell that boots the same TanStack client bundle.
// Run: node scripts/prepare-android-web-assets.mjs   (after `vite build`)
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const CLIENT = "dist/client";
const SERVER = "dist/server";

if (!existsSync(CLIENT)) {
  console.error("dist/client not found — run the web build first (bun run build).");
  process.exit(1);
}

// 1) flatten client assets to the webDir root
cpSync(CLIENT, "dist", { recursive: true });

// 2) find the root client entry + css from the start manifest
const manifestFile = readdirSync(SERVER).find((f) => f.includes("tanstack-start-manifest"));
if (!manifestFile) {
  console.error("start manifest not found in dist/server");
  process.exit(1);
}
const manifest = readFileSync(`${SERVER}/${manifestFile}`, "utf8");
const rootBlock = manifest.slice(manifest.indexOf("__root__"), manifest.indexOf('"/"'));
const entry = (rootBlock.match(/\/assets\/[A-Za-z0-9._-]+\.js/) || [])[0];
if (!entry) {
  console.error("could not resolve the root client entry from the manifest");
  process.exit(1);
}
const css = readdirSync("dist/assets")
  .filter((f) => f.endsWith(".css"))
  .map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`)
  .join("\n");

const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <title>وايت ماء</title>
    <link rel="manifest" href="/manifest.webmanifest" />
${css}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`;
writeFileSync("dist/index.html", html);
console.log(`prepared dist/index.html (entry ${entry})`);
