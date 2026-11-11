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
    title: "FDA · BLINCYTO prescribing information (2024)",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/125557s030lbl.pdf",
    locator: "Highlights; sections 1 and 12.1",
    checkedAt,
    verification: "reviewed",
  },
  {
    id: "lunsumio-label",
    title: "FDA · LUNSUMIO prescribing information (2026)",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761263s010lbl.pdf",
    locator: "Highlights; sections 1 and 12.1",
    checkedAt,
    verification: "reviewed",
  },
  {
    id: "columvi-label",
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
