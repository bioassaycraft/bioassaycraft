export type IntervalResult = {
  mean: number;
  sd: number;
  se: number;
  df: number;
  critical: number;
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

const TWO_PI = Math.PI * 2;

export function createSeededRandom(seed = 1) {
  let state = Math.abs(Math.floor(seed)) || 1;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalPair(random: () => number) {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const radius = Math.sqrt(-2 * Math.log(u1));

  return [radius * Math.cos(TWO_PI * u2), radius * Math.sin(TWO_PI * u2)];
}

export function mean(values: number[]) {
  if (!values.length) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sd(values: number[]) {
  if (values.length < 2) return 0;
  const center = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function cv(values: number[]) {
  const center = mean(values);
  if (!Number.isFinite(center) || center === 0) return Number.NaN;
  return (sd(values) / Math.abs(center)) * 100;
}

export function geometricMean(values: number[]) {
  const positive = values.filter((value) => value > 0);
  if (positive.length !== values.length || !values.length) return Number.NaN;
  return Math.exp(mean(values.map((value) => Math.log(value))));
}

export function geometricCV(values: number[]) {
  const positive = values.filter((value) => value > 0);
  if (positive.length !== values.length || values.length < 2) return Number.NaN;
  const logSd = sd(values.map((value) => Math.log(value)));
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

export function tCritical(confidenceLevel = 0.95, df = 1) {
  const boundedLevel = Math.min(Math.max(confidenceLevel, 0.5), 0.999);
  const boundedDf = Math.max(1, df);
  const z = normalQuantile((1 + boundedLevel) / 2);
  const z2 = z * z;
  const z3 = z2 * z;
  const z5 = z3 * z2;
  const z7 = z5 * z2;

  return (
    z +
    (z3 + z) / (4 * boundedDf) +
    (5 * z5 + 16 * z3 + 3 * z) / (96 * boundedDf ** 2) +
    (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * boundedDf ** 3)
  );
}

export function confidenceInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  const sampleMean = mean(values);
  const sampleSd = sd(values);
  const df = Math.max(1, values.length - 1);
  const se = values.length ? sampleSd / Math.sqrt(values.length) : Number.NaN;
  const critical = tCritical(confidenceLevel, df);
  const margin = critical * se;

  return {
    mean: sampleMean,
    sd: sampleSd,
    se,
    df,
    critical,
    lower: sampleMean - margin,
    upper: sampleMean + margin,
    level: confidenceLevel,
  };
}

export function predictionInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  const result = confidenceInterval(values, confidenceLevel);
  const margin = result.critical * result.sd * Math.sqrt(1 + 1 / Math.max(1, values.length));
  return {
    ...result,
    lower: result.mean - margin,
    upper: result.mean + margin,
  };
}

export function toleranceInterval(values: number[], confidenceLevel = 0.95): IntervalResult {
  const result = confidenceInterval(values, confidenceLevel);
  const coverageFactor = confidenceLevel >= 0.99 ? 1.72 : confidenceLevel >= 0.95 ? 1.52 : 1.34;
  const samplePenalty = Math.sqrt(1 + 1 / Math.max(1, values.length));
  const margin = result.critical * result.sd * coverageFactor * samplePenalty;

  return {
    ...result,
    lower: result.mean - margin,
    upper: result.mean + margin,
  };
}
