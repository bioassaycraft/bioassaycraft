import { ViteSSG } from "vite-ssg";
import App from "./App.vue";
import { getSeoPage } from "./config/seo";
import { routes } from "./router";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/components.css";

export const createApp = ViteSSG(App, {
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

export const includedRoutes = () =>
  routes.map((route) => route.path).filter((path) => path === "/404" || getSeoPage(path)?.index);
