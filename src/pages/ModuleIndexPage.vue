<script setup>
import { computed, ref } from "vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import { getModules } from "../config/modules";
import { useLocale } from "../utils/locale";

const props = defineProps({ type: { type: String, required: true } });
const { locale, setLocale } = useLocale();
const searchInput = ref("");
const searchQuery = ref("");
const isComposing = ref(false);

const copy = {
  zh: {
    explore: "全部探索",
    tools: "全部工具",
    exploreDescription: "通过交互图形理解模型、误差与统计推断。",
    toolsDescription: "用于生物活性方法开发、验证与数据处理。",
    searchExplore: "搜索探索模块",
    searchTools: "搜索工具",
    searchExploreLabel: "搜索探索模块",
    searchToolsLabel: "搜索工具",
    clear: "清除搜索",
    back: "返回",
    home: "首页",
    ready: "已就绪",
    planned: "即将推出",
    noExplore: "未找到匹配的探索模块",
    noTools: "未找到匹配的工具",
    tryAnother: "请尝试其他关键词。",
    language: "语言",
  },
  en: {
    explore: "All Explore",
    tools: "All Tools",
    exploreDescription:
      "Understand models, error, and statistical inference through interactive graphics.",
    toolsDescription: "For bioassay method development, validation, and data processing.",
    searchExplore: "Search explore modules",
    searchTools: "Search tools",
    searchExploreLabel: "Search explore modules",
    searchToolsLabel: "Search tools",
    clear: "Clear search",
    back: "Back",
    home: "Home",
    ready: "Ready",
    planned: "Coming soon",
    noExplore: "No matching explore modules",
    noTools: "No matching tools",
    tryAnother: "Try another keyword.",
    language: "Language",
  },
};

const pageCopy = computed(() => copy[locale.value]);
const isExplore = computed(() => props.type === "explore");
const title = computed(() => (isExplore.value ? pageCopy.value.explore : pageCopy.value.tools));
const description = computed(() =>
  isExplore.value ? pageCopy.value.exploreDescription : pageCopy.value.toolsDescription,
);
const placeholder = computed(() =>
  isExplore.value ? pageCopy.value.searchExplore : pageCopy.value.searchTools,
);
const searchLabel = computed(() =>
  isExplore.value ? pageCopy.value.searchExploreLabel : pageCopy.value.searchToolsLabel,
);
const allModules = computed(() =>
  getModules(props.type)
    .slice()
    .sort((a, b) => a.listOrder - b.listOrder),
);
const normalizedSearch = (value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const isSubsequence = (needle, haystack) => {
  let cursor = 0;
  for (const character of haystack) {
    if (character === needle[cursor]) cursor += 1;
    if (cursor === needle.length) return true;
  }
  return false;
};
const matchesSearch = (module, query) => {
  if (!query) return true;
  const terms = [
    module.title.zh,
    module.title.en,
    module.description.zh,
    module.description.en,
    ...(module.keywords || []),
    ...(module.tags || []),
  ]
    .join(" ")
    .toLocaleLowerCase();
  const compactTerms = terms.replace(/[\s_-]/g, "");
  return query
    .split(" ")
    .every(
      (term) => terms.includes(term) || isSubsequence(term.replace(/[\s_-]/g, ""), compactTerms),
    );
};
const filteredModules = computed(() => {
  const query = normalizedSearch(searchQuery.value);
  return allModules.value.filter((module) => matchesSearch(module, query));
});

const updateSearch = (event) => {
  searchInput.value = event.target.value;
  if (!isComposing.value) searchQuery.value = event.target.value;
};
const completeComposition = (event) => {
  isComposing.value = false;
  searchInput.value = event.target.value;
  searchQuery.value = event.target.value;
};
const clearSearch = () => {
  searchInput.value = "";
  searchQuery.value = "";
};
</script>

<template>
  <main class="module-index-page">
    <ToolTopbar
      :title="title"
      :language="locale"
      :language-label="pageCopy.language"
      :home-label="pageCopy.home"
      @set-language="setLocale"
    />
    <MobileToolHeader
      class="module-index-mobile-header"
      :aria-label="title"
      selector-label=""
      :options="[]"
      selected-value=""
      :language="locale"
      :language-label="pageCopy.language"
      :home-label="pageCopy.home"
      :page-title="title"
      :show-selector="false"
      @set-language="setLocale"
    />
    <section class="module-index-content" :aria-labelledby="`${type}-index-title`">
      <div class="module-index-intro">
        <h1 :id="`${type}-index-title`">{{ title }}</h1>
        <p>{{ description }}</p>
      </div>

      <div class="module-search-sticky">
        <div class="module-search">
          <label class="sr-only" for="module-search">{{ searchLabel }}</label>
          <input
            id="module-search"
            :value="searchInput"
            type="search"
            :placeholder="placeholder"
            :aria-label="searchLabel"
            @input="updateSearch"
            @compositionstart="isComposing = true"
            @compositionend="completeComposition"
          />
          <button
            v-if="searchInput"
            type="button"
            :aria-label="pageCopy.clear"
            @click="clearSearch"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="filteredModules.length" class="module-index-results">
        <div class="module-result-list">
          <component
            :is="module.status === 'ready' ? 'a' : 'article'"
            v-for="module in filteredModules"
            :key="module.id"
            class="module-list-item"
            :class="{ 'is-planned': module.status !== 'ready' }"
            :href="module.status === 'ready' ? module.route : undefined"
            :aria-disabled="module.status !== 'ready' ? 'true' : undefined"
          >
            <span class="module-list-copy">
              <strong>{{ module.title[locale] || module.title.en }}</strong>
              <small>{{ module.description[locale] || module.description.en }}</small>
            </span>
            <span class="module-list-meta">
              <span class="module-list-status" :class="{ 'is-ready': module.status === 'ready' }">
                <i v-if="module.status === 'ready'" aria-hidden="true"></i>
                {{ module.status === "ready" ? pageCopy.ready : pageCopy.planned }}
              </span>
              <b v-if="module.status === 'ready'" aria-hidden="true">›</b>
            </span>
          </component>
        </div>
      </div>
      <div v-else class="module-empty-state">
        <strong>{{ isExplore ? pageCopy.noExplore : pageCopy.noTools }}</strong>
        <p>{{ pageCopy.tryAnother }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.module-index-page {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page);
  --ink: var(--bc-text-primary);
  --muted: var(--bc-text-secondary);
  --soft-line: var(--bc-border-subtle);
  --panel-soft: var(--bc-bg-surface-elevated);
  --selected-bg: var(--bc-bg-selected);
  --accent: var(--bc-accent);
  --focus-ring: var(--bc-focus-ring);
  min-height: 100svh;
  color: var(--app-text);
  background: var(--app-bg);
}
.module-index-content {
  width: min(760px, calc(100% - 32px));
  margin: 0 auto;
  padding: 90px 0 calc(40px + env(safe-area-inset-bottom));
}
.module-index-mobile-header {
  display: none;
}
.module-index-intro {
  display: grid;
  gap: 7px;
  margin-bottom: 18px;
}
.module-index-intro h1 {
  font-size: clamp(1.45rem, 6vw, 1.85rem);
  font-weight: 680;
  letter-spacing: -0.02em;
  line-height: 1.14;
}
.module-index-intro p,
.module-empty-state p {
  color: var(--app-muted);
  font-size: 0.84rem;
  line-height: 1.55;
}
.module-search {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 48px;
  border: 1px solid var(--app-rule);
  border-radius: 15px;
  background: var(--bc-bg-input);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bc-bg-surface-solid) 88%, transparent);
}
.module-search-sticky {
  position: sticky;
  top: 60px;
  z-index: 60;
  margin: 0 -12px;
  padding: 12px;
  background: color-mix(in srgb, var(--app-bg) 76%, transparent);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .module-search-sticky {
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, var(--app-bg) 86%, transparent),
      color-mix(in srgb, var(--app-bg) 66%, transparent)
    );
    -webkit-backdrop-filter: blur(20px) saturate(125%);
    backdrop-filter: blur(20px) saturate(125%);
  }
  .module-search {
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--bc-bg-surface-solid) 86%, transparent),
      color-mix(in srgb, var(--bc-bg-surface-elevated) 70%, transparent)
    );
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    backdrop-filter: blur(14px) saturate(120%);
  }
}
.module-search:focus-within {
  border-color: var(--app-accent);
  box-shadow: 0 0 0 4px var(--app-focus);
}
.module-search input {
  width: 100%;
  min-width: 0;
  height: 46px;
  padding: 0 44px 0 15px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--app-text);
}
.module-search button {
  position: absolute;
  right: 4px;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--app-muted);
  font-size: 1.35rem;
}
.module-index-results,
.module-result-list {
  display: grid;
  gap: 10px;
}
.module-index-results {
  margin-top: 14px;
}
.module-list-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 92px;
  padding: 14px 14px 14px 16px;
  color: var(--app-text);
  border: 1px solid var(--app-rule-subtle);
  border-radius: 16px;
  background: var(--app-glass);
  box-shadow:
    0 4px 14px color-mix(in srgb, var(--app-text) 3%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--bc-bg-surface-solid) 85%, transparent);
  text-decoration: none;
}
.module-list-item.is-planned {
  color: color-mix(in srgb, var(--app-text) 72%, transparent);
}
.module-list-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.module-list-copy strong {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.98rem;
  font-weight: 680;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.module-list-copy small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--app-muted);
  font-size: 0.78rem;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.module-list-meta {
  display: grid;
  gap: 8px;
  justify-items: end;
}
.module-list-status {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: var(--app-muted);
  font-size: 0.68rem;
  font-weight: 650;
  white-space: nowrap;
}
.module-list-status.is-ready {
  color: var(--app-accent);
}
.module-list-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.module-list-meta b {
  color: var(--app-muted);
  font-size: 1.25rem;
  line-height: 1;
}
.module-empty-state {
  padding: 44px 16px;
  text-align: center;
}
.module-empty-state strong {
  font-size: 1rem;
}
.module-empty-state p {
  margin: 8px 0 0;
  font-size: 0.86rem;
}
.module-index-page :is(a, button):focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px var(--app-focus);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .module-list-item {
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--bc-bg-surface-solid) 86%, transparent),
      color-mix(in srgb, var(--bc-bg-surface-elevated) 68%, transparent)
    );
    -webkit-backdrop-filter: blur(12px) saturate(120%);
    backdrop-filter: blur(12px) saturate(120%);
  }
}
@media (min-width: 768px) {
  .module-index-header {
    padding-right: max(32px, calc((100% - 760px) / 2));
    padding-left: max(32px, calc((100% - 760px) / 2));
  }
  .module-index-content {
    padding-top: 52px;
  }
}
@media (max-width: 767px) {
  .module-index-page {
    --topbar-sticky-height: 0px;
  }
  .module-index-page :deep(.tool-topbar) {
    display: none;
  }
  .module-index-mobile-header {
    z-index: 70;
    display: block;
    width: min(100% - 32px, 1360px);
    margin: 0 auto;
    padding-top: max(env(safe-area-inset-top), 12px);
    background: transparent;
  }
  .module-index-content {
    padding-top: 16px;
  }
  .module-search-sticky {
    top: 36px;
    margin: 0 -8px;
    padding: 10px 8px;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .module-search-sticky,
  .module-search {
    background: var(--bc-bg-surface-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .module-list-item {
    transition: none;
  }
}
</style>
