import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Android needs a static, framework-generated bootstrap document. Use a
// Node-compatible build adapter only for prerendering this local SPA shell;
// the production web build remains on Lovable's Cloudflare configuration.
export default defineConfig({
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
