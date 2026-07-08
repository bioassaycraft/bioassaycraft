<script setup>
import { computed } from "vue";
import { useLocale } from "../utils/locale";

const { locale } = useLocale();
const eyebrow = computed(() => (locale.value === "zh" ? "学习" : "Learn"));
</script>

<template>
  <section>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>Interactive pharmacopoeia learning</h1>
  </section>
</template>
