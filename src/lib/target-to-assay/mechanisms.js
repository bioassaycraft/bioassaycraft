// Labels describe pharmacological actions. Drug formats and therapeutic goals are separate.
export const mechanismLabels = {
  effector: { zh: "效应细胞募集", en: "Effector cell engagement" },
  cellKilling: { zh: "抗体介导的细胞杀伤", en: "Antibody-mediated cell killing" },
  checkpointBlockade: { zh: "免疫检查点阻断", en: "Immune checkpoint blockade" },
  checkpointAgonism: { zh: "免疫检查点受体激动", en: "Immune checkpoint receptor agonism" },
  costimulation: { zh: "免疫共刺激受体激动", en: "Immune costimulatory receptor agonism" },
  cytokine: { zh: "细胞因子通路阻断", en: "Cytokine pathway blockade" },
  growthLigand: { zh: "生长因子配体中和", en: "Growth factor neutralization" },
  growthReceptor: { zh: "生长因子受体信号抑制", en: "Growth factor receptor inhibition" },
  vegf: { zh: "VEGF 通路抑制", en: "VEGF pathway inhibition" },
  kinase: { zh: "激酶抑制", en: "Kinase inhibition" },
  payload: { zh: "靶向载荷递送", en: "Targeted payload delivery" },
  incretin: { zh: "肠促胰素受体激动", en: "Incretin receptor agonism" },
  muscle: { zh: "肌肉生长相关通路阻断", en: "Muscle growth pathway blockade" },
};

const reviewedEngagers = /^(blinatumomab|glofitamab(?:-gxbm)?|mosunetuzumab(?:-axgb)?)$/i;
const blocks =
  /\b(inhibitor|antagonist|block(?:ade|er|ing)|neutraliz\w*|negative allosteric modulator)\b/;
const activates = /\b(agonist|activator)\b/;
const checkpoint =
  /\b(pd-?1|pd-?l1|ctla-?4|lag-?3|tigit|tim-?3|programmed cell death (?:1|protein 1|ligand 1)|cytotoxic t.lymphocyte.associated (?:protein|antigen) 4)\b/;

function classifyStatement(statement) {
  if (typeof statement !== "string") return null;
  const text = statement.toLowerCase();
  if (
    /\b(?:t|nk|natural killer|effector) cell engager\b|\b(?:t|nk).cell (?:engagement|redirection)\b/.test(
      text,
    )
  )
    return "effector";
  if (
    text === "antibody-mediated cell killing" ||
    (/\bcd20\b/.test(text) && /\bb[ -]cell depletion\b|\bcytolytic antibody\b/.test(text))
  )
    return "cellKilling";
  if (/\bantibody[–— -]drug conjugate\b|\btargeted payload delivery\b/.test(text)) return "payload";

  if (activates.test(text)) {
    if (checkpoint.test(text)) return "checkpointAgonism";
    if (/\b(4-1bb|cd137|ox40|cd134|cd27|icos)\b/.test(text)) return "costimulation";
    if (
      /\b(glp-?1|gip|glucagon-like peptide[ -]1|glucose-dependent insulinotropic polypeptide)\b/.test(
        text,
      ) &&
      /receptor/.test(text)
    )
      return "incretin";
  }
  if (!blocks.test(text)) return null;
  if (checkpoint.test(text)) return "checkpointBlockade";
  if (/\b(myostatin|gdf-?8|activin (?:a|b|receptor)|actriib?|acvr2[ab])\b/.test(text))
    return "muscle";
  if (/\b(vegf[abcd]?|vegfr[123]?|vascular endothelial growth factor)\b/.test(text)) return "vegf";
  if (
    /\b(cytokine|interleukin|il-?[0-9]+|tnf(?:-alpha)?|tumou?r necrosis factor|interferon|ifn-?gamma|gm-csf|tslp|thymic stromal lymphopoietin)\b/.test(
      text,
    )
  )
    return "cytokine";
  if (/\b(?:kinase|tki)\b/.test(text)) return "kinase";
  if (/\b(egfr|erbb[1-4]|her[234]|fgfr[1-4]?|pdgfr[ab]?|growth factor receptor)\b/.test(text))
    return "growthReceptor";
  if (
    /\b(growth factor|egf|fgf[0-9]*|pdgf(?:-[ab]{1,2})?|hgf)\b/.test(text) &&
    !/receptor/.test(text)
  )
    return "growthLigand";
  return null;
}

export function summarizeMechanisms(drugs) {
  const counts = new Map();
  for (const drug of drugs) {
    const actions = new Set((drug.mechanisms || []).map(classifyStatement).filter(Boolean));
    // These three medicines' cell-bridging actions are described in their EMA records.
    if (reviewedEngagers.test(drug.name)) actions.add("effector");
    for (const action of actions) counts.set(action, (counts.get(action) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}
