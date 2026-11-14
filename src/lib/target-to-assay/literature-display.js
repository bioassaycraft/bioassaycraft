const normalize = (value = "") => value.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const doi = (value = "") => value.replace(/^https?:\/\/doi\.org\//i, "").toLowerCase().trim();

export function abstractLicense(value) {
  const label = String(value || "").trim().toLowerCase();
  const match = /^(?:https?:\/\/creativecommons\.org\/licenses\/by\/([34]\.0)\/?|cc[ -]by[ -]([34]\.0))$/.exec(label);
  if (label === "cc by" || label === "cc-by") return { label: "CC BY" };
  if (!match) return null;
  const version = match[1] || match[2];
  return { label: "CC BY " + version, url: `https://creativecommons.org/licenses/by/${version}/` };
}

export function collapsePublicationVersions(papers) {
  const matched = new Map();
  const published = papers.filter((paper) => paper.preprint === false);
  for (const preprint of papers.filter((paper) => paper.preprint)) {
    const explicitlyLinked = published.filter((paper) =>
      (preprint.publishedDoi && doi(preprint.publishedDoi) === doi(paper.doi)) ||
      (paper.preprintPmids || []).includes(preprint.pmid) ||
      (preprint.publishedPmids || []).includes(paper.pmid));
    const candidates = explicitlyLinked.length ? explicitlyLinked : published.filter((paper) => {
      const title = normalize(preprint.title);
      return title.length >= 30 && title === normalize(paper.title) &&
        preprint.authorKeys?.length >= 2 &&
        preprint.authorKeys.join("|") === paper.authorKeys?.join("|") &&
        Number(paper.year) >= Number(preprint.year) && Number(paper.year) - Number(preprint.year) <= 2;
    });
    if (candidates.length === 1) matched.set(preprint, candidates[0]);
  }
  const placed = new Set();
  return papers.flatMap((record) => {
    const paper = matched.get(record) || record;
    if (placed.has(paper)) return [];
    placed.add(paper);
    const versions = [...matched].filter(([, journal]) => journal === paper).map(([preprint]) => preprint);
    const licensedVersion = versions.find(({ publicAbstract }) => publicAbstract);
    return [{ ...paper,
      publicAbstract: paper.publicAbstract || (licensedVersion && { ...licensedVersion.publicAbstract, preprint: true }),
      abstractSource: paper.abstractSource || versions.find(({ abstractSource }) => abstractSource)?.abstractSource,
      preprints: versions.map(({ url }) => ({ url })),
    }];
  });
}
