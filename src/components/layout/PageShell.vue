<script setup>
import SiteFooter from "./SiteFooter.vue";
import SiteHeader from "./SiteHeader.vue";

</script>

<template>
  <div class="page-shell">
    <SiteHeader />
    <main class="page-main">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
