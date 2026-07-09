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
const { locale } = useLocale();

const navLabels = {
  en: {
    learn: "Learn",
    journey: "Journey",
    tools: "Tools",
  },
  zh: {
    learn: "学习",
    journey: "旅程",
    tools: "工具",
  },
};

const navItems = computed(() => [
  { id: "learn", label: navLabels[locale.value].learn, href: "#learn" },
  { id: "journey", label: navLabels[locale.value].journey, href: "#journey" },
  { id: "tools", label: navLabels[locale.value].tools, href: "#tools" },
]);
</script>

<template>
  <header class="site-header">
    <a class="brand-link" href="/" aria-label="BioassayCraft home">
      <img class="brand-mark" src="/assets/brand/logo-dark.svg" data-theme-logo alt="" aria-hidden="true" />
      <span class="brand-name">bioassaycraft</span>
    </a>
    <nav class="site-nav" aria-label="App preview navigation">
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
