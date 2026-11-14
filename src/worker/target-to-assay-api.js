import { supplierPageRenderer } from "../lib/assay-design/render-page.js";
import { liveProteinVendors, queryLiveProteins } from "../lib/assay-design/live-products.js";
import { handleSupplement, supplementActions } from "./target-to-assay-supplements.js";
import { fetchEmaApprovals } from "../lib/target-to-assay/approval-records.js";
import { queryMechanisms } from "../lib/target-to-assay/live-mechanisms.js";
import { catalog } from "../lib/target-to-assay/catalog.js";
import { researchGroups } from "../lib/target-to-assay/research.js";
import { SearchError, resolveTargets, searchDrugs } from "../lib/target-to-assay/search.js";

let inFlightProductQueries = 0;
let inFlightMechanismQueries = 0;
let inFlightInvestigationalQueries = 0;
const discoveryCache = new Map();
const prefix = "/api/v1/target-to-assay/";
const json = (value, status = 200, extra = {}) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });

export async function handleTargetToAssay(request, env = {}) {
  const path = new URL(request.url).pathname;
  const action = path.slice(prefix.length);
  const expected = ["search", "resolve", "mechanisms", "investigational-discovery", "ema-approvals", "live-proteins", ...supplementActions].includes(action) ? "POST" : "GET";
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
  if (!["search", "resolve", "mechanisms", "investigational-discovery", "ema-approvals", "live-proteins", ...supplementActions].includes(action)) return json({ error: { code: "not_found" } }, 404);
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
    if (supplementActions.includes(action)) return handleSupplement(action, body, json, request.signal);
    if (action === "live-proteins") {
      const { target, vendor, offset = 0 } = body ?? {};
      if (typeof target !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,49}$/.test(target) ||
          !liveProteinVendors.includes(vendor) || !Number.isInteger(offset) || offset < 0 || offset > 216)
        return json({ error: { code: "invalid_query" } }, 422);
      if (inFlightProductQueries >= 6) return json({ error: { code: "rate_limited" } }, 429);
      inFlightProductQueries++;
      try {
        const renderPage = supplierPageRenderer(env.CF_BROWSER_ACCOUNT_ID, env.CF_BROWSER_API_TOKEN);
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(renderPage ? 14000 : 7000)]);
        return json(await queryLiveProteins(target, vendor, { signal, offset, renderPage }));
      } finally {
        inFlightProductQueries--;
      }
    }
    if (action === "ema-approvals") {
      const names = body?.names;
      if (!Array.isArray(names) || names.length > 50 || names.some((name) =>
        typeof name !== "string" || !name.trim() || name.length > 140))
        return json({ error: { code: "invalid_names" } }, 422);
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(12000)]);
        return json({ records: await fetchEmaApprovals(names, { signal }) });
      } catch {
        return json({ error: { code: "ema_unavailable" } }, 502);
      }
    }
    if (action === "investigational-discovery") {
      const key = JSON.stringify(body);
      const cached = discoveryCache.get(key);
      if (cached?.expires > Date.now()) return json(cached.data);
      if (inFlightInvestigationalQueries >= 2) return json({ error: { code: "busy" } }, 429);
      inFlightInvestigationalQueries++;
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(22000)]);
        const result = await queryMechanisms(body, { signal });
        const resultCatalog = result.catalog;
        const combinations = researchGroups(searchDrugs({ targets: result.resolvedTargets.map(({ id }) => id),
          matchMode: "verified_scope", includeClinical: true }, resultCatalog))
          .map(({ key, targetIds }) => ({ key, targetIds }));
        const data = {
          catalog: { ...resultCatalog, drugs: resultCatalog.drugs.map((drug) => {
            const compact = { ...drug };
            delete compact.normalizedTargetEvidence;
            delete compact.mechanismRecords;
            return compact;
          }) },
          combinations, sourceChecks: result.sourceChecks,
        };
        if (!result.partialFailures.length && !signal.aborted) {
          discoveryCache.set(key, { data, expires: Date.now() + 300000 });
          if (discoveryCache.size > 12) discoveryCache.delete(discoveryCache.keys().next().value);
        }
        return json(data);
      } finally {
        inFlightInvestigationalQueries--;
      }
    }
    if (action === "mechanisms") {
      if (inFlightMechanismQueries >= 6)
        return json({ error: { code: "busy" } }, 429, { "Retry-After": "3" });
      inFlightMechanismQueries += 1;
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(22000)]);
        return json(await queryMechanisms(body, { signal }));
      } finally {
        inFlightMechanismQueries -= 1;
      }
    }
    return json(
      action === "resolve" ? { resolvedTargets: resolveTargets(body?.targets) } : searchDrugs(body),
    );
  } catch (error) {
    if (error instanceof SearchError)
      return json({ error: { code: error.code, ...error.details } }, 422);
    return json({ error: { code: "internal_error" } }, 500);
  }
}
