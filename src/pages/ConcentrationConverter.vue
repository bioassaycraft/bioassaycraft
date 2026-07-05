<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import { animateElement, getNumberChangeKeyframes, numberChangeTransition } from "../utils/motion";
import {
  concentrationUnits,
  convertConcentration,
  formatConcentrationNumber,
  molecularWeightPresets,
  molecularWeightUnits,
} from "../lib/concentration/converter";

const inputValue = ref("");
const fromUnitKey = ref("ngmL");
const toUnitKey = ref("nmolL");
const molecularWeightValue = ref("");
const molecularWeightUnitKey = ref("kda");
const language = ref("zh");
const isHeaderMorphed = ref(false);
const headerMorphTrigger = ref(null);
const resultPanel = ref(null);
const copyState = ref("idle");
const activePresetKey = ref("");
const mobileCalculation = ref(null);
const recentCalculations = ref([]);
const lastRecentSignature = ref("");

let headerMorphObserver = null;
let copyTimer = null;
let isRestoringCalculation = false;

const converterCopy = {
  en: {
    title: "Concentration Converter",
    eyebrow: "Converter",
    compactSubtitle: "Mass ↔ molar concentration conversion.",
    home: "Back to home",
    languageLabel: "Language",
    mobileControlsLabel: "Mobile converter controls",
    unitConverter: "Concentration",
    workspace: "Workspace",
    inputWorkspace: "Input Workspace",
    resultWorkspace: "Result Workspace",
    knownConcentration: "Known concentration",
    molecularWeight: "Molecular weight",
    conversionResult: "Conversion result",
    convertedResult: "Converted result",
    currentUnit: "Current unit",
    targetUnit: "Target unit",
    swapUnits: "Swap units",
    clearInput: "Clear input",
    recentCalculations: "Recent calculations",
    clearHistory: "Clear history",
    noRecentCalculations: "Successful conversions appear here during this session.",
    restoreCalculation: "Restore calculation",
    notesTitle: "Notes for interpretation",
    copyResult: "Copy result",
    calculate: "Go",
    calculatePrompt: "Enter values and tap Calculate.",
    copied: "Copied",
    copyFailed: "Copy failed",
    inputValue: "Input value",
    inputPlaceholder: "Enter value",
    fromUnit: "From unit",
    toUnit: "To unit",
    massConcentration: "Mass concentration",
    molarConcentration: "Molar concentration",
    mwValue: "MW value",
    mwPlaceholder: "Enter molecular weight",
    mwUnit: "MW unit",
    optional: "Optional",
    commonPresets: "Common molecular weight presets",
    input: "Input",
    output: "Output",
    details: "Details",
    unit: "Unit",
    conversionFactor: "Conversion factor",
    usedMolecularWeight: "Used molecular weight",
    notUsed: "Not used",
    zeroFactor: "Not defined for zero input",
    emptyResult: "Enter a value to start conversion.",
    statusSameKind:
      "This conversion stays within one concentration system, so molecular weight is not required.",
    statusWithMw: "Molecular weight is used as the bridge between mass and molar concentration.",
    messages: {
      unknownUnit: "Unknown concentration unit.",
      emptyValue: "Enter a concentration value.",
      invalidValue: "Concentration must be a number greater than or equal to 0.",
      missingMw: "Molecular weight is required for mass ↔ molar conversion.",
      invalidMw: "Molecular weight must be greater than 0.",
    },
    notes: [
      "Mass concentration conversions do not require molecular weight.",
      "Molar concentration conversions do not require molecular weight.",
      "Mass ↔ molar concentration conversions require molecular weight.",
      "μg/mL is numerically equivalent to mg/L.",
    ],
    presetLabels: {
      igg: "IgG antibody",
      vhh: "VHH",
      scfv: "scFv",
      bsa: "BSA",
    },
  },
  zh: {
    title: "浓度换算器",
    eyebrow: "Converter",
    compactSubtitle: "质量浓度 ↔ 摩尔浓度换算。",
    home: "返回首页",
    languageLabel: "语言切换",
    mobileControlsLabel: "移动端换算控制区",
    unitConverter: "浓度换算",
    workspace: "工作区",
    inputWorkspace: "输入工作区",
    resultWorkspace: "结果工作区",
    knownConcentration: "已知浓度",
    molecularWeight: "分子量",
    conversionResult: "换算结果",
    convertedResult: "换算结果",
    currentUnit: "当前单位",
    targetUnit: "目标单位",
    swapUnits: "交换单位",
    clearInput: "清空输入",
    recentCalculations: "最近换算",
    clearHistory: "清空记录",
    noRecentCalculations: "本次会话中的成功换算会显示在这里。",
    restoreCalculation: "恢复换算",
    notesTitle: "解释说明",
    copyResult: "复制结果",
    calculate: "Go",
    calculatePrompt: "请输入数值并点击计算。",
    copied: "已复制",
    copyFailed: "复制失败",
    inputValue: "输入值",
    inputPlaceholder: "请输入数值",
    fromUnit: "原单位",
    toUnit: "目标单位",
    massConcentration: "质量浓度",
    molarConcentration: "摩尔浓度",
    mwValue: "分子量数值",
    mwPlaceholder: "请输入分子量",
    mwUnit: "分子量单位",
    optional: "可选",
    commonPresets: "常用分子量预设",
    input: "输入",
    output: "输出",
    details: "详情",
    unit: "单位",
    conversionFactor: "换算因子",
    usedMolecularWeight: "使用的分子量",
    notUsed: "未使用",
    zeroFactor: "零输入时不定义",
    emptyResult: "请输入数值以开始换算。",
    statusSameKind: "该换算位于同一浓度体系内，因此不需要分子量。",
    statusWithMw: "分子量用于连接质量浓度与摩尔浓度。",
    messages: {
      unknownUnit: "未知浓度单位。",
      emptyValue: "请输入浓度数值。",
      invalidValue: "浓度必须是大于或等于 0 的数字。",
      missingMw: "质量浓度与摩尔浓度互转需要输入分子量。",
      invalidMw: "分子量必须大于 0。",
    },
    notes: [
      "质量浓度之间换算不需要分子量。",
      "摩尔浓度之间换算不需要分子量。",
      "质量浓度与摩尔浓度之间换算需要分子量。",
      "μg/mL 与 mg/L 在数值上等价。",
    ],
    presetLabels: {
      igg: "IgG 抗体",
      vhh: "VHH",
      scfv: "scFv",
      bsa: "BSA",
    },
  },
};

const copy = computed(() => converterCopy[language.value]);
const massUnits = computed(() => concentrationUnits.filter((unit) => unit.kind === "mass"));
const molarUnits = computed(() => concentrationUnits.filter((unit) => unit.kind === "molar"));
const mobileToolOptions = computed(() => [
  { value: "unitConverter", label: copy.value.unitConverter },
]);
const mobileMolecularWeightUnits = computed(() =>
  molecularWeightUnits.filter((unit) => ["kda", "da"].includes(unit.key)),
);
const activeFromUnit = computed(
  () => concentrationUnits.find((unit) => unit.key === fromUnitKey.value) ?? concentrationUnits[0],
);
const mobileTargetUnits = computed(() =>
  activeFromUnit.value.kind === "mass" ? molarUnits.value : massUnits.value,
);

const result = computed(() =>
  convertConcentration({
    value: inputValue.value,
    fromUnitKey: fromUnitKey.value,
    toUnitKey: toUnitKey.value,
    molecularWeightValue: molecularWeightValue.value,
    molecularWeightUnitKey: molecularWeightUnitKey.value,
  }),
);

const inputLabel = computed(() => {
  const active =
    result.value.fromUnit ?? concentrationUnits.find((unit) => unit.key === fromUnitKey.value);
  return `${inputValue.value || "--"} ${active?.label ?? ""}`;
});

const outputLabel = computed(() => {
  if (!result.value.ok) return "--";
  return formatConcentrationNumber(result.value.outputValue);
});

const outputUnitLabel = computed(() => result.value.toUnit?.label ?? "--");

const conversionRelationLabel = computed(() => {
  if (!result.value.ok) return "";
  return `${inputLabel.value} → ${outputLabel.value} ${outputUnitLabel.value}`;
});

const conversionFactorLabel = computed(() => {
  if (!result.value.ok) return "--";
  if (result.value.conversionFactor === null) return copy.value.zeroFactor;

  return `${formatConcentrationNumber(result.value.conversionFactor)} ${result.value.toUnit.label} / ${result.value.fromUnit.label}`;
});

const molecularWeightLabel = computed(() => {
  if (!result.value.ok || !result.value.needsMolecularWeight) return copy.value.notUsed;
  return `${formatConcentrationNumber(result.value.molecularWeight)} g/mol`;
});

const statusMessage = computed(() => {
  if (result.value.ok) {
    return result.value.needsMolecularWeight ? copy.value.statusWithMw : copy.value.statusSameKind;
  }

  return copy.value.messages[result.value.reasonKey] ?? result.value.reason;
});

const resultEmptyMessage = computed(() => {
  if (result.value.ok) return "";
  if (result.value.reasonKey === "missingMw") return copy.value.messages.missingMw;
  return copy.value.emptyResult;
});

const mobileResultMessage = computed(() => {
  if (!mobileCalculation.value) return copy.value.calculatePrompt;
  if (mobileCalculation.value.result.ok) return "";

  const calculationResult = mobileCalculation.value.result;
  if (calculationResult.reasonKey === "emptyValue") return copy.value.calculatePrompt;
  return copy.value.messages[calculationResult.reasonKey] ?? calculationResult.reason;
});

const mobileActiveResult = computed(() => mobileCalculation.value?.result ?? null);

const hasMobileResult = computed(() => mobileActiveResult.value?.ok === true);

const mobileOutputLabel = computed(() => {
  if (!hasMobileResult.value) return "--";
  return formatConcentrationNumber(mobileActiveResult.value.outputValue);
});

const mobileOutputUnitLabel = computed(() => mobileActiveResult.value?.toUnit?.label ?? "--");

const mobileInputLabel = computed(() => {
  if (!hasMobileResult.value) return "";
  const active = mobileActiveResult.value.fromUnit;
  return `${mobileActiveResult.value.inputValue} ${active.label}`;
});

const mobileConversionRelationLabel = computed(() => {
  if (!hasMobileResult.value) return "";
  return `${mobileInputLabel.value} → ${mobileOutputLabel.value} ${mobileOutputUnitLabel.value}`;
});

const compactResultText = computed(() => {
  if (!hasMobileResult.value) return "";
  return `${mobileOutputLabel.value} ${mobileOutputUnitLabel.value}`;
});

const mobileMolecularWeightDisplay = computed(() => {
  if (!molecularWeightValue.value) return "--";
  const unit =
    mobileMolecularWeightUnits.value.find((item) => item.key === molecularWeightUnitKey.value) ??
    mobileMolecularWeightUnits.value[0];
  return `${molecularWeightValue.value} ${unit.label}`;
});

function buildCalculationRecord(calculationResult) {
  if (!calculationResult.ok) return null;
  const outputValue = formatConcentrationNumber(calculationResult.outputValue);
  const outputUnit = calculationResult.toUnit.label;
  return {
    signature: [
      inputValue.value,
      fromUnitKey.value,
      toUnitKey.value,
      molecularWeightValue.value,
      molecularWeightUnitKey.value,
      outputValue,
    ].join("|"),
    inputValue: inputValue.value,
    fromUnitKey: fromUnitKey.value,
    fromUnitLabel: calculationResult.fromUnit.label,
    toUnitKey: toUnitKey.value,
    toUnitLabel: outputUnit,
    molecularWeightValue: molecularWeightValue.value,
    molecularWeightUnitKey: molecularWeightUnitKey.value,
    molecularWeightLabel: mobileMolecularWeightDisplay.value,
    outputValue,
    outputLabel: `${outputValue} ${outputUnit}`,
    result: calculationResult,
  };
}

const resultText = computed(() => {
  if (!result.value.ok) return "";

  const lines = [
    `${inputLabel.value} = ${outputLabel.value} ${outputUnitLabel.value}`,
    `${copy.value.conversionFactor}: ${conversionFactorLabel.value}`,
  ];

  if (result.value.needsMolecularWeight) {
    lines.push(`${copy.value.usedMolecularWeight}: ${molecularWeightLabel.value}`);
  }

  return lines.join("\n");
});

function applyPreset(preset) {
  molecularWeightValue.value = String(preset.value);
  molecularWeightUnitKey.value = preset.unit;
  activePresetKey.value = preset.key;
}

function setLanguage(nextLanguage) {
  language.value = nextLanguage;
}

function ensureOppositeTarget(nextUnitKey) {
  const nextUnit = concentrationUnits.find((unit) => unit.key === nextUnitKey);
  const currentTarget = concentrationUnits.find((unit) => unit.key === toUnitKey.value);

  if (!nextUnit || currentTarget?.kind !== nextUnit.kind) return;
  toUnitKey.value = nextUnit.kind === "mass" ? "nmolL" : "ngmL";
}

function setCurrentUnit(nextUnitKey) {
  fromUnitKey.value = nextUnitKey;
  ensureOppositeTarget(nextUnitKey);
}

function setTargetUnit(nextUnitKey) {
  const nextTarget = concentrationUnits.find((unit) => unit.key === nextUnitKey);
  if (!nextTarget || nextTarget.kind === activeFromUnit.value.kind) return;
  toUnitKey.value = nextUnitKey;
}

function swapUnits() {
  const nextFromUnit = toUnitKey.value;
  const nextToUnit = fromUnitKey.value;
  fromUnitKey.value = nextFromUnit;
  toUnitKey.value = nextToUnit;
}

function clearInput() {
  inputValue.value = "";
}

function clearActivePreset() {
  activePresetKey.value = "";
}

async function copyCompactResult() {
  if (!hasMobileResult.value || !compactResultText.value) return;

  try {
    await navigator.clipboard.writeText(compactResultText.value);
    copyState.value = "copied";
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyState.value = "idle";
    }, 1400);
  } catch {
    copyState.value = "failed";
  }
}

function invalidateMobileCalculation() {
  mobileCalculation.value = null;
  copyState.value = "idle";
}

function calculateMobileResult() {
  const calculationResult = result.value;
  const record = buildCalculationRecord(calculationResult);

  mobileCalculation.value = {
    result: calculationResult,
    record,
  };

  if (record) {
    recordRecentCalculation(record);
  }

  pulseResult();
}

function recordRecentCalculation(record) {
  if (!record || record.signature === lastRecentSignature.value) return;

  lastRecentSignature.value = record.signature;
  recentCalculations.value = [
    record,
    ...recentCalculations.value.filter((item) => item.signature !== record.signature),
  ].slice(0, 5);
}

function restoreRecentCalculation(record) {
  isRestoringCalculation = true;
  fromUnitKey.value = record.fromUnitKey;
  toUnitKey.value = record.toUnitKey;
  molecularWeightValue.value = record.molecularWeightValue;
  molecularWeightUnitKey.value = record.molecularWeightUnitKey;
  inputValue.value = record.inputValue;
  activePresetKey.value = "";
  mobileCalculation.value = {
    result: record.result,
    record,
  };
  nextTick(() => {
    isRestoringCalculation = false;
  });
}

function clearHistory() {
  recentCalculations.value = [];
  lastRecentSignature.value = "";
}

async function copyResult() {
  if (!result.value.ok || !resultText.value) return;

  try {
    await navigator.clipboard.writeText(resultText.value);
    copyState.value = "copied";
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyState.value = "idle";
    }, 1400);
  } catch {
    copyState.value = "failed";
  }
}

async function pulseResult() {
  await nextTick();
  animateElement(resultPanel.value, getNumberChangeKeyframes(), numberChangeTransition);
}

watch([inputValue, fromUnitKey, toUnitKey, molecularWeightValue, molecularWeightUnitKey], () => {
  pulseResult();
  if (!isRestoringCalculation) {
    invalidateMobileCalculation();
  }
});

onMounted(() => {
  if ("IntersectionObserver" in window && headerMorphTrigger.value) {
    headerMorphObserver = new IntersectionObserver(
      ([entry]) => {
        isHeaderMorphed.value = !entry.isIntersecting;
      },
      { threshold: 0 },
    );
    headerMorphObserver.observe(headerMorphTrigger.value);
  }
});

onBeforeUnmount(() => {
  headerMorphObserver?.disconnect();
  window.clearTimeout(copyTimer);
});
</script>

<template>
  <div class="converter-shell">
    <main class="concentration-converter" :class="{ 'is-header-morphed': isHeaderMorphed }">
      <div ref="headerMorphTrigger" class="header-morph-trigger" aria-hidden="true"></div>
      <MobileToolHeader
        class="converter-mobile-header"
        :aria-label="copy.mobileControlsLabel"
        :selector-label="copy.unitConverter"
        :options="mobileToolOptions"
        selected-value="unitConverter"
        :language="language"
        :language-label="copy.languageLabel"
        :home-label="copy.home"
        @set-language="setLanguage"
      />
      <section class="mobile-unit-state-bar" aria-label="Mobile unit conversion direction">
        <label>
          <span>{{ copy.currentUnit }}</span>
          <select :value="fromUnitKey" @change="setCurrentUnit($event.target.value)">
            <option v-for="unit in concentrationUnits" :key="unit.key" :value="unit.key">
              {{ unit.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="mobile-icon-button mobile-swap-button"
          :aria-label="copy.swapUnits"
          @click="swapUnits"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7h10" />
            <path d="m14 4 3 3-3 3" />
            <path d="M17 17H7" />
            <path d="m10 14-3 3 3 3" />
          </svg>
        </button>
        <label>
          <span>{{ copy.targetUnit }}</span>
          <select :value="toUnitKey" @change="setTargetUnit($event.target.value)">
            <option v-for="unit in mobileTargetUnits" :key="unit.key" :value="unit.key">
              {{ unit.label }}
            </option>
          </select>
        </label>
      </section>
      <header class="tool-topbar">
        <div class="header-inner">
          <a class="brand-link" href="/" aria-label="BioassayCraft home">
            <span class="header-brand-group">
              <img class="brand-mark" src="/assets/brand/logo.svg" alt="" aria-hidden="true" />
              <span class="brand-name">bioassaycraft</span>
              <span class="morph-compact-group">
                <span class="morph-divider" aria-hidden="true"></span>
                <span class="morph-title">{{ copy.title }}</span>
              </span>
            </span>
          </a>
          <div class="topbar-spacer" aria-hidden="true"></div>
          <div class="topbar-actions">
            <div class="language-switch" :aria-label="copy.languageLabel">
              <button
                type="button"
                :class="{ 'is-active': language === 'zh' }"
                @click="setLanguage('zh')"
              >
                中文
              </button>
              <button
                type="button"
                :class="{ 'is-active': language === 'en' }"
                @click="setLanguage('en')"
              >
                English
              </button>
            </div>
            <a class="back-link" href="/">{{ copy.home }}</a>
          </div>
        </div>
      </header>

      <section class="converter-hero" aria-labelledby="converter-title">
        <span class="panel-kicker">{{ copy.eyebrow }}</span>
        <h1 id="converter-title">{{ copy.title }}</h1>
        <p>{{ copy.compactSubtitle }}</p>
      </section>

      <form
        class="converter-workspace desktop-converter-workspace"
        aria-label="Concentration conversion workspace"
        @submit.prevent="pulseResult"
      >
        <section class="workspace-pane input-workspace" aria-labelledby="input-workspace-title">
          <div class="workspace-title-row">
            <div>
              <span>{{ copy.workspace }}</span>
              <strong id="input-workspace-title">{{ copy.inputWorkspace }}</strong>
            </div>
          </div>

          <div class="workspace-section" aria-labelledby="known-concentration-section-title">
            <div class="section-title-row">
              <div>
                <strong id="known-concentration-section-title">{{
                  copy.knownConcentration
                }}</strong>
              </div>
            </div>

            <div class="field-grid">
              <label class="field-block">
                <span>{{ copy.inputValue }}</span>
                <input
                  v-model="inputValue"
                  class="numeric-input"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  :placeholder="copy.inputPlaceholder"
                />
              </label>

              <label class="field-block">
                <span>{{ copy.fromUnit }}</span>
                <select v-model="fromUnitKey">
                  <optgroup :label="copy.massConcentration">
                    <option v-for="unit in massUnits" :key="unit.key" :value="unit.key">
                      {{ unit.label }}
                    </option>
                  </optgroup>
                  <optgroup :label="copy.molarConcentration">
                    <option v-for="unit in molarUnits" :key="unit.key" :value="unit.key">
                      {{ unit.label }}
                    </option>
                  </optgroup>
                </select>
              </label>

              <label class="field-block">
                <span>{{ copy.toUnit }}</span>
                <select v-model="toUnitKey">
                  <optgroup :label="copy.massConcentration">
                    <option v-for="unit in massUnits" :key="unit.key" :value="unit.key">
                      {{ unit.label }}
                    </option>
                  </optgroup>
                  <optgroup :label="copy.molarConcentration">
                    <option v-for="unit in molarUnits" :key="unit.key" :value="unit.key">
                      {{ unit.label }}
                    </option>
                  </optgroup>
                </select>
              </label>
            </div>

            <p class="status-note" role="status" aria-live="polite">{{ statusMessage }}</p>
          </div>

          <div class="workspace-section" aria-labelledby="molecular-weight-section-title">
            <div class="section-title-row">
              <div>
                <strong id="molecular-weight-section-title">{{ copy.molecularWeight }}</strong>
              </div>
            </div>

            <div class="field-grid mw-grid">
              <label class="field-block">
                <span>{{ copy.mwValue }}</span>
                <input
                  v-model="molecularWeightValue"
                  class="numeric-input"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  :placeholder="copy.mwPlaceholder"
                  @input="clearActivePreset"
                />
              </label>

              <label class="field-block">
                <span>{{ copy.mwUnit }}</span>
                <select v-model="molecularWeightUnitKey" @change="clearActivePreset">
                  <option v-for="unit in molecularWeightUnits" :key="unit.key" :value="unit.key">
                    {{ unit.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="preset-row" :aria-label="copy.commonPresets">
              <button
                v-for="preset in molecularWeightPresets"
                :key="preset.key"
                type="button"
                :class="{ 'is-active': activePresetKey === preset.key }"
                @click="applyPreset(preset)"
              >
                {{ copy.presetLabels[preset.key] }}
                <span>{{ preset.value }} {{ preset.unit }}</span>
              </button>
            </div>
          </div>
        </section>

        <section
          ref="resultPanel"
          class="workspace-pane result-workspace"
          aria-labelledby="result-workspace-title"
        >
          <div class="workspace-title-row">
            <div>
              <span>{{ copy.workspace }}</span>
              <strong id="result-workspace-title">{{ copy.resultWorkspace }}</strong>
            </div>
            <button type="button" class="quiet-button" :disabled="!result.ok" @click="copyResult">
              {{
                copyState === "copied"
                  ? copy.copied
                  : copyState === "failed"
                    ? copy.copyFailed
                    : copy.copyResult
              }}
            </button>
          </div>

          <div
            class="workspace-section result-section"
            aria-labelledby="conversion-result-section-title"
          >
            <div class="section-title-row">
              <strong id="conversion-result-section-title">{{ copy.conversionResult }}</strong>
            </div>
            <div class="result-primary" :class="{ 'is-empty': !result.ok }">
              <span v-if="result.ok">{{ outputUnitLabel }}</span>
              <strong v-if="result.ok">
                {{ outputLabel }}
                <small>{{ outputUnitLabel }}</small>
              </strong>
              <em v-if="result.ok">{{ conversionRelationLabel }}</em>
              <p v-if="!result.ok">{{ resultEmptyMessage }}</p>
            </div>
          </div>

          <div class="workspace-section details-section">
            <div class="section-title-row">
              <strong>{{ copy.details }}</strong>
            </div>
            <dl class="result-grid">
              <div>
                <dt>{{ copy.input }}</dt>
                <dd>{{ inputLabel }}</dd>
              </div>
              <div>
                <dt>{{ copy.output }}</dt>
                <dd>{{ outputLabel }}</dd>
              </div>
              <div>
                <dt>{{ copy.conversionFactor }}</dt>
                <dd>{{ conversionFactorLabel }}</dd>
              </div>
              <div>
                <dt>{{ copy.usedMolecularWeight }}</dt>
                <dd>{{ molecularWeightLabel }}</dd>
              </div>
            </dl>
          </div>

          <aside class="workspace-section notes-strip" aria-labelledby="explanation-card-title">
            <div class="section-title-row">
              <strong id="explanation-card-title">{{ copy.notesTitle }}</strong>
            </div>
            <ul class="note-list">
              <li v-for="note in copy.notes" :key="note">{{ note }}</li>
            </ul>
          </aside>
        </section>
      </form>

      <form class="mobile-converter-workspace" @submit.prevent="calculateMobileResult">
        <section class="mobile-converter-card" aria-labelledby="mobile-molecular-weight-title">
          <h2 id="mobile-molecular-weight-title">{{ copy.molecularWeight }}</h2>
          <div class="mobile-converter-row">
            <label>
              <span>{{ copy.mwValue }}</span>
              <input
                v-model="molecularWeightValue"
                type="number"
                min="0"
                step="any"
                inputmode="decimal"
                :placeholder="copy.mwPlaceholder"
                @input="clearActivePreset"
              />
            </label>
            <label class="is-unit">
              <span>{{ copy.mwUnit }}</span>
              <select v-model="molecularWeightUnitKey" @change="clearActivePreset">
                <option
                  v-for="unit in mobileMolecularWeightUnits"
                  :key="unit.key"
                  :value="unit.key"
                >
                  {{ unit.label }}
                </option>
              </select>
            </label>
          </div>
          <div class="mobile-preset-grid" :aria-label="copy.commonPresets">
            <button
              v-for="preset in molecularWeightPresets"
              :key="preset.key"
              type="button"
              :class="{ 'is-active': activePresetKey === preset.key }"
              @click="applyPreset(preset)"
            >
              <strong>{{ copy.presetLabels[preset.key] }}</strong>
              <span>{{ preset.value }} {{ preset.unit }}</span>
            </button>
          </div>
        </section>

        <section class="mobile-converter-card" aria-labelledby="mobile-known-concentration-title">
          <div class="mobile-card-title-row">
            <h2 id="mobile-known-concentration-title">{{ copy.knownConcentration }}</h2>
            <button
              type="button"
              class="mobile-icon-button"
              :aria-label="copy.clearInput"
              :disabled="!inputValue"
              @click="clearInput"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
          </div>
          <div class="mobile-value-row">
            <input
              v-model="inputValue"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              :aria-label="copy.inputValue"
              :placeholder="copy.inputPlaceholder"
            />
            <span class="mobile-unit-badge">{{ activeFromUnit.label }}</span>
          </div>
          <div class="mobile-action-bar">
            <button type="submit" class="mobile-calculate-button" :aria-label="copy.calculate">
              {{ copy.calculate }}
            </button>
          </div>
        </section>

        <section class="mobile-converter-card" aria-labelledby="mobile-converted-result-title">
          <div class="mobile-card-title-row">
            <h2 id="mobile-converted-result-title">{{ copy.convertedResult }}</h2>
            <div class="mobile-result-actions">
              <span v-if="copyState === 'copied'" class="mobile-copy-feedback">{{
                copy.copied
              }}</span>
              <button
                type="button"
                class="mobile-icon-button"
                :aria-label="copy.copyResult"
                :disabled="!hasMobileResult"
                @click="copyCompactResult"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 8.5h8.5v10H8z" />
                  <path d="M5.5 15.5v-10H14" />
                </svg>
              </button>
            </div>
          </div>
          <div class="mobile-result-value" aria-live="polite">
            <div v-if="hasMobileResult" class="mobile-result-inline">
              <strong>{{ mobileOutputLabel }}</strong>
              <span>{{ mobileOutputUnitLabel }}</span>
            </div>
            <p v-else>{{ mobileResultMessage }}</p>
          </div>
          <p v-if="hasMobileResult" class="mobile-result-relation">
            {{ mobileConversionRelationLabel }}
          </p>
        </section>

        <section class="mobile-converter-card" aria-labelledby="mobile-recent-title">
          <div class="mobile-card-title-row">
            <h2 id="mobile-recent-title">{{ copy.recentCalculations }}</h2>
            <button
              v-if="recentCalculations.length"
              type="button"
              class="mobile-text-button"
              @click="clearHistory"
            >
              {{ copy.clearHistory }}
            </button>
          </div>
          <p v-if="!recentCalculations.length" class="mobile-empty-note">
            {{ copy.noRecentCalculations }}
          </p>
          <div v-else class="mobile-history-list">
            <button
              v-for="item in recentCalculations"
              :key="item.signature"
              type="button"
              :aria-label="copy.restoreCalculation"
              @click="restoreRecentCalculation(item)"
            >
              <span>
                <strong>{{ item.inputValue }} {{ item.fromUnitLabel }}</strong>
                <small>MW {{ item.molecularWeightLabel }}</small>
              </span>
              <span class="history-arrow" aria-hidden="true">→</span>
              <strong>{{ item.outputLabel }}</strong>
            </button>
          </div>
        </section>
      </form>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.converter-shell {
  --topbar-sticky-height: 48px;
  --shell-edge-space: 10px;
  --paper: var(--bc-bg, #f7f5f0);
  --ink: var(--bc-text, #171717);
  --muted: var(--bc-secondary, #6e7278);
  --line: var(--bc-border, #d6d9de);
  --soft-line: rgba(214, 217, 222, 0.58);
  --panel: rgba(255, 255, 255, 0.28);
  --panel-soft: rgba(255, 255, 255, 0.2);
  --accent: #4f5661;
  --accent-soft: rgba(79, 86, 97, 0.12);
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  color: var(--ink);
  background: var(--paper);
}

.concentration-converter {
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
}

.concentration-converter {
  position: relative;
  flex: 1 0 auto;
  padding: calc(var(--topbar-sticky-height) + 12px) 0 18px;
}

.header-morph-trigger {
  position: absolute;
  top: 128px;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.tool-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 50;
  min-height: var(--topbar-sticky-height);
  background: color-mix(in srgb, var(--paper) 90%, transparent);
  backdrop-filter: blur(14px);
}

.header-inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: var(--topbar-sticky-height);
  margin: 0 auto;
}

.brand-link,
.back-link {
  display: inline-flex;
  align-items: center;
  color: var(--ink);
  text-decoration: none;
}

.brand-link {
  font-weight: 600;
}

.header-brand-group {
  display: flex;
  align-items: center;
  min-width: 0;
}

.brand-mark {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  opacity: 0.84;
  object-fit: contain;
}

.brand-name {
  display: inline-block;
  max-width: 120px;
  margin-left: 9px;
  overflow: hidden;
  font-size: 0.76rem;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.82;
  transition:
    opacity 220ms ease,
    max-width 260ms ease,
    margin-left 260ms ease,
    transform 260ms ease;
}

.is-header-morphed .brand-name {
  max-width: 0;
  margin-left: 0;
  opacity: 0;
  transform: translateY(-2px);
}

.morph-compact-group {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  transition:
    margin-left 260ms ease,
    max-width 280ms ease;
}

.is-header-morphed .morph-compact-group {
  max-width: 300px;
  margin-left: 10px;
}

.morph-divider,
.morph-title {
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.morph-divider {
  flex: 0 0 auto;
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.2);
}

.morph-title {
  max-width: 0;
  overflow: hidden;
  color: rgba(23, 23, 23, 0.78);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    opacity 280ms ease,
    transform 280ms ease,
    max-width 280ms ease;
}

.is-header-morphed .morph-title {
  max-width: 260px;
}

.is-header-morphed .morph-divider,
.is-header-morphed .morph-title {
  opacity: 1;
  transform: translateY(0);
}

.topbar-spacer {
  min-width: 0;
}

.topbar-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
  min-width: max-content;
}

.back-link,
.quiet-button,
.preset-row button,
.language-switch button {
  min-height: 28px;
  border: 1px solid rgba(79, 86, 97, 0.32);
  border-radius: 7px;
  background: transparent;
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 600;
}

.back-link {
  padding: 0 10px;
  font-weight: 500;
}

.language-switch {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

.language-switch button {
  min-height: 26px;
  padding: 0 9px;
  border: 0;
  color: var(--muted);
  font-size: 0.66rem;
}

.language-switch button.is-active {
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
}

.quiet-button {
  padding: 0 9px;
}

.quiet-button:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.converter-hero {
  max-width: 760px;
  padding: 9px 0 12px;
}

.converter-hero .panel-kicker {
  display: block;
  margin-bottom: 12px;
}

.converter-hero h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  line-height: 1;
  transform-origin: left center;
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.is-header-morphed .converter-hero h1 {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}

.converter-hero p {
  max-width: 620px;
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.35;
}

.converter-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.38fr) minmax(360px, 1fr);
  gap: 16px;
  align-items: stretch;
  margin-top: 14px;
}

.mobile-converter-workspace {
  display: none;
}

.mobile-unit-state-bar {
  display: none;
}

.workspace-pane {
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(214, 217, 222, 0.58);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
}

.workspace-title-row,
.section-title-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}

.workspace-title-row {
  padding-bottom: 2px;
}

.workspace-title-row span,
.panel-kicker,
.field-block > span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.workspace-title-row strong {
  display: block;
  margin-top: 4px;
  font-size: 0.88rem;
  font-weight: 600;
}

.workspace-section {
  padding-top: 17px;
  border-top: 1px solid var(--soft-line);
}

.workspace-title-row + .workspace-section {
  padding-top: 0;
  border-top: 0;
}

.section-title-row {
  margin-bottom: 12px;
}

.section-title-row strong {
  display: block;
  font-size: 0.79rem;
  font-weight: 600;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mw-grid {
  grid-template-columns: minmax(0, 1fr) 124px;
}

.field-block {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.numeric-input,
select {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.24);
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

.numeric-input:focus,
select:focus,
.quiet-button:focus-visible,
.language-switch button:focus-visible,
.preset-row button:focus-visible,
.back-link:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(79, 86, 97, 0.12);
}

.status-note {
  min-height: 2.2em;
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.42;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}

.preset-row button {
  display: inline-grid;
  gap: 2px;
  min-height: 34px;
  padding: 5px 9px;
  color: var(--ink);
  text-align: left;
}

.preset-row button span {
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 500;
}

.result-primary {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 19px 17px 17px;
  border: 1px solid rgba(79, 86, 97, 0.18);
  border-radius: 7px;
  background:
    linear-gradient(135deg, rgba(79, 86, 97, 0.13), rgba(255, 255, 255, 0.18)), var(--accent-soft);
}

.result-primary.is-empty {
  background: rgba(255, 255, 255, 0.18);
}

.result-primary span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.result-primary strong {
  overflow-wrap: anywhere;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: clamp(1.7rem, 3.2vw, 2.35rem);
  font-weight: 500;
  line-height: 1;
}

.result-primary strong small {
  margin-left: 6px;
  color: var(--muted);
  font-family: inherit;
  font-size: 0.62em;
  font-weight: 500;
}

.result-primary em {
  color: var(--muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.72rem;
  font-style: normal;
  line-height: 1.35;
}

.result-primary p {
  margin: 0;
  color: var(--muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
  margin: 0;
}

.result-grid div {
  display: grid;
  gap: 5px;
  align-content: start;
  min-width: 0;
  padding: 8px 0;
  border-bottom: 1px solid var(--soft-line);
}

.result-grid div:last-child {
  border-bottom: 0;
}

.result-grid div:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.result-grid dt {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.result-grid dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.74rem;
  line-height: 1.32;
}

.notes-strip {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid var(--soft-line);
}

.notes-strip .section-title-row {
  margin-bottom: 7px;
}

.note-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 14px;
  align-content: start;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-list li {
  position: relative;
  padding-left: 10px;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.34;
}

.note-list li::before {
  position: absolute;
  top: 0.58em;
  left: 0;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: rgba(79, 86, 97, 0.52);
  content: "";
}

@media (max-width: 1199px) {
  .converter-workspace {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .workspace-pane {
    gap: 14px;
  }

  .notes-strip {
    margin-top: 12px;
  }
}

@media (max-width: 768px) {
  .converter-shell {
    --mobile-safe-top: max(env(safe-area-inset-top), 12px);
    --converter-mobile-header-height: 36px;
    --converter-mobile-unit-switcher-height: 64px;
    --converter-mobile-fixed-gap: 12px;
    --converter-mobile-section-gap: var(--converter-mobile-fixed-gap);
    --converter-mobile-unit-action-width: 30px;
    --converter-mobile-content-offset: calc(
      var(--mobile-safe-top) + var(--converter-mobile-header-height) +
        var(--converter-mobile-fixed-gap) + var(--converter-mobile-unit-switcher-height) +
        var(--converter-mobile-fixed-gap)
    );
    --mobile-control-gap: 8px;
    --mobile-section-gap: var(--mobile-control-gap);
    --mobile-control-height: 36px;
    --mobile-unit-state-height: var(--converter-mobile-unit-switcher-height);
    --mobile-unit-control-height: 30px;
    --mobile-header-control-height: var(--mobile-control-height);
    --mobile-header-select-width: 148px;
    --mobile-action-height: 42px;
    --mobile-input-unit-width: 66px;
    --mobile-header-control-radius: 11px;
    --mobile-header-control-padding-x: 10px;
    --mobile-header-control-font-size: 0.72rem;
    --mobile-header-control-font-weight: 650;
    --mobile-header-control-border: rgba(214, 217, 222, 0.54);
    --mobile-header-control-bg: rgba(255, 255, 255, 0.48);
    --mobile-header-control-shadow: 0 8px 22px rgba(23, 23, 23, 0.024);
    --mobile-card-radius: 16px;
    --mobile-card-bg: rgba(255, 255, 255, 0.48);
    --mobile-card-border: rgba(0, 0, 0, 0.08);
    --mobile-card-shadow: 0 8px 22px rgba(23, 23, 23, 0.024);
    --mobile-field-height: 38px;
  }

  .converter-shell {
    --topbar-sticky-height: var(--converter-mobile-content-offset);
  }

  .concentration-converter {
    width: min(100% - 32px, 1280px);
  }

  .concentration-converter {
    padding-top: var(--topbar-sticky-height);
    padding-bottom: 20px;
  }

  .tool-topbar,
  .converter-hero,
  .desktop-converter-workspace {
    display: none;
  }

  .converter-shell :deep(.site-footer) {
    display: none;
  }

  .mobile-unit-state-bar {
    position: fixed;
    top: calc(
      var(--mobile-safe-top) + var(--converter-mobile-header-height) +
        var(--converter-mobile-fixed-gap)
    );
    left: 50%;
    z-index: 69;
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) var(--converter-mobile-unit-action-width)
      minmax(0, 1fr);
    gap: var(--mobile-section-gap);
    align-items: end;
    width: min(100% - 32px, 1360px);
    min-height: var(--mobile-unit-state-height);
    padding: 8px;
    border: 1px solid var(--mobile-card-border);
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-card-shadow);
    backdrop-filter: blur(16px);
    transform: translateX(-50%);
  }

  .mobile-unit-state-bar label {
    display: grid;
    gap: 4px;
    align-self: stretch;
    align-content: end;
    min-width: 0;
  }

  .mobile-unit-state-bar label > span {
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
  }

  .mobile-unit-state-bar select {
    width: 100%;
    height: var(--mobile-unit-control-height);
    min-height: var(--mobile-unit-control-height);
    padding: 0 24px 0 8px;
    border: 1px solid rgba(214, 217, 222, 0.62);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.5);
    color: var(--ink);
    font: inherit;
    font-size: 0.74rem;
    font-weight: 650;
    line-height: 1;
  }

  .mobile-unit-state-bar .mobile-icon-button {
    align-self: end;
    width: var(--converter-mobile-unit-action-width);
    height: var(--mobile-unit-control-height);
    min-height: var(--mobile-unit-control-height);
    border-radius: 10px;
  }

  .mobile-swap-button svg {
    width: 18px;
    height: 18px;
  }

  .mobile-converter-workspace {
    display: grid;
    gap: var(--converter-mobile-section-gap);
  }

  .mobile-converter-card {
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--mobile-card-border);
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-card-shadow);
  }

  .mobile-converter-card h2 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 660;
    line-height: 1.22;
  }

  .mobile-converter-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 106px;
    gap: var(--mobile-section-gap);
    align-items: end;
    min-width: 0;
  }

  .mobile-converter-row label {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .mobile-converter-row label > span {
    color: var(--muted);
    font-size: 0.62rem;
    font-weight: 700;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .mobile-converter-row input,
  .mobile-converter-row select {
    width: 100%;
    height: var(--mobile-field-height);
    min-height: var(--mobile-field-height);
    border: 1px solid rgba(214, 217, 222, 0.62);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.46);
    color: var(--ink);
    font: inherit;
    font-size: 0.78rem;
    line-height: 1;
  }

  .mobile-converter-row input {
    padding: 0 10px;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
  }

  .mobile-converter-row select {
    padding: 0 28px 0 9px;
  }

  .mobile-converter-row input:focus,
  .mobile-converter-row select:focus,
  .mobile-unit-state-bar select:focus,
  .mobile-value-row input:focus {
    border-color: var(--accent);
    outline: none;
    box-shadow: 0 0 0 4px rgba(79, 86, 97, 0.12);
  }

  .mobile-preset-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    min-width: 0;
  }

  .mobile-preset-grid button {
    display: grid;
    gap: 2px;
    min-width: 0;
    min-height: 42px;
    padding: 6px 4px;
    border: 1px solid rgba(214, 217, 222, 0.62);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.36);
    color: var(--ink);
    text-align: center;
  }

  .mobile-preset-grid button.is-active,
  .preset-row button.is-active {
    border-color: rgba(79, 86, 97, 0.46);
    background: rgba(79, 86, 97, 0.12);
  }

  .mobile-preset-grid strong {
    overflow: hidden;
    font-size: 0.66rem;
    font-weight: 700;
    line-height: 1.12;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-preset-grid span {
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 650;
    line-height: 1.1;
  }

  .mobile-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    gap: 8px;
  }

  .mobile-result-actions {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .mobile-result-actions .mobile-copy-feedback {
    position: absolute;
    top: 50%;
    right: calc(var(--mobile-field-height) + 8px);
    margin: 0;
    white-space: nowrap;
    transform: translateY(-50%);
  }

  .mobile-value-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--mobile-input-unit-width);
    gap: var(--mobile-section-gap);
    align-items: center;
    min-width: 0;
  }

  .mobile-value-row input {
    width: 100%;
    height: var(--mobile-field-height);
    min-height: var(--mobile-field-height);
    padding: 0 10px;
    border: 1px solid rgba(214, 217, 222, 0.62);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.46);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }

  .mobile-unit-badge {
    display: inline-grid;
    height: var(--mobile-field-height);
    min-width: 0;
    place-items: center end;
    padding: 0 10px;
    border: 1px solid rgba(214, 217, 222, 0.52);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.34);
    color: var(--muted);
    font-size: 0.74rem;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
  }

  .mobile-action-bar {
    display: flex;
    margin-top: var(--mobile-section-gap);
  }

  .mobile-calculate-button {
    display: grid;
    width: 100%;
    height: var(--mobile-action-height);
    min-height: var(--mobile-action-height);
    padding: 0;
    place-items: center;
    border: 1px solid rgba(36, 87, 179, 0.28);
    border-radius: 11px;
    background: rgba(36, 87, 179, 0.92);
    color: #fff;
    box-shadow: 0 8px 18px rgba(36, 87, 179, 0.14);
    font-size: 0.74rem;
    font-weight: 760;
    line-height: 1;
  }

  .mobile-calculate-button:focus-visible {
    outline: none;
    box-shadow:
      0 8px 18px rgba(36, 87, 179, 0.14),
      0 0 0 4px rgba(36, 87, 179, 0.16);
  }

  .mobile-icon-button {
    display: grid;
    width: var(--mobile-field-height);
    height: var(--mobile-field-height);
    min-height: var(--mobile-field-height);
    padding: 0;
    place-items: center;
    border: 1px solid rgba(214, 217, 222, 0.62);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.46);
    color: var(--accent);
    box-shadow: 0 8px 18px rgba(23, 23, 23, 0.018);
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1;
  }

  .mobile-icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .mobile-icon-button svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  .mobile-result-value {
    display: grid;
    min-width: 0;
    min-height: 46px;
    padding: 0 10px;
    border: 1px solid rgba(79, 86, 97, 0.16);
    border-radius: 11px;
    background: rgba(79, 86, 97, 0.08);
    align-items: center;
  }

  .mobile-result-inline {
    display: flex;
    gap: 6px;
    align-items: baseline;
    min-width: 0;
  }

  .mobile-result-inline strong {
    min-width: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 1.18rem;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    line-height: 1;
  }

  .mobile-result-inline span {
    flex: 0 0 auto;
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 650;
  }

  .mobile-result-value p {
    margin: 0;
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.25;
  }

  .mobile-result-relation,
  .mobile-empty-note {
    margin: -2px 0 0;
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.25;
  }

  .mobile-copy-feedback {
    color: var(--accent);
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1;
  }

  .mobile-text-button {
    min-height: 26px;
    padding: 0 8px;
    border: 1px solid rgba(214, 217, 222, 0.58);
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.34);
    color: var(--accent);
    font-size: 0.64rem;
    font-weight: 700;
  }

  .mobile-history-list {
    display: grid;
    gap: 6px;
  }

  .mobile-history-list button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 16px minmax(0, 0.78fr);
    gap: 7px;
    align-items: center;
    min-width: 0;
    min-height: 42px;
    padding: 7px 8px;
    border: 1px solid rgba(214, 217, 222, 0.56);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.34);
    color: var(--ink);
    text-align: left;
  }

  .mobile-history-list span:first-child {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .mobile-history-list strong {
    min-width: 0;
    overflow: hidden;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-history-list small {
    min-width: 0;
    overflow: hidden;
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 650;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-arrow {
    color: var(--muted);
    font-size: 0.72rem;
  }

  .mobile-converter-row .is-unit {
    min-width: 0;
  }

  .mobile-converter-row input::-webkit-outer-spin-button,
  .mobile-converter-row input::-webkit-inner-spin-button,
  .mobile-value-row input::-webkit-outer-spin-button,
  .mobile-value-row input::-webkit-inner-spin-button {
    margin: 0;
  }

  .mobile-converter-row input[type="number"],
  .mobile-value-row input[type="number"] {
    appearance: textfield;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-name,
  .morph-compact-group,
  .morph-divider,
  .morph-title,
  .converter-hero h1 {
    transition: none;
  }
}
</style>
