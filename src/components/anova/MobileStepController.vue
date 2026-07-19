<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  steps: {
    type: Array,
    required: true,
  },
  activeStep: {
    type: String,
    required: true,
  },
  activeStepIndex: {
    type: Number,
    required: true,
  },
  stepName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["previous", "next", "set-step"]);
</script>

<template>
  <section class="mobile-step-card" :aria-label="copy.stepsLabel">
    <div class="mobile-step-actions">
      <button type="button" :disabled="activeStepIndex <= 0" @click="emit('previous')">
        {{ copy.mobile.previousStep }}
      </button>
      <div class="mobile-step-current">
        <h2>{{ stepName }}</h2>
      </div>
      <button type="button" :disabled="activeStepIndex >= steps.length - 1" @click="emit('next')">
        {{ copy.mobile.nextStep }}
      </button>
    </div>
    <div class="mobile-step-progress" :aria-label="copy.mobile.stepProgressLabel">
      <button
        v-for="(step, index) in steps"
        :key="`mobile-progress-${step}`"
        type="button"
        :class="{
          'is-active': activeStep === step,
          'is-past': index < activeStepIndex,
        }"
        @click="emit('set-step', step)"
      >
        <span>{{ index + 1 }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.mobile-step-card {
  display: none;
}

@media (max-width: 767px) {
  .mobile-step-card {
    display: grid;
    gap: 8px;
    width: 100%;
    min-height: var(--mobile-step-height, 88px);
    padding: 9px 10px;
    border: 1px solid var(--mobile-glass-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-glass-radius, 14px);
    background: var(--mobile-glass-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-glass-shadow, 0 8px 20px rgba(23, 23, 23, 0.026));
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
  }

  .mobile-step-actions {
    display: grid;
    grid-template-columns: minmax(66px, 0.74fr) minmax(0, 1fr) minmax(66px, 0.74fr);
    gap: 8px;
    align-items: center;
  }

  .mobile-step-actions button {
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--bc-border-strong, rgba(79, 86, 97, 0.2));
    border-radius: 11px;
    background: var(--bc-bg-input, rgba(255, 255, 255, 0.5));
    color: var(--accent, #4f5661);
    font-size: 0.68rem;
    font-weight: 650;
    line-height: 1;
  }

  .mobile-step-actions button:not(:disabled) {
    color: var(--bc-accent-strong, #243f77);
    border-color: var(--bc-accent-border, rgba(49, 95, 186, 0.22));
    background: var(--bc-accent-soft, rgba(79, 127, 211, 0.08));
  }

  .mobile-step-actions button:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--muted, #6e7278) 54%, transparent);
    border-color: var(--bc-border-subtle, rgba(79, 86, 97, 0.14));
    background: transparent;
  }

  .mobile-step-current {
    display: grid;
    min-width: 0;
    place-items: center;
  }

  .mobile-step-current h2 {
    max-width: 100%;
    margin: 0;
    overflow: hidden;
    font-size: 0.8rem;
    font-weight: 620;
    line-height: 1.2;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-step-progress {
    position: relative;
    display: flex;
    justify-content: space-between;
    width: min(100%, 232px);
    min-height: 34px;
    margin: 0 auto;
    gap: 8px;
    align-items: center;
    padding: 0;
  }

  .mobile-step-progress::before {
    position: absolute;
    top: 50%;
    left: 28px;
    right: 28px;
    height: 1px;
    background: var(--bc-border-subtle, rgba(79, 86, 97, 0.16));
    content: "";
    transform: translateY(-50%);
  }

  .mobile-step-progress button {
    position: relative;
    z-index: 1;
    display: grid;
    width: 42px;
    height: 34px;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--accent, #4f5661);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    font-weight: 700;
  }

  .mobile-step-progress button.is-past {
    color: var(--bc-accent-strong, #315fba);
  }

  .mobile-step-progress button.is-active {
    color: var(--bc-text-inverse, white);
  }

  .mobile-step-progress button span {
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 999px;
    background: var(--bc-bg-selected, rgba(226, 229, 234, 0.9));
  }

  .mobile-step-progress button.is-active span {
    background: var(--bc-accent-strong, #315fba);
    box-shadow: var(--bc-glow-soft, 0 8px 18px rgba(49, 95, 186, 0.2));
  }

  .mobile-step-progress button.is-past span {
    background: var(--bc-accent-soft, rgba(79, 127, 211, 0.16));
  }
}
</style>
