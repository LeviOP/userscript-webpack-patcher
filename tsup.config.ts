import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        "userscript-webpack-patcher": "src/index.ts"
    },
    format: ["esm", "iife"],
    dts: true,
    globalName: "userscriptWebpackPatcher"
});
