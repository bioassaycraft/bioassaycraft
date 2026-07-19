import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import CiExplorer from "../pages/CiExplorer.vue";
import "../styles/tokens.css";
import "../styles/layout.css";
import "../styles/components.css";

const app = createApp(CiExplorer);
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/learn/ci-explorer/", component: CiExplorer }],
});

app.use(router);
router.isReady().then(() => app.mount("#ci-explorer-app"));
