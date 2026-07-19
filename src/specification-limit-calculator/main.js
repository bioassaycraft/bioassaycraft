import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import SpecificationLimitCalculator from "../pages/SpecificationLimitCalculator.vue";
import "../styles/tokens.css";
import "../styles/layout.css";
import "../styles/components.css";

const app = createApp(SpecificationLimitCalculator);
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/tools/specification-limit-calculator/", component: SpecificationLimitCalculator },
  ],
});

app.use(router);
router.isReady().then(() => app.mount("#specification-limit-calculator-app"));
