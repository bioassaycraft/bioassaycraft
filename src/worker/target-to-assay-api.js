import { catalog } from "../lib/target-to-assay/catalog.js";
import { SearchError, resolveTargets, searchDrugs } from "../lib/target-to-assay/search.js";

const prefix = "/api/v1/target-to-assay/";
const json = (value, status = 200, extra = {}) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });

export async function handleTargetToAssay(request) {
  const path = new URL(request.url).pathname;
  const action = path.slice(prefix.length);
  const expected = ["search", "resolve"].includes(action) ? "POST" : "GET";
  if (request.method !== expected)
    return json({ error: { code: "method_not_allowed" } }, 405, { Allow: expected });
  if (action === "meta")
    return json({
      mode: "starter_catalog",
      targets: catalog.targets,
      drugCount: catalog.drugs.length,
      sourceStatus: { FDA: "partial", EMA: "not_connected", NMPA: "not_connected" },
    });
  if (action.startsWith("drugs/")) {
    const drug = catalog.drugs.find((d) => d.id === action.slice(6));
    return drug
      ? json({ drug, source: catalog.sources.find((s) => s.id === drug.sourceId) })
      : json({ error: { code: "not_found" } }, 404);
  }
  if (!["search", "resolve"].includes(action)) return json({ error: { code: "not_found" } }, 404);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return json({ error: { code: "unsupported_media_type" } }, 415);
  // Bound the stream, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return json({ error: { code: "payload_too_large" } }, 413);
      }
      chunks.push(value);
    }
  }
  let body;
  try {
    body = JSON.parse(await new Blob(chunks).text());
  } catch {
    return json({ error: { code: "invalid_json" } }, 400);
  }
  try {
    return json(
      action === "resolve" ? { resolvedTargets: resolveTargets(body?.targets) } : searchDrugs(body),
    );
  } catch (error) {
    if (error instanceof SearchError)
      return json({ error: { code: error.code, ...error.details } }, 422);
    return json({ error: { code: "internal_error" } }, 500);
  }
}
