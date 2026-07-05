import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        anovaExplorer: "learn/anova-explorer/index.html",
        concentrationConverter: "tools/converter/index.html",
      },
    },
  },
});
