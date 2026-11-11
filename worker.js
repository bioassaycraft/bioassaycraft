import { getLegacyRedirect, getRedirectSearch } from "./src/config/legacy-routes.js";
import { handleTargetToAssay } from "./src/worker/target-to-assay-api.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/v1/target-to-assay/")) return handleTargetToAssay(request);
    const targetPath = getLegacyRedirect(url.pathname);
    if (targetPath) {
      url.pathname = targetPath;
      url.search = getRedirectSearch(targetPath, url.search);
      return Response.redirect(url.toString(), 308);
    }
    return env.ASSETS.fetch(request);
  },
};
