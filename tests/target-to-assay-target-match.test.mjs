import { describe, expect, it } from "vitest";
import { sampleCatalog } from "../src/lib/target-to-assay/catalog.js";
import { searchDrugs } from "../src/lib/target-to-assay/search.js";
import { reviewFdaLabels } from "../src/lib/target-to-assay/candidate-review.js";
import { queryMechanisms } from "../src/lib/target-to-assay/live-mechanisms.js";

const target = (id, extra = {}) => ({ id, label: id, aliases: [], ...extra });
const cd3 = target("CD3", { subunits: ["CD3E", "CD3D", "CD3G", "CD247"] });
const il23 = target("IL23", { aliases: ["IL-23"], subunits: ["IL23A", "IL12B"] });
const row = (targetIds, extra = {}) => ({
  targetIds,
  role: "direct",
  sourceType: "chembl",
  ...extra,
});
const assertion = (text, sourceType = "fda_label") =>
  row([], { text, sourceType, allowBindingAssertion: true });
const component = (symbol, targetName) =>
  row([], {
    sourceType: "open_targets",
    rawTargets: [{ approvedSymbol: symbol }],
    targetName,
  });
const medicine = (targetEvidence) => ({
  id: "CHEMBL123",
  name: "Fixturemab",
  brand: "",
  verification: "imported",
  clinicalStage: "APPROVAL",
  approval: { status: "unknown" },
  targetEvidence,
});
const search = (targets, records, inputs = targets.map(({ id }) => id), proposedTargetIds = []) =>
  searchDrugs(
    { targets: inputs, matchMode: "verified_scope", includeClinical: true },
    {
      targets,
      sources: [],
      drugs: [{ ...medicine(records), proposedTargetIds }],
    },
  ).combinations.at(-1);

describe("direct target evidence and complete scope", () => {
  it.each([
    ["PD-1", "PDCD1"],
    ["PD1", "PDCD1"],
    ["PDCD1", "PDCD1"],
    ["CD20", "MS4A1"],
    ["BCMA", "TNFRSF17"],
  ])("normalizes %s to %s", (alias, id) => {
    const result = search(
      [target(id, { aliases: [alias] })],
      [row([alias], { complete: true })],
      [alias],
    );
    expect(result.matches).toEqual([{ drugId: "CHEMBL123", matchType: "exact" }]);
  });

  it.each([
    ["DLL3", "DLL3"],
    ["MS4A1", "CD20"],
    ["CD19", "CD19"],
    ["TNFRSF17", "BCMA"],
  ])("reconciles separate %s and CD3 annotations using a documented binding scope", (id, label) => {
    const targets = [cd3, target(id)];
    const split = [component("CD3E"), row([id])];
    expect(search(targets, split, undefined, ["CD3"]).candidates[0].state).toBe("partial");
    expect(
      search(targets, [
        ...split,
        assertion(
          `Fixturemab is a bispecific T-cell engager that binds to ${label} expressed on the surface of cells, including tumor cells, and CD3 expressed on the surface of T cells.`,
        ),
      ]).matches,
    ).toHaveLength(1);
  });

  it("recognizes two FDA label binding arms without treating cell locations as additional targets", () => {
    const targets = [cd3, target("TNFRSF17")];
    for (const text of [
      "Fixturemab is a bispecific antibody that binds to the CD3 receptor expressed on the surface of T-cells and B-cell maturation antigen (BCMA) expressed on the surface of myeloma cells and some healthy cells.",
      "Fixturemab is a bispecific antibody that binds BCMA on plasma cells, plasmablasts, and myeloma cells and CD3 on T-cells leading to cytolysis of the BCMA-expressing cells.",
    ]) expect(search(targets, [assertion(text)]).matches).toHaveLength(1);
  });

  it("upgrades an explicitly three-arm drug and does not reuse a two-arm statement for three", () => {
    const targets = [cd3, target("DLL3"), target("ERBB2")];
    const dual = assertion("Fixturemab is bispecific and binds CD3 and DLL3.");
    const triple = assertion(
      "Fixturemab is trispecific and binds CD3, DLL3, and ERBB2.",
      "clinical_trial",
    );
    expect(search(targets, [dual]).candidates[0].supported).toEqual(["CD3", "DLL3"]);
    expect(search(targets, [triple]).matches).toHaveLength(1);
    expect(
      search(targets.slice(0, 2), [row(["CD3", "DLL3", "ERBB2"], { complete: true })]).candidates[0]
        .reason,
    ).toBe("additional_direct_targets");
  });

  it.each([
    [cd3, ["CD3E", "CD3D"], "CD3"],
    [il23, ["IL23A", "IL12B"], "IL-23"],
    [target("IL2R", { subunits: ["IL2RA", "IL2RB", "IL2RG"] }), ["IL2RA"], "IL2R"],
  ])(
    "requires named complex scope rather than membership alone: %j",
    (complex, subunits, label) => {
      const records = subunits.map((id) => component(id));
      expect(search([complex], records, undefined, [complex.id]).matches).toHaveLength(0);
      expect(search([complex], [component(subunits[0], label)]).candidates[0]).toMatchObject({
        state: "unverified",
        reason: "scope_not_established",
      });
      expect(
        search([complex], [assertion(`Fixturemab is monospecific and binds ${label}.`)]).matches,
      ).toHaveLength(1);
    },
  );

  it.each(["payload", "indirect"])("excludes a %s arm", (role) => {
    const targets = [target("ERBB2"), target("TUBB")];
    const records = [row(["ERBB2"], { complete: true }), row(["TUBB"], { role })];
    expect(search(targets, records).candidates[0].state).toBe("partial");
    expect(search(targets, records, ["TUBB"]).candidates[0].reason).toBe("non_direct_relationship");
    expect(search(targets, records, ["ERBB2"]).matches).toHaveLength(1);
  });

  it("does not infer completeness from an exact-looking union or from a single record", () => {
    const targets = [target("ERBB2"), target("EGFR")];
    expect(search(targets, [row(["ERBB2"]), row(["EGFR"])]).candidates[0].reason).toBe(
      "scope_not_established",
    );
    expect(search(targets, [row(["ERBB2"])]).candidates[0].state).toBe("partial");
    expect(
      search(targets, [assertion("Fixturemab is bispecific and may bind ERBB2 and EGFR.")]).matches,
    ).toHaveLength(0);
  });

  it("uses stable IDs before labels, keeps ambiguous aliases unresolved, and flags conflicting sources", () => {
    const a = target("A", { ensemblId: "ENSG000001", aliases: ["shared"] });
    const b = target("B", { ensemblId: "ENSG000002", aliases: ["shared"] });
    const raw = [{ id: a.ensemblId, approvedSymbol: "B" }];
    expect(
      search([a, b], [row([], { rawTargets: raw, complete: true })], ["A"]).matches,
    ).toHaveLength(1);
    expect(
      search([a, b], [assertion("Fixturemab is monospecific and binds shared.")], ["A"]).matches,
    ).toHaveLength(0);
    const conflict = [
      row(["A"], { complete: true, actionType: "AGONIST" }),
      row(["A"], { sourceType: "open_targets", actionType: "ANTAGONIST" }),
    ];
    expect(search([a, b], conflict, ["A"]).candidates[0].state).toBe("conflict");
  });

  const pool = ["ITGA2", "PLAUR", "DDR1", "MERTK", "SIGLEC7", "CCR8", "EPHA2", "LRP1"];
  // Seeded draws make unexpected combinations reproducible.
  let seed = 117;
  const sampled = Array.from({ length: 5 }, () => {
    const remaining = [...pool];
    return Array.from({ length: 3 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return remaining.splice(seed % remaining.length, 1)[0];
    });
  });
  it.each(sampled)("tests a seeded three-target draw: %s, %s, %s", (...ids) => {
    const targets = ids.map((id) => target(id));
    expect(
      search(targets, [assertion(`Fixturemab is trispecific and binds ${ids.join(", ")}.`)])
        .matches,
    ).toHaveLength(1);
    expect(
      search(
        targets,
        ids.map((id) => row([id])),
      ).candidates[0].state,
    ).toBe("unverified");
  });
});

it("verifies only an identity-matched FDA label and preserves its reference", async () => {
  const drug = medicine([row(["DLL3"])]);
  const set_id = "00000000-0000-0000-0000-000000000001";
  const label = {
    set_id,
    openfda: { generic_name: ["Fixturemab-abcd"] },
    mechanism_of_action: ["Fixturemab-abcd is bispecific and binds DLL3 and CD3."],
  };
  const run = (labels) =>
    reviewFdaLabels([drug], [cd3, target("DLL3")], {
      fetcher: async () => Response.json({ results: labels }),
      signal: AbortSignal.timeout(1000),
    });
  const rejected = await run([{ ...label, openfda: { generic_name: ["Anothermab"] } }]);
  expect(rejected.verified.size).toBe(0);
  const reviewed = await run([label]);
  const evidence = reviewed.verified.get(drug.id);
  expect(evidence[0].references[0].ids).toEqual([set_id]);
  expect(search([cd3, target("DLL3")], [...drug.targetEvidence, ...evidence]).matches).toHaveLength(
    1,
  );
});

it("merges split Open Targets evidence then upgrades through the live API's label review", async () => {
  const dll3Id = "ENSG00000090932";
  const cdeId = "ENSG00000198851";
  const calls = [];
  const result = await queryMechanisms(
    { targets: "DLL3 × CD3" },
    {
      fetcher: async (rawUrl, options) => {
        const url = new URL(rawUrl);
        if (url.hostname === "rest.uniprot.org")
          return Response.json({
            results: [
              {
                primaryAccession: "Q9NYJ7",
                organism: { taxonId: 9606 },
                genes: [{ geneName: { value: "DLL3" } }],
                uniProtKBCrossReferences: [
                  { database: "Ensembl", properties: [{ key: "GeneId", value: dll3Id }] },
                ],
              },
            ],
          });
        if (url.hostname === "api.platform.opentargets.org") {
          const { query, variables } = JSON.parse(options.body);
          if (!query.includes("TargetDrugs")) return new Response(null, { status: 404 });
          const id = variables.id;
          calls.push(id);
          return Response.json({
            data: {
              target: {
                drugAndClinicalCandidates: {
                  count: 1,
                  rows: [
                    {
                      drug: {
                        id: "CHEMBL123",
                        name: "Fixturemab",
                        maximumClinicalStage: "APPROVAL",
                        mechanismsOfAction: {
                          rows: [
                            {
                              actionType: "BINDING AGENT",
                              mechanismOfAction: "Binding agent",
                              targets: [{ id, approvedSymbol: id === cdeId ? "CD3E" : "DLL3" }],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        if (url.hostname === "api.fda.gov")
          return Response.json({
            results: [
              {
                set_id: "00000000-0000-0000-0000-000000000001",
                openfda: { generic_name: ["Fixturemab-abcd"] },
                mechanism_of_action: [
                  "Fixturemab-abcd is a bispecific T-cell engager that binds DLL3 and CD3.",
                ],
              },
            ],
          });
        return new Response(null, { status: 429 });
      },
    },
  );
  expect(calls).toEqual(expect.arrayContaining([cdeId, dll3Id]));
  const drug = result.catalog.drugs.find(({ id }) => id === "CHEMBL123");
  expect(
    drug.targetEvidence
      .flatMap(({ rawTargets }) => rawTargets || [])
      .map(({ id }) => id)
      .sort(),
  ).toEqual([dll3Id, cdeId]);
  expect(drug.targetIds.sort()).toEqual(["CD3", "DLL3"]);
  expect(
    searchDrugs(
      { targets: "DLL3 × CD3", matchMode: "verified_scope", includeClinical: true },
      result.catalog,
    ).combinations.at(-1).matches,
  ).toEqual([{ drugId: drug.id, matchType: "exact" }]);
  expect(result.drugMechanisms.find(({ drugId }) => drugId === drug.id).completeTargetSet).toBe(
    true,
  );
});

it("keeps CAR antigen scope independent of cell activation and signalling proteins", () => {
  const targets = [target("CD19"), target("CD247")];
  const records = [
    assertion("The CAR T product specifically recognizes only CD19."),
    row(["CD247"], { role: "indirect" }),
  ];
  expect(search(targets, records, ["CD19"]).matches).toHaveLength(1);
  expect(search(targets, records).candidates[0].state).toBe("partial");
});

it("does not equate an ADC inhibitor record with a documented antibody binding arm", () => {
  const targets = [target("ERBB2"), target("TUBB")];
  const drug = {
    ...medicine([
      row(["ERBB2"], { complete: true }),
      row(["TUBB"], { actionType: "INHIBITOR", text: "Tubulin inhibitor" }),
    ]),
    molecularFormat: "antibody-drug conjugate",
  };
  const result = searchDrugs(
    { targets: ["ERBB2", "TUBB"], matchMode: "verified_scope", includeClinical: true },
    { targets, drugs: [drug], sources: [] },
  );
  expect(result.combinations.find(({ key }) => key === "ERBB2").matches).toHaveLength(1);
  expect(result.combinations.at(-1).candidates[0].supported).toEqual(["ERBB2"]);
});

it("does not let a newer assertion hide an independently documented additional direct target", () => {
  const targets = [target("EGFR"), target("ERBB2"), target("MET")];
  const records = [assertion("Fixturemab is bispecific and binds EGFR and ERBB2."), row(["MET"])];
  expect(search(targets, records, ["EGFR", "ERBB2"]).candidates[0].state).toBe("conflict");
});

it.each(["PDCD1", "MS4A1", "PCSK9"])("separates direct %s evidence from completeness without promoting weak records", (id) => {
  const queried = target(id);
  const records = [row([id])];
  expect(search([queried], records)).toMatchObject({
    matches: [{ drugId: "CHEMBL123", matchType: "direct" }],
    candidates: [],
  });
  expect(search([queried], [row([id], { role: "unverified" })]).matches).toEqual([]);
  expect(search([queried], [row([id], { actionType: "AGONIST" }),
    row([id], { actionType: "ANTAGONIST", sourceType: "open_targets" })]).candidates[0].state).toBe("conflict");
});

it.each(["DLL3", "MS4A1", "TNFRSF17"])("keeps CD3 × %s strict", (id) => {
  const targets = [cd3, target(id)];
  expect(search(targets, [row(["CD3"]), row([id])]).matches).toEqual([]);
  expect(search(targets, [row(["CD3", id], { complete: true })]).matches).toHaveLength(1);
});

it("uses one partition for the three PD-1 aliases and excludes indirect or proposed relationships", () => {
  const drugs = ["Camrelizumab", "Cemiplimab", "Dostarlimab"].map((name, index) => ({
    ...medicine([row(["PDCD1"], { sourceType: index ? "open_targets" : "chembl" })]),
    id: name, name,
  }));
  const indirect = { ...medicine([row(["PDCD1"], { role: "indirect" })]), id: "indirect" };
  const proposed = { ...medicine(undefined), id: "proposed", targetIds: ["PDCD1"], proposedTargetIds: ["PDCD1"] };
  for (const alias of ["PD-1", "PDCD1", "PD1"]) {
    const [combo] = searchDrugs({ targets: alias, matchMode: "verified_scope", includeClinical: true },
      { targets: [target("PDCD1")], sources: [], drugs: [...drugs, indirect, proposed] }).combinations;
    expect(combo.targetIds).toEqual(["PDCD1"]);
    expect(combo.matches).toEqual(drugs.map(({ id }) => ({ drugId: id, matchType: "direct" })));
    expect(combo.candidates).toMatchObject([
      { drugId: "indirect", reason: "non_direct_relationship" },
      { drugId: "proposed", reason: "no_direct_evidence" },
    ]);
  }
});

it("keeps reviewed CD3 bispecifics out of single-target groups and keeps the complete groups order-independent", () => {
  const lookup = (targets) => searchDrugs({ targets, matchMode: "verified_scope" }, sampleCatalog).combinations.at(-1);
  expect(lookup("CD3").matches).toEqual([]);
  expect(lookup("CD3").candidates).toEqual(expect.arrayContaining([
    ["blinatumomab", "CD19"], ["mosunetuzumab-axgb", "CD20"], ["glofitamab-gxbm", "CD20"],
  ].map(([drugId, partner]) => ({
    drugId, state: "other", reason: "additional_direct_targets", supported: ["CD3"], extra: [partner],
  }))));
  expect(lookup("CD20").matches).toContainEqual({ drugId: "rituximab", matchType: "exact" });
  expect(lookup("CD20").candidates.map(({ drugId }) => drugId)).toContain("mosunetuzumab-axgb");
  expect(lookup("CD20 × CD3")).toEqual(lookup("CD3 × CD20"));
  expect(lookup("CD20 × CD3").matches).toContainEqual({ drugId: "glofitamab-gxbm", matchType: "exact" });
  expect(lookup("CD19 × CD3").matches).toContainEqual({ drugId: "blinatumomab", matchType: "exact" });
  expect(lookup("CD3 × CD19 × CD20").matches).toEqual([]);
});

it("keeps independent TL1A and OSMR records outside the complete combination", () => {
  const targets = [target("TNFSF15", { aliases: ["TL1A"] }), target("OSMR")];
  expect(search(targets, [row(["TL1A"]), row(["OSMR"])], ["TL1A", "OSMR"])).toMatchObject({
    matches: [],
    candidates: [{ state: "unverified", reason: "scope_not_established", supported: ["OSMR", "TNFSF15"] }],
  });
});
