<script setup>
import { computed } from "vue";
import MobilePageTitle from "../components/common/MobilePageTitle.vue";
import MobileToolHeader from "../components/common/MobileToolHeader.vue";
import { usePageSeo } from "../composables/usePageSeo";
import { useLocale } from "../utils/locale";

usePageSeo("/404");
const { locale, setLocale } = useLocale();
const copy = computed(() =>
  locale.value === "zh"
    ? {
        title: "页面未找到",
        home: "返回首页",
        language: "语言",
        body: "未找到请求的 BioassayCraft 页面。",
      }
    : {
        title: "Page not found",
        home: "Return home",
        language: "Language",
        body: "The requested BioassayCraft page could not be found.",
      },
);
</script>

<template>
  <main class="not-found-page">
    <MobileToolHeader
      class="not-found-mobile-header"
      :aria-label="copy.title"
      selector-label=""
      :options="[]"
      selected-value=""
      :language="locale"
      :language-label="copy.language"
      :home-label="copy.home"
      :page-title="copy.title"
      :show-selector="false"
      @set-language="setLocale"
    />
    <MobilePageTitle :title="copy.title" />
    <section class="not-found-content">
      <p class="eyebrow">404</p>
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.body }}</p>
      <a href="/">{{ copy.home }}</a>
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: 100svh;
  color: var(--app-text);
  background: var(--app-bg);
}
.not-found-content {
  display: grid;
  place-content: center;
  min-height: 100svh;
  gap: 0.8rem;
  padding: 2rem;
}
@media (max-width: 767px) {
  .not-found-mobile-header {
    padding-top: max(env(safe-area-inset-top), 12px);
  }
  .not-found-content {
    min-height: calc(100svh - env(safe-area-inset-top) - 84px);
  }
}
</style>
