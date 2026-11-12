<script setup>
defineProps({
  entry: { type: Object, required: true },
  name: { type: String, default: "" },
  emptyText: { type: String, default: "" },
});
</script>

<template>
  <div class="ta-moa-text">
    <strong v-if="name" class="ta-moa-name" lang="en">{{ name }}</strong>
    <p v-if="entry.mechanismOriginal" lang="en">{{ entry.mechanismOriginal }}</p>
    <p v-if="entry.mechanismZh" class="ta-moa-translation" lang="zh">{{ entry.mechanismZh }}</p>
    <p v-else-if="!entry.mechanismOriginal && emptyText">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.ta-moa-text {
  display: grid;
  gap: var(--ta-language-gap);
  min-width: 0;
  font-size: var(--ta-body-size);
  line-height: var(--ta-body-line);
  overflow-wrap: anywhere;
}
.ta-moa-text p { margin: 0; font-size: inherit; }
.ta-moa-name { font-weight: 600; }
.ta-moa-translation { color: var(--app-muted); }
</style>
