import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

/** @type {Array<import("rollup").RollupOptions>} */
export default [
    {
        input: "src/index.ts",
        output: [
            {
                file: "dist/userscript-webpack-patcher.global.js",
                name: "userscriptWebpackPatcher",
                format: "iife"
            },
            {
                file: "dist/userscript-webpack-patcher.js",
                format: "es"
            }
        ],
        plugins: [typescript()]
    },
    {
        input: "dist/index.d.ts",
        output: {
            file: "dist/userscript-webpack-patcher.d.ts",
            format: "es"
        },
        plugins: [dts()]
    }
];
