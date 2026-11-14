import { fetchDeveloperLiterature } from "./literature.js";
import { providerIssue } from "./provider-status.js";

const company = String.raw`([\p{Lu}][\p{L}\d&'’-]*(?:[ -]+[\p{Lu}\d][\p{L}\d&'’-]*){0,6}(?:,)?\s+(?:Inc|Ltd|Limited|Corporation|Corp|LLC|GmbH|PLC|Life Sciences|Therapeutics|Pharmaceuticals|Biopharma))`;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (value) => value.toLowerCase().replace(/[,.\s]+/g, " ").trim();

export async function fetchDeveloperEvidence(drug, { fetcher = fetch, signal } = {}) {
  const names = [...new Set([drug.name, ...(drug.aliases || [])])].filter((name) =>
    typeof name === "string" && /^[\p{L}\p{N}][\p{L}\p{N} .()/'’+,-]{2,139}$/u.test(name)).slice(0, 4);
  if (!names.length) return { evidence: [], truncated: false };
  const drugName = "(?:" + names.map((name) =>
    [...escape(name)].map((c) => /[a-z]/i.test(c) ? `[${c.toUpperCase()}${c.toLowerCase()}]` : c).join("")).join("|") + ")";
  const end = "(?=\\.(?:\\s|$)|;|$)";
  const current = "reported_current_developer";
  const historical = "historical_developer";
  const assertions = [
    [`${drugName} (?:is being developed|is under (?:clinical )?development) by ${company}`, current],
    [`${drugName} was (?:originally |initially )?developed by ${company}`, historical],
    [`${company} (?:is (?:currently )?developing|leads clinical development of) ${drugName}`, current],
    [`${company} (?:has developed|developed|originally developed) ${drugName}`, historical],
    [`${company} (?:is collaborating|collaborated) on (?:the )?development of ${drugName}`, "development_collaborator"],
  ].map(([pattern, role]) => [new RegExp(`^${pattern}${end}`, "u"), role]);

  const budget = AbortSignal.timeout(4500);
  const boundedSignal = signal ? AbortSignal.any([signal, budget]) : budget;
  const { papers, truncated } = await fetchDeveloperLiterature(names, { fetcher, signal: boundedSignal });
  const retrievedAt = new Date().toISOString();
  const reviewed = papers.filter(({ preprint, year }) => preprint === false && /^\d{4}$/.test(year || ""));
  const extract = ({ id, url, year, title }, content, section) =>
    (content || "").split(/(?<=[!?]|(?<!\bInc|\bLtd|\bCorp)\.)\s+(?=\p{Lu})/u).flatMap((sentence) => {
      const text = sentence.trim();
      return assertions.flatMap(([pattern, role]) => {
        const match = text.match(pattern);
        return match && !/\b(?:University|Hospital|Institute|Foundation)\b/i.test(match[1]) ? [{
          value: match[1], role, text: match[0].slice(0, 260), section,
          source: "Europe PMC", sourceId: id, url, title, publishedYear: year, retrievedAt,
        }] : [];
      });
    });
  const evidence = reviewed.flatMap((paper) => extract(paper, paper.abstract, "abstract"));
  const paper = reviewed.find(({ openAccess, pmcid }) => openAccess && pmcid);
  const issues = {};
  if (!evidence.some(({ role }) => role === current) && paper && !boundedSignal.aborted) {
    try {
      const response = await fetcher(`https://www.ebi.ac.uk/europepmc/webservices/rest/${paper.pmcid}/fullTextXML`,
        { signal: boundedSignal, redirect: "manual" });
      if (!response.ok) throw new Error("upstream_" + response.status);
      const xml = await response.text();
      const body = xml.length <= 1_000_000 && xml.match(/<body(?:\s[^>]*)?>([\s\S]*?)<\/body>/)?.[1];
      if (!body) throw new Error("unexpected_full_text");
      for (const [, paragraph] of body.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
        evidence.push(...extract({ ...paper, url: paper.fullText },
          paragraph.replace(/<[^>]*>/g, "").replace(/\s+/g, " "), "full_text"));
        if (evidence.length >= 20) break;
      }
    } catch (error) {
      issues["Europe PMC full text"] = providerIssue(error).state;
    }
  }
  const unique = new Map(evidence.map((entry) => [JSON.stringify([entry.role, normalize(entry.value), entry.sourceId]), entry]));
  return { evidence: [...unique.values()].slice(0, 20), truncated, issues };
}

export function summarizeDeveloper(evidence = []) {
  const current = evidence.filter(({ role }) => role === "reported_current_developer");
  const records = current.length ? current : evidence.filter(({ role }) => role === "historical_developer");
  const companies = new Set(records.map(({ value }) => normalize(value)));
  return { conflict: companies.size > 1, record: companies.size === 1 ? [...records].sort((a, b) => b.publishedYear.localeCompare(a.publishedYear))[0] : null };
}
