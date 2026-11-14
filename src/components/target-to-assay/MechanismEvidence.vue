<script setup>
import { computed } from "vue";
import BilingualMechanism from "./BilingualMechanism.vue";
import { pd1Blockade } from "../../lib/target-to-assay/presentation.js";
import { expressionLayers, expressionName, formatExpression } from "../../lib/target-to-assay/expression-display.js";
import {
  bilingualMechanism,
  reviewedMechanism,
} from "../../lib/target-to-assay/bilingual-mechanism.js";
import { conditionName, drugDisplayName, ingredientKey } from "../../lib/target-to-assay/display.js";
import { targetAssayCopy } from "../../i18n/target-to-assay.js";

const props = defineProps({
  result: { type: Object, default: null },
  locale: { type: String, required: true },
  stageLabel: { type: Function, required: true },
  drugPresentation: { type: Object, required: true },
  matches: { type: Array, required: true },
});
const copy = computed(() => targetAssayCopy[props.locale].mechanism);
// These verified Reactome records are promoted only when the live mapping returns them.
const preferredPathways = {
  PCSK9: ["R-HSA-8964038", "R-HSA-8866427"],
  MS4A1: ["R-HSA-983695"],
  CD19: ["R-HSA-983695"],
};
const targets = computed(() =>
  (props.result?.resolvedTargets || []).map((target) => {
    const biology = props.result.targetBiology.find(({ targetId }) => targetId === target.id);
    const preferred = Object.hasOwn(preferredPathways, target.id)
      ? preferredPathways[target.id]
      : [];
    const paths = biology?.pathways || [];
    const pathways = [...paths].sort((a, b) => {
      const priority = (id) => (preferred.includes(id) ? preferred.indexOf(id) : preferred.length);
      return priority(a.id) - priority(b.id);
    });
    return { ...target, biology, pathways, ...expressionLayers(biology?.expressionProfiles) };
  }),
);
const matching = computed(() =>
  (props.result?.drugMechanisms || []).filter(
    ({ targetIds }) =>
      targetIds.length === targets.value.length &&
      targets.value.every(({ id }) => targetIds.includes(id)),
  ),
);
const matchById = computed(() => new Map(props.matches.map((match) => [match.drugId, match])));
const direct = computed(() =>
  matching.value.filter((row) => matchById.value.has(row.drugId) &&
    row.evidenceStatus === "direct_evidence" && (targets.value.length === 1 || row.completeTargetSet)),
);
const hasConflict = computed(() =>
  matching.value.some(({ evidenceStatus }) => evidenceStatus === "conflicting_evidence"),
);
const targetLabel = (target) => target.inputName && !/^ENSG\d+$/i.test(target.inputName)
  ? target.inputName : target.id;
const gridStyle = computed(() => ({ "--ta-columns": Math.min(3, Math.max(1, targets.value.length)) }));
const examples = computed(() => {
  const conflicted = new Set(matching.value.filter(({ evidenceStatus }) =>
    evidenceStatus === "conflicting_evidence").map(({ drugName }) => ingredientKey(drugName)));
  const approved = (row) => summaryStage(row) === "APPROVAL";
  const sorted = direct.value.filter((row) => row.mechanismDescription && row.sources?.length &&
    !conflicted.has(ingredientKey(row.drugName)) && !/binding agent\.?$/i.test(row.mechanismDescription.trim())).sort((a, b) =>
    Number(approved(b)) - Number(approved(a)) ||
    Number(summaryStage(b) === "REPORTED_APPROVAL") - Number(summaryStage(a) === "REPORTED_APPROVAL") ||
    Number(Boolean(reviewedSummary(b.drugName))) - Number(Boolean(reviewedSummary(a.drugName))) ||
    Number(Boolean(reviewedMechanism(b.drugName))) - Number(Boolean(reviewedMechanism(a.drugName))) ||
    a.drugName.localeCompare(b.drugName, "en"));
  const supported = new Map();
  for (const row of sorted) {
    const key = ingredientKey(row.drugName);
    if (!supported.has(key)) supported.set(key, row);
  }
  return [...supported.values()];
});
const summaryZh = new Map([
  ["blinatumomab", targetAssayCopy.zh.drugCard.blinatumomab],
  ["tarlatamab", "连接 T 细胞上的 CD3 与表达 DLL3 的靶细胞，引导 T 细胞杀伤靶细胞。"],
]);
const reviewedSummary = (name) => summaryZh.get(ingredientKey(name));
function summaryStage(row) {
  const presented = props.drugPresentation[row.drugId]?.stage;
  if (presented && presented !== "UNKNOWN") return presented;
  const phase = row.developmentStatus?.globalDevelopmentPhase;
  return phase === "APPROVAL" ? "REPORTED_APPROVAL" : phase || "UNKNOWN";
}
const isPd1 = computed(() => targets.value.length === 1 && targets.value[0].id === "PDCD1");
const groups = computed(() => {
  const cards = [];
  let blockade;
  for (const row of examples.value) {
    if (isPd1.value && pd1Blockade(row)) {
      if (!blockade) {
        blockade = { row, drugs: [] };
        cards.push(blockade);
      }
      if (blockade.drugs.length < 3) blockade.drugs.push(row);
    } else cards.push({ row });
  }
  return cards.slice(0, 3);
});
function matchLabel(row) {
  const match = matchById.value.get(row.drugId);
  const labels = targetAssayCopy[props.locale];
  if (match?.matchType !== "direct") return labels.exactBadge;
  return match.reason === "additional_direct_targets" ? labels.directAdditionalTargets : "";
}
const mechanismTranslations = new Map([
  ["Engages CD20 on B cells and CD3 on T cells, inducing T-cell-mediated lysis of CD20-expressing cells.",
    "结合 B 细胞上的 CD20 和 T 细胞上的 CD3，诱导 T 细胞裂解表达 CD20 的细胞。"],
  ["Engages CD20 on B cells and CD3 on T cells, redirecting T cells to lyse CD20-expressing cells.",
    "结合 B 细胞上的 CD20 和 T 细胞上的 CD3，引导 T 细胞裂解表达 CD20 的细胞。"],
  ["Bridges CD3 on T cells and CD20 on B cells, promoting T-cell-mediated killing of CD20-expressing cells.",
    "连接 T 细胞上的 CD3 和 B 细胞上的 CD20，促进 T 细胞杀伤表达 CD20 的细胞。"],
  ["Binds CD20 on B cells and CD3 on T cells, bringing them together so that T cells can kill the B cells.",
    "结合 B 细胞上的 CD20 和 T 细胞上的 CD3，使两者靠近，从而让 T 细胞杀伤 B 细胞。"],
]);
const blockadeMechanism = {
  mechanismOriginal: "Inhibits immune checkpoint signalling mediated by PD-1.",
  mechanismZh: "抑制 PD-1 介导的免疫检查点信号。",
};
const mechanismEntries = computed(() =>
  groups.value.map(({ row, drugs }) => ({
    drugs: drugs?.map((drug) => ({ id: drug.drugId, name: drugDisplayName(drug.drugName), label: matchLabel(drug) })),
    label: matchLabel(row),
    id: row.drugId,
    name: drugDisplayName(row.drugName),
    format: props.locale === "zh" && /^bispecific antibody$/i.test(row.molecularFormat) ? "双特异性抗体" : row.molecularFormat,
    stage: targetAssayCopy[props.locale].drugCard.stages[summaryStage(row)] || props.stageLabel(summaryStage(row)),
    scope: row.targetIds.join(" × "),
    ...bilingualMechanism(
      row.drugName,
      row.mechanismDescription,
      row.sources[0],
      reviewedSummary(row.drugName) || mechanismTranslations.get(row.mechanismDescription),
    ),
  })),
);
const conclusion = computed(() => {
  if (hasConflict.value) return copy.value.status.conflicting_evidence;
  return targets.value.length > 1 ? copy.value.unconfirmed : copy.value.noDrugMechanism;
});
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
const expressionCopy = computed(() => props.locale === "zh" ? {
  cells: "主要表达细胞", disease: "疾病组织表达", noDirect: "暂无直接疾病组织表达证据。",
  cd3: "T 细胞相关的受体复合物（定性证据）。",
  noAssociation: "本次未取得疾病关联记录。",
  otherTissues: "组织层面记录",
  bulkLimit: "肿瘤组织混合样本 RNA，无法确定信号是否来自肿瘤细胞。",
  limits: "RNA 读数不代表细胞表面蛋白表达；nCPM 与 nTPM 不直接比较。未核实译名保留原文。",
} : {
  cells: "Main expressing cells", disease: "Expression in diseased tissue", noDirect: "No direct evidence of expression in diseased tissue.",
  cd3: "T-cell receptor complex (qualitative evidence).",
  noAssociation: "No disease association retrieved.",
  otherTissues: "Tissue-level records",
  bulkLimit: "Bulk tumor tissue RNA cannot establish whether the signal comes from tumor cells.",
  limits: "RNA does not establish cell-surface protein expression. nCPM and nTPM are not directly comparable.",
});
const diseaseDisplay = {
  "Blincyto · EPAR": {
    zh: "B 细胞前体急性淋巴细胞白血病（白血病 B 系细胞有 CD19 蛋白表达证据）",
    en: "B-cell precursor acute lymphoblastic leukemia (CD19 protein documented on leukemic B-lineage cells)",
  },
  "MabThera · SmPC §5.1": {
    zh: "B 细胞非霍奇金淋巴瘤（有 CD20 表达记录，具体表达需按亚型或样本核实）",
    en: "B-cell non-Hodgkin lymphoma (CD20 expression documented, with variation by subtype or specimen)",
  },
};
function shortMechanism(value = "") {
  const text = value.replace(/^\s*12\.1\s+Mechanism of Action\s*/i, "");
  const first = [...sentences.segment(text)][0]?.segment.trim() || text;
  return first.length > 240 ? first.slice(0, 237).replace(/\s+\S*$/, "") + "…" : first;
}
function functionSummary(target) {
  const item = target.biology?.biologicalFunctions[0];
  if (!item) return "";
  const reviewed = copy.value.functions[item.source?.recordId];
  if (reviewed) return reviewed;
  const cleaned = item.text.replace(/\s*\(PubMed:[\d,\sA-Za-z:]+\)/g, "");
  const parts = [...sentences.segment(cleaned)].map(({ segment }) => segment.trim());
  const first = parts[0] || cleaned;
  return first.length <= 245 ? first : first.slice(0, 242).replace(/\s+\S*$/, "") + "…";
}
const evidenceGroups = computed(() => {
  const biology = targets.value.flatMap((target) => {
    const source = target.biology?.biologicalFunctions[0]?.source;
    return [
      ...(target.identitySource
        ? [{ source: target.identitySource, supports: target.canonicalName }]
        : []),
      ...(source ? [{ source, supports: target.id + " · " + functionSummary(target) }] : []),
    ];
  });
  const expression = targets.value.flatMap((target) => [
    ...(target.id === "CD3" ? [{
      source: { originalUrl: "https://www.ema.europa.eu/en/medicines/human/EPAR/blincyto", sourceName: "EMA", recordId: "Blincyto · EPAR" },
      supports: expressionCopy.value.cd3,
    }] : []),
    ...(/^ENSG\d+$/.test(target.ensemblId || "") ? [{
      source: { originalUrl: "https://www.bgee.org/gene/" + target.ensemblId, sourceName: "Bgee" },
      supports: target.geneSymbol || target.id,
    }] : []),
    ...(target.biology?.expressionProfiles || []).map((profile) => ({
      source: profile.source,
      supports:
        target.id + " · " + copy.value.modalities[profile.kind] + " · " + formatExpression(profile, props.locale),
    })),
    ...(target.biology?.diseaseExpression || []).map(({ source, description }) => ({
      source,
      supports: target.id + " · " + description[props.locale],
    })),
    ...(target.biology?.diseaseAssociations || []).map(({ name, source }) => ({
      source,
      supports: target.id + " · " + copy.value.association + " · " + name,
    })),
  ]);
  const pathways = [
    ...new Map(
      targets.value.flatMap((target) =>
        target.pathways.map((path) => [path.id, { source: path.source, supports: path.name }]),
      ),
    ).values(),
  ];
  const pathwayLinks = new Map(pathways.map((row) => [row.source.originalUrl, row]));
  const distinctBiology = biology.filter((row) => {
    const pathway = pathwayLinks.get(row.source.originalUrl);
    if (!pathway) return true;
    pathway.supports += " · " + row.supports;
    return false;
  });
  const mechanismRows = hasConflict.value
    ? matching.value.filter((row) => row.evidenceStatus === "conflicting_evidence")
    : groups.value.flatMap(({ row, drugs }) => drugs || [row]);
  const mechanisms = mechanismRows.flatMap((row) =>
    [
      ...new Map(
        [reviewedMechanism(row.drugName)?.mechanismSource, ...row.sources]
          .filter(Boolean)
          .map((source) => [source.originalUrl, source]),
      ).values(),
    ].map((source) => ({
      source,
      supports: drugDisplayName(row.drugName) + " · " + row.mechanismDescription,
    })),
  );
  return [
    { name: copy.value.function, rows: distinctBiology },
    { name: copy.value.expression, rows: expression },
    { name: copy.value.pathways, rows: pathways },
    { name: copy.value.drugMechanism, rows: mechanisms },
  ].filter(({ rows }) => rows.length);
});
const checks = computed(() => props.result?.sourceChecks || {});
const queryTime = computed(() =>
  new Intl.DateTimeFormat(props.locale === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(props.result.retrievedAt)),
);
</script>

<template>
  <div class="ta-live-mechanism">
    <p v-if="!result">{{ copy.sample }}</p>
    <template v-else>
      <section class="ta-mechanism-group ta-moa-group">
        <h3>{{ copy.drugMechanism }}</h3>
        <div v-if="mechanismEntries.length" class="ta-target-grid" :style="{ '--ta-columns': mechanismEntries.length }">
          <article v-for="entry in mechanismEntries" :key="entry.id" class="ta-target-info">
            <template v-if="entry.drugs">
              <h4>{{ locale === "zh" ? "PD-1 信号阻断" : "PD-1 signalling blockade" }}</h4>
              <BilingualMechanism :entry="blockadeMechanism" class="ta-mechanism-description" />
              <ul>
                <li v-for="drug in entry.drugs" :key="drug.id">{{ drug.name }} <span v-if="drug.label" class="ta-source-note">· {{ drug.label }}</span></li>
              </ul>
            </template>
            <template v-else>
              <h4>{{ entry.name }}</h4>
              <p class="ta-source-note">{{ [entry.scope, entry.format, entry.stage, entry.label].filter(Boolean).join(" · ") }}</p>
              <BilingualMechanism
                :entry="{ mechanismOriginal: shortMechanism(entry.mechanismOriginal), mechanismZh: entry.mechanismZh }"
                class="ta-mechanism-description"
              />
            </template>
            <a :href="entry.mechanismSource.originalUrl" class="ta-source-note" target="_blank" rel="noopener noreferrer">{{ entry.mechanismSource.sourceName }} ↗</a>
          </article>
        </div>
        <p v-else>{{ conclusion }}</p>
        <a href="#results-title">{{ copy.viewDrugs }} ↓</a>
      </section>

      <section class="ta-mechanism-group">
        <h3>{{ copy.function }}</h3>
        <div class="ta-target-grid" :style="gridStyle">
          <div v-for="target in targets" :key="target.id" class="ta-target-info ta-function-card">
            <h4>{{ targetLabel(target) }}</h4>
            <p class="ta-source-note">{{ [...new Set([target.id !== targetLabel(target) && target.id, target.canonicalName !== targetLabel(target) && target.canonicalName, target.primaryEnsemblId, ...(target.uniprotIds || [])].filter(Boolean))].join(" · ") }}</p>
            <p class="ta-target-type">
              {{ target.id === "CD3" ? copy.types.CD3 : copy.types[target.uniprotIds[0]] || copy.entity[target.entityType] }}
            </p>
            <p>
              {{
                target.resolutionStatus === "resolved"
                  ? functionSummary(target) || copy.noData
                  : copy.resolution[target.resolutionStatus]
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="ta-mechanism-group">
        <h3>{{ copy.expression }}</h3>
        <p class="ta-source-note">{{ expressionCopy.limits }}</p>
        <div class="ta-target-grid" :style="gridStyle">
          <div v-for="target in targets" :key="target.id" class="ta-target-info">
            <h4>{{ targetLabel(target) }}</h4>
            <section class="ta-expression-field">
              <h5>{{ expressionCopy.cells }}</h5>
              <p v-if="target.id === 'CD3'">
                {{ expressionCopy.cd3 }}
              </p>
              <p v-for="profile in target.baseline.filter(({ kind }) => kind === 'single_cell_rna' || kind === 'immune_rna')" :key="profile.kind">
                <span>{{ copy.modalities[profile.kind] }}</span>
                · <span>{{ profile.values.map(({ name }) => expressionName(name, locale)).join(locale === "zh" ? "、" : ", ") }}</span>
              </p>
              <details v-if="target.baseline.some(({ kind }) => kind === 'tissue_rna' || kind === 'tissue_protein')" class="ta-source-note">
                <summary>{{ expressionCopy.otherTissues }}</summary>
                <p v-for="profile in target.baseline.filter(({ kind }) => kind === 'tissue_rna' || kind === 'tissue_protein')" :key="profile.kind">
                  <span>{{ copy.modalities[profile.kind] }}</span>
                  · <span>{{ profile.values.map(({ name }) => expressionName(name, locale)).join(locale === "zh" ? "、" : ", ") }}</span>
                </p>
              </details>
              <p v-if="!target.baseline.length" class="ta-source-note">{{ target.entityType === 'protein_complex' ? copy.complexExpression : copy.noExpression }}</p>
            </section>
            <section class="ta-expression-field">
              <h5>{{ expressionCopy.disease }}</h5>
              <p v-if="!target.biology?.diseaseExpression?.length" class="ta-source-note">{{ expressionCopy.noDirect }}</p>
              <p v-for="record in target.biology?.diseaseExpression || []" :key="record.source.recordId">
                {{ diseaseDisplay[record.source.recordId]?.[locale] || record.description[locale] }}
              </p>
              <p v-for="profile in target.bulk" :key="profile.kind">
                <a :href="profile.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ copy.modalities[profile.kind] }}</a>
                · <span>{{ formatExpression(profile, locale) }}</span>
              </p>
              <p v-if="target.bulk.length" class="ta-source-note">{{ expressionCopy.bulkLimit }}</p>
            </section>
            <section class="ta-expression-field">
              <h5>{{ copy.association }}</h5>
              <p v-for="row in target.biology?.diseaseAssociations || []" :key="row.id">
                <a :href="row.source.originalUrl" :title="row.name" target="_blank" rel="noopener noreferrer">{{ conditionName(row.name, locale) }} ↗</a>
                <span class="ta-source-note"> · {{ row.id }}</span>
              </p>
              <p class="ta-source-note">{{ target.biology?.diseaseAssociations?.length ? copy.associationNote : expressionCopy.noAssociation }}</p>
            </section>
          </div>
        </div>
      </section>

      <section class="ta-mechanism-group">
        <h3>{{ copy.pathways }}</h3>
        <div class="ta-target-grid" :style="gridStyle">
          <div v-for="target in targets" :key="target.id" class="ta-target-info">
            <h4>{{ targetLabel(target) }}</h4>
            <ul v-if="target.pathways.length">
              <li v-for="path in target.pathways.slice(0, 2)" :key="path.id">
                <a :href="path.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ copy.pathwayNames[path.id] || path.name }} ↗</a>
              </li>
            </ul>
            <p v-else>
              {{
                target.biology?.pathwayStatus === "failed" ? copy.pathwayFailed : copy.noPathways
              }}
            </p>
            <details v-if="target.pathways.length > 2">
              <summary>{{ copy.morePathways }}</summary>
              <ul>
                <li v-for="path in target.pathways.slice(2)" :key="path.id">
                  <a :href="path.source.originalUrl" target="_blank" rel="noopener noreferrer">{{ path.name }} · {{ path.id }} ↗</a>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </section>

      <details class="ta-source-details">
        <summary>
          {{ copy.sourceStatus }}
        </summary>
        <section v-for="group in evidenceGroups" :key="group.name">
          <h5>{{ group.name }}</h5>
          <ul>
            <li v-for="{ source, supports } in group.rows" :key="source.originalUrl + supports">
              {{ supports }} ·
              <a :href="source.originalUrl" target="_blank" rel="noopener noreferrer">{{ source.sourceName }} · {{ source.recordId }} ↗</a>
              <small v-if="source.citationUrl">
                ·
                <a :href="source.citationUrl" target="_blank" rel="noopener noreferrer">{{
                  copy.citation
                }}</a></small>
              <small v-if="source.license">
                ·
                <a :href="source.license.url" target="_blank" rel="noopener noreferrer">{{
                  source.license.name
                }}</a></small>
            </li>
          </ul>
        </section>
        <details class="ta-source-note">
          <summary>{{ copy.diagnostics }}</summary>
          <p>
            {{ copy.retrieval }} · <time :datetime="result.retrievedAt">{{ queryTime }}</time>
          </p>
          <ul>
            <li v-for="(rows, name) in checks" :key="name">
              <strong>{{ name }}</strong> ·
              {{
                rows.length
                  ? [
                    ...new Set(
                      rows.map(
                        ({ state, status, count, returned, truncated, resource, queryType, issue, missingTargetMetadata, drugsWithoutMechanisms }) =>
                          ([resource, queryType === "drug_mechanisms" ? copy.drugMechanism : null,
                            copy.source[state] || state].filter(Boolean).join(" · ")) +
                          (status ? " · HTTP " + status : "") +
                          (Number.isInteger(count) ? ` · ${returned}/${count}` : "") +
                          (truncated ? " · " + copy.truncated : "") +
                          (issue ? " · " + (copy.source[issue.state] || issue.state) : "") +
                          (missingTargetMetadata ? ` · ${copy.missingTargetMetadata} (${missingTargetMetadata})` : "") +
                          (drugsWithoutMechanisms ? ` · ${copy.drugsWithoutMechanisms} (${drugsWithoutMechanisms})` : ""),
                      ),
                    ),
                  ].join(" / ")
                  : copy.source.not_queried
              }}
              <a
                v-if="name === 'ChEMBL' && rows.some(({ state }) => !state.startsWith('success_'))"
                href="https://www.ebi.ac.uk/chembldb/"
                target="_blank"
                rel="noopener noreferrer"
              >{{ copy.officialSearch }} ↗</a>
            </li>
          </ul>
        </details>
      </details>
    </template>
  </div>
</template>

<style scoped>
.ta-live-mechanism {
  display: grid;
  gap: var(--ta-group-gap);
  min-width: 0;
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  overflow-wrap: anywhere;
}
.ta-mechanism-group {
  display: grid;
  gap: var(--ta-field-gap);
  min-width: 0;
}
.ta-mechanism-group + .ta-mechanism-group {
  padding-top: var(--ta-group-gap);
  border-top: 1px solid var(--app-rule-subtle);
}
.ta-target-grid {
  display: grid;
  grid-template-columns: repeat(var(--ta-columns, 1), minmax(0, 1fr));
  gap: var(--ta-field-gap);
}
.ta-target-info {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: var(--ta-language-gap);
  padding: var(--ta-card-padding);
  border: 1px solid var(--app-rule-subtle);
  border-radius: 8px;
}
.ta-target-type { font-weight: 600; }
@media (min-width: 661px) {
  .ta-function-card {
    grid-row: span 4;
    grid-template-rows: subgrid;
    row-gap: var(--ta-language-gap);
  }
}
.ta-live-mechanism h3,
.ta-live-mechanism h4,
.ta-live-mechanism h5 {
  margin: 0;
  font-weight: 650;
  line-height: var(--ta-heading-line);
}
.ta-live-mechanism h3 { font-size: var(--ta-subheading-size); }
.ta-live-mechanism h4 { font-size: var(--ta-card-title-size); }
.ta-live-mechanism h5 { font-size: var(--ta-body-size); }
.ta-moa-group .ta-mechanism-description { font-size: calc(var(--ta-body-size) * 0.94); }
.ta-moa-group .ta-target-info { background: var(--app-accent-soft); }
.ta-expression-field { display: grid; gap: 4px; }
.ta-expression-field + .ta-expression-field { padding-top: var(--ta-field-gap); border-top: 1px solid var(--app-rule-subtle); }
.ta-expression-field h5 { font-size: var(--ta-label-size); }
.ta-target-grid { align-items: start; }
.ta-live-mechanism p {
  margin: 0;
}
.ta-live-mechanism ul {
  margin: 0;
  padding-inline-start: 18px;
}
.ta-mechanism-group ul + details,
.ta-source-details h5 + ul {
  margin-top: var(--ta-language-gap);
}
.ta-source-details li + li {
  margin-top: var(--ta-language-gap);
}
.ta-source-note,
.ta-source-details small {
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
}
.ta-source-details section + section,
.ta-source-details section + details {
  margin-top: var(--ta-group-gap);
}
@media (max-width: 660px) {
  .ta-target-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
