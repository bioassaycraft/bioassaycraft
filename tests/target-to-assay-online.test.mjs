import { describe, expect, it, vi } from "vitest";
import { searchOnline, parseTargetInput } from "../src/lib/target-to-assay/online.js";
import {
  approvalMilestones,
  evidenceFor,
  fetchFdaDocuments,
  safeOfficialUrl,
} from "../src/lib/target-to-assay/evidence.js";
import { buildResearchReport } from "../src/lib/target-to-assay/report.js";
import { fetchDrugTrials } from "../src/lib/target-to-assay/trials.js";
import { catalog, sampleCatalog } from "../src/lib/target-to-assay/catalog.js";
import { searchDrugs } from "../src/lib/target-to-assay/search.js";
import { summarizeMechanisms } from "../src/lib/target-to-assay/mechanisms.js";
import { drugHeadingName } from "../src/lib/target-to-assay/display.js";
import { researchGroups } from "../src/lib/target-to-assay/research.js";
const response = (data) => Response.json({ data });
const target = {
  id: "ENSG00000146648",
  name: "EGFR",
  description: "epidermal growth factor receptor",
};
function provider({ stage = "APPROVAL", mechanisms = true } = {}) {
  return vi.fn(async (_, options) => {
    const { query } = JSON.parse(options.body);
    return query.includes("FindTarget")
      ? response({ search: { hits: [target] } })
      : response({
          target: {
            drugAndClinicalCandidates: {
              count: 1,
              rows: [
                {
                  drug: {
                    id: "CHEMBL_TEST",
                    name: "TEST DRUG",
                    maximumClinicalStage: stage,
                    mechanismsOfAction: {
                      rows: mechanisms
                        ? [
                            {
                              mechanismOfAction: "EGFR inhibitor",
                              targets: [{ id: target.id, approvedSymbol: "EGFR" }],
                            },
                          ]
                        : [],
                    },
                  },
                },
              ],
            },
          },
        });
  });
}
describe("online target discovery", () => {
  it("accepts arbitrary normalized target input and bounds requests", () => {
    expect(parseTargetInput("ＥＧＦＲ， egfr × HER2")).toEqual(["egfr", "HER2"]);
    expect(() => parseTargetInput(Array.from({ length: 9 }, (_, i) => `T${i}`))).toThrow(
      "too_many_targets",
    );
    expect(() => parseTargetInput(" , ")).toThrow("empty_targets");
  });
  it("searches non-catalog targets and matches only approved mechanism-backed drugs", async () => {
    const result = await searchOnline({ targets: "EGFR" }, { fetcher: provider() });
    expect(result.drugs.map((d) => d.name)).toEqual(["TEST DRUG"]);
    expect(result.combinations[0].matches[0].matchType).toBe("reported");
    expect(result.drugs[0].approval.agency).toBe("global");
    expect(searchDrugs({ targets: "EGFR", matchMode: "exact" }, result.catalog).drugs).toEqual([]);
    expect(
      (await searchOnline({ targets: "EGFR" }, { fetcher: provider({ stage: "PHASE_3" }) })).drugs,
    ).toEqual([]);
    expect(
      (await searchOnline({ targets: "EGFR" }, { fetcher: provider({ mechanisms: false }) })).drugs,
    ).toEqual([]);
  });
  it("resolves a verified alias automatically and asks only when candidates remain ambiguous", async () => {
    const fetcher = (names) => async (url, options) => {
      const { query } = JSON.parse(options.body);
      if (query.includes("FindTarget"))
        return response({ search: { hits: [target, { id: "ENSG00000141736", name: "ERBB2" }] } });
      if (query.includes("TargetAliases"))
        return response({
          t0: { symbolSynonyms: names.map((label) => ({ label })) },
          t1: { symbolSynonyms: [{ label: "HER2" }] },
        });
      return provider()(url, options);
    };
    const result = await searchOnline({ targets: "HER2" }, { fetcher: fetcher([]) });
    expect(result.resolvedTargets[0]).toMatchObject({ id: "ERBB2", aliases: ["HER2"] });
    await expect(
      searchOnline({ targets: "HER2" }, { fetcher: fetcher(["HER2"]) }),
    ).rejects.toMatchObject({ code: "choose_target" });
    const chosen = await searchOnline(
      { targets: "HER2", resolutions: { HER2: target.id } },
      { fetcher: fetcher(["HER2"]) },
    );
    expect(chosen.resolvedTargets[0].id).toBe("EGFR");
  });
  it("keeps complex CD3 separate from subunit searches", async () => {
    const fetcher = provider();
    const result = await searchOnline({ targets: "CD3" }, { fetcher });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.resolvedTargets[0].kind).toBe("complex");
    expect(result.drugs).toHaveLength(3);
  });
  it("reports empty and failed sources rather than silently showing sample results", async () => {
    await expect(
      searchOnline(
        { targets: "unknown" },
        { fetcher: async () => response({ search: { hits: [] } }) },
      ),
    ).rejects.toMatchObject({ code: "unknown_target" });
    await expect(
      searchOnline(
        { targets: "EGFR" },
        { fetcher: async () => Response.json({ errors: [{ message: "schema changed" }] }) },
      ),
    ).rejects.toMatchObject({ code: "upstream_unavailable" });
  });
});
describe("regulatory documents and reports", () => {
  it("provides product-specific links and omits generic regulator portals", () => {
    const docs = evidenceFor(catalog.drugs[0], catalog.sources);
    expect(docs.find((d) => d.agency === "FDA" && d.kind === "review").url).toContain(
      "Orig1s000TOC.html",
    );
    expect(docs.find((d) => d.agency === "EMA" && d.kind === "review").url).toContain(
      "public-assessment-report",
    );
    expect(docs.every((d) => d.status === "document")).toBe(true);
    expect(evidenceFor({ id: "OTHER", name: "A & B" })).toEqual([]);
    expect(evidenceFor({ id: "glofitamab-gxbm", name: "Glofitamab" })).toContainEqual(
      expect.objectContaining({ agency: "NMPA", kind: "approval_notice" }),
    );
  });
  it("retrieves review files, deduplicates and rejects unofficial links", async () => {
    const docs = await fetchFdaDocuments(catalog.drugs[0], {
      fetcher: async () =>
        Response.json({
          results: [
            {
              application_number: "BLA125557",
              submissions: [
                {
                  submission_type: "ORIG",
                  submission_number: "1",
                  application_docs: [
                    {
                      type: "Review",
                      url: "http://www.accessdata.fda.gov/review.pdf",
                      date: "20150112",
                    },
                    { type: "Review", url: "https://example.com/review.pdf" },
                    { type: "Label", url: "https://www.accessdata.fda.gov/label.pdf" },
                    {
                      type: "Letter",
                      url: "https://www.accessdata.fda.gov/letter.pdf",
                      date: "19000101",
                    },
                  ],
                },
              ],
            },
          ],
        }),
    });
    expect(docs).toHaveLength(2);
    expect(docs[1].url).toContain("ApplNo=125557");
    expect(docs[0].url).toBe("https://www.accessdata.fda.gov/review.pdf");
    expect(safeOfficialUrl("javascript:alert(1)")).toBeNull();
    expect(safeOfficialUrl("https://www.accessdata.fda.gov.evil.test/file")).toBeNull();
  });
  it("distinguishes an empty FDA response from an upstream failure", async () => {
    expect(
      await fetchFdaDocuments(catalog.drugs[0], {
        fetcher: async () => new Response(null, { status: 404 }),
      }),
    ).toEqual([]);
    await expect(
      fetchFdaDocuments(catalog.drugs[0], {
        fetcher: async () => new Response(null, { status: 429 }),
      }),
    ).rejects.toThrow("fda_unavailable");
  });
  it("exports human-readable bilingual TXT/Markdown with source URLs and scope", () => {
    for (const locale of ["zh", "en"])
      for (const format of ["txt", "md"]) {
        const report = buildResearchReport({
          drugs: [catalog.drugs[0]],
          sources: catalog.sources,
          targets: ["CD3"],
          locale,
          format,
          exportedAt: "2026-11-11T00:00:00Z",
        });
        expect(report).toContain("blinatumomab");
        expect(report).toContain("public-assessment-report");
        expect(report.startsWith("#")).toBe(format === "md");
        expect(() => JSON.parse(report)).toThrow();
      }
  });
});

describe("research presentation", () => {
  it("shows the complete input and individual targets without offering partial combinations", () => {
    expect(
      researchGroups(searchDrugs({ targets: "CD3 × CD19 × CD20" })).map((item) => item.key),
    ).toEqual(["CD3|CD19|CD20", "CD3", "CD19", "CD20"]);
  });

  it("includes reported single-target records and excludes every record with extra targets", () => {
    const fixture = {
      ...catalog,
      drugs: [
        ...catalog.drugs,
        { ...catalog.drugs[0], id: "one", targetIds: ["CD3"], targetSetComplete: false },
      ],
    };
    const result = searchDrugs({ targets: "CD3", matchMode: "recorded_exact" }, fixture);
    expect(result.drugs.map((drug) => drug.id)).toEqual(["one"]);
    expect(result.combinations[0].matches[0].matchType).toBe("reported");
    const combo = searchDrugs(
      { targets: "CD3 × CD20", matchMode: "recorded_exact" },
      {
        ...fixture,
        drugs: [
          ...fixture.drugs,
          { ...catalog.drugs[0], id: "extra", targetIds: ["CD3", "CD20", "CD19"] },
        ],
      },
    );
    expect(combo.combinations.at(-1).matches.map((item) => item.drugId)).toEqual([
      "mosunetuzumab-axgb",
      "glofitamab-gxbm",
    ]);
  });

  it("includes mechanism-backed clinical records on the research page", async () => {
    const result = await searchOnline(
      { targets: "EGFR", includeClinical: true },
      { fetcher: provider({ stage: "PHASE_3" }) },
    );
    expect(result.drugs[0]).toMatchObject({
      clinicalStage: "PHASE_3",
      approval: { status: "unknown" },
    });
  });

  it("exposes Columvi potency evidence with a precise review link", () => {
    const docs = evidenceFor(
      catalog.drugs.find((d) => d.name === "glofitamab-gxbm"),
      catalog.sources,
    );
    expect(docs.find((d) => d.kind === "activity")).toMatchObject({
      summary: expect.stringContaining("NFAT"),
      url: expect.stringContaining("ChemR.pdf#page=4"),
    });
    expect(docs.some((d) => d.kind === "label")).toBe(false);
  });
});

it("looks up trials by intervention and preserves deduplicated study locations", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      totalCount: 42,
      studies: [
        {
          protocolSection: {
            identificationModule: { nctId: "NCT06084936", briefTitle: "Trial" },
            armsInterventionsModule: { interventions: [{ name: "Glofitamab" }] },
            designModule: { phases: ["PHASE3"] },
            sponsorCollaboratorsModule: { leadSponsor: { name: "Sponsor" } },
            contactsLocationsModule: {
              locations: [{ country: "China" }, { country: "China" }, { country: "France" }],
            },
          },
        },
      ],
    }),
  );
  const result = await fetchDrugTrials({ name: "glofitamab-gxbm" }, { fetcher });
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("query.intr")).toBe("glofitamab");
  expect(result.count).toBe(42);
  expect(result.records[0]).toMatchObject({
    id: "NCT06084936",
    countries: ["China", "France"],
    phases: ["PHASE3"],
    sponsor: "Sponsor",
  });
});

it("prefers original FDA applications and labels review types for the matched ingredient", async () => {
  const application = (application_number, name, filename) => ({
    application_number,
    products: [{ active_ingredients: [{ name }] }],
    submissions: [
      { application_docs: [{ type: "Review", url: `https://www.accessdata.fda.gov/${filename}` }] },
    ],
  });
  const fetcher = vi.fn(async () =>
    Response.json({
      results: [
        application("ANDA200001", "ERLOTINIB HYDROCHLORIDE", "GenericR.pdf"),
        application("NDA200002", "ERLOTINIB AND OTHER", "CombinationR.pdf"),
        application("NDA021743", "ERLOTINIB HYDROCHLORIDE", "021743s000MedR.pdf"),
      ],
    }),
  );
  const docs = await fetchFdaDocuments({ id: "CHEMBL553", name: "ERLOTINIB" }, { fetcher });
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("search")).toContain(
    "application_number:(NDA* OR BLA*)",
  );
  expect(docs).toHaveLength(2);
  expect(docs[0].title).toContain("Clinical review");
  expect(docs[1].url).toContain("ApplNo=021743");
});

it("orders FDA documents by approval status date rather than document date", async () => {
  const submission = (submission_type, submission_status, submission_status_date, filename) => ({
    submission_type,
    submission_status,
    submission_status_date,
    application_docs: [
      { type: "Review", date: "19990101", url: `https://www.accessdata.fda.gov/${filename}` },
    ],
  });
  const docs = await fetchFdaDocuments(catalog.drugs[0], {
    fetcher: async () =>
      Response.json({
        results: [
          {
            application_number: "BLA125557",
            submissions: [
              submission("SUPPL", "AP", "20240614", "later.pdf"),
              submission("ORIG", "AP", "20141203", "initial.pdf"),
              submission("SUPPL", "TA", "20100101", "pending.pdf"),
            ],
          },
        ],
      }),
  });
  expect(docs.map((doc) => doc.approvedAt)).toEqual([
    "2014-12-03",
    "2014-12-03",
    "2024-06-14",
    null,
  ]);
  expect(docs[0].url).toContain("initial.pdf");
});

it("counts only supported pharmacological actions and keeps VEGF blockade apart from payload delivery", () => {
  const counts = Object.fromEntries(
    summarizeMechanisms([
      { name: "Glofitamab-gxbm", mechanisms: ["T cell engager"] },
      {
        name: "Example A",
        mechanisms: ["Vascular endothelial growth factor receptor 2 inhibitor", "VEGF inhibitor"],
      },
      { name: "Example B", mechanisms: ["PD-1 antagonist", "CD137 agonist"] },
      { name: "Example C", mechanisms: ["GLP-1 receptor agonist", "Activin receptor antagonist"] },
      { name: "Example D", mechanisms: ["EGFR binding agent"], targetIds: ["EGFR", "CD3"] },
    ]),
  );
  expect(counts).toEqual({
    effector: 1,
    vegf: 1,
    checkpointBlockade: 1,
    costimulation: 1,
    incretin: 1,
    muscle: 1,
  });
  expect(
    summarizeMechanisms([{ name: "Example conjugate", mechanisms: ["Antibody-drug conjugate"] }]),
  ).toEqual([["payload", 1]]);
});

it("keeps regional source dates separate from global development stage", () => {
  expect(
    approvalMilestones({ id: "glofitamab-gxbm", name: "Glofitamab" }).map(
      ({ region, date, certificate }) => ({ region, date, certificate }),
    ),
  ).toEqual([
    { region: "CN", date: "2023-11-07", certificate: true },
    { region: "US", date: "2023-06-15", certificate: undefined },
    { region: "EU", date: "2023-07-07", certificate: undefined },
  ]);
  const entries = approvalMilestones({ id: "X", name: "Example", clinicalStage: "APPROVAL" }, [
    { agency: "FDA", kind: "review", approvedAt: "2020-01-01" },
    {
      agency: "FDA",
      kind: "application",
      approvedAt: "2022-01-01",
      url: "https://www.accessdata.fda.gov",
    },
  ]);
  expect(entries.map(({ date }) => date)).toEqual([undefined, "2022-01-01", undefined]);
});

it("includes reviewed CD20-only medicines in the example while keeping the combination separate", () => {
  const result = searchDrugs({ targets: "CD3 × CD20", matchMode: "recorded_exact" }, sampleCatalog);
  expect(
    result.combinations.find((group) => group.key === "CD20").matches.map((match) => match.drugId),
  ).toEqual(["rituximab", "obinutuzumab", "ofatumumab", "ocrelizumab", "ublituximab-xiiy"]);
  expect(summarizeMechanisms(sampleCatalog.drugs.filter((drug) => drug.targetIds.join() === "CD20")))
    .toEqual([["cellKilling", 5]]);
  expect(result.combinations.at(-1).matches.map((match) => match.drugId)).toEqual([
    "mosunetuzumab-axgb",
    "glofitamab-gxbm",
  ]);
});

it("merges a reviewed CD20 ingredient into online results without counting its FDA suffix twice", async () => {
  const fetcher = async (_, options) => {
    const { query } = JSON.parse(options.body);
    const gene = { id: "ENSG00000156738", name: "MS4A1" };
    if (query.includes("FindTarget")) return response({ search: { hits: [gene] } });
    return response({
      target: {
        drugAndClinicalCandidates: {
          count: 1,
          rows: [{
            drug: {
              id: "CHEMBL_TEST",
              name: "UBLITUXIMAB",
              maximumClinicalStage: "APPROVAL",
              mechanismsOfAction: {
                rows: [{
                  mechanismOfAction: "CD20-directed cytolytic antibody",
                  targets: [{ id: gene.id, approvedSymbol: gene.name }],
                }],
              },
            },
          }],
        },
      },
    });
  };
  const result = await searchOnline({ targets: "CD20", matchMode: "recorded_exact" }, { fetcher });
  expect(result.combinations[0].matches).toHaveLength(5);
  expect(result.drugs.filter(({ name }) => /ublituximab/i.test(name))).toHaveLength(1);
});

it("adds verified Chinese drug names to Chinese headings, including suffixed biologic names", () => {
  expect(drugHeadingName("BEVACIZUMAB", "zh")).toBe("Bevacizumab（贝伐珠单抗）");
  expect(drugHeadingName("glofitamab-gxbm", "zh")).toBe("Glofitamab-gxbm（格菲妥单抗）");
  expect(drugHeadingName("ocrelizumab", "zh")).toBe("Ocrelizumab（奥瑞利珠单抗）");
  expect(drugHeadingName("ublituximab-xiiy", "zh")).toBe("Ublituximab-xiiy");
  expect(drugHeadingName("bevacizumab", "en")).toBe("Bevacizumab");
});
