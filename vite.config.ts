import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Previously this file imported defineConfig from the private
// "@lovable.dev/vite-tanstack-config" package, which only Lovable's own
// build environment can install (it isn't published to the public npm
// registry). That's fine when Lovable builds/hosts the app for you, but
// it makes `npm install` fail with a 403 anywhere else — including
// Vercel, which pulls straight from GitHub and only has access to the
// public registry. This file now wires up the same underlying plugins
// (all already in package.json as direct dependencies) directly, so the
// build has no dependency on Lovable's private registry at all.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Explicit Vercel target — the private config previously defaulted
      // this to "cloudflare". Without setting it correctly, TanStack
      // Start's Nitro server build produces output in the wrong shape
      // for Vercel's serverless functions even if `npm install` succeeds.
      target: "vercel",
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
