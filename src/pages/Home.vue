<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "../utils/locale";
import { getFeaturedModules, getLuckyModules, getModules } from "../config/modules";

const isLuckyButtonCompact = ref(false);
const { locale: language, setLocale } = useLocale();
const luckyStorageKey = "bioassaycraft:mobile-home:lucky-history";

const toHomeItem = (module) => ({
  ...module,
  key: module.id,
  href: module.route,
  note: module.homeNote || module.description,
  titleLines: module.homeTitleLines || { en: [module.homeTitle.en], zh: [module.homeTitle.zh] },
  ready: module.status === "ready",
  weight: 1,
});

const homeGroups = [
  { key: "learn", items: getModules("explore").map(toHomeItem) },
  {
    key: "tools",
    items: getModules("tools").map(toHomeItem),
  },
  {
    key: "journey",
    items: [
      {
        key: "bioassay-development",
        title: { en: "Bioassay Development", zh: "生物学活性方法开发" },
        note: { en: "From purpose to assay strategy.", zh: "从目的定义到测定策略。" },
        ready: false,
      },
      {
        key: "bioassay-validation",
        title: { en: "Bioassay Validation", zh: "生物学活性方法验证" },
        note: { en: "Ask how much evidence is enough.", zh: "判断所需证据是否充分。" },
        ready: false,
      },
      {
        key: "bioassay-maintenance",
        title: { en: "Bioassay Maintenance", zh: "生物学活性方法维护" },
        note: { en: "Keep method performance in context.", zh: "持续关注方法表现。" },
        ready: false,
      },
    ],
  },
];

const mobileFeaturedItems = (group) =>
  getFeaturedModules(group.key === "learn" ? "explore" : "tools").map(toHomeItem);

const desktopFeaturedItems = (group) =>
  group.key === "journey" ? group.items : mobileFeaturedItems(group);

const homeCopy = {
  en: {
    languageLabel: "Language",
    homeLabel: "BioassayCraft home",
    explore: "Explore BioassayCraft",
    heroTagline: "From theory to practice.",
    learn: "Explore",
    learnHeading: "Explore the reasoning.",
    learnNote: "Interactive learning modules.",
    tools: "Tools",
    toolsHeading: "Practical tools.",
    toolsNote: "Scientific utilities for exploration and calculation.",
    viewAll: "View all",
    journey: "Journey",
    journeyHeading: "Follow the reasoning.",
    journeyNote: "Structured learning paths.",
    ready: "Ready",
    planned: "Planned",
    lucky: "I'm Feeling Lucky!",
    luckyLabel: "Open a ready page at random",
  },
  zh: {
    languageLabel: "语言",
    homeLabel: "BioassayCraft 首页",
    explore: "探索 BioassayCraft",
    heroTagline: "从理论走向实践。",
    learn: "探索",
    learnHeading: "探索背后的推理。",
    learnNote: "交互式学习模块。",
    tools: "工具",
    toolsHeading: "实用工具。",
    toolsNote: "用于探索与计算的科学工具。",
    viewAll: "查看全部",
    journey: "旅程",
    journeyHeading: "沿着推理前行。",
    journeyNote: "结构化学习路径。",
    ready: "已就绪",
    planned: "规划中",
    lucky: "手气不错",
    luckyLabel: "随机打开一个已就绪页面",
  },
};

const copy = computed(() => homeCopy[language.value]);

const mobileStatusLabel = (item) => (item.ready ? copy.value.ready : copy.value.planned);

const groupTitle = (group) => copy.value[group.key];

const groupNote = (group) => copy.value[`${group.key}Note`];

const localizedValue = (value) => value?.[language.value] || value?.en || "";

const itemTitle = (item) => localizedValue(item.title);

const itemNote = (item) => localizedValue(item.note);

const mobileCardTitleLines = (item) => item.titleLines?.[language.value] || [itemTitle(item)];

let scrollFrame = null;

const updateScrollState = () => {
  scrollFrame = null;

  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  isLuckyButtonCompact.value = scrollY > 72;
};

const requestScrollUpdate = () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateScrollState);
};

const readyMobileDestinations = computed(() =>
  getLuckyModules().map((module) => ({
    ...module,
    luckyKey: module.luckyKey || module.route,
    weight: Math.max(1, Number(module.weight) || 1),
  })),
);

const readLuckyHistory = () => {
  try {
    const raw = window.localStorage.getItem(luckyStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
  } catch {
    return [];
  }
};

const writeLuckyHistory = (nextKey, previousHistory) => {
  try {
    window.localStorage.setItem(
      luckyStorageKey,
      JSON.stringify([nextKey, ...previousHistory.filter((key) => key !== nextKey)].slice(0, 6)),
    );
  } catch {
    // localStorage may be unavailable in private or restricted browsing contexts.
  }
};

const chooseWeightedDestination = (items) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  return (
    items.find((item) => {
      cursor -= item.weight;
      return cursor <= 0;
    }) || items[0]
  );
};

const openLuckyModule = () => {
  const destinations = readyMobileDestinations.value;
  if (!destinations.length) return;

  const history = readLuckyHistory();
  const lastKey = history[0];
  const candidates =
    destinations.length > 1
      ? destinations.filter((item) => item.luckyKey !== lastKey)
      : destinations;
  const destination = chooseWeightedDestination(candidates);

  writeLuckyHistory(destination.luckyKey, history);
  window.location.href = destination.route;
};

onMounted(() => {
  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
});

onBeforeUnmount(() => {
  if (scrollFrame) {
    window.cancelAnimationFrame(scrollFrame);
  }
  window.removeEventListener("scroll", requestScrollUpdate);
  window.removeEventListener("resize", requestScrollUpdate);
});
</script>

<template>
  <section
    class="notebook-home"
    aria-labelledby="home-title"
  >
    <h1 id="home-title" class="home-page-title">BioassayCraft</h1>

    <section
      v-for="group in homeGroups"
      :id="group.key"
      :key="group.key"
      class="home-scene content-scene"
      :class="`${group.key}-scene`"
      :aria-labelledby="`${group.key}-title`"
    >
      <div class="scene-heading">
        <div class="scene-heading-copy">
          <h2 :id="`${group.key}-title`">{{ groupTitle(group) }}</h2>
          <p>{{ groupNote(group) }}</p>
        </div>
        <a
          v-if="group.key !== 'journey'"
          class="desktop-view-all"
          :href="group.key === 'learn' ? '/learn/' : '/tools/'"
          :aria-label="`${copy.viewAll} ${groupTitle(group)}`"
        >
          {{ copy.viewAll }} <span aria-hidden="true">→</span>
        </a>
      </div>

      <div class="desktop-scene-content">
        <ul
          class="desktop-card-grid"
          :class="`desktop-${group.key}-grid`"
          :aria-label="`${groupTitle(group)} modules`"
        >
          <li v-for="item in desktopFeaturedItems(group)" :key="item.key">
            <component
              :is="item.href ? 'a' : 'article'"
              class="desktop-hub-card"
              :class="{ 'is-linked': item.href }"
              :href="item.href || undefined"
            >
              <span class="desktop-card-status" :class="{ 'is-ready': item.ready }">
                <i v-if="item.ready" aria-hidden="true"></i>{{ mobileStatusLabel(item) }}
              </span>
              <span class="desktop-card-copy">
                <strong>{{ itemTitle(item) }}</strong>
                <small>{{ itemNote(item) }}</small>
              </span>
              <span v-if="item.href" class="desktop-card-arrow" aria-hidden="true">→</span>
            </component>
          </li>
        </ul>
      </div>
    </section>

    <section class="mobile-home-hub" :aria-label="copy.homeLabel">
      <header class="mobile-home-header">
        <div class="mobile-home-brand">
          <img src="/assets/brand/logo-dark.svg" data-theme-logo alt="" aria-hidden="true" />
          <span>BioassayCraft</span>
        </div>

        <div class="mobile-header-language" :aria-label="copy.languageLabel">
          <button
            type="button"
            :class="{ 'is-active': language === 'zh' }"
            :aria-pressed="language === 'zh'"
            @click="setLocale('zh')"
          >
            中文
          </button>
          <button
            type="button"
            :class="{ 'is-active': language === 'en' }"
            :aria-pressed="language === 'en'"
            @click="setLocale('en')"
          >
            EN
          </button>
        </div>
      </header>

      <section
        v-for="group in homeGroups"
        :id="`mobile-${group.key}`"
        :key="group.key"
        class="mobile-home-section"
        :class="{ 'mobile-journey-section': group.key === 'journey' }"
        :aria-labelledby="`mobile-${group.key}-title`"
      >
        <div class="mobile-section-heading">
          <div class="mobile-section-title-row">
            <h2 :id="`mobile-${group.key}-title`">{{ groupTitle(group) }}</h2>
            <a
              v-if="group.key !== 'journey'"
              class="mobile-view-all"
              :href="group.key === 'learn' ? '/learn/' : '/tools/'"
              :aria-label="`${copy.viewAll} ${groupTitle(group)}`"
            >
              {{ copy.viewAll }} <span aria-hidden="true">›</span>
            </a>
          </div>
          <p>{{ groupNote(group) }}</p>
        </div>

        <div
          v-if="group.key !== 'journey'"
          class="mobile-card-grid"
          :aria-label="`${groupTitle(group)} modules`"
        >
          <component
            :is="item.href ? 'a' : 'article'"
            v-for="item in mobileFeaturedItems(group)"
            :key="item.key"
            class="mobile-hub-card"
            :class="{ 'is-ready': item.ready }"
            :href="item.href || undefined"
            :aria-disabled="!item.href ? 'true' : undefined"
          >
            <span class="mobile-card-status" :class="{ 'is-ready': item.ready }">
              <i v-if="item.ready" aria-hidden="true"></i>{{ mobileStatusLabel(item) }}
            </span>
            <strong>
              <template v-if="mobileCardTitleLines(item)">
                <span
                  v-for="line in mobileCardTitleLines(item)"
                  :key="line"
                  class="mobile-card-title-line"
                >
                  {{ line }}
                </span>
              </template>
              <template v-else>{{ itemTitle(item) }}</template>
            </strong>
            <span v-if="item.href" class="mobile-card-arrow" aria-hidden="true">›</span>
          </component>
        </div>

        <div v-else class="mobile-journey-list" :aria-label="`${groupTitle(group)} modules`">
          <article v-for="item in group.items" :key="item.key" class="mobile-journey-card">
            <strong>{{ itemTitle(item) }}</strong>
            <small>{{ mobileStatusLabel(item) }}</small>
          </article>
        </div>
      </section>

      <button
        type="button"
        class="mobile-lucky-button"
        :class="{ 'is-compact': isLuckyButtonCompact }"
        :aria-label="copy.luckyLabel"
        :title="copy.luckyLabel"
        @click="openLuckyModule"
      >
        <svg
          class="mobile-lucky-button-mark"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m11.8 2.6 1.7 5.5 5.5 1.7-5.5 1.7-1.7 5.5-1.7-5.5-5.5-1.7L10.1 8z" />
          <path d="m18.2 14.3.8 2.7 2.7.8-2.7.8-.8 2.7-.8-2.7-2.7-.8 2.7-.8z" />
        </svg>
        <span class="mobile-lucky-button-label">{{ copy.lucky }}</span>
      </button>
    </section>
  </section>
</template>
