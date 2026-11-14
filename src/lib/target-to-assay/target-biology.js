import { SearchError } from "./search.js";

const aliases = new Map([
  ["cd20", "MS4A1"],
  ["bcma", "TNFRSF17"],
  ["tl1a", "TNFSF15"],
  ["pd-1", "PDCD1"],
  ["pd1", "PDCD1"],
  ["pd-l1", "CD274"],
  ["cd123", "IL3RA"],
  ["4-1bb", "TNFRSF9"],
]);
const key = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
const list = (values) => [...new Set(values.filter(Boolean))];
const proteinNames = (entry) => {
  const description = entry.proteinDescription;
  return [description?.recommendedName, ...(description?.alternativeNames || [])]
    .filter(Boolean)
    .flatMap((name) => [
      name.fullName?.value,
      ...(name.shortNames || []).map((short) => short.value),
    ]);
};
const names = (entry) =>
  list([
    ...proteinNames(entry),
    ...entry.genes.flatMap((gene) => [
      gene.geneName?.value,
      ...(gene.synonyms || []).map((name) => name.value),
    ]),
  ]);

export const canonicalAlias = (input) => aliases.get(key(input)) || input;

export function evidence(sourceName, recordId, originalUrl, retrievedAt, extra = {}) {
  return {
    sourceName,
    recordId,
    originalUrl,
    title: sourceName + " · " + recordId,
    sourceType: "curated_database",
    verificationStatus: "source_record",
    retrievedAt,
    ...extra,
  };
}

export async function getJson(url, fetcher, signal, { emptyOn404 = false } = {}) {
  const options = {
    headers: { Accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
  };
  let response = await fetcher(url, options);
  if ([502, 503, 504].includes(response.status) && !response.headers.has("Retry-After")) {
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await fetcher(url, options);
  }
  if (emptyOn404 && response.status === 404) return [];
  if (!response.ok) throw new Error("upstream_" + response.status);
  return response.json();
}

function ensemblGenes(entry) {
  return list(
    (entry.uniProtKBCrossReferences || [])
      .filter(({ database }) => database === "Ensembl")
      .flatMap(({ properties }) =>
        (properties || [])
          .filter(({ key }) => key === "GeneId")
          .map(({ value }) => value?.split(".")[0])
          .filter((value) => /^ENSG\d+$/.test(value)),
      ),
  );
}

export async function resolveProtein(inputName, selection, fetcher, signal, retrievedAt) {
  const lookup = selection || canonicalAlias(inputName);
  const accessionPattern =
    /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/i;
  const ensembl = /^ENSG\d+$/i.test(lookup);
  const filter = ensembl
    ? `xref:Ensembl-${lookup.toUpperCase()}`
    : accessionPattern.test(lookup)
      ? `accession:${lookup.toUpperCase()}`
      : `gene_exact:"${lookup}" OR protein_name:"${lookup}"`;
  const search = new URLSearchParams({
    query: `(reviewed:true) AND (organism_id:9606) AND (${filter})`,
    fields:
      "accession,organism_id,protein_name,gene_names,cc_function,cc_subcellular_location,cc_interaction,cc_similarity,xref_ensembl",
    size: "25",
  });
  const payload = await getJson(
    `https://rest.uniprot.org/uniprotkb/search?${search}`,
    fetcher,
    signal,
  );
  if (!Array.isArray(payload?.results)) throw new Error("unexpected_uniprot_response");
  const entries = payload.results.filter(
    (entry) => entry?.organism?.taxonId === 9606 && entry.genes?.[0]?.geneName?.value,
  );
  const exact = entries.filter((entry) =>
    [entry.primaryAccession, ...names(entry), ...ensemblGenes(entry)].some(
      (name) => key(name) === key(lookup),
    ),
  );
  if (exact.length !== 1 || (exact.length && Number(payload.totalResults) > entries.length)) {
    const candidates = (exact.length ? exact : entries).map((entry) => ({
      id: entry.primaryAccession,
      name: entry.genes[0].geneName.value,
      description: proteinNames(entry)[0],
    }));
    if (candidates.length) throw new SearchError("choose_target", { input: inputName, candidates });
    return null;
  }
  const [entry] = exact;
  const accession = entry.primaryAccession;
  if (!/^[A-Z0-9]{6,10}$/.test(accession)) throw new Error("unexpected_uniprot_accession");
  const geneSymbol = entry.genes[0].geneName.value;
  const canonicalName = proteinNames(entry)[0] || geneSymbol;
  const geneIds = ensemblGenes(entry);
  const entityType = /receptor subunit/i.test(canonicalName)
    ? "receptor_subunit"
    : /\breceptor(?: \w+)?$/i.test(canonicalName) ||
        (entry.comments || []).some(
          ({ commentType, texts }) =>
            commentType === "FUNCTION" &&
            texts?.some(({ value }) => /^(?:inhibitory|stimulatory) receptor\b/i.test(value)),
        )
      ? "receptor"
      : /growth factor(?: [A-Z]| [0-9]+)?(?:, (?:long|short) form)?$/i.test(canonicalName)
        ? "growth_factor"
        : /^(?:interleukin-\d+|tumor necrosis factor)$/i.test(canonicalName)
          ? "cytokine"
          : /ligand superfamily/i.test(canonicalName)
            ? "ligand"
            : "protein";
  const source = evidence(
    "UniProt",
    accession,
    `https://www.uniprot.org/uniprotkb/${accession}/entry`,
    retrievedAt,
    {
      license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    },
  );
  const comments = (type) =>
    (entry.comments || []).filter((comment) => comment.commentType === type);
  return {
    identity: {
      id: geneSymbol,
      canonicalId: geneIds.length === 1 ? geneIds[0] : accession,
      inputName,
      canonicalName,
      geneSymbol,
      synonyms: names(entry),
      species: "Homo sapiens",
      entityType,
      uniprotIds: [accession],
      ensemblIds: geneIds,
      primaryEnsemblId: geneIds.length === 1 ? geneIds[0] : undefined,
      reactomeIds: [],
      resolutionStatus: "resolved",
    },
    biology: {
      targetId: geneSymbol,
      proteinType: comments("SIMILARITY").flatMap(({ texts }) => texts.map(({ value }) => value)),
      biologicalFunctions: comments("FUNCTION").flatMap(({ texts }) =>
        texts.map(({ value, evidences }) => ({ text: value, evidences, source })),
      ),
      subcellularLocations: list(
        comments("SUBCELLULAR LOCATION").flatMap(({ subcellularLocations }) =>
          (subcellularLocations || []).map(({ location }) => location?.value),
        ),
      ),
      receptorLigandRelations: [],
      interactionPartners: comments("INTERACTION").flatMap(({ interactions }) =>
        (interactions || []).flatMap(({ interactantTwo, interSpecies, numberOfExperiments }) =>
          !interSpecies && interactantTwo?.uniProtKBAccession
            ? [
                {
                  name: interactantTwo.geneName || interactantTwo.uniProtKBAccession,
                  accession: interactantTwo.uniProtKBAccession,
                  experiments: numberOfExperiments,
                },
              ]
            : [],
        ),
      ),
      pathways: [],
      sources: [source],
    },
  };
}

export const isCd3Complex = (name) =>
  ["cd3", "cd3 complex", "tcr-cd3", "tcr-cd3 complex"].includes(key(name));

export function resolveCd3(inputName) {
  return {
    identity: {
      id: "CD3",
      canonicalId: "Reactome:R-HSA-202403",
      subunits: ["CD3D", "CD3E", "CD3G", "CD247"],
      discoveryGenes: [{ id: "CD3E", ensemblId: "ENSG00000198851" }],
      inputName,
      canonicalName: "TCR–CD3",
      geneSymbol: null,
      synonyms: ["CD3", "CD3 complex", "TCR-CD3"],
      species: "Homo sapiens",
      entityType: "protein_complex",
      uniprotIds: [],
      ensemblIds: [],
      reactomeIds: ["R-HSA-202403"],
      resolutionStatus: "resolved",
    },
    biology: {
      targetId: "CD3",
      proteinType: [],
      biologicalFunctions: [],
      subcellularLocations: [],
      receptorLigandRelations: [],
      pathways: [],
      sources: [],
    },
  };
}

export function resolveComposite(inputName, selection) {
  const normalized = key(inputName).replace(/[‐‑–]/g, "-");
  if (!selection && normalized === "vegf") {
    throw new SearchError("choose_target", {
      input: inputName,
      candidates: [
        {
          id: "VEGF-FAMILY",
          name: "VEGF family",
          description: "VEGFA, VEGFB, VEGFC, FIGF and PGF",
        },
        { id: "P15692", name: "VEGFA", description: "Vascular endothelial growth factor A" },
      ],
    });
  }
  if (normalized === "vegf" && selection === "VEGF-FAMILY")
    return {
      identity: {
        id: "VEGF-family",
        canonicalId: "family:VEGF",
        inputName,
        canonicalName: "VEGF family",
        entityType: "protein_family",
        synonyms: ["VEGF"],
        members: ["VEGFA", "VEGFB", "VEGFC", "FIGF", "PGF"],
        uniprotIds: [],
        ensemblIds: [],
        reactomeIds: ["R-HSA-194313"],
        resolutionStatus: "resolved",
      },
      biology: { targetId: "VEGF-family", biologicalFunctions: [], pathways: [], sources: [] },
    };
  if (!selection && ["il-23", "il23", "interleukin-23", "interleukin 23"].includes(normalized)) {
    const target = resolveCd3(inputName);
    Object.assign(target.identity, {
      id: "IL23",
      canonicalId: "Reactome:R-HSA-9020933",
      canonicalName: "Interleukin-23 (IL-23)",
      synonyms: ["IL-23", "IL23"],
      subunits: ["IL23A", "IL12B"],
      componentAccessions: ["Q9NPF7", "P29460"],
      discoveryGenes: [
        { id: "IL23A", ensemblId: "ENSG00000110944" },
        { id: "IL12B", ensemblId: "ENSG00000113302" },
      ],
      reactomeIds: ["R-HSA-9020933"],
    });
    target.biology.targetId = "IL23";
    return target;
  }
  return isCd3Complex(inputName) ? resolveCd3(inputName) : null;
}

export async function resolveReactomeComplex(inputName, selection, fetcher, signal, retrievedAt) {
  const base = "https://reactome.org/ContentService/";
  let id = (selection || inputName).toUpperCase();
  if (!/^R-HSA-\d+$/.test(id)) {
    const search = new URLSearchParams({
      query: inputName,
      species: "Homo sapiens",
      types: "Complex",
    });
    const payload = await getJson(base + "search/query?" + search, fetcher, signal);
    if (!Array.isArray(payload?.results)) throw new Error("unexpected_reactome_response");
    const candidates = payload.results
      .flatMap(({ entries }) => entries || [])
      .flatMap((row) => {
        if (
          row.exactType !== "Complex" ||
          !/^R-HSA-\d+$/.test(row.stId) ||
          !row.species?.includes("Homo sapiens") ||
          row.isDisease ||
          typeof row.name !== "string"
        )
          return [];
        const name = row.name.replace(/<[^>]*>/g, "");
        if (key(name) !== key(inputName)) return [];
        return [{ id: row.stId, name, description: (row.compartmentNames || []).join(", ") }];
      });
    if (!candidates.length) return null;
    if (candidates.length > 1)
      throw new SearchError("choose_target", { input: inputName, candidates });
    id = candidates[0].id;
  }
  const row = await getJson(base + "data/query/" + id, fetcher, signal, { emptyOn404: true });
  if (row.stId !== id || row.schemaClass !== "Complex" || row.speciesName !== "Homo sapiens")
    return null;
  const canonicalName = row.name?.[0] || row.displayName;
  const source = evidence("Reactome", id, "https://reactome.org/content/detail/" + id, retrievedAt);
  return {
    identity: {
      id,
      canonicalId: "Reactome:" + id,
      inputName,
      canonicalName,
      entityType: "protein_complex",
      species: "Homo sapiens",
      synonyms: row.name || [],
      uniprotIds: [],
      ensemblIds: [],
      reactomeIds: [id],
      reactomeComplex: true,
      subunits: (row.hasComponent || []).map((entry) => entry.name?.[0]).filter(Boolean),
      identitySource: source,
      resolutionStatus: "resolved",
    },
    biology: { targetId: id, biologicalFunctions: [], pathways: [], sources: [source] },
  };
}

export async function fetchPathways(target, fetcher, signal, retrievedAt) {
  const { identity, biology } = target;
  const base = "https://reactome.org/ContentService/data/";
  const complex = identity.entityType === "protein_complex";
  const pathwayId = identity.reactomeIds[0];
  const mappedComplex = identity.reactomeComplex;
  const knownPathway = (complex || identity.entityType === "protein_family") && !mappedComplex;
  const result = mappedComplex
    ? await getJson(base + "pathways/low/entity/" + pathwayId, fetcher, signal, {
        emptyOn404: true,
      })
    : knownPathway
      ? await getJson(base + "query/" + pathwayId, fetcher, signal)
      : await getJson(
          base + `mapping/UniProt/${identity.uniprotIds[0]}/pathways`,
          fetcher,
          signal,
          {
            emptyOn404: true,
          },
        );
  if (knownPathway && result?.stId !== pathwayId) throw new Error("unexpected_reactome_response");
  const rows = knownPathway ? [result] : result;
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.stId !== "string"))
    throw new Error("unexpected_reactome_response");
  biology.pathways = rows
    .filter(
      (row) =>
        /^R-HSA-\d+$/.test(row.stId) && row.displayName && !row.isInferred && !row.isInDisease,
    )
    .sort(
      (a, b) =>
        Number(Boolean(b.hasDiagram)) - Number(Boolean(a.hasDiagram)) ||
        a.stId.localeCompare(b.stId),
    )
    .map((row) => {
      const source = evidence(
        "Reactome",
        row.stId,
        `https://reactome.org/content/detail/${row.stId}`,
        retrievedAt,
      );
      return {
        id: row.stId,
        name: row.displayName,
        species: "Homo sapiens",
        relationship: complex ? "complex_pathway" : "participant_mapping",
        events: (row.hasEvent || []).flatMap((event) =>
          /^R-HSA-\d+$/.test(event.stId) ? [{ id: event.stId, name: event.displayName }] : [],
        ),
        description: row.summation
          ?.map(({ text }) => text)
          .filter(Boolean)
          .join(" "),
        source,
      };
    });
  identity.reactomeIds = list(biology.pathways.map(({ id }) => id));
  if (knownPathway && biology.pathways[0]?.description) {
    const { description, source } = biology.pathways[0];
    biology.biologicalFunctions = [{ text: description, source }];
    biology.sources = [source];
  }
  return biology.pathways;
}
