import { reviewedFdaRecord, validApprovalDate } from "./approval-records.js";
import { ingredientKey } from "./display.js";

const starter = {
  ofatumumab: {
    brand: "kesimpta",
    application: "125326",
    usApproval: "2009-10-26",
  },
  ocrelizumab: {
    brand: "ocrevus",
    application: "761053",
    year: "2017",
    usApproval: "2017-03-28",
    euApproval: "2018-01-08",
  },
  "ublituximab-xiiy": {
    brand: "briumvi",
    application: "761238",
    year: "2023",
    usApproval: "2022-12-28",
    euApproval: "2023-05-31",
  },
  rituximab: {
    brand: "mabthera",
    application: "103705",
    usApproval: "1997-11-26",
    euApproval: "1998-06-02",
  },
  obinutuzumab: {
    brand: "gazyvaro",
    application: "125486",
    usApproval: "2013-11-01",
    euApproval: "2014-07-23",
  },
  blinatumomab: {
    brand: "blincyto",
    application: "125557",
    year: "2014",
    usApproval: "2014-12-03",
    euApproval: "2015-11-23",
    cnIssued: "2020-12-02",
    cnUrl: "https://pharm.ncmi.cn/zysjk/ypjkyp/202312/t20231205_398591.html",
  },
  "mosunetuzumab-axgb": {
    brand: "lunsumio",
    application: "761263",
    year: "2023",
    usApproval: "2022-12-22",
    euApproval: "2022-06-03",
  },
  "glofitamab-gxbm": {
    brand: "columvi",
    application: "761309",
    year: "2023",
    usApproval: "2023-06-15",
    euApproval: "2023-07-07",
    cnIssued: "2023-11-07",
    cnUrl: "https://pharm.ncmi.cn/zysjk/ypjkyp/202312/t20231205_400983.html",
  },
};
const reviewTypes = [
  [/integrated quality assessment|\biqa\b/i, "Integrated Quality Assessment", 2],
  [/chemr|product quality|chemistry review|\bcmc\b/i, "Product Quality Review", 1],
  [/multi[- ]?disciplin|integrated review|integratedr/i, "Multidisciplinary Review", 3],
  [/sumr|summary review|cross.discipline|cdtl/i, "Summary Review", 4],
  [/clinpharm|clinical pharmacology/i, "Clinical Pharmacology Review", 5],
  [/pharmr|pharmtox|non[- ]?clinical|pharmacology.{0,4}toxicology/i, "Nonclinical Review", 6],
  [/medr|clinical review|clinr/i, "Clinical Review", 7],
  [/statistical|statr/i, "Statistical Review", 8],
];

export function classifyFdaReview(metadata) {
  const [, category, priority] = reviewTypes.find(([pattern]) => pattern.test(metadata)) ||
    [null, "Other Reviews", 9];
  return { category, priority };
}

const relevanceTerms = [/\bpotency\b/i, /\bbioassays?\b/i, /biological activity/i,
  /analytical methods?/i, /method validation/i];

export const fdaNavigation = (doc) => doc.agency === "FDA" &&
  (doc.kind === "overview" || doc.kind === "review_package");

const overview = (id, approvedAt = null) => ({
  agency: "FDA",
  kind: "overview",
  application: id,
  approvedAt,
  status: "document",
  title: `Drugs@FDA – Application Overview · ${id}`,
  url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${id.slice(-6)}`,
});

function starterRecord(drug) {
  return Object.entries(starter).find(([id]) => ingredientKey(id) === ingredientKey(drug.name))?.[1];
}

export function approvalMilestones(drug, documents = [], european) {
  const record = starterRecord(drug);
  const us = documents
    .filter((doc) => doc.agency === "FDA" && doc.kind === "overview" && doc.approvedAt)
    .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt))[0];
  const reviewed = reviewedFdaRecord(drug);
  const fda = drug.regulatoryApprovals?.find(({ agency }) => agency === "FDA");
  const ema = drug.regulatoryApprovals?.find(({ agency }) => agency === "EMA");
  return [
    { region: "CN", date: record?.cnIssued, url: record?.cnUrl, certificate: true },
    {
      region: "US",
      date: fda?.date || reviewed?.date || record?.usApproval || us?.approvedAt,
      url: fda?.url || reviewed?.url || (record
        ? `https://www.accessdata.fda.gov/scripts/purplebooksearch/index.cfm?blaNo=${record.application}&event=productdetails`
        : us?.url),
    },
    {
      region: "EU",
      date: european?.date || ema?.date || record?.euApproval,
      status: european?.status,
      url: european?.url || ema?.url || (record ? `https://www.ema.europa.eu/en/medicines/human/EPAR/${record.brand}` : null),
    },
  ];
}

export function evidenceFor(drug, sources = []) {
  const record = starterRecord(drug);
  const source = sources.find((s) => s.id === drug.sourceId);
  const documents =
    source && drug.verification === "imported"
      ? [
          {
            ...source,
            agency: "Open Targets",
            kind: "target_evidence",
            status: "document",
          },
        ]
      : [];
  const reviewed = reviewedFdaRecord(drug);
  if (reviewed && !reviewed.documents) documents.push({
    agency: "FDA", kind: "application", status: "document", approvedAt: reviewed.date,
    application: reviewed.application, title: "FDA · " + reviewed.brand, url: reviewed.url,
  });
  const application = reviewed?.application || (record && `BLA${record.application}`);
  if (application && reviewed?.type !== "car_t")
    documents.push(overview(application, reviewed?.date || record?.usApproval));
  if (reviewed?.documents)
    documents.push(...reviewed.documents.map((doc) => ({ agency: "FDA", kind: "review",
      status: "document", application, ...doc, ...classifyFdaReview(doc.title) })));
  if (drug.regulatoryApprovals?.length) {
    documents.push(...drug.regulatoryApprovals.map((approval) => ({
      agency: approval.agency,
      kind: "application",
      status: "document",
      approvedAt: approval.date,
      application: approval.identifier,
      title: approval.agency + " · " + approval.identifier,
      url: approval.url,
    })));
    if (source && !documents.some((doc) => doc.url === source.url)) {
      documents.push({ ...source, agency: drug.approval.agency, kind: "label", status: "document" });
    }
  }
  if (ingredientKey(drug.name) === "gefitinib") {
    documents.push({
      agency: "FDA",
      kind: "review",
      status: "document",
      application: "NDA206995",
      title: "FDA · Summary Review · NDA206995",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2015/206995Orig1s000SumR.pdf",
    });
  }
  if (record?.application === "761309") {
    documents.push({
      agency: "FDA",
      kind: "activity",
      status: "document",
      application: "BLA761309",
      submissionType: "ORIG",
      title: "FDA · Product Quality Review · BLA761309 · pp. 4–5",
      methodType: "Cell-based reporter assay",
      methodTypeZh: "细胞报告基因法",
      excerpt: "Potency is controlled using a cell-based reporter assay",

      summary:
        "The potency assay measures activation of CD3-expressing Jurkat reporter cells in the presence of CD20-expressing Z-138 or WIL2-S cells. The signal is NFAT-driven firefly luciferase.",
      summaryZh: "效价检测使用表达 CD3 的 Jurkat 报告细胞和表达 CD20 的 Z-138 或 WIL2-S 靶细胞，以 NFAT 驱动的萤火虫荧光素酶为读数。",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2023/761309Orig1s000ChemR.pdf#page=4",
    });
  }
  if (record?.application === "761309") {
    documents.push({
      agency: "FDA",
      kind: "review",
      status: "document",
      application: "BLA761309",
      submissionType: "ORIG",
      title: "FDA · Multidisciplinary Review · BLA761309",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2023/761309Orig1s000MultidisciplineR.pdf",
    });
  }
  if (record?.year) {
    documents.push({
      agency: "FDA",
      kind: "review_package",
      status: "document",
      application: `BLA${record.application}`,
      title: "Review Package / Table of Contents",
      url: `https://www.accessdata.fda.gov/drugsatfda_docs/nda/${record.year}/${record.application}Orig1s000TOC.html`,
    });
    documents.push({
      agency: "EMA",
      approvedAt: record.euApproval,
      kind: "review",
      status: "document",
      title: "EMA · EPAR public assessment report",
      url: `https://www.ema.europa.eu/en/documents/assessment-report/${record.brand}-epar-public-assessment-report_en.pdf`,
    });
  }
  if (record) {
    documents.push({
      agency: "EMA",
      approvedAt: record.euApproval,
      kind: "history",
      status: "document",
      title: "Open the medicine’s EMA assessment history",
      titleZh: "查看该药 EMA 审评历史",
      url: `https://www.ema.europa.eu/en/medicines/human/EPAR/${record.brand}#assessment-history`,
    });
  }
  if (record?.application === "761309") {
    documents.push({
      agency: "NMPA",
      kind: "approval_notice",
      status: "document",
      title: "NMPA conditional approval notice for Columvi",
      titleZh: "查看格菲妥单抗附条件批准公告",
      url: "https://www.nmpa.gov.cn/zhuanti/cxylqx/cxypxx/20231108092338150.html",
    });
  }
  return documents;
}
export function safeOfficialUrl(value) {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) || url.port || url.username || url.password ||
      !["www.accessdata.fda.gov", "www.fda.gov"].includes(url.hostname)
    )
      return null;
    url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
}
function approvedDate(submission) {
  const value = submission.submission_status_date;
  if (submission.submission_status !== "AP" || !/^\d{8}$/.test(value || "")) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  return validApprovalDate(iso) ? iso : null;
}

export function sortReviewEvidence(documents) {
  const rank = (doc) => doc.kind === "overview" ? -2 : doc.kind === "review_package" ? -1 :
    doc.priority ?? classifyFdaReview(doc.title || "").priority;
  const submissionRank = (doc) => ({ ORIG: 0, SUPPL: 1 })[doc.submissionType] ?? 2;
  const sorted = [...documents].sort((a, b) =>
    Number(b.agency === "FDA") - Number(a.agency === "FDA") ||
    (a.agency === "FDA" && b.agency === "FDA" ? rank(a) - rank(b) ||
      (b.relevance || 0) - (a.relevance || 0) || submissionRank(a) - submissionRank(b) : 0) ||
    (a.approvedAt || "9999").localeCompare(b.approvedAt || "9999") ||
    (a.date || "9999").localeCompare(b.date || "9999") ||
    (a.url || "").localeCompare(b.url || "", "en") ||
    String(a.recordId ?? "").localeCompare(String(b.recordId ?? ""), "en"));
  // The UI groups by agency before sorting; deduplicate identical official URLs within each group.
  const seen = new Set();
  return sorted.filter((doc) => {
    const key = doc.url && (doc.agency === "FDA"
      ? doc.url.split(/[?#]/)[0] + (doc.kind === "overview" ? doc.application : "")
      : doc.url);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Some FDA indexes render their links from a file list embedded in the index.
// Read only explicit anchors and enabled review entries; do not execute the page script.
export function fdaIndexReviews(html, index) {
  const indexUrl = new URL(index.url);
  const baseName = indexUrl.pathname.split("/").at(-1).replace(/toc\.(?:html?|cfm)$/i, "");
  const entries = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"'\s]+\.pdf)["'][^>]*>([^<]{1,200})<\/a>/gi)]
    .filter(([, , title]) => /review|quality assessment/i.test(title)).map(([, file, title]) => ({ file, title }));
  const config = html.match(/var\s+pdfFiles\s*=\s*\{([\s\S]{1,4000}?)\};/)?.[1];
  const statedBase = html.match(/var\s+pdfBaseName\s*=\s*["']([\w-]+)["']\s*;/)?.[1];
  if (config && statedBase === baseName) {
    const enabled = new Set([...config.matchAll(/\b(\w+)\s*:\s*1\b/g)].map((match) => match[1]));
    for (const [, key, suffix, title] of html.matchAll(
      /if\s*\(pdfFiles\.(\w+)\s*==\s*1\)\s*\{\s*reviewHtml\s*\+=\s*'<li><a href="'\s*\+\s*pdfBaseName\s*\+\s*'([\w-]+\.pdf)"[^>]*>([^<]{1,200})<\/a>/g,
    )) {
      if (enabled.has(key)) entries.push({ file: statedBase + suffix, title });
    }
  }
  return entries.flatMap(({ file, title }) => {
    let target;
    try { target = new URL(file, indexUrl); } catch { return []; }
    const filename = target.pathname.split("/").at(-1);
    if (target.origin !== indexUrl.origin || target.pathname.slice(0, -filename.length) !==
      indexUrl.pathname.slice(0, indexUrl.pathname.lastIndexOf("/") + 1) ||
      !filename.toLowerCase().startsWith(baseName.toLowerCase()) || !safeOfficialUrl(target.href)) return [];
    const classification = classifyFdaReview(title + " " + filename);
    return [{ ...index, ...classification, kind: "review", sourceUrl: index.url, originalType: title.trim(),
      title: index.title.replace("Review Package / Table of Contents", classification.category),
      url: target.href }];
  });
}

async function readFdaIndex(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let html = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return html + decoder.decode();
    size += value.byteLength;
    if (size > 256_000) {
      await reader.cancel();
      throw new Error("unexpected_fda_index_size");
    }
    html += decoder.decode(value, { stream: true });
  }
}

export async function fetchFdaDocuments(
  drug,
  { fetcher = fetch, signal = AbortSignal.timeout(12000), withStatus = false } = {},
) {
  const record = starterRecord(drug);
  const reviewed = reviewedFdaRecord(drug);
  const fetchedAt = new Date().toISOString();
  const finish = (rows, truncated = false, validationFailures = 0) => withStatus ? { rows, truncated, validationFailures, retrievedAt: fetchedAt } : rows;
  const name = drug.name.replace(/[^\p{L}\p{N} -]/gu, " ").trim();
  if (!name) return finish([]);
  const applicationId = reviewed?.application || (record && `BLA${record.application}`);
  const brandNames = [...new Set([drug.brand, ...(drug.aliases || [])])]
    .filter((value) => typeof value === "string" && /^[a-z0-9][a-z0-9 .-]{2,55}$/i.test(value))
    .slice(0, 4);
  const terms = [
    `products.active_ingredients.name:"${name}"`,
    `openfda.generic_name:"${name}"`,
    `products.active_ingredients.name:"${ingredientKey(name)}"`,
    ...brandNames.map((brand) => `products.brand_name:"${brand}"`),
  ];
  const search = applicationId ? `application_number:${applicationId}` :
    `(${terms.join(" OR ")}) AND application_number:(NDA* OR BLA*)`;
  const response = await fetcher(
    `https://api.fda.gov/drug/drugsfda.json?${new URLSearchParams({ search, limit: "30" })}`,
    { signal, redirect: "manual" },
  );
  if (response.status === 404) return finish([]);
  if (!response.ok) throw new Error("upstream_" + response.status);
  const body = await response.json();
  if (!Array.isArray(body.results)) throw new Error("unexpected_fda_response");
  const documents = [];
  const matching = body.results.filter((application) =>
    /^(NDA|BLA)\d{6}$/.test(application.application_number || "") &&
    (!applicationId || application.application_number === applicationId) &&
    ((application.products || []).some((product) =>
      product.active_ingredients?.length === 1 &&
      ingredientKey(product.active_ingredients[0].name || "") === ingredientKey(name),
    ) || (!application.products?.length && applicationId)),
  );
  for (const application of matching) {
    for (const submission of application.submissions || []) {
      for (const doc of submission.application_docs || []) {
        const url = safeOfficialUrl(doc.url);
        if (!url || !/review/i.test(doc.type)) continue;
        const path = new URL(url).pathname;
        const filename = path.split("/").at(-1);
        // FDA's document metadata binds each review to an application. Require the URL to
        // corroborate that binding; separately reviewed exceptions come from curated evidence.
        if (filename.match(/^\d+/)?.[0] !== application.application_number.slice(-6)) continue;
        const packageIndex = /toc\.(?:html?|cfm)$/i.test(filename);
        if (!packageIndex && !/\.pdf$/i.test(filename)) continue;
        const submissionType = submission.submission_type;
        const submissionNumber = submission.submission_number;
        const suffix = filename.match(/(?:Orig\d+)?s(\d{3})(?=\D|$)/i)?.[1];
        if (suffix && /^\d+$/.test(submissionNumber) && Number(suffix) !==
          (submissionType === "ORIG" ? 0 : Number(submissionNumber))) continue;
        const description = `${doc.type} ${doc.title || ""} ${doc.description || ""}`;
        const classification = classifyFdaReview(`${description} ${path}`);
        const label = packageIndex ? "Review Package / Table of Contents" : classification.category;
        const submissionLabel = submissionType === "ORIG" ? "Original Application" :
          submissionType === "SUPPL" ? "Supplement" : "Submission type unspecified";
        documents.push({
          agency: "FDA",
          kind: packageIndex ? "review_package" : "review",
          ...(packageIndex ? {} : classification),
          relevance: relevanceTerms.filter((term) => term.test(description)).length,
          approvedAt: approvedDate(submission),
          application: application.application_number,
          submissionType, submissionNumber,
          recordId: doc.id || null,
          originalType: typeof doc.type === "string" ? doc.type.trim() : "",
          status: "document",
          title: `${label} · ${application.application_number} · ${submissionLabel}${submissionNumber ? " " + submissionNumber : ""}`,
          url,
          date: /^\d{8}$/.test(doc.date) && doc.date !== "19000101"
            ? `${doc.date.slice(0, 4)}-${doc.date.slice(4, 6)}-${doc.date.slice(6)}` : null,
          fetchedAt,
        });
      }
    }
  }
  const applications = matching
    .filter((app) => /^(?:BLA|NDA|ANDA)\d{6}$/.test(app.application_number))
    .map((app) => {
      const id = app.application_number;
      const approvedAt =
        (app.submissions || [])
          .filter((submission) => submission.submission_type === "ORIG")
          .map(approvedDate)
          .filter(Boolean)
          .sort()[0] || null;
      const applicationSponsor = typeof app.sponsor_name === "string" ? app.sponsor_name.trim() : "";
      return { ...overview(id, approvedAt), fetchedAt, ...(approvedAt && applicationSponsor && { applicationSponsor }) };
    });
  const indexes = sortReviewEvidence(documents.filter((doc) => doc.kind === "review_package"));
  const checked = [];
  let validationFailures = 0;
  const indexReviews = await Promise.all(indexes.slice(0, 4).map(async (doc) => {
    try {
      const result = await fetcher(doc.url, { redirect: "manual",
        signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });
      if (!result.ok || !/^text\/html\b/i.test(result.headers.get("Content-Type") || ""))
        throw new Error("unexpected_fda_index");
      const html = await readFdaIndex(result);
      checked.push(doc);
      return fdaIndexReviews(html, doc);
    } catch {
      validationFailures++;
      return [];
    }
  }));
  const candidates = sortReviewEvidence([...documents.filter((doc) => doc.kind === "review"), ...indexReviews.flat()]);
  let attempted = 0;
  for (let offset = 0; offset < Math.min(candidates.length, 36) && !signal.aborted; offset += 6) {
    const batch = candidates.slice(offset, Math.min(offset + 6, 36));
    attempted += batch.length;
    await Promise.all(batch.map(async (doc) => {
      try {
        const result = await fetcher(doc.url, { method: "HEAD", redirect: "manual",
          signal: AbortSignal.any([signal, AbortSignal.timeout(2500)]) });
        if (result.ok && /^application\/pdf\b/i.test(result.headers.get("Content-Type") || "")) checked.push(doc);
        else validationFailures++;
      } catch {
        validationFailures++;
      }
    }));
  }
  return finish(sortReviewEvidence([...checked, ...applications]),
    indexes.length > 4 || attempted < candidates.length ||
    Number(body.meta?.results?.total) > body.results.length, validationFailures);
}
