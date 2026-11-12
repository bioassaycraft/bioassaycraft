// IUPHAR IDs come from its targets_and_families.csv export or the exact ligand record.
// ACRO and Synapse paths are verified destination pages, never derived from a slug or hash.
const destinations = [
  {
    ids: ["PCSK9", "Q8NBP7", "ENSG00000169174"],
    label: "PCSK9",
    iuphar: 2388,
    acro: "pcsk9",
    synapse: "36b06938fcaa3b2c9a1fab9a8dbfcd8d",
  },
  {
    ids: ["PDCD1", "PD-1", "Q15116", "ENSG00000188389"],
    label: "PD-1",
    iuphar: 2760,
    acro: "pd-1",
    synapse: "9786d32e3d244a688ec6a60d2fe1b10b",
  },
  {
    ids: ["MS4A1", "CD20", "P11836", "ENSG00000156738"],
    label: "CD20",
    iuphar: 2628,
    acro: "cd20",
    synapse: "462f4be0a7f630efa6b9cb3dbb9ab9ef",
  },
  {
    ids: ["CD19", "P15391", "ENSG00000177455"],
    label: "CD19",
    iuphar: 2764,
    acro: "cd19",
    synapse: "5eb1fc5283d34305934a031af530f448",
  },
  { ids: ["CD3"], label: "CD3", acro: "cd3", synapse: "fe50c9b7f38746beb4bfd1ae9fa6fd1b" },
  {
    ids: ["IL23", "IL-23"],
    label: "IL-23",
    ligand: 4978,
    synapse: "4dec55557a154d65a47f7a2ab9980cfd",
  },
  {
    ids: ["TNFSF15", "TL1A", "O95150"],
    label: "TL1A",
    acro: "tl1a",
    synapse: "fdab7a90d0734f029c97a90640073383",
  },
  {
    ids: ["OSMR", "Q99650", "ENSG00000145623"],
    label: "OSMR",
    iuphar: 1714,
    acro: "osmr",
    synapse: "1fc71d9c59584383aabf0bedacf966ea",
  },
];

export function targetSourceLinks(targets, identities, paperTerm, copy) {
  const links = [];
  if (paperTerm) {
    links.push({
      label: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov/?" + new URLSearchParams({ term: paperTerm }),
    });
  }
  for (const target of targets) {
    const identity = identities.find(({ id }) => id === target.id);
    if (identity && identity.resolutionStatus !== "resolved") continue;
    const ensembl = identity?.primaryEnsemblId || target.ensemblId;
    const accession = identity?.uniprotIds?.length === 1 ? identity.uniprotIds[0] : null;
    const keys = [target.id, identity?.canonicalId, identity?.geneSymbol, accession, ensembl]
      .filter(Boolean)
      .map((value) => value.toUpperCase());
    const page = destinations.find(({ ids }) => ids.some((id) => keys.includes(id)));
    const label = page?.label || target.id;
    const geneId = ensembl || page?.ids.find((id) => /^ENSG\d+$/.test(id));
    const proteinId = accession || page?.ids.find((id) => /^[OPQ]\d[A-Z0-9]{3}\d$/.test(id));
    const add = (source, url, note) => links.push({ label: `${source} · ${label}`, url, note });

    if (/^ENSG\d+$/.test(geneId || "")) {
      add("Open Targets", `https://platform.opentargets.org/target/${geneId}`);
    }
    if (proteinId) {
      add("UniProt", `https://www.uniprot.org/uniprotkb/${encodeURIComponent(proteinId)}/entry`);
    } else if (identity?.geneSymbol) {
      const query = new URLSearchParams({
        query: `gene_exact:${identity.geneSymbol} AND organism_id:9606`,
      });
      add("UniProt", `https://www.uniprot.org/uniprotkb?${query}`);
    }
    if (page?.iuphar || page?.ligand) {
      const path = page.iuphar
        ? `ObjectDisplayForward?objectId=${page.iuphar}`
        : `LigandDisplayForward?ligandId=${page.ligand}`;
      add("IUPHAR / BPS", "https://www.guidetopharmacology.org/GRAC/" + path, copy.iupharLogin);
    }
    if (page?.acro)
      add("ACRO", "https://www.acrobiosystems.cn/category/target-protein/" + page.acro);
    if (page?.synapse)
      add(
        copy.synapseSource,
        "https://synapse.zhihuiya.com/target/" + page.synapse,
        copy.synapseLogin,
      );
  }
  return links;
}

const nciEntries = new Set(["blinatumomab", "pembrolizumab", "rituximab"]);

export function nciDrugLink(name) {
  const key = name.trim().toLowerCase();
  return nciEntries.has(key)
    ? "https://www.cancer.gov/publications/dictionaries/cancer-drug/def/" + key
    : null;
}
