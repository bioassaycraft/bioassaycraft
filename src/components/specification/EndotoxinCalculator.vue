<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import BcTooltip from "../common/BcTooltip.vue";
import {
  calculateEndotoxinSpecification,
  endotoxinSafetyFactorOptions,
  formatEndotoxinNumber,
  getEndotoxinSafetyFactor,
  getEndotoxinThreshold,
} from "../../lib/specification/endotoxin";
import { useLocale } from "../../utils/locale";
import {
  animateElement,
  getNumberChangeKeyframes,
  getPanelEnterKeyframes,
  numberChangeTransition,
  panelTransition,
} from "../../utils/motion";

const props = defineProps({
  productInformation: {
    type: Object,
    required: true,
  },
});

const { locale: language } = useLocale();

const customThresholdValue = ref("");
const safetyFactorKey = ref("4");
const customSafetyFactorValue = ref("");
const principleOpen = ref(false);
const reportingOpen = ref(false);
const understandingOpen = ref(false);
const resultCard = ref(null);
const timeline = ref(null);

const copyMap = {
  en: {
    title: "Endotoxin",
    parametersTitle: "Endotoxin Parameters",
    thresholdLabel: "Endotoxin Threshold (K)",
    safetyTitle: "Safety Factor",
    safetyNote: "Internal safety margin. Not a pharmacopeial constant.",
    bodyWeightNotUsed: "Body weight is not used in this calculation for mg/kg/dose.",
    custom: "Custom",
    resultTitle: "Internal Endotoxin Specification",
    resultWaiting: "Enter product information to derive the endotoxin specification.",
    equivalentTitle: "Equivalent Specification",
    resultSource: "Calculated from Pharmacopeial Endotoxin Limit",
    pathTitle: "Calculation Path",
    principleTitle: "Calculation Principle",
    limitFormulaLabel: "Limit equals K divided by M",
    kTerm: "K",
    mTerm: "M",
    internalTerm: "Internal Specification",
    kDefinition: "Maximum allowable endotoxin exposure according to administration route.",
    mDefinition: "Maximum dose administered per kilogram body weight within one hour.",
    internalDefinition: "Pharmacopeial Limit divided by Safety Factor.",
    showPrinciple: "Show principle",
    hidePrinciple: "Hide principle",
    showDetails: "Show details",
    hideDetails: "Hide details",
    reportingTitle: "Recommended Reporting Unit",
    recommendedSpecification: "Recommended Specification",
    equivalentTo: "Equivalent to",
    missingConcentration:
      "Protein concentration is required to calculate the equivalent EU/mL specification.",
    reportingWaiting: "Complete the endotoxin calculation to show the recommended specification.",
    whyEuMlTitle: "Why EU/mL?",
    whyEuMl: [
      "For liquid drug products with a specified protein concentration range, reporting endotoxin specifications in EU/mL is generally recommended.",
      "EU/mL directly reflects patient endotoxin exposure and avoids introducing additional uncertainty associated with protein concentration measurements.",
      "The calculated EU/mg value is retained as the theoretical basis and remains appropriate for drug substances or lyophilized products.",
    ],
    understandingTitle: "Understanding",
    understanding: [
      "The pharmacopeial endotoxin limit is first derived as EU/mg from the K/M equation.",
      "However, bacterial endotoxin testing directly measures endotoxin concentration in solution (EU/mL).",
      "Reporting endotoxin as EU/mg requires an additional protein concentration measurement.",
      "Therefore, the final reported value combines uncertainty from both the endotoxin assay and the protein concentration assay.",
      "For liquid drug products with a well-controlled protein concentration range, reporting specifications directly in EU/mL avoids introducing this additional measurement uncertainty while more directly reflecting patient endotoxin exposure.",
      "In contrast, process-related impurities such as HCP, Protein A, and residual DNA are generally expressed relative to protein content (ng/mg or pg/mg).",
      "These impurities are controlled not only for patient exposure but also for product quality, manufacturing consistency, and process capability.",
      "Therefore, relative content remains the preferred reporting unit.",
    ],
    understandingSummary:
      "The choice of reporting unit is ultimately determined by the scientific question being addressed, rather than by the calculation itself.",
    tooltipK: "Route-based threshold in EU/kg/hour.",
    tooltipSafety: "Internal margin applied after the pharmacopeial limit.",
    timeline: {
      route: "Administration Route",
      threshold: "K",
      dose: "Maximum Dose",
      bodyWeight: "Body Weight",
      hourly: "Maximum Administration",
      maximumDosePerKgHour: "M",
      pharmacopeialLimit: "Pharmacopeial Limit",
      safetyFactor: "Safety Factor",
      internalSpecification: "Internal Endotoxin Specification",
      equivalentSpecification: "Equivalent Specification",
    },
    messages: {
      missingThreshold: "Enter K to continue.",
      invalidThreshold: "K must be greater than 0.",
      missingDose: "Enter maximum dose to continue.",
      invalidDose: "Maximum dose must be greater than 0.",
      missingBodyWeight: "Enter body weight to continue.",
      invalidBodyWeight: "Body weight must be greater than 0.",
      missingAdministration: "Enter maximum administration to continue.",
      invalidAdministration: "Maximum administration must be greater than 0.",
      missingConcentration: "Product concentration is required for mL/dose.",
      invalidConcentration: "Product concentration must be greater than 0.",
      missingSafetyFactor: "Enter safety factor to finish the internal specification.",
      invalidSafetyFactor: "Safety factor must be greater than 0.",
    },
    routeLabels: {
      nonIntrathecal: "Non-intrathecal",
      intrathecal: "Intrathecal",
      custom: "Custom",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
  zh: {
    title: "内毒素",
    parametersTitle: "内毒素参数",
    thresholdLabel: "内毒素阈值 (K)",
    safetyTitle: "安全系数",
    safetyNote: "内部安全余量，不是药典常数。",
    bodyWeightNotUsed: "mg/kg/dose 情形下，本计算不使用体重。",
    custom: "自定义",
    resultTitle: "内部内毒素规格",
    resultWaiting: "请输入产品信息以推导内毒素规格。",
    equivalentTitle: "等效规格",
    resultSource: "由药典内毒素限度计算得到",
    pathTitle: "计算路径",
    principleTitle: "计算原理",
    limitFormulaLabel: "限度等于 K 除以 M",
    kTerm: "K",
    mTerm: "M",
    internalTerm: "内部规格",
    kDefinition: "根据给药途径确定的最大允许内毒素暴露量。",
    mDefinition: "1 小时内每 kg 体重接受的最大给药剂量。",
    internalDefinition: "药典限度除以安全系数。",
    showPrinciple: "展开原理",
    hidePrinciple: "收起原理",
    showDetails: "展开说明",
    hideDetails: "收起说明",
    reportingTitle: "推荐报告单位",
    recommendedSpecification: "推荐规格",
    equivalentTo: "等效于",
    missingConcentration: "需要输入蛋白浓度，才能计算等效的 EU/mL 规格。",
    reportingWaiting: "请先完成内毒素计算，以显示推荐规格。",
    whyEuMlTitle: "为什么使用 EU/mL？",
    whyEuMl: [
      "对于具有明确蛋白浓度范围的液体制剂，通常建议采用 EU/mL 作为最终内毒素放行标准。",
      "EU/mL 更直接反映患者实际内毒素暴露，同时避免将蛋白浓度测定误差引入最终内毒素结果。",
      "EU/mg 保留作为理论计算基础，对于原液（Drug Substance）或冻干制剂仍然是更合适的表达方式。",
    ],
    understandingTitle: "理解",
    understanding: [
      "药典理论限度首先通过 K/M 公式计算得到 EU/mg，这是建立产品安全限度的理论基础。",
      "然而，细菌内毒素检测（BET）实际测得的是样品溶液中的内毒素浓度（EU/mL）。",
      "如果最终报告 EU/mg，则需要结合蛋白浓度进行换算，因此最终结果不仅包含 BET 本身的测量误差，还会叠加蛋白浓度测定带来的额外不确定度。",
      "对于蛋白浓度具有明确控制范围的液体制剂，直接采用 EU/mL 作为放行标准，可以避免引入额外的浓度测量误差，同时更直接反映患者实际接受的内毒素暴露量，因此也是行业中越来越常见的报告方式。",
      "相比之下，HCP、Protein A、残留 DNA 等工艺相关杂质通常采用 ng/mg 或 pg/mg 表示。",
      "这类指标不仅关注患者暴露，还用于评价单位蛋白中的杂质水平、工艺清除能力以及产品质量一致性，因此采用相对含量作为报告单位更加合理。",
    ],
    understandingSummary: "报告单位的选择，本质上取决于希望控制的风险，而不是计算公式本身。",
    tooltipK: "按给药途径确定的 EU/kg/hour 阈值。",
    tooltipSafety: "在药典限度之后施加的内部余量。",
    timeline: {
      route: "给药途径",
      threshold: "K",
      dose: "最大剂量",
      bodyWeight: "体重",
      hourly: "最大给药次数",
      maximumDosePerKgHour: "M",
      pharmacopeialLimit: "药典限度",
      safetyFactor: "安全系数",
      internalSpecification: "内部内毒素规格",
      equivalentSpecification: "等效规格",
    },
    messages: {
      missingThreshold: "请输入 K 以继续。",
      invalidThreshold: "K 必须大于 0。",
      missingDose: "请输入最大剂量以继续。",
      invalidDose: "最大剂量必须大于 0。",
      missingBodyWeight: "请输入体重以继续。",
      invalidBodyWeight: "体重必须大于 0。",
      missingAdministration: "请输入最大给药次数以继续。",
      invalidAdministration: "最大给药次数必须大于 0。",
      missingConcentration: "mL/dose 需要输入产品浓度。",
      invalidConcentration: "产品浓度必须大于 0。",
      missingSafetyFactor: "请输入安全系数以完成内部规格。",
      invalidSafetyFactor: "安全系数必须大于 0。",
    },
    routeLabels: {
      nonIntrathecal: "非鞘内给药",
      intrathecal: "鞘内给药",
      custom: "自定义",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
};

const copy = computed(() => copyMap[language.value]);
const threshold = computed(() =>
  getEndotoxinThreshold(props.productInformation.route, customThresholdValue.value),
);
const safetyFactor = computed(() =>
  getEndotoxinSafetyFactor(safetyFactorKey.value, customSafetyFactorValue.value),
);
const hasValidThreshold = computed(
  () => threshold.value !== null && !Number.isNaN(threshold.value),
);
const hasValidSafetyFactor = computed(
  () => safetyFactor.value !== null && !Number.isNaN(safetyFactor.value),
);
const thresholdDisplay = computed(() =>
  hasValidThreshold.value ? `${formatEndotoxinNumber(threshold.value)} EU/kg/hour` : "--",
);
const safetyFactorOptions = computed(() =>
  endotoxinSafetyFactorOptions.map((factor) => ({
    ...factor,
    label: factor.custom ? copy.value.custom : String(factor.value),
  })),
);
const result = computed(() =>
  calculateEndotoxinSpecification({
    routeKey: props.productInformation.route,
    customThresholdValue: customThresholdValue.value,
    maximumDose: props.productInformation.dose,
    doseUnitKey: props.productInformation.doseUnit,
    bodyWeight: props.productInformation.bodyWeight,
    hourlyAdministration: props.productInformation.frequency,
    productConcentration: props.productInformation.concentration,
    safetyFactorKey: safetyFactorKey.value,
    customSafetyFactorValue: customSafetyFactorValue.value,
  }),
);
const resultMessage = computed(
  () => copy.value.messages[result.value.reasonKey] ?? copy.value.resultWaiting,
);
const formattedInternalSpecification = computed(() =>
  result.value.ok ? formatEndotoxinNumber(result.value.internalSpecification) : "--",
);
const formattedEquivalentSpecification = computed(() =>
  result.value.ok && result.value.equivalentSpecification !== null
    ? formatEndotoxinNumber(result.value.equivalentSpecification)
    : "",
);
const formattedRecommendedSpecification = computed(() => {
  if (!result.value.ok || result.value.equivalentSpecification === null) return "";
  const value = result.value.equivalentSpecification;
  if (Number.isInteger(value)) return value.toFixed(1);
  return formatEndotoxinNumber(value);
});
const hasEquivalentSpecification = computed(() => Boolean(formattedEquivalentSpecification.value));
const hasProductConcentration = computed(
  () => String(props.productInformation.concentration).trim() !== "",
);
const reportingMessage = computed(() => {
  if (!hasProductConcentration.value) return copy.value.missingConcentration;
  if (!result.value.ok || result.value.equivalentSpecification === null) {
    return copy.value.reportingWaiting;
  }
  return "";
});

const timelineNodes = computed(() => {
  const nodes = [
    {
      key: "route",
      label: copy.value.timeline.route,
      value: copy.value.routeLabels[props.productInformation.route],
    },
  ];

  if (hasValidThreshold.value) {
    nodes.push({
      key: "threshold",
      label: copy.value.timeline.threshold,
      value: `${formatEndotoxinNumber(threshold.value)} EU/kg/hour`,
    });
  }

  if (result.value.maximumDoseResult?.maximumDose) {
    nodes.push({
      key: "dose",
      label: copy.value.timeline.dose,
      value: `${formatEndotoxinNumber(result.value.maximumDoseResult.maximumDose)} ${
        copy.value.doseUnitLabels[props.productInformation.doseUnit]
      }`,
    });
  }

  if (result.value.maximumDoseResult?.bodyWeight) {
    nodes.push({
      key: "bodyWeight",
      label: copy.value.timeline.bodyWeight,
      value: `${formatEndotoxinNumber(result.value.maximumDoseResult.bodyWeight)} kg`,
    });
  }

  if (result.value.maximumDoseResult?.hourlyAdministration) {
    nodes.push({
      key: "hourly",
      label: copy.value.timeline.hourly,
      value: `${formatEndotoxinNumber(result.value.maximumDoseResult.hourlyAdministration)} dose/hour`,
    });
  }

  if (result.value.maximumDoseResult?.ok) {
    nodes.push({
      key: "maximumDosePerKgHour",
      label: copy.value.timeline.maximumDosePerKgHour,
      value: `${formatEndotoxinNumber(result.value.maximumDoseResult.maximumDosePerKgHour)} mg/kg/hour`,
    });
  }

  if (result.value.ok) {
    nodes.push(
      {
        key: "pharmacopeialLimit",
        label: copy.value.timeline.pharmacopeialLimit,
        value: `${formatEndotoxinNumber(result.value.pharmacopeialLimit)} EU/mg`,
      },
      {
        key: "safetyFactor",
        label: copy.value.timeline.safetyFactor,
        value: hasValidSafetyFactor.value ? formatEndotoxinNumber(safetyFactor.value) : "--",
      },
      {
        key: "internalSpecification",
        label: copy.value.timeline.internalSpecification,
        value: `${formatEndotoxinNumber(result.value.internalSpecification)} EU/mg`,
        highlight: true,
      },
    );
  }

  if (result.value.ok && result.value.equivalentSpecification !== null) {
    nodes.push({
      key: "equivalentSpecification",
      label: copy.value.timeline.equivalentSpecification,
      value: `${formatEndotoxinNumber(result.value.equivalentSpecification)} EU/mL`,
    });
  }

  return nodes;
});

async function animateResult() {
  await nextTick();
  animateElement(resultCard.value, getNumberChangeKeyframes(), numberChangeTransition);
}

async function animateTimeline() {
  await nextTick();
  animateElement(timeline.value, getPanelEnterKeyframes(6), panelTransition);
}

watch(
  [
    () => props.productInformation.route,
    () => props.productInformation.dose,
    () => props.productInformation.doseUnit,
    () => props.productInformation.bodyWeight,
    () => props.productInformation.frequency,
    () => props.productInformation.concentration,
    customThresholdValue,
    safetyFactorKey,
    customSafetyFactorValue,
  ],
  () => {
    animateResult();
    animateTimeline();
  },
);

onMounted(() => {
  animateResult();
  animateTimeline();
});
</script>

<template>
  <article class="spec-module endotoxin-module">
    <section class="module-parameter-card" aria-labelledby="endotoxin-parameters-title">
      <h2 id="endotoxin-parameters-title">{{ copy.parametersTitle }}</h2>
      <div class="parameter-grid">
        <label class="field-block">
          <span>
            <BcTooltip :text="copy.tooltipK">
              {{ copy.thresholdLabel }}
            </BcTooltip>
          </span>
          <input
            v-if="productInformation.route === 'custom'"
            v-model="customThresholdValue"
            class="numeric-input"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            placeholder="K"
          />
          <input
            v-else
            class="numeric-input"
            type="text"
            :value="`K = ${thresholdDisplay}`"
            readonly
          />
        </label>

        <label class="field-block">
          <span>
            <BcTooltip :text="copy.tooltipSafety">
              {{ copy.safetyTitle }}
            </BcTooltip>
          </span>
          <select v-model="safetyFactorKey">
            <option v-for="factor in safetyFactorOptions" :key="factor.key" :value="factor.key">
              {{ factor.label }}
            </option>
          </select>
        </label>

        <label v-if="safetyFactorKey === 'custom'" class="field-block">
          <span>{{ copy.custom }}</span>
          <input
            v-model="customSafetyFactorValue"
            class="numeric-input"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
          />
        </label>
      </div>
      <div class="parameter-notes">
        <p v-if="productInformation.doseUnit === 'mgKgDose'" class="field-note">
          {{ copy.bodyWeightNotUsed }}
        </p>
        <p class="field-note safety-note">{{ copy.safetyNote }}</p>
      </div>
    </section>

    <section
      ref="resultCard"
      class="result-card"
      aria-labelledby="endotoxin-result-title"
      aria-live="polite"
    >
      <span class="panel-kicker">{{ copy.resultSource }}</span>
      <h2 id="endotoxin-result-title">{{ copy.resultTitle }}</h2>
      <div class="result-focus" :class="{ 'is-empty': !result.ok }">
        <strong v-if="result.ok">{{ formattedInternalSpecification }} <small>EU/mg</small></strong>
        <p v-else>{{ resultMessage }}</p>
      </div>
      <div v-if="hasEquivalentSpecification" class="equivalent-result">
        <span>{{ copy.equivalentTitle }}</span>
        <strong>{{ formattedEquivalentSpecification }} <small>EU/mL</small></strong>
      </div>
    </section>

    <section class="path-section" aria-labelledby="endotoxin-path-title">
      <h2 id="endotoxin-path-title">{{ copy.pathTitle }}</h2>
      <div ref="timeline" class="timeline">
        <article
          v-for="node in timelineNodes"
          :key="node.key"
          class="timeline-node"
          :class="{ 'is-highlight': node.highlight }"
        >
          <span>{{ node.label }}</span>
          <strong>{{ node.value }}</strong>
        </article>
      </div>
    </section>

    <section class="principle-card" :class="{ 'is-open': principleOpen }">
      <button
        type="button"
        class="principle-toggle"
        :aria-expanded="principleOpen"
        @click="principleOpen = !principleOpen"
      >
        <span>{{ copy.principleTitle }}</span>
        <strong>{{ principleOpen ? copy.hidePrinciple : copy.showPrinciple }}</strong>
      </button>
      <div v-if="principleOpen" class="principle-body">
        <math class="formula" display="block" :aria-label="copy.limitFormulaLabel">
          <mrow>
            <mi>Limit</mi>
            <mo>=</mo>
            <mfrac>
              <mi>K</mi>
              <mi>M</mi>
            </mfrac>
          </mrow>
        </math>
        <dl>
          <div>
            <dt>{{ copy.kTerm }}</dt>
            <dd>{{ copy.kDefinition }}</dd>
          </div>
          <div>
            <dt>{{ copy.mTerm }}</dt>
            <dd>{{ copy.mDefinition }}</dd>
          </div>
          <div>
            <dt>{{ copy.internalTerm }}</dt>
            <dd>{{ copy.internalDefinition }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="principle-card interpretation-card" :class="{ 'is-open': reportingOpen }">
      <button
        type="button"
        class="principle-toggle"
        :aria-expanded="reportingOpen"
        @click="reportingOpen = !reportingOpen"
      >
        <span>{{ copy.reportingTitle }}</span>
        <strong>{{ reportingOpen ? copy.hideDetails : copy.showDetails }}</strong>
      </button>
      <div v-if="reportingOpen" class="principle-body interpretation-body">
        <div v-if="!reportingMessage" class="reporting-result">
          <span>{{ copy.recommendedSpecification }}</span>
          <strong>≤{{ formattedRecommendedSpecification }} <small>EU/mL</small></strong>
          <p>{{ copy.equivalentTo }} {{ formattedInternalSpecification }} EU/mg</p>
        </div>
        <p v-else class="interpretation-note">{{ reportingMessage }}</p>

        <div class="information-block">
          <h3>{{ copy.whyEuMlTitle }}</h3>
          <p v-for="paragraph in copy.whyEuMl" :key="paragraph">{{ paragraph }}</p>
        </div>
      </div>
    </section>

    <section class="principle-card interpretation-card" :class="{ 'is-open': understandingOpen }">
      <button
        type="button"
        class="principle-toggle"
        :aria-expanded="understandingOpen"
        @click="understandingOpen = !understandingOpen"
      >
        <span>{{ copy.understandingTitle }}</span>
        <strong>{{ understandingOpen ? copy.hideDetails : copy.showDetails }}</strong>
      </button>
      <div v-if="understandingOpen" class="principle-body interpretation-body">
        <p v-for="paragraph in copy.understanding" :key="paragraph">{{ paragraph }}</p>
        <p class="understanding-summary">{{ copy.understandingSummary }}</p>
      </div>
    </section>
  </article>
</template>

<style scoped>
.spec-module {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.module-parameter-card,
.result-card,
.principle-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--soft-line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(14px);
}

.module-parameter-card {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
}

.parameter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-block {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.field-block > span,
.panel-kicker,
.timeline-node span,
.equivalent-result span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.numeric-input,
select {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  background: var(--field-bg);
  color: var(--ink);
  font: inherit;
  font-size: 0.76rem;
  outline: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.numeric-input {
  padding: 5px 8px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
}

select {
  padding: 5px 28px 5px 8px;
}

.numeric-input[readonly] {
  color: var(--muted);
}

.numeric-input:focus,
select:focus,
.principle-toggle:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

.field-note {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.42;
}

.parameter-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.safety-note {
  grid-column: 2;
}

.result-card {
  display: grid;
  gap: 12px;
  text-align: center;
}

.result-card .panel-kicker {
  justify-self: center;
}

.result-focus {
  display: grid;
  min-height: 116px;
  place-items: center;
  padding: 18px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-soft), transparent), var(--accent-soft);
}

.result-focus.is-empty {
  background: var(--panel-soft);
}

.result-focus strong {
  overflow-wrap: anywhere;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(1.72rem, 3.2vw, 2.55rem);
  font-weight: 500;
  line-height: 1;
}

.result-focus small,
.equivalent-result small {
  color: var(--muted);
  font-family: inherit;
  font-size: 0.5em;
  font-weight: 500;
}

.result-focus p {
  max-width: 420px;
  margin: 0;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.4;
}

.equivalent-result {
  display: grid;
  gap: 5px;
  justify-items: center;
}

.equivalent-result strong {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(1.08rem, 1.8vw, 1.4rem);
  font-weight: 500;
  line-height: 1.1;
}

.path-section {
  display: grid;
  gap: 12px;
}

.timeline {
  position: relative;
  display: grid;
  gap: 10px;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 12px;
  width: 1px;
  background: var(--soft-line);
  content: "";
}

.timeline-node {
  position: relative;
  display: grid;
  gap: 4px;
  min-width: 0;
  margin-left: 32px;
  padding: 11px 13px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
}

.timeline-node::before {
  position: absolute;
  top: 16px;
  left: -25px;
  width: 9px;
  height: 9px;
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  background: var(--paper);
  content: "";
}

.timeline-node.is-highlight {
  border-color: var(--accent-border);
  background: linear-gradient(135deg, var(--accent-soft), transparent), var(--panel);
}

.timeline-node strong {
  overflow-wrap: anywhere;
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.32;
}

.principle-card {
  padding: 0;
  overflow: hidden;
}

.principle-toggle {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  text-align: left;
}

.principle-toggle span {
  font-size: 0.86rem;
  font-weight: 600;
}

.principle-toggle strong {
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 650;
}

.principle-body {
  display: grid;
  gap: 16px;
  padding: 0 16px 16px;
  border-top: 1px solid var(--soft-line);
}

.formula {
  justify-self: start;
  margin-top: 16px;
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 1.35rem;
}

.principle-body dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

.principle-body div {
  display: grid;
  gap: 4px;
}

.principle-body dt {
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.76rem;
  font-weight: 600;
}

.principle-body dd {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.42;
}

.interpretation-body {
  padding-top: 16px;
}

.interpretation-body p {
  margin: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.48;
}

.reporting-result {
  display: grid;
  gap: 7px;
  padding: 14px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent-soft), transparent), var(--accent-soft);
}

.reporting-result span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.reporting-result strong {
  overflow-wrap: anywhere;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(1.22rem, 2vw, 1.55rem);
  font-weight: 500;
  line-height: 1.1;
}

.reporting-result small {
  color: var(--muted);
  font-family: inherit;
  font-size: 0.58em;
  font-weight: 500;
}

.interpretation-note {
  padding: 12px 0;
}

.information-block {
  display: grid;
  gap: 9px;
}

.information-block h3 {
  margin: 0;
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.2;
}

.interpretation-body .understanding-summary {
  padding-top: 12px;
  border-top: 1px solid var(--soft-line);
  color: var(--ink);
  font-weight: 600;
}

@media (max-width: 767px) {
  .spec-module {
    gap: var(--mobile-section-gap, 8px);
  }

  .module-parameter-card,
  .result-card,
  .principle-card {
    padding: 12px;
    border-radius: var(--mobile-card-radius, 16px);
    background: var(--mobile-card-bg, var(--bc-bg-glass));
    box-shadow: var(--mobile-card-shadow, var(--bc-shadow-card));
  }

  .parameter-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .parameter-notes {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .safety-note {
    grid-column: 1;
  }

  .numeric-input,
  select {
    min-height: 38px;
    border-radius: 11px;
    background: var(--field-bg-soft);
    font-size: 0.78rem;
  }

  .result-focus {
    min-height: 104px;
    border-radius: 12px;
  }

  .result-focus strong {
    font-size: clamp(1.72rem, 10vw, 2.35rem);
  }

  .timeline-node {
    border-radius: 12px;
  }

  .principle-card {
    padding: 0;
  }

  .principle-toggle {
    min-height: 48px;
    padding: 0 12px;
  }

  .principle-body {
    padding: 0 12px 12px;
  }

  .interpretation-body {
    padding-top: 12px;
  }

  .reporting-result {
    border-radius: 12px;
  }
}
</style>
