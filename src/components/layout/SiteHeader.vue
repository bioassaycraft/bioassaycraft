<script setup>
import { computed } from "vue";
import { useLocale } from "../../utils/locale";

defineProps({
  activeGroup: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["activate-group", "clear-group"]);
const { locale, setLocale } = useLocale();

const navLabels = {
  en: {
    learn: "Explore",
    tools: "Tools",
    journey: "Journey",
    language: "Language",
    navigation: "Homepage navigation",
    home: "BioassayCraft home",
  },
  zh: {
    learn: "探索",
    tools: "工具",
    journey: "旅程",
    language: "语言",
    navigation: "首页导航",
    home: "BioassayCraft 首页",
  },
};

const navItems = computed(() => [
  { id: "learn", label: navLabels[locale.value].learn, href: "#learn" },
  { id: "tools", label: navLabels[locale.value].tools, href: "#tools" },
  { id: "journey", label: navLabels[locale.value].journey, href: "#journey" },
]);
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
      <span class="brand-name">bioassaycraft</span>
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
    <nav class="site-nav" :aria-label="navLabels[locale].navigation">
      <a
        v-for="item in navItems"
        :key="item.id"
        :href="item.href"
        :class="{ 'is-active': activeGroup === item.id }"
        @mouseenter="emit('activate-group', item.id)"
        @focus="emit('activate-group', item.id)"
        @click="emit('activate-group', item.id)"
      >
        {{ item.label }}
      </a>
    </nav>
  </header>
</template>
