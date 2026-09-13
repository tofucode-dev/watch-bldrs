// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://watch-bldrs.contact-tofucode.workers.dev",
  output: "server",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // Miniflare writes local traces to .wrangler on every Worker/Action
        // request. Without this, Vite treats those SQLite WAL files as HMR
        // changes even though no app module maps to them.
        ignored: ["**/.git/**", "**/node_modules/**", "**/.wrangler/**"],
      },
    },
  },
  adapter: cloudflare({ imageService: "compile" }),
  session: false,
  env: {
    schema: {
      CLOUDFLARE_ENV: envField.string({ context: "server", access: "public", optional: true }),
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_SUPABASE_URL: envField.string({ context: "client", access: "public", optional: true }),
      PUBLIC_SUPABASE_KEY: envField.string({ context: "client", access: "public", optional: true }),
    },
  },
});
