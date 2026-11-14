import { expect, it } from "vitest";
import { catalogDetails, queryLiveProteins, readProteinDetail } from "../src/lib/assay-design/live-products.js";

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
  const fetcher = async () => new Response("<div id='app'></div>", {
    headers: { "content-type": "text/html" },
  });
  const renderPage = async (url) => {
    if (url.includes("/category/")) return `<a href="${detail}">CD20 Protein</a>`;
    if (url.endsWith(detail)) return "<h1>Human CD20 Protein, His Tag</h1><p>CD0-H52H3-20ug ¥8190.00</p>";
    return "";
  };
  const result = await queryLiveProteins("CD20", "ACROBiosystems", {
    fetcher, renderPage, signal: new AbortController().signal,
  });
  expect(result.rows).toEqual([expect.objectContaining({ sku: "CD0-H52H3" })]);
});
