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
    <select v-model="value" :disabled="disabled">
      <option value="">{{ all }}</option>
      <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
    </select>
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
select {
  appearance: auto;
  min-height: 36px;
  width: 100%;
  padding: 5px 10px;
  border: 1px solid var(--app-rule-subtle);
  border-radius: 8px;
  background: var(--app-section);
  color: var(--app-text);
  font: inherit;
}
select:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
</style>
