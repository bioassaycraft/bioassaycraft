export const endotoxinRouteOptions = [
  { key: "nonIntrathecal", threshold: 5, custom: false },
  { key: "intrathecal", threshold: 0.2, custom: false },
  { key: "custom", threshold: null, custom: true },
];

export const endotoxinDoseUnitOptions = [
  { key: "mgDose", unit: "mg/dose", requiresBodyWeight: true, requiresConcentration: false },
  { key: "mgKgDose", unit: "mg/kg/dose", requiresBodyWeight: false, requiresConcentration: false },
  { key: "mLDose", unit: "mL/dose", requiresBodyWeight: true, requiresConcentration: true },
];

export const endotoxinSafetyFactorOptions = [
  { key: "1", value: 1, custom: false },
  { key: "2", value: 2, custom: false },
  { key: "3", value: 3, custom: false },
  { key: "4", value: 4, custom: false },
  { key: "5", value: 5, custom: false },
  { key: "10", value: 10, custom: false },
  { key: "custom", value: null, custom: true },
];

export function parsePositiveNumber(value, { allowZero = false } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  if (allowZero ? parsed < 0 : parsed <= 0) return Number.NaN;
  return parsed;
}

export function getEndotoxinRoute(key) {
  return endotoxinRouteOptions.find((route) => route.key === key) ?? endotoxinRouteOptions[0];
}

export function getEndotoxinDoseUnit(key) {
  return endotoxinDoseUnitOptions.find((unit) => unit.key === key) ?? endotoxinDoseUnitOptions[0];
}

export function getEndotoxinSafetyFactor(optionKey, customValue) {
  const option =
    endotoxinSafetyFactorOptions.find((factor) => factor.key === optionKey) ??
    endotoxinSafetyFactorOptions[3];

  if (!option.custom) return option.value;
  return parsePositiveNumber(customValue);
}

export function getEndotoxinThreshold(routeKey, customThresholdValue) {
  const route = getEndotoxinRoute(routeKey);
  if (!route.custom) return route.threshold;
  return parsePositiveNumber(customThresholdValue);
}

export function calculateMaximumDosePerKgHour({
  maximumDose,
  doseUnitKey,
  bodyWeight,
  hourlyAdministration,
  productConcentration,
}) {
  const doseUnit = getEndotoxinDoseUnit(doseUnitKey);
  const dose = parsePositiveNumber(maximumDose);
  const administrations = parsePositiveNumber(hourlyAdministration);
  const weight = doseUnit.requiresBodyWeight ? parsePositiveNumber(bodyWeight) : null;
  const concentration = doseUnit.requiresConcentration
    ? parsePositiveNumber(productConcentration)
    : parsePositiveNumber(productConcentration);

  if (dose === null) return { ok: false, reasonKey: "missingDose", doseUnit };
  if (Number.isNaN(dose)) return { ok: false, reasonKey: "invalidDose", doseUnit };
  if (administrations === null) return { ok: false, reasonKey: "missingAdministration", doseUnit };
  if (Number.isNaN(administrations)) {
    return { ok: false, reasonKey: "invalidAdministration", doseUnit };
  }

  if (doseUnit.requiresBodyWeight) {
    if (weight === null) return { ok: false, reasonKey: "missingBodyWeight", doseUnit };
    if (Number.isNaN(weight)) return { ok: false, reasonKey: "invalidBodyWeight", doseUnit };
  }

  if (doseUnit.requiresConcentration) {
    if (concentration === null) return { ok: false, reasonKey: "missingConcentration", doseUnit };
    if (Number.isNaN(concentration)) {
      return { ok: false, reasonKey: "invalidConcentration", doseUnit };
    }
  } else if (Number.isNaN(concentration)) {
    return { ok: false, reasonKey: "invalidConcentration", doseUnit };
  }

  let maximumDosePerKgHour;

  if (doseUnit.key === "mgKgDose") {
    maximumDosePerKgHour = dose * administrations;
  } else if (doseUnit.key === "mLDose") {
    maximumDosePerKgHour = (dose * concentration * administrations) / weight;
  } else {
    maximumDosePerKgHour = (dose * administrations) / weight;
  }

  return {
    ok: true,
    doseUnit,
    maximumDose: dose,
    bodyWeight: weight,
    hourlyAdministration: administrations,
    productConcentration: concentration,
    maximumDosePerKgHour,
  };
}

export function calculateEndotoxinSpecification({
  routeKey = "nonIntrathecal",
  customThresholdValue = "",
  maximumDose = "",
  doseUnitKey = "mgDose",
  bodyWeight = 70,
  hourlyAdministration = 1,
  productConcentration = "",
  safetyFactorKey = "4",
  customSafetyFactorValue = "",
} = {}) {
  const route = getEndotoxinRoute(routeKey);
  const threshold = getEndotoxinThreshold(routeKey, customThresholdValue);
  const safetyFactor = getEndotoxinSafetyFactor(safetyFactorKey, customSafetyFactorValue);
  const maximumDoseResult = calculateMaximumDosePerKgHour({
    maximumDose,
    doseUnitKey,
    bodyWeight,
    hourlyAdministration,
    productConcentration,
  });
  const optionalConcentration = parsePositiveNumber(productConcentration);

  if (threshold === null) {
    return { ok: false, reasonKey: "missingThreshold", route, threshold };
  }

  if (Number.isNaN(threshold)) {
    return { ok: false, reasonKey: "invalidThreshold", route, threshold };
  }

  if (!maximumDoseResult.ok) {
    return {
      ok: false,
      reasonKey: maximumDoseResult.reasonKey,
      route,
      threshold,
      safetyFactor,
      maximumDoseResult,
    };
  }

  if (safetyFactor === null) {
    return {
      ok: false,
      reasonKey: "missingSafetyFactor",
      route,
      threshold,
      maximumDoseResult,
    };
  }

  if (Number.isNaN(safetyFactor)) {
    return {
      ok: false,
      reasonKey: "invalidSafetyFactor",
      route,
      threshold,
      maximumDoseResult,
    };
  }

  const pharmacopeialLimit = threshold / maximumDoseResult.maximumDosePerKgHour;
  const internalSpecification = pharmacopeialLimit / safetyFactor;
  const equivalentSpecification =
    optionalConcentration === null || Number.isNaN(optionalConcentration)
      ? null
      : internalSpecification * optionalConcentration;

  return {
    ok: true,
    route,
    threshold,
    safetyFactor,
    maximumDoseResult,
    pharmacopeialLimit,
    internalSpecification,
    equivalentSpecification,
  };
}

export function formatEndotoxinNumber(value) {
  if (!Number.isFinite(value)) return "--";
  if (value === 0) return "0";

  const absolute = Math.abs(value);
  if (absolute >= 1e6 || absolute < 0.0001) {
    return value.toExponential(4).replace(/\.?0+e/, "e");
  }

  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 8,
  }).format(value);
}
