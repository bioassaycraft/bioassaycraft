<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  activeView: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["set-view"]);
</script>

<template>
  <section class="mobile-view-switch" :aria-label="copy.mobile.viewSwitchLabel">
    <button
      type="button"
      :class="{ 'is-active': activeView === 'fit' }"
      @click="emit('set-view', 'fit')"
    >
      {{ copy.mobile.fitView }}
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeView === 'decomposition' }"
      @click="emit('set-view', 'decomposition')"
    >
      {{ copy.mobile.decompositionView }}
    </button>
  </section>
</template>

<style scoped>
.mobile-view-switch {
  display: none;
}

@media (max-width: 767px) {
  .mobile-view-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
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

  .mobile-view-switch button {
    min-height: var(--mobile-switch-height, 36px);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
  }

  .mobile-view-switch button.is-active {
    background: var(--bc-bg-selected, rgba(255, 255, 255, 0.82));
    color: var(--ink, #171717);
    box-shadow: var(--bc-shadow-card, 0 8px 18px rgba(23, 23, 23, 0.032));
  }
}
</style>
