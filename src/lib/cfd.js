export const CFD_MODES = {
  unpaired: {
    id: "unpaired",
    varianceMultiplier: 2,
    formula: "CFD = exp{a × √(2 × V_RR)}",
    basis: "中国药典 9401 公式（19）；USP <1033> Eq. 12（Unpaired）",
  },
  paired: {
    id: "paired",
    varianceMultiplier: 1,
    formula: "CFD = exp{a × √V_RR}",
    basis: "USP <1033> Eq. 11（Paired）",
  },
};

function number(value) {
  return typeof value === "number" ? value : Number(value);
}

function validPositiveInteger(value) {
  const parsed = number(value);
  return Number.isInteger(parsed) && parsed >= 1;
}

/** Calculate the critical fold difference from natural-log variance components. */
export function calculateCfd({
  mode = "unpaired",
  withinVariance,
  betweenVariance,
  independentMeasurements,
  replicatesPerMeasurement,
  criticalCoefficient = 2,
}) {
  const within = number(withinVariance);
  const between = number(betweenVariance);
  const c = number(independentMeasurements);
  const k = number(replicatesPerMeasurement);
  const coefficient = number(criticalCoefficient);
  const selectedMode = CFD_MODES[mode] ?? CFD_MODES.unpaired;

  if (!Number.isFinite(within) || within < 0) return { ok: false, reason: "withinVariance" };
  if (!Number.isFinite(between) || between < 0) return { ok: false, reason: "betweenVariance" };
  if (!validPositiveInteger(c)) return { ok: false, reason: "independentMeasurements" };
  if (!validPositiveInteger(k)) return { ok: false, reason: "replicatesPerMeasurement" };
  if (!Number.isFinite(coefficient) || coefficient <= 0) return { ok: false, reason: "criticalCoefficient" };

  const vrr = within / (c * k) + between / c;
  const cfd = Math.exp(coefficient * Math.sqrt(selectedMode.varianceMultiplier * vrr));
  return { ok: true, vrr, cfd, mode: selectedMode.id, coefficient };
}

export function compareReportValues(valueA, valueB, cfd) {
  const a = number(valueA);
  const b = number(valueB);
  if (!Number.isFinite(a) || a <= 0) return { ok: false, reason: "valueA" };
  if (!Number.isFinite(b) || b <= 0) return { ok: false, reason: "valueB" };
  if (!Number.isFinite(cfd) || cfd <= 0) return { ok: false, reason: "cfd" };

  const observedFoldDifference = Math.max(a, b) / Math.min(a, b);
  return {
    ok: true,
    observedFoldDifference,
    exceedsMethodUncertainty: observedFoldDifference > cfd,
  };
}
