import { fetchDeveloperLiterature } from "./literature.js";

const company = String.raw`([\p{Lu}][\p{L}\d&'’-]*(?:[ -]+[\p{Lu}\d][\p{L}\d&'’-]*){0,6}(?:,)?\s+(?:Inc|Ltd|Limited|Corporation|Corp|LLC|GmbH|PLC|Life Sciences|Therapeutics|Pharmaceuticals|Biopharma))`;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (value) => value.toLowerCase().replace(/[,\s]+/g, " ").trim();

export async function fetchDeveloperEvidence(drug, { fetcher = fetch, signal } = {}) {
  const names = [...new Set([drug.name, ...(drug.aliases || [])])].filter((name) =>
    typeof name === "string" && /^[\p{L}\p{N}][\p{L}\p{N} .()/'’+,-]{2,139}$/u.test(name)).slice(0, 4);
  if (!names.length) return { evidence: [], truncated: false };
  const drugName = "(?:" + names.map((name) =>
    [...escape(name)].map((c) => /[a-z]/i.test(c) ? `[${c.toUpperCase()}${c.toLowerCase()}]` : c).join("")).join("|") + ")";
  const assertions = [
    { pattern: new RegExp(`^${drugName} (?:is being developed|is under development) by ${company}(?=[.,;:]|$)`, "u"), role: "reported_current_developer" },
    { pattern: new RegExp(`^${drugName} was (?:originally )?developed by ${company}(?=[.,;:]|$)`, "u"), role: "historical_developer" },
    { pattern: new RegExp(`^${company} (?:is developing|has developed|developed) ${drugName}(?=[.,;:]|$)`, "u"), role: "historical_developer" },
  ];
  const { papers, truncated } = await fetchDeveloperLiterature(names, {
    fetcher,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(4500)]) : AbortSignal.timeout(4500),
  });
  const retrievedAt = new Date().toISOString();
  const evidence = papers.filter(({ preprint, year }) => preprint === false && /^\d{4}$/.test(year || ""))
    .flatMap(({ abstract, id, url, year, title }) => (abstract || "").split(/(?<=[.!?])\s+(?=\p{Lu})/u).flatMap((sentence) => {
      const text = sentence.trim();
      return assertions.flatMap(({ pattern, role }) => {
        const match = text.match(pattern);
        return match && !/\b(?:University|Hospital|Institute|Foundation)\b/i.test(match[1]) ? [{
          value: match[1], role: text.includes(" is developing ") ? "reported_current_developer" : role,
          source: "Europe PMC", sourceId: id, url, title, publishedYear: year, retrievedAt,
        }] : [];
      });
    }));
  return { evidence, truncated };
}

export function summarizeDeveloper(evidence = []) {
  const current = evidence.filter(({ role }) => role === "reported_current_developer");
  const records = current.length ? current : evidence;
  const companies = new Set(records.map(({ value }) => normalize(value)));
  return { conflict: companies.size > 1, record: companies.size === 1 ? [...records].sort((a, b) => b.publishedYear.localeCompare(a.publishedYear))[0] : null };
}
