import { expect, it } from "vitest";
import { candidateView, explorerView, fdaDocumentDisplay, pd1Blockade, regulatorGroups, uniqueIndications, visibleReviewDocuments } from "../src/lib/target-to-assay/presentation.js";
import { evidenceFor } from "../src/lib/target-to-assay/evidence.js";

it.each(["DLL3", "MS4A1", "TNFRSF17", "OSMR"])("uses the selected scope for candidates in the %s view", (targetId) => {
  const candidate = { drugId: "partial", state: "partial" };
  const single = { key: targetId, targetIds: [targetId], matches: [{ drugId: "partial" }],
    candidates: [{ drugId: "single-only" }] };
  const full = { key: "scope", targetIds: [targetId, targetId === "OSMR" ? "TNFSF15" : "CD3"],
    matches: [{ drugId: "exact" }], candidates: [candidate, candidate, { drugId: "exact" }] };
  const result = { combinations: [single, full] };
  expect(explorerView(result, "stale").active).toBe(full);
  expect(explorerView(result, targetId).active).toBe(single);
  expect(explorerView(result, candidateView)).toMatchObject({
    groups: [full, single], active: full, showCandidates: true, candidates: [candidate],
  });
  expect(explorerView(result, targetId)).toMatchObject({ active: single, showCandidates: false });
  expect(explorerView(result, targetId + candidateView)).toMatchObject({
    active: single, showCandidates: true, candidates: [{ drugId: "single-only" }],
  });
});

it("keeps the single-target navigation independent of the user's PD-1 alias", () => {
  const scope = { key: "PDCD1", targetIds: ["PDCD1"], matches: [], candidates: [] };
  expect(explorerView({ combinations: [scope] }, candidateView)).toMatchObject({
    active: scope, showCandidates: true, candidates: [],
  });
});

it("groups official sources, pins navigation, and separates supplementary dates from the first approval", () => {
  const fda = evidenceFor({ name: "tarlatamab-dlle" });
  const epar = "https://www.ema.europa.eu/en/medicines/human/EPAR/example";
  const groups = regulatorGroups([
    { agency: "CDE", kind: "manual_search", url: "https://www.cde.org.cn/" },
    { agency: "EMA", kind: "review", url: epar + "/report" },
    { agency: "EMA", kind: "application", url: epar },
    ...fda,
    { ...fda[1], kind: "review_package", url: "https://example.com/toc", title: "Review Package / Table of Contents" },
  ]);
  expect(groups.map(({ agency }) => agency)).toEqual(["FDA", "EMA"]);
  expect(groups[1].docs.map(({ title }) => title)).toEqual(["EPAR – Medicine Overview", "EPAR Assessment Report"]);
  const entries = groups[0].docs.map(fdaDocumentDisplay);
  expect(entries.map(({ title }) => title)).toEqual([
    "Drugs@FDA – Application Overview", "Review Package / Table of Contents",
    "Product Quality Review", "Multidisciplinary Review",
  ]);
  expect(entries[2]).toMatchObject({ metadata: "BLA 761344 · Original Application", supplementApprovedAt: null });
  expect(entries[3]).toMatchObject({ metadata: "BLA 761344 · Supplement 1", supplementApprovedAt: "2025-11-19" });
});

it("deduplicates ChEMBL indication IDs and normalized names while keeping the original reference", () => {
  const first = { name: "B-cell lymphoma", indicationKey: "example", url: "https://example.com/first" };
  expect(uniqueIndications([first, { name: "B Cell Lymphoma" }, { name: "Other label", indicationKey: "example" }]))
    .toEqual([first]);
});


it("keeps FDA navigation outside the six-PDF limit and shows all PDFs on expansion", () => {
  const fda = evidenceFor({ name: "tarlatamab-dlle" });
  const [group] = regulatorGroups([
    ...fda, { ...fda[0], kind: "review_package", url: "https://example.com/toc" },
    ...Array.from({ length: 6 }, (_, i) => ({
      agency: "FDA", kind: "review", title: "Other Reviews", date: "2000-01-01",
      url: `https://example.com/review-${i}.pdf`,
    })),
  ]);
  const collapsed = visibleReviewDocuments(group, false);
  expect(collapsed).toHaveLength(8);
  expect(collapsed.slice(0, 3).map(({ kind, category }) => [kind, category])).toEqual([
    ["overview", undefined], ["review_package", undefined], ["review", "Product Quality Review"],
  ]);
  expect(visibleReviewDocuments(group, true)).toHaveLength(10);
});

it("distinguishes uncategorized FDA PDFs using published titles and file identifiers", () => {
  const doc = { kind: "review", title: "Other Reviews", application: "BLA761263" };
  expect(fdaDocumentDisplay({ ...doc, originalType: "Risk Assessment and Risk Mitigation Review",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2022/761263Orig1s000RiskR.pdf" }))
    .toMatchObject({ title: "Risk Assessment and Risk Mitigation Review", fileId: "761263Orig1s000RiskR.pdf" });
  expect(fdaDocumentDisplay({ ...doc, originalType: "Review",
    url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2022/761263Orig1s000AdminCorres.pdf#page=1" }))
    .toMatchObject({ title: "Other Reviews", fileId: "761263Orig1s000AdminCorres.pdf" });
});

it("groups PD-1 inhibitors without treating binding alone or agonism as blockade", () => {
  expect(pd1Blockade({ mechanismDescription: "PD-1 antagonist" })).toBe(true);
  expect(pd1Blockade({ actionType: "INHIBITOR", mechanismDescription: "Checkpoint inhibition" })).toBe(true);
  expect(pd1Blockade({ actionType: "AGONIST", mechanismDescription: "PD-1 inhibitor" })).toBe(false);
  expect(pd1Blockade({ mechanismDescription: "PD-1 binding agent" })).toBe(false);
});
