import { describe, expect, it } from "vitest";
import { resolveTargets } from "../src/lib/target-to-assay/search.js";
import { evidenceFor } from "../src/lib/target-to-assay/evidence.js";
import { activityMethods } from "../src/lib/assay-design/evidence.js";
import { detectors, filterProducts, mergeProducts, proteinProducts, proteinSuppliers } from "../src/lib/assay-design/products.js";

describe("assay design resources", () => {
  it.each([
    ["CD20, MS4A1", ["CD20"]],
    ["CD3×CD20", ["CD3", "CD20"]],
    ["CD3×CD19×CD20", ["CD3", "CD19", "CD20"]],
  ])("resolves %s into independent product groups", (input, ids) => {
    const targets = resolveTargets(input);
    expect(targets.map(({ id }) => id)).toEqual(ids);
    for (const { id } of targets) {
      expect(new Set(proteinProducts(id).map(({ vendor }) => vendor))).toEqual(new Set(proteinSuppliers));
    }
  });

  it("keeps the CD3 subunit construct separate from the complex", () => {
    expect(proteinProducts("CD3")[0]).toMatchObject({ targets: ["CD3E"], componentOnly: true });
    expect(proteinProducts("CD3D")).toEqual([]);
  });

  it("filters species and multiple tags independently", () => {
    expect(filterProducts(proteinProducts("CD19"), { species: "Mouse", tag: "His-tag" }).map((row) => row.sku)).toEqual(["50510-M08H"]);
    expect(filterProducts(proteinProducts("CD19"), { species: "Mouse", tag: "Fc-tag" })).toEqual([]);
    expect(filterProducts(proteinProducts("MS4A1"), { tag: "Avi-tag" })[0].tags).toContain("His-tag");
  });

  it("filters immunoglobulin detectors by target species, specificity and conjugate", () => {
    expect(filterProducts(detectors, { species: "Mouse", region: "H+L", label: "Biotin" }).map((row) => row.sku)).toEqual(["ab97044"]);
    expect(filterProducts(detectors, { species: "Rabbit", region: "H+L", label: "Biotin" })).toEqual([]);
  });

  it("uses an independent SA-HRP branch, even with stale antibody filters", () => {
    const matches = filterProducts(detectors, { species: "Mouse", region: "SA-HRP", label: "Biotin" });
    expect(matches.length).toBeGreaterThan(1);
    expect(matches.every(({ species, label }) => species === null && label === "HRP")).toBe(true);
  });

  it("keeps China catalog prices and quote-only packs tied to their sizes", () => {
    const detergent = proteinProducts("CD20").find(({ sku }) => sku === "CD0-H52H3");
    expect(detergent.variants).toEqual([
      { size: "20 µg", price: "CNY 8,190" },
      { size: "100 µg", price: "CNY 30,450" },
      { size: "500 µg", quote: true },
    ]);
  });

  it("merges SKU variants without transferring the price across pack sizes", () => {
    const row = detectors.find(({ sku }) => sku === "M00091");
    expect(mergeProducts([row, { ...row, variants: [{ size: "2 mg" }] }, row])[0].variants)
      .toEqual([{ size: "1 mg", price: "CNY 890" }, { size: "2 mg" }]);
  });

  it("requires explicit inspected method evidence, and deduplicates by method and source", () => {
    const docs = evidenceFor({ name: "glofitamab", approval: {} });
    expect(activityMethods([...docs, ...docs])).toEqual([
      expect.objectContaining({ methodType: "Cell-based reporter assay", url: expect.stringContaining("761309Orig1s000ChemR.pdf#page=4") }),
      expect.objectContaining({ methodType: "Surface plasmon resonance (SPR)" }),
      expect.objectContaining({ methodType: "Cell binding by flow cytometry" }),
    ]);
    expect(activityMethods([{ kind: "review", title: "ELISA", url: "https://example.org" }])).toEqual([]);
  });
});

it("combines compatible official sources and rejects conflicting construct metadata", () => {
  const pdf = { vendor: "ACROBiosystems", sku: "TLA-H5263", live: true,
    range: "Val 84 - Leu 251", accession: "O95150-1", sources: [{ url: "pdf" }] };
  const detail = { ...pdf, url: "detail", sources: [{ url: "detail" }],
    variants: [{ size: "100 µg", price: "CNY 100", sourceUrl: "detail" }] };
  const conflict = { ...detail, range: "Met 1 - Leu 251", variants: [{ size: "1 mg", price: "CNY 200" }] };
  expect(mergeProducts([pdf, detail, conflict])).toEqual([expect.objectContaining({
    url: "detail", sources: [{ url: "pdf" }, { url: "detail" }], variants: detail.variants,
  })]);
});
