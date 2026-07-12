<script setup>
import { computed } from "vue";
import "katex/dist/katex.min.css";
import { renderMathFormula } from "../../utils/math-formula";

const props = defineProps({
  formula: { type: String, required: true },
  display: { type: Boolean, default: false },
  ariaLabel: { type: String, default: "" },
});

const renderedFormula = computed(() =>
  renderMathFormula(props.formula, props.display),
);
</script>

<template>
  <span
    class="math-formula"
    :class="{ 'math-formula--display': display }"
    :aria-label="ariaLabel || undefined"
    v-html="renderedFormula"
  />
</template>

<style scoped>
.math-formula {
  max-width: 100%;
  min-width: 0;
  color: inherit;
}
.math-formula:not(.math-formula--display) {
  display: inline;
  vertical-align: baseline;
}
.math-formula--display {
  display: block;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 0.25rem;
  text-align: center;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
.math-formula--display :deep(.katex-display) {
  margin: 0;
}
.math-formula :deep(.katex) {
  color: inherit;
  font-size: 1em;
}
@media (max-width: 767px) {
  .math-formula--display :deep(.katex) {
    font-size: clamp(0.9rem, 3.6vw, 1.05rem);
  }
}
</style>
