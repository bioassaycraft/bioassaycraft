<script setup>
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/vue";
import { computed, nextTick, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    default: "top",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  openDelay: {
    type: Number,
    default: 120,
  },
});

const isOpen = ref(false);
const reference = ref(null);
const floating = ref(null);
let openTimer = null;

const tooltipId = `bc-tooltip-${Math.random().toString(36).slice(2, 10)}`;

const { floatingStyles, update } = useFloating(reference, floating, {
  placement: computed(() => props.placement),
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip(), shift({ padding: 12 })],
});

function clearOpenTimer() {
  if (openTimer) {
    window.clearTimeout(openTimer);
    openTimer = null;
  }
}

function open() {
  if (props.disabled) return;
  clearOpenTimer();
  openTimer = window.setTimeout(async () => {
    isOpen.value = true;
    await nextTick();
    update?.();
  }, props.openDelay);
}

function close() {
  clearOpenTimer();
  isOpen.value = false;
}

function toggle() {
  if (props.disabled) return;
  isOpen.value ? close() : open();
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    close();
  }
}

onBeforeUnmount(clearOpenTimer);
</script>

<template>
  <span
    ref="reference"
    class="bc-tooltip-trigger"
    tabindex="0"
    :aria-describedby="isOpen ? tooltipId : undefined"
    @pointerenter="open"
    @pointerleave="close"
    @focus="open"
    @blur="close"
    @click="toggle"
    @keydown="handleKeydown"
  >
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="isOpen && !disabled"
      :id="tooltipId"
      ref="floating"
      class="bc-tooltip"
      role="tooltip"
      :style="floatingStyles"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<style scoped>
.bc-tooltip-trigger {
  display: inline-flex;
  align-items: baseline;
  outline: none;
}

.bc-tooltip-trigger:focus-visible {
  border-radius: 4px;
  box-shadow: 0 0 0 3px var(--bc-focus-ring, rgba(36, 86, 179, 0.14));
}

.bc-tooltip {
  z-index: 100;
  max-width: min(280px, calc(100vw - 32px));
  padding: 7px 9px;
  color: var(--bc-text-primary, #171717);
  background: var(--bc-bg-surface-elevated, #ffffff);
  border: 1px solid var(--bc-border-subtle, rgba(208, 215, 222, 0.72));
  border-radius: 7px;
  box-shadow: var(--bc-shadow-card-strong, 0 12px 28px rgba(20, 25, 32, 0.08));
  font-size: 0.72rem;
  line-height: 1.42;
  backdrop-filter: blur(12px);
}
</style>
