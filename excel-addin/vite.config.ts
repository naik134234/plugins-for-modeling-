import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
    plugins: [react(), mkcert()],
    server: {
        port: 3000,
        https: true,
        proxy: {
            "/api/yahoo": {
                target: "https://query1.finance.yahoo.com",
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api\/yahoo/, ""),
                secure: false,
            },
            "/api/alphavantage": {
                target: "https://www.alphavantage.co",
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/api\/alphavantage/, ""),
                secure: false,
            },
        },
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
