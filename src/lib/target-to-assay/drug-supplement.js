import { exactDrugName } from "./investigational-sources.js";
import { providerIssue } from "./provider-status.js";

const evs = "https://api-evsrest.nci.nih.gov/api/v1/concept/";
const pubchem = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/";
const cache = new Map();
let nextPubChem = 0;

async function cached(url, fetcher, signal, pubchemRequest = false) {
  const hit = cache.get(url);
  if (hit?.expires > Date.now()) return hit.promise;
  if (pubchemRequest) {
    const now = Date.now();
    if (nextPubChem > now) return undefined;
    nextPubChem = now + 250;
  }
  const promise = (async () => {
    const response = await fetcher(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(pubchemRequest ? 2500 : url.startsWith(evs) ? 4000 : 2500)]) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("upstream_" + response.status);
    return response.json();
  })();
  if (fetcher !== fetch) return promise;
  cache.set(url, { promise, expires: Date.now() + 7 * 86400000 });
  if (cache.size > 256) cache.delete(cache.keys().next().value);
  try {
    return await promise;
  } catch (error) {
    if (cache.get(url)?.promise === promise) cache.delete(url);
    throw error;
  }
}

function bindingTargets(definition, names) {
  const pair = definition.match(/^An? anti-(CD\d+)\/anti-(CD\d+) bispecific\b/i);
  if (pair && pair[1].toUpperCase() !== pair[2].toUpperCase() &&
    pair.slice(1).every((target) => new RegExp(target + "-expressing", "i").test(definition)) &&
    /\bsimultaneously binds to both\b/i.test(definition)) {
    const ids = pair.slice(1).map((target) => ({ CD123: "IL3RA", CD20: "MS4A1" })[target.toUpperCase()] || target.toUpperCase());
    return { ids: ids.sort((a, b) => Number(b === "CD3") - Number(a === "CD3")), complete: true };
  }
  const targets = new Set();
  for (const sentence of definition.split(/(?<=[.!?])\s+/)) {
    const assertion = sentence.match(/^(.+?) binds to (CD3 epsilon|CD3ε|CD3E|CD20|MS4A1|CD123|IL3RA|PD-1|PDCD1|PD-L1|CD274)(?= on | expressed on |[.,]?$)/i);
    if (!assertion || !names.has(exactDrugName(assertion[1]))) continue;
    const target = assertion[2].toUpperCase();
    targets.add({
      "CD3 EPSILON": "CD3E", "CD3Ε": "CD3E", CD20: "MS4A1", CD123: "IL3RA",
      "PD-1": "PDCD1", "PD-L1": "CD274",
    }[target] || target);
  }
  return { ids: [...targets], complete: false };
}

export async function fetchDrugSupplement(drug, { fetcher = fetch, signal = AbortSignal.timeout(7000) } = {}) {
  const issues = {};
  const evidence = { aliases: [], identifiers: [], targets: [], mechanisms: [] };
  let identifiers = {};
  const retrievedAt = new Date().toISOString();
  try {
    const query = new URLSearchParams({ terminology: "ncit", term: drug.name, type: "match", pageSize: "10", include: "full" });
    const result = await cached(evs + "search?" + query, fetcher, signal);
    if (result && (!Array.isArray(result.concepts) || !Number.isInteger(result.total)))
      throw new Error("unexpected_ncit_response");
    const matches = result?.concepts.filter((row) =>
      row.active === true && row.terminology === "ncit" && /^C\d+$/.test(row.code) &&
      (exactDrugName(row.name || "") === exactDrugName(drug.name) ||
        row.synonyms?.some(({ type, name }) => type === "FULL_SYN" && exactDrugName(name) === exactDrugName(drug.name))) &&
      row.properties?.some(({ type, value }) => type === "Semantic_Type" && value === "Pharmacologic Substance"));
    if (matches?.length === 1 && result.total <= result.concepts.length) {
      const concept = matches[0];
      const link = evs + "ncit/" + concept.code + "?include=full";
      const field = (value, evidenceType) => ({ value, source: "NCI Thesaurus", sourceId: concept.code, url: link, retrievedAt, evidenceType });
      const property = (type, format) => {
        const values = [...new Set((concept.properties || []).filter((row) => row.type === type && format.test(row.value)).map(({ value }) => value))];
        return values.length === 1 ? values[0] : undefined;
      };
      identifiers = { ncitCode: concept.code, unii: property("FDA_UNII_Code", /^[A-Z0-9]{10}$/), cas: property("CAS_Registry", /^\d+-\d{2}-\d$/) };
      evidence.identifiers.push(field(identifiers, "concept_properties"));
      const aliases = [...new Set([concept.name, ...(concept.synonyms || []).filter(({ type }) => type === "FULL_SYN").map(({ name }) => name)].filter(Boolean))];
      evidence.aliases.push(field(aliases, "concept_synonyms"));
      const names = new Set(aliases.map(exactDrugName));
      for (const { definition, source } of concept.definitions || []) {
        if (source !== "NCI" || typeof definition !== "string") continue;
        const targets = bindingTargets(definition, names);
        if (!targets.ids.length) continue;
        evidence.targets.push({ ...field(targets.ids, "explicit_binding"), complete: targets.complete });
        const labels = targets.ids.map((id) => ({ CD3E: "CD3 ε 亚基", MS4A1: "CD20", IL3RA: "CD123", PDCD1: "PD-1", CD274: "PD-L1" })[id] || id);
        evidence.mechanisms.push({
          ...field(definition, "drug_definition"),
          mechanismZh: targets.complete
            ? `同时结合 ${labels.join(" 和 ")} 的双特异性抗体。`
            : `结合 ${labels.join(" 和 ")}。`,
        });
      }
    }
  } catch (error) {
    issues.NCIt = providerIssue(error).state;
  }
  if (!identifiers.unii && !signal.aborted) {
    try {
      const query = new URLSearchParams({ search: `names.name:"${drug.name}"`, limit: "10" });
      const result = await cached("https://api.fda.gov/other/substance.json?" + query, fetcher, signal);
      if (result && (!Array.isArray(result.results) || !Number.isInteger(result.meta?.results?.total)))
        throw new Error("unexpected_substance_response");
      const matches = result?.results.filter((row) => Array.isArray(row.names) &&
        row.names.some(({ name }) => typeof name === "string" && exactDrugName(name) === exactDrugName(drug.name)));
      if (matches?.length === 1 && result.meta.results.total <= result.results.length &&
        /^[A-Z0-9]{10}$/.test(matches[0].unii || "")) {
        const { unii, names } = matches[0];
        const field = (value, evidenceType) => ({ value, source: "openFDA Substance", sourceId: unii,
          url: "https://api.fda.gov/other/substance.json?" + new URLSearchParams({ search: `unii:"${unii}"` }),
          evidenceType, retrievedAt });
        identifiers.unii = unii;
        evidence.identifiers.push(field({ unii }, "substance_identifier"));
        evidence.aliases.push(field([...new Set(names.map(({ name }) => name).filter((name) =>
          typeof name === "string" && name.trim()))].slice(0, 40), "substance_names"));
      }
    } catch (error) {
      issues["openFDA Substance"] = providerIssue(error).state;
    }
  }
  if (!identifiers.unii && !signal.aborted) {
    try {
      const result = await cached(pubchem + "name/" + encodeURIComponent(identifiers.cas || drug.name) + "/synonyms/JSON", fetcher, signal, true);
      const rows = result?.InformationList?.Information;
      if (result && !Array.isArray(rows)) throw new Error("unexpected_pubchem_response");
      if (rows?.length === 1 && Number.isSafeInteger(rows[0].CID) &&
        rows[0].Synonym?.some((name) => exactDrugName(name) === exactDrugName(drug.name))) {
        const { CID, Synonym } = rows[0];
        const field = (value, evidenceType) => ({ value, source: "PubChem", sourceId: String(CID),
          url: "https://pubchem.ncbi.nlm.nih.gov/compound/" + CID, retrievedAt, evidenceType });
        evidence.identifiers.push(field({ pubchemCid: CID }, "compound_identifier"));
        evidence.aliases.push(field(Synonym.filter((name) => typeof name === "string").slice(0, 40), "deposited_synonyms"));
      }
    } catch (error) {
      issues.PubChem = providerIssue(error).state;
    }
  }
  return { evidence, issues };
}
