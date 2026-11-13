export async function fetchChemblIndications(ids, { signal, fetcher = fetch, withStatus = false } = {}) {
  const compounds = [...new Set(ids.filter((id) => /^CHEMBL\d+$/.test(id)))].slice(0, 12);
  if (!compounds.length) return [];
  // ChEMBL's list filter expects literal commas between validated IDs.
  const url = `https://www.ebi.ac.uk/chembl/api/data/drug_indication.json?molecule_chembl_id__in=${compounds.join(",")}&limit=24`;
  const response = await fetcher(url, { signal, redirect: "manual" });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const { drug_indications: rows, page_meta: page } = await response.json();
  if (!Array.isArray(rows)) throw new Error("chembl_unavailable");
  const sorted = rows
    .filter(
      (row) => compounds.includes(row.molecule_chembl_id) && (row.efo_term || row.mesh_heading),
    )
    .map((row) => ({
      id: row.molecule_chembl_id,
      recordId: row.drugind_id ?? row.efo_id ?? row.mesh_id ?? null,
      indicationKey: row.efo_id || row.mesh_id,
      name: row.efo_term || row.mesh_heading,
      phase: row.max_phase_for_ind == null ? null : Number(row.max_phase_for_ind),
      url: `https://www.ebi.ac.uk/chembl/explore/compound/${row.molecule_chembl_id}`,
    }))
    .sort((a, b) => (b.phase ?? -1) - (a.phase ?? -1) || a.name.localeCompare(b.name, "en"));
  const records = [];
  for (const row of sorted) {
    if (!records.some((prior) => prior.id === row.id && ((row.indicationKey &&
      prior.indicationKey === row.indicationKey) || prior.name.toLowerCase() === row.name.toLowerCase())))
      records.push(row);
  }
  return withStatus ? { rows: records, truncated: Boolean(page?.next || page?.total_count > rows.length),
    retrievedAt: new Date().toISOString() } : records;
}
