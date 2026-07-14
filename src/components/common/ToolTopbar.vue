<script setup>
defineProps({
  title: {
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
    required: true,
  },
  isMorphed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["set-language"]);
</script>

<template>
  <header class="tool-topbar" :class="{ 'is-header-morphed': isMorphed }">
    <div class="header-inner">
      <a class="brand-link" href="/" aria-label="BioassayCraft home">
        <span class="header-brand-group">
          <img
            class="brand-mark"
            src="/assets/brand/logo-dark.svg"
            data-theme-logo
            alt=""
            aria-hidden="true"
          />
          <span class="brand-name">bioassaycraft</span>
          <span class="morph-compact-group">
            <span class="morph-divider" aria-hidden="true"></span>
            <span class="morph-title">{{ title }}</span>
          </span>
        </span>
      </a>
      <div class="topbar-spacer" aria-hidden="true"></div>
      <div class="topbar-actions">
        <div class="language-switch" :aria-label="languageLabel">
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
            English
          </button>
        </div>
        <a class="back-link" href="/">{{ homeLabel }}</a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.tool-topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 50;
  min-height: var(--topbar-sticky-height);
  background: color-mix(in srgb, var(--paper) 90%, transparent);
  backdrop-filter: blur(14px);
}

.header-inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: var(--topbar-sticky-height);
  margin: 0 auto;
}

.brand-link,
.back-link {
  display: inline-flex;
  align-items: center;
  color: var(--ink);
  text-decoration: none;
}

.brand-link {
  font-weight: 600;
}

.header-brand-group {
  display: flex;
  align-items: center;
  min-width: 0;
}

.brand-mark {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  opacity: 0.84;
  object-fit: contain;
}

.brand-name {
  display: inline-block;
  max-width: 120px;
  margin-left: 9px;
  overflow: hidden;
  font-size: 0.76rem;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.82;
  transition:
    opacity 220ms ease,
    max-width 260ms ease,
    margin-left 260ms ease,
    transform 260ms ease;
}

.is-header-morphed .brand-name {
  max-width: 0;
  margin-left: 0;
  opacity: 0;
  transform: translateY(-2px);
}

.morph-compact-group {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  transition:
    margin-left 260ms ease,
    max-width 280ms ease;
}

.is-header-morphed .morph-compact-group {
  max-width: 300px;
  margin-left: 10px;
}

.morph-divider,
.morph-title {
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.morph-divider {
  flex: 0 0 auto;
  width: 1px;
  height: 18px;
  background: var(--soft-line);
}

.morph-title {
  max-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    opacity 280ms ease,
    transform 280ms ease,
    max-width 280ms ease;
}

.is-header-morphed .morph-title {
  max-width: 260px;
}

.is-header-morphed .morph-divider,
.is-header-morphed .morph-title {
  opacity: 1;
  transform: translateY(0);
}

.topbar-spacer {
  min-width: 0;
}

.topbar-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-self: end;
  min-width: max-content;
}

.back-link,
.language-switch button {
  min-height: 28px;
  border: 1px solid var(--accent-border);
  border-radius: 7px;
  background: transparent;
  color: var(--accent);
  font-size: 0.68rem;
  font-weight: 600;
}

.back-link {
  padding: 0 10px;
  font-weight: 500;
}

.language-switch {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

.language-switch button {
  min-height: 26px;
  padding: 0 9px;
  border: 0;
  color: var(--muted);
  font-size: 0.66rem;
}

.language-switch button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
}

.language-switch button:focus-visible,
.back-link:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

@media (min-width: 768px) {
  /* Keep the homepage's scroll-driven brand veil, but present tool-page
     branding at full contrast. */
  .brand-link,
  .brand-mark,
  .brand-name {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-name,
  .morph-compact-group,
  .morph-divider,
  .morph-title {
    transition: none;
  }
}
</style>
