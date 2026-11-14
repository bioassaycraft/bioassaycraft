import { abstractLicense, collapsePublicationVersions } from "./literature-display.js";
import { providerIssue } from "./provider-status.js";

const endpoint = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

const methods = [
  "bioassay",
  "potency assay",
  "cell-based assay",
  "reporter gene assay",
  "binding assay",
  "ELISA",
  "surface plasmon resonance",
  "biolayer interferometry",
  "cytotoxicity assay",
];
const methodTerm = methods.map((term) => `"${term}"[Title/Abstract]`).join(" OR ");
function methodScore(title, abstract, aliases) {
  const heading = title.toLowerCase();
  const titleTarget = aliases.some((alias) => heading.includes(alias));
  const coupled = [...sentences.segment(abstract.toLowerCase())].some(
    ({ segment }) =>
      aliases.some((alias) => segment.includes(alias)) &&
      methods.some((term) => segment.includes(term.toLowerCase())),
  );
  const titleMethod = methods.some((term) => heading.includes(term.toLowerCase()));
  return Number(titleTarget) * 6 + Number(coupled) * 4 + Number(titleMethod) * 2;
}

export function literatureTerm(targets) {
  return targets
    .map((target) => {
      const aliases = target.id === "CD20" || target.id === "MS4A1" ? ["CD20", "MS4A1"] : [];
      const names = new Set(
        [target.label, ...target.aliases, ...(target.literatureNames || []), ...aliases].map((name) =>
          name
            .replace(/["\\\u005b\u005d]/g, " ")
            .trim()
            .toUpperCase(),
        ),
      );
      return `(${[...names]
        .filter(Boolean)
        .map((name) => `"${name}"[Title/Abstract]`)
        .join(" OR ")})`;
    })
    .join(" AND ");
}

function licensedPubmedAbstract(record, id, paragraphs) {
  const notice = record.querySelector("Article > Abstract > CopyrightInformation")?.textContent;
  // Use only an explicit license covering the abstract.
  const license = abstractLicense(notice);
  if (!license) return {};
  return { publicAbstract: {
    text: paragraphs.join("\n\n"), source: "PubMed",
    url: `https://pubmed.ncbi.nlm.nih.gov/${id}/#abstract`, license,
  } };
}

export function parsePubmedArticles(xml, aliases = [], includeAbstract = false) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.documentElement?.localName !== "PubmedArticleSet" || document.querySelector("parsererror, ERROR"))
    throw new Error("parse_error");
  return [...document.querySelectorAll("PubmedArticle")]
    .flatMap((record) => {
      const id = record.querySelector("MedlineCitation > PMID")?.textContent;
      const title = record.querySelector("ArticleTitle")?.textContent;
      if (!/^\d+$/.test(id || "") || !title) return [];
      const parts = [...record.querySelectorAll("Article > Abstract > AbstractText")];
      const section = (name) =>
        parts.find((part) =>
          [part.getAttribute("NlmCategory"), part.getAttribute("Label")].some((label) =>
            label?.toUpperCase().startsWith(name),
          ),
        );
      const abstractParagraphs = parts.flatMap((part) => {
        const content = part.textContent.trim();
        if (!content) return [];
        const label = part.getAttribute("Label");
        return [label ? label + ": " + content : content];
      });
      const conclusion = section("CONCLUS");
      const results = section("RESULT");
      const sectionText =
        (conclusion || results || parts.at(-1))?.textContent.trim().replace(/\s+/g, " ") || "";
      const text =
        conclusion || results
          ? sectionText
          : [...sentences.segment(sectionText)].at(-1)?.segment.trim() || sectionText;
      const words = text.split(" ");
      const excerpt = words.slice(0, 25).join(" ");
      const publicationTypes = [...record.querySelectorAll("PublicationType")]
        .map((type) => type.textContent);
      const publicationKind = publicationTypes.some((type) => /Review|Meta-Analysis/i.test(type)) ? "review" :
        publicationTypes.some((type) => /Clinical Trial|Observational Study|Comparative Study/i.test(type)) ? "primary" :
          null;
      const pmc = record.querySelector('ArticleId[IdType="pmc"]')?.textContent;
      return [
        {
          id,
          pmid: id,
          pmcid: pmc,
          doi: record.querySelector('ArticleId[IdType="doi"]')?.textContent,
          source: "PubMed",
          ...(includeAbstract && abstractParagraphs.length ? {
            abstractSource: { source: "PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/${id}/#abstract` },
            ...licensedPubmedAbstract(record, id, abstractParagraphs),
          } : {}),
          ...(includeAbstract ? { abstract: parts.map((part) => part.textContent).join(" ") } : {}),
          title,
          publicationKind,
          preprint: publicationTypes.some((type) => /^Preprint$/i.test(type)),
          authorKeys: [...record.querySelectorAll("Article > AuthorList > Author")].map((author) =>
            authorKey(author.querySelector("LastName")?.textContent, author.querySelector("Initials")?.textContent)).filter(Boolean),
          preprintPmids: [...record.querySelectorAll('CommentsCorrections[RefType="HasPreprint"] > PMID')].map((node) => node.textContent),
          publishedPmids: [...record.querySelectorAll('CommentsCorrections[RefType="PreprintOf"] > PMID')].map((node) => node.textContent),
          methodScore: methodScore(title, parts.map((part) => part.textContent).join(" "), aliases),
          journal: record.querySelector("Journal > Title")?.textContent,
          year: record.querySelector("JournalIssue > PubDate > Year")?.textContent,
          excerpt: words.length > 25 ? excerpt + "…" : excerpt,
          kind: conclusion ? "conclusion" : results ? "results" : "abstract",
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          fullText: /^PMC\d+$/.test(pmc || "")
            ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/`
            : null,
        },
      ];
    })
    .sort((a, b) => b.methodScore - a.methodScore);
}

const assayQuery = (term) => `(${term}) AND (${methodTerm}) AND hasabstract[text]`;

export function literatureSearchUrl(term) {
  return `https://pubmed.ncbi.nlm.nih.gov/?${new URLSearchParams({ term: assayQuery(term) })}`;
}

export async function fetchLiteratureSource(term, { fetcher = fetch, signal, drugs = [], expanded = false } = {}) {
  const search = new URLSearchParams({
    db: "pubmed",
    term: expanded
      ? `(${term}${drugs.map((name) => ` OR "${name}"[Title/Abstract]`).join("")}) AND (${assayMethods.map((method) => `"${method}"[Title/Abstract]`).join(" OR ")} OR bispecific[Title/Abstract] OR pharmacology[Title/Abstract]) AND hasabstract[text]`
      : assayQuery(term),
    retmode: "json",
    retmax: expanded ? "40" : "24",
    sort: "relevance",
  });
  const response = await fetcher(`${endpoint}esearch.fcgi?${search}`, { signal, redirect: "manual" });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const result = (await response.json())?.esearchresult;
  if (!Array.isArray(result?.idlist) || result.idlist.some((id) => !/^\d+$/.test(id)))
    throw new Error("unexpected_pubmed_search");
  const ids = result.idlist;
  const url = `https://pubmed.ncbi.nlm.nih.gov/?${new URLSearchParams({ term: search.get("term") })}`;
  const meta = { url, recordIds: ids, retrievedAt: new Date().toISOString(), truncated: Number(result.count) > ids.length };
  if (!ids.length) return { ...meta, xml: "" };
  const params = new URLSearchParams({ db: "pubmed", id: ids.join(","), retmode: "xml" });
  const detail = await fetcher(`${endpoint}efetch.fcgi?${params}`, { signal, redirect: "manual" });
  if (!detail.ok) throw new Error("upstream_" + detail.status);
  return { ...meta, xml: await detail.text() };
}

export function displayLiterature(source, term) {
  const aliases = [...term.matchAll(/"([^"]+)"\[Title\/Abstract\]/g)].map((match) =>
    match[1].toLowerCase(),
  );
  const papers = source.xml ? parsePubmedArticles(source.xml, aliases) : [];
  if (source.recordIds?.length && !papers.length) throw new Error("parse_error");
  return { ...source, papers: papers.slice(0, 6) };
}

const methodFamilies = [
  ["Biological activity", 34, ["biological activity", "biological activity assay", "bioactivity", "bioassay"]],
  ["Potency", 40, ["potency assay", "relative potency", "binding potency", "relative binding potency",
    "potency determination", "potency measurement", "cell-based potency assay"]],
  ["Reporter assay", 40, ["reporter gene assay", "reporter assay", "reporter-based assay", "reporter gene",
    "reporter-based", "luciferase reporter"]],
  ["HTRF / TR-FRET", 40, ["HTRF", "homogeneous time resolved fluorescence", "TR-FRET",
    "time resolved fluorescence resonance energy transfer"]],
  ["Functional assay", 28, ["cell-based assay", "functional assay", "cytotoxicity assay", "inhibition assay", "blocking assay"]],
  ["Binding assay", 28, ["binding assay", "receptor binding", "competitive binding", "ELISA", "SPR",
    "surface plasmon resonance", "BLI", "biolayer interferometry"]],
  ["Functional readout", 16, ["T-cell activation", "NFAT", "NF-κB", "ADCC", "CDC"]],
];
const validationTerms = ["method development", "assay development", "method validation", "assay validation",
  "analytical procedure", "comparability", "stability-indicating assay", "quality control", "CMC"];
const assayMethods = [...new Set([...methods, ...methodFamilies.flatMap(([, , terms]) => terms),
  ...validationTerms, "potency", "mechanism of action"])];
const jointMechanism = /\b(?:bispecific|trispecific|multispecific|diabody|dual.target|T.cell engager)\b/i;
const mechanismSignal = /\b(?:antibody|antagonist|agonist|inhibitor|engager|blockade|pharmacolog\w*|neutraliz\w*|binding|cytotoxicity)\b/i;

const expressionGroups = (term) => {
  const names = [];
  const structure = term.replace(/"([^"]+)"\[Title\/Abstract\]/g, (_, name) => String(names.push(name) - 1));
  return structure.split(/\) AND \(/).map((group) =>
    [...group.matchAll(/\d+/g)].map(([index]) => names[index]));
};

function hasName(text, names) {
  const normalized = (value) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
  const haystack = ` ${normalized(text).trim()} `;
  return names.some((name) => haystack.includes(` ${normalized(name).trim()} `));
}

export function mergeLiterature(papers) {
  const clusters = new Map();
  const unique = new Set();
  for (const paper of papers) {
    const doi = paper.doi?.replace(/^https?:\/\/doi\.org\//i, "").trim().toLowerCase();
    const validDoi = /^10\.\d{4,9}\/\S+$/.test(doi || "") ? doi : undefined;
    const keys = [validDoi && "doi:" + validDoi, paper.pmid && "pmid:" + paper.pmid,
      paper.pmcid && "pmc:" + paper.pmcid.toUpperCase()].filter(Boolean);
    const existing = [...new Set(keys.map((key) => clusters.get(key)).filter(Boolean))];
    const group = { keys: new Set([...keys, ...existing.flatMap(({ keys }) => [...keys])]),
      rows: [...existing.flatMap(({ rows }) => rows), { ...paper, doi: validDoi }] };
    for (const previous of existing) unique.delete(previous);
    unique.add(group);
    for (const key of group.keys) clusters.set(key, group);
  }
  return [...unique].map(({ rows }) => {
    const ordered = [...rows].sort((a, b) => Number(b.source === "PubMed") - Number(a.source === "PubMed"));
    const merged = {};
    for (const row of ordered) {
      for (const [key, value] of Object.entries(row)) if (value && !merged[key]) merged[key] = value;
    }
    merged.preprint = ordered.find(({ preprint }) => typeof preprint === "boolean")?.preprint;
    merged.sources = [...new Set(ordered.map(({ source }) => source).filter(Boolean))];
    merged.evidenceTitles = [...new Set(ordered.map(({ title }) => title).filter(Boolean))];
    merged.evidenceTexts = [...new Set(ordered.flatMap(({ title, abstract }) => [title, abstract]).filter(Boolean))];
    return merged;
  });
}

function methodEvidence(text) {
  return methodFamilies.filter(([, , terms]) => hasName(text, terms));
}

export function rankAssayLiterature(papers, term, drugs = []) {
  const groups = expressionGroups(term);
  return mergeLiterature(papers).flatMap(({ evidenceTexts, ...paper }) => {
    delete paper.abstract;
    const text = evidenceTexts.join(" ");
    const segments = evidenceTexts.flatMap((value) => [...sentences.segment(value)].map(({ segment }) => segment));
    const hits = (value) => groups.filter((aliases) => hasName(value, aliases)).length;
    const drug = hasName(text, drugs);
    const covered = hits(text);
    if (!drug && !covered) return [];
    const contextual = segments.filter((segment) => hasName(segment, drugs) || hits(segment));
    const methods = methodEvidence(contextual.join(" "));
    const validation = hasName(text, validationTerms);
    const contextualPotency = hasName(contextual.join(" "), ["potency"]) &&
      (validation || hasName(text, ["assay", "dose response", "binding"]));
    const weight = Math.max(0, ...methods.map(([, points]) => points), contextualPotency ? 29 : 0);
    const assay = weight >= 28 || (weight > 0 && validation);
    const joint = drug || (covered === groups.length &&
      (groups.length === 1 || contextual.some((segment) => hits(segment) === groups.length &&
        (jointMechanism.test(segment) || methodEvidence(segment).length))));
    if (!joint && !assay) return [];
    if (!assay && !mechanismSignal.test(contextual.join(" "))) return [];
    const bestTitle = paper.evidenceTitles.some((title) =>
      (hasName(title, drugs) || hits(title) === groups.length) && methodEvidence(title).length);
    const directTitle = hasName(paper.title, drugs) || hits(paper.title) === groups.length;
    delete paper.evidenceTitles;
    return [{ ...paper, category: assay ? "assay" : "mechanism", partialScope: !joint,
      methodLabels: methods.map(([label]) => label),
      score: (drug ? 30 : joint ? 27 : 8) + weight +
        (bestTitle ? 15 : directTitle ? 8 : 3) +
        (validation ? 10 : 0) + (paper.publicationKind === "primary" ? 5 : 0),
    }];
  }).sort((a, b) => Number(a.partialScope) - Number(b.partialScope) ||
    Number(b.category === "assay") - Number(a.category === "assay") ||
    b.score - a.score || a.title.localeCompare(b.title)).map((paper) => {
    delete paper.score;
    return paper;
  });
}

function authorKey(lastName, initials) {
  if (!lastName || !initials) return "";
  return (lastName + " " + initials[0]).normalize("NFKD").toLowerCase().replace(/[^\p{L} ]/gu, "");
}

async function fetchEuropePmc(term, drugs, { fetcher, signal }, exactQuery, pageSize = "35") {
  const groups = term ? expressionGroups(term) : [];
  const targetQuery = groups.map((group) => "(" + group.map((alias) => `TITLE_ABS:"${alias}"`).join(" OR ") + ")").join(" AND ");
  const drugQuery = drugs.map((name) => `TITLE_ABS:"${name}"`).join(" OR ");
  const context = assayMethods.map((method) => `TITLE_ABS:"${method}"`).join(" OR ");
  const scope = [targetQuery, drugQuery].filter(Boolean).join(" OR ");
  const query = term ? `(${scope}) AND (${context} OR TITLE_ABS:bispecific OR TITLE_ABS:pharmacology)` : scope;
  const response = await fetcher("https://www.ebi.ac.uk/europepmc/webservices/rest/search?" +
    new URLSearchParams({ query: exactQuery || query, pageSize, format: "json", resultType: "core" }), { signal, redirect: "manual" });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const payload = await response.json();
  const rows = payload?.resultList?.result;
  if (!Array.isArray(rows)) throw new Error("unexpected_europe_pmc_response");
  return {
    total: payload.hitCount, returned: rows.length, truncated: payload.hitCount > rows.length,
    papers: rows.flatMap((row) => {
      if (!row.title || !/^[A-Z]+$/.test(row.source || "") || !/^[\w.-]+$/.test(row.id || "")) return [];
      const pmcid = /^PMC\d+$/.test(row.pmcid || "") ? row.pmcid : undefined;
      const pmid = /^\d+$/.test(row.pmid || "") ? row.pmid : undefined;
      const license = abstractLicense(row.license);
      const abstract = row.abstractText?.replace(/<[^>]*>/g, " ");
      const displayAbstract = row.abstractText?.replace(/<\/(?:p|h[1-6])>|<br\s*\/?>/gi, "\n\n")
        .replace(/<[^>]*>/g, "").trim();
      const url = `https://europepmc.org/article/${row.source}/${row.id}`;
      return [{ id: `epmc-${row.source}-${row.id}`, source: "Europe PMC", pmid, pmcid,
        openAccess: row.isOpenAccess === "Y", doi: row.doi, title: row.title.replace(/<[^>]*>/g, ""), abstract,
        preprint: row.source === "PPR" ? true : row.source === "MED" || row.source === "PMC" ? false : undefined,
        publishedDoi: row.source === "PPR" ? row.publishedVersion?.doi : undefined,
        authorKeys: row.authorList?.author?.map(({ lastName, initials }) => authorKey(lastName, initials)).filter(Boolean),
        abstractSource: displayAbstract ? (row.source === "MED" && pmid
          ? { url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/#abstract`, source: "PubMed" }
          : { url, source: "Europe PMC" }) : undefined,
        publicAbstract: displayAbstract && license ? { text: displayAbstract, license, url, source: "Europe PMC" } : undefined,
        journal: row.journalInfo?.journal?.title, year: row.pubYear,
        url: `https://europepmc.org/article/${row.source}/${row.id}`,
        fullText: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : null }];
    }),
  };
}

export async function fetchDeveloperLiterature(names, options) {
  const query = names.map((name) => `TITLE_ABS:"${name}"`).join(" OR ");
  const { papers, truncated } = await fetchEuropePmc("", [], options,
    `(${query}) AND (TITLE_ABS:developed OR TITLE_ABS:developing OR TITLE_ABS:development OR OPEN_ACCESS:Y)`, "15");
  return { papers, truncated };
}

async function fetchOpenAlex(term, { fetcher, signal }, names = []) {
  const groups = term ? expressionGroups(term) : [];
  // Keep anonymous queries within the lower Boolean-query quota.
  const scope = groups.map((group) => `"${group[0]}"`).join(" AND ");
  const search = names.length ? names.slice(0, 5).map((name) => `"${name}"`).join(" OR ")
    : `(${scope}) AND (potency OR HTRF OR "reporter gene assay")`;
  const response = await fetcher("https://api.openalex.org/works?" + new URLSearchParams({
    search, per_page: "20",
    select: "id,display_name,doi,ids,type,publication_year,primary_location,abstract_inverted_index",
  }), { signal, redirect: "manual" });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const payload = await response.json();
  if (!Array.isArray(payload.results)) throw new Error("unexpected_openalex_response");
  return {
    total: payload.meta?.count, returned: payload.results.length,
    truncated: payload.meta?.count > payload.results.length,
    papers: payload.results.flatMap((row) => {
      if (!/^https:\/\/openalex\.org\/W\d+$/.test(row.id) || !row.display_name) return [];
      const words = [];
      for (const [word, positions] of Object.entries(row.abstract_inverted_index || {})) {
        for (const position of positions) if (Number.isInteger(position) && position >= 0 && position < 10000)
          words[position] = word;
      }
      const pmid = row.ids?.pmid?.match(/pubmed(?:\.ncbi\.nlm\.nih\.gov|\/)[^\d]*(\d+)\/?$/)?.[1];
      const pmcid = row.ids?.pmcid?.match(/(PMC\d+)\/?$/i)?.[1]?.toUpperCase();
      return [{ id: row.id, source: "OpenAlex", preprint: row.type === "preprint" ? true : row.type === "article" ? false : undefined, title: row.display_name, doi: row.doi, pmid, pmcid,
        year: row.publication_year, journal: row.primary_location?.source?.display_name,
        url: row.id, abstract: words.join(" "),
        abstractSource: words.some(Boolean) ? { url: row.id, source: "OpenAlex" } : undefined,
        fullText: pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : null }];
    }),
  };
}

export async function fetchAssayLiterature({ term, drugs }, options) {
  const [pubmed, europe, openalex] = await Promise.allSettled([
    fetchLiteratureSource(term, { ...options, drugs, expanded: true }),
    fetchEuropePmc(term, drugs, options),
    fetchOpenAlex(term, options),
  ]);
  return {
    pubmed: pubmed.value, europe: europe.value, openalex: openalex.value,
    issues: Object.fromEntries([["PubMed", pubmed], ["Europe PMC", europe], ["OpenAlex", openalex]]
      .filter(([, result]) => result.status === "rejected")
      .map(([source, result]) => [source, providerIssue(result.reason).state])),
  };
}

export function displayAssayLiterature(response, term, drugs) {
  const issues = { ...response.issues };
  let pubmedPapers = [];
  try {
    if (response.pubmed?.xml) pubmedPapers = parsePubmedArticles(response.pubmed.xml, [], true);
    if (response.pubmed?.recordIds?.length && !pubmedPapers.length) throw new Error("parse_error");
  } catch {
    issues.PubMed = "parse_error";
  }
  const candidates = [...pubmedPapers, ...(response.europe?.papers || []), ...(response.openalex?.papers || [])];
  const ranked = rankAssayLiterature(candidates, term, drugs);
  const rankedIds = new Set(ranked.map(({ id }) => id));
  const unrankedJournal = mergeLiterature(candidates).filter(({ id, preprint }) => !preprint && !rankedIds.has(id))
    .map((paper) => ({ ...paper, unranked: true }));
  const papers = collapsePublicationVersions([...ranked, ...unrankedJournal])
    .filter((paper) => !paper.unranked || paper.preprints.length);
  return {
    issues, papers: papers.slice(0, 8), eligible: papers.length,
    incompleteMetadata: papers.slice(0, 8).some((paper) => !paper.journal || !paper.year),
    truncated: [response.pubmed, response.europe, response.openalex].some((source) => source?.truncated),
  };
}

export async function fetchDrugPapers(drug, options) {
  const names = [...new Set([drug.name, ...(drug.aliases || [])])].filter((name) => name.length >= 5);
  if (!names.length) return { papers: [], issues: {} };
  const term = "(" + names.map((name) => `"${name}"[Title/Abstract]`).join(" OR ") + ")";
  const query = new URLSearchParams({ db: "pubmed", term, retmode: "json", retmax: "15" });
  const pubmedSummary = async () => {
    const response = await options.fetcher(endpoint + "esearch.fcgi?" + query, { signal: options.signal });
    if (!response.ok) throw new Error("upstream_" + response.status);
    const ids = (await response.json())?.esearchresult?.idlist;
    if (!Array.isArray(ids)) throw new Error("unexpected_pubmed_response");
    if (!ids.length) return { papers: [] };
    const detail = await options.fetcher(endpoint + "esummary.fcgi?" + new URLSearchParams({
      db: "pubmed", id: ids.filter((id) => /^\d+$/.test(id)).join(","), retmode: "json",
    }), { signal: options.signal });
    if (!detail.ok) throw new Error("upstream_" + detail.status);
    const { result } = await detail.json();
    if (!result) throw new Error("unexpected_pubmed_response");
    return { papers: ids.flatMap((id) => {
      const row = result[id];
      return row?.title ? [{ id, pmid: id, title: row.title, journal: row.fulljournalname,
        year: row.pubdate?.slice(0, 4), doi: row.articleids?.find(({ idtype }) => idtype === "doi")?.value,
        source: "PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` }] : [];
    }) };
  };
  const sources = ["PubMed", "Europe PMC", "OpenAlex"];
  const checks = await Promise.allSettled([pubmedSummary(), fetchEuropePmc("", names, options),
    fetchOpenAlex("", options, names)]);
  const papers = mergeLiterature(checks.flatMap((check) => check.value?.papers || [])
    .filter((paper) => hasName(paper.title, names))).slice(0, 8);
  return {
    papers: papers.map((paper) => ({ title: paper.title, url: paper.url, year: paper.year,
      journal: paper.journal, sources: paper.sources,
      methods: methodEvidence(paper.title).filter(([, weight]) => weight >= 28).map(([label]) => label),
    })),
    issues: Object.fromEntries(checks.flatMap((check, index) =>
      check.status === "rejected" ? [[sources[index], providerIssue(check.reason).state]] : [])),
  };
}

export async function fetchLiteratureAbstracts({ pmids, dois }, options) {
  const query = [
    ...pmids.map((id) => `(SRC:MED AND EXT_ID:${id})`),
    ...dois.map((doi) => `DOI:"${doi}"`),
  ].join(" OR ");
  const { papers } = await fetchEuropePmc("", [], options, query);
  return { rows: papers.filter(({ abstractSource }) => abstractSource).map(
    ({ pmid, doi, publicAbstract, abstractSource }) => ({ pmid, doi: doi?.toLowerCase(), publicAbstract, abstractSource }),
  ) };
}
