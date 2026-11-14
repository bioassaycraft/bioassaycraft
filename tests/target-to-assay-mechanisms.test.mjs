import { describe, expect, it, vi } from "vitest";
import { queryMechanisms } from "../src/lib/target-to-assay/live-mechanisms.js";
import { searchDrugs } from "../src/lib/target-to-assay/search.js";
import {
  discoverTrialInterventions,
  fetchDrugTrials,
  reconcileTrialInterventions,
} from "../src/lib/target-to-assay/trials.js";
import { handleTargetToAssay } from "../src/worker/target-to-assay-api.js";

const protein = (symbol, accession, taxonId = 9606) => ({
  primaryAccession: accession,
  organism: { taxonId },
  genes: [{ geneName: { value: symbol } }],
  proteinDescription: { recommendedName: { fullName: { value: symbol } } },
  comments: [{ commentType: "FUNCTION", texts: [{ value: "Test annotation." }] }],
});
const unavailable = () => new Response(null, { status: 429 });
const pathway = {
  stId: "R-HSA-202403",
  displayName: "TCR signaling",
  summation: [{ text: "Test pathway." }],
};
const matches = (result, targets) =>
  searchDrugs(
    { targets, includeClinical: true, matchMode: "recorded_exact" },
    result.catalog,
  ).combinations.at(-1).matches;

describe("live target-to-assay evidence", () => {
  it("resolves human targets and keeps function and molecule evidence independent", async () => {
    const fetcher = vi.fn(async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "rest.uniprot.org") {
        expect(url.searchParams.get("query")).toContain("organism_id:9606");
        return Response.json({
          results: [protein("MS4A1", "P11836"), protein("MS4A1", "P00001", 10090)],
        });
      }
      if (url.pathname.endsWith("/query/R-HSA-202403")) return Response.json(pathway);
      if (url.pathname.endsWith("/P11836/pathways"))
        return Response.json([
          { stId: "R-HSA-983695", displayName: "B-cell pathway" },
          { stId: "R-MMU-1", displayName: "Mouse pathway" },
          { stId: "R-HSA-2", displayName: "Inferred pathway", isInferred: true },
        ]);
      return unavailable();
    });
    const result = await queryMechanisms({ targets: "CD20 × CD3" }, { fetcher });
    expect(result.resolvedTargets).toEqual([
      expect.objectContaining({ id: "MS4A1", uniprotIds: ["P11836"] }),
      expect.objectContaining({ id: "CD3", entityType: "protein_complex", uniprotIds: [] }),
    ]);
    expect(result.targetBiology[0].pathways.map(({ id }) => id)).toEqual(["R-HSA-983695"]);
    expect(result.targetBiology[0].biologicalFunctions[0].source.recordId).toBe("P11836");
    expect(matches(result, ["CD3", "MS4A1"]).map(({ drugId }) => drugId)).toEqual([
      "mosunetuzumab-axgb",
      "glofitamab-gxbm",
      "epcoritamab-bysp",
      "odronextamab",
    ]);
    expect(result.partialFailures).toEqual(["HGNC", "ChEMBL", "Open Targets"]);
    expect(result.drugMechanisms.find(({ drugId }) => drugId === "odronextamab")).toMatchObject({
      completeTargetSet: true,
      developmentStatus: {
        regulatoryApprovals: [{ agency: "EMA" }],
      },
    });
  });

  it("does not combine distinct molecule records into a full combination mechanism", async () => {
    const fetcher = async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "rest.uniprot.org") {
        const left = url.searchParams.get("query").includes("TNFSF15");
        return Response.json({
          results: [left ? protein("TNFSF15", "O95150") : protein("OSMR", "Q99650")],
        });
      }
      if (url.hostname === "reactome.org") return Response.json([]);
      if (url.pathname.endsWith("/target/search.json")) return Response.json({ targets: [] });
      if (url.pathname.endsWith("target.json"))
        return Response.json({
          targets: [
            {
              target_chembl_id: "CHEMBL1",
              target_type: "SINGLE PROTEIN",
              organism: "Homo sapiens",
              target_components: [{ accession: "O95150" }],
            },
            {
              target_chembl_id: "CHEMBL2",
              target_type: "SINGLE PROTEIN",
              organism: "Homo sapiens",
              target_components: [{ accession: "Q99650" }],
            },
          ],
        });
      if (url.pathname.endsWith("mechanism.json"))
        return Response.json({
          mechanisms: [
            {
              molecule_chembl_id: "CHEMBL3",
              target_chembl_id: "CHEMBL1",
              direct_interaction: true,
              mechanism_of_action: "Test one",
              action_type: "ANTAGONIST",
            },
            {
              molecule_chembl_id: "CHEMBL3",
              target_chembl_id: "CHEMBL2",
              direct_interaction: 1,
              mechanism_of_action: "Test two",
              action_type: "ANTAGONIST",
            },
            {
              molecule_chembl_id: "CHEMBL3",
              target_chembl_id: "CHEMBL2",
              direct_interaction: false,
              mechanism_of_action: "Skip",
            },
          ],
        });
      return Response.json({
        molecules: [{ molecule_chembl_id: "CHEMBL3", pref_name: "Fixture drug", max_phase: 2 }],
      });
    };
    const result = await queryMechanisms({ targets: "TL1A × OSMR" }, { fetcher });
    expect(result.sourceStatus).toMatchObject({ UniProt: "ok", Reactome: "empty", ChEMBL: "ok" });
    expect(result.drugMechanisms.map(({ targetIds }) => targetIds)).toEqual([
      ["TNFSF15"],
      ["OSMR"],
    ]);
    expect(matches(result, ["TNFSF15", "OSMR"])).toEqual([]);
    expect(result.relatedDrugs[0].approval.status).toBe("unknown");
  });

  it("preserves empty, unresolved, timed out, and not-queried states", async () => {
    const noMatch = await queryMechanisms(
      { targets: "TestUnknown" },
      {
        fetcher: async () => Response.json({ results: [] }),
      },
    );
    expect(noMatch.sourceStatus).toMatchObject({ UniProt: "empty", Reactome: "not_queried" });
    expect(noMatch.resolvedTargets[0].resolutionStatus).toBe("unresolved");

    const error = new DOMException("Timed out", "TimeoutError");
    const allDown = await queryMechanisms(
      { targets: "CD3 × PCSK9" },
      {
        fetcher: async () => {
          throw error;
        },
      },
    );
    expect(allDown.partialFailures).toEqual([
      "UniProt",
      "HGNC",
      "Reactome",
      "Open Targets",
    ]);
    expect(allDown.resolvedTargets.map(({ resolutionStatus }) => resolutionStatus)).toEqual([
      "resolved",
      "failed",
    ]);
    expect(allDown.targetBiology[0].pathwayStatus).toBe("failed");
  });

  it("separates transport, provider, parsing and resolution outcomes", async () => {
    const xref = [
      { database: "Ensembl", properties: [{ key: "GeneId", value: "ENSG00000169174" }] },
    ];
    const fetcher = async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "rest.uniprot.org")
        return Response.json({
          results: url.searchParams.get("query").includes("PCSK9")
            ? [{ ...protein("PCSK9", "Q8NBP7"), uniProtKBCrossReferences: xref }]
            : [],
        });
      if (url.hostname === "reactome.org") return new Response("invalid JSON");
      if (url.hostname === "api.platform.opentargets.org")
        return Response.json({ data: { target: null }, errors: [{ message: "Provider failed" }] });
      return new Response(null, { status: 429 });
    };
    const result = await queryMechanisms({ targets: "PCSK9 × UnknownAlias" }, { fetcher });
    expect(result.sourceChecks).toMatchObject({
      UniProt: [{ state: "success_with_data" }, { state: "unresolved_target" }],
      Reactome: [{ state: "parse_error" }],
      ChEMBL: [{ state: "rate_limited", status: 429 }],
      "Open Targets": [{ state: "upstream_error", reason: "graphql_errors" }],
    });
    expect(result.targetBiology[0].biologicalFunctions[0].source.recordId).toBe("Q8NBP7");
  });

  it("propagates cancellation and distinguishes it from timeouts and connection failures", async () => {
    const controller = new AbortController();
    controller.abort();
    const cancelled = await queryMechanisms(
      { targets: "PCSK9" },
      {
        signal: controller.signal,
        fetcher: async (_, { signal }) => signal.throwIfAborted(),
      },
    );
    expect(cancelled.sourceChecks.UniProt[0].state).toBe("cancelled");
    const failed = await queryMechanisms(
      { targets: "CD3 × PCSK9" },
      {
        fetcher: async (url) => {
          if (new URL(url).hostname === "reactome.org") throw new TypeError("network error");
          throw new DOMException("Timed out", "TimeoutError");
        },
      },
    );
    expect(failed.sourceChecks).toMatchObject({
      UniProt: [{ state: "timeout" }],
      Reactome: [{ state: "unavailable" }],
      ChEMBL: [],
      "Open Targets": [{ targetId: "CD3E", state: "timeout" }],
    });
  });

  it("records provider redirects without following them", async () => {
    const fetcher = vi.fn(async (_, options) => {
      expect(options.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { Location: "https://example.test" } });
    });
    const result = await queryMechanisms({ targets: "PCSK9" }, { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.sourceErrors.UniProt).toEqual([{ input: "PCSK9", code: "upstream_302" }]);
  });

  it("requires confirmation when a reviewed identity is ambiguous", async () => {
    const entries = [
      {
        ...protein("ABC1", "P10001"),
        genes: [{ geneName: { value: "ABC1" }, synonyms: [{ value: "ABC" }] }],
      },
      {
        ...protein("ABC2", "P10002"),
        genes: [{ geneName: { value: "ABC2" }, synonyms: [{ value: "ABC" }] }],
      },
    ];
    const fetcher = async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname !== "rest.uniprot.org") return unavailable();
      return Response.json({
        results: url.searchParams.get("query").includes("accession:P10002")
          ? [entries[1]]
          : entries,
      });
    };
    await expect(queryMechanisms({ targets: "ABC" }, { fetcher })).rejects.toMatchObject({
      code: "choose_target",
      details: { candidates: [{ id: "P10001" }, { id: "P10002" }] },
    });
    const resolved = await queryMechanisms(
      { targets: "ABC", resolutions: { ABC: "P10002" } },
      { fetcher },
    );
    expect(resolved.resolvedTargets[0].id).toBe("ABC2");
  });

  it("prioritizes the approved HGNC alias and keeps mechanism-free associations discoverable", async () => {
    const ensembl = "ENSG00000188389";
    const pdcd1 = {
      ...protein("PDCD1", "Q15116"),
      uniProtKBCrossReferences: [
        {
          database: "Ensembl",
          properties: [
            { key: "GeneId", value: ensembl },
            { key: "GeneId", value: "ENSG00000276977" },
          ],
        },
      ],
    };
    const fetcher = async (rawUrl, request) => {
      const url = new URL(rawUrl);
      if (url.hostname === "rest.genenames.org") {
        const gene = {
          status: "Approved",
          symbol: "PDCD1",
          hgnc_id: "HGNC:8760",
          alias_symbol: ["PD-1"],
          ensembl_gene_id: ensembl,
        };
        return Response.json({ response: { numFound: 1, docs: [gene] } });
      }
      if (url.hostname === "rest.uniprot.org")
        return Response.json({
          results: [
            url.searchParams.get("query").includes("PDCD1") ? pdcd1 : protein("RPL17", "P18621"),
          ],
        });
      if (url.hostname === "www.proteinatlas.org")
        return Response.json({
          Ensembl: ensembl,
          "RNA single cell type specific nCPM": { "T-cells": 12 },
          "Protein tissue specific Intensity": { spleen: 2 },
        });
      if (url.hostname === "api.platform.opentargets.org") {
        if (JSON.parse(request.body).query.includes("TargetAssociations"))
          return Response.json({ data: { target: { associatedDiseases: { rows: [] } } } });
        return Response.json({
          data: {
            target: {
              drugAndClinicalCandidates: {
                count: 2,
                rows: [
                  { drug: { id: "CHEMBL100", name: "Testcode", maximumClinicalStage: "PHASE_2" } },
                ],
              },
            },
          },
        });
      }
      if (url.hostname === "reactome.org") return Response.json([]);
      return unavailable();
    };
    const result = await queryMechanisms({ targets: "PD-1" }, { fetcher });
    expect(result.resolvedTargets[0]).toMatchObject({
      id: "PDCD1",
      canonicalId: ensembl,
      hgncId: "HGNC:8760",
    });
    expect(result.targetBiology[0].expressionProfiles.map(({ kind }) => kind)).toEqual([
      "single_cell_rna",
      "tissue_protein",
    ]);
    expect(result.catalog.drugs.find(({ id }) => id === "CHEMBL100")).toMatchObject({
      targetIds: [],
      proposedTargetIds: ["PDCD1"],
    });
    expect(matches(result, ["PDCD1"])).toEqual([]);
    expect(result.sourceChecks["Open Targets"][0]).toMatchObject({
      count: 2,
      returned: 1,
      truncated: true,
    });
  });

  it("uses the source's gene identity for symbols and aliases, without merging the VEGF family", async () => {
    const ensembl = "ENSG00000112715";
    const aliases = ["VEGF", "VPF"];
    const gene = {
      status: "Approved", symbol: "VEGFA", hgnc_id: "HGNC:12680",
      name: "vascular endothelial growth factor A", ensembl_gene_id: ensembl,
      alias_symbol: aliases, alias_name: ["vascular permeability factor"],
    };
    const fetcher = async (rawUrl, request) => {
      const url = new URL(rawUrl);
      if (url.hostname === "rest.genenames.org") {
        const docs = url.pathname.startsWith("/fetch/symbol/") && !url.pathname.endsWith("/VEGFA")
          ? [] : [gene];
        return Response.json({ response: { numFound: docs.length, docs } });
      }
      if (url.hostname === "rest.uniprot.org")
        return Response.json({ results: [protein("VEGFA", "P15692")] });
      if (url.pathname.endsWith("/target.json")) return unavailable();
      if (url.pathname.endsWith("/target/search.json")) {
        const term = url.searchParams.get("q");
        const target = (id, accession) => ({
          target_chembl_id: id, organism: "Homo sapiens", target_type: "SINGLE PROTEIN",
          target_components: [{ accession }],
        });
        const rows = term === "VPF" ? [target("CHEMBL401", "P15692"), target("CHEMBL999", "P49765")]
          : term === "vascular permeability factor" ? [target("CHEMBL401", "P15692"), target("CHEMBL402", "P15692")]
          : [];
        return Response.json({ targets: rows });
      }
      if (url.pathname.endsWith("/mechanism.json")) {
        const ids = url.searchParams.get("target_chembl_id__in");
        if (!ids) return Response.json({ mechanisms: [] });
        expect(ids.split(",").sort()).toEqual(["CHEMBL401", "CHEMBL402"]);
        return Response.json({ mechanisms: ids.split(",").map((id, index) => ({
          target_chembl_id: id, molecule_chembl_id: index ? "CHEMBL125" : "CHEMBL123",
          direct_interaction: true, action_type: "INHIBITOR", mechanism_of_action: "VEGFA inhibitor",
        })) });
      }
      if (url.pathname.endsWith("/molecule.json")) return Response.json({ molecules: [
        { molecule_chembl_id: "CHEMBL123", pref_name: "Fixturemab", max_phase: 4 },
        { molecule_chembl_id: "CHEMBL125", pref_name: "Alias drug", max_phase: 4 },
      ] });
      if (url.hostname === "api.platform.opentargets.org") {
        const { query, variables } = JSON.parse(request.body);
        expect(variables.id).toBe(ensembl);
        if (query.includes("TargetAssociations"))
          return Response.json({ data: { target: { associatedDiseases: { rows: [] } } } });
        return Response.json({ data: { target: { drugAndClinicalCandidates: {
          count: 1, rows: [{ drug: {
            id: "CHEMBL123", name: "Fixturemab", maximumClinicalStage: "APPROVAL",
            mechanismsOfAction: { rows: [{
              mechanismOfAction: "VEGFA inhibitor", actionType: "INHIBITOR",
              targets: [{ id: ensembl, approvedSymbol: "VPF" }],
            }] },
          } }],
        } } } });
      }
      return unavailable();
    };

    for (const input of ["VEGFA", ...aliases, ...gene.alias_name]) {
      const result = await queryMechanisms({ targets: input }, { fetcher });
      expect(result.resolvedTargets).toMatchObject([{ id: "VEGFA", canonicalId: ensembl }]);
      const [group] = searchDrugs(
        { targets: input, matchMode: "verified_scope", includeClinical: true }, result.catalog,
      ).combinations;
      expect(group).toMatchObject({
        targetIds: ["VEGFA"], candidates: [],
        matches: [
          { drugId: "CHEMBL123", matchType: "direct" },
          { drugId: "CHEMBL125", matchType: "direct" },
        ],
      });
    }
    const sharedAlias = async (rawUrl) => {
      const { pathname } = new URL(rawUrl);
      const other = { ...gene, symbol: "VEGFB", hgnc_id: "HGNC:12681" };
      const docs = pathname.endsWith("/VEGFA") ? [gene]
        : pathname.endsWith("/VEGFB") ? [other]
        : pathname.startsWith("/search/") ? [gene, other] : [];
      return Response.json({ response: { numFound: docs.length, docs } });
    };
    await expect(queryMechanisms({ targets: "VEGF" }, { fetcher: sharedAlias })).rejects.toMatchObject({
      code: "choose_target",
      details: { candidates: [{ name: "VEGFA" }, { name: "VEGFB" }] },
    });

    const family = await queryMechanisms({ targets: "VEGF family" }, { fetcher });
    expect(family.resolvedTargets[0].id).toBe("VEGF-family");
  });

  it("keeps trial keyword hits unverified and reconciles only unique exact intervention names", async () => {
    const result = await discoverTrialInterventions(
      [{ id: "EXAMPLE", inputName: "Example", synonyms: [], resolutionStatus: "resolved" }],
      {
        signal: AbortSignal.timeout(1000),
        fetcher: async () =>
          Response.json({
            totalCount: 3,
            nextPageToken: "next",
            studies: [
              {
                protocolSection: {
                  identificationModule: { nctId: "NCT00000001" },
                  designModule: { studyType: "INTERVENTIONAL", phases: ["PHASE2"] },
                  armsInterventionsModule: {
                    interventions: [
                      { type: "BIOLOGICAL", name: "First code", otherNames: ["Study alias"] },
                      { type: "DRUG", name: "First-code", otherNames: [] },
                      { type: "DRUG", name: "Placebo", otherNames: [] },
                    ],
                  },
                },
              },
            ],
          }),
      },
    );
    const drugs = [{ name: "Drug A", aliases: ["Study alias"] }];
    expect(reconcileTrialInterventions(drugs, result.rows).map(({ name }) => name)).toEqual([
      "First-code",
    ]);
    expect(drugs[0].clinicalEvidence[0].id).toBe("NCT00000001");
    expect(result).toMatchObject({
      state: "success_with_data",
      total: 3,
      returned: 1,
      truncated: true,
    });
  });

  it("validates the Worker request before fetching a provider", async () => {
    const url = "https://example.test/api/v1/target-to-assay/mechanisms";
    const response = await handleTargetToAssay(
      new Request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: 'PCSK9" OR *' }),
      }),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: { code: "invalid_targets" } });
    expect((await handleTargetToAssay(new Request(url))).status).toBe(405);
  });

  it("verifies intervention aliases and current status per ClinicalTrials.gov record", async () => {
    const study = (nctId, name, otherNames, overallStatus) => ({
      protocolSection: {
        identificationModule: { nctId },
        designModule: { studyType: "INTERVENTIONAL" },
        armsInterventionsModule: { interventions: [{ name, otherNames }] },
        statusModule: { overallStatus },
      },
    });
    const result = await fetchDrugTrials(
      { name: "epcoritamab-bysp", aliases: ["GEN3013"] },
      {
        fetcher: async () =>
          Response.json({
            studies: [
              study("NCT06458439", "Investigational antibody", ["GEN3013"], "RECRUITING"),
              study("NCT00000001", "Other epcoritamab-like intervention", [], "RECRUITING"),
              study("NCT03625037", "Epcoritamab", [], "COMPLETED"),
            ],
          }),
      },
    );
    expect(
      result.records.map(({ id, ongoingInterventional }) => [id, ongoingInterventional]),
    ).toEqual([
      ["NCT06458439", true],
      ["NCT03625037", false],
    ]);
  });
});
