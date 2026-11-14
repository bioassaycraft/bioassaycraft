<script setup>
import { computed, ref } from "vue";
import { detectors, proteinProducts } from "../../lib/assay-design/products.js";
import { activityMethods } from "../../lib/assay-design/evidence.js";
import { animateElement, getPanelEnterKeyframes } from "../../utils/motion.js";
import AssayProductTable from "./AssayProductTable.vue";

const props = defineProps({
  locale: { type: String, required: true },
  loading: Boolean, ready: Boolean, partial: Boolean,
  targets: { type: Array, required: true },
  drugs: { type: Array, required: true },
  sourcesFor: { type: Function, required: true },
  cdeLookupUrl: { type: String, required: true },
  regulatorsFor: { type: Function, required: true },
  documentState: { type: Object, required: true },
  loadDocuments: { type: Function, required: true },
});
const rankedDrugs = computed(() => props.drugs.map((drug) => ({
  drug, methods: activityMethods(props.sourcesFor(drug)),
})).sort((a, b) => Number(b.methods.length > 0) - Number(a.methods.length > 0)));
const method = ref("binding");
const tr = (zh, en) => props.locale === "zh" ? zh : en;
const targetLabel = ({ id, label }) => id === "MS4A1" ? "CD20" : label || id;
const tabs = [
  ["binding", "结合活性", "Binding activity"],
  ["cell", "细胞功能活性", "Cellular functional activity"],
  ["effector", "Fc效应功能评价", "Fc effector function evaluation"],
];
function openSources(event, drug) {
  if (event.currentTarget.open) props.loadDocuments(drug);
}
</script>

<template>
  <details class="assay-design-panel assay-approved" :aria-busy="loading">
    <summary><h2>{{ tr("已上市药物方法", "Methods for approved drugs") }}</h2></summary>
    <p v-if="loading" role="status">{{ tr("正在查询已上市药物…", "Searching for approved drugs…") }}</p>
    <p v-else-if="!ready">{{ tr("请输入靶点以查看方法。", "Enter targets to see documented methods.") }}</p>
    <template v-else>
      <p v-if="partial" class="assay-coverage-note" role="status">{{ tr("部分药物来源不可用或返回不完整。", "Some drug sources were unavailable or returned partial data.") }}</p>
      <p v-if="!drugs.length">{{ tr("当前结果中未找到已确认获批的药物。", "No drugs with confirmed approvals in these results.") }}</p>
      <article v-for="{ drug, methods } in rankedDrugs" :key="drug.id" class="assay-drug" :class="{ 'assay-drug-compact': !methods.length }">
        <h3>{{ drug.brand ? drug.brand + ' · ' : '' }}{{ drug.name }}</h3>
        <template v-if="methods.length">
          <div v-for="item in methods" :key="item.url + item.methodType" class="assay-evidence">
            <h4>{{ tr(item.methodTypeZh, item.methodType) }}</h4>
            <p>{{ tr("中文整理", "Summary") }}：{{ tr(item.summaryZh, item.summary) }}</p>
            <p v-if="item.excerpt">{{ tr("原文摘录", "Original excerpt") }}：<q lang="en">{{ item.excerpt }}</q></p>
            <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }} ↗</a>
          </div>
        </template>
        <p v-else>{{ tr("需要进一步人工确认", "Needs manual confirmation") }}</p>
        <details @toggle="openSources($event, drug)">
          <summary>{{ tr("监管资料", "Regulatory sources") }}</summary>
          <p v-if="documentState[drug.id] === 'loading'" role="status">{{ tr("正在查询 FDA 资料…", "Searching FDA documents…") }}</p>
          <p v-if="documentState[drug.id] === 'error'" role="status">{{ tr("FDA 资料查询失败。", "FDA document query failed.") }}</p>
          <div v-for="group in regulatorsFor(drug)" :key="group.agency">
            <h4>{{ group.agency }}</h4>
            <ul>
              <li v-for="doc in group.docs" :key="doc.url">
                <a :href="doc.url" target="_blank" rel="noopener noreferrer">{{ tr(doc.titleZh || doc.title, doc.title) }} ↗</a>
              </li>
            </ul>
          </div>
          <a :href="cdeLookupUrl" target="_blank" rel="noopener noreferrer">{{ tr("CDE 上市药品人工查询", "CDE manual lookup") }} ↗</a>
        </details>
      </article>
    </template>
  </details>
  <section class="assay-design-panel">
    <h2 id="assay-method-type">{{ tr("方法类型", "Method type") }}</h2>
    <div class="assay-methods" role="group" aria-labelledby="assay-method-type">
      <label v-for="[id, zh, en] in tabs" :key="id">
        <input v-model="method" type="radio" name="assay-method" :value="id"><span>{{ tr(zh, en) }}</span>
      </label>
    </div>
  </section>
  <section class="assay-design-panel assay-method-details" :aria-busy="loading">
    <div class="assay-heading">
      <h2>{{ tr("方法详细信息", "Method details") }}</h2>
      <button class="assay-ai" type="button" disabled>
        <span aria-hidden="true">✧</span> {{ tr("AI 深度分析", "AI deep analysis") }}
      </button>
    </div>
    <p v-if="method !== 'binding'">{{ tr("即将推出", "Coming soon") }}</p>
    <div v-show="method === 'binding'" @vue:mounted="({ el }) => animateElement(el, getPanelEnterKeyframes(3))">
      <p v-if="loading" role="status">{{ tr("正在解析靶点…", "Resolving targets…") }}</p>
      <template v-else-if="ready">
        <div class="assay-products">
          <AssayProductTable
            v-for="target in targets" :key="target.id"
            :title="targetLabel(target)" :target-id="target.id" :rows="proteinProducts(target.id)" :zh="locale === 'zh'"
          />
          <AssayProductTable
            :title="tr('检测抗体', 'Detection antibodies')"
            :rows="detectors" :zh="locale === 'zh'" detection
          />
        </div>
      </template>
      <p v-else>{{ tr("请输入靶点以查看实验资源。", "Enter targets to see assay resources.") }}</p>
    </div>
  </section>
</template>

<style scoped>
.assay-heading, .assay-methods { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.assay-heading { justify-content: space-between; }
.assay-methods { margin-top: 12px; }
.assay-methods label { position: relative; display: inline-flex; cursor: pointer; }
.assay-methods input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.assay-methods span { display: grid; align-items: center; min-height: 44px; padding: 0 13px; border: 1px solid var(--app-rule); border-radius: 8px; }
.assay-methods input:checked + span { background: var(--app-accent-soft); border-color: var(--app-accent); color: var(--app-accent); font-weight: 600; }
.assay-methods input:focus-visible + span { outline: 2px solid var(--app-accent); outline-offset: 2px; }
h2, h3, h4 { margin: 0; font-weight: 600; line-height: var(--ta-heading-line); }
h2 { font-size: var(--ta-section-size); }
h3 { font-size: var(--ta-card-title-size); }
h4 { font-size: var(--ta-subheading-size); margin-top: 8px; }
p, a, label, summary { font-size: var(--ta-body-size); }
p { color: var(--app-muted); }
a { color: var(--app-accent); overflow-wrap: anywhere; }
.assay-method-details { --assay-action-width: 7.5rem; }
.assay-coverage-note { font-size: calc(var(--ta-body-size) - 2px); }
.assay-ai { box-sizing: border-box; inline-size: var(--assay-action-width); min-height: 44px; border: 1px solid var(--app-rule); border-radius: 8px; padding: 6px 10px; background: var(--app-section); color: var(--app-muted); font: inherit; font-size: var(--ta-meta-size); }
.assay-drug { padding-top: 14px; margin-top: 14px; border-top: 1px solid var(--app-rule-subtle); }
.assay-drug :is(h3, h4) { font-size: var(--ta-body-size); }
.assay-drug :is(p, a, summary) { font-size: var(--ta-meta-size); }
.assay-drug p { margin: 3px 0; }
.assay-evidence + .assay-evidence { margin-top: 10px; }
.assay-drug-compact { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-top: 8px; padding-top: 8px; }
.assay-drug-compact details { width: 100%; margin-top: 0; }
.assay-drug details { margin-top: 6px; }
.assay-approved > summary { color: var(--app-text); }
.assay-approved > summary h2 { display: inline; }
summary { cursor: pointer; color: var(--app-muted); }
.assay-products { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--ta-row-gap); min-width: 0; }
</style>
