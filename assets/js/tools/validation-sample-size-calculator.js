import {
  calculateChp9401SampleSize,
  calculateLocalSensitivity,
  calculateOverallPassProbability,
  calculateRequiredN,
  calculateUspAccuracySampleSize,
  calculateUspPrecisionSampleSize,
  generateCapabilityEnvelope,
  generateFirstPassLadder,
  generateSensitivityCurve,
  solveSupportedAccuracyCriterion,
  solveSupportedPrecisionCriterion
} from "../lib/validation/sample-size.js";

const $ = (id) => document.getElementById(id);
const pct = (value, digits = 1) => `${Number(value).toFixed(digits)}%`;
const probPct = (value, digits = 1) => `${(Number(value) * 100).toFixed(digits)}%`;

const state = {
  studyMode: "design",
  mode: "chp9401",
  acrbPercent: 12,
  acovPercent: 12,
  trueRbPercent: 1,
  levels: 5,
  gcvAcceptancePercent: 11,
  trueGcvPrecisionPercent: 7,
  confidenceLevel: 0.95,
  power: 0.95,
  completedN: 16,
  fixedAssumption: "fixPrecision",
  fixedPrecisionPercent: 12,
  fixedAccuracyPercent: 12
};

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function scale(value, d0, d1, r0, r1) {
  if (d1 === d0) return r0;
  return r0 + (value - d0) / (d1 - d0) * (r1 - r0);
}

const pairedInputs = [
  ["acrb", "acrbInput"],
  ["acov", "acovInput"],
  ["trueRb", "trueRbInput"],
  ["levels", "levelsInput"],
  ["gcvAcceptance", "gcvAcceptanceInput"],
  ["trueGcvPrecision", "trueGcvPrecisionInput"],
  ["confidence", "confidenceInput"],
  ["power", "powerInput"],
  ["completedN", "completedNInput"],
  ["fixedPrecision", "fixedPrecisionInput"],
  ["fixedAccuracy", "fixedAccuracyInput"]
];

function clampToInput(value, input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const fallback = Number(input.value) || min;
  return Math.min(Math.max(Number.isFinite(Number(value)) ? Number(value) : fallback, min), max);
}

function formatControlValue(value, step) {
  return Number(step) >= 1 ? String(Math.round(value)) : value.toFixed(1);
}

function syncPairedInputs() {
  pairedInputs.forEach(([rangeId, numberId]) => {
    const range = $(rangeId);
    const number = $(numberId);
    if (!range || !number) return;
    number.value = formatControlValue(Number(range.value), range.step);
  });
}

function readState() {
  state.mode = $("mode").value;
  state.acrbPercent = Number($("acrb").value);
  state.acovPercent = Number($("acov").value);
  state.trueRbPercent = Number($("trueRb").value);
  state.levels = Number($("levels").value);
  state.gcvAcceptancePercent = Number($("gcvAcceptance").value);
  state.trueGcvPrecisionPercent = Number($("trueGcvPrecision").value);
  state.confidenceLevel = Number($("confidence").value) / 100;
  state.power = Number($("power").value) / 100;
  state.completedN = Number($("completedN").value);
  state.fixedAssumption = $("fixedAssumption").value;
  state.fixedPrecisionPercent = Number($("fixedPrecision").value);
  state.fixedAccuracyPercent = Number($("fixedAccuracy").value);
}

function modeLabel() {
  return {
    chp9401: ["ChP 9401", "Accuracy-driven simplified expression"],
    uspAccuracy: ["USP <1033>", "Relative accuracy sample size"],
    uspPrecision: ["USP <1033>", "Precision-driven chi-square"],
    unified: ["Unified", "Log-scale accuracy expression"]
  }[state.mode];
}

function activeCalculation() {
  return calculateRequiredN({
    mode: state.mode,
    acrbPercent: state.acrbPercent,
    acovPercent: state.acovPercent,
    rbAcceptancePercent: state.acrbPercent,
    trueRbPercent: state.trueRbPercent,
    trueGcvPercent: state.mode === "uspPrecision" ? state.trueGcvPrecisionPercent : state.acovPercent,
    levels: state.levels,
    gcvAcceptancePercent: state.gcvAcceptancePercent,
    trueGcvPrecisionPercent: state.trueGcvPrecisionPercent,
    confidenceLevel: state.confidenceLevel,
    power: state.power
  });
}

function updateVisibility() {
  const precisionMode = state.mode === "uspPrecision";
  const evaluateMode = state.studyMode === "evaluate";

  document.querySelector("[data-fields='accuracy']").hidden = evaluateMode || precisionMode;
  document.querySelector("[data-fields='precision']").hidden = evaluateMode || !precisionMode;
  document.querySelector("[data-field='true-rb']").hidden = state.mode === "chp9401";

  document.querySelectorAll("[data-study]").forEach((el) => {
    el.hidden = el.dataset.study !== state.studyMode;
  });

  document.querySelector("[data-evaluate-field='fixed-precision']").hidden =
    state.fixedAssumption === "fixAccuracy";
  document.querySelector("[data-evaluate-field='fixed-accuracy']").hidden =
    state.fixedAssumption === "fixPrecision";

  document.querySelectorAll("[data-study-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.studyMode === state.studyMode);
  });
}

function updateReadouts() {
  $("acrbValue").textContent = pct(state.acrbPercent);
  $("acovValue").textContent = pct(state.acovPercent);
  $("trueRbValue").textContent = pct(state.trueRbPercent);
  $("levelsValue").textContent = String(state.levels);
  $("gcvAcceptanceValue").textContent = pct(state.gcvAcceptancePercent);
  $("trueGcvPrecisionValue").textContent = pct(state.trueGcvPrecisionPercent);
  $("confidenceValue").textContent = probPct(state.confidenceLevel, 0);
  $("powerValue").textContent = probPct(state.power, 0);
  $("completedNValue").textContent = String(state.completedN);
  $("fixedPrecisionValue").textContent = pct(state.fixedPrecisionPercent);
  $("fixedAccuracyValue").textContent = pct(state.fixedAccuracyPercent);
}

function designFormulaHtml(result) {
  if (state.mode === "uspPrecision") {
    return `
      <p><strong>USP precision-driven sample size</strong></p>
      <p>One-sided confidence bound for GCV must be below the GCV acceptance criterion.</p>
      <p>Current substitution: GCV criterion ${pct(state.gcvAcceptancePercent)}, assumed true GCV ${pct(state.trueGcvPrecisionPercent)}, confidence ${probPct(state.confidenceLevel, 0)}, power ${probPct(state.power, 0)}.</p>
      <p>First acceptable n: <strong>${result.n ?? "not found"}</strong>.</p>
    `;
  }

  if (state.mode === "chp9401") {
    return `
      <p><strong>ChP 9401 Formula 25</strong></p>
      <p>n >= [(t<sub>1-alpha,n-1</sub> + t<sub>1-beta/2,n-1</sub>)<sup>2</sup> x ln(1 + ACOV)<sup>2</sup>] / ln(1 + ACRB)<sup>2</sup></p>
      <p>Current substitution: ACRB ${pct(state.acrbPercent)}, ACOV ${pct(state.acovPercent)}, alpha ${result.alpha.toFixed(3)}, beta ${result.beta.toFixed(3)}.</p>
      <p>First acceptable n: <strong>${result.n ?? "not found"}</strong>.</p>
    `;
  }

  return `
    <p><strong>USP &lt;1033&gt; relative accuracy</strong></p>
    <p>n >= [(t<sub>1-alpha,n-1</sub> + t<sub>1-beta/2,n-1</sub>)<sup>2</sup> x ln(1 + GCV*)<sup>2</sup>] / [ln(1 + RB) - ln(1 + RB*)]<sup>2</sup></p>
    <p>Current substitution: RB criterion ${pct(state.acrbPercent)}, true RB* ${pct(state.trueRbPercent)}, true GCV* ${pct(state.acovPercent)}, alpha ${result.alpha.toFixed(3)}, beta ${result.beta.toFixed(3)}.</p>
    <p>First acceptable n: <strong>${result.n ?? "not found"}</strong>.</p>
  `;
}

function evaluateFormulaHtml(evaluation) {
  const accuracyText = evaluation.accuracy.value === null ? "not supported within 1-50%" : pct(evaluation.accuracy.value);
  const precisionText = evaluation.precision.value === null ? "not supported within 1-50%" : pct(evaluation.precision.value);
  const fixedText = state.fixedAssumption === "fixPrecision"
    ? `Fixed precision: ${pct(state.fixedPrecisionPercent)}. Solved accuracy boundary: ${accuracyText}.`
    : state.fixedAssumption === "fixAccuracy"
      ? `Fixed accuracy criterion: ${pct(state.fixedAccuracyPercent)}. Solved precision boundary: ${precisionText}.`
      : `Boundary explored across accuracy 1-50% and precision 1-50%.`;

  return `
    <p><strong>Inverse sample-size question</strong></p>
    <p>Find the boundary where required n is less than or equal to completed n = ${state.completedN}.</p>
    <p>${fixedText}</p>
    <p>Binary search result: accuracy boundary ${accuracyText}; precision boundary ${precisionText}.</p>
  `;
}

function renderIterationTable(result) {
  const rows = result.rows || [];
  const firstPass = rows.findIndex((row) => row.pass);
  const start = Math.max(0, firstPass - 4);
  const visible = rows.slice(start, start + 8);
  $("iterationBody").innerHTML = visible.map((row) => `
    <tr>
      <td class="numeric">${row.n}</td>
      <td class="numeric">${row.leftSide.toFixed(row.leftSide < 1 ? 3 : 2)}</td>
      <td class="numeric">${row.rightSide.toFixed(row.rightSide < 1 ? 3 : 2)}</td>
      <td class="${row.pass ? "status-pass" : "status-wait"}">${row.pass ? "pass" : "not yet"}</td>
    </tr>
  `).join("");
}

function renderFirstPassLadder(result) {
  const ladder = generateFirstPassLadder(result);
  $("firstPassNote").textContent = ladder.firstAcceptableN
    ? `The first supportable point is n=${ladder.firstAcceptableN}; smaller designs do not yet have enough statistical margin.`
    : "No acceptable n was found in the configured search range.";
  $("firstPassLadder").innerHTML = ladder.steps.map((step) => `
    <span class="ladder-step ${step.pass ? "is-pass" : "is-fail"} ${step.firstPass ? "is-first" : ""}">
      <span class="numeric">n=${step.n}</span>
      <small>${step.pass ? "pass" : "not yet"}</small>
    </span>
  `).join("");
}

function drawAxes(svg, plot, xLabel, yLabel, xTicks, yTicks) {
  svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x, y1: plot.y2, x2: plot.x2, y2: plot.y2 }));
  svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x, y1: plot.y, x2: plot.x, y2: plot.y2 }));
  xTicks.forEach((tick) => {
    const x = scale(tick.value, tick.min, tick.max, plot.x, plot.x2);
    svg.appendChild(svgEl("line", { class: "axis-line", x1: x, y1: plot.y2, x2: x, y2: plot.y2 + 5 }));
    const label = svgEl("text", { class: "tick-label", x, y: plot.y2 + 20, "text-anchor": "middle" });
    label.textContent = tick.label;
    svg.appendChild(label);
  });
  yTicks.forEach((tick) => {
    const y = scale(tick.value, tick.min, tick.max, plot.y2, plot.y);
    svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x - 5, y1: y, x2: plot.x, y2: y }));
    const label = svgEl("text", { class: "tick-label", x: plot.x - 10, y: y + 4, "text-anchor": "end" });
    label.textContent = tick.label;
    svg.appendChild(label);
  });
  const xText = svgEl("text", { class: "axis-label", x: (plot.x + plot.x2) / 2, y: plot.y2 + 44, "text-anchor": "middle" });
  xText.textContent = xLabel;
  svg.appendChild(xText);
  const yText = svgEl("text", { class: "axis-label", x: 15, y: (plot.y + plot.y2) / 2, "text-anchor": "middle", transform: `rotate(-90 15 ${(plot.y + plot.y2) / 2})` });
  yText.textContent = yLabel;
  svg.appendChild(yText);
}

function curveParams() {
  return {
    acrbPercent: state.acrbPercent,
    acovPercent: state.acovPercent,
    rbAcceptancePercent: state.acrbPercent,
    trueRbPercent: state.trueRbPercent,
    trueGcvPercent: state.acovPercent,
    levels: state.levels,
    gcvAcceptancePercent: state.gcvAcceptancePercent,
    confidenceLevel: state.confidenceLevel,
    power: state.power
  };
}

function renderCurve(svgId, variable, currentX, thresholdN = null) {
  const svg = $(svgId);
  clearSvg(svg);
  const plot = { x: 52, y: 24, x2: 610, y2: 260 };
  const curveMode = state.mode === "unified" ? "uspAccuracy" : state.mode;
  const values = generateSensitivityCurve({
    mode: curveMode,
    variable,
    params: curveParams()
  }).filter((point) => point.n !== null);
  if (!values.length) return;

  const maxN = Math.max(10, thresholdN || 0, ...values.map((point) => point.n));
  const minX = Math.min(...values.map((point) => point.x));
  const maxX = Math.max(...values.map((point) => point.x));
  const d = values.map((point, index) => {
    const x = scale(point.x, minX, maxX, plot.x, plot.x2);
    const y = scale(point.n, 0, maxN, plot.y2, plot.y);
    return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
  svg.appendChild(svgEl("path", { class: "chart-line", d }));

  if (thresholdN !== null) {
    const y = scale(thresholdN, 0, maxN, plot.y2, plot.y);
    svg.appendChild(svgEl("line", { class: "threshold-line", x1: plot.x, y1: y, x2: plot.x2, y2: y }));
    const label = svgEl("text", { class: "chart-label", x: plot.x2 - 4, y: y - 8, "text-anchor": "end" });
    label.textContent = `completed n=${thresholdN}`;
    svg.appendChild(label);
  }

  drawAxes(
    svg,
    plot,
    variable === "precision" ? "Assumed GCV / ACOV (%)" : "Acceptance criterion (%)",
    "Required n",
    [minX, (minX + maxX) / 2, maxX].map((v) => ({ value: v, min: minX, max: maxX, label: v.toFixed(0) })),
    [0, Math.round(maxN / 2), maxN].map((v) => ({ value: v, min: 0, max: maxN, label: String(v) }))
  );

  const yPoint = values.reduce((closest, point) => Math.abs(point.x - currentX) < Math.abs(closest.x - currentX) ? point : closest, values[0]);
  svg.appendChild(svgEl("circle", {
    class: "current-point",
    cx: scale(yPoint.x, minX, maxX, plot.x, plot.x2),
    cy: scale(yPoint.n, 0, maxN, plot.y2, plot.y),
    r: 5
  }));
}

function renderCapabilityEnvelope(evaluation) {
  const svg = $("capabilitySvg");
  clearSvg(svg);
  const plot = { x: 58, y: 24, x2: 610, y2: 292 };
  const envelope = generateCapabilityEnvelope({
    mode: state.mode === "unified" ? "uspAccuracy" : state.mode,
    completedN: state.completedN,
    trueRbPercent: state.trueRbPercent,
    levels: state.levels,
    confidenceLevel: state.confidenceLevel,
    power: state.power,
    accuracySteps: 38,
    precisionSteps: 28
  });
  const [xMin, xMax] = envelope.accuracyRange;
  const [yMin, yMax] = envelope.precisionRange;
  const cellW = (plot.x2 - plot.x) / (envelope.accuracySteps + 1);
  const cellH = (plot.y2 - plot.y) / (envelope.precisionSteps + 1);
  const maxN = Math.max(state.completedN, ...envelope.points.map((point) => point.requiredN || 0));

  envelope.points.forEach((point) => {
    const x = scale(point.accuracyPercent, xMin, xMax, plot.x, plot.x2);
    const y = scale(point.precisionPercent, yMin, yMax, plot.y2, plot.y);
    const intensity = Math.min(1, (point.requiredN || maxN) / maxN);
    const fill = point.supported
      ? `rgba(36, 86, 179, ${0.12 + 0.32 * (1 - intensity)})`
      : `rgba(110, 114, 120, ${0.06 + 0.12 * intensity})`;
    const rect = svgEl("rect", {
      x: x - cellW / 2,
      y: y - cellH / 2,
      width: cellW + 0.8,
      height: cellH + 0.8,
      fill,
      "data-accuracy": point.accuracyPercent.toFixed(1),
      "data-precision": point.precisionPercent.toFixed(1),
      "data-n": point.requiredN ?? "",
      "data-supported": point.supported ? "Supported" : "Not supported"
    });
    rect.addEventListener("pointermove", () => {
      $("capabilityTooltip").textContent =
        `Accuracy ${pct(point.accuracyPercent)}, precision ${pct(point.precisionPercent)}, required n ${point.requiredN ?? ">300"}: ${point.supported ? "within the completed study envelope" : "outside the completed study envelope"}.`;
    });
    svg.appendChild(rect);
  });

  drawAxes(
    svg,
    plot,
    state.mode === "uspPrecision" ? "GCV acceptance criterion (%)" : "Accuracy criterion (%)",
    "Precision / GCV (%)",
    [1, 25, 50].map((v) => ({ value: v, min: xMin, max: xMax, label: String(v) })),
    [1, 25, 50].map((v) => ({ value: v, min: yMin, max: yMax, label: String(v) }))
  );

  const markerX = state.fixedAssumption === "fixAccuracy" ? state.fixedAccuracyPercent : (evaluation.accuracy.value || state.fixedAccuracyPercent);
  const markerY = state.fixedAssumption === "fixPrecision" ? state.fixedPrecisionPercent : (evaluation.precision.value || state.fixedPrecisionPercent);
  svg.appendChild(svgEl("circle", {
    class: "current-point",
    cx: scale(markerX, xMin, xMax, plot.x, plot.x2),
    cy: scale(markerY, yMin, yMax, plot.y2, plot.y),
    r: 5
  }));
}

function renderPowerCards(perLevelPower) {
  const levels = Math.max(1, state.levels);
  const overall = calculateOverallPassProbability(perLevelPower, levels);
  const dotCount = Math.min(levels, 12);
  const dots = Array.from({ length: dotCount }, (_, index) => `<span class="power-dot" aria-label="Potency level ${index + 1}"></span>`).join("");
  $("levelPowerBars").innerHTML = `
    <div class="power-summary">
      <article>
        <small>Per-level pass probability</small>
        <strong class="numeric">${probPct(perLevelPower, 1)}</strong>
      </article>
      <article>
        <small>All ${levels} levels pass</small>
        <strong class="numeric">${probPct(overall, 1)}</strong>
      </article>
    </div>
    <div class="power-dots">${dots}</div>
    <p class="hint">${probPct(perLevelPower, 2)}^${levels} = ${probPct(overall, 1)} under an independent-level approximation. This is a reminder that validation risk is carried across all potency levels, not only one level.</p>
  `;
}

function renderDriverDiagnosis() {
  const sensitivity = calculateLocalSensitivity({
    mode: state.mode,
    acrbPercent: state.acrbPercent,
    acovPercent: state.acovPercent,
    trueRbPercent: state.trueRbPercent,
    levels: state.levels,
    gcvAcceptancePercent: state.gcvAcceptancePercent,
    trueGcvPrecisionPercent: state.trueGcvPrecisionPercent,
    confidenceLevel: state.confidenceLevel,
    power: state.power
  });
  $("driverDiagnosis").innerHTML = `
    <p class="diagnosis-kicker">Main driver</p>
    <strong>${sensitivity.mainDriver.label}</strong>
    <p>${sensitivity.mainDriver.detail} Read this as the assumption currently closest to the design margin.</p>
    <div class="driver-list">
      ${sensitivity.drivers.map((driver) => `
        <span><b>${driver.label}</b><em class="numeric">${driver.score.toFixed(0)} n</em></span>
      `).join("")}
    </div>
  `;
}

function renderModeComparison() {
  const chp = calculateChp9401SampleSize({
    acrbPercent: 12,
    acovPercent: 12,
    confidenceLevel: 0.95,
    power: 0.95
  });
  const usp = calculateUspAccuracySampleSize({
    rbAcceptancePercent: 12,
    trueRbPercent: 1,
    trueGcvPercent: 7,
    confidenceLevel: 0.95,
    power: 0.95
  });
  $("modeComparison").innerHTML = `
    <div><span>ChP 9401</span><strong class="numeric">n=${chp.n}</strong><small>ACRB 12%, ACOV 12%, RB*=0 assumption</small></div>
    <div><span>USP &lt;1033&gt; accuracy</span><strong class="numeric">n=${usp.n}</strong><small>RB 12%, RB* 1%, GCV* 7%</small></div>
    <p>The useful comparison is not which reference is stricter in isolation, but which assumptions each formula makes about variability and true bias.</p>
  `;
}

function evaluateBoundaries() {
  const mode = state.mode === "unified" ? "uspAccuracy" : state.mode;
  return {
    accuracy: solveSupportedAccuracyCriterion({
      mode,
      completedN: state.completedN,
      fixedPrecisionPercent: state.fixedPrecisionPercent,
      trueRbPercent: state.trueRbPercent,
      levels: state.levels,
      confidenceLevel: state.confidenceLevel,
      power: state.power
    }),
    precision: solveSupportedPrecisionCriterion({
      mode,
      completedN: state.completedN,
      fixedAccuracyPercent: state.fixedAccuracyPercent,
      trueRbPercent: state.trueRbPercent,
      levels: state.levels,
      confidenceLevel: state.confidenceLevel,
      power: state.power
    })
  };
}

function renderDesign(result) {
  const [family, note] = modeLabel();
  $("primaryMetricLabel").textContent = "Scientific result";
  $("requiredN").textContent = result.n ?? ">";
  $("primaryMetricNote").textContent = "Independent measurements per potency level";
  $("secondaryMetricLabel").textContent = "Formula family";
  $("formulaFamily").textContent = family;
  $("formulaNote").textContent = note;

  const perLevelPower = result.perLevelPower || state.power;
  const overall = calculateOverallPassProbability(perLevelPower, state.levels);
  $("overallPower").textContent = probPct(overall, 1);
  $("overallPowerNote").textContent = `${state.levels} levels at ${probPct(perLevelPower, 1)} per level`;
  $("formulaText").innerHTML = designFormulaHtml(result);

  renderFirstPassLadder(result);
  renderIterationTable(result);
  renderPowerCards(perLevelPower);
  renderDriverDiagnosis();
  renderModeComparison();

  const driver = state.mode === "uspPrecision"
    ? "precision criterion and assumed true GCV"
    : (state.acovPercent >= state.acrbPercent ? "precision / ACOV" : "accuracy acceptance criterion");
  $("interpretationText").textContent = `The first supportable sample size is n=${result.n} because the current ${state.mode === "chp9401" ? "ChP 9401 Formula 25" : note} assumptions leave enough margin at that point. The main practical pressure is ${driver}. Lowering n usually means changing the scientific risk position: wider criteria, lower expected variability, or lower target power.`;

  renderCurve("precisionCurve", "precision", state.mode === "uspPrecision" ? state.trueGcvPrecisionPercent : state.acovPercent);
  renderCurve("accuracyCurve", "accuracy", state.mode === "uspPrecision" ? state.gcvAcceptancePercent : state.acrbPercent);
}

function renderEvaluate() {
  const [family, note] = modeLabel();
  const evaluation = evaluateBoundaries();
  const accuracyText = evaluation.accuracy.value === null ? "not supported" : pct(evaluation.accuracy.value);
  const precisionText = evaluation.precision.value === null ? "not supported" : pct(evaluation.precision.value);

  $("primaryMetricLabel").textContent = "Completed design";
  $("requiredN").textContent = state.completedN;
  $("primaryMetricNote").textContent = "Completed independent measurements";
  $("secondaryMetricLabel").textContent = state.fixedAssumption === "fixPrecision" ? "Supported accuracy" : "Supported precision";
  $("formulaFamily").textContent = state.fixedAssumption === "fixPrecision" ? accuracyText : precisionText;
  $("formulaNote").textContent = state.fixedAssumption === "fixPrecision"
    ? `with GCV / ACOV fixed at ${pct(state.fixedPrecisionPercent)}`
    : `with accuracy fixed at ${pct(state.fixedAccuracyPercent)}`;

  const overall = calculateOverallPassProbability(state.power, state.levels);
  $("overallPower").textContent = probPct(overall, 1);
  $("overallPowerNote").textContent = `${state.levels} levels at ${probPct(state.power, 1)} per level`;
  $("formulaText").innerHTML = evaluateFormulaHtml(evaluation);
  renderPowerCards(state.power);

  if (state.fixedAssumption === "fixPrecision") {
    $("interpretationText").textContent = evaluation.accuracy.value === null
      ? `With ${state.completedN} completed measurements and ${pct(state.fixedPrecisionPercent)} precision, the design does not leave enough margin to support an accuracy criterion within the 1-50% search range.`
      : `With ${state.completedN} completed measurements and ${pct(state.fixedPrecisionPercent)} precision fixed, the design can support an accuracy criterion as tight as about ${accuracyText}. Wider criteria require less evidence.`;
  } else if (state.fixedAssumption === "fixAccuracy") {
    $("interpretationText").textContent = evaluation.precision.value === null
      ? `With ${state.completedN} completed measurements and ${pct(state.fixedAccuracyPercent)} accuracy criterion, the design does not leave enough margin to support precision within the 1-50% search range.`
      : `With ${state.completedN} completed measurements and ${pct(state.fixedAccuracyPercent)} accuracy fixed, the design can support precision up to about ${precisionText}. Higher variability would ask for more measurements.`;
  } else {
    $("interpretationText").textContent = `The envelope shows the accuracy-precision combinations whose forward required n is less than or equal to the completed n=${state.completedN}. Treat it as a supported region for reasoning, not as a single universal acceptance criterion.`;
  }

  renderCapabilityEnvelope(evaluation);
  renderCurve("precisionCurve", "precision", state.fixedPrecisionPercent, state.completedN);
  renderCurve("accuracyCurve", "accuracy", state.fixedAccuracyPercent, state.completedN);
}

function render() {
  readState();
  updateVisibility();
  updateReadouts();
  syncPairedInputs();

  if (state.studyMode === "evaluate") renderEvaluate();
  else renderDesign(activeCalculation());
}

function setModeDefaults(mode) {
  if (mode === "uspAccuracy" || mode === "unified") {
    $("acov").value = "7";
    $("acovInput").value = "7.0";
    $("trueRb").value = "1";
    $("trueRbInput").value = "1.0";
    $("power").value = "95";
    $("powerInput").value = "95";
  } else if (mode === "uspPrecision") {
    $("power").value = "80";
    $("powerInput").value = "80";
  } else {
    $("acrb").value = "12";
    $("acrbInput").value = "12.0";
    $("acov").value = "12";
    $("acovInput").value = "12.0";
    $("power").value = "95";
    $("powerInput").value = "95";
  }
}

function init() {
  document.querySelectorAll("[data-study-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.studyMode = button.dataset.studyMode;
      render();
    });
  });

  $("mode").addEventListener("input", () => {
    setModeDefaults($("mode").value);
    render();
  });

  ["acrb", "acov", "trueRb", "levels", "gcvAcceptance", "trueGcvPrecision", "confidence", "power", "completedN", "fixedAssumption", "fixedPrecision", "fixedAccuracy"].forEach((id) => {
    $(id).addEventListener("input", render);
  });

  pairedInputs.forEach(([rangeId, numberId]) => {
    const range = $(rangeId);
    const number = $(numberId);
    if (!range || !number) return;
    range.addEventListener("input", () => {
      number.value = formatControlValue(Number(range.value), range.step);
    });
    number.addEventListener("input", () => {
      const value = clampToInput(number.value, number);
      number.value = formatControlValue(value, number.step);
      range.value = String(value);
      render();
    });
  });

  render();
}

document.addEventListener("DOMContentLoaded", init);
