<script setup>
import { ref } from "vue";
import ToolTopbar from "../components/common/ToolTopbar.vue";
import { useLocale } from "../utils/locale";

const { locale: language, setLocale } = useLocale();
const isHeaderMorphed = ref(false);

const copy = {
  en: {
    title: "Validation CI Calculator",
    home: "Home",
    languageLabel: "Language",
    status: "Coming Soon",
    note: "Future validation workflows will reuse the CI statistics engine introduced in CI Explorer.",
    accuracy: "Accuracy CI",
    precision: "Precision CI",
    decision: "Acceptance Decision",
  },
  zh: {
    title: "方法验证置信区间计算器",
    home: "首页",
    languageLabel: "语言",
    status: "Coming Soon",
    note: "未来将复用 CI Explorer 的统计计算模块，用于方法验证中的置信区间决策。",
    accuracy: "Accuracy CI",
    precision: "Precision CI",
    decision: "Acceptance Decision",
  },
};
</script>

<template>
  <main class="validation-ci-page">
    <ToolTopbar
      :title="copy[language].title"
      :language="language"
      :language-label="copy[language].languageLabel"
      :home-label="copy[language].home"
      :is-morphed="isHeaderMorphed"
      @set-language="setLocale"
    />

    <section class="placeholder-shell" aria-labelledby="validation-ci-title">
      <div class="placeholder-visual" aria-hidden="true">
        <svg viewBox="0 0 620 280" role="img">
          <line x1="48" y1="146" x2="572" y2="146" class="axis-line"></line>
          <rect x="198" y="102" width="224" height="88" class="acceptance-band"></rect>
          <line x1="258" y1="146" x2="386" y2="146" class="interval-line"></line>
          <circle cx="322" cy="146" r="8" class="center-dot"></circle>
          <text x="310" y="82">CI</text>
        </svg>
      </div>

      <aside class="placeholder-copy">
        <span>{{ copy[language].status }}</span>
        <h1 id="validation-ci-title">{{ copy[language].title }}</h1>
        <p>{{ copy[language].note }}</p>
        <ul>
          <li>{{ copy[language].accuracy }}</li>
          <li>{{ copy[language].precision }}</li>
          <li>{{ copy[language].decision }}</li>
        </ul>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.validation-ci-page {
  --topbar-sticky-height: 48px;
  --paper: var(--bc-bg-page);
  --ink: var(--bc-text-primary);
  --muted: var(--bc-text-secondary);
  --soft-line: var(--bc-border-subtle);
  --panel: var(--bc-bg-surface);
  --panel-soft: var(--bc-bg-surface-elevated);
  --accent: var(--bc-accent);
  --accent-soft: var(--bc-accent-soft);
  --accent-border: var(--bc-accent-border);
  width: min(1100px, calc(100% - var(--bc-container-inline, 48px)));
  min-height: 100svh;
  margin: 0 auto;
  padding: calc(var(--topbar-sticky-height) + 26px) 0 28px;
  color: var(--ink);
}

.placeholder-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(300px, 0.4fr);
  gap: 12px;
  align-items: stretch;
}

.placeholder-visual,
.placeholder-copy {
  min-width: 0;
  min-height: 420px;
  border: 1px solid var(--soft-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--bc-shadow-card);
}

.placeholder-visual {
  display: grid;
  place-items: center;
  padding: 18px;
}

.placeholder-visual svg {
  display: block;
  width: 100%;
  max-width: 680px;
}

.axis-line {
  stroke: var(--soft-line);
  stroke-width: 1.4;
}

.acceptance-band {
  fill: var(--accent-soft);
  stroke: var(--accent-border);
}

.interval-line {
  stroke: var(--accent);
  stroke-width: 7;
  stroke-linecap: round;
}

.center-dot {
  fill: var(--accent);
  stroke: var(--bc-bg-surface-solid);
  stroke-width: 1.6;
}

text {
  fill: var(--muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8rem;
  text-anchor: middle;
}

.placeholder-copy {
  display: grid;
  align-content: center;
  gap: 14px;
  padding: 20px;
}

.placeholder-copy span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.placeholder-copy h1 {
  margin: 0;
  font-size: clamp(1.45rem, 2.2vw, 2.1rem);
  line-height: 1.08;
}

.placeholder-copy p,
.placeholder-copy li {
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.placeholder-copy p,
.placeholder-copy ul {
  margin: 0;
}

.placeholder-copy ul {
  display: grid;
  gap: 7px;
  padding-left: 18px;
}

@media (max-width: 1199px) {
  .placeholder-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .validation-ci-page {
    width: min(100% - 24px, 1100px);
  }

  .placeholder-visual,
  .placeholder-copy {
    min-height: 0;
  }
}
</style>
