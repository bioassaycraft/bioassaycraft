<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BcTooltip from "../components/common/BcTooltip.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import {
  confidenceInterval,
  createFixedPopulation,
  cv,
  geometricCV,
  geometricMean,
  mean,
  predictionInterval,
  samplePopulation,
  toleranceInterval,
} from "../lib/ci/statistics.ts";
import {
  animateElement,
  getNumberChangeKeyframes,
  getPanelEnterKeyframes,
  numberChangeTransition,
  panelTransition,
} from "../utils/motion";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();
const explorerRoot = ref(null);
const scenePanel = ref(null);
const statPanel = ref(null);
const isHeaderMorphed = ref(false);
const activeSceneIndex = ref(0);
const activeFlowNode = ref("sample");
const sampleValues = ref([100, 102, 98, 93, 88, 105]);
const draggedPointIndex = ref(null);
const population = createFixedPopulation(1431, 240);
const sampleSeed = ref(31);
const revealPopulation = ref(false);
const currentSample = ref(samplePopulation(population, 6, sampleSeed.value));
const samplingSize = ref(6);
const samplingMeans = ref([]);
const sampledIds = ref(new Set(currentSample.value.map((point) => point.id)));
const autoSampling = ref(false);
const truthRevealed = ref(false);
const confidenceLevel = ref(0.95);
const ciRuns = ref([]);
const widthFactor = ref("sampleSize");
const widthState = ref({
  sampleSize: 12,
  variation: 8,
  confidenceLevel: 0.95,
});
const intervalMode = ref("ci");
const decisionState = ref({
  mean: 4,
  variation: 8,
  sampleSize: 12,
});
const decisionLogicOpen = ref(false);

let autoTimer = null;
let scrollFrame = null;

const sceneIds = [
  "intro",
  "sample",
  "population",
  "sampling",
  "confidence",
  "width",
  "compare",
  "decision",
  "finish",
];

const copyByLanguage = {
  en: {
    title: "CI Explorer",
    home: "Home",
    languageLabel: "Language",
    sceneLabel: "Scenes",
    begin: "Begin",
    previous: "Previous",
    next: "Next",
    sampleData: "Sample Data",
    statistic: "Statistic",
    populationParameter: "Population Parameter",
    uncertainty: "Uncertainty",
    decision: "Decision",
    sceneNames: [
      "Introduction",
      "Sample Statistics",
      "Sample vs Population",
      "Sampling Distribution",
      "Confidence Interval",
      "CI Width",
      "CI vs PI vs TI",
      "Decision",
      "Finish",
    ],
    introTitle: "From finite samples to statistical decisions.",
    introSubtitle: "Move through sample data, uncertainty, confidence intervals, and decisions.",
    dragPoints: "Drag a point",
    arithmeticMean: "Arithmetic Mean",
    cv: "CV",
    geometricMean: "Geometric Mean",
    gcv: "GCV",
    revealPopulation: "Reveal Population",
    resample: "Resample",
    trueMean: "True Mean",
    fixedPopulation: "Population stays fixed. Only the sample changes.",
    populationPanel: "Population",
    currentSample: "Current Sample",
    samplingDistribution: "Sampling Distribution",
    sampleOnce: "Sample Once",
    autoSample: "Auto Sample",
    stop: "Stop",
    reset: "Reset",
    sampleSize: "Sample Size",
    revealTruth: "Reveal Truth",
    run100: "Run 100 Samples",
    run1000: "Run 1000 Samples",
    coverage: "Coverage",
    missed: "Missed",
    coveragePercent: "Coverage %",
    confidenceLevel: "Confidence Level",
    mean: "Mean",
    variation: "Variation",
    sampleSame: "Same sample. Same distribution. Different interval purpose.",
    acceptanceLimit: "Acceptance Limit",
    showDecisionLogic: "Show Decision Logic",
    hideDecisionLogic: "Hide Decision Logic",
    pass: "Pass",
    borderline: "Borderline",
    fail: "Fail",
    calculator: "Validation CI Calculator",
    backToLearn: "Back to Learn",
    futureBridge: "Confidence intervals become decision tools in validation.",
    widthNote: "Choose one factor, then move its slider.",
    tips: {
      cv: "Sample SD relative to the mean.",
      gcv: "Log-scale variation for positive data.",
      se: "SD divided by square root of n.",
      t: "Critical value from the t distribution.",
    },
  },
  zh: {
    title: "探索置信区间",
    home: "首页",
    languageLabel: "语言",
    sceneLabel: "场景",
    begin: "Begin",
    previous: "上一步",
    next: "下一步",
    sampleData: "Sample Data",
    statistic: "Statistic",
    populationParameter: "Population Parameter",
    uncertainty: "Uncertainty",
    decision: "Decision",
    sceneNames: [
      "Introduction",
      "Sample Statistics",
      "Sample vs Population",
      "Sampling Distribution",
      "Confidence Interval",
      "CI Width",
      "CI vs PI vs TI",
      "Decision",
      "Finish",
    ],
    introTitle: "从有限样本开始，走向统计决策。",
    introSubtitle: "探索总体参数、不确定性、置信区间，以及方法验证中的判断。",
    dragPoints: "拖动样本点",
    arithmeticMean: "Arithmetic Mean",
    cv: "CV",
    geometricMean: "Geometric Mean",
    gcv: "GCV",
    revealPopulation: "Reveal Population",
    resample: "Resample",
    trueMean: "True Mean",
    fixedPopulation: "总体保持固定。变化的是每次抽到的样本。",
    populationPanel: "Population",
    currentSample: "Current Sample",
    samplingDistribution: "Sampling Distribution",
    sampleOnce: "Sample Once",
    autoSample: "Auto Sample",
    stop: "Stop",
    reset: "Reset",
    sampleSize: "Sample Size",
    revealTruth: "Reveal Truth",
    run100: "Run 100 Samples",
    run1000: "Run 1000 Samples",
    coverage: "Coverage",
    missed: "Missed",
    coveragePercent: "Coverage %",
    confidenceLevel: "Confidence Level",
    mean: "Mean",
    variation: "Variation",
    sampleSame: "同一组 Sample，同一条 Distribution，只改变区间含义。",
    acceptanceLimit: "Acceptance Limit",
    showDecisionLogic: "Show Decision Logic",
    hideDecisionLogic: "Hide Decision Logic",
    pass: "Pass",
    borderline: "Borderline",
    fail: "Fail",
    calculator: "方法验证置信区间计算器",
    backToLearn: "Back to Learn",
    futureBridge: "置信区间不是一个数字，而是统计决策工具。",
    widthNote: "先选择一个因素，再拖动它的滑块。",
    tips: {
      cv: "样本标准差相对于均值的比例。",
      gcv: "正值数据的对数尺度变异。",
      se: "SD 除以 n 的平方根。",
      t: "来自 t 分布的临界值。",
    },
  },
};

const copy = computed(() => copyByLanguage[language.value]);
const activeSceneId = computed(() => sceneIds[activeSceneIndex.value]);
const trueMean = computed(() => mean(population.map((point) => point.value)));
const sampleStats = computed(() => {
  const values = sampleValues.value;
  return [
    { key: "mean", label: copy.value.arithmeticMean, value: mean(values), suffix: "" },
    { key: "cv", label: copy.value.cv, value: cv(values), suffix: "%", tip: copy.value.tips.cv },
    { key: "gm", label: copy.value.geometricMean, value: geometricMean(values), suffix: "" },
    {
      key: "gcv",
      label: copy.value.gcv,
      value: geometricCV(values),
      suffix: "%",
      tip: copy.value.tips.gcv,
    },
  ];
});
const currentSampleValues = computed(() => currentSample.value.map((point) => point.value));
const currentSampleMean = computed(() => mean(currentSampleValues.value));
const ciCoverage = computed(() => {
  const covered = ciRuns.value.filter(
    (run) => run.lower <= trueMean.value && run.upper >= trueMean.value,
  ).length;
  return {
    covered,
    missed: ciRuns.value.length - covered,
    percent: ciRuns.value.length ? (covered / ciRuns.value.length) * 100 : 0,
  };
});
const displayedCiRuns = computed(() => ciRuns.value.slice(-120));
const widthInterval = computed(() => {
  const n = widthState.value.sampleSize;
  const center = 100;
  const spread = widthState.value.variation;
  const values = Array.from({ length: n }, (_, index) => {
    const phase = (index / Math.max(1, n - 1)) * Math.PI * 2;
    return center + Math.sin(phase) * spread + Math.cos(phase * 0.7) * spread * 0.22;
  });
  return confidenceInterval(values, widthState.value.confidenceLevel);
});
const intervalSample = computed(() =>
  samplePopulation(population, 12, 88).map((point) => point.value),
);
const selectedInterval = computed(() => {
  if (intervalMode.value === "pi") return predictionInterval(intervalSample.value, 0.95);
  if (intervalMode.value === "ti") return toleranceInterval(intervalSample.value, 0.95);
  return confidenceInterval(intervalSample.value, 0.95);
});
const decisionInterval = computed(() => {
  const values = Array.from({ length: decisionState.value.sampleSize }, (_, index) => {
    const phase = (index / Math.max(1, decisionState.value.sampleSize - 1)) * Math.PI * 2;
    return decisionState.value.mean + Math.sin(phase) * decisionState.value.variation;
  });
  return confidenceInterval(values, 0.95);
});
const decisionStatus = computed(() => {
  const interval = decisionInterval.value;
  if (interval.lower >= -12 && interval.upper <= 12) return "pass";
  if (interval.upper < -12 || interval.lower > 12) return "fail";
  return "borderline";
});
const sceneProgress = computed(() => `${activeSceneIndex.value + 1} / ${sceneIds.length}`);

const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat(language.value === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

const formatCompact = (value) =>
  new Intl.NumberFormat(language.value === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value);

const valueToY = (value, height = 260, min = 80, max = 114) =>
  height - 34 - ((value - min) / (max - min)) * (height - 62);

const sampleX = (index) => 46 + index * 58;
const populationX = (point, width = 320) => 26 + point.x * (width - 52);
const populationY = (point, height = 230) => 22 + point.y * (height - 44);
const meanToX = (value, width = 260, min = 88, max = 112) =>
  28 + ((value - min) / (max - min)) * (width - 56);
const percentToX = (value, width = 520, min = -20, max = 20) =>
  36 + ((value - min) / (max - min)) * (width - 72);

const setLanguage = (lang) => {
  setLocale(lang);
};

const goToScene = (index) => {
  activeSceneIndex.value = Math.min(Math.max(index, 0), sceneIds.length - 1);
};

const goToAdjacentScene = (direction) => {
  goToScene(activeSceneIndex.value + direction);
};

const updateSampleValueFromEvent = (event) => {
  if (draggedPointIndex.value === null) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const normalized = 1 - (y - 34) / (260 - 62);
  const value = Math.min(115, Math.max(84, 80 + normalized * 34));
  sampleValues.value = sampleValues.value.map((current, index) =>
    index === draggedPointIndex.value ? Number(value.toFixed(1)) : current,
  );
};

const stopDragging = () => {
  draggedPointIndex.value = null;
};

const resample = () => {
  sampleSeed.value += 1;
  currentSample.value = samplePopulation(population, 6, sampleSeed.value);
  sampledIds.value = new Set(currentSample.value.map((point) => point.id));
};

const sampleOnce = () => {
  sampleSeed.value += 1;
  const nextSample = samplePopulation(
    population,
    samplingSize.value,
    sampleSeed.value + samplingMeans.value.length * 7,
  );
  currentSample.value = nextSample;
  sampledIds.value = new Set(nextSample.map((point) => point.id));
  samplingMeans.value = [
    ...samplingMeans.value,
    {
      id: `${samplingSize.value}-${sampleSeed.value}-${samplingMeans.value.length}`,
      value: mean(nextSample.map((point) => point.value)),
      n: samplingSize.value,
    },
  ].slice(-180);
};

const toggleAutoSampling = () => {
  autoSampling.value = !autoSampling.value;
};

const resetSampling = () => {
  samplingMeans.value = [];
  resample();
};

const runSamples = (count) => {
  const start = ciRuns.value.length;
  const nextRuns = [];
  for (let index = 0; index < count; index += 1) {
    const sample = samplePopulation(population, 6, 4000 + start + index);
    const interval = confidenceInterval(
      sample.map((point) => point.value),
      confidenceLevel.value,
    );
    nextRuns.push({
      id: `${confidenceLevel.value}-${start + index}`,
      ...interval,
    });
  }
  ciRuns.value = [...ciRuns.value, ...nextRuns].slice(-2000);
};

const resetCiRuns = () => {
  ciRuns.value = [];
  truthRevealed.value = false;
};

const updateWidthState = (key, value) => {
  widthState.value = {
    ...widthState.value,
    [key]: Number(value),
  };
};

const updateDecisionState = (key, value) => {
  decisionState.value = {
    ...decisionState.value,
    [key]: Number(value),
  };
};

const intervalLineColor = (run) => {
  if (!truthRevealed.value) return "var(--accent)";
  return run.lower <= trueMean.value && run.upper >= trueMean.value
    ? "var(--success)"
    : "var(--danger)";
};

const requestScrollState = () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    isHeaderMorphed.value = window.scrollY > 72;
  });
};

watch(activeSceneIndex, async () => {
  await nextTick();
  animateElement(scenePanel.value, getPanelEnterKeyframes(6), panelTransition);
});

watch(
  sampleStats,
  async () => {
    await nextTick();
    animateElement(statPanel.value, getNumberChangeKeyframes(), numberChangeTransition);
  },
  { deep: true },
);

watch(confidenceLevel, resetCiRuns);

watch(samplingSize, () => {
  resetSampling();
});

watch(autoSampling, (enabled) => {
  if (autoTimer) {
    window.clearInterval(autoTimer);
    autoTimer = null;
  }
  if (enabled) {
    autoTimer = window.setInterval(sampleOnce, 650);
  }
});

onMounted(() => {
  requestScrollState();
  window.addEventListener("scroll", requestScrollState, { passive: true });
  window.addEventListener("pointerup", stopDragging);
});

onBeforeUnmount(() => {
  if (autoTimer) window.clearInterval(autoTimer);
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", requestScrollState);
  window.removeEventListener("pointerup", stopDragging);
});
</script>

<template>
  <main
    ref="explorerRoot"
    class="ci-explorer morph-header-v1"
    :class="{ 'is-header-morphed': isHeaderMorphed }"
  >
    <ToolTopbar
      :title="copy.title"
      :language="language"
      :language-label="copy.languageLabel"
      :home-label="copy.home"
      :is-morphed="isHeaderMorphed"
      @set-language="setLanguage"
    />

    <section class="explorer-header" aria-labelledby="ci-explorer-title">
      <div>
        <h1 id="ci-explorer-title">{{ copy.title }}</h1>
      </div>
    </section>

    <section class="scene-sticky" :aria-label="copy.sceneLabel">
      <div class="scene-tabs">
        <button
          v-for="(sceneName, index) in copy.sceneNames"
          :key="sceneName"
          type="button"
          :class="{ 'is-active': activeSceneIndex === index }"
          @click="goToScene(index)"
        >
          <span>{{ index }}</span>
          {{ sceneName }}
        </button>
      </div>
    </section>

    <section ref="scenePanel" class="scene-shell" :class="`scene-${activeSceneId}`">
      <template v-if="activeSceneId === 'intro'">
        <div class="visual-panel flow-panel">
          <svg class="flow-svg" viewBox="0 0 520 520" role="img" :aria-label="copy.introTitle">
            <g
              v-for="(node, index) in [
                ['sample', copy.sampleData],
                ['statistic', copy.statistic],
                ['parameter', copy.populationParameter],
                ['uncertainty', copy.uncertainty],
                ['decision', copy.decision],
              ]"
              :key="node[0]"
              class="flow-node"
              :class="{ 'is-active': activeFlowNode === node[0] }"
              :transform="`translate(260 ${70 + index * 88})`"
              tabindex="0"
              role="button"
              @click="activeFlowNode = node[0]"
              @focus="activeFlowNode = node[0]"
            >
              <circle r="25"></circle>
              <text y="5">{{ node[1] }}</text>
              <path v-if="index < 4" d="M0 34 V60 M-7 53 L0 61 L7 53" class="flow-arrow"></path>
            </g>
          </svg>
        </div>
        <aside class="insight-panel intro-copy">
          <span class="panel-kicker">Introduction</span>
          <h2>{{ copy.introTitle }}</h2>
          <p>{{ copy.introSubtitle }}</p>
          <button type="button" class="primary-button" @click="goToScene(1)">
            {{ copy.begin }}
          </button>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'sample'">
        <div class="visual-panel chart-panel">
          <div class="panel-title-row">
            <div>
              <span>{{ copy.dragPoints }}</span>
              <strong>{{ copy.sampleData }}</strong>
            </div>
          </div>
          <svg
            class="sample-svg"
            viewBox="0 0 400 260"
            role="img"
            :aria-label="copy.dragPoints"
            @pointermove="updateSampleValueFromEvent"
            @pointerleave="stopDragging"
          >
            <line x1="34" y1="226" x2="372" y2="226" class="axis-line"></line>
            <line x1="34" y1="34" x2="34" y2="226" class="axis-line"></line>
            <line
              x1="34"
              :y1="valueToY(mean(sampleValues))"
              x2="372"
              :y2="valueToY(mean(sampleValues))"
              class="mean-line"
            ></line>
            <g
              v-for="(value, index) in sampleValues"
              :key="index"
              class="draggable-point"
              :class="{ 'is-dragging': draggedPointIndex === index }"
              :transform="`translate(${sampleX(index)} ${valueToY(value)})`"
              tabindex="0"
              role="slider"
              :aria-valuemin="84"
              :aria-valuemax="115"
              :aria-valuenow="value"
              @pointerdown.prevent="draggedPointIndex = index"
            >
              <line y1="0" :y2="226 - valueToY(value)" class="point-stem"></line>
              <circle r="8"></circle>
              <text y="-14">{{ formatCompact(value) }}</text>
            </g>
          </svg>
        </div>
        <aside ref="statPanel" class="insight-panel stats-panel">
          <span class="panel-kicker">Statistic</span>
          <h2>{{ copy.sceneNames[1] }}</h2>
          <dl class="stat-grid">
            <div v-for="item in sampleStats" :key="item.key">
              <dt>
                <BcTooltip v-if="item.tip" :text="item.tip">
                  <span class="tooltip-term">{{ item.label }}</span>
                </BcTooltip>
                <span v-else>{{ item.label }}</span>
              </dt>
              <dd>{{ formatNumber(item.value) }}{{ item.suffix }}</dd>
            </div>
          </dl>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'population'">
        <div class="visual-panel population-panel">
          <div class="panel-title-row">
            <div>
              <span>{{ copy.fixedPopulation }}</span>
              <strong>{{ copy.sceneNames[2] }}</strong>
            </div>
            <div class="button-row">
              <button type="button" class="quiet-button" @click="revealPopulation = true">
                {{ copy.revealPopulation }}
              </button>
              <button type="button" class="quiet-button" @click="resample">
                {{ copy.resample }}
              </button>
            </div>
          </div>
          <svg
            class="population-svg"
            viewBox="0 0 680 260"
            role="img"
            :aria-label="copy.populationPanel"
          >
            <rect x="18" y="18" width="644" height="218" class="plot-bg"></rect>
            <g :class="{ 'is-hidden': !revealPopulation }">
              <circle
                v-for="point in population"
                :key="point.id"
                class="population-dot"
                :cx="populationX(point, 680)"
                :cy="populationY(point, 260)"
                r="2.2"
              ></circle>
              <line
                x1="40"
                :y1="valueToY(trueMean, 230, 78, 118)"
                x2="640"
                :y2="valueToY(trueMean, 230, 78, 118)"
                class="truth-line is-soft"
              ></line>
              <text x="48" :y="valueToY(trueMean, 230, 78, 118) - 8" class="svg-note">
                {{ copy.trueMean }} {{ formatNumber(trueMean) }}
              </text>
            </g>
            <circle
              v-for="point in currentSample"
              :key="`sample-${point.id}`"
              class="sample-dot"
              :cx="populationX(point, 680)"
              :cy="populationY(point, 260)"
              r="7"
            ></circle>
            <line
              x1="40"
              :y1="valueToY(currentSampleMean, 230, 78, 118)"
              x2="640"
              :y2="valueToY(currentSampleMean, 230, 78, 118)"
              class="mean-line"
            ></line>
          </svg>
        </div>
        <aside class="insight-panel">
          <span class="panel-kicker">{{ copy.currentSample }}</span>
          <h2>{{ formatNumber(currentSampleMean) }}</h2>
          <p>{{ copy.fixedPopulation }}</p>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'sampling'">
        <div class="visual-panel triptych-panel">
          <div class="panel-title-row">
            <div>
              <span>{{ copy.sceneNames[3] }}</span>
              <strong>{{ copy.samplingDistribution }}</strong>
            </div>
            <div class="button-row">
              <button type="button" class="quiet-button" @click="sampleOnce">
                {{ copy.sampleOnce }}
              </button>
              <button type="button" class="quiet-button" @click="toggleAutoSampling">
                {{ autoSampling ? copy.stop : copy.autoSample }}
              </button>
              <button type="button" class="quiet-button" @click="resetSampling">
                {{ copy.reset }}
              </button>
            </div>
          </div>
          <svg
            class="triptych-svg"
            viewBox="0 0 900 310"
            role="img"
            :aria-label="copy.samplingDistribution"
          >
            <text x="40" y="28" class="svg-label">{{ copy.populationPanel }}</text>
            <text x="348" y="28" class="svg-label">{{ copy.currentSample }}</text>
            <text x="638" y="28" class="svg-label">{{ copy.samplingDistribution }}</text>
            <rect x="28" y="44" width="246" height="220" class="plot-bg"></rect>
            <rect x="326" y="44" width="220" height="220" class="plot-bg"></rect>
            <rect x="624" y="44" width="246" height="220" class="plot-bg"></rect>
            <circle
              v-for="point in population"
              :key="`p-${point.id}`"
              class="population-dot"
              :class="{ 'is-sampled': sampledIds.has(point.id) }"
              :cx="28 + populationX(point, 246)"
              :cy="44 + populationY(point, 220)"
              r="2.1"
            ></circle>
            <circle
              v-for="(point, index) in currentSample"
              :key="`cs-${point.id}`"
              class="sample-dot"
              :cx="354 + (index % 10) * 18"
              :cy="valueToY(point.value, 220, 78, 118) + 34"
              r="6"
            ></circle>
            <line
              x1="342"
              :y1="valueToY(currentSampleMean, 220, 78, 118) + 34"
              x2="530"
              :y2="valueToY(currentSampleMean, 220, 78, 118) + 34"
              class="mean-line"
            ></line>
            <circle
              v-for="(item, index) in samplingMeans"
              :key="item.id"
              class="mean-dot"
              :cx="624 + meanToX(item.value, 246, 88, 112)"
              :cy="248 - Math.floor(index / 32) * 7 - (index % 5) * 1.2"
              r="3.5"
            ></circle>
          </svg>
        </div>
        <aside class="insight-panel control-panel">
          <span class="panel-kicker">{{ copy.sampleSize }}</span>
          <h2>n = {{ samplingSize }}</h2>
          <div class="segmented-control size-control">
            <button
              v-for="size in [3, 6, 10, 20, 50]"
              :key="size"
              type="button"
              :class="{ 'is-active': samplingSize === size }"
              @click="samplingSize = size"
            >
              {{ size }}
            </button>
          </div>
          <p>{{ samplingMeans.length }} means</p>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'confidence'">
        <div class="visual-panel ci-panel">
          <div class="panel-title-row">
            <div>
              <span>Sample → Mean → SD → SE → t Critical → CI</span>
              <strong>{{ copy.sceneNames[4] }}</strong>
            </div>
            <div class="button-row">
              <button type="button" class="quiet-button" @click="truthRevealed = true">
                {{ copy.revealTruth }}
              </button>
              <button type="button" class="quiet-button" @click="runSamples(100)">
                {{ copy.run100 }}
              </button>
              <button type="button" class="quiet-button" @click="runSamples(1000)">
                {{ copy.run1000 }}
              </button>
            </div>
          </div>
          <svg class="ci-svg" viewBox="0 0 760 360" role="img" :aria-label="copy.sceneNames[4]">
            <rect x="34" y="28" width="692" height="292" class="plot-bg"></rect>
            <line
              v-if="truthRevealed"
              :x1="meanToX(trueMean, 760, 86, 114)"
              y1="34"
              :x2="meanToX(trueMean, 760, 86, 114)"
              y2="318"
              class="truth-line"
            ></line>
            <g
              v-for="(run, index) in displayedCiRuns"
              :key="run.id"
              class="ci-run"
              :transform="`translate(0 ${42 + index * 2.25})`"
            >
              <line
                :x1="meanToX(run.lower, 760, 86, 114)"
                :x2="meanToX(run.upper, 760, 86, 114)"
                y1="0"
                y2="0"
                :stroke="intervalLineColor(run)"
              ></line>
              <circle
                :cx="meanToX(run.mean, 760, 86, 114)"
                cy="0"
                r="2.4"
                :fill="intervalLineColor(run)"
              ></circle>
            </g>
            <text
              v-if="truthRevealed"
              :x="meanToX(trueMean, 760, 86, 114) + 8"
              y="24"
              class="svg-note"
            >
              {{ copy.trueMean }}
            </text>
          </svg>
        </div>
        <aside class="insight-panel ci-stats">
          <span class="panel-kicker">{{ copy.confidenceLevel }}</span>
          <div class="segmented-control level-control">
            <button
              v-for="level in [0.9, 0.95, 0.99]"
              :key="level"
              type="button"
              :class="{ 'is-active': confidenceLevel === level }"
              @click="confidenceLevel = level"
            >
              {{ Math.round(level * 100) }}%
            </button>
          </div>
          <dl class="stat-grid">
            <div>
              <dt>{{ copy.coverage }}</dt>
              <dd>{{ ciCoverage.covered }}</dd>
            </div>
            <div>
              <dt>{{ copy.missed }}</dt>
              <dd>{{ ciCoverage.missed }}</dd>
            </div>
            <div>
              <dt>{{ copy.coveragePercent }}</dt>
              <dd>{{ formatNumber(ciCoverage.percent, 1) }}%</dd>
            </div>
          </dl>
          <button type="button" class="quiet-button" @click="resetCiRuns">{{ copy.reset }}</button>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'width'">
        <div class="visual-panel width-panel">
          <div class="panel-title-row">
            <div>
              <span>{{ copy.widthNote }}</span>
              <strong>{{ copy.sceneNames[5] }}</strong>
            </div>
          </div>
          <svg class="width-svg" viewBox="0 0 680 260" role="img" :aria-label="copy.sceneNames[5]">
            <rect x="44" y="54" width="592" height="132" class="plot-bg"></rect>
            <line x1="74" y1="120" x2="606" y2="120" class="axis-line"></line>
            <line
              :x1="meanToX(widthInterval.lower, 680, 84, 116)"
              y1="120"
              :x2="meanToX(widthInterval.upper, 680, 84, 116)"
              y2="120"
              class="interval-line"
            ></line>
            <circle
              :cx="meanToX(widthInterval.mean, 680, 84, 116)"
              cy="120"
              r="8"
              class="sample-dot"
            ></circle>
            <text x="308" y="92" class="svg-label">{{ copy.mean }}</text>
            <text x="272" y="154" class="svg-note">
              {{ formatNumber(widthInterval.lower) }} - {{ formatNumber(widthInterval.upper) }}
            </text>
          </svg>
        </div>
        <aside class="insight-panel slider-panel">
          <span class="panel-kicker">{{ copy.sceneNames[5] }}</span>
          <div class="segmented-control factor-control">
            <button
              v-for="factor in ['sampleSize', 'variation', 'confidenceLevel']"
              :key="factor"
              type="button"
              :class="{ 'is-active': widthFactor === factor }"
              @click="widthFactor = factor"
            >
              {{ copy[factor] }}
            </button>
          </div>
          <label :class="{ 'is-muted': widthFactor !== 'sampleSize' }">
            <span>{{ copy.sampleSize }}</span>
            <output>{{ widthState.sampleSize }}</output>
            <input
              type="range"
              min="4"
              max="60"
              step="1"
              :disabled="widthFactor !== 'sampleSize'"
              :value="widthState.sampleSize"
              @input="updateWidthState('sampleSize', $event.target.value)"
            />
          </label>
          <label :class="{ 'is-muted': widthFactor !== 'variation' }">
            <span>{{ copy.variation }}</span>
            <output>{{ widthState.variation }}</output>
            <input
              type="range"
              min="2"
              max="18"
              step="0.5"
              :disabled="widthFactor !== 'variation'"
              :value="widthState.variation"
              @input="updateWidthState('variation', $event.target.value)"
            />
          </label>
          <label :class="{ 'is-muted': widthFactor !== 'confidenceLevel' }">
            <span>{{ copy.confidenceLevel }}</span>
            <output>{{ Math.round(widthState.confidenceLevel * 100) }}%</output>
            <input
              type="range"
              min="0.9"
              max="0.99"
              step="0.01"
              :disabled="widthFactor !== 'confidenceLevel'"
              :value="widthState.confidenceLevel"
              @input="updateWidthState('confidenceLevel', $event.target.value)"
            />
          </label>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'compare'">
        <div class="visual-panel compare-panel">
          <div class="panel-title-row">
            <div>
              <span>{{ copy.sampleSame }}</span>
              <strong>{{ copy.sceneNames[6] }}</strong>
            </div>
            <div class="segmented-control mode-control">
              <button
                v-for="mode in ['ci', 'pi', 'ti']"
                :key="mode"
                type="button"
                :class="{ 'is-active': intervalMode === mode }"
                @click="intervalMode = mode"
              >
                {{ mode.toUpperCase() }}
              </button>
            </div>
          </div>
          <svg
            class="compare-svg"
            viewBox="0 0 760 320"
            role="img"
            :aria-label="copy.sceneNames[6]"
          >
            <path
              class="distribution-curve"
              d="M72 232 C170 228 186 90 274 94 C356 98 360 226 486 222 C566 220 596 174 688 178"
            ></path>
            <line x1="72" y1="242" x2="688" y2="242" class="axis-line"></line>
            <circle
              v-for="(value, index) in intervalSample"
              :key="index"
              class="sample-dot"
              :cx="meanToX(value, 760, 78, 122)"
              :cy="222 - (index % 4) * 9"
              r="5"
            ></circle>
            <line
              :x1="meanToX(selectedInterval.lower, 760, 78, 122)"
              y1="134"
              :x2="meanToX(selectedInterval.upper, 760, 78, 122)"
              y2="134"
              class="interval-line"
            ></line>
            <circle
              :cx="meanToX(selectedInterval.mean, 760, 78, 122)"
              cy="134"
              r="8"
              class="sample-dot"
            ></circle>
            <text x="338" y="112" class="svg-label">{{ intervalMode.toUpperCase() }}</text>
          </svg>
        </div>
        <aside class="insight-panel">
          <span class="panel-kicker">{{ intervalMode.toUpperCase() }}</span>
          <h2>
            {{ formatNumber(selectedInterval.lower) }} - {{ formatNumber(selectedInterval.upper) }}
          </h2>
          <p>{{ copy.sampleSame }}</p>
        </aside>
      </template>

      <template v-else-if="activeSceneId === 'decision'">
        <div class="visual-panel decision-panel">
          <div class="panel-title-row">
            <div>
              <span>Relative Bias Axis</span>
              <strong>{{ copy.futureBridge }}</strong>
            </div>
            <button
              type="button"
              class="quiet-button"
              @click="decisionLogicOpen = !decisionLogicOpen"
            >
              {{ decisionLogicOpen ? copy.hideDecisionLogic : copy.showDecisionLogic }}
            </button>
          </div>
          <svg
            class="decision-svg"
            viewBox="0 0 620 310"
            role="img"
            :aria-label="copy.sceneNames[7]"
          >
            <line x1="36" y1="150" x2="584" y2="150" class="axis-line"></line>
            <rect
              :x="percentToX(-12, 620)"
              y="100"
              :width="percentToX(12, 620) - percentToX(-12, 620)"
              height="100"
              class="acceptance-band"
            ></rect>
            <line
              :x1="percentToX(-12, 620)"
              y1="88"
              :x2="percentToX(-12, 620)"
              y2="214"
              class="limit-line"
            ></line>
            <line
              :x1="percentToX(12, 620)"
              y1="88"
              :x2="percentToX(12, 620)"
              y2="214"
              class="limit-line"
            ></line>
            <line
              :x1="percentToX(decisionInterval.lower, 620)"
              y1="150"
              :x2="percentToX(decisionInterval.upper, 620)"
              y2="150"
              class="interval-line"
            ></line>
            <circle
              :cx="percentToX(decisionInterval.mean, 620)"
              cy="150"
              r="8"
              class="sample-dot"
            ></circle>
            <text x="248" y="82" class="svg-label">{{ copy.acceptanceLimit }} -12% / +12%</text>
            <g v-if="decisionLogicOpen" class="logic-flow">
              <text x="92" y="250">Confidence Interval</text>
              <path d="M226 246 H282"></path>
              <text x="298" y="250">Acceptance Limit</text>
              <path d="M432 246 H488"></path>
              <text x="502" y="250">TOST</text>
            </g>
          </svg>
        </div>
        <aside class="insight-panel slider-panel decision-controls">
          <span class="panel-kicker">{{ copy.decision }}</span>
          <h2 :class="`decision-${decisionStatus}`">{{ copy[decisionStatus] }}</h2>
          <label>
            <span>{{ copy.mean }}</span>
            <output>{{ decisionState.mean }}%</output>
            <input
              type="range"
              min="-18"
              max="18"
              step="0.5"
              :value="decisionState.mean"
              @input="updateDecisionState('mean', $event.target.value)"
            />
          </label>
          <label>
            <span>{{ copy.variation }}</span>
            <output>{{ decisionState.variation }}</output>
            <input
              type="range"
              min="2"
              max="22"
              step="0.5"
              :value="decisionState.variation"
              @input="updateDecisionState('variation', $event.target.value)"
            />
          </label>
          <label>
            <span>{{ copy.sampleSize }}</span>
            <output>{{ decisionState.sampleSize }}</output>
            <input
              type="range"
              min="4"
              max="60"
              step="1"
              :value="decisionState.sampleSize"
              @input="updateDecisionState('sampleSize', $event.target.value)"
            />
          </label>
        </aside>
      </template>

      <template v-else>
        <div class="visual-panel flow-panel">
          <svg class="flow-svg" viewBox="0 0 520 520" role="img" :aria-label="copy.sceneNames[8]">
            <g
              v-for="(label, index) in [
                copy.sampleData,
                copy.statistic,
                'Population',
                'Confidence Interval',
                copy.decision,
              ]"
              :key="label"
              class="flow-node is-active"
              :transform="`translate(260 ${70 + index * 88})`"
            >
              <circle r="24"></circle>
              <text y="5">{{ label }}</text>
              <path v-if="index < 4" d="M0 34 V60 M-7 53 L0 61 L7 53" class="flow-arrow"></path>
            </g>
          </svg>
        </div>
        <aside class="insight-panel intro-copy">
          <span class="panel-kicker">{{ copy.sceneNames[8] }}</span>
          <h2>{{ copy.futureBridge }}</h2>
          <a class="primary-link" href="/tools/validation-ci-calculator/">{{ copy.calculator }}</a>
          <a class="quiet-link" href="/#learn">{{ copy.backToLearn }}</a>
        </aside>
      </template>
    </section>

    <nav class="scene-nav" aria-label="CI Explorer scene navigation">
      <button
        type="button"
        class="quiet-button"
        :disabled="activeSceneIndex === 0"
        @click="goToAdjacentScene(-1)"
      >
        {{ copy.previous }}
      </button>
      <span>{{ sceneProgress }}</span>
      <button
        type="button"
        class="quiet-button"
        :disabled="activeSceneIndex === sceneIds.length - 1"
        @click="goToAdjacentScene(1)"
      >
        {{ copy.next }}
      </button>
    </nav>
  </main>
</template>

<style scoped>
.ci-explorer {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page);
  --ink: var(--bc-text-primary);
  --muted: var(--bc-text-secondary);
  --line: var(--bc-border-default);
  --soft-line: var(--bc-border-subtle);
  --panel: var(--bc-bg-surface);
  --panel-soft: var(--bc-bg-surface-elevated);
  --field-bg: var(--bc-bg-input);
  --selected-bg: var(--bc-bg-selected);
  --accent: var(--bc-accent);
  --accent-soft: var(--bc-accent-soft);
  --accent-border: var(--bc-accent-border);
  --focus-ring: var(--bc-focus-ring);
  --card-shadow: var(--bc-shadow-card);
  --danger: var(--bc-danger);
  --success: #2f7d52;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: 100svh;
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 10px) 0 22px;
  color: var(--ink);
}

.primary-link,
.quiet-link {
  display: inline-flex;
  align-items: center;
  color: var(--ink);
  text-decoration: none;
}

.segmented-control,
.scene-tabs {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.segmented-control button,
.scene-tabs button,
.quiet-button {
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 0.66rem;
  font-weight: 600;
  white-space: nowrap;
}

.segmented-control button,
.scene-tabs button {
  padding: 0 9px;
}

.scene-tabs button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.scene-tabs button span {
  display: inline-grid;
  width: 17px;
  height: 17px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.58rem;
  opacity: 0.78;
}

.segmented-control button.is-active,
.scene-tabs button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
}

.quiet-button {
  padding: 0 10px;
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-weight: 500;
}

.primary-button,
.primary-link {
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--accent);
  border-radius: 7px;
  background: var(--accent);
  color: var(--bc-text-inverse);
  font-size: 0.72rem;
  font-weight: 600;
}

.quiet-link {
  color: var(--accent);
  font-size: 0.72rem;
}

.explorer-header {
  padding: 4px 0 5px;
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  line-height: 1;
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.is-header-morphed h1 {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}

.scene-sticky {
  position: sticky;
  top: var(--topbar-sticky-height);
  z-index: 30;
  margin: 0 calc(var(--bc-container-inline, 48px) / -2);
  padding: 6px calc(var(--bc-container-inline, 48px) / 2);
  overflow-x: auto;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  border-top: 1px solid var(--soft-line);
  border-bottom: 1px solid var(--soft-line);
  backdrop-filter: blur(14px);
}

.scene-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(330px, 0.42fr);
  gap: 12px;
  align-items: stretch;
  margin-top: 12px;
}

.visual-panel,
.insight-panel {
  min-width: 0;
  min-height: 500px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
}

.visual-panel {
  padding: 12px;
}

.insight-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 14px;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  min-height: 38px;
}

.panel-title-row span,
.panel-kicker,
.svg-label,
.stat-grid dt,
.slider-panel label span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.panel-title-row strong {
  display: block;
  margin-top: 4px;
  font-size: 0.76rem;
  font-weight: 600;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.flow-svg,
.sample-svg,
.population-svg,
.triptych-svg,
.ci-svg,
.width-svg,
.compare-svg,
.decision-svg {
  display: block;
  width: 100%;
  height: calc(100% - 44px);
  min-height: 410px;
}

.flow-svg {
  height: 100%;
}

.intro-copy h2,
.insight-panel h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
}

.intro-copy p,
.insight-panel p {
  margin: 0;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.52;
}

.flow-node {
  outline: none;
  cursor: pointer;
}

.flow-node circle {
  fill: var(--panel-soft);
  stroke: var(--soft-line);
  transition:
    fill 220ms ease,
    stroke 220ms ease;
}

.flow-node text {
  fill: var(--ink);
  font-size: 0.72rem;
  font-weight: 600;
  text-anchor: middle;
}

.flow-node.is-active circle {
  fill: var(--accent-soft);
  stroke: var(--accent-border);
}

.flow-arrow {
  fill: none;
  stroke: var(--soft-line);
  stroke-width: 1.2;
}

.plot-bg {
  fill: var(--panel-soft);
  stroke: var(--soft-line);
}

.axis-line,
.limit-line {
  stroke: var(--soft-line);
  stroke-width: 1.2;
}

.mean-line,
.truth-line,
.interval-line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.4;
  transition:
    x1 260ms ease,
    x2 260ms ease,
    y1 260ms ease,
    y2 260ms ease;
}

.truth-line {
  stroke: var(--ink);
  stroke-dasharray: 4 4;
  opacity: 0.52;
}

.truth-line.is-soft {
  opacity: 0.3;
}

.interval-line {
  stroke-width: 6;
  stroke-linecap: round;
}

.draggable-point {
  cursor: grab;
  outline: none;
  transition: transform 180ms ease;
}

.draggable-point.is-dragging {
  cursor: grabbing;
}

.draggable-point circle,
.sample-dot {
  fill: var(--accent);
  stroke: var(--bc-bg-surface-solid);
  stroke-width: 1.4;
}

.draggable-point text,
.svg-note {
  fill: var(--muted);
  font-size: 0.7rem;
  text-anchor: middle;
}

.point-stem {
  stroke: var(--accent-border);
  stroke-width: 1;
}

.stat-grid {
  display: grid;
  gap: 8px;
  margin: 0;
}

.stat-grid div {
  display: grid;
  gap: 5px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--soft-line);
}

.stat-grid dt,
.stat-grid dd {
  margin: 0;
}

.stat-grid dd {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.tooltip-term {
  text-decoration: underline;
  text-decoration-color: var(--accent-border);
  text-underline-offset: 3px;
}

.population-dot {
  fill: var(--muted);
  opacity: 0.26;
  transition:
    opacity 240ms ease,
    fill 240ms ease,
    r 240ms ease;
}

.population-dot.is-sampled {
  fill: var(--accent);
  opacity: 0.88;
}

.is-hidden {
  opacity: 0;
}

.mean-dot {
  fill: var(--accent);
  opacity: 0.72;
  transition: opacity 180ms ease;
}

.ci-run line {
  stroke-width: 1.6;
  stroke-linecap: round;
  transition: stroke 220ms ease;
}

.ci-run circle {
  transition: fill 220ms ease;
}

.level-control,
.size-control,
.factor-control,
.mode-control {
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
}

.slider-panel label {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 10px;
  align-items: center;
}

.slider-panel output {
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.74rem;
}

.slider-panel input {
  grid-column: 1 / -1;
  width: 100%;
  accent-color: var(--accent);
}

.slider-panel label.is-muted {
  opacity: 0.42;
}

.distribution-curve {
  fill: none;
  stroke: var(--accent-border);
  stroke-width: 2;
}

.acceptance-band {
  fill: var(--accent-soft);
  stroke: none;
}

.logic-flow text {
  fill: var(--ink);
  font-size: 0.7rem;
}

.logic-flow path {
  fill: none;
  stroke: var(--soft-line);
  stroke-width: 1.2;
}

.decision-pass {
  color: var(--success);
}

.decision-borderline {
  color: var(--accent);
}

.decision-fail {
  color: var(--danger);
}

.scene-nav {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 10px;
  color: var(--muted);
  font-size: 0.72rem;
}

@media (max-width: 1199px) {
  .scene-shell {
    grid-template-columns: 1fr;
  }

  .visual-panel,
  .insight-panel {
    min-height: 0;
  }

  .insight-panel {
    order: 2;
  }
}

@media (max-width: 767px) {
  .ci-explorer {
    width: min(100% - 24px, 1280px);
    padding-top: calc(var(--topbar-sticky-height) + 8px);
  }

  h1 {
    font-size: 1.45rem;
  }

  .scene-sticky {
    margin-inline: -12px;
    padding-inline: 12px;
  }

  .scene-tabs button {
    padding: 0 7px;
    font-size: 0.62rem;
  }

  .scene-shell {
    gap: 10px;
    margin-top: 10px;
  }

  .visual-panel,
  .insight-panel {
    padding: 10px;
    border-radius: 8px;
  }

  .panel-title-row {
    display: grid;
  }

  .button-row {
    justify-content: flex-start;
  }

  .flow-svg,
  .sample-svg,
  .population-svg,
  .triptych-svg,
  .ci-svg,
  .width-svg,
  .compare-svg,
  .decision-svg {
    min-height: 300px;
  }

  .scene-nav {
    justify-content: space-between;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
