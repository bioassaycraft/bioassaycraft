import { evidence, getJson } from "./target-biology.js";
import { SearchError } from "./search.js";

const geneKey = (value) => value.trim().normalize("NFKC").toLowerCase();

export async function resolveHgnc(name, fetcher, signal, retrievedAt) {
  const root = "https://rest.genenames.org/";
  const request = (path) => getJson(root + path, fetcher, signal);
  const explicitId = /^HGNC:\d+$/i.test(name);
  const directField = explicitId
    ? "hgnc_id"
    : /^ENSG\d+$/i.test(name)
      ? "ensembl_gene_id"
      : /^[A-Z0-9][A-Z0-9._-]*$/i.test(name)
        ? "symbol"
        : null;
  const direct = directField
    ? await request("fetch/" + directField + "/" + encodeURIComponent(name.toUpperCase()))
    : null;
  const directHit = direct?.response?.docs?.length || explicitId;
  const payload = directHit
    ? direct
    : await request("search/" + encodeURIComponent('"' + name + '"'));
  if (!Array.isArray(payload.response?.docs)) throw new Error("unexpected_hgnc_response");
  const hits = payload.response.docs;
  if (!explicitId && payload.response.numFound > 6) return null;
  const records = directHit
    ? hits
    : (
        await Promise.allSettled(
          hits
            .slice(0, 6)
            .filter(({ symbol }) => /^[A-Z0-9][A-Z0-9._-]*$/i.test(symbol))
            .map(({ symbol }) => request("fetch/symbol/" + encodeURIComponent(symbol))),
        )
      ).flatMap((result) =>
        result.status === "fulfilled" ? result.value.response?.docs || [] : [],
      );
  const exact = records.filter(
    (row) =>
      row.status === "Approved" &&
      [
        row.hgnc_id,
        row.symbol,
        row.name,
        row.ensembl_gene_id,
        ...(row.alias_symbol || []),
        ...(row.prev_symbol || []),
        ...(row.alias_name || []),
        ...(row.prev_name || []),
        ...(row.uniprot_ids || []),
      ].some((value) => value && geneKey(value) === geneKey(name)),
  );
  if (exact.length > 1)
    throw new SearchError("choose_target", {
      input: name,
      candidates: exact.map(({ hgnc_id, symbol, name: description }) => ({
        id: hgnc_id,
        name: symbol,
        description,
      })),
    });
  const [row] = exact;
  if (!row) return null;
  return {
    symbol: row.symbol,
    name: row.name,
    hgncId: row.hgnc_id,
    ensemblId: row.ensembl_gene_id,
    synonyms: [...(row.alias_symbol || []), ...(row.prev_symbol || [])],
    source: evidence(
      "HGNC",
      row.hgnc_id,
      "https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/" + row.hgnc_id,
      retrievedAt,
    ),
  };
}

export async function fetchExpression(identity, fetcher, signal, retrievedAt) {
  const id = identity.primaryEnsemblId;
  if (!/^ENSG\d+$/.test(id || "")) return [];
  const url = "https://www.proteinatlas.org/" + id;
  const record = await getJson(url + ".json", fetcher, signal, { emptyOn404: true });
  if (Array.isArray(record) && !record.length) return [];
  if (record?.Ensembl !== id) throw new Error("unexpected_hpa_response");
  const fields = [
    ["single_cell_rna", "RNA single cell type specific nCPM", "nCPM", "/single+cell"],
    ["immune_rna", "RNA blood cell specific nTPM", "nTPM", "/immune+cell"],
    ["tissue_rna", "RNA tissue specific nTPM", "nTPM", "/tissue"],
    ["cancer_bulk_rna", "RNA cancer specific pTPM", "pTPM", "/cancer"],
    ["tissue_protein", "Protein tissue specific Intensity", "", "/tissue"],
  ];
  return fields.flatMap(([kind, field, unit, path]) => {
    const values = record[field];
    if (!values || typeof values !== "object" || Array.isArray(values)) return [];
    const entries = Object.entries(values).filter(
      ([name, value]) => name && (typeof value === "number" || typeof value === "string"),
    );
    if (!entries.length) return [];
    entries.sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0) || a[0].localeCompare(b[0]));
    return [
      {
        kind,
        unit,
        values: entries.slice(0, 3).map(([name, value]) => ({ name, value })),
        source: evidence("Human Protein Atlas", id + " · " + field, url + path, retrievedAt, {
          license: { name: "CC BY 4.0", url: "https://www.proteinatlas.org/about/licence" },
          citationUrl: "https://www.proteinatlas.org/about/publications",
        }),
      },
    ];
  });
}

export async function fetchDiseaseAssociations(identity, fetcher, signal, retrievedAt) {
  const id = identity.primaryEnsemblId;
  if (!/^ENSG\d+$/.test(id || "")) return [];
  const query = `query TargetAssociations($id: String!) {
    target(ensemblId: $id) {
      associatedDiseases(enableIndirect: false, page: { index: 0, size: 3 }) {
        rows { score disease { id name } }
      }
    }
  }`;
  const response = await fetcher("https://api.platform.opentargets.org/api/v4/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id } }),
    redirect: "manual",
    signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
  });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error("unexpected_associations_response");
  if (payload.data?.target === null) return [];
  const rows = payload.data?.target?.associatedDiseases?.rows;
  if (!Array.isArray(rows)) throw new Error("unexpected_associations_response");
  return rows
    .filter(
      ({ disease, score }) =>
        disease?.name && /^[A-Z][A-Z0-9]+_\d+$/.test(disease.id) && Number.isFinite(score),
    )
    .map(({ disease, score }) => ({
      id: disease.id,
      name: disease.name,
      score,
      kind: "database_association",
      source: evidence(
        "Open Targets",
        disease.id,
        `https://platform.opentargets.org/target/${id}/associations`,
        retrievedAt,
      ),
    }));
}

// A regulatory record can document disease expression independently of atlas RNA data.
export function reviewedDiseaseExpression(identity) {
  if (!identity.uniprotIds.includes("P11836")) return [];
  return [
    {
      kind: "regulatory_disease_expression",
      description: {
        en: "The MabThera product information documents surface CD20 on pre-B and mature B cells and in B-cell non-Hodgkin lymphomas. Expression should be assessed in the relevant subtype or specimen.",
        zh: "MabThera 产品资料记载，前 B 细胞和成熟 B 细胞表面可见 CD20，B 细胞非霍奇金淋巴瘤中也有表达记录。具体表达需按亚型或样本核实。",
      },
      source: evidence(
        "EMA",
        "MabThera · SmPC §5.1",
        "https://www.ema.europa.eu/en/documents/product-information/mabthera-epar-product-information_en.pdf#page=31",
        null,
        { sourceType: "regulatory_record" },
      ),
    },
  ];
}
