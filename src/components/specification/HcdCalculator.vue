<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  calculateHcdSpecification,
  getHcdSafetyFactor,
  getHcdWhoLimit,
  hcdSafetyFactorOptions,
  hcdWhoLimitOptions,
} from "../../lib/specification/hcd";
import { formatEndotoxinNumber } from "../../lib/specification/endotoxin";
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

const whoLimitKey = ref("who10ng");
const customWhoLimitNgValue = ref("");
const safetyFactorKey = ref("4");
const customSafetyFactorValue = ref("");
const principleOpen = ref(false);
const resultCard = ref(null);
const timeline = ref(null);

const copyMap = {
  en: {
    title: "HCD",
    parametersTitle: "HCD Parameters",
    whoLimit: "WHO Residual DNA Limit",
    whoDefault: "10 ng/dose",
    safetyTitle: "Safety Factor",
    safetyNote: "Internal control margin, not a regulatory requirement.",
    custom: "Custom",
    resultTitle: "Internal HCD Specification",
    resultWaiting: "Enter product information to derive the HCD specification.",
    resultSource: "Calculated from dose-based residual DNA limit",
    comingSoon: "Coming Soon",
    unsupportedDoseUnit: "mL/dose support is coming soon because the current target unit is pg/mg.",
    pathTitle: "Calculation Path",
    principleTitle: "Calculation Principle",
    showPrinciple: "Show principle",
    hidePrinciple: "Hide principle",
    timeline: {
      whoLimit: "WHO Limit",
      convert: "Convert",
      dose: "Maximum Dose",
      bodyWeight: "Body Weight",
      totalDose: "Total Dose",
      theoreticalLimit: "Theoretical HCD Limit",
      safetyFactor: "Safety Factor",
      internalSpecification: "Internal HCD Specification",
    },
    principle: {
      intro: "WHO residual DNA limit is commonly expressed as 10 ng/dose.",
      doseBased:
        "The product-specific specification is obtained by converting the dose-based limit to pg/mg according to the maximum therapeutic dose.",
      safety:
        "The Safety Factor represents an internal control margin rather than a regulatory requirement.",
      theoreticalFormula: "Theoretical HCD Limit",
      internalFormula: "Internal HCD Specification",
    },
    messages: {
      missingWhoLimit: "Enter WHO residual DNA limit to continue.",
      invalidWhoLimit: "WHO residual DNA limit must be greater than 0.",
      unsupportedDoseUnit: "mL/dose support is coming soon.",
      missingDose: "Enter maximum dose to continue.",
      invalidDose: "Maximum dose must be greater than 0.",
      missingBodyWeight: "Enter body weight to continue.",
      invalidBodyWeight: "Body weight must be greater than 0.",
      missingSafetyFactor: "Enter safety factor to finish the internal specification.",
      invalidSafetyFactor: "Safety factor must be greater than 0.",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
  zh: {
    title: "HCD",
    parametersTitle: "HCD 参数",
    whoLimit: "WHO 残留 DNA 限度",
    whoDefault: "10 ng/dose",
    safetyTitle: "安全系数",
    safetyNote: "内部控制余量，不是法规要求。",
    custom: "自定义",
    resultTitle: "内部 HCD 规格",
    resultWaiting: "请输入产品信息以推导 HCD 规格。",
    resultSource: "由基于剂量的残留 DNA 限度计算得到",
    comingSoon: "即将推出",
    unsupportedDoseUnit: "由于当前目标单位为 pg/mg，mL/dose 支持即将推出。",
    pathTitle: "计算路径",
    principleTitle: "计算原理",
    showPrinciple: "展开原理",
    hidePrinciple: "收起原理",
    timeline: {
      whoLimit: "WHO 限度",
      convert: "换算",
      dose: "最大剂量",
      bodyWeight: "体重",
      totalDose: "总剂量",
      theoreticalLimit: "理论 HCD 限度",
      safetyFactor: "安全系数",
      internalSpecification: "内部 HCD 规格",
    },
    principle: {
      intro: "WHO 残留 DNA 限度通常表示为 10 ng/dose。",
      doseBased: "产品特异性规格通过最大治疗剂量，将基于剂量的限度换算为 pg/mg。",
      safety: "安全系数表示内部控制余量，而不是法规要求。",
      theoreticalFormula: "理论 HCD 限度",
      internalFormula: "内部 HCD 规格",
    },
    messages: {
      missingWhoLimit: "请输入 WHO 残留 DNA 限度以继续。",
      invalidWhoLimit: "WHO 残留 DNA 限度必须大于 0。",
      unsupportedDoseUnit: "mL/dose 支持即将推出。",
      missingDose: "请输入最大剂量以继续。",
      invalidDose: "最大剂量必须大于 0。",
      missingBodyWeight: "请输入体重以继续。",
      invalidBodyWeight: "体重必须大于 0。",
      missingSafetyFactor: "请输入安全系数以完成内部规格。",
      invalidSafetyFactor: "安全系数必须大于 0。",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
};

const copy = computed(() => copyMap[language.value]);
const whoLimitNg = computed(() => getHcdWhoLimit(whoLimitKey.value, customWhoLimitNgValue.value));
const safetyFactor = computed(() =>
  getHcdSafetyFactor(safetyFactorKey.value, customSafetyFactorValue.value),
);
const whoLimitOptions = computed(() =>
  hcdWhoLimitOptions.map((option) => ({
    ...option,
    label: option.custom ? copy.value.custom : copy.value.whoDefault,
  })),
);
const safetyFactorOptions = computed(() =>
  hcdSafetyFactorOptions.map((factor) => ({
    ...factor,
    label: factor.custom ? copy.value.custom : String(factor.value),
  })),
);
const convertedWhoLimit = computed(() =>
  whoLimitNg.value !== null && !Number.isNaN(whoLimitNg.value) ? whoLimitNg.value * 1000 : null,
);
const result = computed(() =>
  calculateHcdSpecification({
    whoLimitKey: whoLimitKey.value,
    customWhoLimitNgValue: customWhoLimitNgValue.value,
    maximumDose: props.productInformation.dose,
    doseUnitKey: props.productInformation.doseUnit,
    bodyWeight: props.productInformation.bodyWeight,
    safetyFactorKey: safetyFactorKey.value,
    customSafetyFactorValue: customSafetyFactorValue.value,
  }),
);
const resultMessage = computed(
  () => copy.value.messages[result.value.reasonKey] ?? copy.value.resultWaiting,
);
const isUnsupportedDoseUnit = computed(() => result.value.reasonKey === "unsupportedDoseUnit");
const formattedInternalSpecification = computed(() =>
  result.value.ok ? formatEndotoxinNumber(result.value.internalSpecification) : "--",
);

const timelineNodes = computed(() => {
  const nodes = [];

  if (whoLimitNg.value !== null && !Number.isNaN(whoLimitNg.value)) {
    nodes.push({
      key: "whoLimit",
      label: copy.value.timeline.whoLimit,
      value: `${formatEndotoxinNumber(whoLimitNg.value)} ng/dose`,
    });
  }

  if (convertedWhoLimit.value !== null) {
    nodes.push({
      key: "convert",
      label: copy.value.timeline.convert,
      value: `${formatEndotoxinNumber(convertedWhoLimit.value)} pg/dose`,
    });
  }

  if (result.value.maximumDose) {
    nodes.push({
      key: "dose",
      label: copy.value.timeline.dose,
      value: `${formatEndotoxinNumber(result.value.maximumDose)} ${
        copy.value.doseUnitLabels[props.productInformation.doseUnit]
      }`,
    });
  }

  if (result.value.bodyWeight) {
    nodes.push({
      key: "bodyWeight",
      label: copy.value.timeline.bodyWeight,
      value: `${formatEndotoxinNumber(result.value.bodyWeight)} kg`,
    });
  }

  if (result.value.totalDoseMg) {
    nodes.push({
      key: "totalDose",
      label: copy.value.timeline.totalDose,
      value: `${formatEndotoxinNumber(result.value.totalDoseMg)} mg/dose`,
    });
  }

  if (result.value.ok) {
    nodes.push(
      {
        key: "theoreticalLimit",
        label: copy.value.timeline.theoreticalLimit,
        value: `${formatEndotoxinNumber(result.value.theoreticalLimit)} pg/mg`,
      },
      {
        key: "safetyFactor",
        label: copy.value.timeline.safetyFactor,
        value: formatEndotoxinNumber(safetyFactor.value),
      },
      {
        key: "internalSpecification",
        label: copy.value.timeline.internalSpecification,
        value: `${formatEndotoxinNumber(result.value.internalSpecification)} pg/mg`,
        highlight: true,
      },
    );
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
    () => props.productInformation.dose,
    () => props.productInformation.doseUnit,
    () => props.productInformation.bodyWeight,
    whoLimitKey,
    customWhoLimitNgValue,
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
  <article class="spec-module hcd-module">
    <section class="module-parameter-card" aria-labelledby="hcd-parameters-title">
      <h2 id="hcd-parameters-title">{{ copy.parametersTitle }}</h2>
      <div class="parameter-grid">
        <label class="field-block">
          <span>{{ copy.whoLimit }}</span>
          <select v-model="whoLimitKey">
            <option v-for="option in whoLimitOptions" :key="option.key" :value="option.key">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="whoLimitKey === 'custom'" class="field-block">
          <span>{{ copy.custom }}</span>
          <input
            v-model="customWhoLimitNgValue"
            class="numeric-input"
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
          />
        </label>

        <label class="field-block">
          <span>{{ copy.safetyTitle }}</span>
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
        <p class="field-note safety-note">{{ copy.safetyNote }}</p>
      </div>
    </section>

    <section
      ref="resultCard"
      class="result-card"
      aria-labelledby="hcd-result-title"
      aria-live="polite"
    >
      <span class="panel-kicker">{{ copy.resultSource }}</span>
      <h2 id="hcd-result-title">{{ copy.resultTitle }}</h2>
      <div class="result-focus" :class="{ 'is-empty': !result.ok }">
        <strong v-if="result.ok">{{ formattedInternalSpecification }} <small>pg/mg</small></strong>
        <div v-else-if="isUnsupportedDoseUnit" class="coming-soon-result">
          <strong>{{ copy.comingSoon }}</strong>
          <p>{{ copy.unsupportedDoseUnit }}</p>
        </div>
        <p v-else>{{ resultMessage }}</p>
      </div>
    </section>

    <section class="path-section" aria-labelledby="hcd-path-title">
      <h2 id="hcd-path-title">{{ copy.pathTitle }}</h2>
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
        <p>{{ copy.principle.intro }}</p>
        <math class="formula" display="block" aria-label="Theoretical HCD limit formula">
          <mrow>
            <mi>{{ copy.principle.theoreticalFormula }}</mi>
            <mo>=</mo>
            <mfrac>
              <mtext>10000 pg/dose</mtext>
              <mtext>Maximum Dose</mtext>
            </mfrac>
          </mrow>
        </math>
        <math class="formula" display="block" aria-label="Internal HCD specification formula">
          <mrow>
            <mi>{{ copy.principle.internalFormula }}</mi>
            <mo>=</mo>
            <mfrac>
              <mtext>Theoretical HCD Limit</mtext>
              <mtext>Safety Factor</mtext>
            </mfrac>
          </mrow>
        </math>
        <p>{{ copy.principle.doseBased }}</p>
        <p>{{ copy.principle.safety }}</p>
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
.timeline-node span {
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

.field-note,
.principle-body p {
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

.result-focus small {
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

.coming-soon-result {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.coming-soon-result strong {
  font-size: clamp(1.3rem, 2.4vw, 1.8rem);
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
  gap: 14px;
  padding: 16px;
  border-top: 1px solid var(--soft-line);
}

.formula {
  justify-self: start;
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 1rem;
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
    padding: 12px;
  }
}
</style>
