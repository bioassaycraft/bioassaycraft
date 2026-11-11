export async function fetchChemblIndications(ids, { signal, fetcher = fetch } = {}) {
  const compounds = [...new Set(ids.filter((id) => /^CHEMBL\d+$/.test(id)))].slice(0, 12);
  if (!compounds.length) return [];
  // ChEMBL's list filter expects literal commas between validated IDs.
  const url = `https://www.ebi.ac.uk/chembl/api/data/drug_indication.json?molecule_chembl_id__in=${compounds.join(",")}&limit=24`;
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new Error("chembl_unavailable");
  const { drug_indications: rows } = await response.json();
  if (!Array.isArray(rows)) throw new Error("chembl_unavailable");
  return rows
    .filter(
      (row) => compounds.includes(row.molecule_chembl_id) && (row.efo_term || row.mesh_heading),
    )
    .map((row) => ({
      id: row.molecule_chembl_id,
      name: row.efo_term || row.mesh_heading,
      phase: Number(row.max_phase_for_ind),
      url: `https://www.ebi.ac.uk/chembl/explore/compound/${row.molecule_chembl_id}`,
    }))
    .sort((a, b) => b.phase - a.phase);
}
