import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  // Alias removed: Using packaged gralobe dependency
  optimizeDeps: {
    include: ["gralobe", "three", "gsap", "topojson-client", "world-atlas"],
  },
});
