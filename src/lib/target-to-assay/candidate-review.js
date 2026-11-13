import { providerIssue } from "./provider-status.js";
import { classifyTargetMatch, prepareTargetMatch } from "./target-match.js";

const nameKey = (name) => name.trim().toLowerCase().replace(/\s+/g, " ");
const biologicStem = (name) => nameKey(name).replace(/(mab)-[a-z]{4}$/, "$1");

// The FDA label is matched back to the active ingredient. A fuzzy search hit,
// shared brand, or combination label alone does not establish identity.
export async function reviewFdaLabels(drugs, targets, { fetcher, signal }) {
  const scope = targets.map(({ id }) => id);
  const verified = new Map();
  const pending = drugs
    .flatMap((drug) => {
      if (drug.clinicalStage !== "APPROVAL" || !drug.targetEvidence) return [];
      const prepared = prepareTargetMatch(drug, targets);
      const match = classifyTargetMatch(prepared, scope);
      if (!match || match.state === "verified") return [];
      return [
        {
          drug,
          priority:
            match.supported.length * 2 + scope.filter((id) => prepared.related.has(id)).length,
        },
      ];
    })
    .sort((a, b) => b.priority - a.priority || a.drug.name.localeCompare(b.drug.name, "en"));
  const selected = pending.slice(0, 8);
  const checks = await Promise.all(
    selected.map(async ({ drug }) => {
      const names = [drug.name, ...(drug.aliases || [])]
        .filter((name) => /^[\p{L}\p{N} .()/-]{3,80}$/u.test(name))
        .slice(0, 5);
      if (!names.length) return { drugId: drug.id, state: "not_queried" };
      const url = new URL("https://api.fda.gov/drug/label.json");
      url.search = new URLSearchParams({
        search: names.map((name) => `openfda.generic_name:"${name}"`).join(" OR "),
        sort: "effective_time:desc",
        limit: "5",
      });
      try {
        const response = await fetcher(url, { signal, redirect: "manual" });
        if (response.status === 404) return { drugId: drug.id, state: "success_empty" };
        if (!response.ok) throw new Error("upstream_" + response.status);
        const data = await response.json();
        if (!Array.isArray(data.results)) throw new Error("unexpected_fda_response");
        const labels = data.results.filter((label) => {
          const ingredients = label?.openfda?.generic_name;
          return (
            Array.isArray(ingredients) &&
            ingredients.length === 1 &&
            typeof ingredients[0] === "string" &&
            biologicStem(ingredients[0]) === biologicStem(drug.name) &&
            typeof label.set_id === "string" &&
            /^[a-f0-9-]{36}$/i.test(label.set_id)
          );
        });
        const records = labels.flatMap((label) => {
          const paragraphs = Array.isArray(label.mechanism_of_action)
            ? label.mechanism_of_action
            : [];
          return paragraphs
            .filter((value) => typeof value === "string")
            .flatMap((value) => value.split(/(?<=\.)\s+/).slice(0, 32))
            .filter((text) => text.length <= 1600 && /\b(?:binds|recognizes)\b/i.test(text))
            .map((text) => ({
              role: "direct",
              sourceType: "fda_label",
              text,
              allowBindingAssertion: true,
              references: [
                {
                  source: "FDA label",
                  ids: [label.set_id],
                  urls: [
                    "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=" + label.set_id,
                  ],
                },
              ],
            }));
        });
        if (records.length) verified.set(drug.id, records);
        return {
          drugId: drug.id,
          state: labels.length ? "success_with_data" : "success_empty",
          labelIds: labels.map(({ set_id }) => set_id),
        };
      } catch (error) {
        return { drugId: drug.id, ...providerIssue(error) };
      }
    }),
  );
  return { verified, checks, truncated: pending.length > selected.length };
}
