import { expect, it } from "vitest";
import { fetchInvestigationalProfile, investigationalGroups, rankClinicalStudies } from "../src/lib/target-to-assay/investigational.js";
import { rankAssayLiterature } from "../src/lib/target-to-assay/literature.js";
import { searchDrugs } from "../src/lib/target-to-assay/search.js";

it("excludes approved aliases without changing the existing search or removing eligible overlap", () => {
  const target = { id: "A", label: "A", aliases: [] };
  const drug = { verification: "reviewed", clinicalStage: "PHASE_2", targetIds: ["A"], approval: { status: "unknown" }, brand: "" };
  const catalog = { targets: [target], sources: [], drugs: [
    { ...drug, id: "active", name: "Active fixture" },
    { ...drug, id: "alias", name: "Active fixture sodium" },
    { ...drug, id: "known", name: "Known fixture", approval: { status: "approved" } },
    { ...drug, id: "candidate", name: "Known fixture", clinicalStage: "APPROVAL" },
  ] };
  const input = { targets: "A", includeClinical: true, matchMode: "verified_scope" };
  const before = searchDrugs(input, catalog);
  const [group] = investigationalGroups(catalog, before.combinations);
  expect(group.candidates).toHaveLength(1);
  expect(group.candidates[0].drug.id).toBe("active");
  expect(group.candidates[0].match.state).toBe("verified");
  expect(searchDrugs(input, catalog)).toEqual(before);
});

it("keeps combination trial phases scoped to the trial and puts active studies first", async () => {
  const record = (id, status, phase, names) => ({ protocolSection: {
    identificationModule: { nctId: id },
    designModule: { studyType: "INTERVENTIONAL", phases: [phase] },
    statusModule: { overallStatus: status },
    armsInterventionsModule: { interventions: names.map((name) => ({ name, type: "DRUG" })) },
  } });
  const fetcher = async (url) => {
    if (url.includes("api.fda.gov")) return new Response(null, { status: 404 });
    if (url.includes("ema.europa.eu")) return Response.json({ data: [] });
    return Response.json({ studies: [
      record("NCT00000001", "TERMINATED", "PHASE3", ["Fixture"]),
      record("NCT00000002", "RECRUITING", "PHASE2", ["Fixture", "Partner"]),
    ] });
  };
  const result = await fetchInvestigationalProfile({ name: "Fixture" }, { fetcher });
  expect(result.approval).toBe("checked");
  expect(result.highestTrialPhase).toBe("PHASE_3");
  expect(rankClinicalStudies(result.studies)).toMatchObject([
    { id: "NCT00000002", combined: true, phase: "PHASE_2" },
    { id: "NCT00000001", combined: false, phase: "PHASE_3" },
  ]);
});

it("admits a drug-linked potency paper, deduplicates DOI and rejects single-arm expression", () => {
  const term = '("CD3"[Title/Abstract]) AND ("CD19"[Title/Abstract])';
  const fixture = [
    { id: "noise", title: "CD3 expression on T cells", abstract: "A cell-based assay was used." },
    { id: "assay", doi: "10.1234/test", title: "Relative potency of Blinatumomab with a reporter gene assay", abstract: "NFAT response." },
    { id: "copy", doi: "https://doi.org/10.1234/TEST", title: "Relative potency of Blinatumomab with a reporter gene assay" },
    { id: "mechanism", title: "Pharmacology of a CD3 CD19 bispecific antibody" },
  ];
  expect(rankAssayLiterature(fixture, term, ["Blinatumomab"])).toMatchObject([
    { id: "assay", category: "assay" }, { id: "mechanism", category: "mechanism" },
  ]);
});

it("retains supplementary literature when PubMed is rate limited", async () => {
  const { fetchAssayLiterature } = await import("../src/lib/target-to-assay/literature.js");
  const fetcher = async (url) => {
    if (url.includes("ncbi.nlm.nih.gov")) return new Response(null, { status: 429 });
    if (url.includes("openalex.org")) return Response.json({ meta: { count: 0 }, results: [] });
    return Response.json({ hitCount: 2, resultList: { result: [
      { id: "123", source: "MED", title: "PD-1 antibody binding assay", pmid: "123" },
    ] } });
  };
  const result = await fetchAssayLiterature({ term: '("PD-1"[Title/Abstract])', drugs: [] }, { fetcher });
  expect(result.issues).toEqual({ PubMed: "rate_limited" });
  expect(result.europe).toMatchObject({ truncated: true, papers: [{ pmid: "123" }] });
});

it("excludes an FDA original approval even when Europe and clinical data are missing", async () => {
  const fetcher = async (url) => {
    if (!url.includes("api.fda.gov")) return new Response(null, { status: 503 });
    return Response.json({ meta: { results: { total: 1 } }, results: [{
      products: [{ brand_name: "Official brand", active_ingredients: [{ name: "Fixture hydrochloride" }] }],
      submissions: [{ submission_type: "ORIG", submission_status: "AP" }],
    }] });
  };
  const result = await fetchInvestigationalProfile({ name: "Fixture" }, { fetcher });
  expect(result.approval).toBe("approved");
  expect(result.issues).toMatchObject({ EMA: "unavailable", "ClinicalTrials.gov": "upstream_error" });
});

it.each([
  ["CD3", "CD19", "cell-based potency assay", "Potency"],
  ["CD3", "CD20", "biological activity", "Biological activity"],
  ["PD-1", null, "reporter-based assay", "Reporter assay"],
  ["PCSK9", null, "relative binding potency", "Potency"],
  ["TL1A", "OSMR", "HTRF binding assay", "HTRF / TR-FRET"],
  ["IGF-1R", null, "TR-FRET binding assay", "HTRF / TR-FRET"],
])("ranks direct methods first for %s / %s", (first, second, method, label) => {
  const names = [first, second].filter(Boolean);
  const term = names.map((name) => `("${name}"[Title/Abstract])`).join(" AND ");
  const target = names.join(" and ");
  const rows = rankAssayLiterature([
    { id: "direct", title: `Development of a ${method} for ${target}` },
    { id: "immune", title: `Immune cell expression of ${target}` },
    { id: "clinical", title: `Clinical efficacy of an antibody against ${target}` },
    { id: "unrelated", title: "Relative potency of atmospheric particulate extracts" },
  ], term);
  expect(rows[0]).toMatchObject({ id: "direct", category: "assay", partialScope: false });
  expect(rows[0].methodLabels).toContain(label);
  expect(rows.map(({ id }) => id)).not.toContain("unrelated");
  expect(rows.map(({ id }) => id)).not.toContain("immune");
});

it("merges cross-identifier metadata before ranking and retains partial methods at lower priority", () => {
  const term = '("CD3"[Title/Abstract]) AND ("CD19"[Title/Abstract])';
  const rows = rankAssayLiterature([
    { id: "pm", pmid: "1", title: "CD3 and CD19 diabody characterization", source: "PubMed" },
    { id: "ep", doi: "10.1000/foo", title: "Development of an HTRF binding assay for CD3 and CD19", source: "Europe PMC" },
    { id: "oa", pmid: "1", doi: "10.1000/foo", pmcid: "PMC10", title: "CD3 and CD19", source: "OpenAlex" },
    { id: "partial", title: "CD3 reporter gene assay" },
  ], term);
  expect(rows).toMatchObject([
    { id: "pm", category: "assay", doi: "10.1000/foo", pmcid: "PMC10", sources: ["PubMed", "Europe PMC", "OpenAlex"] },
    { id: "partial", partialScope: true },
  ]);
});

it("collapses confirmed publication versions and keeps unrelated title matches", async () => {
  const { collapsePublicationVersions, abstractLicense } = await import("../src/lib/target-to-assay/literature-display.js");
  const title = "An example of a sufficiently long shared title";
  const preprint = { title, url: "https://example.org/preprint", preprint: true, year: 2024, authorKeys: ["first a", "second b"] };
  const journal = { preprint: false, title: title + ".", url: "https://example.org/journal", year: 2025, authorKeys: preprint.authorKeys };
  const unrelated = { ...journal, id: "other", authorKeys: ["third c", "fourth d"] };
  expect(collapsePublicationVersions([preprint, unrelated, journal])).toMatchObject([
    { url: journal.url, preprints: [{ url: preprint.url }] }, { id: "other" },
  ]);
  expect(collapsePublicationVersions([preprint, unrelated])).toHaveLength(2);
  expect(collapsePublicationVersions([
    { ...preprint, title: "Earlier title", publishedDoi: "https://doi.org/10.1000/final" },
    { ...journal, doi: "10.1000/final" },
  ])).toMatchObject([{ url: journal.url, preprints: [{ url: preprint.url }] }]);
  expect(abstractLicense("CC BY 4.0")).toMatchObject({ label: "CC BY 4.0" });
  expect(abstractLicense("CC BY-NC 4.0")).toBeNull();
  expect(abstractLicense(undefined)).toBeNull();
});

it("supplements licensed abstracts by exact identifiers and leaves restricted abstracts at their source", async () => {
  const { fetchLiteratureAbstracts } = await import("../src/lib/target-to-assay/literature.js");
  const result = await fetchLiteratureAbstracts({ pmids: ["123"], dois: ["10.1000/test"] }, {
    fetcher: async (url) => {
      const params = new URL(url).searchParams;
      expect(params.get("resultType")).toBe("core");
      expect(params.get("query")).toContain("EXT_ID:123");
      return Response.json({ resultList: { result: [
        { source: "MED", id: "123", pmid: "123", title: "Restricted", abstractText: "An abstract", license: "All rights reserved" },
        { source: "PPR", id: "PPR1", doi: "10.1000/test", title: "Licensed", abstractText: "<p>First.</p><p>Second.</p>", license: "cc by" },
        { source: "MED", id: "124", pmid: "124", title: "No abstract", abstractText: "  " },
      ] } });
    },
  });
  expect(result.rows).toHaveLength(2);
  expect(result.rows[0]).toMatchObject({ pmid: "123", abstractSource: { source: "PubMed" } });
  expect(result.rows[0].publicAbstract).toBeUndefined();
  expect(result.rows[1].publicAbstract).toMatchObject({ text: "First.\n\nSecond.", license: { label: "CC BY" } });
});
