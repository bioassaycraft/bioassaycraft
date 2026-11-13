import { ingredientKey } from "./display.js";
import { validApprovalDate } from "./approval-records.js";

// Product-level fields verified against the EMA assessment and authorization record.
const columvi = {
  type: { zh: "双特异性抗体", en: "Bispecific antibody" },
  holder: "Roche Registration GmbH",
  brand: "Columvi",
  indication: { zh: "弥漫性大 B 细胞淋巴瘤（DLBCL）", en: "Diffuse large B-cell lymphoma (DLBCL)" },
  regions: "FDA · EU · China",
  url: "https://www.ema.europa.eu/en/medicines/human/EPAR/columvi",
};

const relapsingMs = { zh: "复发型多发性硬化", en: "Relapsing multiple sclerosis" };
const cd20Monoclonals = {
  ofatumumab: { epar: "kesimpta", brand: "Kesimpta", holder: "Novartis Europharm Limited", indication: relapsingMs },
  ocrelizumab: {
    epar: "ocrevus",
    brand: "Ocrevus",
    holder: "Roche Registration GmbH",
    indication: {
      zh: "复发型或早期原发进展型多发性硬化",
      en: "Relapsing or early primary progressive multiple sclerosis",
    },
  },
  "ublituximab-xiiy": { epar: "briumvi", brand: "Briumvi", holder: "Neuraxpharm Pharmaceuticals, S.L.", indication: relapsingMs },
  rituximab: {
    epar: "mabthera",
    brand: "MabThera",
    holder: "Roche Registration GmbH",
    indication: { zh: "B 细胞非霍奇金淋巴瘤", en: "B-cell non-Hodgkin lymphoma" },
  },
  obinutuzumab: {
    epar: "gazyvaro",
    brand: "Gazyvaro",
    holder: "Roche Registration GmbH",
    indication: {
      zh: "慢性淋巴细胞白血病、滤泡性淋巴瘤",
      en: "Chronic lymphocytic leukaemia and follicular lymphoma",
    },
  },
};

export function researchProfile(drug) {
  const name = drug.name.toLowerCase().replace(/^ublituximab$/, "ublituximab-xiiy");
  if (Object.hasOwn(cd20Monoclonals, name)) {
    const { epar, indication, holder, brand } = cd20Monoclonals[name];
    return {
      type: { zh: "单克隆抗体", en: "Monoclonal antibody" },
      holder,
      brand,
      indication,
      url: `https://www.ema.europa.eu/en/medicines/human/EPAR/${epar}`,
    };
  }
  if (name === "blinatumomab")
    return {
      ...columvi,
      brand: "Blincyto",
      holder: "Amgen Europe B.V.",
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

const stageOrder = ["FILED", "PHASE_3", "PHASE_2_3", "PHASE_2", "PHASE_1_2", "PHASE_1", "EARLY_PHASE_1", "PRECLINICAL"];
const special = new Set(["WITHDRAWN", "SUSPENDED", "TERMINATED", "DISCONTINUED"]);

export function rankMatches(matches, records) {
  function key(match) {
    const drug = records[match.drugId] || {};
    const stage = drug.stage || "UNKNOWN";
    const date = validApprovalDate(drug.date) ? drug.date : "";
    const rank = stageOrder.indexOf(stage === "UNDER_REVIEW" ? "FILED" : stage);
    const group = special.has(stage) ? 2 + stageOrder.length + 1 :
      stage === "APPROVAL" ? (date ? 0 : 1) : stage === "REPORTED_APPROVAL" ? 1 :
        rank >= 0 ? 2 + rank : 2 + stageOrder.length;
    return { group, date: group === 0 ? date : "", name: ingredientKey(drug.name || match.drugId), id: match.drugId };
  }
  return matches.map((match) => ({ match, ...key(match) })).sort((a, b) =>
    a.group - b.group || a.date.localeCompare(b.date) ||
    a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id, "en"),
  ).map(({ match }) => match);
}
