<script setup>
import MobileToolHeader from "../common/MobileToolHeader.vue";

defineProps({
  copy: {
    type: Object,
    required: true,
  },
  activeModule: {
    type: String,
    required: true,
  },
  moduleOrder: {
    type: Array,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["set-module", "set-language"]);
</script>

<template>
  <MobileToolHeader
    class="mobile-top-controls"
    :aria-label="copy.mobile.controlsLabel"
    :selector-label="copy.modulesLabel"
    :options="
      moduleOrder.map((module) => ({ value: module, label: copy.mobile.modulesShort[module] }))
    "
    :selected-value="activeModule"
    :language="language"
    :language-label="copy.languageLabel"
    :home-label="copy.home"
    @select="emit('set-module', $event)"
    @set-language="emit('set-language', $event)"
  />
</template>
