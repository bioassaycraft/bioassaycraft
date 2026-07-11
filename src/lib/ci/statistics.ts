export type IntervalResult = {
  n: number;
  df: number;
  mean: number;
  sd: number;
  se: number;
  confidenceLevel: number;
  alpha: number;
  probability: number;
  criticalValue: number;
  critical: number;
  marginOfError: number;
  lower: number;
  upper: number;
  level: number;
};

export type PopulationPoint = {
  id: number;
  value: number;
  x: number;
  y: number;
};

export type GeneratedSample = {
  values: number[];
  residuals: number[];
  seed: number;
  populationMean: number;
  targetBias: number;
  targetSpread: number;
};

const TWO_PI = Math.PI * 2;
const DEFAULT_EPSILON = 1e-10;

export function createSeededRandom(seed = 1) {
  let state = Math.abs(Math.floor(seed)) || 1;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function assertFiniteValues(values: number[]) {
  if (!Array.isArray(values) || values.some((value) => !Number.isFinite(value))) {
    throw new RangeError("values must be a finite numeric array");
  }
}

function normalPair(random: () => number) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const radius = Math.sqrt(-2 * Math.log(u1));

  return [radius * Math.cos(TWO_PI * u2), radius * Math.sin(TWO_PI * u2)];
}

export function mean(values: number[]) {
  assertFiniteValues(values);
  if (!values.length) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleVariance(values: number[]) {
  assertFiniteValues(values);
  if (values.length < 2) return 0;
  const center = mean(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
}

export function sampleStandardDeviation(values: number[]) {
  return Math.sqrt(sampleVariance(values));
}

export function sd(values: number[]) {
  return sampleStandardDeviation(values);
}

export function standardError(values: number[]) {
  assertFiniteValues(values);
  if (values.length < 2) return Number.NaN;
  return sampleStandardDeviation(values) / Math.sqrt(values.length);
}

export function cv(values: number[]) {
  const center = mean(values);
  if (!Number.isFinite(center) || Math.abs(center) < DEFAULT_EPSILON) return Number.NaN;
  return (sampleStandardDeviation(values) / Math.abs(center)) * 100;
}

export function geometricMean(values: number[]) {
  assertFiniteValues(values);
  const positive = values.filter((value) => value > 0);
  if (positive.length !== values.length || !values.length) return Number.NaN;
  return Math.exp(mean(values.map((value) => Math.log(value))));
}

export function geometricCV(values: number[]) {
  assertFiniteValues(values);
  const positive = values.filter((value) => value > 0);
  if (positive.length !== values.length || values.length < 2) return Number.NaN;
  const logSd = sampleStandardDeviation(values.map((value) => Math.log(value)));
  return Math.sqrt(Math.exp(logSd ** 2) - 1) * 100;
}

export function createFixedPopulation(seed = 1431, size = 240): PopulationPoint[] {
  const random = createSeededRandom(seed);
  const points: PopulationPoint[] = [];

  for (let index = 0; index < size; index += 2) {
    const [z1, z2] = normalPair(random);
    const drift = Math.sin(index * 0.13) * 1.1 + Math.cos(index * 0.037) * 0.8;
    const value1 = 100 + z1 * 7.2 + drift;
    const value2 = 100 + z2 * 7.2 - drift * 0.45;

    points.push({
      id: points.length,
      value: Number(value1.toFixed(3)),
      x: random(),
      y: random(),
    });

    if (points.length < size) {
      points.push({
        id: points.length,
        value: Number(value2.toFixed(3)),
        x: random(),
        y: random(),
      });
    }
  }

  return points;
}

export function samplePopulation(
  population: PopulationPoint[],
  sampleSize: number,
  seed = 1,
): PopulationPoint[] {
  const random = createSeededRandom(seed);
  const pool = population.slice();
  const selected: PopulationPoint[] = [];
  const count = Math.min(Math.max(0, Math.floor(sampleSize)), pool.length);

  for (let index = 0; index < count; index += 1) {
    const selectedIndex = Math.floor(random() * pool.length);
    selected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return selected;
}

export function generateStandardResiduals(seed = 1, count = 6) {
  const random = createSeededRandom(seed);
  const raw: number[] = [];

  while (raw.length < count) {
    raw.push(...normalPair(random));
  }

  const centered = raw.slice(0, count);
  const center = mean(centered);
  const residuals = centered.map((value) => value - center);
  const residualSd = sampleStandardDeviation(residuals);

  if (!Number.isFinite(residualSd) || residualSd < DEFAULT_EPSILON) {
    const fallback = Array.from({ length: count }, (_, index) => index - (count - 1) / 2);
    const fallbackSd = sampleStandardDeviation(fallback);
    return fallback.map((value) => value / fallbackSd);
  }

  return residuals.map((value) => value / residualSd);
}

export function generateTeachingSample({
  seed = 1,
  count = 6,
  populationMean = 100,
  targetBias = 4,
  targetSpread = 6,
}: {
  seed?: number;
  count?: number;
  populationMean?: number;
  targetBias?: number;
  targetSpread?: number;
} = {}): GeneratedSample {
  if (count < 2) throw new RangeError("count must be at least 2");
  const residuals = generateStandardResiduals(seed, count);
  const sampleMean = populationMean + targetBias;

  return {
    values: residuals.map((residual) => sampleMean + targetSpread * residual),
    residuals,
    seed,
    populationMean,
    targetBias,
    targetSpread,
  };
}

export function normalQuantile(probability: number) {
  if (probability <= 0 || probability >= 1) {
    throw new RangeError("probability must be between 0 and 1");
  }

  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;

  if (probability < low) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (probability <= high) {
    const q = probability - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - probability));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function logGamma(value: number) {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  let x = 0.9999999999998099;
  const z = value - 1;

  for (let index = 0; index < coefficients.length; index += 1) {
    x += coefficients[index] / (z + index + 1);
  }

  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const maxIterations = 200;
  const fpMin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;

  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) <= 3e-14) break;
  }

  return h;
}

export function regularizedIncompleteBeta(x: number, a: number, b: number) {
  if (x < 0 || x > 1 || a <= 0 || b <= 0) {
    throw new RangeError("invalid beta parameters");
  }

  if (x === 0 || x === 1) return x;

  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a;
  }

  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

export function studentTCdf(t: number, df: number) {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) {
    throw new RangeError("t and df must be finite, with df > 0");
  }

  if (t === 0) return 0.5;
  const x = df / (df + t ** 2);
  const ib = regularizedIncompleteBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function studentTQuantile(probability: number, df: number) {
  if (probability <= 0 || probability >= 1 || !Number.isFinite(probability)) {
    throw new RangeError("probability must be between 0 and 1");
  }
  if (!Number.isFinite(df) || df <= 0) {
    throw new RangeError("df must be greater than 0");
  }
  if (probability === 0.5) return 0;
  if (probability < 0.5) return -studentTQuantile(1 - probability, df);

  let low = 0;
  let high = Math.max(1, normalQuantile(probability));

  while (studentTCdf(high, df) < probability) {
    high *= 2;
    if (high > 1e6) throw new RangeError("failed to bracket t quantile");
  }

  for (let index = 0; index < 90; index += 1) {
    const midpoint = (low + high) / 2;
    if (studentTCdf(midpoint, df) < probability) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

export function tCritical(confidenceLevel = 0.95, df = 1) {
  if (confidenceLevel <= 0 || confidenceLevel >= 1 || !Number.isFinite(confidenceLevel)) {
    throw new RangeError("confidenceLevel must be between 0 and 1");
  }

  return studentTQuantile(1 - (1 - confidenceLevel) / 2, df);
}

export function confidenceInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  assertFiniteValues(values);
  if (values.length < 2) {
    throw new RangeError("at least two values are required");
  }
  if (confidenceLevel <= 0 || confidenceLevel >= 1 || !Number.isFinite(confidenceLevel)) {
    throw new RangeError("confidenceLevel must be between 0 and 1");
  }

  const sampleMean = mean(values);
  const sampleSd = sampleStandardDeviation(values);
  const df = values.length - 1;
  const se = sampleSd / Math.sqrt(values.length);
  const alpha = 1 - confidenceLevel;
  const probability = 1 - alpha / 2;
  const criticalValue = tCritical(confidenceLevel, df);
  const marginOfError = criticalValue * se;

  return {
    n: values.length,
    df,
    mean: sampleMean,
    sd: sampleSd,
    se,
    confidenceLevel,
    alpha,
    probability,
    criticalValue,
    critical: criticalValue,
    marginOfError,
    lower: sampleMean - marginOfError,
    upper: sampleMean + marginOfError,
    level: confidenceLevel,
  };
}

export function predictionInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  const result = confidenceInterval(values, confidenceLevel);
  const marginOfError = result.criticalValue * result.sd * Math.sqrt(1 + 1 / values.length);
  return {
    ...result,
    marginOfError,
    lower: result.mean - marginOfError,
    upper: result.mean + marginOfError,
  };
}

export function toleranceInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  const result = confidenceInterval(values, confidenceLevel);
  const coverageFactor = confidenceLevel >= 0.99 ? 1.72 : confidenceLevel >= 0.95 ? 1.52 : 1.34;
  const samplePenalty = Math.sqrt(1 + 1 / values.length);
  const marginOfError = result.criticalValue * result.sd * coverageFactor * samplePenalty;

  return {
    ...result,
    marginOfError,
    lower: result.mean - marginOfError,
    upper: result.mean + marginOfError,
  };
}

export function classifyIntervalAgainstSpecification(
  lower: number,
  upper: number,
  specificationLower: number,
  specificationUpper: number,
  epsilon = DEFAULT_EPSILON,
) {
  if (lower >= specificationLower - epsilon && upper <= specificationUpper + epsilon) {
    return "supports-acceptance";
  }
  if (upper < specificationLower - epsilon || lower > specificationUpper + epsilon) {
    return "supports-non-acceptance";
  }
  return "inconclusive";
}
