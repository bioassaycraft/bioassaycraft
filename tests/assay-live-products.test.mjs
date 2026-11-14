import { expect, it } from "vitest";
import { catalogDetails, queryLiveProteins, readCatalogProducts, readDatasheetProduct, readProteinDetail } from "../src/lib/assay-design/live-products.js";

it("reads only same-supplier links for the requested target", () => {
  const html = '<a href="/products/protein/cd20-human-cd0-h52h3">CD20</a>' +
    '<a href="https://other.example/products/protein/cd20-abc">CD20</a>' +
    '<a href="/products/protein/cd200-human-abc">CD200</a>';
  expect(catalogDetails(html, "MS4A1", "ACROBiosystems")).toEqual([
    "https://www.acrobiosystems.cn/products/protein/cd20-human-cd0-h52h3",
  ]);
});

it("pairs live China list prices with the source pack sizes", () => {
  const html = "<h1>Human CD20 Protein, His Tag</h1>" +
    "<p>CD0-H52H3-20ug</p><p>&yen;8190.00</p>" +
    "<p>CD0-H52H3-500ug</p><p>询价</p>" +
    "<p>It contains AA Met 1 - Pro 297 (Accession # P11836-1).</p>";
  const url = "https://www.acrobiosystems.cn/products/protein/cd20-human-cd0-h52h3";
  expect(readProteinDetail(html, url, "CD20", "ACROBiosystems")).toMatchObject({
    sku: "CD0-H52H3", tags: ["His-tag"], accession: "P11836-1",
    variants: [{ size: "20 µg", price: "CNY 8190.00" }, { size: "500 µg", quote: true }],
  });
});

it("renders an empty ACRO shell and parses the resulting detail page", async () => {
  const detail = "/products/protein/cd20-human-cd0-h52h3";
  const fetcher = async () => new Response("<div id='app'></div><script src='/app.js'></script>", {
    headers: { "content-type": "text/html" },
  });
  const renderPage = async (url) => {
    if (url.includes("/category/")) return `<a href="${detail}">CD20 Protein</a>`;
    if (url.endsWith(detail)) return "<h1>Human CD20 Protein, His Tag</h1><p>CD0-H52H3-20ug ¥8190.00</p>";
    return "";
  };
  const result = await queryLiveProteins("CD20", "ACROBiosystems", {
    fetcher, renderPage, materialSeeds: [], signal: new AbortController().signal,
  });
  expect(result.rows).toEqual([expect.objectContaining({ sku: "CD0-H52H3" })]);
});

it.each([
  ["CD19", "11880-H02H", "cd19", "NP_001171569.1", "Met1-Lys291"],
  ["CD20", "11007-H08H-VP", "cd20", "P11836", "Met1-Pro297"],
  ["PDCD1", "10377-H08H", "pd-1", "NP_005009.2", "Leu25-Gln167"],
])("extracts Sino product fields from the public detail layout for %s", (target, sku, slug, accession, range) => {
  const html = `<h1>Recombinant Human ${slug.toUpperCase()} Protein (ECD, His Tag)</h1>
    <p>Cat: ${sku}</p><div>Price:</div><div>Size:</div>
    <dt>蛋白构建</dt><dd>A DNA sequence encoding the human protein (${accession}) (${range})</dd>
    <dt>Accession#</dt><dd>${accession}</dd><dt>表达宿主</dt><dd>HEK293 Cells</dd>`;
  const url = `https://cn.sinobiological.com/recombinant-proteins/human-${slug}-${sku.toLowerCase()}`;
  expect(readProteinDetail(html, url, target, "Sino Biological")).toMatchObject({
    sku, accession, range, host: "HEK293 Cells", tags: ["His-tag"], variants: [], live: true,
  });
});

it.each([403, 429])("preserves supplier HTTP %s instead of rendering or accepting discovery snippets", async (status) => {
  const result = await queryLiveProteins("PDCD1", "Sino Biological", {
    signal: new AbortController().signal,
    materialSeeds: [],
    fetcher: async () => new Response("", { status }),
    renderPage: async () => { throw new Error("unexpected_render"); },
    discover: async ({ terms }) => {
      expect(terms).toContain("pd-1");
      return { urls: ["https://cn.sinobiological.com/recombinant-proteins/human-pd-1-10377-h08h"], more: false };
    },
  });
  expect(result).toMatchObject({ rows: [], issues: [`http_${status}`] });
});

it("reads structured product offers only when the pack size and currency are explicit", () => {
  const metadata = {
    "@context": "https://schema.org", "@type": "Product",
    name: "Human CD19 Protein (His Tag)", sku: "11880-H08H",
    offers: [{ size: "100 µg", price: 1200, priceCurrency: "CNY" }, { price: 80, priceCurrency: "USD" }],
  };
  const url = "https://cn.sinobiological.com/recombinant-proteins/human-cd19-11880-h08h";
  expect(readProteinDetail(`<script type="application/ld+json">${JSON.stringify(metadata)}</script>`, url, "CD19", "Sino Biological")?.variants)
    .toEqual([{ size: "100 µg", price: "CNY 1200", sourceUrl: url }]);
});

it("uses an official catalog row independently of a blocked detail page", async () => {
  const url = "https://cn.sinobiological.com/recombinant-proteins/human-tl1a-17049-h07h2";
  const html = `<table><tr><td><a href="${url}">17049-H07H2</a></td>
    <td>Human TL1A / TNFSF15 Protein (His Tag)</td></tr></table>`;
  const result = await queryLiveProteins("TL1A", "Sino Biological", {
    materialSeeds: [],
    signal: new AbortController().signal,
    fetcher: async (candidate) => candidate === url ? new Response("", { status: 403 }) :
      new Response(html, { headers: { "content-type": "text/html" } }),
  });
  expect(result.rows).toEqual([expect.objectContaining({
    sku: "17049-H07H2", fieldSources: expect.objectContaining({ name: expect.stringContaining("/molecule/") }),
  })]);
  expect(result.issues).toContain("http_403");
  expect(result.candidates).toEqual([]);
  expect(readCatalogProducts(html, url, "PD-1", "Sino Biological")).toEqual([]);
});

it("keeps PDF evidence scoped to the named construct and records its source", () => {
  const url = "https://ehf85k.acrobiosystems.cn/public/product/pdf/ds/TLA-H5263.pdf";
  const text = "Human TL1A / TNFSF15 Protein, Fc Tag\nCatalog # TLA-H5263\nSource\n" +
    "expressed from human 293 cells (HEK293). It contains AA Val 84 - Leu 251 (Accession # O95150-1).\n" +
    "Bioactivity - ELISA\n";
  expect(readDatasheetProduct(text, url, "TNFSF15", "ACROBiosystems")).toMatchObject({
    sku: "TLA-H5263", range: "Val 84 - Leu 251", accession: "O95150-1",
    validation: ["ELISA"], fieldSources: { range: url, validation: url },
    sources: [{ url, kind: "pdf", retrievedOn: expect.any(String) }],
  });
  expect(readDatasheetProduct(text, url, "PD-1", "ACROBiosystems")).toBeNull();
});
