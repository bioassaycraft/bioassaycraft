import { providerIssue } from "./provider-status.js";
import { ingredientKey } from "./display.js";

const fields = [
  "NCTId",
  "BriefTitle",
  "Condition",
  "Phase",
  "OverallStatus",
  "LeadSponsorName",
  "LocationCountry",
  "StudyType",
  "InterventionName",
  "InterventionOtherName",
];

export async function fetchDrugTrials(drug, { signal, fetcher = fetch } = {}) {
  const name = ingredientKey(drug.name);
  const terms = [...new Set([name, ...(drug.aliases || []).map(ingredientKey)])]
    .filter((term) => /^[\p{L}\p{N} .()/-]{2,80}$/u.test(term)).slice(0, 6);
  const query = terms.length > 1 ? terms.map((term) => `"${term}"`).join(" OR ") : name;
  const ongoing = new Set(["RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"]);
  const params = new URLSearchParams({
    "query.intr": query,
    pageSize: "5",
    fields: fields.join(","),
    countTotal: "true",
  });
  const response = await fetcher(`https://clinicaltrials.gov/api/v2/studies?${params}`, { signal });
  if (!response.ok) throw new Error("trials_unavailable");
  const data = await response.json();
  if (!Array.isArray(data.studies)) throw new Error("trials_unavailable");
  return {
    count: data.totalCount ?? data.studies.length,
    retrievedAt: new Date().toISOString(),
    url: `https://clinicaltrials.gov/search?intr=${encodeURIComponent(query)}`,
    records: data.studies.flatMap(({ protocolSection: study }) => {
      const id = study?.identificationModule?.nctId;
      if (!/^NCT\d{8}$/.test(id || "")) return [];
      const interventionNames = (study.armsInterventionsModule?.interventions || [])
        .flatMap((intervention) => [intervention.name, ...(intervention.otherNames || [])])
        .filter(Boolean);
      if (!interventionNames.some((value) => terms.includes(ingredientKey(value)))) return [];
      const status = study.statusModule?.overallStatus;
      return [
        {
          id,
          interventionNames,
          ongoingInterventional: study.designModule?.studyType === "INTERVENTIONAL" && ongoing.has(status),
          title: study.identificationModule.briefTitle || id,
          conditions: study.conditionsModule?.conditions || [],
          phases: study.designModule?.phases || [],
          status,
          sponsor: study.sponsorCollaboratorsModule?.leadSponsor?.name,
          countries: [
            ...new Set(
              (study.contactsLocationsModule?.locations || [])
                .map((location) => location.country)
                .filter(Boolean),
            ),
          ],
        },
      ];
    }),
  };
}

export async function discoverTrialInterventions(identities, { signal, fetcher = fetch, drugNames } = {}) {
  const terms = [...new Set(identities.filter((target) => target.resolutionStatus === "resolved")
    .flatMap((target) => [target.geneSymbol || target.id, target.inputName, ...target.synonyms.slice(0, 2)])
    .filter((term) => typeof term === "string" && /^[\p{L}\p{N} .()/-]{3,70}$/u.test(term)))].slice(0, 16);
  const queryTerms = drugNames
    ? [...new Set(drugNames.filter((term) => /^[\p{L}\p{N} .()/-]{3,70}$/u.test(term)))].slice(0, 12)
    : terms;
  if (!queryTerms.length) return { rows: [], state: "not_queried" };
  const query = queryTerms.map((term) => `"${term}"`).join(" OR ");
  const params = new URLSearchParams({
    [drugNames ? "query.intr" : "query.term"]: query, pageSize: "30", fields: [...fields, "InterventionType", "InterventionDescription"].join(","), countTotal: "true",
  });
  const response = await fetcher(`https://clinicaltrials.gov/api/v2/studies?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]), redirect: "manual",
  });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const data = await response.json();
  if (!Array.isArray(data.studies)) throw new Error("unexpected_trials_response");
  const records = new Map();
  for (const { protocolSection: study } of data.studies) {
    const id = study?.identificationModule?.nctId;
    if (!/^NCT\d{8}$/.test(id || "") || study.designModule?.studyType !== "INTERVENTIONAL") continue;
    for (const entry of study.armsInterventionsModule?.interventions || []) {
      if (!["DRUG", "BIOLOGICAL"].includes(entry.type) || !entry.name ||
        /\b(placebo|saline|standard of care)\b/i.test(entry.name)) continue;
      const key = entry.name.trim().toLowerCase();
      const record = records.get(key) || { name: entry.name, aliases: [], studies: [] };
      record.aliases = [...new Set([...record.aliases, ...(entry.otherNames || [])])];
      if (!record.studies.some((row) => row.id === id)) record.studies.push({
        id, url: "https://clinicaltrials.gov/study/" + id,
        phases: study.designModule?.phases || [],
        status: study.statusModule?.overallStatus,
        ...(typeof entry.description === "string" ? { interventionDescription: entry.description.slice(0, 2500) } : {}),
      });
      records.set(key, record);
    }
  }
  return {
    rows: [...records.values()].sort((a, b) => a.name.localeCompare(b.name, "en")),
    state: records.size ? "success_with_data" : "success_empty",
    total: data.totalCount, returned: data.studies.length,
    truncated: Boolean(data.nextPageToken || data.totalCount > data.studies.length),
  };
}

export function reconcileTrialInterventions(drugs, interventions) {
  const key = (name) => name.trim().toLowerCase().replace(/\s+/g, " ");
  const identities = new Map();
  for (const drug of drugs) {
    for (const name of [drug.name, drug.brand, ...(drug.aliases || [])].filter(Boolean)) {
      const ids = identities.get(key(name)) || new Set();
      ids.add(drug);
      identities.set(key(name), ids);
    }
  }
  return interventions.filter((row) => {
    const matches = new Set([row.name, ...row.aliases].flatMap((name) => [...(identities.get(key(name)) || [])]));
    if (matches.size !== 1) return true;
    const [drug] = matches;
    drug.clinicalEvidence = [...new Map([...(drug.clinicalEvidence || []), ...row.studies]
      .map((study) => [study.id, study])).values()];
    return false;
  });
}

const phaseStages = new Map([
  ["EARLY_PHASE1", "EARLY_PHASE_1"], ["PHASE1", "PHASE_1"], ["PHASE1/PHASE2", "PHASE_1_2"],
  ["PHASE2", "PHASE_2"], ["PHASE2/PHASE3", "PHASE_2_3"], ["PHASE3", "PHASE_3"],
]);
const phaseOrder = [...phaseStages.keys()];
function studyPhase(phases = []) {
  return phaseStages.get(phases.filter((phase) => phase !== "NA").sort().join("/")) || null;
}
const indicationAliases = new Map([
  ["es sclc", "extensive stage small cell lung cancer"],
  ["extensive stage small cell lung carcinoma", "extensive stage small cell lung cancer"],
  ["sclc", "small cell lung cancer"],
  ["small cell lung carcinoma", "small cell lung cancer"],
  ["nsclc", "non small cell lung cancer"],
  ["non small cell lung carcinoma", "non small cell lung cancer"],
  ["dlbcl", "diffuse large b cell lymphoma"],
]);
function indicationKey(label) {
  const value = label.toLowerCase().replace(/\s*\([a-z -]{2,10}\)\s*$/i, "")
    .replace(/tumour/g, "tumor").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return indicationAliases.get(value) || value;
}
const broadCondition = /^(cancer|neoplasms?|solid tumou?rs?|advanced solid tumou?rs?|malignanc(y|ies)|healthy (volunteers|subjects))$/i;

export async function fetchDevelopmentProfile(drug, { signal, fetcher = fetch, includeStudyRecords = false } = {}) {
  const terms = [...new Set([drug.name, drug.brand, ...(drug.aliases || [])]
    .filter(Boolean).map(ingredientKey))].slice(0, 6);
  const query = terms.map((term) => `"${term}"`).join(" OR ");
  const params = new URLSearchParams({
    "query.intr": query, pageSize: "25",
    fields: "NCTId,Condition,Phase,LeadSponsorName,StudyType,InterventionName,InterventionOtherName,InterventionType",
  });
  if (includeStudyRecords) params.set("fields", params.get("fields") +
    ",BriefTitle,OverallStatus,LastUpdatePostDate,StartDate,CompletionDate,CollaboratorName,BriefSummary");
  const studies = new Map();
  let next;
  let pageIssue;
  const seenTokens = new Set();
  for (let page = 0; page < 3; page++) {
    if (next) {
      seenTokens.add(next);
      params.set("pageToken", next);
    }
    let payload;
    try {
      const response = await fetcher(`https://clinicaltrials.gov/api/v2/studies?${params}`, { signal, redirect: "manual" });
      if (!response.ok) throw new Error("upstream_" + response.status);
      payload = await response.json();
      if (!Array.isArray(payload.studies)) throw new Error("unexpected_trials_response");
    } catch (error) {
      if (!includeStudyRecords || page === 0) throw error;
      pageIssue = providerIssue(error).state;
      break;
    }
    for (const { protocolSection: study } of payload.studies) {
      const id = study?.identificationModule?.nctId;
      if (!/^NCT\d{8}$/.test(id || "") || study.designModule?.studyType !== "INTERVENTIONAL") continue;
      const interventions = (study.armsInterventionsModule?.interventions || [])
        .filter((entry) => ["DRUG", "BIOLOGICAL"].includes(entry.type) && !/^placebo$/i.test(entry.name));
      const matches = interventions.filter((entry) => [entry.name, ...(entry.otherNames || [])]
        .some((name) => typeof name === "string" && terms.includes(ingredientKey(name))));
      if (!matches.length) continue;
      const attributable = includeStudyRecords
        ? matches.length === interventions.length && new Set(matches.map(({ name }) => ingredientKey(name))).size === 1 &&
          !matches.some(({ name }) => /\s(?:plus|with|and)\s|\+|\//i.test(name))
        : matches.length === interventions.length;
      studies.set(id, { study, attributable, matches });
    }
    next = payload.nextPageToken;
    if (!next || seenTokens.has(next)) break;
  }
  const conditions = new Map();
  const sponsors = new Map();
  let highest = -1;
  const count = (map, values, keyFor) => {
    const seen = new Set();
    for (const raw of values) {
      const label = raw.trim().replace(/\s+/g, " ");
      const key = keyFor(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      map.set(key, { label: map.get(key)?.label || label, count: (map.get(key)?.count || 0) + 1 });
    }
  };
  for (const { study, attributable } of studies.values()) {
    const phases = (study.designModule.phases || []).filter((phase) => phase !== "NA");
    const phase = phases.length === 1 ? phases[0] : [...phases].sort().join("/");
    if (attributable) highest = Math.max(highest, phaseOrder.indexOf(phase));
    const sponsor = study.sponsorCollaboratorsModule?.leadSponsor?.name;
    if (sponsor) count(sponsors, [sponsor], (value) => value.toLowerCase());
    if (attributable) count(conditions, (study.conditionsModule?.conditions || [])
      .filter((condition) => !broadCondition.test(condition.trim())), indicationKey);
  }
  const ranked = (map) => [...map.values()].sort((a, b) =>
    b.count - a.count || a.label.localeCompare(b.label, "en")).map(({ label }) => label);
  return {
    ...(includeStudyRecords ? { studies: [...studies].map(([id, { study, attributable, matches }]) => ({
      id,
      title: study.identificationModule.briefTitle,
      interventionNames: [...new Set(matches.flatMap(({ name, otherNames }) => [name, ...(otherNames || [])]))],
      startedAt: study.statusModule?.startDateStruct?.date,
      completedAt: study.statusModule?.completionDateStruct?.date,
      collaborators: study.sponsorCollaboratorsModule?.collaborators?.map(({ name }) => name) || [],
      summary: study.descriptionModule?.briefSummary?.slice(0, 700),
      phase: studyPhase(study.designModule.phases),
      status: study.statusModule?.overallStatus || "UNKNOWN",
      updatedAt: study.statusModule?.lastUpdatePostDateStruct?.date,
      conditions: study.conditionsModule?.conditions || [],
      sponsor: study.sponsorCollaboratorsModule?.leadSponsor?.name,
      combined: !attributable,
      url: "https://clinicaltrials.gov/study/" + id,
    })) } : {}),
    highestTrialPhase: phaseStages.get(phaseOrder[highest]) || null,
    sponsors: ranked(sponsors).slice(0, 3),
    researchIndications: ranked(conditions).slice(0, 3),
    recordIds: [...studies.keys()],
    truncated: Boolean(next),
    ...(pageIssue ? { pageIssue } : {}),
    retrievedAt: new Date().toISOString(),
    url: `https://clinicaltrials.gov/search?intr=${encodeURIComponent(query)}`,
  };
}
