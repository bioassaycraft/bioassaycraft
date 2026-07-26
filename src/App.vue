<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import PageShell from "./components/layout/PageShell.vue";
import { usePageSeo } from "./composables/usePageSeo";
import { hydrateStoredLocale } from "./utils/locale";

const route = useRoute();
const routePath = computed(() => route.path);
usePageSeo(routePath);

onMounted(hydrateStoredLocale);

</script>

<template>
  <RouterView v-slot="{ Component }">
    <PageShell v-if="route.path === '/'">
      <component :is="Component" />
    </PageShell>
    <component :is="Component" v-else />
  </RouterView>
</template>
