import {
  calculateBaselineComparison,
  calculateOosRisk,
  calculateTailProbabilities,
  clamp,
  formatPercent,
  generateConceptMiniCurves,
  generateOosHeatmapData,
  findPrecisionBoundary,
  getDominantTail
} from "../lib/validation/oos-risk.js";

const state = {
  mode: "unified",
  lowerLimitPercent: 80,
  upperLimitPercent: 125,
  relativeBiasPercent: 5,
  gcvPercent: 10,
  targetProbability: 0.01,
  runs: 1,
  replicatesPerRun: 1,
  preset: "80-125"
};

const terms = {
  unified: { bias: "Relative Bias", precision: "GCV", probability: "P(OOS)" },
  usp: { bias: "RB", precision: "GCVRR", probability: "Prob(OOS)" },
  chp: { bias: "ACRB", precision: "ACRVV", probability: "P(OOS)" }
};

const $ = (id) => document.getElementById(id);
const fmt = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;
const pct = (value, digits = 1) => `${Number(value).toFixed(digits)}%`;

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function colorForRisk(probability) {
  const p = Math.min(Math.max(probability, 0), 0.18) / 0.18;
  const low = [238, 244, 243];
  const mid = [243, 229, 196];
  const high = [201, 130, 116];
  const start = p < 0.55 ? low : mid;
  const end = p < 0.55 ? mid : high;
  const t = p < 0.55 ? p / 0.55 : (p - 0.55) / 0.45;
  const rgb = start.map((channel, index) => Math.round(channel + (end[index] - channel) * t));
  return `rgb(${rgb.join(",")})`;
}

function scale(value, domainMin, domainMax, rangeMin, rangeMax) {
  return rangeMin + (value - domainMin) / (domainMax - domainMin) * (rangeMax - rangeMin);
}

function addLabel(svg, text, x, y, {
  anchor = "start",
  className = "chart-label",
  paddingX = 5,
  paddingY = 4
} = {}) {
  const width = text.length * 7 + paddingX * 2;
  const height = 18;
  const rectX = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const rectY = y - height + paddingY;
  const group = svgEl("g");
  group.appendChild(svgEl("rect", {
    class: "label-backdrop",
    x: rectX,
    y: rectY,
    width,
    height,
    rx: 4
  }));
  const label = svgEl("text", {
    class: className,
    x: anchor === "start" ? x + paddingX : anchor === "end" ? x - paddingX : x,
    y,
    "text-anchor": anchor
  });
  label.textContent = text;
  group.appendChild(label);
  svg.appendChild(group);
  return group;
}

function drawAxes(svg, plot, xLabel, yLabel, xTicks, yTicks) {
  svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x, y1: plot.y2, x2: plot.x2, y2: plot.y2 }));
  svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x, y1: plot.y, x2: plot.x, y2: plot.y2 }));

  xTicks.forEach((tick) => {
    const x = scale(tick.value, tick.min, tick.max, plot.x, plot.x2);
    svg.appendChild(svgEl("line", { class: "axis-line", x1: x, y1: plot.y2, x2: x, y2: plot.y2 + 5 }));
    const text = svgEl("text", { class: "tick-label", x, y: plot.y2 + 20, "text-anchor": "middle" });
    text.textContent = tick.label;
    svg.appendChild(text);
  });

  yTicks.forEach((tick) => {
    const y = scale(tick.value, tick.min, tick.max, plot.y2, plot.y);
    svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x - 5, y1: y, x2: plot.x, y2: y }));
    const text = svgEl("text", { class: "tick-label", x: plot.x - 10, y: y + 4, "text-anchor": "end" });
    text.textContent = tick.label;
    svg.appendChild(text);
  });

  const xt = svgEl("text", { class: "axis-label", x: (plot.x + plot.x2) / 2, y: plot.y2 + 44, "text-anchor": "middle" });
  xt.textContent = xLabel;
  svg.appendChild(xt);

  const yt = svgEl("text", {
    class: "axis-label",
    x: 16,
    y: (plot.y + plot.y2) / 2,
    "text-anchor": "middle",
    transform: `rotate(-90 16 ${(plot.y + plot.y2) / 2})`
  });
  yt.textContent = yLabel;
  svg.appendChild(yt);
}

function renderHeatmap(result) {
  const svg = $("heatmapSvg");
  clearSvg(svg);
  const plot = { x: 64, y: 28, x2: 688, y2: 352 };
  const maxBias = 25;
  const maxGcv = 30;
  const data = generateOosHeatmapData({
    lowerLimitPercent: state.lowerLimitPercent,
    upperLimitPercent: state.upperLimitPercent,
    maxBiasPercent: maxBias,
    maxGcvPercent: maxGcv,
    biasSteps: 55,
    gcvSteps: 50,
    runs: state.runs,
    replicatesPerRun: state.replicatesPerRun
  });
  const cellW = (plot.x2 - plot.x) / (data.biasSteps + 1);
  const cellH = (plot.y2 - plot.y) / (data.gcvSteps + 1);

  data.cells.forEach((cell) => {
    const x = scale(cell.x, 0, maxBias, plot.x, plot.x2);
    const y = scale(cell.y, 1, maxGcv, plot.y2, plot.y);
    svg.appendChild(svgEl("rect", {
      x: x - cellW / 2,
      y: y - cellH / 2,
      width: cellW + 0.15,
      height: cellH + 0.15,
      fill: colorForRisk(cell.probability),
      stroke: "rgba(255,255,255,0.08)",
      "stroke-width": "0.25"
    }));
  });

  [0.01, 0.05, 0.10].forEach((target) => {
    const points = findPrecisionBoundary({
      lowerLimitPercent: state.lowerLimitPercent,
      upperLimitPercent: state.upperLimitPercent,
      targetProbability: target,
      maxBiasPercent: maxBias,
      maxGcvPercent: maxGcv,
      biasSteps: 100,
      runs: state.runs,
      replicatesPerRun: state.replicatesPerRun
    }).filter((point) => point.gcvPercent !== null);
    if (points.length < 2) return;
    const d = points.map((point, index) => {
      const x = scale(point.biasPercent, 0, maxBias, plot.x, plot.x2);
      const y = scale(point.gcvPercent, 1, maxGcv, plot.y2, plot.y);
      return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    svg.appendChild(svgEl("path", { class: "boundary-guide", d }));
    const labelIndex = target === 0.10 ? 0.54 : target === 0.05 ? 0.66 : 0.78;
    const last = points[Math.min(points.length - 1, Math.round(points.length * labelIndex))];
    const labelX = Math.min(plot.x2 - 8, scale(last.biasPercent, 0, maxBias, plot.x, plot.x2) + 8);
    const labelY = Math.max(plot.y + 20, scale(last.gcvPercent, 1, maxGcv, plot.y2, plot.y) - 6);
    addLabel(svg, `${formatPercent(target, target < 0.01 ? 1 : 0)} boundary`, labelX, labelY);
  });

  drawAxes(
    svg,
    plot,
    `${terms[state.mode].bias} (%)`,
    `${terms[state.mode].precision} (%)`,
    [0, 5, 10, 15, 20, 25].map((v) => ({ value: v, min: 0, max: maxBias, label: `${v}` })),
    [1, 10, 20, 30].map((v) => ({ value: v, min: 1, max: maxGcv, label: `${v}` }))
  );

  const cx = scale(state.relativeBiasPercent, 0, maxBias, plot.x, plot.x2);
  const cy = scale(state.gcvPercent, 1, maxGcv, plot.y2, plot.y);
  svg.appendChild(svgEl("line", { class: "current-crosshair", x1: cx, y1: plot.y, x2: cx, y2: plot.y2 }));
  svg.appendChild(svgEl("line", { class: "current-crosshair", x1: plot.x, y1: cy, x2: plot.x2, y2: cy }));
  svg.appendChild(svgEl("circle", { class: "current-point", cx, cy, r: 7 }));

  const hoverLayer = svgEl("rect", {
    x: plot.x,
    y: plot.y,
    width: plot.x2 - plot.x,
    height: plot.y2 - plot.y,
    fill: "transparent"
  });
  hoverLayer.addEventListener("mousemove", (event) => {
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 720;
    const y = (event.clientY - rect.top) / rect.height * 420;
    const bias = clamp((x - plot.x) / (plot.x2 - plot.x) * maxBias, 0, maxBias);
    const gcv = clamp(1 + (plot.y2 - y) / (plot.y2 - plot.y) * (maxGcv - 1), 1, maxGcv);
    const tails = calculateTailProbabilities({
      lowerLimitPercent: state.lowerLimitPercent,
      upperLimitPercent: state.upperLimitPercent,
      relativeBiasPercent: bias,
      gcvPercent: gcv,
      runs: state.runs,
      replicatesPerRun: state.replicatesPerRun
    });
    const pass = tails.totalOosProbability <= state.targetProbability ? "Within target" : "Above target";
    const tooltip = $("heatmapTooltip");
    tooltip.hidden = false;
    tooltip.innerHTML = `Relative Bias: ${pct(bias)} · GCV: ${pct(gcv)} · ${terms[state.mode].probability}: ${formatPercent(tails.totalOosProbability, 2)} · Dominant tail: ${tails.dominantTail} · ${pass}`;
  });
  hoverLayer.addEventListener("mouseleave", () => {
    $("heatmapTooltip").hidden = true;
  });
  svg.appendChild(hoverLayer);
}

function renderDistribution(result) {
  const svg = $("distributionSvg");
  clearSvg(svg);
  const plot = { x: 58, y: 30, x2: 680, y2: 292 };
  const mu = result.rbLog;
  const sigma = result.sigma;
  const lsl = Math.log(state.lowerLimitPercent / 100);
  const usl = Math.log(state.upperLimitPercent / 100);
  const spread = Math.max(0.14, sigma * 4.1);
  const xMin = Math.min(Math.log(0.48), lsl - 0.14, mu - spread);
  const xMax = Math.max(Math.log(1.65), usl + 0.14, mu + spread);
  const density = (x) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  const maxY = density(mu) * 1.08;
  const points = [];

  for (let i = 0; i <= 180; i += 1) {
    const xValue = xMin + (xMax - xMin) * i / 180;
    const x = scale(xValue, xMin, xMax, plot.x, plot.x2);
    const y = scale(density(xValue), 0, maxY, plot.y2, plot.y);
    points.push([x, y, xValue]);
  }

  const area = `M ${plot.x} ${plot.y2} ${points.map((point) => `L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ")} L ${plot.x2} ${plot.y2} Z`;
  svg.appendChild(svgEl("path", { class: "dist-fill", d: area }));

  const addTail = (filter, className) => {
    const tail = points.filter((point) => filter(point[2]));
    if (tail.length < 2) return;
    const d = `M ${tail[0][0]} ${plot.y2} ${tail.map((point) => `L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ")} L ${tail[tail.length - 1][0]} ${plot.y2} Z`;
    svg.appendChild(svgEl("path", { class: `oos-fill ${className}`, d }));
  };
  addTail((x) => x <= lsl, "lower");
  addTail((x) => x >= usl, "upper");
  const curve = points.map((point, index) => `${index ? "L" : "M"} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ");
  svg.appendChild(svgEl("path", { class: "chart-line", d: curve }));

  [lsl, usl].forEach((limit, index) => {
    const x = scale(limit, xMin, xMax, plot.x, plot.x2);
    svg.appendChild(svgEl("line", { class: "limit-line", x1: x, y1: plot.y, x2: x, y2: plot.y2 }));
    addLabel(svg, index === 0 ? `LSL ${state.lowerLimitPercent}%` : `USL ${state.upperLimitPercent}%`, x, plot.y - 6, { anchor: "middle" });
  });

  const centerX = scale(mu, xMin, xMax, plot.x, plot.x2);
  svg.appendChild(svgEl("line", { class: "center-line", x1: centerX, y1: plot.y, x2: centerX, y2: plot.y2 }));
  const centerAnchor = centerX > plot.x2 - 140 ? "end" : "start";
  addLabel(svg, "distribution center", centerAnchor === "end" ? centerX - 6 : centerX + 6, plot.y + 18, { anchor: centerAnchor });

  const lowerLabel = svgEl("text", { class: "chart-label", x: plot.x + 36, y: plot.y2 - 18 });
  lowerLabel.textContent = `lower tail ${formatPercent(result.lowerTail, 2)}`;
  svg.appendChild(lowerLabel);

  const upperLabel = svgEl("text", { class: "chart-label", x: plot.x2 - 36, y: plot.y2 - 18, "text-anchor": "end" });
  upperLabel.textContent = `upper tail ${formatPercent(result.upperTail, 2)}`;
  svg.appendChild(upperLabel);

  drawAxes(
    svg,
    plot,
    "Report value on log scale",
    "Density",
    [50, 80, 100, 125, 160].map((v) => ({ value: Math.log(v / 100), min: xMin, max: xMax, label: `${v}%` })),
    []
  );
  $("distributionCaption").textContent = "Use this view first: the OOS number comes from the shaded tails, not from the controls themselves.";
}

function renderBoundary() {
  const svg = $("boundarySvg");
  clearSvg(svg);
  const plot = { x: 48, y: 24, x2: 610, y2: 260 };
  const points = findPrecisionBoundary({
    lowerLimitPercent: state.lowerLimitPercent,
    upperLimitPercent: state.upperLimitPercent,
    targetProbability: state.targetProbability,
    maxBiasPercent: 25,
    maxGcvPercent: 30,
    biasSteps: 120,
    runs: state.runs,
    replicatesPerRun: state.replicatesPerRun
  });
  const valid = points.filter((point) => point.gcvPercent !== null);
  if (valid.length > 1) {
    const d = valid.map((point, index) => {
      const x = scale(point.biasPercent, 0, 25, plot.x, plot.x2);
      const y = scale(point.gcvPercent, 0, 30, plot.y2, plot.y);
      return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
    svg.appendChild(svgEl("path", { class: "chart-line", d }));
  }
  drawAxes(
    svg,
    plot,
    `${terms[state.mode].bias} (%)`,
    `Max ${terms[state.mode].precision} (%)`,
    [0, 5, 10, 15, 20, 25].map((v) => ({ value: v, min: 0, max: 25, label: `${v}` })),
    [0, 10, 20, 30].map((v) => ({ value: v, min: 0, max: 30, label: `${v}` }))
  );
  const selected = valid.reduce((closest, point) => (
    Math.abs(point.biasPercent - state.relativeBiasPercent) < Math.abs(closest.biasPercent - state.relativeBiasPercent) ? point : closest
  ), valid[0] || { biasPercent: state.relativeBiasPercent, gcvPercent: 0 });
  if (selected.gcvPercent !== null) {
    svg.appendChild(svgEl("circle", {
      class: "current-point",
      cx: scale(selected.biasPercent, 0, 25, plot.x, plot.x2),
      cy: scale(selected.gcvPercent, 0, 30, plot.y2, plot.y),
      r: 5
    }));
    $("boundaryTooltip").hidden = false;
    const status = state.gcvPercent <= selected.gcvPercent
      ? "The current precision stays within this boundary."
      : "The current spread is wider than the selected target allows at this bias level.";
    $("boundaryTooltip").textContent = `${terms[state.mode].bias} ${selected.biasPercent.toFixed(1)}% -> max ${terms[state.mode].precision} ${selected.gcvPercent.toFixed(2)}% at ${fmt(state.targetProbability, state.targetProbability < 0.01 ? 1 : 0)} target. ${status}`;
  } else {
    $("boundaryTooltip").hidden = true;
  }
}

function miniPath(points, key, plot) {
  const values = points.map((point) => point[key]).filter((value) => value !== undefined);
  const maxY = Math.max(...values, 1);
  return points
    .filter((point) => point[key] !== undefined)
    .map((point, index) => {
      const x = scale(point.x, -3, 3, plot.x, plot.x2);
      const y = scale(point[key], 0, maxY, plot.y2, plot.y);
      return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
}

function renderConceptMiniCurves() {
  const plot = { x: 10, y: 5, x2: 150, y2: 64 };
  const configs = [
    ["conceptAccuracy", "accuracy", ["left", "right"]],
    ["conceptPrecision", "precision", ["narrow", "wide"]],
    ["conceptTails", "tails", ["curve"]]
  ];
  configs.forEach(([id, type, keys]) => {
    const svg = $(id);
    clearSvg(svg);
    svg.appendChild(svgEl("line", { class: "axis-line", x1: plot.x, y1: plot.y2, x2: plot.x2, y2: plot.y2 }));
    if (type === "tails") {
      svg.appendChild(svgEl("rect", { x: plot.x, y: plot.y, width: 30, height: plot.y2 - plot.y, class: "oos-fill lower" }));
      svg.appendChild(svgEl("rect", { x: plot.x2 - 30, y: plot.y, width: 30, height: plot.y2 - plot.y, class: "oos-fill upper" }));
      svg.appendChild(svgEl("line", { class: "limit-line", x1: plot.x + 30, y1: plot.y + 4, x2: plot.x + 30, y2: plot.y2 }));
      svg.appendChild(svgEl("line", { class: "limit-line", x1: plot.x2 - 30, y1: plot.y + 4, x2: plot.x2 - 30, y2: plot.y2 }));
    }
    const points = generateConceptMiniCurves(type);
    keys.forEach((key, index) => {
      svg.appendChild(svgEl("path", {
        class: index === 0 ? "concept-line" : "concept-line muted",
        d: miniPath(points, key, plot)
      }));
    });
  });
}

function renderTailContribution(result) {
  const tails = calculateTailProbabilities(state);
  const total = Math.max(tails.totalOosProbability, 1e-9);
  $("lowerTailValue").textContent = formatPercent(tails.lowerTailProbability, 2);
  $("upperTailValue").textContent = formatPercent(tails.upperTailProbability, 2);
  $("totalTailValue").textContent = formatPercent(tails.totalOosProbability, 2);
  $("dominantTailValue").textContent = tails.dominantTail;
  $("lowerTailFill").style.width = `${Math.max(1, tails.lowerTailProbability / total * 100).toFixed(1)}%`;
  $("upperTailFill").style.width = `${Math.max(1, tails.upperTailProbability / total * 100).toFixed(1)}%`;
  $("tailStatusLine").textContent = tails.totalOosProbability <= state.targetProbability
    ? `The combined tail area stays below the selected target of ${formatPercent(state.targetProbability, 1)}.`
    : `The combined tail area is above the selected target of ${formatPercent(state.targetProbability, 1)}.`;
  $("targetStatus").textContent = result.probability <= state.targetProbability ? "Within target" : "Above target";
  $("tailValue").textContent = `Dominant tail: ${tails.dominantTail}`;
}

function renderBaselineComparison() {
  const comparison = calculateBaselineComparison(state);
  $("baselineRisk").textContent = formatPercent(comparison.baseline.probability, 2);
  $("currentRisk").textContent = formatPercent(comparison.current.probability, 2);
  const sign = comparison.deltaPercentagePoints >= 0 ? "+" : "";
  $("deltaRisk").textContent = `${sign}${comparison.deltaPercentagePoints.toFixed(2)} pp`;
}

function contributionText(result) {
  const biasRisk = calculateOosRisk({ ...state, relativeBiasPercent: 0 }).probability;
  const precisionRisk = calculateOosRisk({ ...state, gcvPercent: 1 }).probability;
  const biasDelta = Math.max(0, result.probability - biasRisk);
  const precisionDelta = Math.max(0, result.probability - precisionRisk);
  if (Math.abs(biasDelta - precisionDelta) < 0.002) return "bias and precision contribute similarly";
  return biasDelta > precisionDelta ? "bias is the larger pressure" : "precision is the larger pressure";
}

function renderReadouts(result) {
  const term = terms[state.mode];
  document.querySelectorAll("[data-term='bias']").forEach((el) => { el.textContent = term.bias; });
  document.querySelectorAll("[data-term='precision']").forEach((el) => { el.textContent = term.precision; });
  document.querySelectorAll("[data-term='probability']").forEach((el) => { el.textContent = term.probability; });

  $("biasValue").textContent = pct(state.relativeBiasPercent);
  $("precisionValue").textContent = pct(state.gcvPercent);
  $("targetValue").textContent = fmt(state.targetProbability, state.targetProbability < 0.01 ? 1 : 1);
  $("limitReadout").textContent = `${state.lowerLimitPercent.toFixed(1).replace(".0", "")}-${state.upperLimitPercent.toFixed(1).replace(".0", "")}%`;
  $("replicationReadout").textContent = `c${state.runs} x k${state.replicatesPerRun}`;
  $("riskValue").textContent = fmt(result.probability, result.probability < 0.001 ? 3 : 2);
  $("effectivePrecision").textContent = pct(result.effectiveGcvPercent, 2);
  $("targetStatus").textContent = result.probability <= state.targetProbability ? "Within target" : "Above target";
  const pressureText = contributionText(result);
  $("pressureValue").textContent = pressureText.includes("similarly")
    ? "Balanced"
    : pressureText.includes("bias") ? term.bias : term.precision;
  $("tailValue").textContent = `Dominant tail: ${getDominantTail(result.lowerTail, result.upperTail)}`;

  const relation = result.probability <= state.targetProbability ? "stays below" : "is above";
  const implication = result.probability <= state.targetProbability
    ? "This combination is compatible with the selected target in this simplified reportable-result model."
    : `A useful next question is whether the design should reduce ${term.bias}, reduce ${term.precision}, or change the report-value replication strategy.`;
  $("interpretationText").textContent = `The shaded tail area is ${fmt(result.probability, 2)}, so it ${relation} the selected target of ${fmt(state.targetProbability, 1)}. Under the current limits, ${pressureText}. ${implication}`;
  $("formulaValues").innerHTML = `
    ${term.bias}<sub>log</sub> = ln(1 + ${term.bias}/100) = ${result.rbLog.toFixed(4)}<br>
    sigma = ln(1 + ${term.precision}/100) = ${result.sigma.toFixed(4)}<br>
    Z_L = ${result.zLower.toFixed(3)}<br>
    Z_U = ${result.zUpper.toFixed(3)}<br>
    ${term.probability} = lower tail + upper tail = ${formatPercent(result.lowerTail, 2)} + ${formatPercent(result.upperTail, 2)} = ${formatPercent(result.probability, 2)}
  `;
}

function readState() {
  state.mode = $("standardMode").value;
  state.lowerLimitPercent = Number($("lowerLimit").value) || 80;
  state.upperLimitPercent = Number($("upperLimit").value) || 125;
  state.relativeBiasPercent = Number($("biasSlider").value) || 0;
  state.gcvPercent = Number($("precisionSlider").value) || 1;
  state.targetProbability = Math.max(0.00001, (Number($("targetCustom").value) || 1) / 100);
  state.runs = Math.max(1, Math.round(Number($("runs").value) || 1));
  state.replicatesPerRun = Math.max(1, Math.round(Number($("replicates").value) || 1));
}

const pairedInputs = [
  ["biasSlider", "biasInput"],
  ["precisionSlider", "precisionInput"]
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

function render() {
  readState();
  syncPairedInputs();
  const result = calculateOosRisk(state);
  renderConceptMiniCurves();
  renderReadouts(result);
  renderDistribution(result);
  renderTailContribution(result);
  renderBaselineComparison();
  renderHeatmap(result);
  renderBoundary(result);
}

function setPreset(preset) {
  state.preset = preset;
  document.querySelectorAll("[data-preset]").forEach((button) => button.classList.toggle("active", button.dataset.preset === preset));
  if (preset === "70-143") {
    $("lowerLimit").value = 70;
    $("upperLimit").value = 143;
  }
  if (preset === "80-125") {
    $("lowerLimit").value = 80;
    $("upperLimit").value = 125;
  }
  render();
}

function setTarget(target) {
  $("targetCustom").value = (Number(target) * 100).toString();
  document.querySelectorAll("[data-target]").forEach((button) => button.classList.toggle("active", button.dataset.target === String(target)));
  render();
}

function init() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => setPreset(button.dataset.preset));
  });
  document.querySelectorAll("[data-target]").forEach((button) => {
    button.addEventListener("click", () => setTarget(button.dataset.target));
  });
  ["standardMode", "lowerLimit", "upperLimit", "biasSlider", "precisionSlider", "targetCustom", "runs", "replicates"].forEach((id) => {
    $(id).addEventListener("input", () => {
      if (id === "lowerLimit" || id === "upperLimit") {
        document.querySelectorAll("[data-preset]").forEach((button) => button.classList.toggle("active", button.dataset.preset === "custom"));
      }
      if (id === "targetCustom") {
        document.querySelectorAll("[data-target]").forEach((button) => button.classList.remove("active"));
      }
      render();
    });
  });
  pairedInputs.forEach(([rangeId, numberId]) => {
    const range = $(rangeId);
    const number = $(numberId);
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
