<script setup>
import { useLocale } from "../../utils/locale";

const { locale, setLocale } = useLocale();

const navLabels = {
  en: {
    language: "Language",
    home: "BioassayCraft home",
  },
  zh: {
    language: "语言",
    home: "BioassayCraft 首页",
  },
};
</script>

<template>
  <header class="site-header">
    <a class="brand-link" href="/" :aria-label="navLabels[locale].home">
      <img
        class="brand-mark"
        src="/assets/brand/logo-dark.svg"
        data-theme-logo
        alt=""
        aria-hidden="true"
      />
      <span class="brand-name">BioassayCraft</span>
    </a>
    <div class="site-header-language" :aria-label="navLabels[locale].language">
      <button
        type="button"
        :class="{ 'is-active': locale === 'zh' }"
        :aria-pressed="locale === 'zh'"
        @click="setLocale('zh')"
      >
        中文
      </button>
      <button
        type="button"
        :class="{ 'is-active': locale === 'en' }"
        :aria-pressed="locale === 'en'"
        @click="setLocale('en')"
      >
        EN
      </button>
    </div>
  </header>
</template>
