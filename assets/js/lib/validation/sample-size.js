const EPS = 1e-12;

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

export function normalQuantile(p) {
  const q = clamp(p, EPS, 1 - EPS);
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (q < plow) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }

  if (q > phigh) {
    const r = Math.sqrt(-2 * Math.log(1 - q));
    return -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }

  const r = q - 0.5;
  const s = r * r;
  return (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r /
    (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
}

export function inverseTDistribution(p, df) {
  const nu = Math.max(1, Number(df));
  const z = normalQuantile(p);
  const z2 = z * z;
  const z3 = z2 * z;
  const z5 = z3 * z2;
  const z7 = z5 * z2;
  const z9 = z7 * z2;
  return z +
    (z3 + z) / (4 * nu) +
    (5 * z5 + 16 * z3 + 3 * z) / (96 * nu * nu) +
    (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * nu ** 3) +
    (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * nu ** 4);
}

export function logGamma(z) {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019571e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);

  let x = 0.99999999999980993;
  const t = z + 6.5;
  for (let i = 0; i < p.length; i += 1) x += p[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
}

export function regularizedGammaP(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 120; n += 1) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }

  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 120; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

export function chiSquareCdf(x, df) {
  return regularizedGammaP(Math.max(1, df) / 2, Math.max(0, x) / 2);
}

export function chiSquareQuantile(p, df) {
  const nu = Math.max(1, Number(df));
  const z = normalQuantile(p);
  const guess = nu * (1 - 2 / (9 * nu) + z * Math.sqrt(2 / (9 * nu))) ** 3;
  let low = 0;
  let high = Math.max(guess * 2, nu + 10 * Math.sqrt(2 * nu), 1);
  while (chiSquareCdf(high, nu) < p) high *= 2;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (chiSquareCdf(mid, nu) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function accuracyIteration({
  numeratorSigma,
  denominator,
  alpha,
  beta,
  maxN = 300
}) {
  const rows = [];
  for (let n = 2; n <= maxN; n += 1) {
    const df = n - 1;
    const tConfidence = inverseTDistribution(1 - alpha, df);
    const tPower = inverseTDistribution(1 - beta / 2, df);
    const leftSide = n;
    const rightSide = ((tConfidence + tPower) ** 2 * numeratorSigma ** 2) / (denominator ** 2);
    const pass = leftSide >= rightSide;
    rows.push({ n, df, tConfidence, tPower, leftSide, rightSide, pass });
    if (pass) return { n, rows };
  }
  return { n: null, rows };
}

export function calculateChp9401SampleSize({
  acrbPercent = 12,
  acovPercent = 12,
  confidenceLevel = 0.95,
  power = 0.95
} = {}) {
  const alpha = 1 - Number(confidenceLevel);
  const beta = 1 - Number(power);
  const numeratorSigma = Math.log(1 + Number(acovPercent) / 100);
  const denominator = Math.log(1 + Number(acrbPercent) / 100);
  const result = accuracyIteration({ numeratorSigma, denominator, alpha, beta });
  return {
    mode: "chp9401",
    ...result,
    alpha,
    beta,
    numeratorSigma,
    denominator,
    formula: "ChP 9401 Formula 25"
  };
}

export function calculateUspAccuracySampleSize({
  rbAcceptancePercent = 12,
  trueRbPercent = 1,
  trueGcvPercent = 7,
  confidenceLevel = 0.95,
  power = 0.95
} = {}) {
  const alpha = 1 - Number(confidenceLevel);
  const beta = 1 - Number(power);
  const numeratorSigma = Math.log(1 + Number(trueGcvPercent) / 100);
  const denominator = Math.log(1 + Number(rbAcceptancePercent) / 100) - Math.log(1 + Number(trueRbPercent) / 100);
  const result = accuracyIteration({ numeratorSigma, denominator, alpha, beta });
  return {
    mode: "uspAccuracy",
    ...result,
    alpha,
    beta,
    numeratorSigma,
    denominator,
    formula: "USP <1033> relative accuracy"
  };
}

export function calculateUspPrecisionSampleSize({
  levels = 5,
  gcvAcceptancePercent = 11,
  trueGcvPercent = 7,
  confidenceLevel = 0.95,
  power = 0.8,
  maxN = 300
} = {}) {
  const alpha = 1 - Number(confidenceLevel);
  const sigmaAcceptance = Math.log(1 + Number(gcvAcceptancePercent) / 100);
  const sigmaTrue = Math.log(1 + Number(trueGcvPercent) / 100);
  const rows = [];

  for (let n = 2; n <= maxN; n += 1) {
    const df = n - 1;
    const chiLower = chiSquareQuantile(alpha, df);
    const threshold = chiLower * (sigmaAcceptance ** 2) / (sigmaTrue ** 2);
    const achievedPower = chiSquareCdf(threshold, df);
    const pass = achievedPower >= power;
    rows.push({ n, df, chiLower, threshold, leftSide: achievedPower, rightSide: power, pass });
    if (pass) {
      return {
        mode: "uspPrecision",
        n,
        rows,
        alpha,
        beta: 1 - Number(power),
        sigmaAcceptance,
        sigmaTrue,
        perLevelPower: achievedPower,
        overallPassProbability: calculateOverallPassProbability(achievedPower, levels),
        formula: "USP <1033> precision-driven chi-square"
      };
    }
  }

  return { mode: "uspPrecision", n: null, rows, alpha, beta: 1 - Number(power), sigmaAcceptance, sigmaTrue, formula: "USP <1033> precision-driven chi-square" };
}

export function calculateOverallPassProbability(perLevelPower, levels = 5) {
  return clamp(perLevelPower, 0, 1) ** Math.max(1, Number(levels) || 1);
}

export function calculateRequiredN({
  mode = "chp9401",
  acrbPercent = 12,
  acovPercent = 12,
  rbAcceptancePercent = acrbPercent,
  trueRbPercent = 1,
  trueGcvPercent = acovPercent,
  levels = 5,
  gcvAcceptancePercent = 11,
  trueGcvPrecisionPercent = 7,
  confidenceLevel = 0.95,
  power = mode === "uspPrecision" ? 0.8 : 0.95
} = {}) {
  if (mode === "uspPrecision") {
    return calculateUspPrecisionSampleSize({
      levels,
      gcvAcceptancePercent,
      trueGcvPercent: trueGcvPrecisionPercent,
      confidenceLevel,
      power
    });
  }

  if (mode === "uspAccuracy" || mode === "unified") {
    return calculateUspAccuracySampleSize({
      rbAcceptancePercent,
      trueRbPercent,
      trueGcvPercent,
      confidenceLevel,
      power
    });
  }

  return calculateChp9401SampleSize({
    acrbPercent,
    acovPercent,
    confidenceLevel,
    power
  });
}

export function generateFirstPassLadder(result, span = 4) {
  const rows = result?.rows || [];
  const passIndex = rows.findIndex((row) => row.pass);
  const center = passIndex >= 0 ? passIndex : rows.length - 1;
  const start = Math.max(0, center - span);
  const end = Math.min(rows.length, center + span + 1);
  return {
    firstAcceptableN: passIndex >= 0 ? rows[passIndex].n : null,
    steps: rows.slice(start, end).map((row) => ({
      n: row.n,
      pass: row.pass,
      firstPass: passIndex >= 0 && row.n === rows[passIndex].n,
      leftSide: row.leftSide,
      rightSide: row.rightSide
    }))
  };
}

function nForBoundary({
  mode,
  accuracyPercent,
  precisionPercent,
  trueRbPercent = 1,
  levels = 5,
  confidenceLevel = 0.95,
  power = 0.95
}) {
  if (mode === "uspPrecision") {
    return calculateUspPrecisionSampleSize({
      levels,
      gcvAcceptancePercent: accuracyPercent,
      trueGcvPercent: precisionPercent,
      confidenceLevel,
      power
    }).n;
  }

  return calculateRequiredN({
    mode,
    acrbPercent: accuracyPercent,
    acovPercent: precisionPercent,
    rbAcceptancePercent: accuracyPercent,
    trueRbPercent: mode === "chp9401" ? 0 : trueRbPercent,
    trueGcvPercent: precisionPercent,
    levels,
    confidenceLevel,
    power
  }).n;
}

export function solveSupportedAccuracyCriterion({
  mode = "chp9401",
  completedN = 16,
  fixedPrecisionPercent = 12,
  trueRbPercent = 1,
  levels = 5,
  confidenceLevel = 0.95,
  power = mode === "uspPrecision" ? 0.8 : 0.95,
  min = 1,
  max = 50,
  iterations = 56
} = {}) {
  const nMax = nForBoundary({
    mode,
    accuracyPercent: max,
    precisionPercent: fixedPrecisionPercent,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  });
  if (!nMax || nMax > completedN) return { value: null, supported: false, requiredNAtBoundary: nMax };

  const nMin = nForBoundary({
    mode,
    accuracyPercent: min,
    precisionPercent: fixedPrecisionPercent,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  });
  if (nMin && nMin <= completedN) return { value: min, supported: true, requiredNAtBoundary: nMin };

  let low = min;
  let high = max;
  let requiredNAtBoundary = nMax;
  for (let i = 0; i < iterations; i += 1) {
    const mid = (low + high) / 2;
    const requiredN = nForBoundary({
      mode,
      accuracyPercent: mid,
      precisionPercent: fixedPrecisionPercent,
      trueRbPercent,
      levels,
      confidenceLevel,
      power
    });
    requiredNAtBoundary = requiredN;
    if (requiredN && requiredN <= completedN) high = mid;
    else low = mid;
  }

  return {
    value: high,
    supported: true,
    requiredNAtBoundary
  };
}

export function solveSupportedPrecisionCriterion({
  mode = "chp9401",
  completedN = 16,
  fixedAccuracyPercent = 12,
  trueRbPercent = 1,
  levels = 5,
  confidenceLevel = 0.95,
  power = mode === "uspPrecision" ? 0.8 : 0.95,
  min = 1,
  max = 50,
  iterations = 56
} = {}) {
  const nMin = nForBoundary({
    mode,
    accuracyPercent: fixedAccuracyPercent,
    precisionPercent: min,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  });
  if (!nMin || nMin > completedN) return { value: null, supported: false, requiredNAtBoundary: nMin };

  const nMax = nForBoundary({
    mode,
    accuracyPercent: fixedAccuracyPercent,
    precisionPercent: max,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  });
  if (nMax && nMax <= completedN) return { value: max, supported: true, requiredNAtBoundary: nMax };

  let low = min;
  let high = max;
  let requiredNAtBoundary = nMin;
  for (let i = 0; i < iterations; i += 1) {
    const mid = (low + high) / 2;
    const requiredN = nForBoundary({
      mode,
      accuracyPercent: fixedAccuracyPercent,
      precisionPercent: mid,
      trueRbPercent,
      levels,
      confidenceLevel,
      power
    });
    requiredNAtBoundary = requiredN;
    if (requiredN && requiredN <= completedN) low = mid;
    else high = mid;
  }

  return {
    value: low,
    supported: true,
    requiredNAtBoundary
  };
}

export function generateCapabilityEnvelope({
  mode = "chp9401",
  completedN = 16,
  trueRbPercent = 1,
  levels = 5,
  confidenceLevel = 0.95,
  power = mode === "uspPrecision" ? 0.8 : 0.95,
  accuracyRange = [1, 50],
  precisionRange = [1, 50],
  accuracySteps = 36,
  precisionSteps = 32
} = {}) {
  const points = [];
  for (let row = 0; row <= precisionSteps; row += 1) {
    const precisionPercent = precisionRange[0] + (precisionRange[1] - precisionRange[0]) * row / precisionSteps;
    for (let col = 0; col <= accuracySteps; col += 1) {
      const accuracyPercent = accuracyRange[0] + (accuracyRange[1] - accuracyRange[0]) * col / accuracySteps;
      const requiredN = nForBoundary({
        mode,
        accuracyPercent,
        precisionPercent,
        trueRbPercent,
        levels,
        confidenceLevel,
        power
      });
      points.push({
        accuracyPercent,
        precisionPercent,
        requiredN,
        supported: Boolean(requiredN && requiredN <= completedN)
      });
    }
  }

  return {
    accuracyRange,
    precisionRange,
    accuracySteps,
    precisionSteps,
    completedN,
    points
  };
}

export function calculateLocalSensitivity({
  mode = "chp9401",
  acrbPercent = 12,
  acovPercent = 12,
  trueRbPercent = 1,
  levels = 5,
  gcvAcceptancePercent = 11,
  trueGcvPrecisionPercent = 7,
  confidenceLevel = 0.95,
  power = mode === "uspPrecision" ? 0.8 : 0.95
} = {}) {
  const base = calculateRequiredN({
    mode,
    acrbPercent,
    acovPercent,
    rbAcceptancePercent: acrbPercent,
    trueRbPercent,
    trueGcvPercent: acovPercent,
    levels,
    gcvAcceptancePercent,
    trueGcvPrecisionPercent,
    confidenceLevel,
    power
  }).n || 0;
  const accuracyDown = Math.max(1, (mode === "uspPrecision" ? gcvAcceptancePercent : acrbPercent) - 1);
  const accuracyUp = Math.min(50, (mode === "uspPrecision" ? gcvAcceptancePercent : acrbPercent) + 1);
  const precisionDown = Math.max(1, (mode === "uspPrecision" ? trueGcvPrecisionPercent : acovPercent) - 1);
  const precisionUp = Math.min(50, (mode === "uspPrecision" ? trueGcvPrecisionPercent : acovPercent) + 1);

  const nAccuracyDown = nForBoundary({
    mode,
    accuracyPercent: accuracyDown,
    precisionPercent: mode === "uspPrecision" ? trueGcvPrecisionPercent : acovPercent,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  }) || base;
  const nAccuracyUp = nForBoundary({
    mode,
    accuracyPercent: accuracyUp,
    precisionPercent: mode === "uspPrecision" ? trueGcvPrecisionPercent : acovPercent,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  }) || base;
  const nPrecisionDown = nForBoundary({
    mode,
    accuracyPercent: mode === "uspPrecision" ? gcvAcceptancePercent : acrbPercent,
    precisionPercent: precisionDown,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  }) || base;
  const nPrecisionUp = nForBoundary({
    mode,
    accuracyPercent: mode === "uspPrecision" ? gcvAcceptancePercent : acrbPercent,
    precisionPercent: precisionUp,
    trueRbPercent,
    levels,
    confidenceLevel,
    power
  }) || base;
  const nPowerUp = calculateRequiredN({
    mode,
    acrbPercent,
    acovPercent,
    rbAcceptancePercent: acrbPercent,
    trueRbPercent,
    trueGcvPercent: acovPercent,
    levels,
    gcvAcceptancePercent,
    trueGcvPrecisionPercent,
    confidenceLevel,
    power: Math.min(0.99, power + 0.05)
  }).n || base;

  const drivers = [
    { key: "precision", label: "Precision assumption", score: Math.abs(nPrecisionUp - nPrecisionDown), detail: `+/-1% precision changes required n from ${nPrecisionDown} to ${nPrecisionUp}.` },
    { key: "accuracy", label: "Accuracy margin", score: Math.abs(nAccuracyDown - nAccuracyUp), detail: `+/-1% accuracy criterion changes required n from ${nAccuracyDown} to ${nAccuracyUp}.` },
    { key: "power", label: "Power requirement", score: Math.abs(nPowerUp - base), detail: `Raising power by 5 percentage points changes required n from ${base} to ${nPowerUp}.` }
  ].sort((a, b) => b.score - a.score);

  return {
    baseN: base,
    mainDriver: drivers[0],
    drivers,
    values: {
      nAccuracyDown,
      nAccuracyUp,
      nPrecisionDown,
      nPrecisionUp,
      nPowerUp
    }
  };
}

export function generateSensitivityCurve({
  mode = "chp9401",
  variable = "precision",
  points = 50,
  params = {}
} = {}) {
  const values = [];
  const range = variable === "accuracy" ? [4, 25] : [2, 25];

  for (let i = 0; i <= points; i += 1) {
    const value = range[0] + (range[1] - range[0]) * i / points;
    let result;
    if (mode === "chp9401") {
      result = calculateChp9401SampleSize({
        acrbPercent: variable === "accuracy" ? value : params.acrbPercent,
        acovPercent: variable === "precision" ? value : params.acovPercent,
        confidenceLevel: params.confidenceLevel,
        power: params.power
      });
    } else if (mode === "uspPrecision") {
      result = calculateUspPrecisionSampleSize({
        levels: params.levels,
        gcvAcceptancePercent: variable === "accuracy" ? value : params.gcvAcceptancePercent,
        trueGcvPercent: variable === "precision" ? value : params.trueGcvPercent,
        confidenceLevel: params.confidenceLevel,
        power: params.power
      });
    } else {
      result = calculateUspAccuracySampleSize({
        rbAcceptancePercent: variable === "accuracy" ? value : params.rbAcceptancePercent,
        trueRbPercent: params.trueRbPercent,
        trueGcvPercent: variable === "precision" ? value : params.trueGcvPercent,
        confidenceLevel: params.confidenceLevel,
        power: params.power
      });
    }
    values.push({ x: value, n: result.n, result });
  }

  return values;
}
