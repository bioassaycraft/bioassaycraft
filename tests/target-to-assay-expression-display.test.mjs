import { expect, it } from "vitest";
import { expressionLayers, expressionName } from "../src/lib/target-to-assay/expression-display.js";
import { reviewedDiseaseExpression } from "../src/lib/target-to-assay/target-discovery.js";

it("keeps bulk tumor RNA outside baseline cell and tissue records without changing values or units", () => {
  const cells = { kind: "single_cell_rna", unit: "nCPM", values: [{ name: "Late primary spermatocytes", value: 40 }] };
  const tissue = { kind: "tissue_protein", unit: "", values: [{ name: "intestine", value: 100 }] };
  const bulk = { kind: "cancer_bulk_rna", unit: "pTPM", values: [{ name: "Lung Cancer", value: 5 }] };
  expect(expressionLayers([cells, bulk, tissue])).toEqual({ baseline: [cells, tissue], bulk: [bulk] });
  expect(expressionName(cells.values[0].name, "zh")).toBe("晚期初级精母细胞");
  expect(expressionName("Unmapped cell", "zh")).toBe("Unmapped cell");
  expect(expressionName("naive B-cell", "en")).toBe("naive B-cell");
});

it("attaches the regulatory leukemia expression note only to verified CD19 identity", () => {
  expect(reviewedDiseaseExpression({ uniprotIds: ["P15391"] })[0]).toMatchObject({
    kind: "regulatory_disease_expression",
    source: { sourceName: "EMA", originalUrl: expect.stringContaining("/EPAR/blincyto") },
  });
  expect(reviewedDiseaseExpression({ uniprotIds: ["Q9NYJ7"] })).toEqual([]);
});
