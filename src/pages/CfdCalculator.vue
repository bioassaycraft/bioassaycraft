<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import BcTooltip from "../components/common/BcTooltip.vue";
import MathFormula from "../components/common/MathFormula.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import { calculateCfd, compareReportValues, CFD_MODES } from "../lib/cfd";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();
const isHeaderMorphed = ref(false);
const headerMorphTrigger = ref(null);
const mode = ref("unpaired");
const withinVariance = ref("");
const betweenVariance = ref("");
const independentMeasurements = ref("1");
const replicatesPerMeasurement = ref("1");
const comparisonOpen = ref(false);
const advancedDetails = ref(null);
const valueA = ref("");
const valueB = ref("");
const unit = ref("%");
const precision = ref("3");
const criticalCoefficient = ref("2");
const useExactT = ref(false);
const exactTCritical = ref("");
let headerMorphObserver = null;

const cfdCopy = {
  zh: {
    title: "CFD 临界倍差计算器", description: "基于验证方差组分，判断两个报告值的差异是否超过方法不确定度。", mobileLabel: "CFD 临界倍差计算器移动端导航", language: "语言切换", home: "返回首页",
    unpaired: "独立结果比较", unpairedBasis: "（ChP 9401 / USP 1033）", paired: "同批次配对比较", pairedBasis: "（USP 1033）", pairedNote: "仅适用于两个条件在相同 assay runs 中直接配对比较；独立检测结果请使用非配对模式。",
    input: "输入", variance: "验证方差组分", reset: "重置", varianceNote: "请输入验证模型或 ANOVA 输出的对数方差组分（log²），不能直接输入 CV%、GCV% 或标准差。", within: "试验内对数方差", between: "试验间对数方差", repeats: "重复策略", design: "测定设计", independent: "独立测定次数 c", replicates: "每次独立测定的重复数 k",
    result: "结果", cfd: "CFD 临界倍差", details: "查看计算详情", vrr: "单个报告值对数方差 V_RR", strategy: "当前重复策略", formula: "使用的计算公式", basis: "方法依据", compare: "比较两个报告值", optional: "可选", collapse: "收起", valueA: "条件 A 报告值", valueB: "条件 B 报告值", unit: "单位（可选）", limits: "适用条件与限制", formulas: "公式与变量说明", advanced: "进阶设置", advancedNote: "默认值适用于常规计算", coefficient: "临界系数", decimals: "输出小数位", exactT: "使用精确 t 分布", tCritical: "t 临界值", tPlaceholder: "直接输入 t 临界值", withinPlaceholder: "例如 0.012", betweenPlaceholder: "例如 0.006", unitPlaceholder: "例如 % 或 IU/mL", nonnegative: "请输入大于或等于 0 的方差。", positiveInteger: "请输入至少为 1 的正整数。", positiveCoefficient: "临界系数须大于 0。", positiveT: "请输入大于 0 的 t 临界值。", positiveValue: "报告值须大于 0。", observed: "观察倍数差", exceeds: "差异超过方法不确定度", notExceeded: "未检出超过方法不确定度的差异", equivalenceNote: "未超过 CFD 不等同于证明两个结果等效。若需得出等效或可比结论，应采用正式等效性检验。", limitations: "所有方差必须来自自然对数（ln）尺度的验证模型。配对模式只适用于同一 assay runs 中的直接配对；否则使用独立结果比较。", methodBasis: "方法依据", unpairedMethod: "中国药典 9401 公式（19）", pairedMethod: "USP <1033> Eq. 11（Paired）",
  },
  en: {
    title: "CFD Critical Fold Difference", description: "Use validation variance components to assess whether two reported values differ beyond method uncertainty.", mobileLabel: "CFD calculator mobile navigation", language: "Language", home: "Back to home",
    unpaired: "Independent results", unpairedBasis: "(ChP 9401 / USP 1033)", paired: "Paired within runs", pairedBasis: "(USP 1033)", pairedNote: "Use only when both conditions are directly paired in the same assay runs. Use independent results for separate testing.",
    input: "Input", variance: "Validation variance components", reset: "Reset", varianceNote: "Enter log-scale variance components from validation or ANOVA output. Do not enter CV%, GCV%, or standard deviation.", within: "Within-run log variance", between: "Between-run log variance", repeats: "Repeat strategy", design: "Measurement design", independent: "Independent measurements c", replicates: "Replicates per measurement k",
    result: "Result", cfd: "CFD critical fold difference", details: "Show calculation details", vrr: "Log variance of one reported value V_RR", strategy: "Current repeat strategy", formula: "Formula used", basis: "Method basis", compare: "Compare two reported values", optional: "Optional", collapse: "Collapse", valueA: "Condition A reported value", valueB: "Condition B reported value", unit: "Unit (optional)", limits: "Conditions and limitations", formulas: "Formula and variables", advanced: "Advanced settings", advancedNote: "Defaults suit standard calculations", coefficient: "Critical coefficient", decimals: "Decimal places", exactT: "Use exact t distribution", tCritical: "t critical value", tPlaceholder: "Enter t critical value", withinPlaceholder: "e.g. 0.012", betweenPlaceholder: "e.g. 0.006", unitPlaceholder: "e.g. % or IU/mL", nonnegative: "Enter a variance greater than or equal to 0.", positiveInteger: "Enter a positive integer of at least 1.", positiveCoefficient: "Critical coefficient must be greater than 0.", positiveT: "Enter a t critical value greater than 0.", positiveValue: "Reported value must be greater than 0.", observed: "Observed fold difference", exceeds: "Difference exceeds method uncertainty", notExceeded: "No difference beyond method uncertainty detected", equivalenceNote: "Not exceeding the CFD does not establish equivalence. Use a formal equivalence test for equivalence or comparability conclusions.", limitations: "All variance components must come from a validation model on the natural-log scale. Use paired mode only for direct pairs in the same assay runs; otherwise use independent results.", methodBasis: "Method basis", unpairedMethod: "Chinese Pharmacopoeia 9401, Formula (19)", pairedMethod: "USP <1033> Eq. 11 (Paired)",
  },
};
const copy = computed(() => cfdCopy[language.value]);

const selected = computed(() => CFD_MODES[mode.value]);
const effectiveCoefficient = computed(() =>
  useExactT.value ? exactTCritical.value : criticalCoefficient.value,
);
const result = computed(() =>
  calculateCfd({
    mode: mode.value,
    withinVariance: withinVariance.value,
    betweenVariance: betweenVariance.value,
    independentMeasurements: independentMeasurements.value,
    replicatesPerMeasurement: replicatesPerMeasurement.value,
    criticalCoefficient: effectiveCoefficient.value,
  }),
);
const comparison = computed(() =>
  result.value.ok
    ? compareReportValues(valueA.value, valueB.value, result.value.cfd)
    : { ok: false, reason: "cfd" },
);
const decimals = computed(() => Math.max(0, Math.min(8, Number(precision.value) || 3)));
const format = (value) => (Number.isFinite(value) ? value.toFixed(decimals.value) : "—");
const cfdDisplay = computed(() => (result.value.ok ? `${format(result.value.cfd)}×` : "—"));
const inputErrors = computed(() => ({
  within:
    withinVariance.value !== "" &&
    (!Number.isFinite(Number(withinVariance.value)) || Number(withinVariance.value) < 0),
  between:
    betweenVariance.value !== "" &&
    (!Number.isFinite(Number(betweenVariance.value)) || Number(betweenVariance.value) < 0),
  c:
    independentMeasurements.value !== "" &&
    (!Number.isInteger(Number(independentMeasurements.value)) ||
      Number(independentMeasurements.value) < 1),
  k:
    replicatesPerMeasurement.value !== "" &&
    (!Number.isInteger(Number(replicatesPerMeasurement.value)) ||
      Number(replicatesPerMeasurement.value) < 1),
  coefficient:
    effectiveCoefficient.value !== "" &&
    (!Number.isFinite(Number(effectiveCoefficient.value)) ||
      Number(effectiveCoefficient.value) <= 0),
  valueA:
    valueA.value !== "" && (!Number.isFinite(Number(valueA.value)) || Number(valueA.value) <= 0),
  valueB:
    valueB.value !== "" && (!Number.isFinite(Number(valueB.value)) || Number(valueB.value) <= 0),
}));

function reset() {
  mode.value = "unpaired";
  withinVariance.value = "";
  betweenVariance.value = "";
  independentMeasurements.value = "1";
  replicatesPerMeasurement.value = "1";
  comparisonOpen.value = false;
  if (advancedDetails.value) advancedDetails.value.open = false;
  valueA.value = "";
  valueB.value = "";
  unit.value = "%";
  precision.value = "3";
  criticalCoefficient.value = "2";
  useExactT.value = false;
  exactTCritical.value = "";
}

function setLanguage(nextLanguage) {
  setLocale(nextLanguage);
}

onMounted(() => {
  if ("IntersectionObserver" in window && headerMorphTrigger.value) {
    headerMorphObserver = new IntersectionObserver(([entry]) => {
      isHeaderMorphed.value = !entry.isIntersecting;
    });
    headerMorphObserver.observe(headerMorphTrigger.value);
  }
});

onBeforeUnmount(() => headerMorphObserver?.disconnect());
</script>

<template>
  <div class="cfd-shell">
    <main class="cfd-calculator" :class="{ 'is-header-morphed': isHeaderMorphed }">
      <div ref="headerMorphTrigger" class="header-morph-trigger" aria-hidden="true"></div>
      <div class="mobile-sticky-header" :aria-label="copy.mobileLabel">
        <MobileToolHeader
          :aria-label="copy.mobileLabel"
          :selector-label="copy.title"
          :options="[]"
          selected-value="cfd"
          :language="language"
          :language-label="copy.language"
          :home-label="copy.home"
          :show-selector="false"
          @set-language="setLanguage"
        />
      </div>
      <ToolTopbar
        :title="copy.title"
        :language="language"
        :language-label="copy.language"
        :home-label="copy.home"
        :is-morphed="isHeaderMorphed"
        @set-language="setLanguage"
      />
      <header class="module-header">
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.description }}</p>
      </header>

      <section class="cfd-content">
        <section class="mode-switch" :aria-label="copy.title">
          <button type="button" :class="{ active: mode === 'unpaired' }" @click="mode = 'unpaired'">
            <span>{{ copy.unpaired }}</span>
            <small>{{ copy.unpairedBasis }}</small>
          </button>
          <button type="button" :class="{ active: mode === 'paired' }" @click="mode = 'paired'">
            <span>{{ copy.paired }}</span>
            <small>{{ copy.pairedBasis }}</small>
          </button>
        </section>
        <p v-if="mode === 'paired'" class="paired-note" role="note">
          {{ copy.pairedNote }}
        </p>

        <div class="work-grid">
          <section class="input-panel" aria-labelledby="input-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">{{ copy.input }}</p>
                <h2 id="input-title">{{ copy.variance }}</h2>
              </div>
              <button class="reset" type="button" @click="reset">{{ copy.reset }}</button>
            </div>
            <p class="field-note">
              {{ copy.varianceNote }}
            </p>
            <div class="fields two-up">
              <label>
                <span class="field-label">{{ copy.within }} <BcTooltip text="Variance from within-run variation on the natural-log scale."><span class="help">?</span></BcTooltip></span>
                <input
                  v-model="withinVariance"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  :placeholder="copy.withinPlaceholder"
                  aria-describedby="within-error"
                /><small v-if="inputErrors.within" id="within-error" class="error">{{ copy.nonnegative }}</small>
              </label>
              <label>
                <span class="field-label">{{ copy.between }} <BcTooltip text="Variance from between-run variation on the natural-log scale."><span class="help">?</span></BcTooltip></span>
                <input
                  v-model="betweenVariance"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  :placeholder="copy.betweenPlaceholder"
                  aria-describedby="between-error"
                /><small v-if="inputErrors.between" id="between-error" class="error">{{ copy.nonnegative }}</small>
              </label>
            </div>
            <div class="subheading">
              <p class="eyebrow">{{ copy.repeats }}</p>
              <h2>{{ copy.design }}</h2>
            </div>
            <div class="fields two-up">
              <label
                >{{ copy.independent }}<input
                  v-model="independentMeasurements"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                /><small v-if="inputErrors.c" class="error">{{ copy.positiveInteger }}</small></label
              >
              <label
                >{{ copy.replicates }}<input
                  v-model="replicatesPerMeasurement"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                /><small v-if="inputErrors.k" class="error">{{ copy.positiveInteger }}</small></label
              >
            </div>
            <details ref="advancedDetails">
              <summary>{{ copy.advanced }} <span>{{ copy.advancedNote }}</span></summary>
              <div class="details-content fields two-up">
                <label
                  >{{ copy.coefficient }}<input
                    v-model="criticalCoefficient"
                    :disabled="useExactT"
                    type="number"
                    min="0"
                    step="any"
                  /><small v-if="inputErrors.coefficient && !useExactT" class="error"
                    >{{ copy.positiveCoefficient }}</small
                  ></label
                >
                <label
                  >{{ copy.decimals }}<input
                    v-model="precision"
                    type="number"
                    min="0"
                    max="8"
                    step="1"
                    inputmode="numeric"
                /></label>
                <label class="toggle"
                  ><input v-model="useExactT" type="checkbox" />{{ copy.exactT }}</label
                >
                <label v-if="useExactT"
                  >{{ copy.tCritical }}<input
                    v-model="exactTCritical"
                    type="number"
                    min="0"
                    step="any"
                    :placeholder="copy.tPlaceholder"
                  /><small v-if="inputErrors.coefficient" class="error"
                    >{{ copy.positiveT }}</small
                  ></label
                >
              </div>
            </details>
          </section>

          <aside class="result-panel" aria-live="polite" aria-labelledby="result-title">
            <p class="eyebrow">{{ copy.result }}</p>
            <h2 id="result-title">{{ copy.cfd }}</h2>
            <output class="cfd-value">{{ cfdDisplay }}</output>
            <details class="result-details">
              <summary>
                {{ mode === "unpaired" ? copy.unpaired : copy.paired }}
                <span>{{ copy.details }}</span>
              </summary>
              <dl>
              <div>
                <dt>{{ copy.vrr }}</dt>
                <dd>{{ result.ok ? format(result.vrr) : "—" }}</dd>
              </div>
              <div>
                <dt>{{ copy.strategy }}</dt>
                <dd>
                  c {{ independentMeasurements || "—" }} × k {{ replicatesPerMeasurement || "—" }}
                </dd>
              </div>
              <div>
                <dt>{{ copy.formula }}</dt>
                <dd>
                  {{ selected.formula.replace("a", result.ok ? String(result.coefficient) : "2") }}
                </dd>
              </div>
              <div>
                <dt>{{ copy.basis }}</dt>
                <dd v-if="mode === 'unpaired'">{{ copy.unpairedMethod }}<br />USP &lt;1033&gt; Eq. 12 (Unpaired)</dd>
                <dd v-else>{{ copy.pairedMethod }}</dd>
              </div>
              </dl>
            </details>
          </aside>
        </div>

        <section class="comparison-panel">
          <button
            class="disclosure"
            type="button"
            :aria-expanded="comparisonOpen"
            @click="comparisonOpen = !comparisonOpen"
          >
            <span>{{ copy.compare }}</span><span>{{ comparisonOpen ? copy.collapse : copy.optional }}</span>
          </button>
          <div v-if="comparisonOpen" class="comparison-content">
            <div class="fields comparison-fields">
              <label
                >{{ copy.valueA }}<input
                  v-model="valueA"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                /><small v-if="inputErrors.valueA" class="error">{{ copy.positiveValue }}</small></label
              ><label
                >{{ copy.valueB }}<input
                  v-model="valueB"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                /><small v-if="inputErrors.valueB" class="error">{{ copy.positiveValue }}</small></label
              ><label>{{ copy.unit }}<input v-model="unit" :placeholder="copy.unitPlaceholder" /></label>
            </div>
            <div
              v-if="comparison.ok"
              class="verdict"
              :class="{ exceeds: comparison.exceedsMethodUncertainty }"
            >
              <p>
                {{ copy.observed }} <strong>{{ format(comparison.observedFoldDifference) }}×</strong>
              </p>
              <h3>
                {{
                  comparison.exceedsMethodUncertainty
                    ? copy.exceeds
                    : copy.notExceeded
                }}
              </h3>
              <p v-if="!comparison.exceedsMethodUncertainty">
                {{ copy.equivalenceNote }}
              </p>
            </div>
          </div>
        </section>

        <section class="notes">
          <details>
            <summary>{{ copy.limits }}</summary>
            <p>
              {{ copy.limitations }}
            </p>
          </details>
          <details>
            <summary>{{ copy.formulas }}</summary>
            <div class="formula-explanation">
              <MathFormula formula="V_{RR}=\frac{\sigma^2_{\mathrm{within}}}{c\times k}+\frac{\sigma^2_{\mathrm{between}}}{c}" display aria-label="V RR formula" />
              <MathFormula v-if="mode === 'unpaired'" formula="\mathrm{CFD}=\exp\left\{2\sqrt{2V_{RR}}\right\}" display aria-label="Unpaired CFD formula" />
              <MathFormula v-else formula="\mathrm{CFD}=\exp\left\{2\sqrt{V_{RR}}\right\}" display aria-label="Paired CFD formula" />
            </div>
          </details>
          <details>
            <summary>{{ copy.methodBasis }}</summary>
            <p v-if="mode === 'unpaired'">{{ copy.unpairedMethod }}<br />USP &lt;1033&gt; Eq. 12 (Unpaired)</p>
            <p v-else>{{ copy.pairedMethod }}</p>
          </details>
        </section>
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.cfd-shell {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page, #fff);
  --ink: var(--bc-text-primary, #171717);
  --muted: var(--bc-text-secondary, #6e7278);
  --soft-line: var(--bc-border-subtle, rgba(208, 215, 222, 0.72));
  --panel: var(--bc-bg-surface, rgba(255, 255, 255, 0.28));
  --panel-soft: var(--bc-bg-surface-elevated, rgba(255, 255, 255, 0.2));
  --field-bg: var(--bc-bg-input, rgba(255, 255, 255, 0.24));
  --selected-bg: var(--bc-bg-selected, rgba(255, 255, 255, 0.72));
  --accent: var(--bc-accent, #2457b3);
  --accent-soft: var(--bc-accent-soft, rgba(36, 86, 179, 0.08));
  --accent-border: var(--bc-accent-border, rgba(36, 86, 179, 0.32));
  --focus-ring: var(--bc-focus-ring, rgba(36, 86, 179, 0.16));
  --card-shadow: var(--bc-shadow-card, 0 8px 22px rgba(23, 23, 23, 0.024));
  display: flex;
  min-height: 100svh;
  flex-direction: column;
  color: var(--ink);
  background: var(--paper);
}
.cfd-calculator {
  position: relative;
  flex: 1 0 auto;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 12px) 0 18px;
}
.header-morph-trigger {
  position: absolute;
  top: 128px;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
.mobile-sticky-header {
  display: none;
}
.module-header {
  position: sticky;
  top: var(--topbar-sticky-height);
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.65fr);
  gap: 24px;
  align-items: end;
  margin: 0 calc(var(--bc-container-inline, 48px) / -2);
  padding: 10px calc(var(--bc-container-inline, 48px) / 2) 13px;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(14px);
}
.module-header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1;
  transform-origin: left center;
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}
.module-header p {
  max-width: 430px;
  margin: 0;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.45;
}
.is-header-morphed .module-header h1 {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}
.cfd-content {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}
.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}
.mode-switch button {
  display: flex;
  min-height: 46px;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 6px 14px;
  border: 0;
  border-radius: 6px;
  color: var(--muted);
  background: transparent;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}
.mode-switch button > span { font-weight: 700; }
.mode-switch button small { color: var(--muted); font-size: 0.65rem; font-weight: 500; line-height: 1.1; text-align: center; }
.mode-switch button.active small { color: var(--ink); }
.mode-switch button:hover {
  color: var(--accent);
}
.mode-switch button.active {
  color: var(--ink);
  background: var(--selected-bg);
}
.mode-switch button:focus-visible,
.reset:focus-visible,
.disclosure:focus-visible,
.notes summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--focus-ring);
}
.paired-note {
  margin: 0;
  padding: 10px 13px;
  border: 1px solid #efd69d;
  border-radius: 8px;
  color: #765315;
  background: #fff9ed;
  font-size: 0.72rem;
  line-height: 1.45;
}
.work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.input-panel,
.result-panel,
.comparison-panel,
.notes details {
  min-width: 0;
  border: 1px solid var(--soft-line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(14px);
}
.input-panel,
.result-panel {
  padding: 16px;
}
.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.eyebrow {
  margin: 0 0 5px;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}
.section-heading h2,
.result-panel h2,
.subheading h2 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
}
.reset {
  min-height: 24px;
  padding: 0 7px;
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}
.field-note {
  margin: 12px 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.42;
}
.fields {
  display: grid;
  gap: 12px;
}
.two-up {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.fields label {
  display: grid;
  gap: 7px;
  min-width: 0;
  font-size: 0.72rem;
  font-weight: 600;
}
.help {
  display: inline-grid;
  width: 14px;
  height: 14px;
  place-items: center;
  color: var(--accent);
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.6rem;
}
.field-label { display: inline-flex; align-items: center; gap: 4px; }
.fields input {
  width: 100%;
  min-height: 32px;
  padding: 5px 8px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  color: var(--ink);
  background: var(--field-bg);
  font: 400 0.76rem/1.2 var(--font-mono, ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
}
.fields input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--focus-ring);
}
.fields input:disabled {
  opacity: 0.55;
}
.error {
  color: #b42318;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1.32;
}
.subheading {
  margin: 24px 0 12px;
}
.input-panel details {
  margin-top: 20px;
}
.input-panel summary,
.notes summary {
  cursor: pointer;
  color: var(--ink);
  font-size: 0.76rem;
  font-weight: 600;
}
.input-panel summary span {
  margin-left: 7px;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 400;
}
.details-content {
  margin-top: 14px;
}
.toggle {
  align-content: center;
  grid-template-columns: auto 1fr;
  cursor: pointer;
}
.toggle input {
  width: 16px !important;
  min-height: 16px !important;
}
.result-panel {
  display: grid;
  align-content: start;
  gap: 12px;
}
.cfd-value {
  display: grid;
  min-height: 116px;
  place-items: center;
  margin: 0;
  padding: 18px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  color: var(--ink);
  background: linear-gradient(135deg, var(--accent-soft), transparent), var(--accent-soft);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(1.9rem, 3.8vw, 3rem);
  font-weight: 500;
  letter-spacing: -0.06em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.result-details { margin: 0; }
.result-details summary { display: flex; min-height: 30px; align-items: center; justify-content: space-between; gap: 10px; color: var(--muted); cursor: pointer; font-size: .72rem; font-weight: 600; list-style: none; }
.result-details summary::-webkit-details-marker { display: none; }
.result-details summary span { color: var(--accent); font-size: .68rem; font-weight: 650; }
.result-panel dl {
  display: grid;
  gap: 0;
  margin: 0;
}
.result-panel dl div {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-top: 1px solid var(--soft-line);
}
.result-panel dt {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
}
.result-panel dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  line-height: 1.4;
}
.comparison-panel {
  overflow: hidden;
}
.disclosure {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border: 0;
  color: var(--ink);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.disclosure span:first-child {
  font-size: 0.86rem;
  font-weight: 600;
}
.disclosure span:last-child {
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 650;
}
.comparison-content {
  padding: 16px;
  border-top: 1px solid var(--soft-line);
}
.comparison-fields {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.comparison-fields label:last-child input + input {
  margin-top: 3px;
}
.verdict {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--accent-border);
  border-left: 3px solid #4b7f62;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(75, 127, 98, 0.08), transparent), var(--panel);
}
.verdict.exceeds {
  border-left-color: #bb5a45;
}
.verdict p {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.45;
}
.verdict h3 {
  margin: 0 0 7px;
  font-size: 0.86rem;
}
.verdict strong {
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
}
.notes {
  display: grid;
  gap: 10px;
}
.notes details {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.notes summary {
  min-height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
}
.notes p {
  margin: 0;
  padding: 0 16px 16px;
  border-top: 1px solid var(--soft-line);
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.48;
  padding-top: 14px;
}
.formula-explanation { display: grid; gap: 8px; padding: 12px 16px 16px; border-top: 1px solid var(--soft-line); color: var(--ink); font-size: .86rem; }
@media (max-width: 768px) {
  .cfd-shell {
    --topbar-sticky-height: 0px;
    --mobile-safe-top: max(env(safe-area-inset-top), 12px);
    --mobile-sticky-gap: 8px;
    --mobile-control-height: 36px;
    --mobile-header-control-height: 36px;
    --mobile-header-control-radius: 11px;
    --mobile-header-control-padding-x: 10px;
    --mobile-header-control-font-size: 0.72rem;
    --mobile-header-control-font-weight: 650;
    --mobile-header-control-border: var(--bc-border-subtle);
    --mobile-header-control-bg: var(--bc-bg-glass);
    --mobile-header-control-shadow: var(--bc-shadow-card);
    --mobile-card-radius: 16px;
    --mobile-card-bg: var(--bc-bg-glass);
    --mobile-card-border: var(--bc-border-subtle);
    --mobile-card-shadow: var(--bc-shadow-card);
    --mobile-glass-blur: 16px;
    --mobile-glass-bg: var(--bc-bg-glass);
    --mobile-glass-border: var(--bc-border-subtle);
    --mobile-glass-shadow: var(--bc-shadow-card);
    --mobile-glass-radius: 14px;
  }
  .cfd-calculator {
    width: min(100% - 32px, 1280px);
    padding-top: 0;
    padding-bottom: 20px;
  }
  .cfd-shell :deep(.tool-topbar),
  .module-header {
    display: none;
  }
  .cfd-shell :deep(.site-footer) {
    display: none;
  }
  .mobile-sticky-header {
    position: sticky;
    top: 0;
    z-index: 70;
    display: grid;
    width: 100%;
    margin-bottom: 8px;
    padding-top: var(--mobile-safe-top);
  }
  .cfd-content {
    gap: 8px;
    margin-top: 0;
  }
  .mode-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    padding: 3px;
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-card-shadow);
    backdrop-filter: blur(var(--mobile-glass-blur));
  }
  .mode-switch button {
    display: grid;
    min-width: 0;
    min-height: 44px;
    align-content: center;
    justify-content: stretch;
    place-content: center;
    gap: 3px;
    padding: 0 8px;
    border-radius: 12px;
    font-size: 0.68rem;
    white-space: normal;
  }
  .work-grid,
  .two-up,
  .comparison-fields {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .input-panel,
  .result-panel,
  .comparison-panel,
  .notes details {
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-card-shadow);
  }
  .input-panel,
  .result-panel {
    padding: 12px;
  }
  .fields input {
    min-height: 38px;
    border-radius: 11px;
    background: var(--bc-bg-glass);
  }
  .cfd-value {
    min-height: 104px;
    border-radius: 12px;
  }
  .comparison-content {
    padding: 12px;
  }
  .disclosure {
    min-height: 48px;
    padding: 0 12px;
  }
  .notes {
    gap: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .module-header h1,
  .mode-switch button {
    transition: none;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .module-header,
  .input-panel,
  .result-panel,
  .comparison-panel,
  .notes details {
    backdrop-filter: none;
    background: var(--paper);
  }
}
</style>
