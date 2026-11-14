import { conditionName } from "./display.js";

const cellNames = new Map(Object.entries({
  "b-cells": "B 细胞",
  "b cells": "B 细胞",
  "naive b-cell": "初始 B 细胞",
  "memory b-cell": "记忆 B 细胞",
  "late primary spermatocytes": "晚期初级精母细胞",
  "t-cells": "T 细胞",
  "t cells": "T 细胞",
  "nk-cells": "NK 细胞",
  "nk cells": "NK 细胞",
  "monocytes": "单核细胞",
  "macrophages": "巨噬细胞",
  "dendritic cells": "树突状细胞",
  "epithelial cells": "上皮细胞",
  "plasma cells": "浆细胞",
  "oocytes": "卵母细胞",
  "oligodendrocyte progenitor cells": "少突胶质前体细胞",
  "differentiating spermatogonia": "分化型精原细胞",
  "naive cd8 t-cell": "初始 CD8 T 细胞",
  "memory cd8 t-cell": "记忆 CD8 T 细胞",
  "memory cd4 t-cell": "记忆 CD4 T 细胞",
  "mait t-cell": "黏膜相关恒定 T 细胞",
  "lymphoid tissue": "淋巴组织",
  "intestine": "肠道",
  "heart muscle": "心肌",
  "brain": "脑",
  "lung": "肺",
  "ovary": "卵巢",
}));

export const expressionName = (name, locale) => locale === "zh"
  ? cellNames.get(name.trim().toLowerCase()) || conditionName(name, locale)
  : name;

export function expressionLayers(profiles = []) {
  return {
    baseline: profiles.filter(({ kind }) => kind !== "cancer_bulk_rna"),
    bulk: profiles.filter(({ kind }) => kind === "cancer_bulk_rna"),
  };
}

export function formatExpression(profile, locale) {
  const chinese = locale === "zh";
  return profile.values.map(({ name, value }) => {
    const reading = [value, profile.unit].filter((item) => item !== "").join(" ");
    return expressionName(name, locale) + (chinese ? `（${reading}）` : ` (${reading})`);
  }).join(chinese ? "，" : ", ");
}
