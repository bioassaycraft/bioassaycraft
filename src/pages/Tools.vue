<script setup>
import { computed } from "vue";
import { useLocale } from "../utils/locale";

const { locale } = useLocale();
const eyebrow = computed(() => (locale.value === "zh" ? "工具" : "Tools"));
</script>

<template>
  <section>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>Focused calculators and simulators</h1>
  </section>
</template>
