import js from "@eslint/js";
import globals from "globals";
import vue from "eslint-plugin-vue";

export default [
  {
    ignores: [
      "archive/**",
      "dist/**",
      "node_modules/**",
      "assets/js/lib/**",
      "assets/js/tools/**",
      "tools/**",
      "simulators/**",
    ],
  },
  js.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: [
      "src/**/*.{js,vue}",
      "scripts/**/*.mjs",
      "tests/**/*.mjs",
      "worker.js",
      "vite.config.js",
      "eslint.config.js",
      "prettier.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
    },
  },
];
