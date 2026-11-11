import { catalog, sampleCatalog } from "./catalog.js";
import { SearchError, searchDrugs } from "./search.js";

export const openTargetsEndpoint = "https://api.platform.opentargets.org/api/v4/graphql";
const normalize = (s) => s.normalize("NFKC").trim().toLowerCase();
export function parseTargetInput(input) {
  const tokens = typeof input === "string" ? input.split(/[,，、;；\n×+]+/) : input;
  if (!Array.isArray(tokens) || tokens.some((v) => typeof v !== "string"))
    throw new SearchError("invalid_targets");
  if (tokens.length > 32 || tokens.some((v) => v.length > 100))
    throw new SearchError("too_many_targets");
  const values = [
    ...new Map(tokens.map((v) => [normalize(v), v.normalize("NFKC").trim()])).values(),
  ].filter(Boolean);
  if (!values.length) throw new SearchError("empty_targets");
  if (values.length > 8) throw new SearchError("too_many_targets");
  return values;
}
async function graphql(query, variables, fetcher, signal) {
  const response = await fetcher(openTargetsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) throw new SearchError("upstream_unavailable");
  const payload = await response.json();
  if (payload.errors || !payload.data) throw new SearchError("upstream_unavailable");
  return payload.data;
}
async function resolveHit(hits, value, fetcher, signal) {
  const key = normalize(value);
  const exact = hits.filter((hit) => [hit.id, hit.name].some((name) => normalize(name) === key));
  if (exact.length === 1) return exact[0];
  if (exact.length || !hits.length) return null;

  // Check all returned candidates together, so search rank alone cannot resolve an alias.
  const fields = hits.map((_, index) => `$id${index}: String!`).join(", ");
  const selections = hits
    .map(
      (_, index) => `
    t${index}: target(ensemblId: $id${index}) {
      approvedName symbolSynonyms { label } nameSynonyms { label }
    }
  `,
    )
    .join("\n");
  const variables = Object.fromEntries(hits.map((hit, index) => [`id${index}`, hit.id]));
  const aliases = await graphql(
    `query TargetAliases(${fields}) { ${selections} }`,
    variables,
    fetcher,
    signal,
  );
  const matches = hits.filter((_, index) => {
    const item = aliases[`t${index}`];
    if (!item) return false;
    const names = [...(item.symbolSynonyms || []), ...(item.nameSynonyms || [])].map(
      ({ label }) => label,
    );
    return [item.approvedName, ...names].some((name) => name && normalize(name) === key);
  });
  return matches.length === 1 ? matches[0] : null;
}

export async function searchOnline(
  input,
  { fetcher = fetch, signal = AbortSignal.timeout(25000) } = {},
) {
  const values = parseTargetInput(input.targets);
  const resolved = await Promise.all(
    values.map(async (value) => {
      // CD3 is a complex: never silently replace it with the CD3E subunit.
      if (["cd3", "cd3 complex"].includes(normalize(value))) return catalog.targets[0];
      const requested = Object.hasOwn(input.resolutions || {}, value)
        ? input.resolutions[value]
        : value;
      const lookup = normalize(requested) === "cd20" ? "MS4A1" : requested;
      const data = await graphql(
        `
          query FindTarget($q: String!) {
            search(queryString: $q, entityNames: ["target"], page: { index: 0, size: 8 }) {
              hits {
                id
                name
                description
              }
            }
          }
        `,
        { q: lookup },
        fetcher,
        signal,
      );
      const hits = data.search.hits;
      const chosen = await resolveHit(hits, lookup, fetcher, signal);
      if (!chosen)
        throw new SearchError(hits.length ? "choose_target" : "unknown_target", {
          input: value,
          candidates: hits,
        });
      return {
        id: chosen.name,
        label: chosen.name,
        ensemblId: chosen.id,
        aliases: [value],
        kind: "protein",
      };
    }),
  );
  const targets = [...new Map(resolved.map((t) => [t.id, t])).values()];
  const remote = targets.filter((t) => t.ensemblId);
  const fetchedAt = new Date().toISOString();
  const responses = await Promise.all(
    remote.map((t) =>
      graphql(
        `
          query TargetDrugs($id: String!) {
            target(ensemblId: $id) {
              drugAndClinicalCandidates {
                count
                rows {
                  drug {
                    id
                    name
                    maximumClinicalStage
                    mechanismsOfAction {
                      rows {
                        mechanismOfAction
                        targets {
                          id
                          approvedSymbol
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        { id: t.ensemblId },
        fetcher,
        signal,
      ),
    ),
  );
  const byId = new Map();
  const hasCd20 = remote.some((target) => target.id === "MS4A1");
  const curatedCatalog = hasCd20 ? sampleCatalog : catalog;
  const sources = [...curatedCatalog.sources];
  for (const data of responses) {
    for (const { drug } of data.target?.drugAndClinicalCandidates?.rows || []) {
      if (!drug) continue;
      const stage = drug.maximumClinicalStage;
      if (
        stage !== "APPROVAL" &&
        !(input.includeClinical && /^PHASE_[1234](?:_[234])?$/.test(stage))
      )
        continue;
      const mechanisms = drug.mechanismsOfAction?.rows || [];
      const targetIds = [
        ...new Set(mechanisms.flatMap((m) => m.targets.map((t) => t.approvedSymbol))),
      ];
      // Only mechanism-backed target relationships count as matches.
      if (!targetIds.length) continue;
      const sourceId = `ot-${drug.id}`;
      byId.set(drug.id, {
        id: drug.id,
        name: drug.name,
        brand: "",
        targetIds,
        sourceId,
        clinicalStage: stage,
        approval: { agency: "global", status: stage === "APPROVAL" ? "approved" : "unknown" },
        verification: "imported",
        updatedAt: fetchedAt.slice(0, 10),
        mechanisms: mechanisms.map((m) => m.mechanismOfAction),
        targetSetComplete: false,
      });
      if (!sources.some((s) => s.id === sourceId))
        sources.push({
          id: sourceId,
          title: "Open Targets · " + drug.name,
          url: `https://platform.opentargets.org/drug/${drug.id}`,
          locator: `Drug mechanisms of action · ${stage}`,
          checkedAt: fetchedAt.slice(0, 10),
          verification: "imported",
        });
    }
  }
  // Retain curated complex-level evidence and merge equivalent gene aliases.
  for (const drug of curatedCatalog.drugs) {
    const gene = remote.find((t) => t.id === "MS4A1");
    const curated = {
      ...drug,
      targetIds: drug.targetIds.map((id) => (id === "CD20" && gene ? "MS4A1" : id)),
    };
    const duplicate = [...byId.values()].find(
      (d) => normalize(d.name).replace(/-(axgb|gxbm|xiiy)$/, "") ===
        normalize(drug.name).replace(/-(axgb|gxbm|xiiy)$/, ""),
    );
    // A curated CD3 complex record must not replace a CD3E gene record.
    if (duplicate) {
      const needsGeneRecord = targets.some(
        (t) => duplicate.targetIds.includes(t.id) && !curated.targetIds.includes(t.id),
      );
      if (needsGeneRecord) continue;
      byId.delete(duplicate.id);
    }
    byId.set(curated.id, curated);
  }
  const data = { targets, sources, drugs: [...byId.values()] };
  const result = searchDrugs({ ...input, targets: targets.map((t) => t.id) }, data);
  return {
    ...result,
    catalog: data,
    fetchedAt,
    mode: "online",
    sourceStatus: { FDA: "documents_on_request", EMA: "official_search", NMPA: "manual_search" },
  };
}
