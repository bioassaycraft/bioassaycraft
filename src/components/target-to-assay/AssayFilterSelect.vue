<script setup>
const value = defineModel({ type: String, required: true });
defineProps({
  label: { type: String, required: true },
  all: { type: String, required: true },
  options: { type: Array, required: true },
  disabled: Boolean,
});
</script>

<template>
  <label class="assay-filter-select">
    <span>{{ label }}</span>
    <span class="assay-filter-control">
      <select v-model="value" :disabled="disabled">
        <option value="">{{ all }}</option>
        <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
      </select>
    </span>
  </label>
</template>

<style scoped>
.assay-filter-select {
  display: grid;
  min-width: 0;
  flex: 0 1 12.5rem;
  gap: 4px;
  color: var(--app-muted);
  font-size: var(--ta-label-size);
  line-height: 1.4;
}
.assay-filter-control { position: relative; }
.assay-filter-control::after {
  content: "";
  position: absolute;
  inset-inline-end: 12px;
  inset-block-start: 50%;
  width: 6px;
  height: 6px;
  border: solid var(--app-muted);
  border-width: 0 1px 1px 0;
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}
select {
  appearance: none;
  box-sizing: border-box;
  min-height: 36px;
  width: 100%;
  padding: 5px 28px 5px 10px;
  border: 1px solid var(--app-rule-subtle);
  border-radius: 8px;
  background: var(--app-section);
  color: var(--app-text);
  font: inherit;
}
select:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
</style>
