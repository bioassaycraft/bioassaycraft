import { fetchEmaApprovals, reviewedFdaRecord } from "./approval-records.js";
import { investigationalSources } from "./investigational-sources.js";
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
  const identity = (drug) => [drug.id, drug.externalIds?.chembl, ...namesFor(drug).map(ingredientKey)].filter(Boolean);
  const records = catalog.drugs.map((drug) => ({ drug, keys: identity(drug) }));
  const clusters = [];
  for (const record of records) {
    const related = clusters.filter(({ keys }) => record.keys.some((key) => keys.has(key)));
    const keys = new Set([...record.keys, ...related.flatMap((cluster) => [...cluster.keys])]);
    const members = [record.drug, ...related.flatMap((cluster) => cluster.members)];
    for (const cluster of related) clusters.splice(clusters.indexOf(cluster), 1);
    clusters.push({ keys, members });
  }
  const prepared = new Map(records.map(({ drug, keys }) => {
    const reviewed = investigationalSources.find(({ names }) => names.some((name) => keys.includes(ingredientKey(name))));
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
    candidates: clusters.flatMap(({ members }) => {
      if (members.some(knownApproval)) return [];
      const related = members.flatMap((drug) => {
        const match = classifyTargetMatch(prepared.get(drug), targetIds);
        return match ? [{ drug, match, directTargets: [...prepared.get(drug).direct] }] : [];
      }).sort((a, b) => Number(b.match.state === "verified") - Number(a.match.state === "verified") ||
        b.match.supported.length - a.match.supported.length || a.drug.id.localeCompare(b.drug.id));
      const best = related[0];
      if (!best) return [];
      return [{ ...best, approvalSignal: members.some(approvalSignal),
        aliases: [...new Set([...members.flatMap(namesFor)])].filter((name) => name.toLowerCase() !== best.drug.name.toLowerCase()) }];
    }).sort((a, b) => {
      const priority = ({ match, approvalSignal }) =>
        Number(approvalSignal) * 4 + (match.state === "verified" ? 0 :
          targetIds.length === 1 && match.reason === "additional_direct_targets" ? 1 :
            match.supported.length === targetIds.length ? 2 : 3);
      return priority(a) - priority(b) || a.drug.name.localeCompare(b.drug.name);
    }),
  }));
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
  const [fda, ema, clinical] = await Promise.allSettled([
    fdaApproval(drug, options),
    fetchEmaApprovals(names, options),
    fetchDevelopmentProfile(drug, { ...options, includeStudyRecords: true }),
  ]);
  const approved = fda.value?.found || Object.keys(ema.value || {}).length > 0;
  const checked = fda.value?.complete && ema.status === "fulfilled";
  return {
    approval: approved ? "approved" : checked ? "checked" : "unknown",
    issues: Object.fromEntries([["FDA", fda], ["EMA", ema], ["ClinicalTrials.gov", clinical]]
      .filter(([, result]) => result.status === "rejected")
      .map(([source, result]) => [source, providerIssue(result.reason).state])),
    ...(clinical.value || {}),
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
