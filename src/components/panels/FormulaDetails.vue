<script setup>
defineProps({
  summary: {
    type: String,
    default: "Formula details",
  },
});
</script>

<template>
  <details class="formula-details">
    <summary>{{ summary }}</summary>
    <slot />
  </details>
</template>
