<script setup>
import { scaleLinear } from "d3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MobileStepController from "../components/anova/MobileStepController.vue";
import AdvancedApplications from "../components/ci/AdvancedApplications.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import {
  confidenceInterval,
  createSeededRandom,
  cv,
  generateTeachingSample,
  mean,
  sampleStandardDeviation,
} from "../lib/ci/statistics.ts";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();

const specificationLower = 97.5;
const specificationUpper = 102.5;
const sections = ["intuition", "applications", "questions"];
const intuitionStepIds = ["knownTruth", "unknownTruth", "decision", "intervalEstimate"];

const pageRoot = ref(null);
const contentRoot = ref(null);
const sectionPanel = ref(null);
const isHeaderMorphed = ref(false);
const activeSection = ref(readInitialSection());
const intuitionStep = ref(0);
const populationMean = ref(100);
const targetBias = ref(4);
const spread = ref(1);
const seed = ref(41);
const confidenceLevel = ref(0.95);
const highlightedSample = ref(null);
const isDesktopViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
const statisticsOpen = ref(isDesktopViewport());

let scrollFrame = null;

const copyByLanguage = {
  en: {
    title: "CI Explorer",
    home: "Back to home",
    languageLabel: "Language",
    sectionLabel: "CI Explorer sections",
    sections: {
      intuition: "Intuition",
      applications: "Applications",
      questions: "Questions",
    },
    introEyebrow: "Confidence intervals from the first question",
    introTitle: "Why a point estimate is not enough.",
    introBody:
      "Start with the true value, hide it, then make a quality decision from only six observations.",
    steps: [
      {
        title: "When the true value is known",
        subtitle: "We can evaluate accuracy and precision separately.",
        note: "Bias reflects accuracy. Deviation around the sample mean reflects precision.",
      },
      {
        title: "When the true value is unknown",
        subtitle:
          "We can still observe precision, but accuracy can no longer be evaluated directly.",
        note: "I can see how consistent the results are, but how can I know whether they are close to the true value?",
      },
      {
        title: "Facing a decision",
        subtitle:
          "The specification applies to the population parameter, but we only have a limited sample.",
        note: "A point estimate inside the specification is still only one observed value.",
      },
      {
        title: "Estimate an interval",
        subtitle: "Turn uncertainty into a range, then use confidence to support the decision.",
        note: "A confidence interval estimates where the population mean may lie.",
      },
    ],
    previous: "Previous",
    next: "Next",
    stepLabel: "Step",
    modeLabel: "Mode",
    precisionMode: "Fixed accuracy, adjust precision",
    accuracyMode: "Fixed precision, adjust accuracy",
    spread: "Sample SD",
    bias: "Bias",
    regenerate: "Randomize data",
    viewStats: "View current statistics",
    hideStats: "Hide current statistics",
    viewCalculation: "View interval calculation",
    hideCalculation: "Hide interval calculation",
    populationMean: "Population mean μ",
    populationUnknown: "Population mean?",
    unknownParameter: "Unknown population parameter",
    sampleMean: "Sample mean x̄",
    sample: "Sample",
    sampleValue: "Sample value",
    precisionEnvelope: "Precision envelope",
    biasLabel: "Bias",
    biasReflects: "Reflects accuracy",
    deviationReflects: "Deviation reflects precision",
    biasAccuracyLabel: "Bias (Accuracy)",
    deviationPrecisionLabel: "Deviation (Precision)",
    unknownBias: "Bias = ?",
    unknownBiasReason: "The population parameter is unknown.",
    decisionPromptTitle: "Facing a decision",
    decisionPromptLines: [
      "We need to decide whether the population mean meets the acceptable specification,",
      "not only whether the sample mean looks acceptable.",
    ],
    detailExplanation: "Detailed explanation",
    n: "n",
    sampleSd: "Sample SD",
    rsd: "RSD",
    notApplicable: "Not applicable",
    unknown: "Unknown",
    decisionQuestion: "Do you think the result meets the specification?",
    answers: ["Meets", "Does not meet", "Insufficient information"],
    decisionReveal:
      "A sample mean inside the specification does not prove that the population parameter is inside it. The sample mean is a point estimate, so we also need uncertainty.",
    decisionBridge: [
      "The sample mean can fall inside the acceptable range without proving that the population mean meets the specification. We do not know how large the bias from the population mean may be.",
      "When the population mean is unknown and the sample mean is uncertain, one point estimate is not enough for a confident decision.",
      "Unless...",
      "We quantify confidence.",
      "If the decision is based on an interval rather than a single value, and we state our confidence that this interval contains the population mean, then we have information that can support a decision.",
    ],
    desktopDecisionBridge: [
      "One acceptable sample mean does not prove the population mean is acceptable; a repeat sample may differ.",
      "A single observed value is not enough for a decision.",
      "We quantify confidence by using the results to infer the likely range for the population mean.",
      "If the 95% confidence interval lies within the specification, we can support an acceptable decision even without knowing the population mean.",
    ],
    estimateInterval: "Estimate interval",
    needRange: "We need to estimate the range in which the population parameter may lie.",
    specificationRange: "Acceptable specification range",
    specificationLowerLabel: "Acceptable lower limit",
    specificationUpperLabel: "Acceptable upper limit",
    ciLabel: "Confidence interval",
    ciPrototype:
      "Based on this sample, a two-sided t interval estimates uncertainty in the population mean.",
    decisionClasses: {
      "supports-acceptance":
        "Supports acceptance: the interval lies within the specification range.",
      inconclusive: "Inconclusive: the interval still crosses a specification boundary.",
      "supports-non-acceptance":
        "Supports non-acceptance: the interval lies outside the acceptable range.",
    },
    regulatoryNote:
      "This explains why a point estimate is insufficient; specific applications may require one-sided limits, equivalence tests, tolerance intervals, prediction intervals, or regulatory rules.",
    compareCard: "Spread of observations is not the same as uncertainty of the estimated mean.",
    exploreApplications: "Explore further in Applications",
    formulas: "Formulas and current values",
    observed: "Observed from the sample",
    requiresPopulation: "Requires the population parameter",
    sampleTable: "Sample table",
    id: "ID",
    value: "xᵢ",
    deviation: "Deviation",
    squaredDeviation: "Squared deviation",
    applicationsTitle: "Choose an application",
    applicationsSubtitle:
      "The mean confidence interval is implemented here. Other CI families are held as clear extension points.",
    applicationShell: {
      why: "Why CI is needed",
      data: "Data and parameters",
      visual: "Interactive visualization",
      formula: "Formula and calculation",
      meaning: "Decision meaning",
      tool: "Tool entry",
    },
    applications: [
      { id: "mean", title: "Mean", status: "Ready" },
      { id: "rsd", title: "Precision / RSD", status: "Coming soon" },
      { id: "potency", title: "Relative Potency", status: "Coming soon" },
      { id: "regression", title: "Regression and Prediction", status: "Coming soon" },
      { id: "difference", title: "Difference and Comparison", status: "Coming soon" },
    ],
    meanAppTitle: "Mean confidence interval",
    meanAppWhy:
      "A finite sample gives a mean, but the target is the population mean. The interval expresses uncertainty in that estimate.",
    sampleSize: "Sample size",
    confidenceLevel: "Confidence level",
    confidenceControlLabel: "Confidence level",
    sensitivity: "Width sensitivity",
    sensitivityNote: "CI half-width = t* × s / √n",
    toolEntry: "Use this pattern before moving to validation-specific CI tools.",
    comingSoon:
      "Coming soon. This page will not show a placeholder calculator until the statistical rules are implemented and tested.",
    questionsIntro: [
      "There are only questions here. The answers have not been written yet.",
      "Please think carefully.",
    ],
    questionsList: [
      ["Q01", "With only one measurement result, can a confidence interval still be produced?"],
      ["Q02", "Does a larger sample size always make a confidence interval visibly narrower?"],
      ["Q03", "When should we focus on a two-sided interval, and when on a one-sided upper limit?"],
      [
        "Q04",
        "How can a confidence interval for the mean be calculated when bioassay data are not normally distributed?",
      ],
      [
        "Q05",
        "For a bioassay, how does confidence-interval calculation differ from other methods?",
      ],
      [
        "Q06",
        "If a reportable bioassay result is combined from several results, some fail the quality standard, and the combined reportable result meets it, is the result acceptable?",
      ],
    ],
  },
  zh: {
    title: "探索置信区间",
    home: "返回首页",
    languageLabel: "语言切换",
    sectionLabel: "置信区间探索模块",
    sections: {
      intuition: "直觉",
      applications: "进阶",
      questions: "高阶",
    },
    introEyebrow: "从第一个判断开始理解置信区间",
    introTitle: "为什么点估计还不够。",
    introBody: "先看见真实值，再隐藏真实值，最后只用六个检测结果作出质量判断。",
    steps: [
      {
        title: "当真实值已知时",
        subtitle: "我们可以分别观察检测结果的准确度与精密度。",
        note: "Bias 反映 Accuracy。检测结果相对样本均值的偏离形成整体离散程度，反映 Precision。",
      },
      {
        title: "当真实值未知时",
        subtitle: "我们仍然可以观察精密度，却无法直接判断准确度。",
        note: "我知道这些结果是否稳定，但怎样判断它们是否接近真实值？",
      },
      {
        title: "面对决策",
        subtitle: "质量标准要求我们判断总体参数，但手中只有有限的样本结果。",
        note: "样本均值位于标准范围内，仍然只是一个观察到的点估计。",
      },
      {
        title: "区间估计",
        subtitle: "把不确定性转化为范围，再用信心支持判断。",
        note: "置信区间用于估计总体均值可能位于什么范围。",
      },
    ],
    previous: "上一步",
    next: "下一步",
    stepLabel: "步骤",
    modeLabel: "模式",
    precisionMode: "固定准确度，调节精密度",
    accuracyMode: "固定精密度，调节准确度",
    spread: "样本 SD",
    bias: "Bias",
    regenerate: "随机生成数据",
    viewStats: "查看当前数据",
    hideStats: "收起当前数据",
    viewCalculation: "查看区间计算",
    hideCalculation: "收起区间计算",
    populationMean: "总体均值 μ",
    populationUnknown: "总体均值？",
    unknownParameter: "未知总体参数",
    sampleMean: "样本均值 x̄",
    sample: "样本",
    sampleValue: "检测结果",
    precisionEnvelope: "Precision 包络",
    biasLabel: "Bias",
    biasReflects: "反映 Accuracy",
    deviationReflects: "Deviation 反映 Precision",
    biasAccuracyLabel: "偏倚（准确度）",
    deviationPrecisionLabel: "偏差（精密度）",
    unknownBias: "Bias = ?",
    unknownBiasReason: "缺少总体参数，无法直接计算。",
    decisionPromptTitle: "面对决策",
    decisionPromptLines: [
      "面对决策，我们要判断总体均值是否符合可接受标准，",
      "而不是只看样本均值。",
    ],
    detailExplanation: "详细说明",
    n: "n",
    sampleSd: "Sample SD",
    rsd: "RSD",
    notApplicable: "不适用",
    unknown: "Unknown",
    decisionQuestion: "你认为该结果符合质量标准吗？",
    answers: ["符合", "不符合", "信息不足"],
    decisionReveal:
      "样本均值位于标准范围内，并不等于总体参数一定符合标准。真正需要判断的是总体参数；样本均值只是点估计，还需要表达估计的不确定性。",
    decisionBridge: [
      "某次测得的平均值落在可接受范围内，也不能说明总体均值一定符合标准。",
      "因为总体均值未知，再测一次样本，测得的平均值可能会发生变化。",
      "只看当前这个数，我们还没有足够“信心”进行决策。",
      "除非...",
      "我们能把“信心”量化出来。",
      "我们不只看样本均值，而是用检测结果进一步推测总体均值是多少。",
      "“信心”，其实就是“可能性”。",
      "如果能有一个范围，",
      "如果这个范围能有 95% 的可能性包含总体均值，",
      "如果这个范围处于可接受标准内，",
      "即使我们不知道总体均值是多少，我们仍有“信心”认为总体均值符合可接受标准！",
    ],
    desktopDecisionBridge: [
      "一次样本均值合格，不能证明总体均值合格；复测的均值仍可能不同。",
      "只看当前数值，还不足以作出可靠决策。",
      "需要把“信心”量化：基于检测结果，推测总体均值的可能范围。",
      "若 95% 置信区间完全位于可接受范围内，即使总体均值未知，也有足够依据支持“符合标准”的判断。",
    ],
    estimateInterval: "进行区间估计",
    needRange: "我们需要估计总体参数可能位于什么范围。",
    specificationRange: "可接受质量标准",
    specificationLowerLabel: "可接受标准下限",
    specificationUpperLabel: "可接受标准上限",
    ciLabel: "置信区间",
    ciPrototype: "基于当前样本，双侧 t 区间用于表达总体均值估计的不确定性。",
    decisionClasses: {
      "supports-acceptance": "支持接受：区间整体位于质量标准范围内。",
      inconclusive: "信息不足：区间仍跨越质量标准边界。",
      "supports-non-acceptance": "支持不接受：区间整体位于可接受范围外。",
    },
    regulatoryNote:
      "这里用于解释为什么点估计不足；具体应用可能需要单侧置信限、等效性检验、容忍区间、预测区间或特定法规判定规则。",
    compareCard: "样本观察值的离散，不等于总体均值估计的不确定性。",
    exploreApplications: "在进阶模块中进一步探索",
    formulas: "公式与当前数值",
    observed: "可由样本计算",
    requiresPopulation: "需要总体参数",
    sampleTable: "样本表格",
    id: "ID",
    value: "xᵢ",
    deviation: "Deviation",
    squaredDeviation: "Squared deviation",
    applicationsTitle: "选择一个应用场景",
    applicationsSubtitle: "均值置信区间已完整实现。其他 CI 类型先保留为清晰的扩展框架。",
    applicationShell: {
      why: "为什么需要 CI",
      data: "数据和参数",
      visual: "互动可视化",
      formula: "公式与计算",
      meaning: "结果解释",
      tool: "对应工具入口",
    },
    applications: [
      { id: "mean", title: "均值置信区间", status: "已实现" },
      { id: "rsd", title: "精密度 / RSD 置信区间", status: "即将推出" },
      { id: "potency", title: "相对效价置信区间", status: "即将推出" },
      { id: "regression", title: "回归与预测", status: "即将推出" },
      { id: "difference", title: "差异与比较", status: "即将推出" },
    ],
    meanAppTitle: "均值置信区间",
    meanAppWhy: "有限样本给出样本均值，但目标是总体均值。区间用于表达这个估计的不确定性。",
    sampleSize: "样本量",
    confidenceLevel: "置信水平",
    confidenceControlLabel: "信心水平",
    sensitivity: "区间宽度敏感性",
    sensitivityNote: "CI half-width = t* × s / √n",
    toolEntry: "在进入验证特定 CI 工具前，可以先用这个结构理解计算链。",
    comingSoon: "即将推出。在统计规则完成实现与测试前，这里不会显示伪计算器。",
    questionsIntro: ["这里只有问题，暂时没写答案。", "请仔细思考。"],
    questionsList: [
      ["Q01", "只进行了一次检测，一个检测结果，也可以产生置信区间吗？"],
      ["Q02", "样本量增加后，置信区间一定明显收窄吗？"],
      ["Q03", "什么时候关注双侧区间？什么时候关注单侧上限？"],
      ["Q04", "Bioassay 数据不服从正态分布，怎么计算均值的置信区间？"],
      ["Q05", "对于 Bioassay，结果的置信区间计算和其他方法有什么不同？"],
      [
        "Q06",
        "如果 Bioassay 可报告结果是由多个结果合并计算获得，其中有的结果不满足质量标准，可报告结果满足质量标准，那结果合格吗？",
      ],
    ],
  },
};

const copy = computed(() => copyByLanguage[language.value]);
const activeStepCopy = computed(() => copy.value.steps[intuitionStep.value]);
const mobileIntuitionStepNames = computed(() =>
  language.value === "zh"
    ? ["真值已知", "真值未知", "面对决策", "区间估计"]
    : ["Known truth", "Unknown truth", "Decision", "Interval"],
);
const activeIntuitionStepId = computed(() => intuitionStepIds[intuitionStep.value]);
const mobileIntuitionStepName = computed(() => mobileIntuitionStepNames.value[intuitionStep.value]);
const mobileStepControllerCopy = computed(() => ({
  stepsLabel: language.value === "zh" ? "直觉步骤" : "Intuition steps",
  mobile: {
    previousStep: copy.value.previous,
    nextStep: copy.value.next,
    stepProgressLabel: language.value === "zh" ? "直觉步骤进度" : "Intuition step progress",
  },
}));
const teachingSample = computed(() =>
  generateTeachingSample({
    seed: seed.value,
    populationMean: populationMean.value,
    targetBias: targetBias.value,
    targetSpread: spread.value,
  }),
);
const sampleValues = computed(() => teachingSample.value.values);
const sampleMean = computed(() => mean(sampleValues.value));
const sampleSd = computed(() => sampleStandardDeviation(sampleValues.value));
const sampleRsd = computed(() => cv(sampleValues.value));
const effectiveConfidenceLevel = computed(() => Math.min(confidenceLevel.value, 0.999));
const ci = computed(() => confidenceInterval(sampleValues.value, effectiveConfidenceLevel.value));
const mainStats = computed(() => [
  { label: copy.value.n, value: sampleValues.value.length },
  { label: copy.value.sampleMean, value: formatNumber(sampleMean.value) },
  { label: copy.value.sampleSd, value: formatNumber(sampleSd.value) },
  {
    label: copy.value.rsd,
    value: Number.isFinite(sampleRsd.value)
      ? `${formatNumber(sampleRsd.value)}%`
      : copy.value.notApplicable,
  },
]);

const chartDomain = computed(() => {
  const values = [...sampleValues.value, sampleMean.value];
  if (intuitionStep.value <= 3) values.push(populationMean.value);
  if (intuitionStep.value >= 2) {
    values.push(specificationLower, specificationUpper);
  }
  if (intuitionStep.value === 3) values.push(ci.value.lower, ci.value.upper);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(8, max - min);
  if (intuitionStep.value <= 3) {
    const radius = Math.max(
      8,
      Math.abs(min - populationMean.value),
      Math.abs(max - populationMean.value),
    );
    return [populationMean.value - radius * 1.18, populationMean.value + radius * 1.18];
  }
  return [min - span * 0.16, max + span * 0.16];
});
const xScale = computed(() => scaleLinear().domain(chartDomain.value).range([56, 664]));
const chartTicks = computed(() => xScale.value.ticks(5));
const sampleMarks = computed(() =>
  sampleValues.value.map((value, index) => ({
    id: index + 1,
    value,
    x: xScale.value(value),
    y: 128 + (index % 3) * 15,
  })),
);
const precisionEnvelope = computed(() => {
  const xs = sampleMarks.value.map((mark) => mark.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const visibleWidth = Math.max(40, maxX - minX + 36);
  return {
    x: (minX + maxX) / 2 - visibleWidth / 2,
    width: visibleWidth,
  };
});
const biasMarkerX = computed(
  () => (xScale.value(populationMean.value) + xScale.value(sampleMean.value)) / 2,
);
const deviationMarkerX = computed(() =>
  sampleMean.value >= populationMean.value
    ? Math.min(654, precisionEnvelope.value.x + precisionEnvelope.value.width + 24)
    : Math.max(66, precisionEnvelope.value.x - 24),
);
const axisSummary = computed(() => {
  if (intuitionStep.value === 1) {
    return `${copy.value.sampleMean} ${formatNumber(sampleMean.value)}, ${copy.value.sampleSd} ${formatNumber(sampleSd.value)}. ${copy.value.unknownBias}`;
  }
  if (intuitionStep.value === 3) {
    return `${copy.value.sampleMean} ${formatNumber(sampleMean.value)}, ${formatPercent(confidenceLevel.value)} ${copy.value.ciLabel} [${formatNumber(ci.value.lower)}, ${formatNumber(ci.value.upper)}].`;
  }
  if (intuitionStep.value === 2) {
    return `${copy.value.sampleMean} ${formatNumber(sampleMean.value)}, ${copy.value.sampleSd} ${formatNumber(sampleSd.value)}. ${copy.value.specificationLowerLabel} ${formatNumber(specificationLower)}, ${copy.value.specificationUpperLabel} ${formatNumber(specificationUpper)}.`;
  }
  return `${copy.value.populationMean} ${formatNumber(populationMean.value)}, ${copy.value.sampleMean} ${formatNumber(sampleMean.value)}, ${copy.value.biasLabel} ${formatNumber(sampleMean.value - populationMean.value)}.`;
});
const sampleMeanTarget = computed(() => populationMean.value + targetBias.value);

function readInitialSection() {
  if (typeof window === "undefined") return "intuition";
  const candidate = new URLSearchParams(window.location.search).get("section");
  return sections.includes(candidate) ? candidate : "intuition";
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  const normalized = Math.abs(value) < 1e-10 ? 0 : value;
  return new Intl.NumberFormat(language.value === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(normalized);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function setSection(section, scroll = true) {
  if (!sections.includes(section)) return;
  activeSection.value = section;
  if (scroll) {
    nextTick(() => {
      contentRoot.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function handleSectionKeydown(event, index, tabPrefix = "") {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  let nextIndex = index;
  if (event.key === "ArrowLeft") nextIndex = (index + sections.length - 1) % sections.length;
  if (event.key === "ArrowRight") nextIndex = (index + 1) % sections.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = sections.length - 1;
  const nextSection = sections[nextIndex];
  setSection(nextSection, !tabPrefix);
  const tabId = tabPrefix ? `${tabPrefix}-${nextSection}` : nextSection;
  nextTick(() => {
    pageRoot.value?.querySelector(`[data-section-tab="${tabId}"]`)?.focus();
  });
}

function updateSampleMeanTarget(event) {
  targetBias.value = Number(event.target.value) - populationMean.value;
}

function updateSpread(event) {
  spread.value = Number(event.target.value);
}

function updateConfidence(event) {
  confidenceLevel.value = Number(event.target.value) / 100;
}

function scrollIntuitionToStart() {
  if (typeof window === "undefined") return;
  nextTick(() => {
    contentRoot.value?.scrollIntoView({ behavior: "auto", block: "start" });
  });
}

function goToAdjacentIntuitionStep(direction) {
  intuitionStep.value = Math.min(Math.max(intuitionStep.value + direction, 0), 3);
}

function setIntuitionStepById(stepId) {
  const nextIndex = intuitionStepIds.indexOf(stepId);
  if (nextIndex >= 0) intuitionStep.value = nextIndex;
}

function setLanguage(locale) {
  setLocale(locale);
}

function createInteractionSeed() {
  const cryptoValues =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint32Array(1))[0]
      : 0;
  const timeSeed = Date.now() >>> 0;
  const performanceSeed =
    typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) >>> 0 : 0;
  const randomSeed = Math.floor(Math.random() * 0xffffffff) >>> 0;

  return cryptoValues ^ timeSeed ^ performanceSeed ^ randomSeed ^ seed.value || seed.value + 1;
}

function regenerate() {
  const nextSeed = createInteractionSeed();
  const random = createSeededRandom(nextSeed);
  random();
  random();
  seed.value = nextSeed;
  targetBias.value = Number(((random() - 0.5) * 8).toFixed(2));
  spread.value = Number((random() * 2).toFixed(2));
}

function requestScrollState() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    isHeaderMorphed.value = window.scrollY > 72;
  });
}

watch(activeSection, async (section) => {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    window.history.replaceState({}, "", url);
  }
});

onMounted(() => {
  requestScrollState();
  window.addEventListener("scroll", requestScrollState, { passive: true });
});

onBeforeUnmount(() => {
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", requestScrollState);
});

watch(intuitionStep, () => {
  if (activeSection.value === "intuition") scrollIntuitionToStart();
});
</script>

<template>
  <main
    ref="pageRoot"
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

    <div class="ci-mobile-sticky-header" :aria-label="copy.sectionLabel">
      <MobileToolHeader
        :aria-label="copy.sectionLabel"
        :selector-label="copy.sectionLabel"
        :options="[]"
        :selected-value="activeSection"
        :language="language"
        :language-label="copy.languageLabel"
        :home-label="copy.home"
        :show-selector="false"
        @set-language="setLanguage"
      />

      <div class="mobile-section-tabs" :aria-label="copy.sectionLabel">
        <button
          v-for="(section, index) in sections"
          :key="`mobile-${section}`"
          type="button"
          :data-section-tab="`mobile-${section}`"
          :aria-pressed="activeSection === section"
          :class="{ 'is-active': activeSection === section }"
          @click="setSection(section, false)"
          @keydown="handleSectionKeydown($event, index, 'mobile')"
        >
          {{ copy.sections[section] }}
        </button>
      </div>

      <MobileStepController
        v-if="activeSection === 'intuition'"
        :copy="mobileStepControllerCopy"
        :steps="intuitionStepIds"
        :active-step="activeIntuitionStepId"
        :active-step-index="intuitionStep"
        :step-name="mobileIntuitionStepName"
        @previous="goToAdjacentIntuitionStep(-1)"
        @next="goToAdjacentIntuitionStep(1)"
        @set-step="setIntuitionStepById"
      />
    </div>

    <section class="section-handle" :aria-label="copy.sectionLabel">
      <div class="desktop-navigation-group desktop-section-group">
        <span>{{ copy.sectionLabel }}</span>
        <div class="section-tabs" role="tablist">
          <button
            v-for="(section, index) in sections"
            :key="section"
            type="button"
            role="tab"
            :data-section-tab="section"
            :aria-selected="activeSection === section"
            :tabindex="activeSection === section ? 0 : -1"
            :class="{ 'is-active': activeSection === section }"
            @click="setSection(section)"
            @keydown="handleSectionKeydown($event, index)"
          >
            {{ copy.sections[section] }}
          </button>
        </div>
      </div>

      <div
        v-if="activeSection === 'intuition'"
        class="desktop-navigation-group desktop-intuition-group"
      >
        <span>{{ mobileStepControllerCopy.stepsLabel }}</span>
        <div class="desktop-step-tabs" role="tablist">
          <button
            v-for="(step, index) in intuitionStepIds"
            :key="step"
            type="button"
            role="tab"
            :aria-selected="intuitionStep === index"
            :tabindex="intuitionStep === index ? 0 : -1"
            :class="{ 'is-active': intuitionStep === index }"
            @click="intuitionStep = index"
          >
            <span class="step-index">{{ index + 1 }}</span>
            {{ mobileIntuitionStepNames[index] }}
          </button>
        </div>
      </div>
    </section>

    <section ref="contentRoot" class="content-anchor" aria-live="polite">
      <div ref="sectionPanel" class="section-panel">
        <template v-if="activeSection === 'intuition'">
          <section class="intuition-shell">
            <div class="step-heading">
              <span>{{ copy.stepLabel }} {{ intuitionStep + 1 }} / 4</span>
              <h2>{{ activeStepCopy.title }}</h2>
              <p>{{ activeStepCopy.subtitle }}</p>
            </div>

            <div class="workspace-grid" :class="{ 'has-decision-step': intuitionStep === 2 }">
              <article class="visual-workspace">
                <svg
                  class="sampling-svg"
                  viewBox="0 0 720 300"
                  role="img"
                  :aria-labelledby="`axis-title-${intuitionStep}`"
                  :aria-describedby="`axis-desc-${intuitionStep}`"
                >
                  <title :id="`axis-title-${intuitionStep}`">{{ activeStepCopy.title }}</title>
                  <desc :id="`axis-desc-${intuitionStep}`">{{ axisSummary }}</desc>

                  <line x1="56" y1="300" x2="664" y2="300" class="axis-line"></line>
                  <g v-for="tick in chartTicks" :key="tick" class="axis-tick">
                    <line :x1="xScale(tick)" y1="294" :x2="xScale(tick)" y2="306"></line>
                    <text :x="xScale(tick)" y="328">{{ formatNumber(tick, 0) }}</text>
                  </g>

                  <template v-if="intuitionStep >= 2">
                    <line
                      :x1="xScale(specificationLower)"
                      y1="62"
                      :x2="xScale(specificationLower)"
                      y2="300"
                      class="spec-limit"
                    ></line>
                    <line
                      :x1="xScale(specificationUpper)"
                      y1="62"
                      :x2="xScale(specificationUpper)"
                      y2="300"
                      class="spec-limit"
                    ></line>
                    <text
                      :x="xScale(specificationLower) - 10"
                      y="42"
                      class="spec-label"
                      text-anchor="end"
                    >
                      {{ copy.specificationLowerLabel }}
                    </text>
                    <text
                      :x="xScale(specificationUpper) + 10"
                      y="42"
                      class="spec-label"
                      text-anchor="start"
                    >
                      {{ copy.specificationUpperLabel }}
                    </text>
                  </template>

                  <template v-if="intuitionStep <= 3">
                    <line
                      :x1="xScale(populationMean)"
                      y1="62"
                      :x2="xScale(populationMean)"
                      y2="300"
                      class="population-line"
                      :class="{ 'is-unknown': intuitionStep > 0 }"
                    ></line>
                    <text
                      :x="xScale(populationMean)"
                      y="42"
                      class="population-label"
                      text-anchor="middle"
                    >
                      {{ intuitionStep > 0 ? `${copy.populationMean} (?)` : copy.populationMean }}
                    </text>
                  </template>

                  <rect
                    class="precision-envelope"
                    :x="precisionEnvelope.x"
                    y="104"
                    :width="precisionEnvelope.width"
                    height="78"
                    rx="24"
                  ></rect>

                  <g
                    v-for="mark in sampleMarks"
                    :key="mark.id"
                    class="sample-mark"
                    :class="{ 'is-highlighted': highlightedSample === mark.id }"
                    :transform="`translate(${mark.x} ${mark.y})`"
                    tabindex="0"
                    role="button"
                    :aria-label="`${copy.sample} ${mark.id}: ${formatNumber(mark.value)}`"
                    @focus="highlightedSample = mark.id"
                    @blur="highlightedSample = null"
                    @pointerenter="highlightedSample = mark.id"
                    @pointerleave="highlightedSample = null"
                  >
                    <line y1="-26" y2="48"></line>
                    <circle r="6.5"></circle>
                    <text y="-34">{{ formatNumber(mark.value, 1) }}</text>
                  </g>

                  <line
                    :x1="xScale(sampleMean)"
                    y1="104"
                    :x2="xScale(sampleMean)"
                    y2="300"
                    class="sample-mean-line"
                  ></line>
                  <text
                    :x="xScale(sampleMean)"
                    y="90"
                    class="sample-mean-label"
                    text-anchor="middle"
                  >
                    {{ copy.sampleMean }}
                  </text>

                  <template v-if="intuitionStep <= 3">
                    <g class="bias-annotation">
                      <line
                        :x1="xScale(populationMean)"
                        y1="246"
                        :x2="xScale(sampleMean)"
                        y2="246"
                        class="bias-connector"
                      ></line>
                      <text
                        :x="biasMarkerX"
                        y="270"
                        class="chart-index-marker"
                        text-anchor="middle"
                      >
                        ①
                      </text>
                      <text
                        :x="deviationMarkerX"
                        y="148"
                        class="chart-index-marker"
                        text-anchor="middle"
                      >
                        ②
                      </text>
                    </g>
                  </template>

                  <template v-if="intuitionStep === 3">
                    <line
                      :x1="xScale(ci.lower)"
                      y1="218"
                      :x2="xScale(ci.upper)"
                      y2="218"
                      class="ci-line"
                    ></line>
                    <line
                      :x1="xScale(ci.lower)"
                      y1="206"
                      :x2="xScale(ci.lower)"
                      y2="230"
                      class="ci-cap"
                    ></line>
                    <line
                      :x1="xScale(ci.upper)"
                      y1="206"
                      :x2="xScale(ci.upper)"
                      y2="230"
                      class="ci-cap"
                    ></line>
                  </template>
                </svg>
                <div v-if="intuitionStep <= 3" class="chart-legend">
                  <span>① {{ copy.biasAccuracyLabel }}</span>
                  <span>② {{ copy.deviationPrecisionLabel }}</span>
                </div>
                <p class="chart-summary">{{ activeStepCopy.note }}</p>
              </article>

              <aside class="control-panel">
                <div class="mobile-simulation-head">
                  <strong>{{ language === "zh" ? "模拟参数" : "Simulation parameters" }}</strong>
                  <button type="button" class="quiet-button" @click="regenerate">
                    {{ copy.regenerate }}
                  </button>
                </div>

                <div class="mobile-slider-stack">
                  <label class="range-control">
                    <span>
                      <span>{{ copy.sampleMean }}</span>
                      <strong>{{ formatNumber(sampleMeanTarget) }}</strong>
                    </span>
                    <input
                      type="range"
                      :min="populationMean - 10"
                      :max="populationMean + 10"
                      step="0.25"
                      :value="sampleMeanTarget"
                      @input="updateSampleMeanTarget"
                    />
                  </label>

                  <label class="range-control">
                    <span>
                      <span>{{ copy.spread }}</span>
                      <strong>{{ formatNumber(spread) }}</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      :value="spread"
                      @input="updateSpread"
                    />
                  </label>
                </div>

                <div v-if="intuitionStep === 1" class="unknown-card">
                  <strong>{{ copy.unknownBias }}</strong>
                  <span>{{ copy.unknownBiasReason }}</span>
                </div>

                <div v-if="intuitionStep === 2" class="unknown-card decision-prompt-card">
                  <span v-for="line in copy.decisionPromptLines" :key="line">{{ line }}</span>
                </div>

                <section
                  v-if="intuitionStep === 2"
                  class="decision-flow decision-bridge desktop-decision-bridge"
                >
                  <p v-for="paragraph in copy.desktopDecisionBridge" :key="paragraph">{{ paragraph }}</p>
                </section>

                <label v-if="intuitionStep === 3" class="confidence-control interval-confidence">
                  <span>
                    <span>{{ copy.confidenceControlLabel }}</span>
                    <strong>{{ formatPercent(confidenceLevel) }}</strong>
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    :value="Math.round(confidenceLevel * 100)"
                    @input="updateConfidence"
                  />
                </label>
              </aside>

              <details
                v-if="intuitionStep !== 2"
                class="mobile-stat-card mobile-stat-disclosure"
                :aria-label="copy.viewStats"
                :open="statisticsOpen"
                @toggle="statisticsOpen = $event.currentTarget.open"
              >
                <summary>{{ copy.viewStats }}</summary>
                <dl class="mini-stats">
                  <div v-for="item in mainStats" :key="`mobile-${item.label}`">
                    <dt>{{ item.label }}</dt>
                    <dd>{{ item.value }}</dd>
                  </div>
                  <div v-if="intuitionStep === 0">
                    <dt>{{ copy.populationMean }}</dt>
                    <dd>{{ formatNumber(populationMean) }}</dd>
                  </div>
                  <div v-else>
                    <dt>μ</dt>
                    <dd>{{ copy.unknown }}</dd>
                  </div>
                  <div>
                    <dt>{{ copy.biasLabel }}</dt>
                    <dd>
                      {{
                        intuitionStep === 0
                          ? formatNumber(sampleMean - populationMean)
                          : copy.unknown
                      }}
                    </dd>
                  </div>
                </dl>
              </details>
            </div>

            <details v-if="intuitionStep === 2" class="decision-flow decision-bridge mobile-decision-bridge">
              <summary>{{ copy.detailExplanation }}</summary>
              <p v-for="paragraph in copy.decisionBridge" :key="paragraph">{{ paragraph }}</p>
              <button type="button" class="primary-button tail-cta" @click="intuitionStep = 3">
                {{ copy.estimateInterval }}
              </button>
            </details>

            <nav class="step-nav" aria-label="Intuition pages">
              <button type="button" :disabled="intuitionStep === 0" @click="intuitionStep -= 1">
                {{ copy.previous }}
              </button>
              <div class="step-dots" aria-hidden="true">
                <span
                  v-for="index in 4"
                  :key="index"
                  :class="{ 'is-active': intuitionStep === index - 1 }"
                ></span>
              </div>
              <button type="button" :disabled="intuitionStep === 3" @click="intuitionStep += 1">
                {{ copy.next }}
              </button>
            </nav>
          </section>
        </template>

        <template v-else-if="activeSection === 'applications'">
          <AdvancedApplications :language="language" />
        </template>

        <template v-else>
          <section class="questions-shell">
            <article class="question-intro">
              <p>{{ copy.questionsIntro[0] }}<br />{{ copy.questionsIntro[1] }}</p>
            </article>
            <div class="question-grid">
              <article
                v-for="question in copy.questionsList"
                :key="question[0]"
                class="question-card"
              >
                <div class="question-row">
                  <span>{{ question[0] }}</span>
                  <strong>{{ question[1] }}</strong>
                </div>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ci-explorer {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page);
  --ink: var(--bc-text-primary);
  --muted: var(--bc-text-secondary);
  --soft-line: var(--bc-border-subtle);
  --accent: var(--bc-accent);
  --accent-border: var(--bc-accent-border);
  --focus-ring: var(--bc-focus-ring);
  --panel: var(--bc-bg-surface);
  --panel-soft: var(--bc-bg-surface-elevated);
  --selected-bg: var(--bc-bg-selected);
  --card-shadow: var(--bc-shadow-card);
  position: relative;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: 100svh;
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 10px) 0 36px;
  color: var(--ink);
  background: var(--paper);
}

.content-anchor {
  width: 100%;
  margin: 0 auto;
}

.step-heading span,
.section-heading p,
.chart-summary,
.fine-print {
  color: var(--muted);
}

.step-heading span {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 650;
  text-transform: uppercase;
}

.ci-mobile-sticky-header {
  display: none;
}

.section-handle {
  position: sticky;
  top: var(--topbar-sticky-height, 60px);
  z-index: 40;
  display: grid;
  grid-template-columns: minmax(230px, 0.72fr) minmax(0, 1.4fr);
  gap: 12px;
  align-items: start;
  padding: 6px 0;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
  border-top: 1px solid var(--soft-line);
  border-bottom: 1px solid var(--soft-line);
  backdrop-filter: blur(14px);
}

.desktop-navigation-group {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.desktop-navigation-group > span {
  display: flex;
  align-items: center;
  min-height: 17px;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
}

.section-tabs,
.desktop-step-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  width: 100%;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

.desktop-intuition-group .desktop-step-tabs {
  background: var(--panel);
}

.section-tabs button,
.desktop-step-tabs button {
  min-width: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}

.section-tabs button {
  flex: 1;
  min-height: 30px;
  padding: 0 7px;
  line-height: 1;
}

.desktop-step-tabs button {
  display: inline-flex;
  flex: 1 1 0;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 8px;
  line-height: 1;
}

.desktop-step-tabs button.is-active {
  background: var(--accent);
  color: var(--bc-text-inverse);
}

.step-index {
  display: inline-grid;
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.58rem;
  line-height: 1;
  opacity: 0.78;
}

.mobile-section-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: min(720px, calc(100% - var(--bc-container-inline, 32px)));
  min-height: 42px;
  padding: 4px;
  margin: 0 auto;
  border: 1px solid var(--soft-line);
  border-radius: 12px;
  background: var(--panel-soft);
}

button,
select,
input {
  font: inherit;
}

button,
select {
  min-height: 40px;
}

.section-tabs button,
.mobile-section-tabs button,
.desktop-step-tabs button,
.confidence-control button,
.answer-row button,
.step-nav button,
.application-picker button,
.quiet-button,
.primary-button {
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
  cursor: pointer;
}

.section-tabs button.is-active,
.mobile-section-tabs button.is-active,
.desktop-step-tabs button.is-active,
.confidence-control button.is-active,
.answer-row button.is-active,
.application-picker button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
  border-color: var(--accent-border);
}

.section-tabs button.is-active,
.mobile-section-tabs button.is-active {
  background: var(--bc-bg-selected, rgba(255, 255, 255, 0.78));
  color: var(--ink);
  border-color: transparent;
}

.section-tabs button:focus-visible,
.mobile-section-tabs button:focus-visible,
.desktop-step-tabs button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(79, 86, 97, 0.12);
}

.section-tabs button {
  min-height: 30px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  font-size: 0.68rem;
  line-height: 1;
}

.desktop-step-tabs button {
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  font-size: 0.68rem;
  line-height: 1;
}

.desktop-step-tabs button.is-active {
  border-color: transparent;
  background: var(--accent);
  color: var(--bc-text-inverse);
}

button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--focus-ring);
}

.content-anchor {
  scroll-margin-top: calc(var(--topbar-sticky-height, 60px) + 76px);
  padding-top: 20px;
}

.step-heading,
.section-heading,
.application-title {
  display: grid;
  gap: 8px;
  max-width: 760px;
  margin-bottom: 18px;
}

.step-heading h2,
.section-heading h2,
.application-title h3 {
  margin: 0;
  font-size: clamp(1.35rem, 2.2vw, 2.1rem);
  line-height: 1.08;
}

.step-heading p,
.section-heading p,
.application-title p {
  margin: 0;
  color: var(--muted);
  line-height: 1.58;
}

.workspace-grid,
.mean-app-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.visual-workspace,
.control-panel,
.decision-flow,
.application-content,
.coming-soon-card,
.desktop-application-details section,
.question-intro,
.question-card {
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
}

.visual-workspace {
  min-width: 0;
  padding: 12px;
}

.sampling-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.axis-line,
.axis-tick line {
  stroke: var(--soft-line);
}

.axis-tick text,
.spec-label,
.spec-range-label,
.population-label,
.sample-mean-label,
.ci-endpoint,
.ci-label,
.sample-mark text,
.unknown-parameter text {
  fill: var(--muted);
  font-family: "IBM Plex Mono", monospace;
  font-size: 14px;
}

.spec-band {
  fill: rgba(36, 86, 179, 0.07);
  stroke: rgba(36, 86, 179, 0.18);
}

.spec-limit {
  stroke: var(--accent);
  stroke-dasharray: 5 7;
  stroke-width: 1.4;
  opacity: 0.72;
}

.population-line {
  stroke: var(--accent);
  stroke-width: 3;
}

.population-line.is-unknown {
  stroke: var(--muted);
  stroke-width: 1.2;
  stroke-dasharray: 5 7;
  stroke-linecap: round;
  opacity: 0.42;
}

.unknown-parameter line {
  stroke: var(--muted);
  stroke-dasharray: 4 6;
  opacity: 0.66;
}

.precision-envelope {
  fill: transparent;
  stroke: rgba(36, 86, 179, 0.36);
  stroke-width: 2;
  stroke-dasharray: 2 5;
}

.sample-mark {
  outline: none;
}

.sample-mark line,
.sample-rug line {
  stroke: var(--accent);
  stroke-width: 1.4;
  opacity: 0.64;
}

.sample-mark circle {
  fill: var(--paper);
  stroke: var(--accent);
  stroke-width: 2;
}

.sample-mark.is-highlighted circle,
.sample-mark:focus-visible circle {
  fill: var(--accent);
}

.sample-mean-line {
  stroke: var(--ink);
  stroke-width: 1.8;
}

.bias-connector {
  stroke: var(--accent);
  stroke-dasharray: 5 5;
  stroke-linecap: round;
  stroke-width: 1.6;
}

.chart-index-marker {
  fill: var(--accent);
  font-family: "IBM Plex Mono", monospace;
  font-size: 15px;
  font-weight: 700;
}

.ci-line,
.ci-cap {
  stroke: var(--ink);
  stroke-width: 3;
}

.chart-summary {
  margin: 10px 2px 0;
  line-height: 1.58;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  justify-content: center;
  margin: 10px 2px 0;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 650;
  line-height: 1.35;
}

.control-panel {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: 14px;
}

.mobile-simulation-head,
.mobile-slider-stack,
.mobile-stat-card {
  display: none;
}

.range-control {
  display: grid;
  gap: 10px;
  color: var(--muted);
  font-size: 0.8rem;
}

.range-control strong {
  color: var(--ink);
  font-family: "IBM Plex Mono", monospace;
}

.range-control input {
  width: 100%;
  min-height: 44px;
  accent-color: var(--accent);
}

.quiet-button,
.primary-button {
  border-color: var(--accent-border);
  color: var(--accent);
  padding: 0 14px;
}

.primary-button {
  justify-self: start;
  background: var(--accent);
  color: white;
}

.unknown-card,
.contrast-card,
.decision-class {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  color: var(--muted);
  line-height: 1.5;
}

.unknown-card strong,
.decision-class {
  color: var(--ink);
}

.confidence-control {
  display: grid;
  gap: 8px;
}

.confidence-control > span {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
}

.confidence-control > span strong {
  color: var(--accent);
  font-family: "IBM Plex Mono", monospace;
  font-weight: 700;
}

.interval-confidence input {
  width: 100%;
  min-height: 32px;
  margin: 0;
  accent-color: var(--accent);
}

.confidence-control div,
.answer-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.confidence-control button,
.answer-row button {
  border-color: var(--soft-line);
}

.mobile-stat-disclosure summary,
.decision-flow summary {
  list-style: none;
}

.mobile-stat-disclosure summary::-webkit-details-marker,
.decision-flow summary::-webkit-details-marker {
  display: none;
}

.mobile-stat-disclosure summary::before,
.decision-flow summary::before {
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid currentColor;
  content: "";
}

.mobile-stat-disclosure[open] > summary::before,
.decision-flow[open] > summary::before {
  transform: rotate(90deg);
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.mini-stats div {
  min-width: 0;
  padding: 8px;
  border-radius: 7px;
  background: var(--panel-soft);
}

.mini-stats dt {
  color: var(--muted);
  font-size: 0.68rem;
}

.mini-stats dd {
  margin: 3px 0 0;
  font-family: "IBM Plex Mono", monospace;
}

.decision-flow {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
}

.desktop-decision-bridge {
  display: none;
}

.decision-flow h3 {
  margin: 0;
  font-size: 1rem;
}

.decision-flow p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.decision-bridge p {
  font-size: 0.68rem;
  line-height: 1.55;
}

.tail-cta {
  width: 100%;
}

.step-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}

.step-nav button {
  border-color: var(--soft-line);
}

.step-nav button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.step-dots {
  display: flex;
  gap: 7px;
}

.step-dots span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--soft-line);
}

.step-dots span.is-active {
  background: var(--accent);
}

.application-layout {
  display: grid;
  gap: 14px;
}

.application-picker {
  display: grid;
  gap: 8px;
}

.application-picker select {
  width: 100%;
  padding: 0 12px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink);
}

.application-picker button {
  display: none;
}

.application-content,
.coming-soon-card {
  padding: 14px;
}

.desktop-application-details {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.desktop-application-details section {
  padding: 12px;
}

.desktop-application-details h4,
.desktop-application-details p {
  margin: 0 0 8px;
}

.desktop-application-details p {
  color: var(--muted);
  line-height: 1.55;
}

.sensitivity-svg {
  width: 100%;
  height: auto;
}

.sensitivity-svg polyline {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
}

.sensitivity-svg circle {
  fill: var(--paper);
  stroke: var(--accent);
  stroke-width: 2;
}

.coming-soon-card {
  display: grid;
  gap: 12px;
}

.coming-soon-card span {
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.coming-soon-card h3,
.coming-soon-card p,
.coming-soon-card ol {
  margin: 0;
}

.coming-soon-card p,
.coming-soon-card ol {
  color: var(--muted);
  line-height: 1.65;
}

.question-grid {
  display: grid;
  gap: 10px;
}

.questions-shell {
  display: grid;
  gap: 10px;
}

.question-intro {
  padding: 14px;
}

.question-intro p {
  margin: 0;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 650;
  line-height: 1.5;
}

.question-card {
  overflow: hidden;
}

.question-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  width: 100%;
  min-height: 56px;
  padding: 12px;
  color: var(--ink);
  text-align: left;
}

.question-row span {
  color: var(--accent);
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.75rem;
}

.question-row strong {
  font-size: 0.9rem;
  line-height: 1.45;
}

.cue-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0 12px 12px 48px;
}

.cue-list small,
.cue-list span {
  color: var(--muted);
  font-size: 0.72rem;
}

.cue-list span {
  padding: 4px 7px;
  border: 1px solid var(--soft-line);
  border-radius: 999px;
}

@media (min-width: 768px) {
  .step-heading,
  .step-nav {
    display: none;
  }

  .workspace-grid {
    grid-template-areas:
      "visual"
      "controls"
      "statistics";
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .visual-workspace {
    grid-area: visual;
    aspect-ratio: 16 / 9;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: center;
    align-content: center;
    overflow: hidden;
    padding: 10px 8px 14px;
  }

  .visual-workspace .sampling-svg {
    min-height: 0;
    transform: scale(0.96);
    transform-origin: center;
  }

  /* Keep the mobile composition while drawing marks at the desktop scale used
     by the advanced t-distribution chart. */
  .visual-workspace .axis-line,
  .visual-workspace .axis-tick line {
    stroke-width: 1px;
  }

  .visual-workspace .axis-tick text,
  .visual-workspace .spec-label,
  .visual-workspace .spec-range-label,
  .visual-workspace .population-label,
  .visual-workspace .sample-mean-label,
  .visual-workspace .ci-endpoint,
  .visual-workspace .ci-label,
  .visual-workspace .unknown-parameter text {
    font-size: 9px;
  }

  .visual-workspace .spec-limit {
    stroke-width: 1.2px;
  }

  .visual-workspace .population-line {
    stroke-width: 2px;
  }

  .visual-workspace .population-line.is-unknown,
  .visual-workspace .unknown-parameter line {
    stroke-width: 1px;
  }

  .visual-workspace .precision-envelope {
    stroke-width: 1.5px;
    stroke-dasharray: 2px 4px;
  }

  .chart-summary {
    display: none;
  }

  .sample-mark line,
  .sample-mark text {
    display: none;
  }

  .sample-mark circle {
    r: 4.2px;
    stroke-width: 1.5px;
  }

  .bias-connector {
    stroke-width: 1.3px;
    stroke-dasharray: 5 6;
  }

  .chart-index-marker {
    font-size: 10.5px;
  }

  .visual-workspace .sample-mean-line {
    stroke-width: 1.4px;
  }

  .visual-workspace .ci-line,
  .visual-workspace .ci-cap {
    stroke-width: 2px;
  }

  .chart-legend {
    gap: 6px 10px;
    margin-top: 8px;
    font-size: 0.62rem;
    line-height: 1.25;
  }

  .control-panel {
    grid-area: controls;
    gap: 12px;
    padding: 14px;
  }

  .control-panel .unknown-card,
  .control-panel .decision-prompt-card {
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .control-panel .unknown-card strong {
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .control-panel .unknown-card span {
    font-size: inherit;
  }

  .desktop-decision-bridge {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 12px;
  }

  .desktop-decision-bridge p {
    font-size: 0.72rem;
    line-height: 1.5;
  }

  .desktop-decision-bridge .tail-cta {
    justify-self: start;
    min-height: 32px;
    font-size: 0.68rem;
  }

  .mobile-decision-bridge {
    display: none;
  }

  .mobile-simulation-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .mobile-simulation-head strong {
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mobile-simulation-head .quiet-button {
    min-height: 32px;
    border-color: var(--accent-border);
    border-radius: 8px;
    background: transparent;
    color: var(--accent);
    font-size: 0.68rem;
  }

  .mobile-slider-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 18px;
  }

  .mobile-slider-stack .range-control {
    min-width: 0;
    gap: 6px;
  }

  .mobile-slider-stack .range-control > span {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-slider-stack .range-control strong,
  .interval-confidence > span strong {
    color: var(--accent);
    font-size: 0.72rem;
  }

  .mobile-slider-stack .range-control input,
  .interval-confidence input {
    min-height: 28px;
    margin: 0;
    accent-color: var(--accent);
  }

  .interval-confidence {
    gap: 6px;
  }

  .interval-confidence > span {
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mobile-stat-card {
    grid-area: statistics;
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--soft-line);
    border-radius: 8px;
    background: var(--panel);
    box-shadow: var(--card-shadow);
  }

  .mobile-stat-disclosure summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 1.25rem;
    color: var(--muted);
    font-size: 0.74rem;
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-stat-disclosure[open] {
    gap: 10px;
  }

  .tail-cta {
    width: auto;
  }

  .question-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .ci-explorer {
    padding-top: calc(var(--topbar-sticky-height) + 10px);
  }

  .workspace-grid {
    grid-template-areas:
      "visual controls"
      "visual statistics";
    grid-template-columns: minmax(0, 1.36fr) minmax(340px, 0.64fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 16px;
  }

  .workspace-grid > * {
    min-width: 0;
  }

  .visual-workspace {
    grid-area: visual;
    /* Use the known-truth canvas as the fixed desktop reference. The right
       column may vary by step, but it must not resize the teaching graphic. */
    align-self: start;
    width: 100%;
  }

  .control-panel {
    grid-area: controls;
    align-self: stretch;
    min-height: 0;
  }

  .workspace-grid.has-decision-step {
    grid-template-areas:
      "visual controls"
      "visual .";
  }

  .workspace-grid.has-decision-step .control-panel {
    align-self: start;
  }

  .workspace-grid.has-decision-step .desktop-decision-bridge {
    align-content: start;
  }

  .mobile-stat-card .mini-stats {
    grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
    grid-auto-rows: minmax(0, 1fr);
  }

  .mobile-stat-card .mini-stats div {
    padding: 9px 10px;
  }

  .application-layout {
    grid-template-columns: 260px minmax(0, 1fr);
    align-items: start;
  }

  .application-picker select {
    display: none;
  }

  .application-picker button {
    display: grid;
    gap: 4px;
    min-height: 56px;
    padding: 9px 10px;
    border-color: var(--soft-line);
    text-align: left;
  }

  .application-picker small {
    color: var(--muted);
  }

  .mean-app-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .desktop-application-details {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .content-anchor {
    width: min(1240px, calc(100% - var(--bc-container-inline, 48px)));
  }

  .question-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .ci-explorer {
    --mobile-safe-top: max(env(safe-area-inset-top), 12px);
    --mobile-gap-md: 7px;
    --mobile-control-height: 36px;
    --mobile-switch-height: 36px;
    --mobile-header-control-height: var(--mobile-control-height);
    --mobile-header-control-radius: 11px;
    --mobile-header-control-padding-x: 10px;
    --mobile-header-control-font-size: 0.72rem;
    --mobile-header-control-font-weight: 650;
    --mobile-glass-blur: 16px;
    --mobile-glass-bg: var(--bc-bg-glass);
    --mobile-glass-border: var(--bc-border-subtle);
    --mobile-glass-shadow: var(--bc-shadow-card);
    --mobile-glass-radius: 14px;
    --mobile-header-control-border: var(--mobile-glass-border);
    --mobile-header-control-bg: var(--mobile-glass-bg);
    --mobile-header-control-shadow: var(--mobile-glass-shadow);
    --mobile-sticky-gap: 8px;
    --mobile-card-gap: var(--mobile-sticky-gap, 8px);
    --topbar-sticky-height: 0px;
    width: min(100% - 32px, 1180px);
    margin: 0 auto;
    padding-top: 0;
    padding-bottom: calc(42px + env(safe-area-inset-bottom, 0px));
  }

  .tool-topbar,
  .section-handle {
    display: none;
  }

  .ci-mobile-sticky-header {
    position: sticky;
    top: 0;
    z-index: 70;
    display: grid;
    gap: var(--mobile-sticky-gap, 8px);
    width: 100%;
    margin-bottom: 0;
    padding-top: var(--mobile-safe-top);
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
  }

  .content-anchor {
    width: 100%;
    padding-top: var(--mobile-card-gap, 8px);
    scroll-margin-top: 204px;
  }

  .step-heading,
  .step-nav {
    display: none;
  }

  .visual-workspace,
  .control-panel,
  .decision-flow,
  .application-content,
  .coming-soon-card,
  .desktop-application-details section,
  .question-intro,
  .question-card,
  .mobile-stat-card,
  .unknown-card,
  .contrast-card,
  .decision-class {
    border-radius: var(--mobile-glass-radius, 14px);
  }

  .question-intro p,
  .question-row strong,
  .question-row span {
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }

  .visual-workspace,
  .control-panel,
  .mobile-stat-card,
  .decision-flow {
    border: 1px solid var(--mobile-card-border, var(--bc-border-subtle));
    background: var(--mobile-card-bg, var(--bc-bg-glass));
    box-shadow: var(--mobile-shadow, var(--bc-shadow-card));
  }

  .decision-flow {
    gap: 0;
    margin-top: var(--mobile-card-gap, 8px);
    padding: 12px;
  }

  .decision-flow[open] {
    gap: 10px;
    padding: 18px;
  }

  .decision-bridge p {
    line-height: 1.45;
  }

  .decision-bridge .tail-cta {
    margin-top: 0.85rem;
  }

  .decision-flow summary {
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
    min-height: 1.25rem;
    color: var(--ink, #171717);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
  }

  .decision-flow summary::-webkit-details-marker {
    display: none;
  }

  .visual-workspace {
    aspect-ratio: 4 / 3;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: center;
    align-content: center;
    overflow: hidden;
    padding: 10px 8px 14px;
  }

  .visual-workspace .sampling-svg {
    min-height: 0;
    transform: translateY(-8px) scale(1.34);
    transform-origin: center;
  }

  .chart-summary {
    display: none;
  }

  .sample-mark line {
    display: none;
  }

  .sample-mark text {
    display: none;
  }

  .sample-mark circle {
    r: 4.8px;
    stroke-width: 2.2px;
  }

  .precision-envelope {
    stroke-width: 2.2;
    stroke-dasharray: 3 5;
  }

  .bias-connector {
    stroke-width: 2;
    stroke-dasharray: 5 6;
  }

  .chart-index-marker {
    font-size: 16px;
  }

  .chart-legend {
    gap: 6px 10px;
    margin-top: 24px;
    font-size: 0.58rem;
    line-height: 1.25;
  }

  .control-panel {
    gap: var(--mobile-card-gap, 8px);
    padding: 10px;
  }

  .unknown-card strong {
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .unknown-card span {
    font-size: 0.68rem;
    line-height: 1.45;
  }

  .mobile-simulation-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }

  .mobile-simulation-head strong {
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .mobile-simulation-head .quiet-button {
    min-height: 30px;
    border-color: rgba(49, 95, 186, 0.28);
    border-radius: 10px;
    background: transparent;
    color: var(--bc-accent-strong, #315fba);
    font-size: 0.66rem;
  }

  .mobile-slider-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 14px;
  }

  .mobile-slider-stack .range-control {
    min-width: 0;
    gap: 4px;
  }

  .mobile-slider-stack .range-control > span {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted, #6e7278);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-slider-stack .range-control strong {
    color: var(--bc-accent-strong, #315fba);
    font-size: 0.66rem;
  }

  .mobile-slider-stack .range-control input {
    min-height: var(--mobile-slider-height, 24px);
    margin: 0;
    accent-color: var(--bc-accent-strong, #315fba);
  }

  .interval-confidence {
    gap: 4px;
  }

  .interval-confidence > span {
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .interval-confidence > span strong {
    color: var(--bc-accent-strong, #315fba);
    font-size: 0.68rem;
  }

  .interval-confidence input {
    min-height: var(--mobile-slider-height, 24px);
    accent-color: var(--bc-accent-strong, #315fba);
  }

  .mobile-stat-card {
    display: grid;
    gap: 10px;
    padding: 12px;
  }

  .mobile-stat-card h3 {
    margin: 0;
    color: var(--muted, #6e7278);
    font-size: 0.72rem;
  }

  .mobile-stat-disclosure {
    gap: 0;
  }

  .mobile-stat-disclosure[open] {
    gap: 10px;
  }

  .mobile-stat-disclosure summary {
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
    min-height: 1.25rem;
    color: var(--muted, #6e7278);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-stat-disclosure summary::-webkit-details-marker {
    display: none;
  }

  .workspace-grid,
  .mean-app-grid,
  .application-layout,
  .desktop-application-details {
    gap: var(--mobile-card-gap, 8px);
  }

  .mobile-stat-card .mini-stats dt {
    font-size: 0.58rem;
  }

  .mobile-stat-card .mini-stats dd {
    font-size: 0.72rem;
  }

  .mobile-section-tabs {
    width: 100%;
    min-height: var(--mobile-switch-height, 36px);
    padding: 0;
    border: 1px solid var(--mobile-glass-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-glass-radius, 14px);
    background: var(--mobile-glass-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-glass-shadow, 0 8px 20px rgba(23, 23, 23, 0.026));
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-section-tabs button {
    appearance: none;
    -webkit-tap-highlight-color: transparent;
    min-width: 0;
    min-height: var(--mobile-switch-height, 36px);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
    white-space: nowrap;
  }

  .mobile-section-tabs button:hover,
  .mobile-section-tabs button:active {
    background: transparent;
    color: var(--muted, #6e7278);
  }

  .mobile-section-tabs button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px rgba(79, 86, 97, 0.12);
  }

  .mobile-section-tabs button.is-active,
  .mobile-section-tabs button.is-active:hover,
  .mobile-section-tabs button.is-active:active,
  .mobile-section-tabs button[aria-pressed="true"] {
    border: 0;
    outline: none;
    background: var(--bc-bg-selected, rgba(255, 255, 255, 0.78));
    color: var(--ink, #171717);
    box-shadow: var(--bc-shadow-card, 0 8px 18px rgba(23, 23, 23, 0.032));
  }

  .mobile-section-tabs button.is-active {
    border-color: transparent;
  }

  .mobile-section-tabs button.is-active:focus-visible {
    box-shadow:
      var(--bc-shadow-card, 0 8px 18px rgba(23, 23, 23, 0.032)),
      0 0 0 4px rgba(79, 86, 97, 0.12);
  }

  .axis-tick text:nth-of-type(n + 4) {
    display: none;
  }

  .confidence-control div,
  .answer-row {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
  }
}
</style>
