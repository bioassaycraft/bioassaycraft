// Source-backed starter corpus, not an exhaustive regulatory database.
// Dates describe this editorial check, not current commercial availability.
export const checkedAt = "2026-11-10";
export const targets = [
  {
    id: "CD3",
    label: "CD3",
    kind: "complex",
    aliases: ["CD3 complex"],
    sourceId: "blincyto-label",
  },
  { id: "CD19", label: "CD19", kind: "protein", aliases: [], sourceId: "blincyto-label" },
  { id: "CD20", label: "CD20", kind: "protein", aliases: [], sourceId: "lunsumio-label" },
];
export const sources = [
  {
    id: "blincyto-label",
    recordId: "125557s030",
    title: "FDA · BLINCYTO prescribing information (2024)",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/125557s030lbl.pdf",
    locator: "Highlights; sections 1 and 12.1",
    checkedAt,
    verification: "reviewed",
  },
  {
    id: "lunsumio-label",
    recordId: "761263s010",
    title: "FDA · LUNSUMIO prescribing information (2026)",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761263s010lbl.pdf",
    locator: "Highlights; sections 1 and 12.1",
    checkedAt,
    verification: "reviewed",
  },
  {
    id: "columvi-label",
    recordId: "761309s006",
    title: "FDA · COLUMVI prescribing information (2026)",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761309s006lbl.pdf",
    locator: "Highlights; sections 1 and 12.1",
    checkedAt,
    verification: "reviewed",
  },
];
export const drugs = [
  {
    id: "blinatumomab",
    name: "blinatumomab",
    brand: "BLINCYTO",
    molecularFormat: "Bispecific antibody",
    actionType: "T-cell engagement",
    mechanisms: ["Binds CD19 on B cells and CD3 on T cells, promoting T-cell-mediated killing of CD19-expressing cells."],
    targetIds: ["CD3", "CD19"],
    sourceId: "blincyto-label",
    approval: { agency: "FDA", identifier: "BLA 125557", status: "approved", initialYear: 2014 },
    verification: "reviewed",
    updatedAt: checkedAt,
  },
  {
    id: "mosunetuzumab-axgb",
    name: "mosunetuzumab-axgb",
    brand: "LUNSUMIO",
    molecularFormat: "Bispecific antibody",
    actionType: "T-cell engagement",
    mechanisms: ["Engages CD20 on B cells and CD3 on T cells, inducing T-cell-mediated lysis of CD20-expressing cells."],
    targetIds: ["CD3", "CD20"],
    sourceId: "lunsumio-label",
    approval: { agency: "FDA", identifier: "BLA 761263", status: "approved", initialYear: 2022 },
    verification: "reviewed",
    updatedAt: checkedAt,
  },
  {
    id: "glofitamab-gxbm",
    name: "glofitamab-gxbm",
    brand: "COLUMVI",
    molecularFormat: "Bispecific antibody",
    actionType: "T-cell engagement",
    mechanisms: ["Engages CD20 on B cells and CD3 on T cells, redirecting T cells to lyse CD20-expressing cells."],
    targetIds: ["CD3", "CD20"],
    sourceId: "columvi-label",
    approval: { agency: "FDA", identifier: "BLA 761309", status: "approved", initialYear: 2023 },
    verification: "reviewed",
    updatedAt: checkedAt,
  },
];
export const catalog = { targets, sources, drugs };

// The page's reviewed example also illustrates strict single-target matching.
const cd20Example = [
  { name: "rituximab", brand: "Rituxan", application: "103705", year: 1997, epar: "mabthera" },
  { name: "obinutuzumab", brand: "Gazyva", application: "125486", year: 2013, epar: "gazyvaro" },
  { name: "ofatumumab", brand: "Arzerra / Kesimpta", application: "125326", year: 2009, epar: "kesimpta" },
  { name: "ocrelizumab", brand: "Ocrevus", application: "761053", year: 2017, epar: "ocrevus" },
  { name: "ublituximab-xiiy", brand: "Briumvi", application: "761238", year: 2022, epar: "briumvi" },
];

export const sampleCatalog = {
  targets,
  drugs: [
    ...drugs,
    ...cd20Example.map(({ name, brand, application, year }) => ({
      id: name,
      name,
      brand,
      targetIds: ["CD20"],
      mechanisms: ["Antibody-mediated cell killing"],
      sourceId: `${name}-epar`,
      approval: {
        agency: "FDA",
        identifier: `BLA ${application}`,
        status: "approved",
        initialYear: year,
      },
      verification: "reviewed",
      updatedAt: "2026-11-11",
    })),
  ],
  sources: [
    ...sources,
    ...cd20Example.map(({ name, epar }) => ({
      id: `${name}-epar`,
      title: `EMA · ${name} medicine overview`,
      url: `https://www.ema.europa.eu/en/medicines/human/EPAR/${epar}`,
      locator: "How does the medicine work?",
      checkedAt: "2026-11-11",
      verification: "reviewed",
    })),
  ],
};

// Independently reviewed regulator records, explicitly dated and separate from live API results.
export const regulatoryCd3Cd20 = [
  {
    drug: {
      id: "epcoritamab-bysp",
      name: "epcoritamab-bysp",
      brand: "Epkinly / Tepkinly",
      aliases: ["epcoritamab", "GEN3013", "DuoBody-CD3xCD20"],
      sourceId: "epcoritamab-fda",
      targetIds: ["CD3", "CD20"],
      mechanisms: ["Bridges CD3 on T cells and CD20 on B cells, promoting T-cell-mediated killing of CD20-expressing cells."],
      molecularFormat: "Bispecific antibody",
      actionType: "T-cell engagement",
      approval: { agency: "FDA", identifier: "BLA 761324", status: "approved", initialYear: 2023 },
      regulatoryApprovals: [
        { agency: "FDA", identifier: "BLA 761324", status: "approved", date: "2023-05-19", url: "https://www.accessdata.fda.gov/scripts/purplebooksearch/index.cfm?blaNo=761324&event=productdetails" },
        { agency: "EMA", identifier: "EMEA/H/C/005985", status: "approved", date: "2023-09-22", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/tepkinly" },
      ],
      verification: "reviewed",
      updatedAt: "2026-11-12",
    },
    source: {
      id: "epcoritamab-fda",
      recordId: "761324s003",
      title: "FDA · Epkinly prescribing information",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761324s003lbl.pdf",
      locator: "Highlights; section 12.1",
      checkedAt: "2026-11-12",
      verification: "reviewed",
    },
  },
  {
    drug: {
      id: "odronextamab",
      name: "odronextamab",
      brand: "Ordspono",
      aliases: ["REGN1979"],
      sourceId: "odronextamab-ema",
      targetIds: ["CD3", "CD20"],
      mechanisms: ["Binds CD20 on B cells and CD3 on T cells, bringing them together so that T cells can kill the B cells."],
      molecularFormat: "Bispecific antibody",
      actionType: "T-cell engagement",
      approval: { agency: "EMA", identifier: "EMEA/H/C/006215", status: "approved", initialYear: 2024 },
      regulatoryApprovals: [
        { agency: "EMA", identifier: "EMEA/H/C/006215", status: "approved", date: "2024-08-22", url: "https://www.ema.europa.eu/en/medicines/human/EPAR/ordspono" },
      ],
      verification: "reviewed",
      updatedAt: "2026-11-12",
    },
    source: {
      id: "odronextamab-ema",
      recordId: "EMEA/H/C/006215",
      title: "EMA · Ordspono EPAR",
      url: "https://www.ema.europa.eu/en/medicines/human/EPAR/ordspono",
      locator: "How does Ordspono work?",
      checkedAt: "2026-11-12",
      verification: "reviewed",
    },
  },
];
