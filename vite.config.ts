import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,mp3,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
  base: "/detective-game/",
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })),
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
