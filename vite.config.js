import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "tactovia-offline-shell",
      apply: "build",
      closeBundle() {
        const assets = readdirSync(
          new URL("./dist/assets/", import.meta.url),
        ).map((name) => "./assets/" + name);
        const brand = readdirSync(
          new URL("./dist/brand/", import.meta.url),
        ).map((name) => "./brand/" + name);
        const worker = readFileSync(
          new URL("./public/sw.js", import.meta.url),
          "utf8",
        ).replace(
          '["./", "./index.html", "./manifest.webmanifest"]',
          JSON.stringify([
            "./",
            "./index.html",
            "./manifest.webmanifest",
            ...assets,
            ...brand,
          ]),
        );
        writeFileSync(new URL("./dist/sw.js", import.meta.url), worker);
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
