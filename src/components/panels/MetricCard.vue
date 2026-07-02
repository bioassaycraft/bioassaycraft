<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  note: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="metric-card">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <p v-if="note">{{ note }}</p>
  </div>
</template>
