<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  activeModule: {
    type: String,
    required: true,
  },
  moduleOrder: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["set-module"]);
</script>

<template>
  <section class="mobile-top-controls" :aria-label="copy.mobile.controlsLabel">
    <section class="mobile-model-switch" :aria-label="copy.modulesLabel">
      <button
        v-for="module in moduleOrder"
        :key="module"
        type="button"
        :class="{ 'is-active': activeModule === module }"
        @click="emit('set-module', module)"
      >
        {{ copy.mobile.modulesShort[module] }}
      </button>
    </section>
  </section>
</template>

<style scoped>
.mobile-top-controls {
  display: none;
}

@media (max-width: 767px) {
  .mobile-top-controls {
    display: grid;
    gap: var(--mobile-sticky-gap, 8px);
    width: 100%;
  }

  .mobile-model-switch {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    min-height: var(--mobile-switch-height, 36px);
    padding: 0;
    border: 1px solid var(--mobile-glass-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-glass-radius, 14px);
    background: var(--mobile-glass-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-glass-shadow, 0 8px 20px rgba(23, 23, 23, 0.026));
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
  }

  .mobile-model-switch button {
    min-width: 0;
    min-height: var(--mobile-switch-height, 36px);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
    white-space: nowrap;
  }

  .mobile-model-switch button.is-active {
    background: var(--bc-bg-selected, rgba(255, 255, 255, 0.82));
    color: var(--ink, #171717);
    box-shadow: var(--bc-shadow-card, 0 8px 18px rgba(23, 23, 23, 0.032));
  }

  .mobile-model-switch button:focus-visible {
    outline: none;
    border-color: var(--accent, #4f5661);
    box-shadow: 0 0 0 4px var(--bc-focus-ring, rgba(79, 86, 97, 0.12));
  }
}
</style>
