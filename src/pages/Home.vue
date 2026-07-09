<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "../utils/locale";

const emit = defineEmits(["activate-group", "clear-group"]);

const heroProgress = ref(0);
const hasScrolled = ref(false);
const { locale: language, setLocale } = useLocale();
const luckyStorageKey = "bioassaycraft:mobile-home:lucky-history";

const journeyItems = [
  {
    title: "Method Development",
    note: "ATP-driven design choices, assay strategy.",
    href: "/journeys/",
  },
  {
    title: "Method Validation",
    note: "Evidence for reportable results.",
    href: "/journeys/",
  },
  {
    title: "Data Analysis",
    note: "Interpretation of bioassay data.",
    href: "/journeys/",
  },
];

const tools = [
  {
    title: "Unit Converter",
    note: "Mass ↔ molar.",
    href: "/tools/converter/",
  },
  {
    title: "Specification Limit Calculator",
    note: "Internal specifications.",
    href: "/tools/specification-limit-calculator/",
  },
  {
    title: "Sample Size Calculator",
    note: "Runs from assumptions.",
    href: "/tools/validation-sample-size-calculator/",
  },
  {
    title: "Validation Simulator",
    note: "Validation as risk reasoning.",
    href: "/simulators/validation-simulator/",
  },
  {
    title: "OOS Risk Explorer",
    note: "Tail-area risk.",
    href: "/tools/oos-risk-explorer/",
  },
];

const learnItems = [
  {
    title: "ANOVA Explorer",
    detail: "Variance decomposition and model reasoning.",
    href: "/learn/anova-explorer/",
  },
  {
    title: "中国药典",
    detail: "1431 / 9307 / 9401",
  },
  {
    title: "USP",
    detail: "<1032> / <1033> / <1034>",
  },
  {
    title: "EP",
    detail: "5.3",
  },
  {
    title: "ICH",
    detail: "Q2(R2) / Q14",
  },
];

const mobileLearnItems = [
  {
    title: "ANOVA Explorer",
    titleLines: ["ANOVA", "Explorer"],
    zhTitleLines: ["探索", "方差分析"],
    subtitle: "Interactive ANOVA visualization",
    status: "Ready",
    ready: true,
    href: "/learn/anova-explorer/",
    luckyKey: "anova-explorer",
    weight: 1,
  },
  {
    title: "Validation Explorer",
    titleLines: ["Validation", "Explorer"],
    subtitle: "Method validation learning",
    status: "Coming Soon",
    ready: false,
  },
];

const mobileToolItems = [
  {
    title: "Unit Converter",
    titleLines: ["Unit", "Converter"],
    zhTitleLines: ["单位", "转换器"],
    subtitle: "Scientific concentration conversion",
    status: "Ready",
    ready: true,
    href: "/tools/converter/",
    luckyKey: "unit-converter",
    weight: 1,
  },
  {
    title: "Specification Limit Calculator",
    titleLines: ["Specification", "Limit Calculator"],
    zhTitleLines: ["质量标准", "限度计算器"],
    subtitle: "Specification limit workflow",
    status: "Ready",
    ready: true,
    href: "/tools/specification-limit-calculator/",
    luckyKey: "spec-limit-calculator",
    weight: 1,
  },
  {
    title: "Validation Calculator",
    titleLines: ["Validation", "Calculator"],
    subtitle: "Validation utilities",
    status: "Coming Soon",
    ready: false,
  },
];

const mobileJourneyItems = [
  {
    title: "Bioassay Development",
    type: "Learning Path",
    status: "Coming Soon",
  },
  {
    title: "Bioassay Validation",
    type: "Learning Path",
    status: "Coming Soon",
  },
  {
    title: "Bioassay Maintenance",
    type: "Learning Path",
    status: "Coming Soon",
  },
];

const mobileHomeGroups = [
  {
    key: "learn",
    items: mobileLearnItems,
  },
  {
    key: "tools",
    items: mobileToolItems,
  },
];

const homeCopy = {
  en: {
    languageLabel: "Language",
    learn: "Learn",
    learnNote: "Explore interactive learning modules.",
    tools: "Tools",
    toolsNote: "Scientific utilities.",
    journey: "Journey",
    journeyNote: "Structured learning paths.",
    ready: "Ready",
    comingSoon: "Coming Soon",
    lucky: "I'm Feeling Lucky!",
  },
  zh: {
    languageLabel: "语言",
    learn: "学习",
    learnNote: "探索交互式学习模块",
    tools: "工具",
    toolsNote: "常用科学计算工具",
    journey: "旅程",
    journeyNote: "结构化学习路径",
    ready: "已就绪",
    comingSoon: "即将推出",
    lucky: "I'm Feeling Lucky!",
  },
};

const copy = computed(() => homeCopy[language.value]);

const mobileStatusLabel = (item) => (item.ready ? copy.value.ready : copy.value.comingSoon);

const mobileGroupTitle = (group) => copy.value[group.key];

const mobileGroupNote = (group) => copy.value[`${group.key}Note`];

const mobileCardTitleLines = (item) =>
  language.value === "zh" && item.zhTitleLines ? item.zhTitleLines : item.titleLines;

let scrollFrame = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateScrollState = () => {
  scrollFrame = null;

  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  const transitionDistance = Math.max(280, window.innerHeight * 0.44);
  heroProgress.value = clamp(scrollY / transitionDistance, 0, 1);
  hasScrolled.value = scrollY > 12;
  document.documentElement.style.setProperty("--hero-progress", heroProgress.value.toFixed(3));

  const sections = [
    { id: "learn", element: document.getElementById("learn") },
    { id: "journey", element: document.getElementById("journey") },
    { id: "tools", element: document.getElementById("tools") },
  ].filter((section) => section.element);

  const anchor = window.innerHeight * 0.42;

  if (sections[0]?.element.getBoundingClientRect().top > anchor) {
    emit("clear-group");
    return;
  }

  const active =
    sections
      .map((section) => ({
        id: section.id,
        top: section.element.getBoundingClientRect().top,
      }))
      .filter((section) => section.top <= anchor)
      .sort((a, b) => b.top - a.top)[0] || sections[0];

  if (active?.id) {
    emit("activate-group", active.id);
  }
};

const requestScrollUpdate = () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateScrollState);
};

const heroTitleStyle = computed(() => {
  const progress = heroProgress.value;
  const isMobile = window.innerWidth < 768;
  const x = -progress * Math.min(window.innerWidth * (isMobile ? 0.14 : 0.34), isMobile ? 80 : 430);
  const y = -progress * Math.min(window.innerHeight * (isMobile ? 0.18 : 0.3), isMobile ? 96 : 260);
  const scale = 1 - progress * (isMobile ? 0.34 : 0.72);

  return {
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
  };
});

const readyMobileDestinations = computed(() =>
  mobileHomeGroups.flatMap((group) =>
    group.items
      .filter((item) => item.ready && item.href)
      .map((item) => ({
        ...item,
        group: group.key,
        luckyKey: item.luckyKey || item.href,
        weight: Math.max(1, Number(item.weight) || 1),
      })),
  ),
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
  window.location.href = destination.href;
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
  document.documentElement.style.removeProperty("--hero-progress");
});
</script>

<template>
  <section
    class="notebook-home"
    :class="{ 'has-scrolled': hasScrolled }"
    aria-labelledby="home-title"
  >
    <section class="home-scene hero-scene" aria-label="BioassayCraft identity">
      <div class="hero-field" aria-hidden="true"></div>
      <div class="hero-copy">
        <h1 id="home-title" :style="heroTitleStyle">BioassayCraft</h1>
        <p>From theory to practice.</p>
      </div>
      <a class="scroll-cue" href="#learn" aria-label="Explore BioassayCraft">
        <span aria-hidden="true">↓</span>
      </a>
    </section>

    <section id="learn" class="home-scene content-scene learn-scene" aria-labelledby="learn-title">
      <div class="scene-heading">
        <p class="eyebrow">{{ copy.learn }}</p>
        <h2 id="learn-title">Coming Soon.</h2>
        <p class="scene-note">Learn beyond the guidance.</p>
      </div>

      <ul class="learn-list" aria-label="Future BioassayCraft learning references">
        <li v-for="item in learnItems" :key="item.title">
          <a v-if="item.href" :href="item.href">
            <strong>{{ item.title }}</strong>
            <span v-if="item.detail">{{ item.detail }}</span>
          </a>
          <template v-else>
            <strong>{{ item.title }}</strong>
            <span v-if="item.detail">{{ item.detail }}</span>
          </template>
        </li>
      </ul>
    </section>

    <section
      id="journey"
      class="home-scene content-scene journey-scene"
      aria-labelledby="journey-title"
    >
      <div class="scene-heading">
        <p class="eyebrow">{{ copy.journey }}</p>
        <h2 id="journey-title">Coming Soon.</h2>
        <p class="scene-note">Every bioassay follows its own journey.</p>
      </div>

      <div class="journey-list" aria-label="BioassayCraft journeys">
        <a v-for="item in journeyItems" :key="item.title" class="journey-link" :href="item.href">
          <span>{{ item.title }}</span>
          <small>{{ item.note }}</small>
        </a>
      </div>
    </section>

    <section id="tools" class="home-scene content-scene tools-scene" aria-labelledby="tools-title">
      <div class="scene-heading">
        <p class="eyebrow">{{ copy.tools }}</p>
        <h2 id="tools-title">Practical tools</h2>
        <p class="scene-note">That may be useful.</p>
      </div>

      <div class="tool-list" aria-label="BioassayCraft tools">
        <a v-for="tool in tools" :key="tool.href" class="tool-link" :href="tool.href">
          <span>{{ tool.title }}</span>
          <small>{{ tool.note }}</small>
        </a>
      </div>
    </section>

    <section class="mobile-home-hub" aria-label="BioassayCraft mobile home">
      <header class="mobile-home-header">
        <div class="mobile-home-brand">
          <img src="/assets/brand/logo-dark.svg" data-theme-logo alt="" aria-hidden="true" />
          <span>BioassayCraft</span>
        </div>

        <div class="mobile-header-language" :aria-label="copy.languageLabel">
          <button
            type="button"
            :class="{ 'is-active': language === 'zh' }"
            @click="setLocale('zh')"
          >
            中文
          </button>
          <button
            type="button"
            :class="{ 'is-active': language === 'en' }"
            @click="setLocale('en')"
          >
            EN
          </button>
        </div>
      </header>

      <section
        v-for="group in mobileHomeGroups"
        :id="`mobile-${group.key}`"
        :key="group.key"
        class="mobile-home-section"
        :aria-labelledby="`mobile-${group.key}-title`"
      >
        <div class="mobile-section-heading">
          <h2 :id="`mobile-${group.key}-title`">{{ mobileGroupTitle(group) }}</h2>
          <p>{{ mobileGroupNote(group) }}</p>
        </div>

        <div class="mobile-card-rail" :aria-label="`${mobileGroupTitle(group)} modules`">
          <component
            :is="item.ready && item.href ? 'a' : 'article'"
            v-for="item in group.items"
            :key="item.title"
            class="mobile-hub-card"
            :class="{ 'is-ready': item.ready }"
            :href="item.ready && item.href ? item.href : undefined"
            :aria-disabled="!item.ready ? 'true' : undefined"
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
              <template v-else>{{ item.title }}</template>
            </strong>
          </component>
        </div>
      </section>

      <section
        id="mobile-journey"
        class="mobile-home-section mobile-journey-section"
        aria-labelledby="mobile-journey-title"
      >
        <div class="mobile-section-heading">
          <h2 id="mobile-journey-title">{{ copy.journey }}</h2>
          <p>{{ copy.journeyNote }}</p>
        </div>

        <div class="mobile-journey-list" aria-label="Learning paths">
          <article v-for="item in mobileJourneyItems" :key="item.title" class="mobile-journey-card">
            <strong>{{ item.title }}</strong>
            <small>{{ copy.comingSoon }}</small>
          </article>
        </div>
      </section>

      <button type="button" class="mobile-lucky-button" @click="openLuckyModule">
        {{ copy.lucky }}
      </button>
    </section>
  </section>
</template>
