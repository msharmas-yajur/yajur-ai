import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { resolve } from "path";

export default defineConfig({
    plugins: [react(), cssInjectedByJsPlugin()],
    build: {
        lib: {
            entry: resolve(__dirname, "src/main.tsx"),
            name: "CopilotWidget",
            fileName: "widget",
            formats: ["iife"],
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
    define: {
        "process.env": {},
    },
});
