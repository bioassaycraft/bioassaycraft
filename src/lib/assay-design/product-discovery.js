export function supplierSearch(token, fetcher = fetch) {
  if (!token) return undefined;
  return async ({ terms, host, page, signal }) => {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.search = new URLSearchParams({
      q: `(${terms.slice(0, 5).map((term) => `"${term}"`).join(" OR ")}) protein ${host.includes("acrobiosystems")
        ? `(site:${host} OR site:ehf85k.acrobiosystems.cn)`
        : `(site:${host} OR site:cdn1.sinobiological.com)`}`,
      count: "20", offset: String(page), country: "ALL", spellcheck: "false",
    });
    const response = await fetcher(url, {
      signal, redirect: "error",
      headers: { Accept: "application/json", "X-Subscription-Token": token },
    });
    if (!response.ok) throw new Error(`search_http_${response.status}`);
    const result = await response.json();
    return {
      urls: (result.web?.results || []).map(({ url }) => url),
      more: result.query?.more_results_available === true,
    };
  };
}
