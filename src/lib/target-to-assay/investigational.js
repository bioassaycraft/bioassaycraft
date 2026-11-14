import { candidateView } from "./presentation.js";
import { fetchDeveloperEvidence } from "./developer-evidence.js";
import { fetchDrugSupplement } from "./drug-supplement.js";
import { fetchEmaApprovals, reviewedFdaRecord } from "./approval-records.js";
import { chemblIdentity, exactDrugName, reviewedInvestigationalSource } from "./investigational-sources.js";
import { reviewedMechanism } from "./bilingual-mechanism.js";
import { ingredientKey } from "./display.js";
import { discoverTrialInterventions } from "./trials.js";
import { providerIssue } from "./provider-status.js";
import { prepareTargetMatch, classifyTargetMatch } from "./target-match.js";
import { fetchDevelopmentProfile } from "./trials.js";

const namesFor = (drug) => [drug.name, drug.brand, ...(drug.aliases || [])].filter(Boolean);
const approvalSignal = (drug) => ["APPROVAL", "REPORTED_APPROVAL", "WITHDRAWN", "SUSPENDED"].includes(drug.clinicalStage);
const knownApproval = (drug) => drug.approval?.status === "approved" ||
  drug.regulatoryApprovals?.length || reviewedFdaRecord(drug) || reviewedMechanism(drug.name)?.chinaApproved;

export function investigationalGroups(catalog, groups) {
  const stableId = chemblIdentity;
  const records = catalog.drugs;
  const clusters = [];
  for (const drug of records) {
    const id = stableId(drug);
    const cluster = clusters.find(({ members: [first] }) =>
      first.id === drug.id || (id && id === stableId(first)) ||
      (!id && !stableId(first) && first.verification === "reviewed" && drug.verification === "reviewed" &&
        ingredientKey(first.name) === ingredientKey(drug.name) &&
        first.molecularFormat === drug.molecularFormat &&
        JSON.stringify([...first.targetIds].sort()) === JSON.stringify([...drug.targetIds].sort())));
    if (cluster) cluster.members.push(drug);
    else clusters.push({ members: [drug] });
  }
  const owners = new Map();
  for (const cluster of clusters) {
    for (const name of cluster.members.flatMap(namesFor)) {
      const key = ingredientKey(name);
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key).add(cluster);
    }
  }
  const prepared = new Map(records.map((drug) => {
    const reviewed = owners.get(ingredientKey(drug.name))?.size === 1 ? reviewedInvestigationalSource(drug) : null;
    const evidence = reviewed?.targetAssertion && drug.targetEvidence ? {
      ...drug, targetEvidence: [...drug.targetEvidence, {
        role: "direct", sourceType: "developer", text: reviewed.targetAssertion,
        allowBindingAssertion: true, originalUrl: reviewed.official[0].url,
      }],
    } : drug;
    return [drug, prepareTargetMatch(evidence, catalog.targets)];
  }));
  return groups.map(({ key, targetIds }) => ({
    key, targetIds,
    counts: { catalog: records.length, identities: clusters.length,
      matched: clusters.filter(({ members }) => members.some((drug) =>
        classifyTargetMatch(prepared.get(drug), targetIds)?.supported.length)).length,
      excluded: clusters.filter(({ members }) => members.some(knownApproval) && members.some((drug) =>
        classifyTargetMatch(prepared.get(drug), targetIds)?.supported.length)).length },
    candidates: clusters.flatMap((cluster) => {
      const { members } = cluster;
      if (members.some(knownApproval)) return [];
      const related = members.flatMap((drug) => {
        const match = classifyTargetMatch(prepared.get(drug), targetIds);
        return match ? [{ drug, match, directTargets: [...prepared.get(drug).direct] }] : [];
      }).sort((a, b) => Number(b.match.state === "verified") - Number(a.match.state === "verified") ||
        b.match.supported.length - a.match.supported.length || a.drug.id.localeCompare(b.drug.id));
      const best = related[0];
      if (!best) return [];
      const drug = {
        ...best.drug,
        brand: owners.get(ingredientKey(best.drug.brand || ""))?.size === 1 ? best.drug.brand : "",
        identityConflict: owners.get(ingredientKey(best.drug.name))?.size > 1,
        mechanisms: [...new Set(members.flatMap(({ mechanisms }) => mechanisms || []).filter((value) => value?.trim()))],
        sourceIds: [...new Set(members.flatMap((row) => [row.sourceId, ...(row.sourceIds || [])]).filter(Boolean))],
      };
      return [{ ...best, drug, approvalSignal: members.some(approvalSignal),
        aliases: [...new Set([...members.flatMap(namesFor)])].filter((name) => exactDrugName(name) !== exactDrugName(best.drug.name) && owners.get(ingredientKey(name))?.size === 1) }];
    }).sort((a, b) => {
      const priority = ({ match, approvalSignal }) =>
        Number(approvalSignal) * 4 + (match.state === "verified" ? 0 :
          targetIds.length === 1 && match.reason === "additional_direct_targets" ? 1 :
            match.supported.length === targetIds.length ? 2 : 3);
      return priority(a) - priority(b) || a.drug.name.localeCompare(b.drug.name);
    }),
  }));
}

export function supplementInvestigationalMatch(item, evidence, targetIds) {
  if (!evidence?.length) return item;
  const candidates = evidence.map(({ value, complete }) => ({ ids: new Set(value), complete }));
  const distinct = new Set(candidates.map(({ ids }) => JSON.stringify([...ids].sort())));
  if (distinct.size > 1) return { ...item, match: { ...item.match, state: "conflict", reason: "inconsistent_direct_evidence" } };
  const [{ ids, complete }] = candidates;
  const hasCd3Scope = ids.has("CD3") || ids.has("CD3E");
  const prior = item.directTargets.filter((id) => !hasCd3Scope || !["CD3", "CD3E", "CD3D", "CD3G", "CD247"].includes(id) ||
    item.drug.targetEvidence?.some((entry) => entry.role === "direct" &&
      (entry.targetIds?.includes(id) || (entry.rawTargets?.length === 1 && entry.rawTargets[0].approvedSymbol === id))));
  const directTargets = [...new Set([...ids, ...prior])];
  if (complete && prior.some((id) => !ids.has(id))) {
    return { ...item, match: { ...item.match, state: "conflict", reason: "inconsistent_direct_evidence" } };
  }
  const scope = new Set(directTargets);
  if (scope.has("CD3E") && targetIds.includes("CD3")) {
    scope.delete("CD3E");
    scope.add("CD3");
  }
  const match = classifyTargetMatch({
    direct: scope, complete: complete ? [scope] : [], related: new Set(item.match.supported),
    conflicts: new Set(), incompatible: item.match.state === "conflict", evidence: [],
  }, targetIds);
  return { ...item, directTargets, match: match || item.match };
}

// Use verified scope for combinations. Single-target groups also display
// direct evidence with no recorded extra targets, while keeping scope unverified.
export function investigationalView(groups, selected, profiles = {}) {
  const classify = ({ targetIds, candidates }) => candidates.flatMap((item) => {
    if (profiles[item.drug.id]?.approval === "approved") return [];
    return [supplementInvestigationalMatch(item, profiles[item.drug.id]?.supplement?.evidence.targets, targetIds)];
  });
  const exact = groups.map((group) => ({
    ...group, candidates: classify(group).filter(({ match }) => match.state === "verified" ||
      (group.targetIds.length === 1 && match.reason === "scope_not_established" &&
        match.supported.length === 1 && !match.extra.length)),
  }));
  const full = groups[0];
  if (!full) return { groups: [], active: undefined, queue: [] };
  const placed = new Set(exact.flatMap(({ candidates }) => candidates.map(({ drug }) => drug.id)));
  const navigation = [...exact, { ...full, key: full.key + candidateView, supplemental: true,
    candidates: classify(full).filter(({ drug }) => !placed.has(drug.id)) }];
  const active = navigation.find(({ key }) => key === selected) || navigation[0];
  const queue = groups.find(({ key }) => key === selected)?.candidates || full.candidates;
  return { groups: navigation, active, queue };
}

async function fdaApproval(drug, { signal, fetcher }) {
  const names = namesFor(drug);
  const keys = new Set(names.map(ingredientKey));
  const terms = [...new Set([...names, ...keys])].flatMap((name) => [
    `products.active_ingredients.name:"${name}"`, `products.brand_name:"${name}"`,
  ]);
  const search = `(${terms.join(" OR ")}) AND application_number:(NDA* OR BLA* OR ANDA*)`;
  const response = await fetcher("https://api.fda.gov/drug/drugsfda.json?" +
    new URLSearchParams({ search, limit: "30" }), { signal, redirect: "manual" });
  if (response.status === 404) return { found: false, complete: true };
  if (!response.ok) throw new Error("upstream_" + response.status);
  const payload = await response.json();
  if (!Array.isArray(payload.results) || !Number.isInteger(payload.meta?.results?.total))
    throw new Error("unexpected_fda_response");
  const found = payload.results.filter((application) =>
    application.products?.some((product) => keys.has(ingredientKey(product.brand_name || "")) ||
      product.active_ingredients?.some(({ name }) => keys.has(ingredientKey(name || "")))) &&
    application.submissions?.some((row) => row.submission_type === "ORIG" && row.submission_status === "AP"));
  return { found: found.length > 0, evidence: found.filter(({ application_number }) => /^(?:NDA|BLA|ANDA)\d{6}$/.test(application_number)).map(({ application_number }) => ({
    source: "Drugs@FDA", id: application_number,
    url: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=" + application_number.slice(-6),
  })), complete: payload.meta.results.total <= payload.results.length };
}

export async function fetchInvestigationalProfile(drug, options) {
  const names = namesFor(drug);
  if (drug.identityConflict) return { approval: "unknown", issues: { identity: "ambiguous" } };
  const reviewed = reviewedInvestigationalSource(drug);
  const official = reviewed?.developer;
  const [fda, ema, clinical, supplement, developer] = await Promise.allSettled([
    fdaApproval(drug, options),
    fetchEmaApprovals(names, options),
    fetchDevelopmentProfile(drug, { ...options, includeStudyRecords: true }),
    drug.supplement ? fetchDrugSupplement(drug, options) : null,
    drug.developerLookup && !official ? fetchDeveloperEvidence(drug, options) : null,
  ]);
  const approved = fda.value?.found || Object.keys(ema.value || {}).length > 0;
  const checked = fda.value?.complete && ema.status === "fulfilled";
  return {
    approval: approved ? "approved" : checked ? "checked" : "unknown",
    issues: Object.fromEntries([["FDA", fda], ["EMA", ema], ["ClinicalTrials.gov", clinical], ["Drug identity and targets", supplement], ["Europe PMC developer evidence", developer]]
      .filter(([, result]) => result.status === "rejected")
      .map(([source, result]) => [source, providerIssue(result.reason).state])
      .concat(Object.entries(developer.value?.issues || {}))
      .concat(clinical.value?.pageIssue ? [["ClinicalTrials.gov", clinical.value.pageIssue]] : [])),
    ...(clinical.value || {}),
    ...(supplement?.value ? { supplement: supplement.value } : {}),
    ...(official ? { developerEvidence: [{ ...official, source: "Company pipeline", role: "reported_current_developer" }],
      ...(reviewed.filing ? { filing: reviewed.filing } : {}) } : {}),
    ...(developer.value ? { developerEvidence: developer.value.evidence, developerSearchTruncated: developer.value.truncated } : {}),
    approvalEvidence: [...(fda.value?.evidence || []), ...Object.values(ema.value || {})],
    lastVerifiedAt: new Date().toISOString(),
  };
}

const phaseOrder = ["PHASE_3", "PHASE_2_3", "PHASE_2", "PHASE_1_2", "PHASE_1", "EARLY_PHASE_1"];
const statusRank = (status) => ["RECRUITING", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING",
  "ENROLLING_BY_INVITATION"].includes(status) ? 0 : status === "COMPLETED" ? 1 : 2;
const phaseRank = (phase) => phaseOrder.includes(phase) ? phaseOrder.indexOf(phase) : phaseOrder.length;
export function activeSingleDrugPhase(studies = []) {
  return [...studies].filter((study) => statusRank(study.status) === 0 && !study.combined && study.phase)
    .sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase))[0]?.phase;
}

export function rankClinicalStudies(studies = []) {
  return [...studies].sort((a, b) => statusRank(a.status) - statusRank(b.status) ||
    phaseRank(a.phase) - phaseRank(b.phase) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
export function rankInvestigational(a, b) {
  const representative = ({ studies }) => studies.find((study) => !study.combined) || studies[0];
  const left = representative(a);
  const right = representative(b);
  return statusRank(left?.status) - statusRank(right?.status) ||
    phaseRank(left?.phase) - phaseRank(right?.phase) ||
    (right?.updatedAt || "").localeCompare(left?.updatedAt || "") ||
    a.drug.name.localeCompare(b.drug.name);
}

export async function fetchTrialCandidates(targets, options) {
  const result = await discoverTrialInterventions(targets.map((id) => ({
    id, inputName: id, synonyms: [], resolutionStatus: "resolved",
  })), options);
  return {
    ...result,
    rows: result.rows.slice(0, 30).map(({ name, aliases, studies }) => ({
      name, aliases, studies: studies.map(({ id, url, status }) => ({ id, url, status })),
    })),
    truncated: result.truncated || result.rows.length > 30,
  };
}
