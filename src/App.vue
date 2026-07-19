<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import PageShell from "./components/layout/PageShell.vue";
import { usePageSeo } from "./composables/usePageSeo";
import { hydrateStoredLocale } from "./utils/locale";

const activeGroup = ref(null);
const route = useRoute();
const routePath = computed(() => route.path);
usePageSeo(routePath);

onMounted(hydrateStoredLocale);

const activateGroup = (group) => {
  activeGroup.value = group;
};

const clearGroup = () => {
  activeGroup.value = null;
};
</script>

<template>
  <RouterView v-slot="{ Component }">
    <PageShell
      v-if="route.path === '/'"
      :active-group="activeGroup"
      @activate-group="activateGroup"
      @clear-group="clearGroup"
    >
      <component :is="Component" @activate-group="activateGroup" @clear-group="clearGroup" />
    </PageShell>
    <component :is="Component" v-else />
  </RouterView>
</template>
