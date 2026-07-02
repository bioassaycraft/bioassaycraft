<script setup>
import SiteFooter from "./SiteFooter.vue";
import SiteHeader from "./SiteHeader.vue";

defineProps({
  activeGroup: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["activate-group", "clear-group"]);
</script>

<template>
  <div class="page-shell">
    <SiteHeader
      :active-group="activeGroup"
      @activate-group="emit('activate-group', $event)"
      @clear-group="emit('clear-group')"
    />
    <main class="page-main">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
