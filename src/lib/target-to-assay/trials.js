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
    [drugNames ? "query.intr" : "query.term"]: query, pageSize: "30", fields: [...fields, "InterventionType"].join(","), countTotal: "true",
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
