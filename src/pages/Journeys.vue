<script setup>
import { computed } from "vue";
import { useLocale } from "../utils/locale";

const { locale } = useLocale();
const eyebrow = computed(() => (locale.value === "zh" ? "旅程" : "Journey"));
</script>

<template>
  <section>
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1>Structured bioassay practice workflows</h1>
  </section>
</template>
