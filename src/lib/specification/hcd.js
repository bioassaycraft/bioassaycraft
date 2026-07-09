import { endotoxinDoseUnitOptions, parsePositiveNumber } from "./endotoxin";

export const hcdWhoLimitOptions = [
  { key: "who10ng", valueNgPerDose: 10, custom: false },
  { key: "custom", valueNgPerDose: null, custom: true },
];

export const hcdSafetyFactorOptions = [
  { key: "1", value: 1, custom: false },
  { key: "2", value: 2, custom: false },
  { key: "3", value: 3, custom: false },
  { key: "4", value: 4, custom: false },
  { key: "5", value: 5, custom: false },
  { key: "10", value: 10, custom: false },
  { key: "custom", value: null, custom: true },
];

export function getHcdWhoLimit(optionKey, customValue) {
  const option = hcdWhoLimitOptions.find((item) => item.key === optionKey) ?? hcdWhoLimitOptions[0];
  if (!option.custom) return option.valueNgPerDose;
  return parsePositiveNumber(customValue);
}

export function getHcdSafetyFactor(optionKey, customValue) {
  const option =
    hcdSafetyFactorOptions.find((item) => item.key === optionKey) ?? hcdSafetyFactorOptions[3];
  if (!option.custom) return option.value;
  return parsePositiveNumber(customValue);
}

export function calculateHcdSpecification({
  whoLimitKey = "who10ng",
  customWhoLimitNgValue = "",
  maximumDose = "",
  doseUnitKey = "mgDose",
  bodyWeight = 70,
  safetyFactorKey = "4",
  customSafetyFactorValue = "",
} = {}) {
  const doseUnit =
    endotoxinDoseUnitOptions.find((unit) => unit.key === doseUnitKey) ??
    endotoxinDoseUnitOptions[0];
  const whoLimitNgPerDose = getHcdWhoLimit(whoLimitKey, customWhoLimitNgValue);
  const safetyFactor = getHcdSafetyFactor(safetyFactorKey, customSafetyFactorValue);
  const dose = parsePositiveNumber(maximumDose);
  const weight = parsePositiveNumber(bodyWeight);

  if (whoLimitNgPerDose === null) {
    return { ok: false, reasonKey: "missingWhoLimit", doseUnit };
  }

  if (Number.isNaN(whoLimitNgPerDose)) {
    return { ok: false, reasonKey: "invalidWhoLimit", doseUnit };
  }

  if (doseUnit.key === "mLDose") {
    return {
      ok: false,
      reasonKey: "unsupportedDoseUnit",
      doseUnit,
      whoLimitNgPerDose,
      whoLimitPgPerDose: whoLimitNgPerDose * 1000,
    };
  }

  if (dose === null) {
    return { ok: false, reasonKey: "missingDose", doseUnit, whoLimitNgPerDose };
  }

  if (Number.isNaN(dose)) {
    return { ok: false, reasonKey: "invalidDose", doseUnit, whoLimitNgPerDose };
  }

  if (doseUnit.key === "mgKgDose") {
    if (weight === null) {
      return { ok: false, reasonKey: "missingBodyWeight", doseUnit, whoLimitNgPerDose };
    }

    if (Number.isNaN(weight)) {
      return { ok: false, reasonKey: "invalidBodyWeight", doseUnit, whoLimitNgPerDose };
    }
  }

  if (safetyFactor === null) {
    return { ok: false, reasonKey: "missingSafetyFactor", doseUnit, whoLimitNgPerDose };
  }

  if (Number.isNaN(safetyFactor)) {
    return { ok: false, reasonKey: "invalidSafetyFactor", doseUnit, whoLimitNgPerDose };
  }

  const whoLimitPgPerDose = whoLimitNgPerDose * 1000;
  const totalDoseMg = doseUnit.key === "mgKgDose" ? dose * weight : dose;
  const theoreticalLimit = whoLimitPgPerDose / totalDoseMg;
  const internalSpecification = theoreticalLimit / safetyFactor;

  return {
    ok: true,
    doseUnit,
    whoLimitNgPerDose,
    whoLimitPgPerDose,
    maximumDose: dose,
    bodyWeight: doseUnit.key === "mgKgDose" ? weight : null,
    totalDoseMg,
    safetyFactor,
    theoreticalLimit,
    internalSpecification,
  };
}
