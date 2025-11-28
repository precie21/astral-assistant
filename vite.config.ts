import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // Vite options tailored for Tauri development
    clearScreen: false,

    // Tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            // Tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },

    // Path aliases
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@components": resolve(__dirname, "./src/components"),
            "@stores": resolve(__dirname, "./src/stores"),
            "@types": resolve(__dirname, "./src/types"),
            "@utils": resolve(__dirname, "./src/utils"),
        },
    },

    // Environment variables prefix
    envPrefix: ["VITE_", "TAURI_"],

    build: {
        // Tauri supports es2021
        target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
        // Don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        // Produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});
