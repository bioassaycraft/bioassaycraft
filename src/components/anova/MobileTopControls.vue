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
    <div class="mobile-brand-row">
      <a class="mobile-brand-link" href="/" aria-label="BioassayCraft home">
        <img class="mobile-brand-mark" src="/assets/brand/logo-dark.svg" data-theme-logo alt="" aria-hidden="true" />
        <span class="mobile-brand-name">BioassayCraft</span>
      </a>

      <div class="mobile-header-actions">
        <div class="mobile-header-language" :aria-label="copy.languageLabel">
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

        <a class="mobile-header-home" href="/" :aria-label="copy.home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.75 11.2 12 5l7.25 6.2" />
            <path d="M6.8 10.4v8.1h10.4v-8.1" />
            <path d="M10 18.5v-4.2h4v4.2" />
          </svg>
        </a>
      </div>
    </div>

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

@media (max-width: 768px) {
  .mobile-top-controls {
    display: grid;
    gap: var(--mobile-sticky-gap, 8px);
    width: 100%;
  }

  .mobile-brand-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-height: var(--mobile-control-height, 36px);
  }

  .mobile-brand-link {
    color: var(--ink, #171717);
    text-decoration: none;
  }

  .mobile-brand-link {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    font-weight: 650;
  }

  .mobile-brand-mark {
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    opacity: 0.86;
    object-fit: contain;
  }

  .mobile-brand-name {
    min-width: 0;
    margin-left: 8px;
    overflow: hidden;
    font-size: 0.8rem;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-header-actions {
    display: inline-flex;
    gap: var(--mobile-sticky-gap, 8px);
    align-items: center;
    justify-self: end;
    min-width: 0;
  }

  .mobile-header-language,
  .mobile-header-home {
    height: var(--mobile-header-control-height, var(--mobile-control-height, 36px));
    min-height: var(--mobile-header-control-height, var(--mobile-control-height, 36px));
    border: 1px solid var(--mobile-header-control-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-header-control-radius, 11px);
    background: var(--mobile-header-control-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-header-control-shadow, none);
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
  }

  .mobile-header-language {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    width: 92px;
    padding: 3px;
  }

  .mobile-header-language button {
    flex: 1;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
  }

  .mobile-header-language button.is-active {
    background: var(--bc-bg-selected, rgba(255, 255, 255, 0.78));
    color: var(--ink, #171717);
  }

  .mobile-header-home {
    display: grid;
    width: var(--mobile-header-control-height, var(--mobile-control-height, 36px));
    place-items: center;
    color: var(--accent, #4f5661);
    text-decoration: none;
  }

  .mobile-header-home svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
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

  .mobile-header-language button:focus-visible,
  .mobile-header-home:focus-visible,
  .mobile-model-switch button:focus-visible {
    outline: none;
    border-color: var(--accent, #4f5661);
    box-shadow: 0 0 0 4px var(--bc-focus-ring, rgba(79, 86, 97, 0.12));
  }
}
</style>
