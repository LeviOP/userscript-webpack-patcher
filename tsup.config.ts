import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "iife"],
    dts: true,
    globalName: "userscriptWebpackPatcher"
});
