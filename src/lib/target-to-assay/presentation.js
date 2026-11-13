import { classifyFdaReview, fdaNavigation, sortReviewEvidence } from "./evidence.js";
import { rankMatches, researchGroups } from "./research.js";

export const candidateView = ":candidates";

export function explorerView(result, selected, presentation = {}) {
  const groups = researchGroups(result);
  const full = groups[0];
  const showCandidates = selected === candidateView;
  const active = (showCandidates ? full : groups.find(({ key }) => key === selected)) || full;
  const exact = new Set(full.matches.map(({ drugId }) => drugId));
  const unique = new Map();
  for (const match of full.candidates || []) {
    if (!exact.has(match.drugId) && !unique.has(match.drugId)) unique.set(match.drugId, match);
  }
  return { groups, active, showCandidates, candidates: rankMatches([...unique.values()], presentation) };
}

export function regulatorGroups(documents) {
  const epar = /^https:\/\/www\.ema\.europa\.eu\/en\/medicines\/human\/EPAR\/[\w-]+\/?$/i;
  const ema = documents.filter(({ agency }) => agency === "EMA").map((doc) =>
    epar.test(doc.url) ? { ...doc, kind: "overview", title: "EPAR – Medicine Overview", titleZh: null } :
      doc.kind === "review" ? { ...doc, title: "EPAR Assessment Report", titleZh: null } : doc);
  const emaRank = ({ kind }) => kind === "overview" ? 0 : kind === "review" ? 1 : 2;
  return [
    { agency: "FDA", docs: sortReviewEvidence(documents.filter(({ agency }) => agency === "FDA")) },
    { agency: "EMA", docs: sortReviewEvidence(ema).sort((a, b) => emaRank(a) - emaRank(b)) },
    { agency: "NMPA / CDE", docs: sortReviewEvidence(documents.filter(({ agency, kind }) =>
      ["NMPA", "CDE"].includes(agency) && !["portal", "manual_search"].includes(kind))) },
  ].filter(({ docs }) => docs.length);
}

export const fdaReviewLimit = 6;

export function visibleReviewDocuments(group, expanded) {
  if (group.agency !== "FDA" || expanded) return group.docs;
  return [...group.docs.filter(fdaNavigation),
    ...group.docs.filter(({ kind }) => kind === "review").slice(0, fdaReviewLimit),
    ...group.docs.filter((doc) => !fdaNavigation(doc) && doc.kind !== "review")];
}

export function fdaDocumentDisplay(doc) {
  const application = doc.application?.replace(/^(BLA|NDA|ANDA)\s*(\d+)$/, "$1 $2");
  const submission = doc.submissionType === "ORIG" ? "Original Application" :
    doc.submissionType === "SUPPL" ? ["Supplement", doc.submissionNumber].filter(Boolean).join(" ") : null;
  const category = doc.kind === "review" ? doc.category || classifyFdaReview(doc.title).category : null;
  const otherReview = category === "Other Reviews";
  const file = otherReview ? doc.url?.split(/[?#]/)[0].split("/").at(-1) : null;
  const originalType = doc.originalType?.trim();
  return {
    fileId: file && /^[a-z0-9_.-]+\.pdf$/i.test(file) ? file : null,
    title: doc.kind === "overview" ? "Drugs@FDA – Application Overview" :
      doc.kind === "review_package" ? "Review Package / Table of Contents" :
        category ? (otherReview && originalType && !/^(?:other\s+)?reviews?$/i.test(originalType) ? originalType : category) :
          doc.title.replace(/^FDA · /, ""),
    metadata: [application, submission].filter(Boolean).join(" · "),
    supplementApprovedAt: doc.submissionType === "SUPPL" ? doc.approvedAt : null,
  };
}

export function uniqueIndications(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const keys = [row.indicationKey, row.name.normalize("NFKC").toLowerCase()
      .replace(/tumour/g, "tumor").replace(/[^\p{L}\p{N}]+/gu, " ").trim()].filter(Boolean);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

// Group only explicit inhibitory PD-1 mechanisms. Keep agonists and
// ambiguous descriptions separate rather than grouping by target alone.
export function pd1Blockade(row) {
  const text = (row.mechanismDescription || "").trim().replace(/\.$/, "");
  if (/\b(?:agonist|activator|activates|stimulates)\b/i.test(text) ||
      /^(?:AGONIST|ACTIVATOR)$/i.test(row.actionType || "")) return false;
  return /^(?:PD-?1|programmed cell death protein 1) (?:inhibitor|antagonist|blocker)$/i.test(text) ||
    /^(?:INHIBITOR|ANTAGONIST|BLOCKER)$/i.test(row.actionType || "");
}
