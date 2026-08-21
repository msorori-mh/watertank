// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isAndroidBuild = process.env.ANDROID_BUILD === "1";

// Public (publishable) backend endpoint fallbacks. These are safe to ship in the
// client bundle and guarantee the app still boots if VITE_* env injection is
// unavailable during a build (otherwise the client throws
// "Missing Supabase environment variable(s)" at runtime).
const PUBLIC_BACKEND_URL = "https://actynnctmmyysocqxwdi.supabase.co";
const PUBLIC_BACKEND_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdHlubmN0bW15eXNvY3F4d2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTcxMzYsImV4cCI6MjA5NDI3MzEzNn0.s4x0s4pmbu5tZHtKFBYH8X9_0RccTm1trEp6nL8eJmU";

const backendUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || PUBLIC_BACKEND_URL;
const backendKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  PUBLIC_BACKEND_PUBLISHABLE_KEY;

// Keep the production web build SSR-enabled. Android uses TanStack Start's
// official SPA shell so Capacitor can bundle a complete client bootstrap.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(isAndroidBuild ? { spa: { enabled: true } } : {}),
  },
  vite: {
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(backendUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendKey),
    },
  },
});
