import { classifyTargetMatch, prepareTargetMatch } from "./target-match.js";
import { catalog } from "./catalog.js";

export class SearchError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

const normalize = (value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export function resolveTargets(input, data = catalog) {
  const tokens = typeof input === "string" ? input.split(/[,，、;；\n×+]+/) : input;
  if (!Array.isArray(tokens) || tokens.some((v) => typeof v !== "string"))
    throw new SearchError("invalid_targets");
  if (tokens.length > 32 || tokens.some((v) => v.length > 100))
    throw new SearchError("too_many_targets");
  const values = tokens.map((v) => v.trim()).filter(Boolean);
  if (!values.length) throw new SearchError("empty_targets");
  const resolved = [];
  for (const value of values) {
    const matches = data.targets.filter((t) =>
      [t.id, t.label, ...t.aliases].some((a) => normalize(a) === normalize(value)),
    );
    if (!matches.length) throw new SearchError("unknown_target", { input: value });
    if (matches.length > 1)
      throw new SearchError("ambiguous_target", {
        input: value,
        candidates: matches.map((t) => t.id),
      });
    if (!resolved.some((t) => t.id === matches[0].id)) resolved.push(matches[0]);
  }
  if (resolved.length > 8) throw new SearchError("too_many_targets");
  return resolved.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
}

export function generateCombinations(targets) {
  if (!Array.isArray(targets) || !targets.length || targets.length > 8)
    throw new SearchError("invalid_targets");
  const result = [];
  for (let mask = 1; mask < 2 ** targets.length; mask++) {
    const targetIds = targets.filter((_, i) => mask & (1 << i)).map((t) => t.id);
    result.push({ key: targetIds.join("|"), targetIds });
  }
  return result.sort((a, b) => a.targetIds.length - b.targetIds.length);
}

export function searchDrugs(input, data = catalog) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new SearchError("invalid_request");
  const { matchMode = "contains", agency = "all", query = "", verification = "all" } = input;
  if (
    !["contains", "exact", "recorded_exact", "verified_scope"].includes(matchMode) ||
    !["all", "FDA", "EMA", "NMPA"].includes(agency) ||
    !["all", "reviewed", "verified"].includes(verification) ||
    typeof query !== "string" ||
    query.length > 200
  )
    throw new SearchError("invalid_filters");
  const resolvedTargets = resolveTargets(input.targets, data);
  const available = data.drugs.filter(
    (d) =>
      (d.approval.status === "approved" || (input.includeClinical && d.clinicalStage)) &&
      ["reviewed", "verified", "imported"].includes(d.verification) &&
      (agency === "all" || d.approval.agency === agency) &&
      (verification === "all" || d.verification === verification) &&
      normalize(`${d.name} ${d.brand}`).includes(normalize(query)),
  );
  const evidenceMode =
    matchMode === "verified_scope" ||
    (matchMode === "recorded_exact" && data.targetEvidenceMatching);
  const prepared = evidenceMode
    ? available.map((drug) => [drug, prepareTargetMatch(drug, data.targets)])
    : [];
  const combinations = generateCombinations(resolvedTargets).map((combo) => ({
    ...combo,
    ...(evidenceMode
      ? (() => {
          const assessed = prepared.flatMap(([drug, record]) => {
            const match = classifyTargetMatch(record, combo.targetIds);
            return match ? [{ drugId: drug.id, ...match }] : [];
          });
          return {
            matches: assessed
              .filter(({ state }) => state === "verified")
              .map(({ drugId }) => ({ drugId, matchType: "exact" })),
            candidates: assessed.filter(({ state }) => state !== "verified"),
          };
        })()
      : {
          matches: available
            .filter(
              (d) =>
                combo.targetIds.every((id) => d.targetIds.includes(id)) &&
                (combo.targetIds.length === 1 ||
                  !d.reportedTargetSets ||
                  d.reportedTargetSets.some((set) =>
                    combo.targetIds.every((id) => set.includes(id)),
                  )) &&
                (matchMode !== "recorded_exact" ||
                  (d.targetIds.length === combo.targetIds.length &&
                    (combo.targetIds.length === 1 || d.targetSetComplete !== false))) &&
                (matchMode !== "exact" ||
                  (d.targetSetComplete !== false && d.targetIds.length === combo.targetIds.length)),
            )
            .map((d) => ({
              drugId: d.id,
              matchType:
                d.targetSetComplete === false
                  ? "reported"
                  : d.targetIds.length === combo.targetIds.length
                    ? "exact"
                    : "superset",
            })),
        }),
  }));
  const ids = new Set(combinations.flatMap((c) => c.matches.map((m) => m.drugId)));
  return {
    resolvedTargets,
    combinations,
    drugs: available.filter((d) => ids.has(d.id)),
    sources: data.sources,
    sourceStatus: { FDA: "partial", EMA: "not_connected", NMPA: "not_connected" },
    dataAsOf: data.sources.map((s) => s.checkedAt).sort()[0] || null,
  };
}
