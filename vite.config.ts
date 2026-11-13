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
        name: "Под подозрением (Prime Suspect)",
        short_name: "Под подозрением",
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
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules/html5-qrcode')) {
            return 'qr-scanner';
          }
          if (id.includes('src/components/ui/Icons') || id.includes('src/components/ui/ActionIcons')) {
            return 'icons';
          }
          if (id.includes('src/components/CharacterCard') || id.includes('src/constants/characterImages')) {
            return 'game-core';
          }
          if (id.includes('src/components/tv/') || id.includes('src/components/controller/')) {
            return 'tv-party';
          }
        },
      },
    },
  },
});
