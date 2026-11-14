import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { handleTargetToAssay } from "./src/worker/target-to-assay-api.js";

function configureApi(server) {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (!path?.startsWith("/api/v1/target-to-assay/")) return next();
          const controller = new AbortController();
          const disconnect = () => controller.abort();
          res.once("close", disconnect);
          try {
            const request = new Request(new URL(req.url, "http://localhost"), {
              method: req.method,
              headers: req.headers,
              signal: controller.signal,
              ...(req.method === "POST" ? { body: req, duplex: "half" } : {}),
            });
            const response = await handleTargetToAssay(request, process.env);
            const body = await response.text();
            if (!res.destroyed) {
              res.writeHead(response.status, Object.fromEntries(response.headers));
              res.end(body);
            }
          } catch (error) {
            if (!controller.signal.aborted) next(error);
          } finally {
            res.off("close", disconnect);
          }
        });
}

export default defineConfig({
  plugins: [vue(), { name: "target-to-assay-local-api", configureServer: configureApi, configurePreviewServer: configureApi }],
  build: {
    emptyOutDir: true,
  },
});
