<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BcTooltip from "../common/BcTooltip.vue";
import MathFormula from "../common/MathFormula.vue";
import {
  chiSquarePdf,
  meanConfidenceIntervalFromSummary,
  standardDeviationConfidenceIntervalFromSummary,
  studentTPdf,
} from "../../lib/ci/statistics.ts";
import {
  calculateExactRsdCI,
  calculateMckayRsdCI,
  calculateNaiveRsdCI,
  calculateObservedRsd,
  calculateVangelRsdCI,
  getRsdRecommendation,
  validateRsdInput,
} from "../../lib/ci/rsd-confidence.ts";
import { loadNoncentralTCdf } from "../../lib/ci/noncentral-t.ts";

const props = defineProps({ language: { type: String, required: true } });

const DEFAULTS = Object.freeze({ n: "6", mean: "100", sd: "10", confidence: 0.95 });
const scenario = ref("");
const basisOpen = ref(false);
const formulaOpen = ref(false);
const inputs = ref({ ...DEFAULTS });
const variabilityInputs = ref({ n: DEFAULTS.n, sd: DEFAULTS.sd, confidence: DEFAULTS.confidence });
const rsdInputs = ref({ ...DEFAULTS });
const exactRsdResult = ref(null);
const exactRsdLoading = ref(false);
const methodOpen = ref({ naive: false, mckay: false, vangel: false, exact: false });
const recommendationOpen = ref(false);
const referencesOpen = ref(false);
const touched = ref({ n: false, mean: false, sd: false });
const variabilityTouched = ref({ n: false, sd: false });
const rsdTouched = ref({ n: false, mean: false, sd: false });
const mobileHeaderOffset = ref(null);
let mobileHeaderObserver = null;
let exactRsdRequest = 0;

const text = {
  zh: {
    heading: "选择一个应用场景",
    intro: "从一个具体问题出发，观察样本信息如何逐步变成区间估计。",
    select: "请选择应用场景",
    scenarios: { mean: "均值的置信区间", variability: "SD 的置信区间", rsd: "RSD 的置信区间", ratio: "比值的置信区间" },
    soon: "即将推出",
    soonBody: "该场景的统计规则尚未实现。可先探索其他场景。",
    basisTitle: "分布依据：t 分布",
    basisBody:
      "很多独立的小影响共同作用时，测量结果常常近似围绕真实均值呈正态波动。但实际计算中，我们通常不知道总体的真实波动，只能用样本标准差来估计。由于这个估计本身也不确定，因此需要使用尾部更宽的 t 分布。样本量越大，这部分额外不确定性越小，t 分布也越接近正态分布。",
    chartTitle: "t 分布临界值",
    chartDesc: "当前 t 分布、中央覆盖区域、两侧尾部与临界值的图形说明。",
    confidence: "置信水平",
    confidenceNote: "均值的置信区间通常使用双侧区间，因此未覆盖的概率平均分配到两侧。",
    sampleTitle: "样本信息",
    n: "样本量 n（决定 t 分布）",
    mean: "样本均值",
    sd: "样本标准差",
    nError: "请输入 2–10000 之间的整数。",
    meanError: "请输入有效的有限数值。",
    sdError: "请输入大于或等于 0 的有限数值。",
    zeroSd: "当前输入表示所有观测值完全相同。",
    formulaTitle: "置信区间是怎样得到的？",
    formulaSummary: "查看四步计算",
    df: "自由度",
    se: "标准误",
    me: "误差范围",
    ci: "置信区间",
    resultTitle: "均值的置信区间",
    confidenceIntervalLabel: "置信区间",
    lower: "下限",
    center: "样本均值",
    upper: "上限",
    width: "区间宽度",
    interpretation: (c, l, u) => `根据当前样本数据，均值的 ${c} 置信区间为 ${l}–${u}。`,
    coverage: (c) =>
      `${c} 描述的是这套区间估计方法的长期覆盖率，而不是说真实均值有 ${c} 的概率位于这个已经计算出的固定区间内。`,
    tips: {
      mean: "改变均值：区间整体移动，宽度不变。",
      sd: "增大标准差会使标准误增加，区间变宽。",
      n: "增大样本量会降低标准误，区间通常变窄。",
      confidence: "提高置信水平会增大临界值，使区间变宽。",
    },
    variability: {
      basisTitle: "分布依据：卡方分布",
      basisBody:
        "当测量结果近似正态分布时，样本方差经过标准化后服从卡方分布。样本量决定自由度 df = n − 1；自由度较低时分布右偏更明显。双侧区间使用两个卡方临界值来表达总体标准差的不确定性。",
      sampleTitle: "样本信息",
      n: "样本量 n（决定卡方分布）",
      chartTitle: "卡方分布临界值",
      chartDesc: "当前卡方分布、中央覆盖区域、两侧尾部与临界值的图形说明。",
      resultLabel: "SD 的置信区间",
      confidenceSuffix: "置信区间",
      formulaTitle: "SD 的置信区间是怎样得到的？",
      formulaSummary: "查看三步计算",
      coverage: (c) =>
        `${c} 描述的是这套 SD 区间估计方法的长期覆盖率。该方法假设原始数据近似正态；仅凭汇总统计量无法检验这一假设。`,
    },
  },
  en: {
    heading: "Choose an application",
    intro:
      "Start with a practical question and follow how sample information becomes an interval estimate.",
    select: "Select an application",
    scenarios: {
      mean: "CI for a mean",
      variability: "CI for SD",
      rsd: "CI for RSD",
      ratio: "CI for a ratio",
    },
    soon: "Coming soon",
    soonBody:
      "The statistical rules for this application are not implemented yet. Explore other scenarios first.",
    basisTitle: "Distribution basis: t-distribution",
    basisBody:
      "Measurements often fluctuate approximately normally around a true mean when many small independent effects act together. In practice, population variability is usually unknown, so we estimate it with the sample standard deviation. That estimate is uncertain too, which gives the t-distribution its wider tails. As the sample grows, this extra uncertainty shrinks and the t-distribution approaches the normal distribution.",
    chartTitle: "t-distribution critical value",
    chartDesc:
      "t-distribution showing the central coverage, both tails, and current critical values.",
    confidence: "Confidence level",
    confidenceNote:
      "A two-sided interval splits the uncovered probability equally between both tails.",
    sampleTitle: "Sample information",
    n: "Sample size n (sets the t-distribution)",
    mean: "Sample mean",
    sd: "Sample standard deviation",
    nError: "Enter an integer from 2 to 10000.",
    meanError: "Enter a valid finite number.",
    sdError: "Enter a finite number greater than or equal to 0.",
    zeroSd: "The current input represents observations that are all identical.",
    formulaTitle: "How is the interval calculated?",
    formulaSummary: "View the four calculation steps",
    df: "Degrees of freedom",
    se: "Standard error",
    me: "Margin of error",
    ci: "Confidence interval",
    resultTitle: "Confidence interval for the mean",
    confidenceIntervalLabel: "confidence interval",
    lower: "Lower",
    center: "Sample mean",
    upper: "Upper",
    width: "Interval width",
    interpretation: (c, l, u) =>
      `Based on the current sample, the ${c} confidence interval for the mean is ${l}–${u}.`,
    coverage: (c) =>
      `The ${c} confidence level describes the long-run coverage of the interval procedure. It does not mean that the fixed interval already calculated has a ${c} probability of containing the true mean.`,
    tips: {
      mean: "Changing the mean moves the whole interval without changing its width.",
      sd: "A larger standard deviation increases the standard error and widens the interval.",
      n: "A larger sample reduces the standard error and usually narrows the interval.",
      confidence: "Higher confidence increases the critical value and widens the interval.",
    },
    variability: {
      basisTitle: "Distribution basis: chi-square distribution",
      basisBody:
        "When measurements are approximately normally distributed, the standardized sample variance follows a chi-square distribution. Sample size sets df = n − 1; lower degrees of freedom make the distribution more right-skewed. A two-sided interval uses two chi-square critical values to express uncertainty in the population standard deviation.",
      sampleTitle: "Sample information",
      n: "Sample size n (sets the chi-square distribution)",
      chartTitle: "Chi-square critical value",
      chartDesc:
        "Chi-square distribution showing central coverage, both tails, and current critical values.",
      resultLabel: "Confidence Interval for SD",
      confidenceSuffix: "confidence interval",
      formulaTitle: "How is the SD interval calculated?",
      formulaSummary: "View the three calculation steps",
      coverage: (c) =>
        `The ${c} level describes the long-run coverage of this SD interval procedure. It assumes approximately normal raw data; normality cannot be assessed from summary statistics alone.`,
    },
  },
};

const rsdText = {
  zh: {
    basisTitle: "分布与方法依据：卡方分布与非中心 t 分布",
    basisBody: "RSD 是标准差与均值的比值，因此它的置信区间不能只考虑标准差的变化。朴素区间、McKay 和 Vangel 方法主要借助卡方分布构造近似区间；精确方法进一步利用非中心 t 分布，同时处理均值和标准差的不确定性。",
    sampleTitle: "样本信息", n: "样本量 n", mean: "样本均值", sd: "样本标准差", nError: "请输入 2–10000 之间的整数。", meanError: "请输入有效的有限数值。", sdError: "请输入大于或等于 0 的有限数值。", zeroSd: "当前输入表示所有观测值完全相同。",
    chartTitle: "卡方分布临界值", chartNote: "Naive、McKay 和 Vangel 方法使用这些卡方临界值；精确方法还需使用非中心 t 分布。",
    resultTitle: "RSD 的置信区间", observed: "Observed RSD", unavailable: "无法计算", confidence: "置信区间",
    recommendation: "推荐等级", recommendedMethod: "推荐方法为：", assumption: "本推荐假设原始数据近似正态，且 RSD 适用于该测量尺度。仅凭汇总统计量无法检验正态性。",
    meanInvalid: "当前样本均值不大于 0，常规 RSD 缺少稳定且直观的解释，因此暂不计算置信区间。",
    meanRisk: "当前均值相对于标准差较小，RSD 对均值变化非常敏感。请先确认 RSD 是否适合作为该数据的变异指标。",
    references: "方法来源与参考文献",
    methods: { naive: "方法 1：朴素区间（Naive interval）", mckay: "方法 2：McKay 近似（McKay approximation）", vangel: "方法 3：Vangel 修正（Modified McKay interval）", exact: "方法 4：精确方法（Exact method）" },
    labels: { naive: "教学对照，不推荐作为默认结果", mckay: "经典解析近似", vangel: "推荐的解析近似", exact: "正态假设下的主要数值方法" },
    exactSteps: {
      sampleCv: "1 · 样本变异系数",
      dfAndObservedT: "2 · 自由度与观测 t 值",
      invert: "3 · 反演非中心参数",
      invertDescription: "固定观测 t 值后，分别寻找使非中心 t 分布左尾累计概率等于两个尾部目标概率的非中心参数。",
      convert: "4 · 转换为 RSD 置信区间",
      inverse: "CV 与非中心参数 δ 是倒数关系，因此转换为 CV 区间时，上下限需要反向对应。",
      converged: "非中心参数的数值求解已收敛。",
      failed: "非中心参数的数值求解未收敛，无法生成精确置信区间。",
      observedRsd: "Observed RSD",
    },
    recommendationText: {
      "not-recommended": ["不推荐计算常规 RSD 置信区间", "当前样本均值不大于 0，常规 RSD 缺少稳定解释。建议重新评估变异指标，而不是依赖 RSD 置信区间。"],
      "mean-unstable": ["精确方法", "当前均值相对于标准差较小，RSD 对分母变化非常敏感。应先判断 RSD 是否仍适合作为变异指标；如仍需计算，建议使用精确方法。"],
      exact: ["精确方法（Exact method）", "当前 Observed RSD 较高，McKay 和 Vangel 近似可能偏离其常见适用范围。建议优先使用精确方法，并检查数据分布及接近零值的风险。"],
      "exact-vangel": ["精确方法", "当前样本量较小。建议以精确方法作为主要结果，并使用 Vangel 修正作为解析近似对照。"],
      vangel: ["Vangel 修正", "当前样本量和 Observed RSD 位于常见解析近似的适用范围内。推荐使用 Vangel 修正；如需更严格结果，可同时核对精确方法。"],
      "tiny-sample": ["精确方法", "当前样本量极小，任何区间都可能非常宽。请将结果视为有限信息下的数值描述；如仍需计算，建议使用精确方法。"],
    },
  },
  en: {
    basisTitle: "Distribution Basis: Chi-square and Noncentral t", basisBody: "RSD is the ratio of the standard deviation to the mean, so its confidence interval cannot consider only variation in the standard deviation. Naive, McKay, and Vangel methods mainly use chi-square approximations; the exact method additionally uses the noncentral t distribution to account for uncertainty in both the mean and standard deviation.",
    sampleTitle: "Sample information", n: "Sample size n", mean: "Sample mean", sd: "Sample standard deviation", nError: "Enter an integer from 2 to 10000.", meanError: "Enter a valid finite number.", sdError: "Enter a finite number greater than or equal to 0.", zeroSd: "The current input represents observations that are all identical.", chartTitle: "Chi-square Critical Values", chartNote: "Naive, McKay, and Vangel methods use these chi-square critical values. The exact method additionally uses the noncentral t distribution.",
    resultTitle: "Confidence Interval for RSD", observed: "Observed RSD", unavailable: "Unavailable", confidence: "confidence interval", recommendation: "Recommendation Level", recommendedMethod: "Recommended method: ", assumption: "This recommendation assumes approximately normal raw data and a measurement scale for which RSD is meaningful. Normality cannot be assessed from summary statistics alone.",
    meanInvalid: "The sample mean is not greater than zero. A conventional RSD is not stable or readily interpretable under this condition, so confidence intervals are not calculated.", meanRisk: "The mean is small relative to the standard deviation, so RSD is highly sensitive to changes in the mean. First confirm that RSD is appropriate for this data.", references: "Methods and References",
    methods: { naive: "Method 1: Naive Interval", mckay: "Method 2: McKay Approximation", vangel: "Method 3: Vangel Modification", exact: "Method 4: Exact Method" },
    labels: { naive: "Educational comparison; not recommended as the default result", mckay: "Classical analytical approximation", vangel: "Recommended analytical approximation", exact: "Primary numerical method under normality" },
    exactSteps: {
      sampleCv: "1 · Sample coefficient of variation",
      dfAndObservedT: "2 · Degrees of freedom and observed t",
      invert: "3 · Invert the noncentrality parameters",
      invertDescription: "With the observed t fixed, solve for the noncentrality parameters corresponding to the two tail probabilities.",
      convert: "4 · Convert to the RSD confidence interval",
      inverse: "CV is inversely related to δ, so the noncentrality bounds are reversed when converted to the CV interval.",
      converged: "The numerical solution for the noncentrality parameters converged.",
      failed: "The numerical solution did not converge, so the exact confidence interval could not be generated.",
      observedRsd: "Observed RSD",
    },
    recommendationText: {
      "not-recommended": ["Conventional RSD confidence intervals are not recommended", "The sample mean is not greater than zero, so conventional RSD lacks a stable interpretation. Reassess the variability metric rather than relying on an RSD confidence interval."],
      "mean-unstable": ["Exact method", "The mean is small relative to the standard deviation, so RSD is highly sensitive to its denominator. First decide whether RSD remains an appropriate variability measure; if calculation is still needed, use the exact method."],
      exact: ["Exact method", "Observed RSD is high, so McKay and Vangel approximations may depart from their common operating range. Prefer the exact method and check distributional and near-zero risks."],
      "exact-vangel": ["Exact method", "The sample is small. Use the exact method as the primary result and Vangel as an analytical approximation for comparison."],
      vangel: ["Vangel modification", "Sample size and Observed RSD lie in a common range for analytical approximations. Use Vangel; use the exact method when a stricter check is needed."],
      "tiny-sample": ["Exact method", "The sample is extremely small, so any interval may be very wide. Treat results as a numerical description under limited information; if calculation is still needed, use the exact method."],
    },
  },
};

const copy = computed(() => text[props.language]);
const rsdCopy = computed(() => rsdText[props.language]);
const scenarioStyle = computed(() =>
  mobileHeaderOffset.value === null
    ? undefined
    : { "--application-sticky-top": `${mobileHeaderOffset.value}px` },
);
const parsed = computed(() => ({
  n: Number(inputs.value.n),
  mean: Number(inputs.value.mean),
  sd: Number(inputs.value.sd),
}));
const errors = computed(() => ({
  n: !Number.isInteger(parsed.value.n) || parsed.value.n < 2 || parsed.value.n > 10000,
  mean: inputs.value.mean.trim() === "" || !Number.isFinite(parsed.value.mean),
  sd: inputs.value.sd.trim() === "" || !Number.isFinite(parsed.value.sd) || parsed.value.sd < 0,
}));
const valid = computed(() => !errors.value.n && !errors.value.mean && !errors.value.sd);
const result = computed(() =>
  valid.value
    ? meanConfidenceIntervalFromSummary({
        ...parsed.value,
        confidenceLevel: inputs.value.confidence,
      })
    : null,
);
const confidenceLabel = computed(() => `${(inputs.value.confidence * 100).toFixed(1)}%`);
const variabilityParsed = computed(() => ({
  n: Number(variabilityInputs.value.n),
  sd: Number(variabilityInputs.value.sd),
}));
const variabilityErrors = computed(() => ({
  n: variabilityInputs.value.n.trim() === "" || !Number.isInteger(variabilityParsed.value.n) || variabilityParsed.value.n < 2 || variabilityParsed.value.n > 10000,
  sd: variabilityInputs.value.sd.trim() === "" || !Number.isFinite(variabilityParsed.value.sd) || variabilityParsed.value.sd < 0,
}));
const variabilityValid = computed(
  () =>
    Number.isInteger(variabilityParsed.value.n) &&
    variabilityParsed.value.n >= 2 &&
    variabilityParsed.value.n <= 10000 &&
    Number.isFinite(variabilityParsed.value.sd) &&
    variabilityParsed.value.sd >= 0,
);
const variabilityResult = computed(() =>
  variabilityValid.value
    ? standardDeviationConfidenceIntervalFromSummary({
        ...variabilityParsed.value,
        confidenceLevel: variabilityInputs.value.confidence,
      })
    : null,
);
const variabilityConfidenceLabel = computed(
  () => `${(variabilityInputs.value.confidence * 100).toFixed(1)}%`,
);
const rsdParsed = computed(() => ({
  n: Number(rsdInputs.value.n), mean: Number(rsdInputs.value.mean), sd: Number(rsdInputs.value.sd), confidenceLevel: rsdInputs.value.confidence,
}));
const rsdValidation = computed(() => validateRsdInput(rsdParsed.value));
const rsdErrors = computed(() => ({
  n: rsdInputs.value.n.trim() === "" || !Number.isInteger(rsdParsed.value.n) || rsdParsed.value.n < 2 || rsdParsed.value.n > 10000,
  mean: rsdInputs.value.mean.trim() === "" || !Number.isFinite(rsdParsed.value.mean),
  sd: rsdInputs.value.sd.trim() === "" || !Number.isFinite(rsdParsed.value.sd) || rsdParsed.value.sd < 0,
}));
const observedRsd = computed(() => calculateObservedRsd(rsdParsed.value.mean, rsdParsed.value.sd));
const rsdMethods = computed(() => ({
  naive: calculateNaiveRsdCI(rsdParsed.value), mckay: calculateMckayRsdCI(rsdParsed.value), vangel: calculateVangelRsdCI(rsdParsed.value), exact: exactRsdResult.value,
}));
const rsdRecommendation = computed(() => getRsdRecommendation(rsdParsed.value));
const rsdConfidenceLabel = computed(() => `${(rsdInputs.value.confidence * 100).toFixed(1)}%`);
const rsdMeanInvalid = computed(() => rsdValidation.value.valid && rsdParsed.value.mean <= 0);
const rsdMeanRisk = computed(() => rsdValidation.value.valid && rsdParsed.value.mean > 0 && rsdParsed.value.mean <= 2 * rsdParsed.value.sd);

async function updateExactRsd() {
  const request = ++exactRsdRequest;
  if (!rsdValidation.value.valid || rsdParsed.value.mean <= 0) {
    exactRsdResult.value = null;
    return;
  }
  exactRsdLoading.value = true;
  try {
    const cdf = await loadNoncentralTCdf();
    if (request === exactRsdRequest) exactRsdResult.value = calculateExactRsdCI(rsdParsed.value, cdf);
  } catch {
    if (request === exactRsdRequest) {
      exactRsdResult.value = {
        method: "exact", status: "unavailable", lower: null, upper: null,
        warnings: ["The noncentral t calculation could not be initialized."], intermediateValues: {},
        degreesOfFreedom: null, sampleCv: null, observedT: null, deltaLower: null, deltaUpper: null,
        cvLower: null, cvUpper: null, lowerTailProbability: null, upperTailProbability: null,
        converged: false,
      };
    }
  } finally {
    if (request === exactRsdRequest) exactRsdLoading.value = false;
  }
}
watch(rsdParsed, updateExactRsd, { immediate: true, deep: true });

const precision = computed(() => {
  if (!result.value) return 2;
  const scale = Math.max(Math.abs(result.value.mean), Math.abs(result.value.marginOfError));
  const width = Math.abs(result.value.upper - result.value.lower);
  if ((scale > 0 && (scale >= 1e7 || scale < 1e-4)) || (width > 0 && width < 1e-4)) return -1;
  if (width === 0) return Math.min(6, Math.max(2, Math.ceil(-Math.log10(Math.max(scale, 1))) + 3));
  return Math.min(6, Math.max(0, Math.ceil(-Math.log10(width)) + 2));
});
function format(value, digits = precision.value) {
  if (!Number.isFinite(value)) return "—";
  if (digits < 0) return value.toExponential(3);
  return new Intl.NumberFormat(props.language === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Math.abs(value) < 1e-14 ? 0 : value);
}
function formatRsd(value) {
  if (!Number.isFinite(value)) return "—";
  const percentage = value * 100;
  const digits = Math.abs(percentage) < 1 && percentage !== 0 ? 2 : 1;
  return `${new Intl.NumberFormat(props.language === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(percentage)}%`;
}
function formatExactValue(value) {
  if (!Number.isFinite(value)) return "—";
  if (value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e5)) {
    return value.toExponential(3);
  }
  return new Intl.NumberFormat(props.language === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}
function formatFormulaValue(value) {
  return Number.isFinite(value) ? formatExactValue(value) : "\\text{—}";
}
function formatMethodInterval(method) {
  if (method?.method === "exact" && exactRsdLoading.value) {
    return props.language === "zh" ? "正在计算…" : "Calculating…";
  }
  if (!method || method.status !== "success" || method.lower === null || method.upper === null) {
    return rsdCopy.value.unavailable;
  }
  return `[${formatRsd(method.lower)}, ${formatRsd(method.upper)}]`;
}

const tChart = computed(() => {
  if (!result.value) return null;
  const width = 700,
    height = 480,
    left = 38,
    right = 18,
    top = 62,
    bottom = 70;
  const limit = Math.min(18, Math.max(4, result.value.criticalValue * 1.3));
  const count = 180;
  const values = Array.from({ length: count + 1 }, (_, i) => {
    const x = -limit + (2 * limit * i) / count;
    return { x, y: studentTPdf(x, result.value.df) };
  });
  const maxY = Math.max(...values.map((d) => d.y)) * 1.08;
  const sx = (x) => left + ((x + limit) / (2 * limit)) * (width - left - right);
  const sy = (y) => height - bottom - (y / maxY) * (height - top - bottom);
  const line = values
    .map((d, i) => `${i ? "L" : "M"}${sx(d.x).toFixed(2)},${sy(d.y).toFixed(2)}`)
    .join(" ");
  const areaFor = (filter) => {
    const points = values.filter(filter);
    if (!points.length) return "";
    return (
      `M${sx(points[0].x)},${height - bottom} ` +
      points.map((d) => `L${sx(d.x).toFixed(2)},${sy(d.y).toFixed(2)}`).join(" ") +
      ` L${sx(points.at(-1).x)},${height - bottom} Z`
    );
  };
  const critical = result.value.criticalValue;
  return {
    width,
    height,
    baseline: height - bottom,
    sx,
    line,
    central: areaFor((d) => Math.abs(d.x) <= critical),
    leftTail: areaFor((d) => d.x <= -critical),
    rightTail: areaFor((d) => d.x >= critical),
    critical,
  };
});

const chiChart = computed(() => {
  const chartResult = variabilityResult.value;
  if (!chartResult) return null;
  const width = 700,
    height = 480,
    left = 38,
    right = 18,
    top = 62,
    bottom = 70;
  const lowerCritical = chartResult.lowerCriticalValue;
  const upperCritical = chartResult.upperCriticalValue;
  const limit = Math.max(
    upperCritical * 1.35,
    chartResult.df + 4 * Math.sqrt(2 * chartResult.df),
    8,
  );
  const values = Array.from({ length: 220 }, (_, index) => {
    const x = (limit * index) / 219;
    return { x, y: chiSquarePdf(x, chartResult.df) };
  });
  const maxY = Math.max(...values.map((point) => point.y)) * 1.12;
  const sx = (x) => left + (x / limit) * (width - left - right);
  const sy = (y) => height - bottom - (y / maxY) * (height - top - bottom);
  const path = values
    .map(
      (point, index) => `${index ? "L" : "M"}${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)}`,
    )
    .join(" ");
  const area = (points) =>
    `M${sx(points[0].x)},${height - bottom} ${points
      .map((point) => `L${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)}`)
      .join(" ")} L${sx(points.at(-1).x)},${height - bottom} Z`;
  const leftTail = values.filter((point) => point.x <= lowerCritical);
  const rightTail = values.filter((point) => point.x >= upperCritical);
  const covered = values.filter((point) => point.x >= lowerCritical && point.x <= upperCritical);
  return {
    baseline: height - bottom,
    sx,
    path,
    lowerCritical,
    upperCritical,
    leftArea: area(leftTail),
    rightArea: area(rightTail),
    coveredArea: area(covered),
  };
});

function markChanged() {
  return undefined;
}
function resetTransientState() {
  basisOpen.value = false;
  formulaOpen.value = false;
  recommendationOpen.value = false;
  referencesOpen.value = false;
  touched.value = { n: false, mean: false, sd: false };
  variabilityTouched.value = { n: false, sd: false };
  rsdTouched.value = { n: false, mean: false, sd: false };
}
watch(scenario, resetTransientState);

function updateMobileHeaderOffset() {
  const header = document.querySelector(".ci-mobile-sticky-header");
  if (!header) return;
  const gap = Number.parseFloat(getComputedStyle(header).getPropertyValue("--mobile-sticky-gap")) || 8;
  // Use layout height rather than viewport position: iOS Safari moves the visual viewport while
  // its browser chrome expands and collapses, but the stacked sticky controls keep this height.
  mobileHeaderOffset.value = Math.round(header.offsetHeight + gap);
}

onMounted(() => {
  updateMobileHeaderOffset();
  const header = document.querySelector(".ci-mobile-sticky-header");
  if (header && typeof ResizeObserver !== "undefined") {
    mobileHeaderObserver = new ResizeObserver(updateMobileHeaderOffset);
    mobileHeaderObserver.observe(header);
  }
  window.addEventListener("resize", updateMobileHeaderOffset);
});

onBeforeUnmount(() => {
  mobileHeaderObserver?.disconnect();
  window.removeEventListener("resize", updateMobileHeaderOffset);
});
</script>

<template>
  <section class="advanced-applications">
    <header class="advanced-heading">
      <h2>{{ copy.heading }}</h2>
      <p>{{ copy.intro }}</p>
    </header>
    <label class="scenario-field" :style="scenarioStyle">
      <span>{{ copy.heading }}</span>
      <select v-model="scenario">
        <option value="" disabled>{{ copy.select }}</option>
        <option v-for="(label, id) in copy.scenarios" :key="id" :value="id">{{ label }}</option>
      </select>
    </label>

    <div v-if="scenario === 'ratio'" class="ci-card soon-card" role="status">
      <span>{{ copy.soon }}</span>
      <h3>{{ copy.scenarios[scenario] }}</h3>
      <p>{{ copy.soonBody }}</p>
    </div>

    <div v-else-if="scenario === 'mean'" class="mean-flow">
      <details
        :open="basisOpen"
        class="ci-card basis-card"
        @toggle="basisOpen = $event.currentTarget.open"
      >
        <summary :aria-expanded="basisOpen">
          <span
            ><strong>{{ copy.basisTitle }}</strong></span
          >
        </summary>
        <div class="basis-copy">
          <p>{{ copy.basisBody }}</p>
          <div class="display-formula"><MathFormula formula="t = \frac{\bar{x} - \mu}{s / \sqrt{n}}" display aria-label="t statistic" /></div>
          <p class="formula-note"><span>df = n − 1</span></p>
        </div>
      </details>

      <section class="ci-card sample-card">
        <h3>{{ copy.sampleTitle }}</h3>
        <div class="sample-fields mean-sample-fields">
          <label class="sample-size-field">
            <span>{{ copy.n }}</span>
            <input
              v-model="inputs.n"
              type="text"
              inputmode="numeric"
              :aria-invalid="touched.n && errors.n"
              aria-describedby="n-message"
              @input="markChanged('n')"
              @blur="touched.n = true"
            />
            <small v-if="touched.n && errors.n" id="n-message" class="field-error">{{
              copy.nError
            }}</small>
          </label>
          <div class="sample-measure-row">
            <label v-for="field in ['mean', 'sd']" :key="field">
              <span>{{ copy[field] }}</span>
              <input
                v-model="inputs[field]"
                type="text"
                inputmode="decimal"
                :aria-invalid="touched[field] && errors[field]"
                :aria-describedby="`${field}-message`"
                @input="markChanged(field)"
                @blur="touched[field] = true"
              />
              <small
                v-if="touched[field] && errors[field]"
                :id="`${field}-message`"
                class="field-error"
                >{{ copy[`${field}Error`] }}</small
              >
              <small
                v-else-if="field === 'sd' && valid && parsed.sd === 0"
                :id="`${field}-message`"
                >{{ copy.zeroSd }}</small
              >
            </label>
          </div>
        </div>
      </section>

      <section class="ci-card t-chart-card">
        <h3>{{ copy.chartTitle }}</h3>
        <svg v-if="tChart" viewBox="0 0 700 520" role="img" :aria-label="copy.chartDesc">
          <title>{{ copy.chartTitle }}</title>
          <desc>{{ copy.chartDesc }}</desc>
          <path :d="tChart.leftTail" class="tail-area" />
          <path :d="tChart.rightTail" class="tail-area" />
          <path :d="tChart.central" class="central-area" />
          <line x1="38" :y1="tChart.baseline" x2="682" :y2="tChart.baseline" class="chart-axis" />
          <line
            :x1="tChart.sx(0)"
            y1="76"
            :x2="tChart.sx(0)"
            :y2="tChart.baseline"
            class="center-line"
          />
          <line
            :x1="tChart.sx(-tChart.critical)"
            y1="92"
            :x2="tChart.sx(-tChart.critical)"
            :y2="tChart.baseline"
            class="critical-line"
          />
          <line
            :x1="tChart.sx(tChart.critical)"
            y1="92"
            :x2="tChart.sx(tChart.critical)"
            :y2="tChart.baseline"
            class="critical-line"
          />
          <path :d="tChart.line" class="density-line" />
          <text :x="tChart.sx(0)" y="42" text-anchor="middle" class="coverage-label">1 − α</text>
          <text x="74" :y="tChart.baseline - 44" text-anchor="middle" class="tail-label">
            α / 2
          </text>
          <text x="626" :y="tChart.baseline - 44" text-anchor="middle" class="tail-label">
            α / 2
          </text>
          <text
            :x="tChart.sx(-tChart.critical)"
            :y="tChart.baseline + 28"
            text-anchor="middle"
            class="critical-label"
          >
            −t*
          </text>
          <text
            :x="tChart.sx(tChart.critical)"
            :y="tChart.baseline + 28"
            text-anchor="middle"
            class="critical-label"
          >
            +t*
          </text>
          <text x="38" y="508" class="chart-meta">
            df = {{ result.df }} · t* = {{ format(result.criticalValue, 4) }}
          </text>
        </svg>
      </section>

      <section v-if="result" class="ci-card result-card">
        <p class="interval-line">
          <span>{{ copy.confidenceIntervalLabel }}：</span
          ><strong>[{{ format(result.lower) }}, {{ format(result.upper) }}]</strong>
        </p>
      </section>

      <section class="ci-card confidence-card">
        <p class="confidence-line">
          <strong>{{ confidenceLabel }}</strong
          ><span>{{ copy.confidenceIntervalLabel }}</span>
        </p>
        <input
          v-model.number="inputs.confidence"
          type="range"
          min="0.8"
          max="0.999"
          step="0.001"
          :aria-label="copy.confidence"
          :aria-valuetext="confidenceLabel"
          @input="markChanged('confidence')"
        />
        <div class="quick-levels">
          <button
            v-for="level in [0.9, 0.95, 0.99]"
            :key="level"
            type="button"
            :class="{ active: inputs.confidence === level }"
            :aria-pressed="inputs.confidence === level"
            @click="
              inputs.confidence = level;
              markChanged('confidence');
            "
          >
            {{ level * 100 }}%
          </button>
        </div>
        <dl v-if="result" class="parameter-grid">
          <div>
            <dt>α</dt>
            <dd>{{ result.alpha.toFixed(3) }}</dd>
          </div>
          <div>
            <dt>α / 2</dt>
            <dd>{{ (result.alpha / 2).toFixed(3) }}</dd>
          </div>
          <div>
            <dt>1 − α / 2</dt>
            <dd>{{ result.probability.toFixed(3) }}</dd>
          </div>
          <div>
            <dt><BcTooltip content="t(1 − α/2, df)">t*</BcTooltip></dt>
            <dd>{{ format(result.criticalValue, 4) }}</dd>
          </div>
        </dl>
      </section>

      <details
        v-if="result"
        :open="formulaOpen"
        class="ci-card formula-card"
        @toggle="formulaOpen = $event.currentTarget.open"
      >
        <summary :aria-expanded="formulaOpen">
          <span
            ><strong>{{ copy.formulaTitle }}</strong
            ><small>{{ copy.formulaSummary }}</small></span
          >
        </summary>
        <div class="display-formula"><MathFormula formula="\bar{x} \pm t_{1-\alpha/2,\,n-1}\frac{s}{\sqrt{n}}" display aria-label="Mean confidence interval formula" /></div>
        <ol class="formula-steps">
          <li>
            <span>1 · {{ copy.df }}</span
            ><strong>df = {{ result.n }} − 1 = {{ result.df }}</strong>
          </li>
          <li>
            <span>2 · {{ copy.se }}</span
            ><strong
              >SE = {{ format(result.sd) }} / √{{ result.n }} = {{ format(result.se) }}</strong
            >
          </li>
          <li>
            <span>3 · {{ copy.me }}</span
            ><strong
              >{{ copy.me }} = {{ format(result.criticalValue, 4) }} × {{ format(result.se) }} =
              {{ format(result.marginOfError) }}</strong
            >
          </li>
          <li>
            <span>4 · {{ copy.ci }}</span
            ><strong>CI = [{{ format(result.lower) }}, {{ format(result.upper) }}]</strong>
          </li>
        </ol>
        <p class="coverage-copy">{{ copy.coverage(confidenceLabel) }}</p>
      </details>
    </div>

    <div v-else-if="scenario === 'variability'" class="mean-flow variability-flow">
      <details
        :open="basisOpen"
        class="ci-card basis-card"
        @toggle="basisOpen = $event.currentTarget.open"
      >
        <summary :aria-expanded="basisOpen">
          <span
            ><strong>{{ copy.variability.basisTitle }}</strong></span
          >
        </summary>
        <div class="basis-copy">
          <p>{{ copy.variability.basisBody }}</p>
          <div class="display-formula"><MathFormula formula="\chi^2 = \frac{(n-1)s^2}{\sigma^2}" display aria-label="Chi-square statistic" /></div>
          <p class="formula-note"><span>df = n − 1</span></p>
        </div>
      </details>

      <section class="ci-card sample-card">
        <h3>{{ copy.variability.sampleTitle }}</h3>
        <div class="sample-fields sd-sample-fields">
          <label class="sample-size-field"
            ><span>{{ copy.variability.n }}</span
            ><input
              v-model="variabilityInputs.n"
              type="text"
              inputmode="numeric"
              :aria-invalid="variabilityTouched.n && variabilityErrors.n"
              aria-describedby="variability-n-message"
              @input="markChanged"
              @blur="variabilityTouched.n = true"
            /><small v-if="variabilityTouched.n && variabilityErrors.n" id="variability-n-message" class="field-error">{{ rsdCopy.nError }}</small></label>
          <label class="sample-value-field"
              ><span>{{ copy.sd }}</span
              ><input
                v-model="variabilityInputs.sd"
                type="text"
                inputmode="decimal"
                :aria-invalid="variabilityTouched.sd && variabilityErrors.sd"
                aria-describedby="variability-sd-message"
                @input="markChanged"
                @blur="variabilityTouched.sd = true"
            /><small v-if="variabilityTouched.sd && variabilityErrors.sd" id="variability-sd-message" class="field-error">{{ rsdCopy.sdError }}</small><small v-else-if="variabilityValid && variabilityParsed.sd === 0" id="variability-sd-message">{{ rsdCopy.zeroSd }}</small></label>
        </div>
      </section>

      <section class="ci-card t-chart-card">
        <h3>{{ copy.variability.chartTitle }}</h3>
        <svg
          v-if="chiChart"
          viewBox="0 0 700 520"
          role="img"
          :aria-label="copy.variability.chartDesc"
        >
          <title>{{ copy.variability.chartTitle }}</title>
          <desc>{{ copy.variability.chartDesc }}</desc>
          <path :d="chiChart.leftArea" class="tail-area" />
          <path :d="chiChart.rightArea" class="tail-area" />
          <path :d="chiChart.coveredArea" class="central-area" />
          <line
            x1="38"
            :y1="chiChart.baseline"
            x2="682"
            :y2="chiChart.baseline"
            class="chart-axis"
          />
          <line
            :x1="chiChart.sx(chiChart.lowerCritical)"
            y1="92"
            :x2="chiChart.sx(chiChart.lowerCritical)"
            :y2="chiChart.baseline"
            class="critical-line"
          />
          <line :x1="chiChart.sx(chiChart.upperCritical)" y1="92" :x2="chiChart.sx(chiChart.upperCritical)" :y2="chiChart.baseline" class="critical-line" />
          <path :d="chiChart.path" class="density-line" />
          <text x="10" y="150" text-anchor="middle" class="tail-label">α / 2</text>
          <text x="245" y="92" text-anchor="middle" class="coverage-label">1 − α</text>
          <text x="620" y="150" text-anchor="middle" class="tail-label">α / 2</text>
          <text
            :x="chiChart.sx(chiChart.lowerCritical)"
            :y="chiChart.baseline + 28"
            text-anchor="middle"
            class="critical-label"
          >
            χ<tspan baseline-shift="super" font-size="0.7em">2</tspan><tspan baseline-shift="sub" font-size="0.7em">α/2</tspan>
          </text>
          <text :x="chiChart.sx(chiChart.upperCritical)" :y="chiChart.baseline + 28" text-anchor="middle" class="critical-label">χ<tspan baseline-shift="super" font-size="0.7em">2</tspan><tspan baseline-shift="sub" font-size="0.7em">1−α/2</tspan></text>
          <text x="38" y="508" class="chart-meta">
            df = {{ variabilityResult.df }} · χ²α/2 = {{ format(variabilityResult.lowerCriticalValue, 4) }} · χ²1−α/2 = {{ format(variabilityResult.upperCriticalValue, 4) }}
          </text>
        </svg>
      </section>

      <section v-if="variabilityResult" class="ci-card result-card">
        <p class="interval-line">
          <span>{{ copy.variability.resultLabel }}：</span
          ><strong>[{{ format(variabilityResult.lowerSd) }}, {{ format(variabilityResult.upperSd) }}]</strong>
        </p>
      </section>

      <section class="ci-card confidence-card">
        <p class="confidence-line">
          <strong>{{ variabilityConfidenceLabel }}</strong
          ><span>{{ copy.variability.confidenceSuffix }}</span>
        </p>
        <input
          v-model.number="variabilityInputs.confidence"
          type="range"
          min="0.8"
          max="0.999"
          step="0.001"
          :aria-label="copy.confidence"
          :aria-valuetext="variabilityConfidenceLabel"
          @input="markChanged"
        />
        <div class="quick-levels">
          <button
            v-for="level in [0.9, 0.95, 0.99]"
            :key="level"
            type="button"
            :class="{ active: variabilityInputs.confidence === level }"
            :aria-pressed="variabilityInputs.confidence === level"
            @click="variabilityInputs.confidence = level"
          >
            {{ level * 100 }}%
          </button>
        </div>
        <dl v-if="variabilityResult" class="parameter-grid">
          <div><dt>α</dt><dd>{{ variabilityResult.alpha.toFixed(3) }}</dd></div>
          <div><dt>α / 2</dt><dd>{{ (variabilityResult.alpha / 2).toFixed(3) }}</dd></div>
          <div><dt>df</dt><dd>{{ variabilityResult.df }}</dd></div>
          <div><dt>s²</dt><dd>{{ format(variabilityResult.sd ** 2) }}</dd></div>
        </dl>
      </section>

      <details
        v-if="variabilityResult"
        :open="formulaOpen"
        class="ci-card formula-card"
        @toggle="formulaOpen = $event.currentTarget.open"
      >
        <summary :aria-expanded="formulaOpen">
          <span
            ><strong>{{ copy.variability.formulaTitle }}</strong
            ><small>{{ copy.variability.formulaSummary }}</small></span
          >
        </summary>
        <div class="display-formula"><MathFormula formula="\mathrm{CI}_{\mathrm{SD}} = \left[s\sqrt{\frac{df}{\chi^2_{1-\alpha/2}}},\;s\sqrt{\frac{df}{\chi^2_{\alpha/2}}}\right]" display aria-label="Standard deviation confidence interval formula" /></div>
        <ol class="formula-steps">
          <li>
            <span>1 · {{ copy.df }}</span
            ><strong>df = {{ variabilityResult.n }} − 1 = {{ variabilityResult.df }}</strong>
          </li>
          <li>
            <span>2 · χ² 临界值</span
            ><strong>χ<sup>2</sup><sub>α/2</sub> = {{ format(variabilityResult.lowerCriticalValue, 4) }}；χ<sup>2</sup><sub>1−α/2</sub> = {{ format(variabilityResult.upperCriticalValue, 4) }}</strong>
          </li>
          <li>
            <span>3 · {{ copy.variability.resultLabel }}</span><strong>[{{ format(variabilityResult.lowerSd) }}, {{ format(variabilityResult.upperSd) }}]</strong>
          </li>
        </ol>
        <p class="coverage-copy">{{ copy.variability.coverage(variabilityConfidenceLabel) }}</p>
      </details>
    </div>

    <div v-else-if="scenario === 'rsd'" class="mean-flow rsd-flow">
      <details :open="basisOpen" class="ci-card basis-card" @toggle="basisOpen = $event.currentTarget.open">
        <summary :aria-expanded="basisOpen"><span><strong>{{ rsdCopy.basisTitle }}</strong></span></summary>
        <div class="basis-copy"><p>{{ rsdCopy.basisBody }}</p><div class="display-formula"><MathFormula formula="\chi^2 = \frac{(n-1)s^2}{\sigma^2},\qquad T = \frac{\sqrt{n}\,\bar{x}}{s}" display aria-label="Chi-square and observed t statistics" /></div><p class="formula-note">df = n − 1</p></div>
      </details>

      <section class="ci-card sample-card">
        <h3>{{ rsdCopy.sampleTitle }}</h3>
        <div class="sample-fields">
          <label class="sample-size-field"><span>{{ rsdCopy.n }}</span><input v-model="rsdInputs.n" type="text" inputmode="numeric" :aria-invalid="rsdTouched.n && rsdErrors.n" aria-describedby="rsd-n-message" @blur="rsdTouched.n = true" /><small v-if="rsdTouched.n && rsdErrors.n" id="rsd-n-message" class="field-error">{{ rsdCopy.nError }}</small></label>
          <div class="sample-measure-row">
            <label><span>{{ rsdCopy.mean }}</span><input v-model="rsdInputs.mean" type="text" inputmode="decimal" :aria-invalid="rsdTouched.mean && rsdErrors.mean" aria-describedby="rsd-mean-message" @blur="rsdTouched.mean = true" /><small v-if="rsdTouched.mean && rsdErrors.mean" id="rsd-mean-message" class="field-error">{{ rsdCopy.meanError }}</small></label>
            <label><span>{{ rsdCopy.sd }}</span><input v-model="rsdInputs.sd" type="text" inputmode="decimal" :aria-invalid="rsdTouched.sd && rsdErrors.sd" aria-describedby="rsd-sd-message" @blur="rsdTouched.sd = true" /><small v-if="rsdTouched.sd && rsdErrors.sd" id="rsd-sd-message" class="field-error">{{ rsdCopy.sdError }}</small><small v-else-if="rsdValidation.valid && rsdParsed.sd === 0" id="rsd-sd-message">{{ rsdCopy.zeroSd }}</small></label>
          </div>
        </div>
      </section>

      <section v-if="rsdMeanInvalid" class="ci-card rsd-notice" role="status">{{ rsdCopy.meanInvalid }}</section>
      <section v-else-if="rsdMeanRisk" class="ci-card rsd-notice">{{ rsdCopy.meanRisk }}</section>

      <section class="ci-card result-card rsd-result-card">
        <h3>{{ rsdCopy.resultTitle }}</h3>
        <p class="observed-rsd"><span>{{ rsdCopy.observed }}：</span><strong>{{ observedRsd === null ? "—" : `${formatRsd(observedRsd)}` }}</strong></p>
        <dl class="rsd-results" v-if="!rsdMeanInvalid">
          <div v-for="method in ['naive', 'mckay', 'vangel', 'exact']" :key="method"><dt>{{ rsdCopy.methods[method] }}</dt><dd>{{ formatMethodInterval(rsdMethods[method]) }}</dd></div>
        </dl>
      </section>

      <details :open="recommendationOpen" class="ci-card basis-card compact-details recommendation-card" @toggle="recommendationOpen = $event.currentTarget.open">
        <summary :aria-expanded="recommendationOpen"><span><strong><span class="recommendation-label">{{ rsdCopy.recommendedMethod }}</span>{{ rsdCopy.recommendationText[rsdRecommendation.key][0] }}</strong></span></summary>
        <div class="basis-copy recommendation-copy"><p>{{ rsdCopy.recommendationText[rsdRecommendation.key][1] }}</p><small>{{ rsdCopy.assumption }}</small></div>
      </details>

      <section class="ci-card confidence-card">
        <p class="confidence-line"><strong>{{ rsdConfidenceLabel }}</strong><span>{{ rsdCopy.confidence }}</span></p>
        <input v-model.number="rsdInputs.confidence" type="range" min="0.8" max="0.999" step="0.001" :aria-label="rsdCopy.confidence" :aria-valuetext="rsdConfidenceLabel" />
        <div class="quick-levels"><button v-for="level in [0.9, 0.95, 0.99]" :key="level" type="button" :class="{ active: rsdInputs.confidence === level }" :aria-pressed="rsdInputs.confidence === level" @click="rsdInputs.confidence = level">{{ level * 100 }}%</button></div>
        <dl class="parameter-grid parameter-grid--three"><div><dt>α</dt><dd>{{ (1 - rsdInputs.confidence).toFixed(3) }}</dd></div><div><dt>α / 2</dt><dd>{{ ((1 - rsdInputs.confidence) / 2).toFixed(3) }}</dd></div><div><dt>1 − α</dt><dd>{{ rsdInputs.confidence.toFixed(3) }}</dd></div></dl>
      </section>

      <details v-for="method in ['naive', 'mckay', 'vangel', 'exact']" :key="method" :open="methodOpen[method]" class="ci-card formula-card method-card" @toggle="methodOpen[method] = $event.currentTarget.open">
        <summary :aria-expanded="methodOpen[method]"><span><strong>{{ rsdCopy.methods[method] }}</strong><small>{{ rsdCopy.labels[method] }}</small></span></summary>
        <div class="method-copy">
          <p v-if="method === 'naive'">{{ props.language === 'zh' ? '先计算 SD 的卡方置信区间，再分别除以样本均值。该方法把样本均值视为固定值，只考虑 SD 的不确定性。' : 'First calculate the chi-square interval for SD, then divide its endpoints by the sample mean. This treats the sample mean as fixed.' }}</p>
          <p v-else-if="method === 'mckay'">{{ props.language === 'zh' ? 'McKay 方法通过近似枢轴量构造 CV / RSD 的区间，同时将均值和标准差的变化纳入近似。' : 'McKay uses an approximate pivotal quantity for CV / RSD and incorporates variation in both the mean and standard deviation.' }}</p>
          <p v-else-if="method === 'vangel'">{{ props.language === 'zh' ? 'Vangel 方法是在 McKay 近似基础上的有限样本修正，用于改善小样本条件下的区间表现。' : 'Vangel is a finite-sample modification of the McKay approximation.' }}</p>
          <p v-else>{{ props.language === 'zh' ? '基于非中心 t 分布的数值反演。它通过累计概率方程分别求解非中心参数边界，再转换为 CV / RSD 区间。' : 'Numerical inversion based on the noncentral t distribution. It solves probability equations for noncentrality bounds and transforms them into a CV / RSD interval.' }}</p>
          <div v-if="method === 'naive'" class="display-formula"><MathFormula formula="L = K\sqrt{\frac{df}{u_{\mathrm{high}}}},\qquad U = K\sqrt{\frac{df}{u_{\mathrm{low}}}}" display aria-label="Naive RSD interval formula" /></div>
          <div v-else-if="method === 'mckay'" class="display-formula"><MathFormula formula="\frac{K}{\sqrt{\left(\frac{u}{n}-1\right)K^2+\frac{u}{n-1}}}" display aria-label="McKay approximation formula" /></div>
          <div v-else-if="method === 'vangel'" class="display-formula"><MathFormula formula="\frac{K}{\sqrt{\left(\frac{u+2}{n}-1\right)K^2+\frac{u}{n-1}}}" display aria-label="Vangel modification formula" /></div>
          <div v-else class="display-formula"><MathFormula formula="T = \frac{\sqrt{n}\,\bar{x}}{s},\qquad \delta = \frac{\sqrt{n}}{\mathrm{CV}}" display aria-label="Exact method relations" /></div>
          <ol v-if="method === 'exact'" class="formula-steps exact-formula-steps">
            <li>
              <span>{{ rsdCopy.exactSteps.sampleCv }}</span>
              <MathFormula :formula="String.raw`K = \frac{s}{\bar{x}} = ${formatExactValue(rsdMethods.exact?.sampleCv)}`" />
            </li>
            <li>
              <span>{{ rsdCopy.exactSteps.dfAndObservedT }}</span>
              <MathFormula :formula="String.raw`\nu = n - 1 = ${rsdMethods.exact?.degreesOfFreedom ?? '\\text{—}'}`" />
              <div class="exact-equation"><MathFormula :formula="String.raw`t_{\mathrm{obs}} = \frac{\sqrt{n}\,\bar{x}}{s} = \frac{\sqrt{n}}{K} = ${formatExactValue(rsdMethods.exact?.observedT)}`" display /></div>
            </li>
            <li>
              <span>{{ rsdCopy.exactSteps.invert }}</span>
              <p>{{ rsdCopy.exactSteps.invertDescription }}</p>
              <div class="exact-equation"><MathFormula formula="F_{\mathrm{nct}}(t_{\mathrm{obs}};\nu,\delta_{\mathrm{lower}}) = 1 - \frac{\alpha}{2}" display /></div>
              <div class="exact-equation"><MathFormula formula="F_{\mathrm{nct}}(t_{\mathrm{obs}};\nu,\delta_{\mathrm{upper}}) = \frac{\alpha}{2}" display /></div>
              <MathFormula :formula="String.raw`\delta_{\mathrm{lower}} = ${formatExactValue(rsdMethods.exact?.deltaLower)}`" />
              <MathFormula :formula="String.raw`\delta_{\mathrm{upper}} = ${formatExactValue(rsdMethods.exact?.deltaUpper)}`" />
            </li>
            <li>
              <span>{{ rsdCopy.exactSteps.convert }}</span>
              <MathFormula formula="\mathrm{CV} = \frac{\sqrt{n}}{\delta}" />
              <div class="exact-equation"><MathFormula formula="\mathrm{CI}_{\mathrm{CV}} = \left[\frac{\sqrt{n}}{\delta_{\mathrm{upper}}},\;\frac{\sqrt{n}}{\delta_{\mathrm{lower}}}\right]" display /></div>
              <MathFormula formula="\mathrm{CI}_{\mathrm{RSD}} = 100 \times \mathrm{CI}_{\mathrm{CV}}" />
              <strong>{{ formatMethodInterval(rsdMethods.exact) }}</strong>
              <p>{{ rsdCopy.exactSteps.inverse }}</p>
            </li>
          </ol>
          <ol v-else-if="method === 'naive'" class="formula-steps method-formula-steps">
            <li><span>1</span><MathFormula :formula="String.raw`K = \frac{s}{\bar{x}} = ${formatFormulaValue(rsdMethods.naive?.intermediateValues?.k)}`" /></li>
            <li><span>2</span><MathFormula :formula="String.raw`df = n - 1 = ${formatFormulaValue(rsdMethods.naive?.intermediateValues?.df)}`" /><MathFormula :formula="String.raw`u_{\mathrm{low}} = \chi^2_{\alpha/2,df} = ${formatFormulaValue(rsdMethods.naive?.intermediateValues?.uLow)},\quad u_{\mathrm{high}} = \chi^2_{1-\alpha/2,df} = ${formatFormulaValue(rsdMethods.naive?.intermediateValues?.uHigh)}`" /></li>
            <li><span>3</span><MathFormula :formula="String.raw`L = K\sqrt{\frac{df}{u_{\mathrm{high}}}} = ${formatFormulaValue(rsdMethods.naive?.lower)}`" /><MathFormula :formula="String.raw`U = K\sqrt{\frac{df}{u_{\mathrm{low}}}} = ${formatFormulaValue(rsdMethods.naive?.upper)}`" /></li>
            <li><span>4</span><strong>{{ formatMethodInterval(rsdMethods.naive) }}</strong></li>
          </ol>
          <ol v-else-if="method === 'mckay'" class="formula-steps method-formula-steps">
            <li><span>1</span><MathFormula :formula="String.raw`K = \frac{s}{\bar{x}} = ${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.k)}`" /><MathFormula :formula="String.raw`df = n - 1 = ${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.df)}`" /></li>
            <li><span>2</span><MathFormula :formula="String.raw`u_1 = \chi^2_{1-\alpha/2,df} = ${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.uHigh)}`" /><MathFormula :formula="String.raw`u_2 = \chi^2_{\alpha/2,df} = ${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.uLow)}`" /></li>
            <li><span>3</span><MathFormula :formula="String.raw`L = \frac{K}{\sqrt{\left(\frac{u_1}{n}-1\right)K^2+\frac{u_1}{n-1}}} = \frac{K}{\sqrt{${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.lowerDenominator)}}} = ${formatFormulaValue(rsdMethods.mckay?.lower)}`" /><MathFormula :formula="String.raw`U = \frac{K}{\sqrt{\left(\frac{u_2}{n}-1\right)K^2+\frac{u_2}{n-1}}} = \frac{K}{\sqrt{${formatFormulaValue(rsdMethods.mckay?.intermediateValues?.upperDenominator)}}} = ${formatFormulaValue(rsdMethods.mckay?.upper)}`" /></li>
            <li><span>4</span><strong>{{ formatMethodInterval(rsdMethods.mckay) }}</strong></li>
          </ol>
          <ol v-else-if="method === 'vangel'" class="formula-steps method-formula-steps">
            <li><span>1</span><MathFormula :formula="String.raw`K = \frac{s}{\bar{x}} = ${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.k)}`" /><MathFormula :formula="String.raw`df = n - 1 = ${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.df)}`" /></li>
            <li><span>2</span><MathFormula :formula="String.raw`u_1 = \chi^2_{1-\alpha/2,df} = ${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.uHigh)}`" /><MathFormula :formula="String.raw`u_2 = \chi^2_{\alpha/2,df} = ${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.uLow)}`" /></li>
            <li><span>3</span><MathFormula :formula="String.raw`L = \frac{K}{\sqrt{\left(\frac{u_1+2}{n}-1\right)K^2+\frac{u_1}{n-1}}} = \frac{K}{\sqrt{${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.lowerDenominator)}}} = ${formatFormulaValue(rsdMethods.vangel?.lower)}`" /><MathFormula :formula="String.raw`U = \frac{K}{\sqrt{\left(\frac{u_2+2}{n}-1\right)K^2+\frac{u_2}{n-1}}} = \frac{K}{\sqrt{${formatFormulaValue(rsdMethods.vangel?.intermediateValues?.upperDenominator)}}} = ${formatFormulaValue(rsdMethods.vangel?.upper)}`" /></li>
            <li><span>4</span><strong>{{ formatMethodInterval(rsdMethods.vangel) }}</strong></li>
          </ol>
          <p class="coverage-copy" v-if="method === 'naive'">{{ props.language === 'zh' ? '该方法忽略样本均值自身的抽样不确定性，因此实际覆盖率可能偏离标称置信水平，尤其是在小样本、RSD 较高或均值接近零时。' : 'This method ignores sampling uncertainty in the sample mean, so actual coverage can depart from the nominal level, especially for small samples, high RSD, or a mean near zero.' }}</p>
          <p class="coverage-copy" v-if="method === 'exact' && rsdMethods.exact?.converged">{{ rsdCopy.exactSteps.converged }}</p>
          <p class="coverage-copy field-error" v-else-if="method === 'exact' && !exactRsdLoading">{{ rsdCopy.exactSteps.failed }}</p>
        </div>
      </details>

      <details :open="referencesOpen" class="ci-card formula-card references-card compact-details" @toggle="referencesOpen = $event.currentTarget.open"><summary :aria-expanded="referencesOpen"><span><strong>{{ rsdCopy.references }}</strong></span></summary><div class="method-copy references-list"><ol><li><a href="https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/coefvacl.htm" target="_blank" rel="noopener noreferrer">NIST/SEMATECH, Coefficient of Variation Confidence Limits</a></li><li>McKay, A. T. (1932). Distribution of the Coefficient of Variation and the Extended “t” Distribution. <i>Journal of the Royal Statistical Society</i>, 95, 695–698.</li><li>Vangel, M. G. (1996). Confidence Intervals for a Normal Coefficient of Variation. <i>The American Statistician</i>, 50(1), 21–26.</li><li>Verrill, S. (2003). Confidence Bounds for Normal and Lognormal Distribution Coefficients of Variation. USDA Forest Products Laboratory, Research Paper 609.</li></ol></div></details>
    </div>
  </section>
</template>

<style scoped>
.advanced-applications,
.mean-flow {
  display: grid;
  gap: 14px;
}
.advanced-heading {
  display: grid;
  gap: 8px;
  max-width: 760px;
}
.advanced-heading h2,
.advanced-heading p,
.ci-card h3,
.ci-card p {
  margin: 0;
}
.advanced-heading h2 {
  font-size: clamp(1.35rem, 2.2vw, 2.1rem);
}
.advanced-heading p,
.ci-card p,
.ci-card small {
  color: var(--muted);
  line-height: 1.58;
}
.scenario-field {
  position: sticky;
  top: calc(var(--topbar-sticky-height, 60px) + 12px);
  z-index: 30;
  align-self: start;
  display: grid;
  gap: 7px;
  max-width: 520px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
}
.scenario-field select {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink);
  font-size: 1rem;
}
.scenario-field select:focus {
  outline: none;
}
.scenario-field select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent-border);
}
.ci-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--app-card-shadow);
}
.soon-card {
  display: grid;
  gap: 9px;
}
.soon-card > span {
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}
.basis-card {
  padding: 0;
}
.basis-card summary,
.formula-card summary {
  display: flex;
  min-height: 76px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
}
.basis-card summary::-webkit-details-marker,
.formula-card summary::-webkit-details-marker {
  display: none;
}
.basis-card summary > span,
.formula-card summary > span {
  display: grid;
  gap: 5px;
}
.basis-card summary::after,
.formula-card summary::after {
  align-self: center;
  margin-left: auto;
  content: "＋";
  color: var(--accent);
}
.basis-card[open] summary::after,
.formula-card[open] summary::after {
  content: "−";
}
.compact-details summary {
  min-height: 76px;
}
.recommendation-card summary strong {
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 650;
}
.recommendation-label {
  color: var(--muted);
  font-weight: 650;
}
.basis-copy {
  padding: 0 16px 18px;
  border-top: 1px solid var(--soft-line);
}
.basis-copy p {
  margin-top: 14px;
}
.display-formula {
  min-width: 0;
  color: var(--ink) !important;
  font-size: clamp(0.9rem, 2vw, 1.08rem);
}
.display-formula sup,
.formula-steps sup {
  font-size: 0.7em;
  line-height: 0;
  vertical-align: super;
}
.display-formula sub,
.formula-steps sub {
  font-size: 0.7em;
  line-height: 0;
  vertical-align: sub;
}
.formula-note span {
  font-family: "IBM Plex Mono", monospace;
}
.t-chart-card,
.confidence-card,
.sample-card,
.result-card {
  display: grid;
  gap: 14px;
}
.sample-card h3,
.t-chart-card > h3 {
  font-size: 0.9rem;
}
.t-chart-card svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 7/5;
}
.central-area {
  fill: var(--selected-bg);
}
.tail-area {
  fill: color-mix(in srgb, var(--muted) 12%, transparent);
}
.density-line {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2;
}
.chart-axis,
.center-line {
  stroke: var(--soft-line);
}
.center-line {
  stroke-dasharray: 4 5;
}
.critical-line {
  stroke: var(--accent);
  stroke-width: 2;
}
.coverage-label,
.critical-label,
.chart-meta,
.tail-label {
  fill: var(--muted);
  font-family: "IBM Plex Mono", monospace;
  font-size: 14px;
}
.coverage-label,
.critical-label {
  fill: var(--accent);
  font-weight: 700;
}
.confidence-line,
.interval-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.confidence-line > strong {
  color: var(--accent);
  font-family: "IBM Plex Mono", monospace;
  font-size: 1.55rem;
  white-space: nowrap;
}
.interval-line {
  color: var(--ink) !important;
  font-family: "IBM Plex Mono", monospace;
}
.interval-line strong {
  font-size: 1.15rem;
}
.confidence-card > input {
  width: 100%;
  min-height: 44px;
  margin: 0;
  accent-color: var(--accent);
}
.quick-levels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}
.quick-levels button {
  min-height: 44px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-weight: 650;
}
.quick-levels button.active {
  border-color: var(--accent-border);
  background: var(--selected-bg);
  color: var(--ink);
}
.parameter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
  padding: 8px;
  border: 1px solid var(--soft-line);
  border-radius: 9px;
  background: var(--panel-soft);
}
.parameter-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.parameter-grid div {
  min-width: 0;
  text-align: center;
}
.parameter-grid dt {
  color: var(--muted);
  font-size: 0.64rem;
}
.parameter-grid dd {
  margin: 5px 0 0;
  color: var(--ink);
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.72rem;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.sample-fields {
  display: grid;
  gap: 12px;
  --sample-input-height: 46px;
  --field-message-height: 2.7em;
}
.sample-measure-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}
.sample-fields label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 650;
}
.sample-fields input {
  width: 100%;
  height: var(--sample-input-height);
  min-height: var(--sample-input-height);
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
  color: var(--ink);
  font-family: "IBM Plex Mono", monospace;
  font-size: 16px;
}
.sample-measure-row > label {
  grid-template-rows: auto var(--sample-input-height) minmax(var(--field-message-height), auto);
  align-content: start;
}
.sample-fields small {
  display: block;
  min-height: var(--field-message-height);
  line-height: 1.35;
}
.sample-size-field > small,
.sample-value-field > small {
  grid-column: 1 / -1;
}
.mean-sample-fields .sample-size-field {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
}
.mean-sample-fields .sample-size-field > input {
  grid-column: 2;
}
.mean-sample-fields .sample-size-field > small {
  text-align: right;
}
.mean-sample-fields .sample-measure-row > label,
.rsd-flow .sample-measure-row > label {
  grid-template-rows: auto var(--sample-input-height) auto;
}
.mean-sample-fields small,
.rsd-flow .sample-fields small {
  min-height: 0;
}
.sd-sample-fields .sample-size-field,
.sd-sample-fields .sample-value-field {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  column-gap: 10px;
}
.sd-sample-fields .sample-size-field > span,
.sd-sample-fields .sample-value-field > span {
  grid-column: 1;
}
.sd-sample-fields .sample-size-field > input,
.sd-sample-fields .sample-value-field > input {
  grid-column: 2;
  text-align: right;
}
.sd-sample-fields .sample-size-field > small,
.sd-sample-fields .sample-value-field > small,
.rsd-flow .sample-size-field > small {
  grid-column: 2;
  text-align: left;
}
.rsd-flow .sample-size-field {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
}
.sample-fields input[aria-invalid="true"] {
  border-color: var(--bc-danger, #b24b4b);
}
.field-error {
  color: var(--bc-danger, #b24b4b) !important;
}
.formula-card {
  padding: 0;
}
.formula-card > .display-formula,
.formula-steps {
  margin: 0 16px 16px;
}
.fraction {
  display: inline-grid;
  vertical-align: middle;
  text-align: center;
}
.fraction > span:first-child {
  border-bottom: 1px solid currentColor;
}
.formula-steps {
  display: grid;
  gap: 8px;
  padding: 0;
  list-style: none;
}
.formula-steps li {
  display: grid;
  gap: 5px;
  padding: 10px;
  border-radius: 7px;
  background: var(--panel-soft);
}
.formula-steps li span {
  color: var(--muted);
  font-size: 0.72rem;
}
.formula-steps strong {
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}
.formula-steps strong small {
  color: var(--muted);
  font-family: inherit;
  font-size: 0.82em;
  font-weight: 500;
}
.exact-formula-steps li {
  gap: 7px;
}
.exact-formula-steps p {
  margin: 0;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.58;
}
.exact-equation {
  overflow-wrap: anywhere;
  white-space: normal;
}
.method-formula-steps :deep(.math-formula) {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 0.12rem;
}
.coverage-copy {
  margin: 0 16px 16px !important;
  border-top: 1px solid var(--soft-line);
  padding-top: 12px;
  font-size: 0.78rem;
}
.rsd-notice {
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.58;
}
.rsd-result-card h3,
.recommendation-card h3 {
  font-size: 0.94rem;
}
.observed-rsd {
  color: var(--ink) !important;
  font-size: 0.9rem;
}
.observed-rsd strong,
.rsd-results dd {
  color: var(--accent);
  font-family: "IBM Plex Mono", monospace;
  font-variant-numeric: tabular-nums;
}
.rsd-results {
  display: grid;
  gap: 8px;
  margin: 0;
}
.rsd-results div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
}
.rsd-results dt,
.rsd-results dd { margin: 0; }
.rsd-results dt { color: var(--muted); font-size: 0.78rem; }
.rsd-results dd { font-size: 0.8rem; white-space: nowrap; }
.recommendation-copy {
  display: grid;
  gap: 12px;
  border-top: 0;
}
.recommendation-copy p,
.recommendation-copy small {
  margin: 0 !important;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.58;
}
.method-copy { padding: 0 16px 16px; }
.method-copy > p { margin: 0 0 12px; font-size: 0.8rem; }
.method-copy > .display-formula { overflow-x: auto; }
.method-copy .formula-steps { margin: 0 0 16px; }
.references-list {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.58;
}
.references-list a { color: var(--accent); }
.references-list ol { display: grid; gap: 10px; margin: 0; padding-left: 1.35rem; }
.chart-note { font-size: 0.78rem; }
@media (min-width: 1024px) {
  .sample-card {
    max-width: 560px;
  }
}
@media (max-width: 767px) {
  .advanced-applications,
  .mean-flow {
    gap: 8px;
  }
  .advanced-heading {
    display: none;
  }
  .scenario-field {
    position: sticky;
    top: var(--application-sticky-top, 100px);
    z-index: 60;
    align-self: start;
    max-width: none;
  }
  .scenario-field select {
    appearance: none;
    min-height: var(--mobile-switch-height, 36px);
    height: var(--mobile-switch-height, 36px);
    padding: 0 36px 0 12px;
    border-color: var(--mobile-glass-border, rgba(214, 217, 222, 0.54));
    border-radius: 14px;
    background: var(--mobile-glass-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-glass-shadow, 0 8px 20px rgba(23, 23, 23, 0.026));
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
  }
  .scenario-field::after {
    position: absolute;
    top: 50%;
    right: 14px;
    width: 7px;
    height: 7px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    content: "";
    pointer-events: none;
    transform: translateY(-65%) rotate(45deg);
  }
  .scenario-field > span {
    display: none;
  }
  .ci-card {
    padding: 12px;
    border-radius: 14px;
  }
  .soon-card {
    gap: 8px;
  }
  .soon-card > span,
  .soon-card h3 {
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }
  .soon-card h3 {
    line-height: 1.25;
  }
  .soon-card p {
    font-size: 0.66rem;
  }
  .basis-card,
  .formula-card {
    padding: 0;
  }
  .basis-card summary {
    min-height: calc(var(--mobile-switch-height, 36px) - 2px);
    height: calc(var(--mobile-switch-height, 36px) - 2px);
    box-sizing: border-box;
    align-items: center;
    padding: 0 12px;
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
  }
  .basis-card summary strong {
    font-size: inherit;
    font-weight: inherit;
  }
  .formula-card summary {
    min-height: 66px;
    padding: 11px 12px;
  }
  .compact-details summary {
    min-height: calc(var(--mobile-switch-height, 36px) - 2px);
    height: calc(var(--mobile-switch-height, 36px) - 2px);
    align-items: center;
    padding: 0 12px;
  }
  .recommendation-card summary strong {
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }
  .basis-copy {
    padding: 0 12px 14px;
  }
  .basis-copy p {
    font-size: 0.66rem;
  }
  .basis-copy .display-formula {
    font-size: 0.72rem;
  }
  .sample-card,
  .t-chart-card,
  .confidence-card,
  .result-card {
    gap: 8px;
  }
  .sample-card h3,
  .t-chart-card > h3 {
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }
  .sample-fields,
  .sample-measure-row {
    gap: 6px;
    --sample-input-height: 36px;
    --field-message-height: 2.7em;
  }
  .sample-fields label {
    gap: 4px;
    font-size: 0.66rem;
    font-weight: 500;
  }
  .sample-size-field {
    grid-template-columns: minmax(0, 1fr) 86px;
    align-items: center;
    column-gap: 8px !important;
  }
  .mean-sample-fields .sample-size-field {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 6px !important;
  }
  .sd-sample-fields .sample-size-field,
  .sd-sample-fields .sample-value-field {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 6px;
  }
  .sample-size-field small {
    grid-column: 1 / -1;
  }
  .sample-fields input {
    min-height: 36px;
    padding: 0 8px;
    border-radius: 9px;
    font-size: 0.66rem;
  }
  .t-chart-card svg {
    aspect-ratio: 16 / 10;
  }
  .t-chart-card svg text {
    font-size: 22px;
  }
  .t-chart-card svg .chart-meta {
    font-size: 22px;
  }
  .interval-line {
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }
  .interval-line strong {
    font-size: inherit;
  }
  .confidence-line {
    font-size: 0.9rem;
    font-weight: var(--mobile-header-control-font-weight, 650);
  }
  .confidence-line > strong {
    font-size: inherit;
  }
  .confidence-line > span {
    font-size: inherit;
    font-weight: inherit;
  }
  .confidence-card > input {
    min-height: 36px;
  }
  .quick-levels button {
    min-height: 36px;
    font-size: 0.72rem;
  }
  .parameter-grid {
    gap: 3px;
    padding: 7px 5px;
  }
  .parameter-grid dt {
    font-size: 0.6rem;
  }
  .parameter-grid dd {
    margin-top: 3px;
    font-size: 0.66rem;
  }
  .formula-card summary strong {
    font-size: 0.72rem;
    font-weight: 650;
  }
  .formula-card summary small,
  .formula-steps li span {
    font-size: 0.66rem;
  }
  .formula-card > .display-formula {
    font-size: 0.72rem;
  }
  .formula-steps strong {
    font-size: 0.72rem;
  }
  .coverage-copy {
    margin: 0 12px 14px !important;
    padding-top: 10px;
    font-size: 0.66rem;
  }
  .rsd-result-card h3,
  .observed-rsd { font-size: var(--mobile-header-control-font-size, 0.72rem); }
  .rsd-results dt,
  .rsd-results dd,
  .recommendation-card p,
  .recommendation-card small,
  .method-copy > p,
  .chart-note,
  .references-list,
  .rsd-notice,
  .field-error { font-size: 0.66rem; }
  .method-copy { padding: 0 12px 14px; }
  .rsd-results div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .rsd-flow .sample-size-field {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
