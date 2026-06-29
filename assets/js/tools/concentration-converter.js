const units = [
  { key: "ngml", label: "ng/mL", name: "纳克/毫升", kind: "mass", gPerL: 1e-6 },
  { key: "ugml", label: "μg/mL", name: "微克/毫升", kind: "mass", gPerL: 1e-3 },
  { key: "mgml", label: "mg/mL", name: "毫克/毫升", kind: "mass", gPerL: 1 },
  { key: "nm", label: "nM", name: "纳摩尔浓度", kind: "molar", molPerL: 1e-9 },
  { key: "um", label: "μM", name: "微摩尔浓度", kind: "molar", molPerL: 1e-6 },
  { key: "m", label: "M", name: "摩尔浓度", kind: "molar", molPerL: 1 }
];

const concentrationInput = document.querySelector("#concentration");
const molecularWeightInput = document.querySelector("#molecularWeight");
const molecularWeightUnitSelect = document.querySelector("#molecularWeightUnit");
const sourceUnitSelect = document.querySelector("#sourceUnit");
const message = document.querySelector("#message");
const results = document.querySelector("#results");
const baseValue = document.querySelector("#baseValue");

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  if (value === 0) return "0";
  const absolute = Math.abs(value);

  if (absolute >= 1e6 || absolute < 0.0001) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }

  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 8
  }).format(value);
}

function getInputState() {
  const concentration = Number(concentrationInput.value);
  const molecularWeightValue = Number(molecularWeightInput.value);
  const molecularWeightMultiplier = molecularWeightUnitSelect.value === "kda" ? 1000 : 1;
  const molecularWeight = molecularWeightValue * molecularWeightMultiplier;
  const sourceUnit = units.find((unit) => unit.key === sourceUnitSelect.value);

  if (concentrationInput.value === "" || molecularWeightInput.value === "") {
    return { ready: false, text: "请填写浓度和分子量。" };
  }

  if (!Number.isFinite(concentration) || concentration < 0) {
    return { ready: false, text: "浓度需要是大于或等于 0 的数字。" };
  }

  if (!Number.isFinite(molecularWeightValue) || molecularWeightValue <= 0) {
    return { ready: false, text: "分子量需要是大于 0 的数字。" };
  }

  return { ready: true, concentration, molecularWeight, sourceUnit };
}

function toMolPerL(value, unit, molecularWeight) {
  if (unit.kind === "mass") {
    return (value * unit.gPerL) / molecularWeight;
  }

  return value * unit.molPerL;
}

function fromMolPerL(molPerL, unit, molecularWeight) {
  if (unit.kind === "mass") {
    return (molPerL * molecularWeight) / unit.gPerL;
  }

  return molPerL / unit.molPerL;
}

function renderEmpty(text) {
  message.textContent = text;
  baseValue.textContent = "等待输入";
  results.innerHTML = units.map((unit) => `
    <div class="result">
      <div class="unit">${unit.label}<small>${unit.name}</small></div>
      <div class="result-value">--</div>
    </div>
  `).join("");
}

function calculate() {
  const state = getInputState();

  if (!state.ready) {
    renderEmpty(state.text);
    return;
  }

  const molPerL = toMolPerL(state.concentration, state.sourceUnit, state.molecularWeight);
  const gramPerL = molPerL * state.molecularWeight;

  message.textContent = "";
  baseValue.textContent = `${formatNumber(molPerL)} mol/L`;
  results.innerHTML = units.map((unit) => {
    const converted = fromMolPerL(molPerL, unit, state.molecularWeight);
    const activeClass = unit.key === state.sourceUnit.key ? " active" : "";

    return `
      <div class="result${activeClass}">
        <div class="unit">${unit.label}<small>${unit.name}</small></div>
        <div class="result-value">${formatNumber(converted)}</div>
      </div>
    `;
  }).join("");

  baseValue.title = `${formatNumber(gramPerL)} g/L`;
}

concentrationInput.addEventListener("input", calculate);
molecularWeightInput.addEventListener("input", calculate);
molecularWeightUnitSelect.addEventListener("change", calculate);
sourceUnitSelect.addEventListener("change", calculate);
calculate();
