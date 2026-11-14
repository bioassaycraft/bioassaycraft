import { expect, it } from "vitest";
import { fetchDeveloperEvidence, summarizeDeveloper } from "../src/lib/target-to-assay/developer-evidence.js";

it("requires explicit company development statements and keeps original publication links", async () => {
  const fetcher = async () => Response.json({ hitCount: 4, resultList: { result: [
    { id: "1", source: "MED", title: "Development report", pubYear: "2025",
      abstractText: "Examplemab is being developed by Alpha Therapeutics. Beta Corp sponsored the trial." },
    { id: "2", source: "MED", title: "Earlier report", pubYear: "2020",
      abstractText: "Examplemab was originally developed by Gamma Pharmaceuticals." },
    { id: "3", source: "MED", title: "Another molecule", pubYear: "2025",
      abstractText: "Examplemab Plus is being developed by Beta Corp." },
    { id: "4", source: "MED", title: "Funding report", pubYear: "2025",
      abstractText: "Beta Corp funded the development of Examplemab." },
  ] } });
  const { evidence } = await fetchDeveloperEvidence({ name: "EXAMPLEMAB" }, { fetcher });
  expect(evidence.map(({ value }) => value)).toEqual(["Alpha Therapeutics", "Gamma Pharmaceuticals"]);
  expect(summarizeDeveloper(evidence).record).toMatchObject({
    value: "Alpha Therapeutics", role: "reported_current_developer", url: "https://europepmc.org/article/MED/1",
  });
  expect(summarizeDeveloper([...evidence, { ...evidence[0], value: "Delta Inc" }]))
    .toEqual({ conflict: true, record: null });
});

it.each([200, 503])("uses at most one open full text and isolates its failure (%s)", async (status) => {
  const calls = [];
  const result = await fetchDeveloperEvidence({ name: "Examplemab" }, { fetcher: async (url) => {
    calls.push(url);
    if (url.endsWith("/fullTextXML")) return new Response(status === 200
      ? "<article><body><p>Alpha Therapeutics is currently developing Examplemab.</p></body></article>" : null, { status });
    return Response.json({ hitCount: 2, resultList: { result: [
      { id: "1", source: "MED", pmcid: "PMC12", isOpenAccess: "Y", title: "Study", pubYear: "2025",
        abstractText: "Gamma Pharmaceuticals initially funded Examplemab." },
      { id: "2", source: "MED", pmcid: "PMC13", isOpenAccess: "N", title: "Study", pubYear: "2020",
        abstractText: "Examplemab was initially developed by Beta Corp." },
    ] } });
  } });
  expect(calls).toHaveLength(2);
  expect(calls[1]).toContain("/PMC12/fullTextXML");
  expect(result.evidence[0]).toMatchObject({ role: "historical_developer", value: "Beta Corp" });
  if (status === 200) expect(summarizeDeveloper(result.evidence).record).toMatchObject({
    role: "reported_current_developer", value: "Alpha Therapeutics", section: "full_text",
  });
  else expect(result.issues).toEqual({ "Europe PMC full text": "upstream_error" });
});
