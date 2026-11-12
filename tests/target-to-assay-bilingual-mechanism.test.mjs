import { expect, it } from "vitest";
import { bilingualMechanism, reviewedMechanism } from "../src/lib/target-to-assay/bilingual-mechanism.js";

it("keeps PCSK9 protein inhibition separate from RNA interference", () => {
  const original = "PCSK9 mRNA RNAi inhibitor";
  expect(reviewedMechanism("EVOLOCUMAB")).toMatchObject({ type: "monoclonal", category: "pcsk9_protein" });
  expect(reviewedMechanism("Inclisiran sodium")).toMatchObject({ type: "sirna", category: "pcsk9_rnai" });
  expect(bilingualMechanism("INCLISIRAN", original)).toMatchObject({
    mechanismOriginal: original,
    mechanismZh: expect.stringContaining("PCSK9 mRNA"),
    mechanismSource: { sourceName: "EMA" },
    translationStatus: "reviewed",
  });
});

it("maps exact terminology and preserves unknown actions verbatim", () => {
  expect(bilingualMechanism("Example", "CD19 binding agent")).toMatchObject({
    mechanismZh: "CD19 结合剂。",
    translationStatus: "term_mapping",
  });
  for (const original of ["PCSK9 agonist", "PCSK9 antagonist"]) {
    expect(bilingualMechanism("Example", original)).toMatchObject({
      mechanismOriginal: original,
      mechanismZh: undefined,
      translationStatus: "unavailable",
    });
  }
});
