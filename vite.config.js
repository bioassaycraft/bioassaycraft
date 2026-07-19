import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        exploreIndex: "explore/index.html",
        toolsIndex: "tools/index.html",
        anovaExplorer: "learn/anova-explorer/index.html",
        residualExplorer: "learn/residual-explorer/index.html",
        ciExplorer: "learn/ci-explorer/index.html",
        concentrationConverter: "tools/converter/index.html",
        specificationLimitCalculator: "tools/specification-limit-calculator/index.html",
        cfdCalculator: "tools/cfd-calculator/index.html",
      },
    },
  },
});
