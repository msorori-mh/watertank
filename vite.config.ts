// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isAndroidBuild = process.env.ANDROID_BUILD === "1";

// Keep the production web build SSR-enabled. Android uses TanStack Start's
// official SPA shell so Capacitor can bundle a complete client bootstrap.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(isAndroidBuild ? { spa: { enabled: true } } : {}),
  },
});
