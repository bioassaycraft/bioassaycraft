import { createApp } from "vue";
import { createHead } from "@unhead/vue/client";
import App from "./App.vue";
import { router } from "./router";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/components.css";

const app = createApp(App);
app.use(createHead());
app.use(router);
app.mount("#app");
