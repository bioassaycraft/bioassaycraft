const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : 0);
const variance = (xs) => xs.length > 1 ? sum(xs.map((x) => (x - mean(xs)) ** 2)) / (xs.length - 1) : 0;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const residualModules = ["single", "sra", "pla", "fourpl"];
export const residualSteps = ["situation", "analysis", "treatment"];
export const defaultResidualParameters = {
  seed: 17, error: 1.25, hetero: 0.7, correlation: 0.55, drift: 1.2, outlier: 4,
  nonlinearity: 0, slopeDifference: 1.1, fourPlDifference: 0, power: 1, boxCoxLambda: .25,
};

const randomFor = (seed) => {
  let state = Math.max(1, Math.floor(seed)) % 2147483647;
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
};
const normal = (r) => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
const tNoise = (r) => normal(r) / Math.sqrt((r() < .5 ? .45 : 1.9));
// Kept intentionally identical to the ANOVA Explorer parameterization:
// lower + (upper - lower) / (1 + (EC50 / concentration)^Hill).
const fourPL = (concentration, p) =>
  p.lower + (p.upper - p.lower) / (1 + Math.pow(p.ec50 / concentration, p.hill));

function solve(a, b) {
  const n = b.length; const m = a.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i += 1) {
    let best = i; for (let j = i + 1; j < n; j += 1) if (Math.abs(m[j][i]) > Math.abs(m[best][i])) best = j;
    [m[i], m[best]] = [m[best], m[i]]; const pivot = Math.abs(m[i][i]) < 1e-9 ? 1e-9 : m[i][i];
    for (let k = i; k <= n; k += 1) m[i][k] /= pivot;
    for (let j = 0; j < n; j += 1) if (j !== i) { const f = m[j][i]; for (let k = i; k <= n; k += 1) m[j][k] -= f * m[i][k]; }
  }
  return m.map((row) => row[n]);
}
function linearFit(points, features, weights = []) {
  const q = features(points[0]).length, xtx = Array.from({ length: q }, () => Array(q).fill(0)), xty = Array(q).fill(0);
  points.forEach((p, k) => { const x = features(p), w = weights[k] ?? 1; x.forEach((v, i) => { xty[i] += w * v * p.response; x.forEach((u, j) => { xtx[i][j] += w * v * u; }); }); });
  const coef = solve(xtx, xty); return { parameters: coef, predict: (p) => sum(features(p).map((v, i) => v * coef[i])), df: Math.max(1, points.length - q) };
}
function fit4pl(points, weights = []) {
  const groups = [...new Set(points.map((p) => p.preparation))];
  const fitGroup = (group) => {
    const rows = points.map((point, index) => ({ point, index })).filter(({ point }) => point.preparation === group);
    const ys = rows.map(({ point }) => point.response);
    const logs = rows.map(({ point }) => point.logDose);
    const range = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const lowerBound = Math.min(...ys) - range;
    const upperBound = Math.max(...ys) + range;
    let p = {
      lower: mean(rows.slice(0, Math.min(3, rows.length)).map(({ point }) => point.response)),
      upper: mean(rows.slice(-Math.min(3, rows.length)).map(({ point }) => point.response)),
      ec50: Math.exp(mean(logs)),
      hill: 1,
    };
    if (p.upper < p.lower) [p.lower, p.upper] = [p.upper, p.lower];
    const loss = (candidate) => sum(rows.map(({ point, index }) => (weights[index] ?? 1) * (point.response - fourPL(point.dose, candidate)) ** 2));
    let current = loss(p); let damping = 1e-2;
    for (let cycle = 0; cycle < 100; cycle += 1) {
      const normal = Array.from({ length: 4 }, () => Array(4).fill(0));
      const gradient = Array(4).fill(0);
      rows.forEach(({ point, index }) => {
        const t = 1 / (1 + Math.pow(p.ec50 / point.dose, p.hill));
        const spread = p.upper - p.lower;
        const logRatio = Math.log(p.ec50 / point.dose);
        const jacobian = [1 - t, t, -spread * p.hill * t * (1 - t) / p.ec50, -spread * logRatio * t * (1 - t)];
        const residual = point.response - fourPL(point.dose, p); const weight = weights[index] ?? 1;
        jacobian.forEach((left, i) => { gradient[i] += weight * left * residual; jacobian.forEach((right, j) => { normal[i][j] += weight * left * right; }); });
      });
      normal.forEach((row, i) => { row[i] += damping; });
      const delta = solve(normal, gradient);
      const candidate = {
        lower: clamp(p.lower + delta[0], lowerBound, upperBound - .1),
        upper: clamp(p.upper + delta[1], lowerBound + .1, upperBound),
        ec50: clamp(p.ec50 + delta[2], Math.exp(Math.min(...logs) - 3), Math.exp(Math.max(...logs) + 3)),
        hill: clamp(p.hill + delta[3], .1, 5),
      };
      if (candidate.upper <= candidate.lower + .1) candidate.upper = candidate.lower + .1;
      const next = loss(candidate);
      if (next < current) { p = candidate; if (Math.abs(current - next) < 1e-7) break; current = next; damping = Math.max(1e-7, damping / 3); } else { damping = Math.min(1e8, damping * 8); }
    }
    return p;
  };
  const parameters = Object.fromEntries(groups.map((group) => [group, fitGroup(group)]));
  return { parameters, predict: (point) => fourPL(point.dose, parameters[point.preparation]), df: Math.max(1, points.length - groups.length * 4) };
}

export function transformResponse(value, kind, boxCoxLambda = .25) {
  if (kind === "raw") return value;
  if (kind === "sqrt") return value >= 0 ? Math.sqrt(value) : null;
  if (kind === "log") return value > 0 ? Math.log(value) : null;
  if (value <= 0) return null;
  return Math.abs(boxCoxLambda) < 1e-8
    ? Math.log(value)
    : (Math.pow(value, boxCoxLambda) - 1) / boxCoxLambda;
}

export function generateResidualData(module, parameters, errorStructure = "ideal") {
  const r = randomFor(parameters.seed), linearDoses = [-2, -1.3, -.6, .1, .8, 1.5], fourPlDoses = [.015, .03, .07, .15, .32, .7, 1.4, 2.8, 5.8, 12, 25, 52], doses = module === "fourpl" ? fourPlDoses : linearDoses, reps = module === "fourpl" ? 2 : 3, shared = { reference: normal(r), test: normal(r) };
  let prior = 0; const out = [];
  for (let doseIndex = 0; doseIndex < doses.length; doseIndex += 1) for (const preparation of ["reference", "test"]) for (let replicate = 1; replicate <= reps; replicate += 1) {
    const dose = module === "fourpl" ? doses[doseIndex] : 10 ** doses[doseIndex];
    const logDose = module === "fourpl" ? Math.log(dose) : doses[doseIndex], runOrder = out.length + 1;
    const trueY = module === "fourpl" ? fourPL(dose, preparation === "reference" ? { lower: 7, upper: 103, ec50: 1.45, hill: 1.25 } : { lower: 7.5 + parameters.fourPlDifference * 1.1, upper: 101 - parameters.fourPlDifference * 3.2, ec50: 1.65 + parameters.fourPlDifference * .62, hill: 1.2 - parameters.fourPlDifference * .08 }) : module === "pla" ? 54 + 11 * logDose + (preparation === "test" ? 3 : 0) + parameters.nonlinearity * logDose ** 2 : module === "sra" ? 54 + (preparation === "test" ? 11 + parameters.slopeDifference : 11) * logDose + (preparation === "test" ? 3 : 0) + parameters.nonlinearity * logDose ** 2 : 54 + 11 * logDose + parameters.nonlinearity * logDose ** 2;
    let scale = parameters.error;
    if (["increase", "decrease"].includes(errorStructure)) {
      const responsePosition = clamp((trueY - 7) / 96, 0, 1) - .5;
      const direction = errorStructure === "increase" ? 1 : -1;
      scale *= Math.exp(direction * parameters.hetero * responsePosition);
    }
    let e = normal(r) * scale;
    if (errorStructure === "rightSkew") e = (Math.exp(normal(r) * .45) - 1.1) * scale * 1.55;
    if (errorStructure === "heavyTail") e = tNoise(r) * scale;
    if (errorStructure === "correlated") { e = parameters.correlation * prior + Math.sqrt(1 - parameters.correlation ** 2) * e; prior = e; }
    if (errorStructure === "drift") e += ((runOrder - 1) / 35 - .5) * parameters.drift;
    if (errorStructure === "outlier" && doseIndex === 3 && preparation === "test" && replicate === 2) e += parameters.outlier;
    if (errorStructure === "plate") e += ((replicate - 2) * .7 + (doseIndex % 2 ? .45 : -.45)) * parameters.error;
    if (errorStructure === "shared") e += shared[preparation] * parameters.error * .65;
    out.push({ id: `${preparation}-${doseIndex}-${replicate}`, dose, logDose, response: trueY + e, preparation, replicate, runOrder, plateRow: replicate, plateColumn: doseIndex + 1, dilutionSeries: preparation, trueY });
  }
  return out;
}

function features(module) {
  if (module === "single") return (p) => [1, p.logDose];
  if (module === "sra") return (p) => [1, p.logDose, p.preparation === "test" ? 1 : 0, p.preparation === "test" ? p.logDose : 0];
  return (p) => [1, p.logDose, p.preparation === "test" ? 1 : 0];
}
export function analyseResiduals(raw, { module, transform = "raw", weightMode = "unweighted", power = 1, boxCoxLambda = .25 }) {
  const points = raw.map((p) => ({ ...p, response: transformResponse(p.response, transform, boxCoxLambda) })).filter((p) => p.response !== null && Number.isFinite(p.response));
  if (points.length < 6) return { points: [], error: "invalid-transform", qq: [], meanVariance: [] };
  const initial = module === "fourpl" ? fit4pl(points) : linearFit(points, features(module));
  const basePred = points.map(initial.predict); const weightsFor = (predictions) => predictions.map((mu) => { const safe = Math.max(Math.abs(mu), .25); if (weightMode === "inverse") return 1 / safe; if (weightMode === "inverse2") return 1 / safe ** 2; if (weightMode === "power") return 1 / safe ** power; return 1; });
  let weights = weightsFor(basePred), fit = initial;
  if (weightMode !== "unweighted") { fit = module === "fourpl" ? fit4pl(points, weights) : linearFit(points, features(module), weights); weights = weightsFor(points.map(fit.predict)); }
  const rss = sum(points.map((p, i) => weights[i] * (p.response - fit.predict(p)) ** 2)); const sigma = Math.sqrt(rss / fit.df);
  const observed = points.map((p, i) => { const fitted = fit.predict(p), rawResidual = p.response - fitted, weightedResidual = Math.sqrt(weights[i]) * rawResidual; const leverage = Math.min(.85, (module === "fourpl" ? 8 : fit.parameters.length) / points.length); return { ...p, fitted, weight: weights[i], rawResidual, weightedResidual, standardizedResidual: weightedResidual / Math.max(sigma * Math.sqrt(1 - leverage), 1e-8) }; });
  const sorted = [...observed].sort((a, b) => a.standardizedResidual - b.standardizedResidual); const qq = sorted.map((p, i) => ({ ...p, theoretical: normalQuantile((i + .5) / sorted.length), residual: p.standardizedResidual }));
  const groups = new Map(); observed.forEach((p) => { const key = `${p.preparation}-${p.logDose}`; groups.set(key, [...(groups.get(key) || []), p]); });
  const meanVariance = [...groups.values()].map((g) => ({ mean: mean(g.map((p) => p.response)), variance: variance(g.map((p) => p.response)), n: g.length })).filter((d) => d.n > 1 && d.mean > 0 && d.variance > 0);
  const mvFit = meanVariance.length > 1 ? linearFit(meanVariance.map((d) => ({ ...d, response: Math.log(d.variance), logDose: Math.log(d.mean) })), (p) => [1, p.logDose]) : null;
  return { points: observed, fit, sigma, qq, meanVariance, variancePower: mvFit?.parameters[1] ?? null, error: null, transform, boxCoxLambda };
}

// Acklam's rational approximation; adequate for a teaching Q–Q reference line.
function normalQuantile(p) { const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924],b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857],c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878],d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742]; if(p<.02425){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}if(p> .97575){const q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}const q=p-.5,r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}

export function diagnosis(result, structure) {
  const rs = result.points.map((p) => p.standardizedResidual); if (!rs.length) return { independence: "limited", normality: "limited", variance: "limited" };
  const ordered = [...result.points].sort((a,b)=>a.runOrder-b.runOrder); const corr = ordered.length > 2 ? mean(ordered.slice(1).map((p,i)=>p.standardizedResidual*ordered[i].standardizedResidual)) : 0;
  return { independence: structure === "drift" ? "drift" : structure === "correlated" || corr > .55 ? "correlation" : structure === "plate" ? "plate" : structure === "shared" ? "shared" : "clear", normality: structure === "rightSkew" ? "skew" : structure === "heavyTail" ? "heavy" : Math.max(...rs.map(Math.abs)) > 3 ? "outlier" : "clear", variance: ["increase","decrease"].includes(structure) ? structure : Math.abs(result.variancePower ?? 0) > .8 ? "trend" : "clear" };
}
