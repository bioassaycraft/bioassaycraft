<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import SiteFooter from "../components/layout/SiteFooter.vue";
import EndotoxinCalculator from "../components/specification/EndotoxinCalculator.vue";
import HcdCalculator from "../components/specification/HcdCalculator.vue";
import ProductInformationCard from "../components/specification/ProductInformationCard.vue";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();
const activeModuleId = ref("endotoxin");
const isHeaderMorphed = ref(false);
const headerMorphTrigger = ref(null);
const contentPanel = ref(null);
const productInformation = ref({
  route: "nonIntrathecal",
  dose: "",
  doseUnit: "mgDose",
  bodyWeight: "70",
  frequency: "1",
  concentration: "",
});

let headerMorphObserver = null;

const specificationCopy = {
  en: {
    title: "Specification Limit Calculator",
    home: "Back to home",
    languageLabel: "Language",
    mobileControlsLabel: "Specification Limit Calculator mobile navigation",
    moduleLabel: "Calculator module",
    comingSoon: "Coming Soon",
    modules: {
      endotoxin: {
        label: "Endotoxin",
        title: "Endotoxin Calculator",
      },
      hcd: {
        label: "HCD",
        title: "HCD Calculator",
      },
    },
  },
  zh: {
    title: "质量标准限度计算器",
    home: "返回首页",
    languageLabel: "语言切换",
    mobileControlsLabel: "质量标准限度计算器移动端导航",
    moduleLabel: "计算模块",
    comingSoon: "即将推出",
    modules: {
      endotoxin: {
        label: "内毒素",
        title: "内毒素计算器",
      },
      hcd: {
        label: "HCD",
        title: "HCD 计算器",
      },
    },
  },
};

const calculatorModules = [
  {
    id: "endotoxin",
    component: EndotoxinCalculator,
  },
  {
    id: "hcd",
    component: HcdCalculator,
  },
];

const copy = computed(() => specificationCopy[language.value]);
const activeModule = computed(
  () =>
    calculatorModules.find((module) => module.id === activeModuleId.value) ?? calculatorModules[0],
);
const activeModuleCopy = computed(() => copy.value.modules[activeModule.value.id]);
const moduleOptions = computed(() =>
  calculatorModules.map((module) => ({
    id: module.id,
    label: copy.value.modules[module.id].label,
    title: copy.value.modules[module.id].title,
    component: module.component,
  })),
);

function setLanguage(nextLanguage) {
  setLocale(nextLanguage);
}

function setActiveModule(nextModuleId) {
  if (nextModuleId === activeModuleId.value) return;
  activeModuleId.value = nextModuleId;
}

function updateProductInformation({ key, value }) {
  productInformation.value = {
    ...productInformation.value,
    [key]: value,
  };
}

onMounted(() => {
  if ("IntersectionObserver" in window && headerMorphTrigger.value) {
    headerMorphObserver = new IntersectionObserver(
      ([entry]) => {
        isHeaderMorphed.value = !entry.isIntersecting;
      },
      { threshold: 0 },
    );
    headerMorphObserver.observe(headerMorphTrigger.value);
  }
});

onBeforeUnmount(() => {
  headerMorphObserver?.disconnect();
});
</script>

<template>
  <div class="spec-limit-shell">
    <main class="spec-limit-calculator" :class="{ 'is-header-morphed': isHeaderMorphed }">
      <div ref="headerMorphTrigger" class="header-morph-trigger" aria-hidden="true"></div>

      <div class="mobile-sticky-header" :aria-label="copy.mobileControlsLabel">
        <MobileToolHeader
          class="spec-limit-mobile-header"
          :aria-label="copy.mobileControlsLabel"
          :selector-label="copy.title"
          :options="moduleOptions"
          :selected-value="activeModuleId"
          :language="language"
          :language-label="copy.languageLabel"
          :home-label="copy.home"
          :show-selector="false"
          @set-language="setLanguage"
        />
      </div>

      <ToolTopbar
        :title="copy.title"
        :language="language"
        :language-label="copy.languageLabel"
        :home-label="copy.home"
        :is-morphed="isHeaderMorphed"
        @set-language="setLanguage"
      />

      <section class="module-header" aria-labelledby="spec-limit-title">
        <div>
          <h1 id="spec-limit-title">{{ copy.title }}</h1>
        </div>
      </section>

      <section ref="contentPanel" class="spec-limit-content" aria-live="polite">
        <ProductInformationCard
          :product-information="productInformation"
          @update="updateProductInformation"
        />

        <section class="inline-module-switcher" :aria-label="copy.moduleLabel">
          <button
            v-for="module in moduleOptions"
            :key="module.id"
            type="button"
            :class="{ 'is-active': activeModuleId === module.id }"
            @click="setActiveModule(module.id)"
          >
            {{ module.label }}
          </button>
        </section>

        <div class="module-divider" aria-hidden="true"></div>

        <section class="desktop-module-grid" aria-label="Specification modules">
          <component
            :is="module.component"
            v-for="module in moduleOptions"
            :key="module.id"
            :product-information="productInformation"
          />
        </section>

        <section class="mobile-module-content" :aria-label="activeModuleCopy.title">
          <component
            :is="activeModule.component"
            :key="activeModule.id"
            :product-information="productInformation"
          />
        </section>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.spec-limit-shell {
  --topbar-sticky-height: 48px;
  --shell-edge-space: 10px;
  --paper: var(--bc-bg-page, #ffffff);
  --ink: var(--bc-text-primary, #171717);
  --muted: var(--bc-text-secondary, #6e7278);
  --line: var(--bc-border-default, #d0d7de);
  --soft-line: var(--bc-border-subtle, rgba(208, 215, 222, 0.72));
  --panel: var(--bc-bg-surface, rgba(255, 255, 255, 0.28));
  --panel-soft: var(--bc-bg-surface-elevated, rgba(255, 255, 255, 0.2));
  --field-bg: var(--bc-bg-input, rgba(255, 255, 255, 0.24));
  --field-bg-soft: var(--bc-bg-glass, rgba(255, 255, 255, 0.46));
  --selected-bg: var(--bc-bg-selected, rgba(255, 255, 255, 0.72));
  --accent: var(--bc-accent, #2457b3);
  --accent-soft: var(--bc-accent-soft, rgba(36, 86, 179, 0.08));
  --accent-border: var(--bc-accent-border, rgba(36, 86, 179, 0.32));
  --focus-ring: var(--bc-focus-ring, rgba(36, 86, 179, 0.16));
  --card-shadow: var(--bc-shadow-card, 0 8px 22px rgba(23, 23, 23, 0.024));
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  color: var(--ink);
  background: var(--paper);
}

.spec-limit-calculator {
  position: relative;
  flex: 1 0 auto;
  width: min(1280px, calc(100% - var(--bc-container-inline, 48px)));
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 12px) 0 18px;
}

.header-morph-trigger {
  position: absolute;
  top: 128px;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.module-header {
  position: sticky;
  top: var(--topbar-sticky-height);
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: end;
  margin: 0 calc(var(--bc-container-inline, 48px) / -2);
  padding: 9px calc(var(--bc-container-inline, 48px) / 2) 10px;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: blur(14px);
}

.module-header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 2.25vw, 2.25rem);
  font-weight: 600;
  line-height: 1;
  transform-origin: left center;
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

.is-header-morphed .module-header h1 {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}

.module-switcher,
.inline-module-switcher {
  display: flex;
  gap: 4px;
  padding: 2px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel-soft);
}

.module-switcher button,
.inline-module-switcher button {
  min-height: 31px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.module-switcher button:hover,
.inline-module-switcher button:hover {
  color: var(--accent);
}

.module-switcher button:active,
.inline-module-switcher button:active {
  background: transparent;
}

.module-switcher button.is-active,
.inline-module-switcher button.is-active {
  background: var(--selected-bg);
  color: var(--ink);
}

.module-switcher button:focus-visible,
.inline-module-switcher button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--focus-ring);
}

.spec-limit-content {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.module-divider {
  height: 1px;
  background: var(--soft-line);
}

.desktop-module-grid {
  display: none;
}

.mobile-module-content {
  display: block;
}

.mobile-sticky-header {
  display: none;
}

@media (min-width: 900px) {
  .module-header {
    grid-template-columns: 1fr;
  }

  .module-switcher {
    display: none;
  }

  .inline-module-switcher {
    display: none;
  }

  .desktop-module-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  .mobile-module-content {
    display: none;
  }
}

@media (max-width: 1199px) {
  .module-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .module-switcher {
    width: max-content;
    max-width: 100%;
    overflow-x: auto;
  }
}

@media (max-width: 767px) {
  .spec-limit-shell {
    --mobile-safe-top: max(env(safe-area-inset-top), 12px);
    --mobile-control-gap: 8px;
    --mobile-section-gap: var(--mobile-control-gap);
    --mobile-sticky-gap: 8px;
    --mobile-control-height: 36px;
    --mobile-header-control-height: var(--mobile-control-height);
    --mobile-header-control-radius: 11px;
    --mobile-header-control-padding-x: 10px;
    --mobile-header-control-font-size: 0.72rem;
    --mobile-header-control-font-weight: 650;
    --mobile-header-control-border: var(--bc-border-subtle);
    --mobile-header-control-bg: var(--bc-bg-glass);
    --mobile-header-control-shadow: var(--bc-shadow-card);
    --mobile-card-radius: 16px;
    --mobile-card-bg: var(--bc-bg-glass);
    --mobile-card-border: var(--bc-border-subtle);
    --mobile-card-shadow: var(--bc-shadow-card);
    --mobile-glass-blur: 16px;
    --mobile-glass-bg: var(--bc-bg-glass);
    --mobile-glass-border: var(--bc-border-subtle);
    --mobile-glass-shadow: var(--bc-shadow-card);
    --mobile-glass-radius: 14px;
  }

  .spec-limit-shell {
    --topbar-sticky-height: 0px;
  }

  .spec-limit-calculator {
    width: min(100% - 32px, 1280px);
    padding-top: 0;
    padding-bottom: 20px;
  }

  .spec-limit-shell :deep(.tool-topbar),
  .module-header {
    display: none;
  }

  .spec-limit-shell :deep(.site-footer) {
    display: none;
  }

  .mobile-sticky-header {
    position: sticky;
    top: 0;
    z-index: 70;
    display: grid;
    gap: var(--mobile-sticky-gap);
    width: 100%;
    margin-bottom: var(--mobile-sticky-gap);
    padding-top: var(--mobile-safe-top);
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
  }

  .inline-module-switcher {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    min-height: var(--mobile-control-height);
    padding: 3px;
    border: 1px solid var(--mobile-card-border);
    border-radius: var(--mobile-card-radius);
    background: var(--mobile-card-bg);
    box-shadow: var(--mobile-card-shadow);
    backdrop-filter: blur(var(--mobile-glass-blur));
  }

  .inline-module-switcher button {
    min-width: 0;
    min-height: calc(var(--mobile-control-height) - 6px);
    padding: 0 8px;
    border-radius: 12px;
    font-size: 0.72rem;
    overflow-wrap: anywhere;
  }

  .spec-limit-content {
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .module-header h1,
  .module-switcher button,
  .inline-module-switcher button {
    transition: none;
  }
}
</style>
