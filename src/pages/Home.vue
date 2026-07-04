<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["activate-group", "clear-group"]);

const heroProgress = ref(0);
const hasScrolled = ref(false);

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
    title: "Conc. Converter",
    note: "Mass ↔ molar.",
    href: "/tools/concentration-converter/",
  },
  {
    title: "Sample Size Calculator",
    note: "Runs from assumptions.",
    href: "/tools/validation-sample-size-calculator/",
  },
  {
    title: "ANOVA Explorer",
    note: "Variation becomes evidence.",
    href: "/anova/",
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
        <p class="eyebrow">Learn</p>
        <h2 id="learn-title">Coming Soon.</h2>
        <p class="scene-note">Learn beyond the guidance.</p>
      </div>

      <ul class="learn-list" aria-label="Future BioassayCraft learning references">
        <li v-for="item in learnItems" :key="item.title">
          <strong>{{ item.title }}</strong>
          <span v-if="item.detail">{{ item.detail }}</span>
        </li>
      </ul>
    </section>

    <section
      id="journey"
      class="home-scene content-scene journey-scene"
      aria-labelledby="journey-title"
    >
      <div class="scene-heading">
        <p class="eyebrow">Journey</p>
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
        <p class="eyebrow">Tools</p>
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
  </section>
</template>
