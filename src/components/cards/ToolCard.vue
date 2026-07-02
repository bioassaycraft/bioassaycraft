<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  href: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <a class="tool-card" :href="href">
    <strong>{{ title }}</strong>
    <span v-if="description">{{ description }}</span>
  </a>
</template>
