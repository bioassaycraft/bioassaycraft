import { describe, expect, it, vi } from "vitest";
import worker from "../worker.js";

describe("Cloudflare edge routing", () => {
  it("returns one permanent redirect with a preserved valid ANOVA state", async () => {
    const response = await worker.fetch(
      new Request("https://bioassaycraft.com/anova-explorer/?model=sra"),
      { ASSETS: { fetch: vi.fn() } },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://bioassaycraft.com/learn/anova-explorer/?model=sra",
    );
  });

  it("passes canonical and missing paths to the static asset binding", async () => {
    const assetResponse = new Response("not found", { status: 404 });
    const fetch = vi.fn().mockResolvedValue(assetResponse);
    const request = new Request("https://bioassaycraft.com/not-a-page/");

    await expect(worker.fetch(request, { ASSETS: { fetch } })).resolves.toBe(assetResponse);
    expect(fetch).toHaveBeenCalledWith(request);
  });
});
