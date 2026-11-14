<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { filterProducts, mergeProducts, proteinCatalogLinks, proteinSpecies, proteinSuppliers, proteinTags } from "../../lib/assay-design/products.js";
import { loadSupplement } from "../../lib/target-to-assay/supplement-client.js";
import { animateElement, getPanelEnterKeyframes } from "../../utils/motion.js";

import AssayFilterSelect from "./AssayFilterSelect.vue";

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, required: true },
  zh: Boolean, detection: Boolean,
  targetId: { type: String, default: "" },
});
const species = ref("");
const tag = ref("");
const region = ref("");
const label = ref("");
const tr = (zh, en) => props.zh ? zh : en;
const submitted = ref(null);
const live = ref({});
let activeSearch;
onBeforeUnmount(() => activeSearch?.abort());

async function queryVendor(vendor, controller, offset = 0) {
  const previous = live.value[vendor]?.rows || [];
  live.value[vendor] = { rows: previous, state: "loading" };
  try {
    const response = await loadSupplement("live-proteins", { target: props.targetId, vendor, offset }, controller.signal);
    if (controller.signal.aborted) return;
    live.value[vendor] = { ...response, rows: mergeProducts([...previous, ...response.rows]) };
  } catch {
    if (!controller.signal.aborted) live.value[vendor] = { rows: previous, state: "unavailable" };
  }
}
function search() {
  activeSearch?.abort();
  activeSearch = new AbortController();
  submitted.value = { species: species.value, tag: tag.value };
  live.value = {};
  for (const vendor of proteinSuppliers) queryVendor(vendor, activeSearch);
}
const liveRows = computed(() => Object.values(live.value).flatMap(({ rows }) => rows));
const fallbackRows = computed(() => props.rows.filter(({ vendor }) => {
  const state = live.value[vendor]?.state;
  return (state === "unsupported" || state === "unavailable") && !live.value[vendor]?.rows.length;
}));
const pending = computed(() => Object.values(live.value).some(({ state }) => state === "loading"));
function vendorStatus(vendor) {
  const { state, reason } = live.value[vendor] || {};
  if (state === "unavailable" || state === "unsupported") {
    const message = {
      access_denied: tr("厂家限制访问", "Supplier restricted access"),
      timeout: tr("读取超时", "Lookup timed out"),
      unrecognized_page: tr("网页无可读取的商品详情", "No readable product details"),
    }[reason] || tr("实时读取失败", "Live lookup unavailable");
    return fallbackRows.value.some((row) => row.vendor === vendor)
      ? message + tr("，显示已核验记录", ", showing verified records")
      : message;
  }
  if (state === "loading") return tr("正在查询", "Searching");
  return tr("公开页面部分结果", "Partial public results");
}
const na = computed(() => region.value === "SA-HRP");
const choices = (field, extra = []) => [...new Set([...extra, ...[...props.rows, ...liveRows.value].map((r) => r[field]).flat().filter(Boolean)])];
const filtered = computed(() => {
  if (props.detection) return filterProducts(props.rows, { species: species.value, region: region.value, label: label.value });
  return submitted.value ? filterProducts([...liveRows.value, ...fallbackRows.value], submitted.value) : [];
});
const catalogs = computed(() => proteinCatalogLinks(props.targetId));
const supplierCounts = computed(() => proteinSuppliers.map((vendor) => ({
  vendor, count: filtered.value.filter((row) => row.vendor === vendor).length,
})));
const headers = computed(() => [
  tr("产品名称", "Product"), tr("厂家", "Supplier"), tr("货号", "SKU"),
  props.detection ? tr("识别对象种属", "Target species") : tr("蛋白种属", "Species"),
  props.detection ? tr("识别部位 / 类型", "Specificity / type") : tr("蛋白标签", "Tags"),
  props.detection ? tr("标记类型", "Label") : tr("表达序列来源", "Sequence source"),
  tr("规格", "Pack size"), tr("目录价格", "List price"),
]);
function toggle(event) {
  if (event.currentTarget.open) animateElement(event.currentTarget.querySelector(".assay-product-content"), getPanelEnterKeyframes(3));
}
</script>

<template>
  <details class="assay-product" :open="!detection" @toggle="toggle">
    <summary>{{ title }}</summary>
    <div class="assay-product-content">
      <form class="assay-filters" @submit.prevent="search">
        <AssayFilterSelect
          v-model="species" :disabled="na"
          :label="detection ? tr('识别对象种属', 'Target species') : tr('蛋白种属', 'Protein species')"
          :all="tr('全部', 'All')"
          :options="choices('species', detection ? ['Human', 'Mouse', 'Rabbit', 'Rat', 'Goat', 'Sheep', 'Donkey', 'Chicken'] : proteinSpecies)"
        />
        <AssayFilterSelect
          v-if="!detection" v-model="tag" :label="tr('蛋白标签', 'Protein tag')"
          :all="tr('全部', 'All')" :options="choices('tags', proteinTags)"
        />
        <template v-else>
          <AssayFilterSelect
            v-model="region" :label="tr('识别部位 / 类型', 'Specificity / type')"
            :all="tr('全部', 'All')" :options="['Fc', 'Fab', 'Kappa light chain', 'Lambda light chain', 'H+L', 'SA-HRP']"
          />
          <AssayFilterSelect
            v-model="label" :disabled="na" :label="tr('标记类型', 'Label')"
            :all="tr('全部', 'All')" :options="choices('label')"
          />
        </template>
        <button v-if="!detection" type="submit" class="assay-search">{{ tr("搜索", "Search") }}</button>
      </form>
      <p v-if="!detection && submitted" class="assay-note assay-suppliers" role="status">
        <span v-for="{ vendor, count } in supplierCounts" :key="vendor">
          {{ vendor }} · {{ vendorStatus(vendor) }} · {{ count }}
          <button
            v-if="live[vendor]?.nextOffset" type="button" class="assay-more"
            @click="queryVendor(vendor, activeSearch, live[vendor].nextOffset)"
          >
            {{ tr("继续读取", "Load more") }}
          </button>
        </span>
      </p>
      <div v-if="submitted && catalogs.length" class="assay-catalogs">
        <a v-for="{ vendor, url } in catalogs" :key="url" :href="url" target="_blank" rel="noopener noreferrer">
          {{ vendor }} · {{ tr("厂家目录", "Supplier catalog") }} ↗
        </a>
      </div>
      <p v-if="(detection || (submitted && !pending && (liveRows.length || fallbackRows.length))) && !filtered.length" class="assay-note" role="status">
        {{ tr("已核验记录中无匹配产品。", "No matches in the verified records.") }}
      </p>
      <div v-if="filtered.length" class="assay-scroll" tabindex="0" role="region" :aria-label="title">
        <table>
          <thead><tr><th v-for="header in headers" :key="header" scope="col">{{ header }}</th></tr></thead>
          <tbody>
            <template v-for="row in filtered" :key="row.vendor + ':' + row.sku">
              <tr v-for="(variant, index) in row.variants.length ? row.variants : [{}]" :key="index">
                <template v-if="index === 0">
                  <th scope="row" :rowspan="row.variants.length || 1">
                    <a :href="row.url" target="_blank" rel="noopener noreferrer">{{ row.name }} ↗</a>
                    <small v-if="row.componentOnly">{{ tr("复合物亚基", "Complex subunit") }}</small>
                    <small>{{ tr("核验于", "Verified") }} {{ row.verifiedOn }}</small>
                  </th>
                  <td :rowspan="row.variants.length || 1">{{ row.vendor }}</td>
                  <td :rowspan="row.variants.length || 1">{{ row.sku }}</td>
                  <td :rowspan="row.variants.length || 1">{{ row.species || tr("不适用", "N/A") }}</td>
                  <td :rowspan="row.variants.length || 1">{{ detection ? row.region : row.tags.join(", ") }}</td>
                  <td :rowspan="row.variants.length || 1">
                    <template v-if="detection">{{ row.label }}</template>
                    <template v-else>
                      {{ row.accession }}<br>{{ row.range }}
                      <small v-if="row.host">{{ tr("表达宿主", "Host") }}: {{ row.host }}</small>
                    </template>
                  </td>
                </template>
                <td>{{ variant.size || "—" }}</td>
                <td>{{ variant.price || (variant.quote ? tr("询价", "Quote") : "—") }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </details>
</template>

<style scoped>
.assay-product { border: 1px solid var(--app-rule-subtle); border-radius: 8px; min-width: 0; }
summary { cursor: pointer; padding: 12px; font-weight: 600; }
.assay-product-content { padding: 0 12px 12px; }
.assay-filters { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 12px; }
.assay-catalogs { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0 0 10px; font-size: var(--ta-meta-size); }

.assay-note { color: var(--app-muted); font-size: var(--ta-body-size); }
.assay-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; min-width: 610px; table-layout: fixed; font-size: var(--ta-meta-size); }
th, td { text-align: left; padding: 6px 5px; overflow-wrap: anywhere; border-bottom: 1px solid var(--app-rule-subtle); vertical-align: top; }
thead { background: var(--app-section); }
tbody th { font-weight: 500; }
thead th:nth-child(1) { width: 24%; }
thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(5) { width: 12%; }
thead th:nth-child(4) { width: 9%; }
thead th:nth-child(6) { width: 14%; }
thead th:nth-child(7) { width: 7%; }
thead th:nth-child(8) { width: 10%; }
.assay-suppliers { display: grid; gap: 3px; margin: 8px 0; font-size: var(--ta-meta-size); line-height: 1.45; }
.assay-more { margin-inline-start: 6px; color: var(--app-accent); border: 1px solid var(--app-rule); border-radius: 6px; background: var(--app-section); cursor: pointer; }
.assay-search { min-height: 36px; align-self: end; margin-inline-start: auto; padding: 6px 16px; border: 1px solid var(--app-accent); border-radius: 8px; color: var(--app-accent); background: var(--app-accent-soft); font: inherit; cursor: pointer; }
a { color: var(--app-accent); text-decoration: none; }
a:hover, a:focus-visible { text-decoration: underline; }
small { display: block; color: var(--app-muted); }
</style>
