<script setup>
import { computed } from "vue";
import BcTooltip from "../common/BcTooltip.vue";
import { endotoxinDoseUnitOptions, endotoxinRouteOptions } from "../../lib/specification/endotoxin";
import { useLocale } from "../../utils/locale";

defineProps({
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
    frequencyTooltip: "Used for repeated dosing or continuous infusion.",
    concentration: "Product Concentration",
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
    frequencyTooltip: "用于重复给药或连续输注情形。",
    concentration: "产品浓度",
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
        <span>{{ copy.route }}</span>
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
        <span>{{ copy.bodyWeight }}</span>
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
          <BcTooltip :text="copy.frequencyTooltip">
            {{ copy.frequency }}
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
        <span>{{ copy.concentration }}</span>
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
