const SQRT1_2 = Math.SQRT1_2;

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

export function biasToLog(relativeBiasPercent) {
  return Math.log(1 + Number(relativeBiasPercent) / 100);
}

export function gcvToSigma(gcvPercent) {
  return Math.log(1 + Number(gcvPercent) / 100);
}

export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(Number(z) * SQRT1_2));
}

export function effectiveGcvFromReplication(gcvPercent, runs = 1, replicatesPerRun = 1) {
  const n = Math.max(1, Number(runs) || 1) * Math.max(1, Number(replicatesPerRun) || 1);
  const sigma = gcvToSigma(gcvPercent);
  return (Math.exp(sigma / Math.sqrt(n)) - 1) * 100;
}

export function calculateOosRisk({
  lowerLimitPercent = 80,
  upperLimitPercent = 125,
  relativeBiasPercent = 0,
  gcvPercent = 10,
  runs = 1,
  replicatesPerRun = 1,
  useReplication = true
} = {}) {
  const lsl = Number(lowerLimitPercent) / 100;
  const usl = Number(upperLimitPercent) / 100;
  const effectiveGcvPercent = useReplication
    ? effectiveGcvFromReplication(gcvPercent, runs, replicatesPerRun)
    : Number(gcvPercent);
  const rbLog = biasToLog(relativeBiasPercent);
  const sigma = Math.max(gcvToSigma(effectiveGcvPercent), 1e-9);
  const zLower = (Math.log(lsl) - rbLog) / sigma;
  const zUpper = (Math.log(usl) - rbLog) / sigma;
  const lowerTail = normalCdf(zLower);
  const upperTail = 1 - normalCdf(zUpper);
  const probability = clamp(lowerTail + upperTail, 0, 1);

  return {
    lowerLimitPercent: Number(lowerLimitPercent),
    upperLimitPercent: Number(upperLimitPercent),
    relativeBiasPercent: Number(relativeBiasPercent),
    gcvPercent: Number(gcvPercent),
    effectiveGcvPercent,
    runs: Math.max(1, Number(runs) || 1),
    replicatesPerRun: Math.max(1, Number(replicatesPerRun) || 1),
    rbLog,
    sigma,
    zLower,
    zUpper,
    lowerTail,
    upperTail,
    probability
  };
}

export function calculateTailProbabilities(options = {}) {
  const result = calculateOosRisk(options);
  return {
    lowerTailProbability: result.lowerTail,
    upperTailProbability: result.upperTail,
    totalOosProbability: result.probability,
    dominantTail: getDominantTail(result.lowerTail, result.upperTail),
    result
  };
}

export function getDominantTail(lowerTailProbability = 0, upperTailProbability = 0, tolerance = 0.001) {
  const lower = Number(lowerTailProbability);
  const upper = Number(upperTailProbability);
  if (Math.abs(lower - upper) <= tolerance) return "Balanced";
  return upper > lower ? "Upper" : "Lower";
}

export function calculateBaselineComparison(options = {}) {
  const current = calculateOosRisk(options);
  const baseline = calculateOosRisk({ ...options, relativeBiasPercent: 0 });
  return {
    baseline,
    current,
    deltaProbability: current.probability - baseline.probability,
    deltaPercentagePoints: (current.probability - baseline.probability) * 100
  };
}

export function formatPercent(value, digits = 2) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function generateConceptMiniCurves(type = "accuracy") {
  const points = [];
  const density = (x, mu, sigma) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  for (let i = 0; i <= 48; i += 1) {
    const x = -3 + 6 * i / 48;
    if (type === "precision") {
      points.push({ x, narrow: density(x, 0, 0.75), wide: density(x, 0, 1.35) });
    } else if (type === "tails") {
      points.push({ x, curve: density(x, 0, 1), tail: x < -1.45 || x > 1.45 });
    } else {
      points.push({ x, left: density(x, -0.65, 0.9), right: density(x, 0.65, 0.9) });
    }
  }
  return points;
}

export function generateOosHeatmapData({
  lowerLimitPercent = 80,
  upperLimitPercent = 125,
  maxBiasPercent = 25,
  maxGcvPercent = 30,
  biasSteps = 50,
  gcvSteps = 50,
  runs = 1,
  replicatesPerRun = 1,
  useReplication = true
} = {}) {
  const cells = [];

  for (let yi = 0; yi <= gcvSteps; yi += 1) {
    const gcvPercent = 1 + (maxGcvPercent - 1) * yi / gcvSteps;
    for (let xi = 0; xi <= biasSteps; xi += 1) {
      const relativeBiasPercent = maxBiasPercent * xi / biasSteps;
      const risk = calculateOosRisk({
        lowerLimitPercent,
        upperLimitPercent,
        relativeBiasPercent,
        gcvPercent,
        runs,
        replicatesPerRun,
        useReplication
      });
      cells.push({
        x: relativeBiasPercent,
        y: gcvPercent,
        probability: risk.probability,
        lowerTail: risk.lowerTail,
        upperTail: risk.upperTail,
        dominantTail: getDominantTail(risk.lowerTail, risk.upperTail)
      });
    }
  }

  return {
    cells,
    biasSteps,
    gcvSteps,
    maxBiasPercent,
    maxGcvPercent
  };
}

export function findPrecisionBoundary({
  lowerLimitPercent = 80,
  upperLimitPercent = 125,
  targetProbability = 0.01,
  maxBiasPercent = 25,
  maxGcvPercent = 30,
  biasSteps = 80,
  runs = 1,
  replicatesPerRun = 1,
  useReplication = true
} = {}) {
  const points = [];

  for (let i = 0; i <= biasSteps; i += 1) {
    const relativeBiasPercent = maxBiasPercent * i / biasSteps;
    let low = 0.01;
    let high = maxGcvPercent;
    const minRisk = calculateOosRisk({
      lowerLimitPercent,
      upperLimitPercent,
      relativeBiasPercent,
      gcvPercent: low,
      runs,
      replicatesPerRun,
      useReplication
    }).probability;

    if (minRisk > targetProbability) {
      points.push({ biasPercent: relativeBiasPercent, gcvPercent: null, probability: minRisk });
      continue;
    }

    for (let j = 0; j < 34; j += 1) {
      const mid = (low + high) / 2;
      const risk = calculateOosRisk({
        lowerLimitPercent,
        upperLimitPercent,
        relativeBiasPercent,
        gcvPercent: mid,
        runs,
        replicatesPerRun,
        useReplication
      }).probability;
      if (risk <= targetProbability) low = mid;
      else high = mid;
    }

    points.push({
      biasPercent: relativeBiasPercent,
      gcvPercent: low,
      probability: calculateOosRisk({
        lowerLimitPercent,
        upperLimitPercent,
        relativeBiasPercent,
        gcvPercent: low,
        runs,
        replicatesPerRun,
        useReplication
      }).probability
    });
  }

  return points;
}
