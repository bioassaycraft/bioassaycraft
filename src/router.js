import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Home.vue";
import ModuleIndexPage from "./pages/ModuleIndexPage.vue";
import AnovaExplorer from "./pages/AnovaExplorer.vue";
import CiExplorer from "./pages/CiExplorer.vue";
import ResidualExplorer from "./pages/ResidualExplorer.vue";
import ConcentrationConverter from "./pages/ConcentrationConverter.vue";
import CfdCalculator from "./pages/CfdCalculator.vue";
import SpecificationLimitCalculator from "./pages/SpecificationLimitCalculator.vue";
import NotFound from "./pages/NotFound.vue";

export const routes = [
  { path: "/", component: Home },
  { path: "/explore/", component: ModuleIndexPage, props: { type: "explore" } },
  { path: "/tools/", component: ModuleIndexPage, props: { type: "tools" } },
  { path: "/learn/anova-explorer/", component: AnovaExplorer },
  { path: "/learn/ci-explorer/", component: CiExplorer },
  { path: "/learn/residual-explorer/", component: ResidualExplorer },
  { path: "/tools/converter/", component: ConcentrationConverter },
  { path: "/tools/cfd-calculator/", component: CfdCalculator },
  { path: "/tools/specification-limit-calculator/", component: SpecificationLimitCalculator },
  { path: "/404.html", component: NotFound },
  { path: "/:pathMatch(.*)*", redirect: "/404.html" },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
