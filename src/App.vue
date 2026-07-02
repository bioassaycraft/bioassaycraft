<script setup>
import { ref } from "vue";
import PageShell from "./components/layout/PageShell.vue";
import Home from "./pages/Home.vue";

const activeGroup = ref(null);

const activateGroup = (group) => {
  activeGroup.value = group;
};

const clearGroup = () => {
  activeGroup.value = null;
};
</script>

<template>
  <PageShell :active-group="activeGroup" @activate-group="activateGroup" @clear-group="clearGroup">
    <Home :active-group="activeGroup" @activate-group="activateGroup" @clear-group="clearGroup" />
  </PageShell>
</template>
