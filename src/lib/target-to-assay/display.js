const conditions = {
  "non-small cell lung cancer": "非小细胞肺癌",
  "lung non-small cell carcinoma": "非小细胞肺癌",
  "lung cancer": "肺癌",
  "lung adenocarcinoma": "肺腺癌",
  neoplasm: "肿瘤",
  cancer: "癌症",
  "colorectal cancer": "结直肠癌",
  "colorectal adenocarcinoma": "结直肠腺癌",
  "colorectal neoplasm": "结直肠肿瘤",
  "head and neck squamous cell carcinoma": "头颈部鳞状细胞癌",
  "pancreatic carcinoma": "胰腺癌",
  "carcinoid syndrome": "类癌综合征",
  "squamous cell carcinoma": "鳞状细胞癌",
  glioblastoma: "胶质母细胞瘤",
  "malignant neoplasm of lung": "肺恶性肿瘤",
  "breast cancer": "乳腺癌",
  lymphoma: "淋巴瘤",
  "chronic lymphocytic leukemia": "慢性淋巴细胞白血病",
  "neoplasm of mature b-cells": "成熟 B 细胞肿瘤",
  "relapsing-remitting multiple sclerosis": "复发缓解型多发性硬化",
  "non-hodgkins lymphoma": "非霍奇金淋巴瘤",
  "follicular lymphoma": "滤泡性淋巴瘤",
  "mantle cell lymphoma": "套细胞淋巴瘤",
  "non-hodgkin lymphoma": "非霍奇金淋巴瘤",
  "b-cell precursor acute lymphoblastic leukemia": "B 细胞前体急性淋巴细胞白血病",
  "b-cell acute lymphoblastic leukemia": "B 细胞急性淋巴细胞白血病",
  "common variable immunodeficiency": "普通变异型免疫缺陷病",
  "small cell lung carcinoma": "小细胞肺癌",
  "non-small cell lung carcinoma": "非小细胞肺癌",
  melanoma: "黑色素瘤",
  "renal cell carcinoma": "肾细胞癌",
  "crohn disease": "克罗恩病",
  "inflammatory bowel disease": "炎症性肠病",
  "ulcerative colitis": "溃疡性结肠炎",
  "atopic eczema": "特应性湿疹",
  "immunodeficiency, common variable, 3": "普通变异型免疫缺陷病 3 型",
  "diffuse large b-cell lymphoma": "弥漫性大 B 细胞淋巴瘤",
  "systemic lupus erythematosus": "系统性红斑狼疮",
  "marginal zone lymphoma": "边缘区淋巴瘤",
  "hematologic malignancy": "血液系统恶性肿瘤",
};
const prefixes = {
  metastatic: "转移性",
  refractory: "难治性",
  relapsed: "复发性",
  advanced: "晚期",
};
const organizations = {
  "roche registration gmbh": "罗氏注册有限公司",
  "hoffmann-la roche": "罗氏",
  "janssen research & development, llc": "杨森研发有限责任公司",
  "hutchison medipharma limited": "和黄医药",
  "roswell park cancer institute": "罗斯韦尔帕克癌症研究所",
  "rakuten medical, inc.": "乐天医疗",
  "brown university": "布朗大学",
  "yonsei university": "延世大学",
  "tel-aviv sourasky medical center": "特拉维夫苏拉斯基医疗中心",
  "national cancer institute (nci)": "美国国家癌症研究所（NCI）",
  "the lymphoma academic research organisation": "淋巴瘤学术研究组织",
};

export function conditionName(name, locale) {
  if (locale !== "zh") return name;
  const key = name.trim().toLowerCase();
  if (Object.hasOwn(conditions, key)) return conditions[key];
  const [prefix, ...rest] = key.split(" ");
  const base = rest.join(" ");
  if (Object.hasOwn(prefixes, prefix) && Object.hasOwn(conditions, base)) {
    return prefixes[prefix] + conditions[base];
  }
  const stage = key.match(/^stage (iiib|iiic|iv) lung cancer ajcc v(\d+)$/i);
  return stage ? `${stage[1].toUpperCase()} 期肺癌（AJCC 第 ${stage[2]} 版）` : name;
}

export function organizationName(name, locale) {
  const key = name.trim().toLowerCase();
  return locale === "zh" && Object.hasOwn(organizations, key) ? organizations[key] : name;
}

export function drugDisplayName(name) {
  const text = name === name.toUpperCase() ? name.toLowerCase() : name;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Chinese generic names verified against NMPA, NHSA or the marketing authorisation holder.
const chineseDrugNames = {
  bevacizumab: "贝伐珠单抗",
  blinatumomab: "贝林妥欧单抗",
  cetuximab: "西妥昔单抗",
  glofitamab: "格菲妥单抗",
  mosunetuzumab: "莫妥珠单抗",
  obinutuzumab: "奥妥珠单抗",
  ocrelizumab: "奥瑞利珠单抗",
  ofatumumab: "奥法妥木单抗",
  rituximab: "利妥昔单抗",
  trastuzumab: "曲妥珠单抗",
};

export const ingredientKey = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/-[a-z]{4}$/, "")
    .replace(
      / (hydrochloride|mesylate|maleate|dimaleate|tosylate|dihydrochloride|sodium|potassium|monohydrate)$/i,
      "",
    );

export const chineseDrugName = (name) => Object.hasOwn(chineseDrugNames, ingredientKey(name))
  ? chineseDrugNames[ingredientKey(name)] : null;

export function drugHeadingName(name, locale) {
  const display = drugDisplayName(name);
  const key = ingredientKey(name);
  return locale === "zh" && Object.hasOwn(chineseDrugNames, key)
    ? `${display}（${chineseDrugNames[key]}）`
    : display;
}
