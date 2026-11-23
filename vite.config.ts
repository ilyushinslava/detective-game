import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      manifest: {
        name: "Под подозрением (Prime Suspect)",
        short_name: "Под подозрением",
        description: "Детективная пошаговая стратегия в стиле Neo-Noir",
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
    modulePreload: {
      resolveDependencies: (filename, deps, { hostType }) => {
        return deps.filter(
          (dep) =>
            !dep.includes('tv-party') &&
            !dep.includes('vendor-qr-scanner') &&
            !dep.includes('RulesModal') &&
            !dep.includes('TutorialScreen') &&
            !dep.includes('DuelScreen')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-network';
          }
          if (id.includes('node_modules/html5-qrcode')) {
            return 'vendor-qr-scanner';
          }
          if (
            id.includes('node_modules/qrcode.react') ||
            id.includes('src/components/tv/') ||
            (id.includes('src/components/controller/') && !id.includes('DetectiveNotebookModal'))
          ) {
            return 'tv-party';
          }
          if (id.includes('src/components/ui/Icons') || id.includes('src/components/ui/ActionIcons')) {
            return 'icons';
          }
          if (
            id.includes('src/components/CharacterCard') ||
            id.includes('src/constants/') ||
            id.includes('src/utils/')
          ) {
            return 'game-core';
          }
        },
      },
    },
  },
});
