<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["activate-group", "clear-group"]);

const heroProgress = ref(0);
const hasScrolled = ref(false);

const reasoningNodes = [
  {
    label: "Question",
    note: "What decision must the assay support?",
  },
  {
    label: "ATP",
    note: "Name the intended purpose before designing the method.",
  },
  {
    label: "Method Design",
    note: "Choose the format, readout, model, and controls.",
  },
  {
    label: "Validation",
    note: "Ask how much evidence is enough.",
  },
  {
    label: "Evidence",
    note: "Bias, precision, residuals, and reportable results become visible.",
  },
  {
    label: "Decision",
    note: "Use the evidence to support practical judgement.",
  },
];

const practicePaths = [
  {
    title: "Method Development",
    note: "Define purpose, design choices, and assay strategy.",
  },
  {
    title: "Method Validation",
    note: "Ask how much evidence is enough.",
  },
  {
    title: "Data Analysis",
    note: "Turn variation into interpretable evidence.",
  },
];

const artifacts = [
  {
    title: "ANOVA Explorer",
    note: "Explore how variation becomes evidence.",
    href: "/simulators/anova-model-comparison/",
  },
  {
    title: "Validation Sample Size",
    note: "Estimate evidence required by validation assumptions.",
    href: "/tools/validation-sample-size-calculator/",
  },
  {
    title: "Concentration Converter",
    note: "Move between mass and molar thinking.",
    href: "/tools/concentration-converter/",
  },
  {
    title: "OOS Risk Explorer",
    note: "Reason through tail-area risk.",
    href: "/tools/oos-risk-explorer/",
  },
  {
    title: "Method Validation Simulator",
    note: "Explore validation design as risk reasoning.",
    href: "/simulators/validation-simulator/",
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
  const x = -progress * Math.min(window.innerWidth * 0.34, 430);
  const y = -progress * Math.min(window.innerHeight * 0.3, 260);
  const scale = 1 - progress * 0.72;

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
    <section class="notebook-scene scene-identity" aria-label="BioassayCraft identity">
      <div class="notebook-paper" aria-hidden="true"></div>
      <div class="identity-copy">
        <h1 id="home-title" :style="heroTitleStyle">BioassayCraft</h1>
        <p class="hero-slogan">From theory to practice.</p>
        <p class="hero-subline">
          Interactive tutorials, simulations, practical tools, and bioassay insights.
        </p>
      </div>
      <a class="scroll-cue" href="#learn" aria-label="Scroll to begin">
        <span aria-hidden="true">↓</span>
      </a>
    </section>

    <section
      id="learn"
      class="notebook-scene scene-question reading-scene"
      aria-labelledby="question-title"
    >
      <div class="scene-copy">
        <p class="eyebrow">Question</p>
        <h2 id="question-title">Every scientific decision begins with a question.</h2>
        <p class="question-line">How do we know an assay is fit for purpose?</p>
      </div>
      <div class="scene-illustration question-illustration" aria-hidden="true">
        <span></span>
      </div>
    </section>

    <section class="notebook-scene scene-chain reading-scene" aria-labelledby="chain-title">
      <div class="scene-copy">
        <p class="eyebrow">Reasoning chain</p>
        <h2 id="chain-title">From question to evidence, then decision.</h2>
      </div>

      <ol class="reasoning-chain" aria-label="Bioassay reasoning chain">
        <li v-for="node in reasoningNodes" :key="node.label" class="chain-node">
          <span class="chain-dot" aria-hidden="true"></span>
          <strong>{{ node.label }}</strong>
          <small>{{ node.note }}</small>
        </li>
      </ol>
    </section>

    <section
      id="journey"
      class="notebook-scene scene-paths reading-scene"
      aria-labelledby="paths-title"
    >
      <div class="scene-copy">
        <p class="eyebrow">Practice paths</p>
        <h2 id="paths-title">Follow the reasoning.</h2>
      </div>

      <div class="path-list" aria-label="Bioassay practice paths">
        <article v-for="path in practicePaths" :key="path.title" class="path-node" tabindex="0">
          <h3>{{ path.title }}</h3>
          <p>{{ path.note }}</p>
        </article>
      </div>
    </section>

    <section
      id="tools"
      class="notebook-scene scene-artifacts reading-scene"
      aria-labelledby="artifacts-title"
    >
      <div class="scene-copy">
        <p class="eyebrow">Artifacts</p>
        <h2 id="artifacts-title">Scientific objects for exploration.</h2>
      </div>

      <div class="artifact-list" aria-label="BioassayCraft artifacts">
        <a
          v-for="artifact in artifacts"
          :key="artifact.href"
          class="artifact-link"
          :href="artifact.href"
        >
          <span>{{ artifact.title }}</span>
          <small>{{ artifact.note }}</small>
        </a>
      </div>
    </section>

    <section class="notebook-scene scene-closing" aria-label="BioassayCraft closing reflection">
      <div class="closing-copy">
        <p>Theory guides the question.</p>
        <p>Evidence supports the decision.</p>
        <p>Practice refines the craft.</p>
      </div>
      <p class="closing-domain">bioassaycraft.com</p>
    </section>
  </section>
</template>
