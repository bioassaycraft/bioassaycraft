import { expect, it } from "vitest";
import { fetchDrugSupplement } from "../src/lib/target-to-assay/drug-supplement.js";
import { investigationalGroups } from "../src/lib/target-to-assay/investigational.js";

it("retains NCI evidence for an explicitly bound subunit and ignores contextual mentions", async () => {
  const definition = "Foralumab binds to CD3 epsilon on T cells. CD20 is another marker.";
  const fetcher = async () => Response.json({ total: 1, concepts: [{
    code: "C95785", name: "Foralumab", terminology: "ncit", active: true,
    definitions: [{ definition, source: "NCI" }],
    properties: [
      { type: "Semantic_Type", value: "Pharmacologic Substance" },
      { type: "FDA_UNII_Code", value: "J43DL56H6M" },
    ],
  }] });
  const { evidence, issues } = await fetchDrugSupplement({ name: "Foralumab" }, { fetcher });
  expect(issues).toEqual({});
  expect(evidence.targets).toEqual([expect.objectContaining({
    value: ["CD3E"], sourceId: "C95785",
    url: "https://api-evsrest.nci.nih.gov/api/v1/concept/ncit/C95785?include=full",
  })]);
  expect(evidence.mechanisms[0].value).toBe(definition);
  expect(evidence.identifiers[0].value.unii).toBe("J43DL56H6M");
});

it("keeps a provider timeout distinct from an empty PubChem lookup", async () => {
  const fetcher = async (url) => {
    if (url.includes("nci.nih.gov")) throw new DOMException("Timeout", "TimeoutError");
    return new Response(null, { status: 404 });
  };
  const { evidence, issues } = await fetchDrugSupplement({ name: "Missing fixture" }, { fetcher });
  expect(issues).toEqual({ NCIt: "timeout" });
  expect(evidence.identifiers).toEqual([]);
});

it("merges records sharing a ChEMBL ID but keeps different IDs with a common alias separate", () => {
  const setup = { targetIds: ["CD3"], verification: "reviewed", aliases: ["Shared code"] };
  const catalog = { targets: [{ id: "CD3" }], drugs: [
    { ...setup, id: "CHEMBL1", name: "Drug one", mechanisms: ["Source mechanism"], sourceId: "one" },
    { ...setup, id: "local", name: "Drug one alias", externalIds: { chembl: "CHEMBL1" }, mechanisms: [""], sourceId: "two" },
    { ...setup, id: "CHEMBL2", name: "Drug two", sourceId: "three" },
  ] };
  const [{ candidates }] = investigationalGroups(catalog, [{ key: "cd3", targetIds: ["CD3"] }]);
  expect(candidates).toHaveLength(2);
  expect(candidates.every(({ aliases }) => !aliases.includes("Shared code"))).toBe(true);
  expect(candidates.find(({ drug }) => drug.id === "CHEMBL1").drug).toMatchObject({
    mechanisms: ["Source mechanism"], sourceIds: ["one", "two"],
  });
});

it("keeps the CD3E display and distinguishes partial from documented bispecific scope", async () => {
  const { supplementInvestigationalMatch } = await import("../src/lib/target-to-assay/investigational.js");
  const row = {
    drug: {}, directTargets: ["CD3D", "CD3E", "CD3G"], match: { state: "unverified", supported: [] },
  };
  expect(supplementInvestigationalMatch(row, [{ value: ["CD3E"] }], ["CD3", "MS4A1"]))
    .toMatchObject({ directTargets: ["CD3E"], match: { state: "partial" } });
  const evidence = [{ value: ["CD3", "IL3RA"], complete: true }];
  expect(supplementInvestigationalMatch(row, evidence, ["CD3", "IL3RA"]).match.state).toBe("verified");
  expect(supplementInvestigationalMatch(row, evidence, ["CD3", "MS4A1"]).match.state).toBe("partial");
  expect(supplementInvestigationalMatch({ ...row, directTargets: ["MS4A1"] }, evidence, ["CD3", "IL3RA"]).match.state)
    .toBe("conflict");
});

it("keeps the first clinical page when a later page fails", async () => {
  const { fetchDevelopmentProfile } = await import("../src/lib/target-to-assay/trials.js");
  const fetcher = async (url) => {
    if (url.includes("pageToken")) return new Response(null, { status: 503 });
    return Response.json({ nextPageToken: "next", studies: [{ protocolSection: {
      identificationModule: { nctId: "NCT00000001" },
      designModule: { studyType: "INTERVENTIONAL", phases: ["PHASE2"] },
      armsInterventionsModule: { interventions: [{ name: "Fixture", type: "DRUG" }] },
    } }] });
  };
  const result = await fetchDevelopmentProfile({ name: "Fixture" }, { fetcher, includeStudyRecords: true });
  expect(result).toMatchObject({ recordIds: ["NCT00000001"], truncated: true, pageIssue: "upstream_error" });
});

it.each([1, 2])("requires one unambiguous openFDA substance match (%s matches)", async (count) => {
  const result = await fetchDrugSupplement({ name: "Plamotamab" }, { fetcher: async (url) => {
    if (!url.includes("/other/substance.json")) return new Response(null, { status: 404 });
    return Response.json({ meta: { results: { total: count } }, results: Array.from({ length: count }, (_, index) => ({
      names: [{ name: "PLAMOTAMAB" }, { name: "XmAb13676" }],
      unii: `000000000${index}`,
    })) });
  } });
  expect(result.evidence.identifiers).toHaveLength(count === 1 ? 1 : 0);
  expect(result.evidence.targets).toEqual([]);
});
