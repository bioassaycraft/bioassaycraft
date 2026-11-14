export function supplierPageRenderer(account, token, fetcher = fetch) {
  if (!/^[a-f0-9]{32}$/i.test(account || "") || !token) return undefined;

  return async (url, selector, signal) => {
    const response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/content`,
      {
        method: "POST",
        redirect: "error",
        signal,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          gotoOptions: { waitUntil: "domcontentloaded", timeout: 6500 },
          waitForSelector: { selector, timeout: 3500 },
          rejectResourceTypes: ["image", "media", "font"],
        }),
      },
    );
    if (!response.ok) throw new Error("render_unavailable");
    const { success, result } = await response.json();
    if (!success || typeof result !== "string" || result.length > 2_000_000)
      throw new Error("render_unavailable");
    return result;
  };
}
