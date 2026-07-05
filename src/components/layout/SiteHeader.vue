<script setup>
defineProps({
  activeGroup: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["activate-group", "clear-group"]);

const navItems = [
  { id: "learn", label: "Learn", href: "#learn" },
  { id: "journey", label: "Journey", href: "#journey" },
  { id: "tools", label: "Tools", href: "#tools" },
];
</script>

<template>
  <header class="site-header">
    <a class="brand-link" href="/" aria-label="BioassayCraft home">
      <img class="brand-mark" src="/assets/brand/logo.svg" alt="" aria-hidden="true" />
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
