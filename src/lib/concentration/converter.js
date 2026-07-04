export const concentrationUnits = [
  { key: "gL", label: "g/L", kind: "mass", factorToBase: 1 },
  { key: "mgmL", label: "mg/mL", kind: "mass", factorToBase: 1 },
  { key: "mgL", label: "mg/L", kind: "mass", factorToBase: 1e-3 },
  { key: "ugmL", label: "μg/mL", kind: "mass", factorToBase: 1e-3 },
  { key: "ugL", label: "μg/L", kind: "mass", factorToBase: 1e-6 },
  { key: "ngmL", label: "ng/mL", kind: "mass", factorToBase: 1e-6 },
  { key: "ngL", label: "ng/L", kind: "mass", factorToBase: 1e-9 },
  { key: "molL", label: "M", kind: "molar", factorToBase: 1 },
  { key: "mmolL", label: "mM", kind: "molar", factorToBase: 1e-3 },
  { key: "umolL", label: "μM", kind: "molar", factorToBase: 1e-6 },
  { key: "nmolL", label: "nM", kind: "molar", factorToBase: 1e-9 },
  { key: "pmolL", label: "pM", kind: "molar", factorToBase: 1e-12 },
];

export const molecularWeightUnits = [
  { key: "da", label: "Da", factorToGramPerMol: 1 },
  { key: "kda", label: "kDa", factorToGramPerMol: 1000 },
  { key: "gmol", label: "g/mol", factorToGramPerMol: 1 },
];

export const molecularWeightPresets = [
  { key: "igg", label: "IgG antibody", value: 150, unit: "kda" },
  { key: "fab", label: "Fab fragment", value: 50, unit: "kda" },
  { key: "albumin", label: "Albumin", value: 66.5, unit: "kda" },
];

export function getConcentrationUnit(key) {
  return concentrationUnits.find((unit) => unit.key === key) ?? null;
}

export function getMolecularWeightUnit(key) {
  return molecularWeightUnits.find((unit) => unit.key === key) ?? null;
}

export function parsePositiveNumber(value, { allowZero = false } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  if (allowZero ? parsed < 0 : parsed <= 0) return Number.NaN;
  return parsed;
}

export function getMolecularWeightInGramPerMol(value, unitKey) {
  const unit = getMolecularWeightUnit(unitKey);
  const parsed = parsePositiveNumber(value);

  if (!unit || parsed === null || Number.isNaN(parsed)) {
    return parsed;
  }

  return parsed * unit.factorToGramPerMol;
}

export function requiresMolecularWeight(fromUnitKey, toUnitKey) {
  const fromUnit = getConcentrationUnit(fromUnitKey);
  const toUnit = getConcentrationUnit(toUnitKey);

  if (!fromUnit || !toUnit) return false;
  return fromUnit.kind !== toUnit.kind;
}

export function convertConcentration({
  value,
  fromUnitKey,
  toUnitKey,
  molecularWeightValue = "",
  molecularWeightUnitKey = "kda",
}) {
  const fromUnit = getConcentrationUnit(fromUnitKey);
  const toUnit = getConcentrationUnit(toUnitKey);
  const inputValue = parsePositiveNumber(value, { allowZero: true });

  if (!fromUnit || !toUnit) {
    return { ok: false, reasonKey: "unknownUnit", reason: "Unknown concentration unit." };
  }

  if (inputValue === null) {
    return { ok: false, reasonKey: "emptyValue", reason: "Enter a concentration value." };
  }

  if (Number.isNaN(inputValue)) {
    return {
      ok: false,
      reasonKey: "invalidValue",
      reason: "Concentration must be a number greater than or equal to 0.",
    };
  }

  const needsMolecularWeight = fromUnit.kind !== toUnit.kind;
  const molecularWeight = getMolecularWeightInGramPerMol(
    molecularWeightValue,
    molecularWeightUnitKey,
  );

  if (needsMolecularWeight) {
    if (molecularWeight === null) {
      return {
        ok: false,
        reasonKey: "missingMw",
        reason: "Molecular weight is required for mass ↔ molar conversion.",
        needsMolecularWeight,
      };
    }

    if (Number.isNaN(molecularWeight)) {
      return {
        ok: false,
        reasonKey: "invalidMw",
        reason: "Molecular weight must be greater than 0.",
        needsMolecularWeight,
      };
    }
  }

  let baseValue;
  let outputValue;

  if (fromUnit.kind === toUnit.kind) {
    baseValue = inputValue * fromUnit.factorToBase;
    outputValue = baseValue / toUnit.factorToBase;
  } else if (fromUnit.kind === "mass") {
    const gramPerLiter = inputValue * fromUnit.factorToBase;
    const molPerLiter = gramPerLiter / molecularWeight;
    baseValue = molPerLiter;
    outputValue = molPerLiter / toUnit.factorToBase;
  } else {
    const molPerLiter = inputValue * fromUnit.factorToBase;
    const gramPerLiter = molPerLiter * molecularWeight;
    baseValue = gramPerLiter;
    outputValue = gramPerLiter / toUnit.factorToBase;
  }

  return {
    ok: true,
    inputValue,
    outputValue,
    baseValue,
    fromUnit,
    toUnit,
    needsMolecularWeight,
    molecularWeight: needsMolecularWeight ? molecularWeight : null,
    conversionFactor: inputValue === 0 ? null : outputValue / inputValue,
  };
}

export function formatConcentrationNumber(value) {
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
