import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker.js";
import { evidenceFor, fetchFdaDocuments } from "../src/lib/target-to-assay/evidence.js";
import { fetchDevelopmentProfile } from "../src/lib/target-to-assay/trials.js";

const base = "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2024/";
const url = (file) => base + file;
const json = (value) => Response.json(value);

describe("FDA document identity and ranking", () => {
  it("pins navigation, ranks quality before older reviews, and rejects unverified files", async () => {
    const files = ["021743s000PharmR.pdf", "021743s000TOC.html", "021743s000ChemR.pdf",
      "021743s000ChemR.pdf#page=2", "000001s000ChemR.pdf", "021743s000RiskR.pdf"];
    const fetcher = vi.fn(async (link, options) => {
      if (link.endsWith("TOC.html")) return new Response(`
        <a href="021743s000ClinPharmR.pdf">Clinical Pharmacology Review</a>
        <a href="000001s000ChemR.pdf">Product Quality Review</a>
        <script>
          var pdfBaseName = "021743s000";
          var pdfFiles = { statR: 1, medR: 0 };
          if (pdfFiles.statR == 1) {
            reviewHtml += '<li><a href="' + pdfBaseName + 'StatR.pdf" title="Review">Statistical Review</a> (PDF)</li>';
          }
          if (pdfFiles.medR == 1) {
            reviewHtml += '<li><a href="' + pdfBaseName + 'MedR.pdf" title="Review">Clinical Review</a> (PDF)</li>';
          }
        </script>`, { headers: { "Content-Type": "text/html" } });
      if (options.method === "HEAD") {
        if (link.endsWith("RiskR.pdf")) return new Response(null, { status: 302 });
        return new Response(null, { headers: { "Content-Type": link.endsWith(".html")
          ? "text/html" : "application/pdf" } });
      }
      return json({ results: [{ application_number: "NDA021743",
        products: [{ active_ingredients: [{ name: "Erlotinib hydrochloride" }] }],
        submissions: [{ submission_type: "ORIG", submission_number: "1",
          application_docs: files.map((file, index) => ({ type: "Review", url: url(file),
            date: index === 0 ? "20000101" : "20240101" })) }],
      }] });
    });
    const result = await fetchFdaDocuments({ name: "Erlotinib" }, { fetcher, withStatus: true });
    expect(result.validationFailures).toBe(1);
    expect(result.rows.map(({ kind, category }) => [kind, category])).toEqual([
      ["overview", undefined], ["review_package", undefined],
      ["review", "Product Quality Review"], ["review", "Clinical Pharmacology Review"],
      ["review", "Nonclinical Review"], ["review", "Statistical Review"],
    ]);
    expect(result.rows.every(({ titleZh }) => titleZh === undefined)).toBe(true);
    expect(fetcher.mock.calls.some(([link]) => link === url(files[4]))).toBe(false);
  });

  it("keeps the source-verified Tarlatamab file with the FDA filename discrepancy", () => {
    const docs = evidenceFor({ name: "Tarlatamab-dlle" });
    expect(docs).toContainEqual(expect.objectContaining({ kind: "overview", application: "BLA761344" }));
    expect(docs).toContainEqual(expect.objectContaining({ category: "Multidisciplinary Review",
      application: "BLA761344", submissionType: "SUPPL", url: expect.stringContaining("763144Orig1s001") }));
  });
});

const study = (id, { phases, conditions, names = ["Examplemab"], sponsor = "Example Hospital" }) => ({
  protocolSection: {
    identificationModule: { nctId: id },
    designModule: { studyType: "INTERVENTIONAL", phases },
    conditionsModule: { conditions },
    armsInterventionsModule: { interventions: names.map((name) => ({ name, type: "DRUG" })) },
    sponsorCollaboratorsModule: { leadSponsor: { name: sponsor } },
  },
});
it("keeps combined phases, deduplicates indications, excludes other drugs and Phase 4, and flags pagination", async () => {
  const fetcher = vi.fn(async (link) => {
    const page = Number(new URL(link).searchParams.get("pageToken"));
    const pages = [
      [study("NCT00000001", { phases: ["PHASE2", "PHASE1"], conditions: ["Small Cell Lung Cancer", "SCLC", "Cancer"] })],
      [study("NCT00000002", { phases: ["PHASE4"], conditions: ["Small Cell Lung Carcinoma"], sponsor: "Other Hospital" })],
      [study("NCT00000003", { phases: ["PHASE2"], conditions: ["Unattributable indication"], names: ["Examplemab", "Another drug"] }),
       study("NCT00000004", { phases: ["PHASE3"], conditions: ["Unrelated indication"], names: ["Another drug"] })],
    ];
    return json({ studies: pages[page], nextPageToken: String(page + 1) });
  });
  const result = await fetchDevelopmentProfile({ name: "Examplemab" }, { fetcher });
  expect(result).toMatchObject({
    highestTrialPhase: "PHASE_1_2", researchIndications: ["Small Cell Lung Cancer"],
    sponsors: ["Example Hospital", "Other Hospital"], truncated: true,
    recordIds: ["NCT00000001", "NCT00000002", "NCT00000003"],
  });
  expect(result).not.toHaveProperty("developer");
  expect(result).not.toHaveProperty("approvedIndications");
  expect(fetcher).toHaveBeenCalledTimes(3);
});

const request = (action, body) => worker.fetch(new Request(`https://app.example/api/v1/target-to-assay/${action}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), { ASSETS: { fetch: () => { throw new Error("API request reached static assets"); } } });

afterEach(() => vi.unstubAllGlobals());
it("validates input; distinguishes provider rate limit, timeout and empty results; and caches successful bounded queries", async () => {
  const fetcher = vi.fn(async (link, options) => {
    expect(options.redirect).toBe("manual");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const origin = new URL(link).hostname;
    if (origin === "clinicaltrials.gov") return new Response(null, { status: 429 });
    if (origin === "api.fda.gov") throw new DOMException("Timed out", "TimeoutError");
    return json({ drug_indications: [] });
  });
  vi.stubGlobal("fetch", fetcher);
  expect((await request("chembl-indications", { ids: ["https://invalid.example"] })).status).toBe(422);
  expect((await request("pubmed-literature", { term: "(T OR T)" })).status).toBe(422);
  expect(fetcher).not.toHaveBeenCalled();
  const [trials, fda, chembl] = await Promise.all([
    request("drug-development", { name: "Rate limited fixture" }),
    request("fda-documents", { name: "Timed out fixture" }),
    request("chembl-indications", { ids: ["CHEMBL12345"] }),
  ]);
  expect([trials.status, fda.status, chembl.status]).toEqual([429, 504, 200]);
  expect(await chembl.json()).toMatchObject({ rows: [], state: "success_empty", source: "ChEMBL" });
  await request("chembl-indications", { ids: ["CHEMBL12345"] });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("deduplicates ChEMBL records and preserves source identifiers and truncation", async () => {
  vi.stubGlobal("fetch", async () => json({
    page_meta: { total_count: 55 },
    drug_indications: [
      { molecule_chembl_id: "CHEMBL789", drugind_id: 8, efo_id: "EFO-example", efo_term: "Example condition", max_phase_for_ind: 2 },
      { molecule_chembl_id: "CHEMBL789", drugind_id: 5, efo_id: "EFO-example", efo_term: "Synonym", max_phase_for_ind: 3 },
    ],
  }));
  const response = await request("chembl-indications", { ids: ["CHEMBL789"] });
  expect(await response.json()).toMatchObject({ truncated: true, rows: [{ name: "Synonym", phase: 3, recordId: 5 }] });
});

it("uses only the existing PubMed endpoints and preserves search coverage and record IDs", async () => {
  const fetcher = vi.fn(async (link) => {
    const path = new URL(link);
    expect(path.origin).toBe("https://eutils.ncbi.nlm.nih.gov");
    if (path.pathname.endsWith("esearch.fcgi")) {
      expect(path.searchParams.get("term")).toContain('("PD-1"[Title/Abstract] OR "PDCD1"[Title/Abstract])');
      return json({ esearchresult: { idlist: ["872"], count: "45" } });
    }
    expect(path.pathname).toMatch(/efetch\.fcgi$/);
    expect(path.searchParams.get("id")).toBe("872");
    return new Response("<PubmedArticleSet/>");
  });
  vi.stubGlobal("fetch", fetcher);
  const response = await request("pubmed-literature", { term: '("PD-1"[Title/Abstract] OR "PDCD1"[Title/Abstract])' });
  expect(await response.json()).toMatchObject({
    source: "PubMed", recordIds: ["872"], truncated: true, xml: "<PubmedArticleSet/>",
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([
  ["TIMEOUT", () => { throw new DOMException("Timed out", "TimeoutError"); }, 504, "timeout"],
  ["LIMIT", () => new Response(null, { status: 429 }), 429, "rate_limited"],
  ["UPSTREAM", () => new Response(null, { status: 503 }), 502, "upstream_error"],
  ["MALFORMED", () => json({ esearchresult: { idlist: null } }), 502, "parse_error"],
])("reports PubMed failure %s with a distinct code", async (term, fetcher, status, code) => {
  vi.stubGlobal("fetch", fetcher);
  const response = await request("pubmed-literature", { term: `("${term}"[Title/Abstract])` });
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error: { source: "PubMed", code } });
});

it("returns an empty PubMed response without requesting EFetch", async () => {
  const fetcher = vi.fn(async () => json({ esearchresult: { count: "0", idlist: [] } }));
  vi.stubGlobal("fetch", fetcher);
  const response = await request("pubmed-literature", { term: '("EMPTY FIXTURE"[Title/Abstract])' });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ state: "success_empty", recordIds: [], xml: "" });
  expect(fetcher).toHaveBeenCalledOnce();
});
