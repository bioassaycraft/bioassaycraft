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

export function parsePubmedArticles(xml, aliases = []) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror, ERROR")) throw new Error("literature_unavailable");
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
          title,
          publicationKind,
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

export async function fetchLiteratureSource(term, { fetcher = fetch, signal } = {}) {
  const search = new URLSearchParams({
    db: "pubmed",
    term: `(${term}) AND (${methodTerm}) AND hasabstract[text]`,
    retmode: "json",
    retmax: "24",
    sort: "relevance",
  });
  const response = await fetcher(`${endpoint}esearch.fcgi?${search}`, { signal, redirect: "manual" });
  if (!response.ok) throw new Error("upstream_" + response.status);
  const result = (await response.json()).esearchresult;
  if (!Array.isArray(result?.idlist)) throw new Error("literature_unavailable");
  const ids = result.idlist.filter((id) => /^\d+$/.test(id));
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
  return { ...source, papers: source.xml ? parsePubmedArticles(source.xml, aliases).slice(0, 6) : [] };
}
