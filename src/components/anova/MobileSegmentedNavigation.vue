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

@media (max-width: 768px) {
  .mobile-view-switch {
    position: fixed;
    top: calc(
      var(--mobile-safe-top, 12px) + var(--mobile-control-height, 34px) +
        var(--mobile-header-gap, 7px)
    );
    left: 50%;
    z-index: 68;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    width: min(100% - 32px, 1360px);
    min-height: var(--mobile-switch-height, 34px);
    padding: 0;
    border: 1px solid rgba(214, 217, 222, 0.54);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.34);
    backdrop-filter: blur(16px);
    transform: translateX(-50%);
  }

  .mobile-view-switch button {
    min-height: var(--mobile-switch-height, 34px);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: 0.72rem;
    font-weight: 650;
  }

  .mobile-view-switch button.is-active {
    background: rgba(255, 255, 255, 0.82);
    color: var(--ink, #171717);
    box-shadow: 0 8px 18px rgba(23, 23, 23, 0.032);
  }
}
</style>
