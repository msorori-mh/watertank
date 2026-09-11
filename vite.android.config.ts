import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Public (publishable) backend endpoint fallbacks, kept identical to
// vite.config.ts. This config does not go through Lovable's VITE_* env
// injection, so without them the bundled APK throws
// "Missing Supabase environment variable(s)" on first render.
const PUBLIC_BACKEND_URL = "https://actynnctmmyysocqxwdi.supabase.co";
const PUBLIC_BACKEND_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdHlubmN0bW15eXNvY3F4d2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTcxMzYsImV4cCI6MjA5NDI3MzEzNn0.s4x0s4pmbu5tZHtKFBYH8X9_0RccTm1trEp6nL8eJmU";

const backendUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || PUBLIC_BACKEND_URL;
const backendKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  PUBLIC_BACKEND_PUBLISHABLE_KEY;

// Android needs a static, framework-generated bootstrap document. Use a
// Node-compatible build adapter only for prerendering this local SPA shell;
// the production web build remains on Lovable's Cloudflare configuration.
export default defineConfig({
  define: {
    "process.env.SUPABASE_URL": JSON.stringify(backendUrl),
    "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendKey),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(backendUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(backendKey),
  },
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    nitro({ preset: "node-server" }),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    react(),
  ],
});
