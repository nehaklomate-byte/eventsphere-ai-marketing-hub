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
      // No explicit target/preset here on purpose: Nitro (which powers
      // this build) auto-detects the Vercel environment on its own via
      // the VERCEL env var that Vercel's build step sets automatically,
      // and picks the correct serverless output format for it. An
      // earlier attempt to force this with `target: "vercel"` may have
      // used the wrong option name for this TanStack Start version and
      // silently produced the wrong (non-Vercel) output shape instead —
      // which is exactly what causes a 404 on every route after an
      // otherwise-successful build.
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
