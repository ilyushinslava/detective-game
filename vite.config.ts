import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Реквием: Последний выстрел",
        short_name: "Реквием",
        description: "Детективная пошаговая киберпанк-стратегия",
        theme_color: "#080a0f",
        background_color: "#080a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        icons: [
          {
            src: "favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,webp,svg,mp3,webmanifest}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  base: "/detective-game/",
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(
      new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
    ),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
