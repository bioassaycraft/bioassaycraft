const round = (value, digits = 3) => Number(value.toFixed(digits));

const signed = (value, digits = 2) => {
  const rounded = round(Math.abs(value), digits);
  return value < 0 ? `- ${rounded}` : `+ ${rounded}`;
};

const sum = (values) => values.reduce((total, value) => total + value, 0);

const mean = (values) => sum(values) / values.length;

const logGamma = (value) => {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const z = value - 1;
  let x = 0.9999999999998099;
  coefficients.forEach((coefficient, index) => {
    x += coefficient / (z + index + 1);
  });
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
};

const betaContinuedFraction = (x, a, b) => {
  const maxIterations = 120;
  const epsilon = 3e-8;
  const fpMin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
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
    if (Math.abs(del - 1) < epsilon) break;
  }

  return h;
};

const regularizedBeta = (x, a, b) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const betaTerm = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (betaTerm * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (betaTerm * betaContinuedFraction(1 - x, b, a)) / b;
};

const fSurvival = (fValue, df1, df2) => {
  if (!Number.isFinite(fValue) || fValue < 0 || df1 <= 0 || df2 <= 0) return null;
  const x = (df1 * fValue) / (df1 * fValue + df2);
  return Math.max(0, Math.min(1, 1 - regularizedBeta(x, df1 / 2, df2 / 2)));
};

const formatPValue = (pValue) => {
  if (pValue === null) return "";
  if (pValue < 0.0001) return "<0.0001";
  return pValue.toFixed(4);
};

export const defaultAnovaParameters = {
  seed: 7,
  pureError: 1,
  interceptShift: 1,
  slopeShift: 1,
  nonlinearity: 0.65,
  fourPlDifference: 1,
};

const createRandom = (seed) => {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const normalNoise = (random, scale) => {
  const u1 = Math.max(random(), 1e-9);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * scale;
};

const groupKey = (point) => `${point.group}:${point.x}`;

const gaussianSolve = (matrix, vector) => {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(a[row][pivot]) > Math.abs(a[maxRow][pivot])) {
        maxRow = row;
      }
    }

    [a[pivot], a[maxRow]] = [a[maxRow], a[pivot]];

    const pivotValue = a[pivot][pivot] || 1e-9;
    for (let col = pivot; col <= n; col += 1) {
      a[pivot][col] /= pivotValue;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = a[row][pivot];
      for (let col = pivot; col <= n; col += 1) {
        a[row][col] -= factor * a[pivot][col];
      }
    }
  }

  return a.map((row) => row[n]);
};

const fitLinearModel = (points, featureBuilder) => {
  const design = points.map(featureBuilder);
  const size = design[0].length;
  const xtx = Array.from({ length: size }, () => Array(size).fill(0));
  const xty = Array(size).fill(0);

  design.forEach((features, rowIndex) => {
    features.forEach((left, i) => {
      xty[i] += left * points[rowIndex].y;
      features.forEach((right, j) => {
        xtx[i][j] += left * right;
      });
    });
  });

  const coefficients = gaussianSolve(xtx, xty);
  const predict = (point) =>
    sum(featureBuilder(point).map((feature, index) => feature * coefficients[index]));

  return {
    coefficients,
    predict,
    predictions: points.map((point) => predict(point)),
  };
};

const cellMeans = (points) => {
  const cells = new Map();
  points.forEach((point) => {
    const key = groupKey(point);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(point.y);
  });

  return new Map([...cells.entries()].map(([key, values]) => [key, mean(values)]));
};

const ssPureError = (points) => {
  const means = cellMeans(points);
  return sum(points.map((point) => (point.y - means.get(groupKey(point))) ** 2));
};

const ssTotal = (points) => {
  const grandMean = mean(points.map((point) => point.y));
  return sum(points.map((point) => (point.y - grandMean) ** 2));
};

const sseForPredict = (points, predict) =>
  sum(points.map((point) => (point.y - predict(point)) ** 2));

const modelLines = (groups, xDomain, predict, curve = false) => {
  const [minX, maxX] = xDomain;
  const count = curve ? 80 : 2;
  return groups.map((group) => ({
    group,
    values: Array.from({ length: count }, (_, index) => {
      const x = minX + ((maxX - minX) * index) / (count - 1);
      return {
        x,
        y: predict({ x, group }),
      };
    }),
  }));
};

const residuals = (points, predict) =>
  points.map((point) => ({
    id: point.id,
    x: point.x,
    y: point.y,
    predicted: predict(point),
    group: point.group,
  }));

const anovaRow = ({ key, ss, df, denominator = null, expected = "", highlight = false }) => {
  const safeSs = Math.max(0, ss);
  const ms = safeSs / df;
  const denominatorMs = denominator ? denominator.ss / denominator.df : null;
  const fValue = denominatorMs ? ms / denominatorMs : null;
  const pValue = fValue === null ? null : fSurvival(fValue, df, denominator.df);
  return {
    key,
    trueSS: safeSs,
    ss: round(safeSs),
    df,
    ms: round(ms),
    f: fValue === null ? null : round(fValue, 2),
    pValue: formatPValue(pValue),
    expected,
    highlight,
  };
};

const totalRow = (ss, df, expected = "") => ({
  key: "total",
  trueSS: ss,
  ss: round(ss),
  df,
  ms: null,
  f: null,
  pValue: "",
  expected,
  highlight: false,
});

const highlightRows = (rows, activeTerm) =>
  rows.map((row) => ({
    ...row,
    highlight: row.key === activeTerm,
  }));

const tableRows = (rows, total) => [total, ...rows];

const ssComponent = ({ key, value, id = key, parts = [id] }) => ({
  key,
  id,
  value: Math.max(0, value),
  parts,
});

const layers = (rows) =>
  rows.map((row, index) => ({
    id: `layer-${index}`,
    equation: row.equation,
    scaleGroup: row.scaleGroup || "default",
    components: row.components,
  }));

const generateSinglePoints = (params) => {
  const random = createRandom(params.seed + 11);
  return [1, 2, 3, 4, 5].flatMap((x, doseIndex) =>
    [0, 1, 2].map((repeat) => {
      const curvature = params.nonlinearity * 0.55 * (x - 3) ** 2;
      const y = 12 + 7.6 * x + curvature + normalNoise(random, params.pureError * 0.65);
      return { id: `single-${doseIndex}-${repeat}`, x, y, group: "sample" };
    }),
  );
};

const generateSraPoints = (params) => {
  const random = createRandom(params.seed + 29);
  return ["standard", "test"].flatMap((group) =>
    [1, 2, 3, 4, 5].flatMap((x, doseIndex) =>
      [0, 1].map((repeat) => {
        const isTest = group === "test";
        const intercept = 8 + (isTest ? params.interceptShift * 2.7 : 0);
        const slope = isTest ? 9.4 - params.slopeShift * 1.7 : 10.8;
        const curve = params.nonlinearity * (isTest ? 0.42 : 0.3) * (x - 3) ** 2;
        const y = intercept + slope * x + curve + normalNoise(random, params.pureError * 0.7);
        return { id: `sra-${group}-${doseIndex}-${repeat}`, group, x, y };
      }),
    ),
  );
};

const generatePlaPoints = (params) => {
  const random = createRandom(params.seed + 43);
  return ["standard", "test"].flatMap((group) =>
    [1, 2, 4, 8, 16].flatMap((dose, doseIndex) =>
      [0, 1].map((repeat) => {
        const x = Math.log(dose);
        const isTest = group === "test";
        const intercept = 23 + (isTest ? 8.5 : 0);
        const slope = 15.2 + (isTest ? params.slopeShift * 3.1 : 0);
        const curve = params.nonlinearity * 1.8 * (x - Math.log(4)) ** 2;
        const y = intercept + slope * x + curve + normalNoise(random, params.pureError * 0.85);
        return { id: `pla-${group}-${doseIndex}-${repeat}`, group, dose, x, y };
      }),
    ),
  );
};

const fourPl = (x, bottom, top, ec50, hill) => bottom + (top - bottom) / (1 + (ec50 / x) ** hill);

const generateFourPlPoints = (params) => {
  const random = createRandom(params.seed + 61);
  return [0.015, 0.03, 0.07, 0.15, 0.32, 0.7, 1.4, 2.8, 5.8, 12, 25, 52].flatMap(
    (concentration, doseIndex) =>
      ["standard", "test"].flatMap((group) =>
        [0, 1].map((repeat) => {
          const isTest = group === "test";
          const diff = params.fourPlDifference;
          const modelParams = isTest
            ? [7.5 + diff * 1.1, 101 - diff * 3.2, 1.65 + diff * 0.62, 1.2 - diff * 0.08]
            : [7, 103, 1.45, 1.25];
          return {
            id: `fourpl-${group}-${doseIndex}-${repeat}`,
            group,
            concentration,
            x: Math.log(concentration),
            y: fourPl(concentration, ...modelParams) + normalNoise(random, params.pureError * 0.9),
          };
        }),
      ),
  );
};

const enrichScene = ({
  module,
  step,
  points,
  predict,
  lines,
  ssLayers,
  anovaRows,
  equation,
  activeTerm,
  chartDomain,
  xAxisKey = "dose",
  changeKey = activeTerm,
  formula = null,
}) => ({
  module,
  step,
  points,
  residuals: residuals(points, predict),
  lines,
  ssLayers,
  anovaRows,
  equation,
  activeTerm,
  chartDomain: chartDomain || {
    x: [
      Math.min(...points.map((point) => point.x)) - 0.3,
      Math.max(...points.map((point) => point.x)) + 0.3,
    ],
    y: [
      Math.min(...points.map((point) => point.y)) - 6,
      Math.max(...points.map((point) => point.y)) + 6,
    ],
  },
  xAxisKey,
  changeKey,
  formula,
});

const singleScenes = (params) => {
  const points = generateSinglePoints(params);
  const total = ssTotal(points);
  const pure = ssPureError(points);
  const treatment = total - pure;
  const grandMean = mean(points.map((point) => point.y));
  const meanPredict = () => grandMean;
  const linear = fitLinearModel(points, (point) => [1, point.x]);
  const sseLinear = sseForPredict(points, linear.predict);
  const regression = total - sseLinear;
  const lof = sseLinear - pure;
  const xDomain = [0.8, 5.2];
  const chartDomain = { x: [0.7, 5.3], y: [12, 56] };
  const denominator = { ss: pure, df: points.length - 5 };
  const regressionDenominator = { ss: sseLinear, df: points.length - 2 };
  const fullRows = tableRows(
    [
      anovaRow({
        key: "regression",
        ss: regression,
        df: 1,
        denominator: regressionDenominator,
        expected: "significant",
      }),
      anovaRow({
        key: "lackOfFit",
        ss: lof,
        df: 3,
        denominator,
        expected: "notSignificant",
      }),
      anovaRow({ key: "pureError", ss: pure, df: denominator.df }),
    ],
    totalRow(total, points.length - 1),
  );

  const baseLayers = layers([
    {
      equation: "SS_Total = SS_Treatment + SS_Pure error",
      components: [
        ssComponent({ key: "treatment", value: treatment, parts: ["regression", "lof"] }),
        ssComponent({ key: "pureError", value: pure }),
      ],
    },
  ]);
  const linearLayers = layers([
    {
      equation: "SS_Total = SS_Treatment + SS_Pure error",
      components: [
        ssComponent({ key: "treatment", value: treatment, parts: ["regression", "lof"] }),
        ssComponent({ key: "pureError", value: pure }),
      ],
    },
    {
      equation: "SS_Total = SS_Regression + SS_Lack-of-fit + SS_Pure error",
      components: [
        ssComponent({ key: "regression", value: regression }),
        ssComponent({ key: "lackOfFit", id: "lof", value: lof }),
        ssComponent({ key: "pureError", value: pure }),
      ],
    },
  ]);

  const line = modelLines(["sample"], xDomain, linear.predict);
  const meanLine = modelLines(["sample"], xDomain, meanPredict);

  return {
    mean: enrichScene({
      module: "single",
      step: "mean",
      points,
      predict: meanPredict,
      lines: meanLine,
      ssLayers: baseLayers,
      anovaRows: highlightRows(fullRows, "treatment"),
      equation: "y = μ + ε",
      activeTerm: "treatment",
      chartDomain,
      xAxisKey: "dose",
      changeKey: "treatment",
    }),
    linear: enrichScene({
      module: "single",
      step: "linear",
      points,
      predict: linear.predict,
      lines: line,
      ssLayers: linearLayers,
      anovaRows: highlightRows(fullRows, "regression"),
      equation: `ŷ = ${round(linear.coefficients[0], 2)} ${signed(linear.coefficients[1])}x`,
      activeTerm: "regression",
      chartDomain,
      xAxisKey: "dose",
      changeKey: "regression",
    }),
    regression: enrichScene({
      module: "single",
      step: "regression",
      points,
      predict: linear.predict,
      lines: line,
      ssLayers: linearLayers,
      anovaRows: highlightRows(fullRows, "regression"),
      equation: `H₀: β₁ = 0; fitted β₁ = ${round(linear.coefficients[1], 2)}`,
      activeTerm: "regression",
      chartDomain,
      xAxisKey: "dose",
      changeKey: "regression",
    }),
    lof: enrichScene({
      module: "single",
      step: "lof",
      points,
      predict: linear.predict,
      lines: line,
      ssLayers: linearLayers,
      anovaRows: highlightRows(fullRows, "lackOfFit"),
      equation: `ŷ = ${round(linear.coefficients[0], 2)} ${signed(linear.coefficients[1])}x; SS_Residual = LOF + Pure`,
      activeTerm: "lackOfFit",
      chartDomain,
      xAxisKey: "dose",
      changeKey: "lackOfFit",
    }),
  };
};

const sraScenes = (params) => {
  const points = generateSraPoints(params);
  const total = ssTotal(points);
  const pure = ssPureError(points);
  const treatment = total - pure;
  const grandMean = mean(points.map((point) => point.y));
  const common = fitLinearModel(points, (point) => [
    1,
    point.group === "standard" ? point.x : 0,
    point.group === "test" ? point.x : 0,
  ]);
  const separate = fitLinearModel(points, (point) => [
    1,
    point.group === "test" ? 1 : 0,
    point.group === "standard" ? point.x : 0,
    point.group === "test" ? point.x : 0,
  ]);
  const curved = fitLinearModel(points, (point) => [
    1,
    point.group === "test" ? 1 : 0,
    point.group === "standard" ? point.x : 0,
    point.group === "test" ? point.x : 0,
    point.group === "standard" ? point.x ** 2 : 0,
    point.group === "test" ? point.x ** 2 : 0,
  ]);

  const sseCommon = sseForPredict(points, common.predict);
  const sseSeparate = sseForPredict(points, separate.predict);
  const sseCurved = sseForPredict(points, curved.predict);
  const regression = total - sseCommon;
  const intersection = sseCommon - sseSeparate;
  const nonlinearity = sseSeparate - sseCurved;
  const lof1 = sseCommon - pure;
  const lof2 = sseSeparate - pure;
  const lof3 = sseCurved - pure;
  const denominator = { ss: pure, df: points.length - 10 };
  const fullRows = tableRows(
    [
      anovaRow({
        key: "regression",
        ss: regression,
        df: 2,
        denominator,
        expected: "significant",
      }),
      anovaRow({
        key: "intersection",
        ss: intersection,
        df: 1,
        denominator,
        expected: "notSignificant",
      }),
      anovaRow({
        key: "nonlinearity",
        ss: nonlinearity,
        df: 2,
        denominator,
        expected: "notSignificant",
      }),
      anovaRow({ key: "lackOfFit", ss: lof3, df: 4, denominator, expected: "notSignificant" }),
      anovaRow({ key: "pureError", ss: pure, df: denominator.df }),
    ],
    totalRow(total, points.length - 1),
  );
  const xDomain = [0.8, 5.2];
  const chartDomain = { x: [0.7, 5.3], y: [8, 70] };

  const treatmentLayer = {
    equation: "SS_Total = SS_Treatment + SS_Pure error",
    components: [
      ssComponent({
        key: "treatment",
        value: treatment,
        parts: ["regression", "intersection", "nonlinearity", "lof3"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const regressionLayer = {
    equation: "SS_Total = SS_Regression + SS_Lack-of-fit-1 + SS_Pure error",
    components: [
      ssComponent({ key: "regression", value: regression }),
      ssComponent({
        key: "lackOfFit",
        id: "lof1",
        value: lof1,
        parts: ["intersection", "nonlinearity", "lof3"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const intersectionLayer = {
    equation: "SS_Total = SS_Regression + SS_Intersection + SS_Lack-of-fit-2 + SS_Pure error",
    components: [
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "intersection", value: intersection }),
      ssComponent({
        key: "lackOfFit",
        id: "lof2",
        value: lof2,
        parts: ["nonlinearity", "lof3"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const curvedLayer = {
    equation:
      "SS_Total = SS_Regression + SS_Intersection + SS_Non-linearity + SS_Lack-of-fit-3 + SS_Pure error",
    components: [
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "intersection", value: intersection }),
      ssComponent({ key: "nonlinearity", value: nonlinearity }),
      ssComponent({ key: "lackOfFit", id: "lof3", value: lof3 }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };

  return {
    treatment: enrichScene({
      module: "sra",
      step: "treatment",
      points,
      predict: (point) => cellMeans(points).get(groupKey(point)),
      lines: [],
      ssLayers: layers([treatmentLayer]),
      anovaRows: highlightRows(fullRows, "treatment"),
      equation: "SS_Total = SS_Treatment + SS_Pure error",
      formula: {
        theory: "ŷ = ȳ",
        rows: [
          {
            names: ["ȳ"],
            values: [round(grandMean, 2)],
            meanings: ["overallMean"],
          },
        ],
      },
      activeTerm: "treatment",
      chartDomain,
      xAxisKey: "sraDose",
      changeKey: "treatment",
    }),
    commonIntercept: enrichScene({
      module: "sra",
      step: "commonIntercept",
      points,
      predict: common.predict,
      lines: modelLines(["standard", "test"], xDomain, common.predict),
      ssLayers: layers([treatmentLayer, regressionLayer]),
      anovaRows: highlightRows(fullRows, "regression"),
      equation: "ŷ^(R) = a + b_S · x_S + b_T · x_T",
      formula: {
        theory: "ŷ^(R) = a + b_S · x_S + b_T · x_T",
        rows: [
          {
            names: ["a", "b_S", "b_T"],
            values: common.coefficients.slice(0, 3).map((value) => round(value, 2)),
            meanings: ["commonIntercept", "standardSlope", "testSlope"],
          },
        ],
      },
      activeTerm: "regression",
      chartDomain,
      xAxisKey: "sraDose",
      changeKey: "regression",
    }),
    intersection: enrichScene({
      module: "sra",
      step: "intersection",
      points,
      predict: separate.predict,
      lines: modelLines(["standard", "test"], xDomain, separate.predict),
      ssLayers: layers([treatmentLayer, regressionLayer, intersectionLayer]),
      anovaRows: highlightRows(fullRows, "intersection"),
      equation: "ŷ^(I) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T",
      formula: {
        theory: "ŷ^(I) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T",
        rows: [
          {
            names: ["a_S", "a_T", "b_S", "b_T"],
            values: [
              separate.coefficients[0],
              separate.coefficients[0] + separate.coefficients[1],
              separate.coefficients[2],
              separate.coefficients[3],
            ].map((value) => round(value, 2)),
            meanings: ["standardIntercept", "testIntercept", "standardSlope", "testSlope"],
          },
        ],
      },
      activeTerm: "intersection",
      chartDomain,
      xAxisKey: "sraDose",
      changeKey: "intersection",
    }),
    curvature: enrichScene({
      module: "sra",
      step: "curvature",
      points,
      predict: curved.predict,
      lines: modelLines(["standard", "test"], xDomain, curved.predict, true),
      ssLayers: layers([treatmentLayer, regressionLayer, intersectionLayer, curvedLayer]),
      anovaRows: highlightRows(fullRows, "nonlinearity"),
      equation: "ŷ^(N) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T + c_S · x_S² + c_T · x_T²",
      formula: {
        theory: "ŷ^(N) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T + c_S · x_S² + c_T · x_T²",
        rows: [
          {
            names: ["a_S", "a_T", "b_S", "b_T", "c_S", "c_T"],
            values: [
              curved.coefficients[0],
              curved.coefficients[0] + curved.coefficients[1],
              curved.coefficients[2],
              curved.coefficients[3],
              curved.coefficients[4],
              curved.coefficients[5],
            ].map((value) => round(value, 2)),
            meanings: [
              "standardIntercept",
              "testIntercept",
              "standardSlope",
              "testSlope",
              "standardQuadratic",
              "testQuadratic",
            ],
          },
        ],
      },
      activeTerm: "nonlinearity",
      chartDomain,
      xAxisKey: "sraDose",
      changeKey: "nonlinearity",
    }),
  };
};

const plaScenes = (params) => {
  const points = generatePlaPoints(params);
  const total = ssTotal(points);
  const pure = ssPureError(points);
  const treatment = total - pure;
  const grandMean = mean(points.map((point) => point.y));
  const preparationFit = fitLinearModel(points, (point) => [1, point.group === "test" ? 1 : 0]);
  const parallel = fitLinearModel(points, (point) => [1, point.x, point.group === "test" ? 1 : 0]);
  const nonparallel = fitLinearModel(points, (point) => [
    1,
    point.x,
    point.group === "test" ? 1 : 0,
    point.group === "test" ? point.x : 0,
  ]);
  const curved = fitLinearModel(points, (point) => [
    1,
    point.x,
    point.group === "test" ? 1 : 0,
    point.group === "test" ? point.x : 0,
    point.group === "standard" ? point.x ** 2 : 0,
    point.group === "test" ? point.x ** 2 : 0,
  ]);

  const ssePreparation = sseForPredict(points, preparationFit.predict);
  const sseParallel = sseForPredict(points, parallel.predict);
  const sseNonparallel = sseForPredict(points, nonparallel.predict);
  const sseCurved = sseForPredict(points, curved.predict);
  const preparation = total - ssePreparation;
  const regression = ssePreparation - sseParallel;
  const nonparallelism = sseParallel - sseNonparallel;
  const nonlinearity = sseNonparallel - sseCurved;
  const lof1 = ssePreparation - pure;
  const lof2 = sseParallel - pure;
  const lof3 = sseNonparallel - pure;
  const lof4 = sseCurved - pure;
  const denominator = { ss: pure, df: points.length - 10 };
  const fullRows = tableRows(
    [
      anovaRow({
        key: "preparation",
        ss: preparation,
        df: 1,
        denominator,
        expected: "compare",
      }),
      anovaRow({
        key: "regression",
        ss: regression,
        df: 1,
        denominator,
        expected: "significant",
      }),
      anovaRow({
        key: "nonparallelism",
        ss: nonparallelism,
        df: 1,
        denominator,
        expected: "notSignificant",
      }),
      anovaRow({
        key: "nonlinearity",
        ss: nonlinearity,
        df: 2,
        denominator,
        expected: "notSignificant",
      }),
      anovaRow({ key: "lackOfFit", ss: lof4, df: 4, denominator, expected: "notSignificant" }),
      anovaRow({ key: "pureError", ss: pure, df: denominator.df }),
    ],
    totalRow(total, points.length - 1),
  );
  const xDomain = [Math.log(0.8), Math.log(17)];
  const chartDomain = { x: [Math.log(0.8), Math.log(17)], y: [16, 98] };

  const treatmentLayer = {
    equation: "SS_Total = SS_Treatment + SS_Pure error",
    components: [
      ssComponent({
        key: "treatment",
        value: treatment,
        parts: ["preparation", "regression", "nonparallelism", "nonlinearity", "lof4"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const preparationLayer = {
    equation: "SS_Total = SS_Preparation + SS_Lack-of-fit-1 + SS_Pure error",
    components: [
      ssComponent({ key: "preparation", value: preparation }),
      ssComponent({
        key: "lackOfFit",
        id: "lof1",
        value: lof1,
        parts: ["regression", "nonparallelism", "nonlinearity", "lof4"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const regressionLayer = {
    equation: "SS_Total = SS_Preparation + SS_Regression + SS_Lack-of-fit-2 + SS_Pure error",
    components: [
      ssComponent({ key: "preparation", value: preparation }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({
        key: "lackOfFit",
        id: "lof2",
        value: lof2,
        parts: ["nonparallelism", "nonlinearity", "lof4"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const nonparallelLayer = {
    equation:
      "SS_Total = SS_Preparation + SS_Regression + SS_Non-parallelism + SS_Lack-of-fit-3 + SS_Pure error",
    components: [
      ssComponent({ key: "preparation", value: preparation }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "nonparallelism", value: nonparallelism }),
      ssComponent({
        key: "lackOfFit",
        id: "lof3",
        value: lof3,
        parts: ["nonlinearity", "lof4"],
      }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };
  const curvedLayer = {
    equation:
      "SS_Total = SS_Preparation + SS_Regression + SS_Non-parallelism + SS_Non-linearity + SS_Lack-of-fit-4 + SS_Pure error",
    components: [
      ssComponent({ key: "preparation", value: preparation }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "nonparallelism", value: nonparallelism }),
      ssComponent({ key: "nonlinearity", value: nonlinearity }),
      ssComponent({ key: "lackOfFit", id: "lof4", value: lof4 }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };

  return {
    treatment: enrichScene({
      module: "pla",
      step: "treatment",
      points,
      predict: (point) => cellMeans(points).get(groupKey(point)),
      lines: [],
      ssLayers: layers([treatmentLayer]),
      anovaRows: highlightRows(fullRows, "treatment"),
      equation: "SS_Total = SS_Treatment + SS_Pure error",
      formula: {
        theory: "ŷ = ȳ",
        rows: [
          {
            names: ["ȳ"],
            values: [round(grandMean, 2)],
            meanings: ["overallMean"],
          },
        ],
      },
      activeTerm: "treatment",
      chartDomain,
      xAxisKey: "plaLogDose",
      changeKey: "treatment",
    }),
    preparation: enrichScene({
      module: "pla",
      step: "preparation",
      points,
      predict: preparationFit.predict,
      lines: modelLines(["standard", "test"], xDomain, preparationFit.predict),
      ssLayers: layers([treatmentLayer, preparationLayer]),
      anovaRows: highlightRows(fullRows, "preparation"),
      equation: "ŷ^(P) = a_S · z_S + a_T · z_T",
      formula: {
        theory: "ŷ^(P) = a_S · z_S + a_T · z_T",
        rows: [
          {
            names: ["a_S", "a_T"],
            values: [
              preparationFit.coefficients[0],
              preparationFit.coefficients[0] + preparationFit.coefficients[1],
            ].map((value) => round(value, 2)),
            meanings: ["standardIntercept", "testIntercept"],
          },
        ],
      },
      activeTerm: "preparation",
      chartDomain,
      xAxisKey: "plaLogDose",
      changeKey: "preparation",
    }),
    parallel: enrichScene({
      module: "pla",
      step: "parallel",
      points,
      predict: parallel.predict,
      lines: modelLines(["standard", "test"], xDomain, parallel.predict),
      ssLayers: layers([treatmentLayer, preparationLayer, regressionLayer]),
      anovaRows: highlightRows(fullRows, "regression"),
      equation: "ŷ^(R) = a_S · z_S + a_T · z_T + b · (x_S + x_T)",
      formula: {
        theory: "ŷ^(R) = a_S · z_S + a_T · z_T + b · (x_S + x_T)",
        rows: [
          {
            names: ["a_S", "a_T", "b"],
            values: [
              parallel.coefficients[0],
              parallel.coefficients[0] + parallel.coefficients[2],
              parallel.coefficients[1],
            ].map((value) => round(value, 2)),
            meanings: ["standardIntercept", "testIntercept", "commonSlope"],
          },
        ],
      },
      activeTerm: "regression",
      chartDomain,
      xAxisKey: "plaLogDose",
      changeKey: "regression",
    }),
    nonparallel: enrichScene({
      module: "pla",
      step: "nonparallel",
      points,
      predict: nonparallel.predict,
      lines: modelLines(["standard", "test"], xDomain, nonparallel.predict),
      ssLayers: layers([treatmentLayer, preparationLayer, regressionLayer, nonparallelLayer]),
      anovaRows: highlightRows(fullRows, "nonparallelism"),
      equation: "ŷ^(NP) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T",
      formula: {
        theory: "ŷ^(NP) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T",
        rows: [
          {
            names: ["a_S", "a_T", "b_S", "b_T"],
            values: [
              nonparallel.coefficients[0],
              nonparallel.coefficients[0] + nonparallel.coefficients[2],
              nonparallel.coefficients[1],
              nonparallel.coefficients[1] + nonparallel.coefficients[3],
            ].map((value) => round(value, 2)),
            meanings: ["standardIntercept", "testIntercept", "standardSlope", "testSlope"],
          },
        ],
      },
      activeTerm: "nonparallelism",
      chartDomain,
      xAxisKey: "plaLogDose",
      changeKey: "nonparallelism",
    }),
    curvature: enrichScene({
      module: "pla",
      step: "curvature",
      points,
      predict: curved.predict,
      lines: modelLines(["standard", "test"], xDomain, curved.predict, true),
      ssLayers: layers([
        treatmentLayer,
        preparationLayer,
        regressionLayer,
        nonparallelLayer,
        curvedLayer,
      ]),
      anovaRows: highlightRows(fullRows, "nonlinearity"),
      equation: "ŷ^(N) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T + c_S · x_S² + c_T · x_T²",
      formula: {
        theory: "ŷ^(N) = a_S · z_S + a_T · z_T + b_S · x_S + b_T · x_T + c_S · x_S² + c_T · x_T²",
        rows: [
          {
            names: ["a_S", "a_T", "b_S", "b_T", "c_S", "c_T"],
            values: [
              curved.coefficients[0],
              curved.coefficients[0] + curved.coefficients[2],
              curved.coefficients[1],
              curved.coefficients[1] + curved.coefficients[3],
              curved.coefficients[4],
              curved.coefficients[5],
            ].map((value) => round(value, 2)),
            meanings: [
              "standardIntercept",
              "testIntercept",
              "standardSlope",
              "testSlope",
              "standardQuadratic",
              "testQuadratic",
            ],
          },
        ],
      },
      activeTerm: "nonlinearity",
      chartDomain,
      xAxisKey: "plaLogDose",
      changeKey: "nonlinearity",
    }),
  };
};

const fourPlScenes = (params) => {
  const points = generateFourPlPoints(params);
  const pure = ssPureError(points);
  const concentrationOf = (point) => point.concentration || Math.exp(point.x);
  const constrainedPredict = (point) => {
    const concentration = concentrationOf(point);
    return fourPl(
      concentration,
      point.group === "standard" ? 7.4 : 7.8,
      point.group === "standard" ? 102 : 100.8,
      1.68,
      1.18,
    );
  };
  const unconstrainedPredict = (point) =>
    point.group === "standard"
      ? fourPl(concentrationOf(point), 7, 103, 1.45, 1.25)
      : fourPl(
          concentrationOf(point),
          7.5 + params.fourPlDifference * 1.1,
          101 - params.fourPlDifference * 3.2,
          1.65 + params.fourPlDifference * 0.62,
          1.2 - params.fourPlDifference * 0.08,
        );
  const sseConstrained = sseForPredict(points, constrainedPredict);
  const sseUnconstrained = sseForPredict(points, unconstrainedPredict);
  const total = ssTotal(points);
  const specimenMeans = new Map(
    ["standard", "test"].map((group) => [
      group,
      mean(points.filter((point) => point.group === group).map((point) => point.y)),
    ]),
  );
  const ssAfterSpecimen = sum(
    points.map((point) => (point.y - specimenMeans.get(point.group)) ** 2),
  );
  const ssSpecimen = Math.max(0, total - ssAfterSpecimen);
  const regression = Math.max(0, ssAfterSpecimen - sseConstrained);
  const extra = Math.max(0, sseConstrained - sseUnconstrained);
  const lof = Math.max(0, sseUnconstrained - pure);
  const groupResidualSS = (group) =>
    sseForPredict(
      points.filter((point) => point.group === group),
      unconstrainedPredict,
    );
  const groupPureSS = (group) => ssPureError(points.filter((point) => point.group === group));
  const standardPure = groupPureSS("standard");
  const testPure = groupPureSS("test");
  const standardLof = Math.max(0, groupResidualSS("standard") - standardPure);
  const testLof = Math.max(0, groupResidualSS("test") - testPure);
  const totalDf = points.length - 1;
  const specimenDf = 1;
  const regressionDf = 3;
  const residualIDf = points.length - 5;
  const residualIIDf = points.length - 8;
  const parallelDf = residualIDf - residualIIDf;
  const pureDf = points.length - 24;
  const lofDf = residualIIDf - pureDf;
  const groupLofDf = lofDf / 2;
  const denominator = { ss: pure, df: pureDf };
  const residualIIDenominator = { ss: sseUnconstrained, df: residualIIDf };
  const fullRows = [
    totalRow(total, totalDf, "totalVariation"),
    anovaRow({
      key: "specimen",
      ss: ssSpecimen,
      df: specimenDf,
      denominator: residualIIDenominator,
      expected: "significant",
    }),
    anovaRow({
      key: "regression",
      ss: regression,
      df: regressionDf,
      denominator: residualIIDenominator,
      expected: "significant",
    }),
    anovaRow({
      key: "deviationParallel",
      ss: extra,
      df: parallelDf,
      denominator: residualIIDenominator,
      expected: "notSignificant",
    }),
    anovaRow({
      key: "residualII",
      ss: sseUnconstrained,
      df: residualIIDf,
      expected: "descriptive",
    }),
    anovaRow({
      key: "modelLof",
      ss: lof,
      df: lofDf,
      denominator,
      expected: "notSignificant",
    }),
    anovaRow({
      key: "standardLof",
      ss: standardLof,
      df: groupLofDf,
      denominator,
      expected: "notSignificant",
    }),
    anovaRow({
      key: "testLof",
      ss: testLof,
      df: groupLofDf,
      denominator,
      expected: "notSignificant",
    }),
    anovaRow({ key: "error", ss: pure, df: pureDf, expected: "pureErrorTerm" }),
  ];
  const xDomain = [Math.log(0.012), Math.log(60)];
  const chartDomain = { x: [Math.log(0.012), Math.log(60)], y: [0, 112] };
  const totalLayer = {
    equation: "SS_Total",
    components: [
      ssComponent({
        key: "total",
        value: total,
        parts: ["preparation", "regression", "nonparallelism", "lof", "pureError"],
      }),
    ],
  };
  const constrainedLayer = {
    equation: "SS_Total = SS_Preparation + SS_Regression + SS_Residual",
    components: [
      ssComponent({ key: "preparation", value: ssSpecimen }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({
        key: "constrainedResidual",
        id: "constrainedResidual",
        value: sseConstrained,
        parts: ["nonparallelism", "lof", "pureError"],
      }),
    ],
  };
  const freeLayer = {
    equation: "SS_Total = SS_Preparation + SS_Regression + SS_Non-parallelism + SS_Residual",
    components: [
      ssComponent({ key: "preparation", value: ssSpecimen }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "nonparallelism", value: extra }),
      ssComponent({
        key: "unconstrainedResidual",
        id: "unconstrainedResidual",
        value: sseUnconstrained,
        parts: ["lof", "pureError"],
      }),
    ],
  };
  const lofLayer = {
    equation:
      "SS_Total = SS_Preparation + SS_Regression + SS_Non-parallelism + SS_Lack-of-fit + SS_Pure error",
    components: [
      ssComponent({ key: "preparation", value: ssSpecimen }),
      ssComponent({ key: "regression", value: regression }),
      ssComponent({ key: "nonparallelism", value: extra }),
      ssComponent({ key: "lackOfFit", id: "lof", value: lof }),
      ssComponent({ key: "pureError", value: pure }),
    ],
  };

  return {
    total: enrichScene({
      module: "fourpl",
      step: "total",
      points,
      predict: constrainedPredict,
      lines: [],
      ssLayers: layers([totalLayer]),
      anovaRows: highlightRows(fullRows, "total"),
      equation: {
        zh: "4PL 从总变异开始，随后用约束模型和非约束模型逐层解释残差。",
        en: "4PL begins from total variation, then explains residuals through constrained and unconstrained models.",
      },
      activeTerm: "total",
      chartDomain,
      xAxisKey: "fourPlLogConcentration",
      changeKey: "fourplTotal",
    }),
    constrained: enrichScene({
      module: "fourpl",
      step: "constrained",
      points,
      predict: constrainedPredict,
      lines: modelLines(["standard", "test"], xDomain, constrainedPredict, true),
      ssLayers: layers([totalLayer, constrainedLayer]),
      anovaRows: highlightRows(fullRows, "regression"),
      equation: {
        zh: "约束模型解释样品差异与剂量反应，剩余部分是约束模型残差。",
        en: "The constrained model explains preparation difference and dose response; the remainder is constrained-model residual.",
      },
      activeTerm: "constrainedResidual",
      chartDomain,
      xAxisKey: "fourPlLogConcentration",
      changeKey: "constrainedResidual",
    }),
    free: enrichScene({
      module: "fourpl",
      step: "free",
      points,
      predict: unconstrainedPredict,
      lines: modelLines(["standard", "test"], xDomain, unconstrainedPredict, true),
      ssLayers: layers([totalLayer, constrainedLayer, freeLayer]),
      anovaRows: highlightRows(fullRows, "deviationParallel"),
      equation: {
        zh: "非约束模型释放曲线约束；Non-parallelism = RSS_constrained - RSS_unconstrained。",
        en: "The unconstrained model releases curve constraints; non-parallelism = RSS_constrained - RSS_unconstrained.",
      },
      activeTerm: "nonparallelism",
      chartDomain,
      xAxisKey: "fourPlLogConcentration",
      changeKey: "fourplNonparallelism",
    }),
    lof: enrichScene({
      module: "fourpl",
      step: "lof",
      points,
      predict: unconstrainedPredict,
      lines: modelLines(["standard", "test"], xDomain, unconstrainedPredict, true),
      ssLayers: layers([totalLayer, constrainedLayer, freeLayer, lofLayer]),
      anovaRows: highlightRows(fullRows, "modelLof"),
      equation: {
        zh: "非约束模型残差继续分解为 lack-of-fit 与 pure error。",
        en: "The unconstrained-model residual is further decomposed into lack-of-fit and pure error.",
      },
      activeTerm: "lackOfFit",
      chartDomain,
      xAxisKey: "fourPlLogConcentration",
      changeKey: "fourplLof",
    }),
  };
};

export const moduleOrder = ["single", "sra", "pla", "fourpl"];

export const stepOrder = {
  single: ["mean", "linear", "regression", "lof"],
  sra: ["treatment", "commonIntercept", "intersection", "curvature"],
  pla: ["treatment", "preparation", "parallel", "nonparallel", "curvature"],
  fourpl: ["total", "constrained", "free", "lof"],
};

export const createAnovaScenes = (parameters = defaultAnovaParameters) => ({
  single: singleScenes(parameters),
  sra: sraScenes(parameters),
  pla: plaScenes(parameters),
  fourpl: fourPlScenes(parameters),
});

export const anovaScenes = createAnovaScenes();
