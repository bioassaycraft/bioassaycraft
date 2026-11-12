import { ingredientKey } from "./display.js";

const reviewed = {
  evolocumab: {
    type: "monoclonal",
    category: "pcsk9_protein",
    mechanismZh: "选择性结合 PCSK9，阻止其与 LDL 受体结合，从而减少 LDL 受体降解。",
    mechanismSource: { sourceName: "EMA", recordId: "Repatha §5.1", originalUrl: "https://www.ema.europa.eu/en/documents/product-information/repatha-epar-product-information_en.pdf" },
  },
  inclisiran: {
    type: "sirna",
    category: "pcsk9_rnai",
    identity: {
      primaryId: "CHEMBL3990033",
      equivalentIds: ["CHEMBL5095052"],
      source: { sourceName: "FDA", recordId: "Leqvio NDA 214012 · §11", originalUrl: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/214012lbl.pdf" },
    },
    mechanismZh: "通过 RNA 干扰促进 PCSK9 mRNA 降解，降低 PCSK9 蛋白表达。",
    mechanismSource: { sourceName: "EMA", recordId: "Leqvio §5.1", originalUrl: "https://www.ema.europa.eu/en/documents/product-information/leqvio-epar-product-information_en.pdf" },
  },
  tafolecimab: {
    type: "monoclonal",
    category: "pcsk9_protein",
    mechanismZh: "PCSK9 抑制剂。",
    mechanismSource: { sourceName: "NMPA", recordId: "Tafolecimab", originalUrl: "https://english.nmpa.gov.cn/2023-08/16/c_963942.htm" },
    chinaApproved: true,
  },
};

export function reviewedMechanism(name) {
  const ingredient = ingredientKey(name);
  return Object.hasOwn(reviewed, ingredient) ? reviewed[ingredient] : undefined;
}

const terminology = new Map([
  ["subtilisin/kexin type 9 inhibitor", "PCSK9 抑制剂。"],
  ["pcsk9 mrna rnai inhibitor", "通过 RNA 干扰作用于 PCSK9 mRNA，降低 PCSK9 表达。"],
  ["cd19 binding agent", "CD19 结合剂。"],
  ["antibody-mediated cell killing", "抗体介导的细胞杀伤。"],
  ["pd-1 inhibitor", "PD-1 抑制剂。"],
  ["programmed cell death protein 1 inhibitor", "PD-1 抑制剂。"],
  ["pd-1 antagonist", "PD-1 拮抗剂。"],
  ["programmed cell death protein 1 antagonist", "PD-1 拮抗剂。"],
  ["b-lymphocyte antigen cd20 binding agent", "B 淋巴细胞抗原 CD20 结合剂。"],
]);

export function bilingualMechanism(name, original, source, reviewedZh) {
  const record = reviewedMechanism(name);
  const term = terminology.get(original?.trim().replace(/\.$/, "").toLowerCase());
  const mechanismZh = record?.mechanismZh || reviewedZh || term;
  return {
    mechanismOriginal: original,
    mechanismZh,
    mechanismSource: record?.mechanismSource || source,
    translationStatus: record || reviewedZh ? "reviewed" : term ? "term_mapping" : "unavailable",
  };
}
