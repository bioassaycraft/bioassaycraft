<script setup>
import { usePageSeo } from "../composables/usePageSeo";

usePageSeo("/404.html");
</script>

<template>
  <main class="not-found-page">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p>The requested BioassayCraft page could not be found.</p>
    <a href="/">Return home</a>
  </main>
</template>

<style scoped>
.not-found-page {
  display: grid;
  place-content: center;
  min-height: 100svh;
  gap: 0.8rem;
  padding: 2rem;
  color: var(--app-text);
  background: var(--app-bg);
}
</style>
