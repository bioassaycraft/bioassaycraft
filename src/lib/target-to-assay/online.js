import { providerIssue } from "./provider-status.js";
import { catalog, sampleCatalog, regulatoryCd3Cd20 } from "./catalog.js";
import { ingredientKey } from "./display.js";
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
    redirect: "manual",
  });
  if (!response.ok) throw new SearchError("upstream_unavailable", { status: response.status });
  const payload = await response.json();
  if (payload?.errors?.length)
    throw new SearchError("upstream_unavailable", { reason: "graphql_errors" });
  if (!payload?.data || typeof payload.data !== "object")
    throw new Error("unexpected_graphql_response");
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

export function mergeEvidence(...groups) {
  return [...new Map(groups.flatMap((group) => group || []).map((row) => [JSON.stringify(row), row])).values()];
}
export function curatedTargetEvidence(drug) {
  return drug.targetEvidence || (drug.verification === "reviewed" ? [{
    sourceType: "reviewed_regulatory", sourceId: drug.sourceId, role: "direct",
    targetIds: drug.targetIds, complete: drug.targetSetComplete !== false,
  }] : []);
}
function openTargetsRole(row) {
  const statement = row.mechanismOfAction;
  if (/\b(?:payload|cytotoxic warhead)\b/i.test(statement)) return "payload";
  if (/\b(?:downstream|indirect)\b/i.test(statement)) return "indirect";
  if (/\b(?:not|may|might|designed to)\b/i.test(statement)) return "unverified";
  if (/\b(?:binds|recognizes)\b/i.test(statement))
    return "direct";
  return /^(?:AGONIST|ANTAGONIST|INHIBITOR|BLOCKER|ACTIVATOR|BINDING AGENT|ANTIBODY)$/i.test(row.actionType || "")
    ? "direct" : "unverified";
}

export async function searchOnline(
  input,
  { fetcher = fetch, signal = AbortSignal.timeout(25000), resolvedTargets, discoveryTargets = [] } = {},
) {
  const values = parseTargetInput(input.targets);
  const resolved =
    resolvedTargets ||
    (await Promise.all(
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
    ));
  const targets = [...new Map(resolved.map((t) => [t.id, t])).values()];
  const remote = [...targets, ...discoveryTargets.filter((t) => !targets.some(({ id }) => id === t.id))].filter((t) => t.ensemblId);
  const fetchedAt = new Date().toISOString();
  const responses = await Promise.allSettled(
    remote.map(async (t) => {
      const data = await graphql(
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
                    drugType
                    synonyms {
                      label
                    }
                    tradeNames {
                      label
                    }
                    mechanismsOfAction {
                      rows {
                        mechanismOfAction
                        actionType
                        targetName
                        references {
                          source
                          ids
                          urls
                        }
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
      );
      const candidates = data.target?.drugAndClinicalCandidates;
      if (
        candidates != null &&
        (!Array.isArray(candidates.rows) ||
          candidates.rows.some((row) => {
            if (!row || typeof row !== "object") return true;
            const drug = row.drug;
            if (drug == null) return false;
            const mechanisms = drug.mechanismsOfAction?.rows;
            return (
              typeof drug.id !== "string" ||
              typeof drug.name !== "string" ||
              [drug.synonyms, drug.tradeNames].some(
                (labels) =>
                  labels != null &&
                  (!Array.isArray(labels) ||
                    labels.some((label) => !label || typeof label.label !== "string")),
              ) ||
              (mechanisms != null &&
                (!Array.isArray(mechanisms) ||
                  mechanisms.some(
                    (row) =>
                      !row ||
                      (row.mechanismOfAction != null && typeof row.mechanismOfAction !== "string") ||
                      (row.targets != null && !Array.isArray(row.targets)) ||
                      row.targets?.some(
                        (target) => !target || typeof target.approvedSymbol !== "string",
                      ),
                  )))
            );
          }))
      )
        throw new Error("unexpected_graphql_response");
      const rows = candidates?.rows || [];
      const drugsWithoutMechanisms = new Set(rows.flatMap(({ drug }) =>
        drug && !drug.mechanismsOfAction?.rows?.some(({ mechanismOfAction }) => mechanismOfAction)
          ? [drug.id] : [],
      )).size;
      return { rows, count: candidates?.count ?? rows.length, drugsWithoutMechanisms };
    }),
  );
  const byId = new Map();
  const hasCd20 = targets.some((target) => target.id === "MS4A1");
  const curatedCatalog = hasCd20 ? sampleCatalog : catalog;
  const official = resolvedTargets && hasCd20 ? regulatoryCd3Cd20 : [];
  const sources = [...curatedCatalog.sources, ...official.map(({ source }) => source)];
  for (const [index, response] of responses.entries()) {
    if (response.status !== "fulfilled") {
      if (!resolvedTargets) throw response.reason;
      continue;
    }
    for (const { drug } of response.value.rows) {
      if (!drug) continue;
      const stage = drug.maximumClinicalStage;
      if (
        stage !== "APPROVAL" &&
        !(input.includeClinical && (resolvedTargets || /^PHASE_[1234](?:_[234])?$/.test(stage)))
      )
        continue;
      const mechanisms = (drug.mechanismsOfAction?.rows || []).filter(
        (row) => row.mechanismOfAction,
      );
      const targetIds = [
        ...new Set(mechanisms.flatMap((m) => (m.targets || []).map((t) => t.approvedSymbol))),
      ];
      // Only mechanism-backed target relationships count as matches.
      if (!targetIds.length && !resolvedTargets) continue;
      const sourceId = `ot-${drug.id}`;
      const previous = byId.get(drug.id);
      byId.set(drug.id, {
        id: drug.id,
        name: drug.name,
        brand: "",
        aliases: [...new Set([...(previous?.aliases || []),
          ...[...(drug.synonyms || []), ...(drug.tradeNames || [])].map(({ label }) => label).filter(Boolean)])],
        molecularFormat: drug.drugType,
        targetIds: [...new Set([...(previous?.targetIds || []), ...targetIds])],
        proposedTargetIds: [...new Set([...(previous?.proposedTargetIds || []), remote[index].discoveryFor || remote[index].id])],
        sourceId,
        clinicalStage: stage || "UNKNOWN",
        approval: {
          agency: "global",
          status: stage === "APPROVAL" && !resolvedTargets ? "approved" : "unknown",
        },
        verification: "imported",
        updatedAt: fetchedAt.slice(0, 10),
        mechanisms: [...new Set([...(previous?.mechanisms || []), ...mechanisms.map((m) => m.mechanismOfAction)])],
        targetEvidence: mergeEvidence(previous?.targetEvidence, mechanisms.map((row) => ({
          sourceType: "open_targets",
          sourceId,
          text: row.mechanismOfAction,
          targetName: row.targetName,
          actionType: row.actionType,
          rawTargets: (row.targets || []).map(({ id, approvedSymbol }) => ({
            id: typeof id === "string" ? id : undefined, approvedSymbol,
          })),
          references: row.references,
          allowBindingAssertion: Boolean(row.references?.some(({ urls, ids }) => urls?.length || ids?.length)),
          role: openTargetsRole(row),
        }))),
        mechanismRecords: [...(previous?.mechanismRecords || []), ...mechanisms
          .filter((m) => m.mechanismOfAction && m.targets?.length)
          .map((m) => ({
            text: m.mechanismOfAction,
            actionType: m.actionType,
            references: m.references,
            targetIds: (m.targets || []).map((t) => t.approvedSymbol),
          }))].filter((row, index, rows) => rows.findIndex((other) => JSON.stringify(other) === JSON.stringify(row)) === index),
        targetSetComplete: Boolean(targetIds.length > 1 && mechanisms.some((row) =>
          new Set((row.targets || []).map(({ approvedSymbol }) => approvedSymbol)).size === targetIds.length &&
          row.references?.some(({ urls, ids }) => urls?.length || ids?.length))),

        ...(resolvedTargets
          ? {
              reportedTargetSets: mechanisms
                .filter((row) => row.mechanismOfAction)
                .map((row) => (row.targets || []).map((target) => target.approvedSymbol)),
            }
          : {}),
      });
      if (!sources.some((s) => s.id === sourceId))
        sources.push({
          id: sourceId,
          title: "Open Targets · " + drug.name,
          url: `https://platform.opentargets.org/drug/${drug.id}`,
          locator: `Target–drug association · ${stage || "unknown stage"}`,
          checkedAt: fetchedAt.slice(0, 10),
          verification: "imported",
        });
    }
  }
  // Retain curated complex-level evidence and merge equivalent gene aliases.
  const importedCount = byId.size;
  for (const drug of [...curatedCatalog.drugs, ...official.map(({ drug }) => drug)]) {
    const gene = targets.find((t) => t.id === "MS4A1");
    const curated = {
      ...drug,
      targetIds: drug.targetIds.map((id) => (id === "CD20" && gene ? "MS4A1" : id)),
    };
    const duplicate = [...byId.values()].find(
      (d) => d.name.toLowerCase() === drug.name.toLowerCase() ||
        (ingredientKey(d.name) === ingredientKey(drug.name) &&
          !/ (sodium|potassium|hydrochloride)$/i.test(d.name)),
    );
    // A curated CD3 complex record must not replace a CD3E gene record.
    if (duplicate) {
      if (resolvedTargets) {
        curated.targetEvidence = mergeEvidence(curatedTargetEvidence(curated), duplicate.targetEvidence);
        curated.sourceIds = [duplicate.sourceId];
      }
      curated.proposedTargetIds = duplicate.proposedTargetIds;
      curated.externalIds = { chembl: duplicate.id };
      curated.aliases = [...new Set([...(curated.aliases || []), ...(duplicate.aliases || [])])];
      const needsGeneRecord = targets.some(
        (t) => duplicate.targetIds.includes(t.id) && !curated.targetIds.includes(t.id),
      );
      if (needsGeneRecord && !resolvedTargets) continue;
      byId.delete(duplicate.id);
    }
    byId.set(curated.id, curated);
  }
  const drugs = [...byId.values()];
  const usedSources = new Set(drugs.flatMap(({ sourceId, sourceIds }) => [sourceId, ...(sourceIds || [])]));
  const data = { targets, sources: sources.filter(({ id }) => usedSources.has(id)), drugs };
  const result = searchDrugs({ ...input, targets: targets.map((t) => t.id) }, data);
  return {
    ...result,
    catalog: data,
    fetchedAt,
    mode: "online",
    openTargetsChecks: responses.map((response, index) => ({
      targetId: remote[index].id,
      ...(response.status === "rejected"
        ? providerIssue(response.reason)
        : {
            drugsWithoutMechanisms: response.value.drugsWithoutMechanisms,
            count: response.value.count,
            returned: response.value.rows.length,
            truncated: response.value.count > response.value.rows.length,
            state: response.value.rows.some(({ drug }) => drug)
              ? "success_with_data"
              : "success_empty",
          }),
    })),
    openTargetsErrors: responses.flatMap((response, index) => {
      if (response.status !== "rejected") return [];
      const error = response.reason;
      return [
        {
          targetId: remote[index].id,
          code: error.details?.status
            ? `upstream_${error.details.status}`
            : error.name === "TimeoutError"
              ? "timeout"
              : "upstream_unavailable",
        },
      ];
    }),
    openTargetsStatus: !remote.length
      ? "not_queried"
      : responses.every((item) => item.status === "rejected")
        ? "failed"
        : responses.some((item) => item.status === "rejected" || item.value.count > item.value.rows.length)
          ? "partial"
          : importedCount
            ? "ok"
            : "empty",
    sourceStatus: { FDA: "documents_on_request", EMA: "official_search", NMPA: "manual_search" },
  };
}
