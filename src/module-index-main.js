import { createApp } from "vue";
import ModuleIndexPage from "./pages/ModuleIndexPage.vue";
import "./styles/tokens.css";
import "./styles/layout.css";

const configuredType = document.documentElement.dataset.moduleIndexType;
const type =
  configuredType === "explore" || configuredType === "tools"
    ? configuredType
    : window.location.pathname.startsWith("/explore")
      ? "explore"
      : "tools";
createApp(ModuleIndexPage, { type }).mount("#app");
