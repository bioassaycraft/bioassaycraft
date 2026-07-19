import { getLegacyRedirect, getRedirectSearch } from "./src/config/legacy-routes.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetPath = getLegacyRedirect(url.pathname);
    if (targetPath) {
      url.pathname = targetPath;
      url.search = getRedirectSearch(targetPath, url.search);
      return Response.redirect(url.toString(), 308);
    }
    return env.ASSETS.fetch(request);
  },
};
