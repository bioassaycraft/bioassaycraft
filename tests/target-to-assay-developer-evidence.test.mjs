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
