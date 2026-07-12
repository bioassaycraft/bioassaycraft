import { chiSquareQuantile } from "./statistics.ts";

export type RsdConfidenceInput = {
  n: number;
  mean: number;
  sd: number;
  confidenceLevel: number;
};

export type RsdMethodStatus =
  | "success"
  | "invalid-input"
  | "unavailable"
  | "no-bracket"
  | "no-convergence"
  | "unbounded";

export type RsdMethodResult = {
  method: "naive" | "mckay" | "vangel" | "exact";
  status: RsdMethodStatus;
  lower: number | null;
  upper: number | null;
  warnings: string[];
  intermediateValues: Record<string, number>;
  iterations?: number;
  tolerance?: number;
  residual?: number;
};

export type ExactRsdIntervalResult = RsdMethodResult & {
  degreesOfFreedom: number | null;
  sampleCv: number | null;
  observedT: number | null;
  deltaLower: number | null;
  deltaUpper: number | null;
  cvLower: number | null;
  cvUpper: number | null;
  lowerTailProbability: number | null;
  upperTailProbability: number | null;
  converged: boolean;
};

export type RsdValidation = {
  valid: boolean;
  reason: "invalid-n" | "invalid-mean" | "invalid-sd" | "invalid-confidence" | null;
};

export type NoncentralTCdf = (t: number, df: number, noncentrality: number) => number;

const INVALID_METHOD = (method: RsdMethodResult["method"], status: RsdMethodStatus, warning: string): RsdMethodResult => ({
  method,
  status,
  lower: null,
  upper: null,
  warnings: [warning],
  intermediateValues: {},
});

export function validateRsdInput(input: RsdConfidenceInput): RsdValidation {
  if (!Number.isInteger(input.n) || input.n < 2 || input.n > 10000) {
    return { valid: false, reason: "invalid-n" };
  }
  if (!Number.isFinite(input.mean)) return { valid: false, reason: "invalid-mean" };
  if (!Number.isFinite(input.sd) || input.sd < 0) return { valid: false, reason: "invalid-sd" };
  if (!Number.isFinite(input.confidenceLevel) || input.confidenceLevel < 0.8 || input.confidenceLevel >= 1) {
    return { valid: false, reason: "invalid-confidence" };
  }
  return { valid: true, reason: null };
}

export function calculateObservedRsd(mean: number, sd: number) {
  return Number.isFinite(mean) && mean > 0 && Number.isFinite(sd) && sd >= 0 ? sd / mean : null;
}

function getSharedValues(input: RsdConfidenceInput) {
  const validation = validateRsdInput(input);
  if (!validation.valid || input.mean <= 0) return null;
  const k = calculateObservedRsd(input.mean, input.sd);
  if (k === null) return null;
  const df = input.n - 1;
  const alpha = 1 - input.confidenceLevel;
  const uLow = chiSquareQuantile(alpha / 2, df);
  const uHigh = chiSquareQuantile(1 - alpha / 2, df);
  return { k, df, alpha, uLow, uHigh };
}

export function calculateNaiveRsdCI(input: RsdConfidenceInput): RsdMethodResult {
  const values = getSharedValues(input);
  if (!values) return INVALID_METHOD("naive", "invalid-input", "RSD requires a finite positive sample mean.");
  const lower = values.k * Math.sqrt(values.df / values.uHigh);
  const upper = values.k * Math.sqrt(values.df / values.uLow);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return INVALID_METHOD("naive", "unavailable", "The chi-square calculation did not produce finite interval endpoints.");
  }
  return {
    method: "naive", status: "success", lower, upper, warnings: [],
    intermediateValues: values,
  };
}

function calculateApproximation(
  method: "mckay" | "vangel",
  input: RsdConfidenceInput,
): RsdMethodResult {
  const values = getSharedValues(input);
  if (!values) return INVALID_METHOD(method, "invalid-input", "RSD requires a finite positive sample mean.");
  const correction = method === "vangel" ? 2 : 0;
  const denominatorFor = (u: number) => (((u + correction) / input.n) - 1) * values.k ** 2 + u / values.df;
  const lowerDenominator = denominatorFor(values.uHigh);
  const upperDenominator = denominatorFor(values.uLow);
  if (!Number.isFinite(lowerDenominator) || !Number.isFinite(upperDenominator) || lowerDenominator <= 0 || upperDenominator <= 0) {
    return {
      ...INVALID_METHOD(method, "unavailable", "The approximation is outside its stable square-root domain for this input."),
      intermediateValues: { ...values, lowerDenominator, upperDenominator },
    };
  }
  const lower = values.k / Math.sqrt(lowerDenominator);
  const upper = values.k / Math.sqrt(upperDenominator);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return INVALID_METHOD(method, "unavailable", "The approximation did not produce finite interval endpoints.");
  }
  return {
    method, status: "success", lower, upper, warnings: [],
    intermediateValues: { ...values, lowerDenominator, upperDenominator },
  };
}

export function calculateMckayRsdCI(input: RsdConfidenceInput) {
  return calculateApproximation("mckay", input);
}

export function calculateVangelRsdCI(input: RsdConfidenceInput) {
  return calculateApproximation("vangel", input);
}

function solveNoncentrality(
  cdf: NoncentralTCdf,
  t: number,
  df: number,
  target: number,
  maxIterations = 96,
  tolerance = 1e-10,
) {
  const valueAt = (delta: number) => cdf(t, df, delta) - target;
  let low = 1e-12;
  let high = 1;
  let lowValue = valueAt(low);
  let highValue = valueAt(high);
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return { status: "invalid-input" as const };
  for (let expansion = 0; lowValue * highValue > 0 && expansion < 80; expansion += 1) {
    high *= 2;
    highValue = valueAt(high);
    if (!Number.isFinite(highValue)) return { status: "no-bracket" as const };
  }
  if (lowValue * highValue > 0) return { status: "unbounded" as const };
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const middle = (low + high) / 2;
    const middleValue = valueAt(middle);
    if (!Number.isFinite(middleValue)) return { status: "no-convergence" as const };
    if (Math.abs(middleValue) <= tolerance || Math.abs(high - low) <= tolerance * Math.max(1, middle)) {
      return { status: "success" as const, value: middle, iterations: iteration, residual: middleValue };
    }
    if (lowValue * middleValue > 0) {
      low = middle;
      lowValue = middleValue;
    } else {
      high = middle;
      highValue = middleValue;
    }
  }
  return { status: "no-convergence" as const };
}

function exactFailure(
  status: RsdMethodStatus,
  warning: string,
  values?: ReturnType<typeof getSharedValues>,
  observedT: number | null = null,
): ExactRsdIntervalResult {
  return {
    ...INVALID_METHOD("exact", status, warning),
    degreesOfFreedom: values?.df ?? null,
    sampleCv: values?.k ?? null,
    observedT,
    deltaLower: null,
    deltaUpper: null,
    cvLower: null,
    cvUpper: null,
    lowerTailProbability: values ? 1 - values.alpha / 2 : null,
    upperTailProbability: values ? values.alpha / 2 : null,
    converged: false,
  };
}

export function calculateExactRsdCI(input: RsdConfidenceInput, cdf: NoncentralTCdf): ExactRsdIntervalResult {
  const values = getSharedValues(input);
  if (!values || input.sd === 0) {
    if (values && input.sd === 0) {
      return {
        method: "exact", status: "success", lower: 0, upper: 0, warnings: [], intermediateValues: values,
        degreesOfFreedom: values.df, sampleCv: values.k, observedT: Number.POSITIVE_INFINITY,
        deltaLower: Number.POSITIVE_INFINITY, deltaUpper: Number.POSITIVE_INFINITY,
        cvLower: 0, cvUpper: 0, lowerTailProbability: 1 - values.alpha / 2,
        upperTailProbability: values.alpha / 2, converged: true, iterations: 0, tolerance: 1e-10, residual: 0,
      };
    }
    return exactFailure("invalid-input", "The exact method requires a finite positive sample mean.", values);
  }
  const observedT = Math.sqrt(input.n) * input.mean / input.sd;
  if (!Number.isFinite(observedT) || observedT <= 0) {
    return exactFailure("invalid-input", "The observed t value must be finite and positive.", values, observedT);
  }
  // F_nct(t_obs; δ) decreases as δ increases. Transforming CV = √n / δ reverses bounds.
  const deltaLower = solveNoncentrality(cdf, observedT, values.df, 1 - values.alpha / 2);
  const deltaUpper = solveNoncentrality(cdf, observedT, values.df, values.alpha / 2);
  if (deltaLower.status !== "success" || deltaUpper.status !== "success") {
    const status = deltaLower.status !== "success" ? deltaLower.status : deltaUpper.status;
    return {
      ...exactFailure(status, "The noncentral t inversion did not converge to finite bounds.", values, observedT),
      intermediateValues: { ...values, observedT },
    };
  }
  const lower = Math.sqrt(input.n) / deltaUpper.value;
  const upper = Math.sqrt(input.n) / deltaLower.value;
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || upper < lower) {
    return exactFailure("no-convergence", "The noncentral t inversion produced invalid interval endpoints.", values, observedT);
  }
  return {
    method: "exact", status: "success", lower, upper, warnings: [],
    intermediateValues: { ...values, observedT, deltaLower: deltaLower.value, deltaUpper: deltaUpper.value },
    degreesOfFreedom: values.df,
    sampleCv: values.k,
    observedT,
    deltaLower: deltaLower.value,
    deltaUpper: deltaUpper.value,
    cvLower: lower,
    cvUpper: upper,
    lowerTailProbability: 1 - values.alpha / 2,
    upperTailProbability: values.alpha / 2,
    converged: true,
    iterations: deltaLower.iterations + deltaUpper.iterations,
    tolerance: 1e-10,
    residual: Math.max(Math.abs(deltaLower.residual), Math.abs(deltaUpper.residual)),
  };
}

export type RsdRecommendation = { key: "not-recommended" | "mean-unstable" | "exact" | "exact-vangel" | "vangel" | "tiny-sample"; stars: number };

export function getRsdRecommendation(input: RsdConfidenceInput): RsdRecommendation {
  const base = validateRsdInput(input);
  if (!base.valid || input.mean <= 0) return { key: "not-recommended", stars: 1 };
  if (input.n === 2) return { key: "tiny-sample", stars: 2 };
  if (input.mean <= 2 * input.sd) return { key: "mean-unstable", stars: 2 };
  const k = input.sd / input.mean;
  if (k >= 0.33) return { key: "exact", stars: 3 };
  if (input.n < 10) return { key: "exact-vangel", stars: 4 };
  return { key: "vangel", stars: 5 };
}
