<script setup>
import { computed } from "vue";
import BcTooltip from "../common/BcTooltip.vue";
import { endotoxinDoseUnitOptions, endotoxinRouteOptions } from "../../lib/specification/endotoxin";
import { useLocale } from "../../utils/locale";

const props = defineProps({
  productInformation: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update"]);

const { locale: language } = useLocale();

const copyMap = {
  en: {
    title: "Product Information",
    route: "Administration Route",
    maximumDose: "Maximum Dose",
    doseUnit: "Dose Unit",
    bodyWeight: "Body Weight",
    frequency: "Maximum Administration within 1 Hour",
    concentration: "Product Concentration",
    tooltips: {
      route:
        "Only used for Endotoxin calculation. Used to determine the pharmacopeial K value according to the administration route.",
      frequency:
        "Only used for Endotoxin calculation. Used to calculate the theoretical endotoxin limit according to the pharmacopeial K/M principle.",
      concentration:
        "Only used for Endotoxin calculation. Used to calculate the recommended equivalent EU/mL specification for liquid drug products.",
      bodyWeight: {
        mgDose:
          "Only used for Endotoxin calculation. With the current dose unit (mg/dose), body weight is used to convert the maximum dose to mg/kg for the pharmacopeial K/M calculation.",
        mgKgDose:
          "Only used for HCD calculation. With the current dose unit (mg/kg/dose), body weight is used to calculate the total dose per administration before deriving the HCD specification (pg/mg).",
        mLDose:
          "Only used for Endotoxin calculation. With the current dose unit (mL/dose), body weight is used to calculate the dose volume per kilogram for the pharmacopeial endotoxin limit.",
      },
    },
    routeLabels: {
      nonIntrathecal: "Non-intrathecal",
      intrathecal: "Intrathecal",
      custom: "Custom",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
  zh: {
    title: "产品信息",
    route: "给药途径",
    maximumDose: "最大给药剂量",
    doseUnit: "剂量单位",
    bodyWeight: "体重",
    frequency: "1 小时内最大给药次数",
    concentration: "产品浓度",
    tooltips: {
      route: "仅用于内毒素计算。用于根据不同给药途径自动确定药典 K 值。",
      frequency: "仅用于内毒素计算。用于根据药典 K/M 原理计算理论内毒素限度。",
      concentration: "仅用于内毒素计算。用于计算液体制剂推荐的 EU/mL 等效规格。",
      bodyWeight: {
        mgDose:
          "仅用于内毒素计算。当前剂量单位为 mg/dose。体重用于将最大给药剂量换算为 mg/kg，以计算药典内毒素理论限度（K/M）。",
        mgKgDose:
          "仅用于 HCD 计算。当前剂量单位为 mg/kg/dose。体重用于计算每次总给药量（mg/dose），以推导 HCD 产品规格（pg/mg）。",
        mLDose:
          "仅用于内毒素计算。当前剂量单位为 mL/dose。体重用于计算单位体重给药体积，以推导药典内毒素理论限度。",
      },
    },
    routeLabels: {
      nonIntrathecal: "非鞘内给药",
      intrathecal: "鞘内给药",
      custom: "自定义",
    },
    doseUnitLabels: {
      mgDose: "mg/dose",
      mgKgDose: "mg/kg/dose",
      mLDose: "mL/dose",
    },
  },
};

const copy = computed(() => copyMap[language.value]);
const routeOptions = computed(() =>
  endotoxinRouteOptions.map((route) => ({
    ...route,
    label: copy.value.routeLabels[route.key],
  })),
);
const doseUnitOptions = computed(() =>
  endotoxinDoseUnitOptions.map((unit) => ({
    ...unit,
    label: copy.value.doseUnitLabels[unit.key],
  })),
);
const bodyWeightTooltip = computed(
  () =>
    copy.value.tooltips.bodyWeight[props.productInformation.doseUnit] ??
    copy.value.tooltips.bodyWeight.mgDose,
);

function updateField(key, value) {
  emit("update", { key, value });
}

function normalizeFrequency(event) {
  const parsed = Number(event.target.value);
  if (!Number.isFinite(parsed)) return;
  updateField("frequency", String(Math.max(1, Math.round(parsed))));
}
</script>

<template>
  <section class="product-card" aria-labelledby="product-information-title">
    <h2 id="product-information-title">{{ copy.title }}</h2>

    <div class="product-grid">
      <label class="field-block">
        <span>
          <BcTooltip :text="copy.tooltips.route">
            <span class="tooltip-label">
              {{ copy.route }}
              <span class="info-icon" aria-hidden="true">ⓘ</span>
            </span>
          </BcTooltip>
        </span>
        <select
          :value="productInformation.route"
          @change="updateField('route', $event.target.value)"
        >
          <option v-for="route in routeOptions" :key="route.key" :value="route.key">
            {{ route.label }}
          </option>
        </select>
      </label>

      <label class="field-block">
        <span>{{ copy.doseUnit }}</span>
        <select
          :value="productInformation.doseUnit"
          @change="updateField('doseUnit', $event.target.value)"
        >
          <option v-for="unit in doseUnitOptions" :key="unit.key" :value="unit.key">
            {{ unit.label }}
          </option>
        </select>
      </label>

      <label class="field-block">
        <span>{{ copy.maximumDose }}</span>
        <input
          class="numeric-input"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :value="productInformation.dose"
          @input="updateField('dose', $event.target.value)"
        />
      </label>

      <label class="field-block">
        <span>
          <BcTooltip :text="bodyWeightTooltip">
            <span class="tooltip-label">
              {{ copy.bodyWeight }}
              <span class="info-icon" aria-hidden="true">ⓘ</span>
            </span>
          </BcTooltip>
        </span>
        <input
          class="numeric-input"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :value="productInformation.bodyWeight"
          @input="updateField('bodyWeight', $event.target.value)"
        />
      </label>

      <label class="field-block">
        <span>
          <BcTooltip :text="copy.tooltips.frequency">
            <span class="tooltip-label">
              {{ copy.frequency }}
              <span class="info-icon" aria-hidden="true">ⓘ</span>
            </span>
          </BcTooltip>
        </span>
        <input
          class="numeric-input"
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          :value="productInformation.frequency"
          @input="updateField('frequency', $event.target.value)"
          @change="normalizeFrequency"
        />
      </label>

      <label class="field-block">
        <span>
          <BcTooltip :text="copy.tooltips.concentration">
            <span class="tooltip-label">
              {{ copy.concentration }}
              <span class="info-icon" aria-hidden="true">ⓘ</span>
            </span>
          </BcTooltip>
        </span>
        <input
          class="numeric-input"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="mg/mL"
          :value="productInformation.concentration"
          @input="updateField('concentration', $event.target.value)"
        />
      </label>
    </div>
  </section>
</template>

<style scoped>
.product-card {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--soft-line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
  backdrop-filter: blur(14px);
}

.product-card h2 {
  margin: 0;
  color: var(--ink);
  font-size: 0.96rem;
  font-weight: 600;
  line-height: 1.2;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.field-block {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.field-block > span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.tooltip-label {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
}

.info-icon {
  color: var(--accent);
  font-size: 0.74em;
  font-weight: 700;
  line-height: 1;
  text-transform: none;
}

.numeric-input,
select {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--soft-line);
  border-radius: 7px;
  background: var(--field-bg);
  color: var(--ink);
  font: inherit;
  font-size: 0.76rem;
  outline: none;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.numeric-input {
  padding: 5px 8px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
}

select {
  padding: 5px 28px 5px 8px;
}

.numeric-input:focus,
select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

@media (max-width: 1199px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .product-card {
    gap: 14px;
    padding: 12px;
    border-radius: var(--mobile-card-radius, 16px);
    background: var(--mobile-card-bg, var(--bc-bg-glass));
    box-shadow: var(--mobile-card-shadow, var(--bc-shadow-card));
  }

  .product-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .numeric-input,
  select {
    min-height: 38px;
    border-radius: 11px;
    background: var(--field-bg-soft);
    font-size: 0.78rem;
  }
}
</style>
