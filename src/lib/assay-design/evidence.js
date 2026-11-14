const columviReview = "https://www.accessdata.fda.gov/drugsatfda_docs/nda/2023/761309Orig1s000MultidisciplineR.pdf#page=43";
const reviewedBinding = [
  {
    methodType: "Surface plasmon resonance (SPR)",
    methodTypeZh: "表面等离子体共振（SPR）",
    summary: "This study measured binding to human and cynomolgus CD3ε Fc-biotin. Recombinant CD20 was unavailable in this study.",
    summaryZh: "以人和食蟹猴 CD3ε Fc-biotin 为试剂测量结合亲和力；该研究未获得重组 CD20。",
    title: "FDA · BLA761309 · p. 43 · Study 1108724",
    url: columviReview,
  },
  {
    methodType: "Cell binding by flow cytometry",
    methodTypeZh: "流式细胞术结合检测",
    summary: "Binding to CD3-expressing Jurkat cells and CD20-expressing WSU DLCL2 and Z-138 cells was assessed by median fluorescence intensity.",
    summaryZh: "以荧光强度中位数评价对表达 CD3 的 Jurkat 细胞及表达 CD20 的 WSU DLCL2 和 Z-138 细胞的结合。",
    title: "FDA · BLA761309 · p. 43 · Study 1067043, Figure 4",
    url: columviReview,
  },
];

export function activityMethods(documents) {
  const unique = new Map();
  const review = documents.some(({ url, application }) =>
    application === "BLA761309" && url === columviReview.split("#")[0]);
  const rows = review ? [...documents, ...reviewedBinding.map((row) => ({ ...row, kind: "activity" }))] : documents;
  for (const doc of rows) {
    if (doc.kind !== "activity" || !doc.methodType || !doc.summary || !doc.url) continue;
    unique.set(JSON.stringify([doc.url, doc.methodType]), doc);
  }
  return [...unique.values()];
}
