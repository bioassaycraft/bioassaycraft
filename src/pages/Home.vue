<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useLocale } from "../utils/locale";
import { animateElement, hoverTransition } from "../utils/motion";

const emit = defineEmits(["activate-group", "clear-group"]);

const heroProgress = ref(0);
const hasScrolled = ref(false);
const { locale: language, setLocale } = useLocale();
const luckyStorageKey = "bioassaycraft:mobile-home:lucky-history";

const homeGroups = [
  {
    key: "learn",
    items: [
      {
        key: "anova-explorer",
        title: { en: "Explore ANOVA", zh: "探索方差分析" },
        titleLines: { en: ["Explore ANOVA"], zh: ["探索方差分析"] },
        note: {
          en: "Interactive ANOVA visualization.",
          zh: "交互式方差分析可视化。",
        },
        ready: true,
        href: "/learn/anova-explorer/",
        luckyKey: "anova-explorer",
        weight: 1,
      },
      {
        key: "ci-explorer",
        title: { en: "Explore Confidence Interval", zh: "探索置信区间" },
        titleLines: { en: ["Explore CI"], zh: ["探索置信区间"] },
        note: {
          en: "Interactive confidence interval visualization.",
          zh: "交互式置信区间可视化。",
        },
        ready: true,
        href: "/learn/ci-explorer/",
        luckyKey: "ci-explorer",
        weight: 1,
      },
      {
        key: "residual-explorer",
        title: { en: "Explore Residual Distribution", zh: "探索残差分布" },
        titleLines: { en: ["Explore residuals"], zh: ["探索残差分布"] },
        note: { en: "Explore residual structure after fitting.", zh: "探索拟合后的残差结构。" },
        ready: true,
        href: "/learn/residual-explorer/",
        luckyKey: "residual-explorer",
        weight: 1,
      },
      {
        key: "validation-explorer",
        title: { en: "Explore Method Validation", zh: "探索方法验证" },
        titleLines: { en: ["Explore validation"], zh: ["探索方法验证"] },
        note: { en: "Method validation learning.", zh: "方法验证学习模块。" },
        ready: false,
      },
    ],
  },
  {
    key: "tools",
    items: [
      {
        key: "specification-limit-calculator",
        title: { en: "Specification Limit Calculator", zh: "质量标准限度计算器" },
        titleLines: { en: ["Specification", "Limit Calculator"], zh: ["质量标准", "限度计算器"] },
        note: { en: "Specification limit workflow.", zh: "质量标准限度工作流。" },
        ready: true,
        href: "/tools/specification-limit-calculator/",
        luckyKey: "spec-limit-calculator",
        weight: 1,
      },
      {
        key: "unit-converter",
        title: { en: "Unit Converter", zh: "单位转换器" },
        titleLines: { en: ["Unit", "Converter"], zh: ["单位", "转换器"] },
        note: { en: "Scientific concentration conversion.", zh: "科学浓度换算。" },
        ready: true,
        href: "/tools/converter/",
        luckyKey: "unit-converter",
        weight: 1,
      },
      {
        key: "validation-calculator",
        title: { en: "Validation Calculator", zh: "方法验证计算器" },
        titleLines: { en: ["Validation", "Calculator"], zh: ["方法验证", "计算器"] },
        note: { en: "Validation utilities.", zh: "方法验证实用工具。" },
        ready: false,
      },
    ],
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
    journey: "Journey",
    journeyHeading: "Follow the reasoning.",
    journeyNote: "Structured learning paths.",
    ready: "Ready",
    planned: "Planned",
    lucky: "I'm Feeling Lucky!",
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
    journey: "旅程",
    journeyHeading: "沿着推理前行。",
    journeyNote: "结构化学习路径。",
    ready: "已就绪",
    planned: "规划中",
    lucky: "随机探索",
  },
};

const copy = computed(() => homeCopy[language.value]);

const mobileStatusLabel = (item) => (item.ready ? copy.value.ready : copy.value.planned);

const groupTitle = (group) => copy.value[group.key];

const groupHeading = (group) => copy.value[`${group.key}Heading`];

const desktopGroupHeadingLines = (group) => {
  if (language.value !== "zh") return [groupHeading(group)];
  if (group.key === "learn") return ["探索背后的", "推理。"];
  if (group.key === "journey") return ["沿着推理", "前行。"];
  return [groupHeading(group)];
};

const groupNote = (group) => copy.value[`${group.key}Note`];

const localizedValue = (value) => value?.[language.value] || value?.en || "";

const itemTitle = (item) => localizedValue(item.title);

const itemNote = (item) => localizedValue(item.note);

const mobileCardTitleLines = (item) => item.titleLines?.[language.value] || [itemTitle(item)];

const animateCardHover = (event, isEntering) => {
  animateElement(
    event.currentTarget,
    {
      transform: isEntering
        ? ["translateY(0px)", "translateY(-2px)"]
        : ["translateY(-2px)", "translateY(0px)"],
    },
    hoverTransition,
  );
};

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
    { id: "tools", element: document.getElementById("tools") },
    { id: "journey", element: document.getElementById("journey") },
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
  homeGroups.flatMap((group) =>
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
        <p>{{ copy.heroTagline }}</p>
      </div>
      <a class="scroll-cue" href="#learn" :aria-label="copy.explore">
        <span aria-hidden="true">↓</span>
      </a>
    </section>

    <section
      v-for="group in homeGroups"
      :id="group.key"
      :key="group.key"
      class="home-scene content-scene"
      :class="`${group.key}-scene`"
      :aria-labelledby="`${group.key}-title`"
    >
      <div class="scene-heading">
        <p class="eyebrow">{{ groupTitle(group) }}</p>
        <h2 :id="`${group.key}-title`">
          <span v-for="line in desktopGroupHeadingLines(group)" :key="line" class="heading-line">
            {{ line }}
          </span>
        </h2>
        <p class="scene-note">{{ groupNote(group) }}</p>
      </div>

      <ul
        class="desktop-card-grid"
        :class="`desktop-${group.key}-grid`"
        :aria-label="`${groupTitle(group)} modules`"
      >
        <li v-for="item in group.items" :key="item.key">
          <component
            :is="item.href ? 'a' : 'article'"
            class="desktop-hub-card"
            :class="{ 'is-linked': item.href }"
            :href="item.href || undefined"
            @mouseenter="animateCardHover($event, true)"
            @mouseleave="animateCardHover($event, false)"
            @focus="animateCardHover($event, true)"
            @blur="animateCardHover($event, false)"
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
          <h2 :id="`mobile-${group.key}-title`">{{ groupTitle(group) }}</h2>
          <p>{{ groupNote(group) }}</p>
        </div>

        <div
          v-if="group.key !== 'journey'"
          class="mobile-card-rail"
          :aria-label="`${groupTitle(group)} modules`"
        >
          <component
            :is="item.href ? 'a' : 'article'"
            v-for="item in group.items"
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
          </component>
        </div>

        <div v-else class="mobile-journey-list" :aria-label="`${groupTitle(group)} modules`">
          <article v-for="item in group.items" :key="item.key" class="mobile-journey-card">
            <strong>{{ itemTitle(item) }}</strong>
            <small>{{ mobileStatusLabel(item) }}</small>
          </article>
        </div>
      </section>

      <button type="button" class="mobile-lucky-button" @click="openLuckyModule">
        {{ copy.lucky }}
      </button>
    </section>
  </section>
</template>
