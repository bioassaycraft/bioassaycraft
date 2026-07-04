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
  language: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["set-module", "set-language"]);
</script>

<template>
  <section class="mobile-top-controls" :aria-label="copy.mobile.controlsLabel">
    <label class="mobile-module-select">
      <span>{{ copy.modulesLabel }}</span>
      <select :value="activeModule" @change="emit('set-module', $event.target.value)">
        <option v-for="module in moduleOrder" :key="module" :value="module">
          {{ copy.mobile.modulesShort[module] }}
        </option>
      </select>
    </label>
    <div class="mobile-language-switch" :aria-label="copy.languageLabel">
      <button
        type="button"
        :class="{ 'is-active': language === 'zh' }"
        @click="emit('set-language', 'zh')"
      >
        中文
      </button>
      <button
        type="button"
        :class="{ 'is-active': language === 'en' }"
        @click="emit('set-language', 'en')"
      >
        EN
      </button>
    </div>
  </section>
</template>

<style scoped>
.mobile-top-controls {
  display: none;
}

@media (max-width: 768px) {
  .mobile-top-controls {
    position: fixed;
    top: var(--mobile-safe-top, 12px);
    left: 50%;
    z-index: 70;
    display: grid;
    grid-template-columns: 108px auto;
    gap: var(--mobile-section-gap, 7px);
    align-items: center;
    width: min(100% - 32px, 1360px);
    min-height: var(--mobile-control-height, 34px);
    padding: 0;
    background: color-mix(in srgb, var(--paper, #f7f5f0) 92%, transparent);
    backdrop-filter: blur(16px);
    transform: translateX(-50%);
  }

  .mobile-module-select {
    display: block;
    min-width: 0;
  }

  .mobile-module-select span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .mobile-module-select select {
    width: 108px;
    min-height: var(--mobile-control-height, 34px);
    padding: 0 26px 0 10px;
    color: var(--ink, #171717);
    border: 1px solid rgba(214, 217, 222, 0.54);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.5);
    font-size: 0.72rem;
    font-weight: 650;
  }

  .mobile-language-switch {
    display: inline-flex;
    gap: 4px;
    justify-self: end;
    width: 92px;
    min-height: var(--mobile-control-height, 34px);
    padding: 3px;
    border: 1px solid rgba(214, 217, 222, 0.54);
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.38);
  }

  .mobile-language-switch button {
    flex: 1;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .mobile-language-switch button.is-active {
    background: rgba(255, 255, 255, 0.78);
    color: var(--ink, #171717);
  }
}
</style>
