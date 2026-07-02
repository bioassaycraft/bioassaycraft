<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  href: {
    type: String,
    required: true,
  },
  group: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["activate", "clear", "select"]);
</script>

<template>
  <a
    :id="`${group}-section`"
    class="module-card"
    :class="{ 'is-active': active }"
    :href="href"
    @mouseenter="emit('activate', group)"
    @focus="emit('activate', group)"
    @click.prevent="emit('select', group)"
    @mouseleave="emit('clear')"
    @blur="emit('clear')"
  >
    <span>{{ title }}</span>
    <strong>{{ subtitle }}</strong>
    <p>{{ text }}</p>
  </a>
</template>
