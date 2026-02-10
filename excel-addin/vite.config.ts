import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
    plugins: [react(), mkcert()],
    server: {
        port: 3000,
        https: true,
    },
    build: {
        outDir: "dist",
        rollupOptions: {
            input: {
                taskpane: "./taskpane.html",
            },
        },
    },
});
