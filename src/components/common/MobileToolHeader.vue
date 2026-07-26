<script setup>
defineProps({
  ariaLabel: {
    type: String,
    required: true,
  },
  selectorLabel: {
    type: String,
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
  selectedValue: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  languageLabel: {
    type: String,
    required: true,
  },
  homeLabel: {
    type: String,
    default: "Home",
  },
  showSelector: {
    type: Boolean,
    default: true,
  },
  pageTitle: {
    type: String,
    default: "",
  },
  transitionHome: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "set-language", "navigate-home"]);
</script>

<template>
  <section class="mobile-tool-header" :class="{ 'has-page-title': pageTitle }" :aria-label="ariaLabel">
    <div class="mobile-brand-row">
      <a
        class="mobile-brand-link"
        href="/"
        aria-label="BioassayCraft home"
        @click="transitionHome && emit('navigate-home', $event)"
      >
        <picture class="mobile-brand-logo" aria-hidden="true">
          <source media="(prefers-color-scheme: dark)" srcset="/assets/brand/logo-light.svg" />
          <img class="mobile-brand-mark" src="/assets/brand/logo-dark.svg" alt="" />
        </picture>
        <span class="mobile-brand-name">BioassayCraft</span>
        <span v-if="pageTitle" class="mobile-current-title">{{ pageTitle }}</span>
      </a>

      <div class="mobile-header-actions">
        <div class="mobile-header-language" :aria-label="languageLabel">
          <button
            type="button"
            :class="{ 'is-active': language === 'zh' }"
            :aria-pressed="language === 'zh'"
            @click="emit('set-language', 'zh')"
          >
            中文
          </button>
          <button
            type="button"
            :class="{ 'is-active': language === 'en' }"
            :aria-pressed="language === 'en'"
            @click="emit('set-language', 'en')"
          >
            EN
          </button>
        </div>

        <a
          class="mobile-header-home"
          href="/"
          :aria-label="homeLabel"
          @click="transitionHome && emit('navigate-home', $event)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.75 11.2 12 5l7.25 6.2" />
            <path d="M6.8 10.4v8.1h10.4v-8.1" />
            <path d="M10 18.5v-4.2h4v4.2" />
          </svg>
        </a>
      </div>
    </div>

    <label v-if="showSelector" class="mobile-header-select">
      <span>{{ selectorLabel }}</span>
      <select :value="selectedValue" @change="emit('select', $event.target.value)">
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>
  </section>
</template>

<style scoped>
.mobile-tool-header {
  display: none;
}

@media (max-width: 767px) {
  .mobile-tool-header {
    position: sticky;
    top: 0;
    z-index: 80;
    display: grid;
    gap: var(--mobile-sticky-gap, 8px);
    width: 100%;
    margin-bottom: var(--mobile-page-title-gap, 8px);
    padding: 0;
    background: transparent;
  }

  .mobile-brand-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-height: 32px;
    box-sizing: border-box;
    width: calc(100% + var(--mobile-header-bleed, 16px) + var(--mobile-header-bleed, 16px));
    margin-inline: var(--mobile-header-bleed-negative, -16px);
    padding: max(env(safe-area-inset-top), 18px)
      max(16px, env(safe-area-inset-right))
      12px
      max(16px, env(safe-area-inset-left));
    color: var(--app-text, var(--ink, #171717));
    background: color-mix(in srgb, var(--app-bg, var(--bc-bg-page, #fff)) 88%, transparent);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }

  .mobile-brand-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 0;
    color: var(--ink, #171717);
    font-weight: 650;
    text-decoration: none;
  }

  .mobile-brand-mark {
    flex: 0 0 auto;
    width: 29px;
    height: 29px;
    opacity: 0.9;
    object-fit: contain;
  }

  .mobile-brand-logo {
    display: flex;
    flex: 0 0 auto;
  }

  .mobile-brand-name {
    min-width: 0;
    margin-left: 8px;
    overflow: hidden;
    font-size: 1rem;
    font-weight: 680;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .mobile-current-title {
    position: absolute;
    top: 50%;
    left: 37px;
    right: 0;
    overflow: hidden;
    opacity: 0;
    color: var(--ink, #171717);
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 20px;
    pointer-events: none;
    text-overflow: ellipsis;
    transform: translate(-6px, -50%);
    transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
    white-space: nowrap;
  }

  .mobile-header-actions {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-self: end;
    min-width: 0;
  }

  .mobile-header-select {
    position: relative;
    display: block;
    min-width: 0;
    min-height: var(--mobile-control-height, 36px);
    padding: 0;
    border: 1px solid var(--mobile-glass-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-glass-radius, 14px);
    background: var(--mobile-glass-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-glass-shadow, 0 8px 20px rgba(23, 23, 23, 0.026));
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
  }

  .mobile-header-select > span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .mobile-header-language,
  .mobile-header-home {
    height: 32px;
    min-height: 32px;
    border: 1px solid var(--mobile-header-control-border, rgba(214, 217, 222, 0.54));
    border-radius: var(--mobile-header-control-radius, 11px);
    background: var(--mobile-header-control-bg, rgba(255, 255, 255, 0.48));
    box-shadow: var(--mobile-header-control-shadow, none);
    backdrop-filter: blur(var(--mobile-glass-blur, 16px));
  }

  .mobile-header-select select {
    appearance: none;
    width: 100%;
    height: var(--mobile-control-height, 36px);
    min-height: var(--mobile-control-height, 36px);
    padding: 0 30px 0 var(--mobile-header-control-padding-x, 10px);
    color: var(--ink, #171717);
    border: 0;
    border-radius: 10px;
    background: transparent;
    font: inherit;
    font-size: var(--mobile-header-control-font-size, 0.72rem);
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
  }

  .mobile-header-select::after {
    position: absolute;
    top: 50%;
    right: 12px;
    width: 0;
    height: 0;
    pointer-events: none;
    border-top: 4px solid var(--muted, rgba(79, 86, 97, 0.66));
    border-right: 4px solid transparent;
    border-left: 4px solid transparent;
    content: "";
    transform: translateY(-35%);
  }

  .mobile-header-language {
    display: inline-flex;
    gap: 4px;
    width: 80px;
    padding: 3px;
  }

  .mobile-header-language button {
    position: relative;
    flex: 1;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    font-weight: var(--mobile-header-control-font-weight, 650);
    line-height: 1;
  }

  .mobile-header-language button.is-active {
    background: var(--bc-bg-selected, rgba(255, 255, 255, 0.78));
    color: var(--ink, #171717);
  }

  .mobile-header-home {
    display: grid;
    position: relative;
    width: 32px;
    place-items: center;
    color: var(--accent, #4f5661);
    text-decoration: none;
  }

  .mobile-header-home svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }

  .mobile-tool-header.has-page-title .mobile-brand-name {
    opacity: 0;
    transform: translateX(-5px);
  }

  .mobile-tool-header.has-page-title .mobile-current-title {
    opacity: 1;
    transform: translate(0, -50%);
  }

  .mobile-header-language button::before,
  .mobile-header-home::before {
    position: absolute;
    inset: -6px -4px;
    content: "";
  }

  .mobile-header-select select:focus-visible,
  .mobile-header-language button:focus-visible,
  .mobile-header-home:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px var(--bc-focus-ring, rgba(79, 86, 97, 0.12));
  }

  .mobile-header-select:focus-within,
  .mobile-header-language:focus-within,
  .mobile-header-home:focus-visible {
    border-color: var(--accent, #4f5661);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-brand-name,
  .mobile-current-title { transition: none; }
}

@media (prefers-reduced-transparency: reduce) {
  .mobile-brand-row {
    background: var(--bc-bg-page, #fff);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
</style>
