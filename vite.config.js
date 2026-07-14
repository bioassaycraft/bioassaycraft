import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        anovaExplorer: "learn/anova-explorer/index.html",
        ciExplorer: "learn/ci-explorer/index.html",
        concentrationConverter: "tools/converter/index.html",
        specificationLimitCalculator: "tools/specification-limit-calculator/index.html",
      },
    },
  },
});
