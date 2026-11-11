const fields = [
  "NCTId",
  "BriefTitle",
  "Condition",
  "Phase",
  "OverallStatus",
  "LeadSponsorName",
  "LocationCountry",
];

export async function fetchDrugTrials(drug, { signal, fetcher = fetch } = {}) {
  const name = drug.name.replace(/-(?:axgb|gxbm)$/i, "").trim();
  const params = new URLSearchParams({
    "query.intr": name,
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
    url: `https://clinicaltrials.gov/search?intr=${encodeURIComponent(name)}`,
    records: data.studies.flatMap(({ protocolSection: study }) => {
      const id = study?.identificationModule?.nctId;
      if (!/^NCT\d{8}$/.test(id || "")) return [];
      return [
        {
          id,
          title: study.identificationModule.briefTitle || id,
          conditions: study.conditionsModule?.conditions || [],
          phases: study.designModule?.phases || [],
          status: study.statusModule?.overallStatus,
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
