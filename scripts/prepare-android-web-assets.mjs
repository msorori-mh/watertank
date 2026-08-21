// Prepare the official TanStack SPA shell for Capacitor's bundled webDir.
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";

const publicDir = ".output/public";
const shell = ".output/public/_shell.html";

if (!existsSync(shell)) {
  console.error(
    "TanStack SPA shell not found at " + shell +
      ". Run bun run build:android first.",
  );
  process.exit(1);
}

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync(publicDir, "dist", { recursive: true });

// Capacitor opens the web root. Preserve _shell.html for diagnostics and copy
// the exact framework-generated bootstrap document to the root entry point.
copyFileSync(shell, "dist/index.html");

console.log("prepared dist/index.html from the official TanStack SPA shell");
