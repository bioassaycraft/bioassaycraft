import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import AnovaExplorer from "../pages/AnovaExplorer.vue";
import "../styles/tokens.css";
import "../styles/layout.css";
import "../styles/components.css";

const app = createApp(AnovaExplorer);
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/learn/anova-explorer/", component: AnovaExplorer }],
});

app.use(router);
router.isReady().then(() => app.mount("#anova-explorer-app"));
