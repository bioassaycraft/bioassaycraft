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
  [/toc\.html|review package/i, "Review package", "审评文件目录"],
  [/chemr|quality|chemistry|\bcmc\b/i, "Product quality review", "药学审评"],
  [/pharmr|pharmtox|nonclinical|pharmacology.{0,4}toxicology/i, "Nonclinical review", "非临床审评"],
  [/multidisciplin|integrated review|integratedr/i, "Multidisciplinary review", "多学科审评"],
  [/sumr|summary review|cross.discipline|cdtl/i, "Summary review", "总结审评"],
  [/clinpharm|clinical pharmacology/i, "Clinical pharmacology review", "临床药理审评"],
  [/medr|clinical review|clinr/i, "Clinical review", "临床审评"],
  [/statistical|statr/i, "Statistical review", "统计审评"],
];

function reviewType(description) {
  return (
    reviewTypes.find(([pattern]) => pattern.test(description)) || [
      null,
      "Review (type unspecified)",
      "审评文件（类型未标注）",
    ]
  );
}

function starterRecord(drug) {
  return (
    starter[drug.id] ||
    Object.entries(starter).find(([id]) => ingredientKey(id) === ingredientKey(drug.name))?.[1]
  );
}

export function approvalMilestones(drug, documents = []) {
  const record = starterRecord(drug);
  const us = documents
    .filter((doc) => doc.agency === "FDA" && doc.kind === "application" && doc.approvedAt)
    .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt))[0];
  return [
    { region: "CN", date: record?.cnIssued, url: record?.cnUrl, certificate: true },
    {
      region: "US",
      date: record?.usApproval || us?.approvedAt,
      url: record
        ? `https://www.accessdata.fda.gov/scripts/purplebooksearch/index.cfm?blaNo=${record.application}&event=productdetails`
        : us?.url,
    },
    {
      region: "EU",
      date: record?.euApproval,
      url: record ? `https://www.ema.europa.eu/en/medicines/human/EPAR/${record.brand}` : null,
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
  if (ingredientKey(drug.name) === "gefitinib") {
    documents.push({
      agency: "FDA",
      kind: "review",
      status: "document",
      application: "NDA206995",
      title: "FDA · Summary review · NDA206995",
      titleZh: "FDA · 总结审评 · NDA206995",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2015/206995Orig1s000SumR.pdf",
    });
  }
  if (record?.application === "761309") {
    documents.push({
      agency: "FDA",
      kind: "activity",
      status: "document",
      application: "BLA761309",
      title: "Product Quality Review · Potency control · pp. 4–5",
      titleZh: "查看 FDA 药学审评 · 效价控制 · 第 4–5 页",
      summary:
        "The quality review describes a cell-based reporter assay for potency control. The readout is NFAT-driven luciferase activity.",
      summaryZh: "药学审评明确将细胞报告基因法用于效价控制，读数为 NFAT 驱动的荧光素酶活性。",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2023/761309Orig1s000ChemR.pdf#page=4",
    });
  }
  if (record?.application === "761309") {
    documents.push({
      agency: "FDA",
      kind: "review",
      status: "document",
      application: "BLA761309",
      title: "FDA · Multidisciplinary review · BLA761309",
      titleZh: "FDA · 多学科审评 · BLA761309",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2023/761309Orig1s000MultidisciplineR.pdf",
    });
  }
  if (record?.year) {
    documents.push({
      agency: "FDA",
      kind: "review",
      status: "document",
      application: `BLA${record.application}`,
      title: "FDA · Review package",
      titleZh: "查看 FDA 申报审评包",
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
      !["https:", "http:"].includes(url.protocol) ||
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
  return submission.submission_status === "AP" && /^\d{8}$/.test(value || "") && value > "19000101"
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
    : null;
}

export function sortReviewEvidence(documents) {
  return [...documents].sort((a, b) =>
    (a.approvedAt || "9999").localeCompare(b.approvedAt || "9999"),
  );
}

export async function fetchFdaDocuments(
  drug,
  { fetcher = fetch, signal = AbortSignal.timeout(20000) } = {},
) {
  const record = starterRecord(drug);
  const name = drug.name.replace(/[^\p{L}\p{N} -]/gu, " ").trim();
  if (!name) return [];
  const search = record
    ? `application_number:BLA${record.application}`
    : `(products.active_ingredients.name:"${name}" OR openfda.generic_name:"${name}" OR products.active_ingredients.name:"${ingredientKey(name)}") AND application_number:(NDA* OR BLA*)`;
  const response = await fetcher(
    `https://api.fda.gov/drug/drugsfda.json?${new URLSearchParams({ search, limit: "30" })}`,
    { signal },
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("fda_unavailable");
  const body = await response.json();
  const documents = new Map();
  const matching = (body.results || []).filter(
    (application) =>
      record ||
      (/^(NDA|BLA)\d{6}$/.test(application.application_number || "") &&
        (application.products || []).some(
          (product) =>
            product.active_ingredients?.length === 1 &&
            ingredientKey(product.active_ingredients[0].name || "") === ingredientKey(name),
        )),
  );
  for (const application of matching) {
    for (const submission of application.submissions || []) {
      for (const doc of submission.application_docs || []) {
        const url = safeOfficialUrl(doc.url);
        if (!url || !/review/i.test(doc.type)) continue;
        const description = `${doc.type} ${new URL(url).pathname}`;
        const [, type, typeZh] = reviewType(description);
        documents.set(url, {
          agency: "FDA",
          kind: "review",
          approvedAt: approvedDate(submission),
          application: application.application_number,
          status: "document",
          title: `FDA · ${type} · ${application.application_number} · ${submission.submission_type} ${submission.submission_number}`,
          titleZh: `FDA · ${typeZh} · ${application.application_number} · ${submission.submission_type} ${submission.submission_number}`,
          url,
          date: doc.date === "19000101" ? null : doc.date,
          fetchedAt: new Date().toISOString(),
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
      return {
        agency: "FDA",
        kind: "application",
        application: id,
        approvedAt,
        status: "document",
        title: `Open Drugs@FDA application ${id}`,
        titleZh: `查看 FDA 申报记录 ${id}`,
        url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${id.slice(-6)}`,
      };
    });
  return sortReviewEvidence([...documents.values(), ...applications]);
}
