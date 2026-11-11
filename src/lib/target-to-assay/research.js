// Product-level fields verified against the EMA assessment and authorization record.
const columvi = {
  type: { zh: "双特异性抗体", en: "Bispecific antibody" },
  sponsor: "Roche Registration GmbH",
  brand: "Columvi",
  indication: { zh: "弥漫性大 B 细胞淋巴瘤（DLBCL）", en: "Diffuse large B-cell lymphoma (DLBCL)" },
  regions: "FDA · EU · China",
  url: "https://www.ema.europa.eu/en/medicines/human/EPAR/columvi",
};

const relapsingMs = { zh: "复发型多发性硬化", en: "Relapsing multiple sclerosis" };
const cd20Monoclonals = {
  ofatumumab: { epar: "kesimpta", brand: "Kesimpta", sponsor: "Novartis Europharm Limited", indication: relapsingMs },
  ocrelizumab: {
    epar: "ocrevus",
    brand: "Ocrevus",
    sponsor: "Roche Registration GmbH",
    indication: {
      zh: "复发型或早期原发进展型多发性硬化",
      en: "Relapsing or early primary progressive multiple sclerosis",
    },
  },
  "ublituximab-xiiy": { epar: "briumvi", brand: "Briumvi", sponsor: "Neuraxpharm Pharmaceuticals, S.L.", indication: relapsingMs },
  rituximab: {
    epar: "mabthera",
    brand: "MabThera",
    sponsor: "Roche Registration GmbH",
    indication: { zh: "B 细胞非霍奇金淋巴瘤", en: "B-cell non-Hodgkin lymphoma" },
  },
  obinutuzumab: {
    epar: "gazyvaro",
    brand: "Gazyvaro",
    sponsor: "Roche Registration GmbH",
    indication: {
      zh: "慢性淋巴细胞白血病、滤泡性淋巴瘤",
      en: "Chronic lymphocytic leukaemia and follicular lymphoma",
    },
  },
};

export function researchProfile(drug) {
  const name = drug.name.toLowerCase().replace(/^ublituximab$/, "ublituximab-xiiy");
  if (Object.hasOwn(cd20Monoclonals, name)) {
    const { epar, indication, sponsor, brand } = cd20Monoclonals[name];
    return {
      type: { zh: "单克隆抗体", en: "Monoclonal antibody" },
      sponsor,
      brand,
      indication,
      url: `https://www.ema.europa.eu/en/medicines/human/EPAR/${epar}`,
    };
  }
  if (name === "blinatumomab")
    return {
      ...columvi,
      brand: "Blincyto",
      sponsor: "Amgen Europe B.V.",
      regions: "FDA · EU",
      indication: { zh: "B 细胞前体急性淋巴细胞白血病", en: "B-cell precursor acute lymphoblastic leukaemia" },
      url: "https://www.ema.europa.eu/en/medicines/human/EPAR/blincyto",
    };
  if (/^glofitamab(?:-gxbm)?$/i.test(drug.name)) return columvi;
  if (/^mosunetuzumab(?:-axgb)?$/i.test(drug.name))
    return {
      ...columvi,
      brand: "Lunsumio",
      regions: "FDA · EU",
      indication: { zh: "滤泡性淋巴瘤", en: "Follicular lymphoma" },
      url: "https://www.ema.europa.eu/en/medicines/human/EPAR/lunsumio",
    };
  return null;
}

export function researchGroups(result) {
  const full = result.combinations.at(-1);
  if (full.targetIds.length === 1) return [full];
  return [full, ...result.combinations.filter((combo) => combo.targetIds.length === 1)];
}

export function rankMatches(matches) {
  const priority = { exact: 0, superset: 1, reported: 2 };
  return [...matches].sort((a, b) => priority[a.matchType] - priority[b.matchType]);
}
