import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/detective-game/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/database"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});