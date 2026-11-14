<script setup>
import { computed, ref } from "vue";
import { bilingualMechanism } from "../../lib/target-to-assay/bilingual-mechanism.js";
import { drugDisplayName } from "../../lib/target-to-assay/display.js";
import BilingualMechanism from "./BilingualMechanism.vue";

const props = defineProps({
  candidates: { type: Array, required: true },
  mechanisms: { type: Array, required: true },
  copy: { type: Object, required: true },
  more: { type: String, required: true },
});
const pageSize = 10;
const limit = ref(pageSize);
const translations = new Map([
  ["b-lymphocyte antigen cd19 binding agent", "B 淋巴细胞抗原 CD19 结合剂。"],
  ["t cell surface glycoprotein cd3 binding agent", "T 细胞表面糖蛋白 CD3 结合剂。"],
  ["t-cell surface glycoprotein cd3 epsilon chain binding agent", "T 细胞表面糖蛋白 CD3 ε 链结合剂。"],
  ["tubulin inhibitor", "微管蛋白抑制剂。"],
  ["80s ribosome inhibitor", "80S 核糖体抑制剂。"],
]);
const termKey = (text) => text.trim().replace(/\.$/, "").toLowerCase();

const rows = computed(() => props.candidates.slice(0, limit.value).map(({ drug, status, url }) => {
  const records = props.mechanisms.filter(({ drugId }) => drugId === drug.id);
  const conflictRecords = (drug.normalizedTargetEvidence || []).filter(({ role }) => role === "direct");
  const conflictingSources = status === "conflictingMatch" ? conflictRecords.flatMap((record) => {
    const references = (record.references || []).flatMap(({ urls }) => urls || []);
    return [...references, record.originalUrl, record.sourceUrl]
      .filter((link) => typeof link === "string" && /^https:\/\//i.test(link) && URL.canParse(link));
  }) : [];
  const evidence = new Map();
  const curated = drug.verification === "reviewed"
    ? (drug.mechanisms || []).map((text) => ({ text, targetIds: drug.targetIds,
      sources: url ? [{ originalUrl: url }] : [] }))
    : [];
  for (const record of [...records, ...(drug.mechanismRecords || []), ...curated]) {
    const original = record.mechanismDescription || record.text;
    if (!original?.trim()) continue;
    const key = termKey(original);
    if (evidence.has(key) || record.actionType === "OTHER") continue;
    evidence.set(key, {
      ...bilingualMechanism("", original, record.sources?.[0], translations.get(key)),
      binding: record.actionType === "BINDING AGENT" || key.endsWith(" binding agent"),
      targetIds: record.targetIds || [],
    });
  }
  const mechanisms = [...evidence.values()];
  const adc = /antibody[ -]+drug conjugate|\badc\b/i.test(drug.molecularFormat || "");
  const targets = new Set(drug.targetIds);
  const payload = (drug.normalizedTargetEvidence || [])
    .filter(({ role }) => role === "payload").flatMap(({ normalizedTargetIds }) => normalizedTargetIds);
  for (const entry of mechanisms) {
    const key = termKey(entry.mechanismOriginal);
    // Only collapse target families explicitly named by a mechanism record.
    if (key !== "tubulin inhibitor" && key !== "80s ribosome inhibitor") continue;
    const family = key === "tubulin inhibitor" ? props.copy.tubulin : props.copy.ribosome;
    const ids = entry.targetIds.filter((id) => targets.has(id));
    if (!ids.length) continue;
    ids.forEach((id) => targets.delete(id));
    if (adc && key === "tubulin inhibitor") payload.push(family);
    else targets.add(family);
  }
  const names = [...targets].map((id) => id === "MS4A1" ? "CD20 (MS4A1)" : id);
  return {
    id: drug.id, name: drugDisplayName(drug.name), status, url,
    conflictingSources: [...new Set(conflictingSources)].map((url) => ({ url, label: new URL(url).hostname })),
    targets: names.join(" · "),
    antigen: adc && names.length > 0 && mechanisms.some((entry) =>
      entry.binding && entry.targetIds.some((id) => targets.has(id))),
    payload: [...new Set(payload)].join(" · "),
    mechanisms: mechanisms.filter((entry) => !entry.binding),
    bindings: mechanisms.filter((entry) => entry.binding),
  };
}));
</script>

<template>
  <table class="ta-candidate-table" role="table" :aria-label="copy.candidates">
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader">{{ copy.candidateDrug }}</th>
        <th scope="col" role="columnheader">{{ copy.candidateTargets }}</th>
        <th scope="col" role="columnheader">{{ copy.candidateMoa }}</th>
      </tr>
    </thead>
    <tbody role="rowgroup">
      <tr v-for="row in rows" :key="row.id" role="row">
        <th scope="row" role="rowheader">
          <a v-if="row.url" :href="row.url" target="_blank" rel="noopener noreferrer">{{ row.name }} ↗</a>
          <span v-else>{{ row.name }}</span>
        </th>
        <td role="cell">
          <span class="ta-candidate-mobile-label" aria-hidden="true">{{ copy.candidateTargets }}</span>
          <div><span v-if="row.antigen">{{ copy.antigen }} · </span>{{ row.targets || copy.noCandidateTarget }}</div>
          <div v-if="row.payload">{{ copy.payload }} · {{ row.payload }}</div>
          <small>{{ copy[row.status] }}</small>
          <div v-for="{ url, label } in row.conflictingSources" :key="url">
            <a :href="url" target="_blank" rel="noopener noreferrer">{{ label }} ↗</a>
          </div>
        </td>
        <td role="cell">
          <span class="ta-candidate-mobile-label" aria-hidden="true">{{ copy.candidateMoa }}</span>
          <div class="ta-candidate-mechanisms">
            <span v-if="!row.mechanisms.length">{{ copy.noCandidateMoa }}</span>
            <BilingualMechanism v-for="entry in row.mechanisms" :key="entry.mechanismOriginal" :entry="entry" />
            <div v-if="row.bindings.length" class="ta-candidate-bindings">
              <small>{{ copy.bindingRecord }}</small>
              <BilingualMechanism v-for="entry in row.bindings" :key="entry.mechanismOriginal" :entry="entry" />
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <button v-if="limit < candidates.length" type="button" class="ta-candidate-more" @click="limit += pageSize">
    {{ more }} ({{ candidates.length - limit }}) ↓
  </button>
</template>

<style scoped>
.ta-candidate-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  text-align: start;
  overflow-wrap: anywhere;
}
.ta-candidate-table th,
.ta-candidate-table td {
  padding: var(--ta-field-gap);
  border-bottom: 1px solid var(--app-rule-subtle);
  text-align: start;
  vertical-align: top;
}
.ta-candidate-table thead th:first-child { width: 24%; }
.ta-candidate-table thead th:nth-child(2) { width: 28%; }
.ta-candidate-table tbody th { font-weight: 600; }
.ta-candidate-table small {
  display: block;
  color: var(--app-muted);
  font-size: var(--ta-meta-size);
}
.ta-candidate-mechanisms,
.ta-candidate-bindings {
  display: grid;
  gap: var(--ta-language-gap);
}
.ta-candidate-mobile-label { display: none; }
.ta-candidate-more {
  margin-top: var(--ta-field-gap);
  min-height: 44px;
  padding: 0 var(--ta-field-gap);
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-accent);
  font: inherit;
  cursor: pointer;
}
.ta-candidate-more:hover { background: var(--app-accent-soft); }
.ta-candidate-more:focus-visible { outline: 2px solid var(--app-accent); }
@media (max-width: 767px) {
  .ta-candidate-table thead {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .ta-candidate-table,
  .ta-candidate-table tbody,
  .ta-candidate-table td,
  .ta-candidate-table th { display: block; }
  .ta-candidate-table tbody tr {
    display: grid;
    gap: var(--ta-language-gap);
    padding: var(--ta-field-gap) 0;
    border-bottom: 1px solid var(--app-rule-subtle);
  }
  .ta-candidate-table td,
  .ta-candidate-table th { border: 0; padding: 0; min-width: 0; }
  .ta-candidate-mobile-label { display: block; font-weight: 600; }
}
</style>
