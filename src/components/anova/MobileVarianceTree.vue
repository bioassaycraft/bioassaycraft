<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  rows: {
    type: Array,
    required: true,
  },
  activeIds: {
    type: Array,
    required: true,
  },
  selectedNodeId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["select-node"]);

const segmentIsActive = (segment, activeIds) => activeIds.includes(segment.id);
</script>

<template>
  <section class="mobile-variance-panel" aria-labelledby="mobile-variance-title">
    <div class="mobile-section-head">
      <h2 id="mobile-variance-title">{{ copy.mobile.varianceTitle }}</h2>
    </div>

    <div class="mobile-ss-stack">
      <article v-for="row in rows" :key="row.rowId" class="mobile-ss-row">
        <h3>{{ row.mobileTitle }}</h3>
        <div class="mobile-ss-bar" role="list">
          <button
            v-for="segment in row.segments"
            :key="`${row.rowId}-${segment.id}`"
            type="button"
            class="mobile-ss-segment"
            :class="{
              'is-active': segmentIsActive(segment, activeIds),
              'is-selected': selectedNodeId === segment.id,
            }"
            :style="{
              '--segment-color': segment.color,
              '--segment-width': `${segment.visualFlex * 100}%`,
            }"
            role="listitem"
            @click="emit('select-node', segment)"
          >
            <span>{{ segment.mobileLabel }}</span>
            <small>{{ segment.percent.toFixed(1) }}%</small>
          </button>
        </div>
      </article>
    </div>

    <p class="mobile-ss-note">{{ copy.mobile.mobileTeachingWidthNote }}</p>
  </section>
</template>

<style scoped>
.mobile-variance-panel {
  display: none;
}

@media (max-width: 768px) {
  .mobile-variance-panel {
    display: block;
    margin-top: 0;
    overflow: hidden;
    padding: 12px;
    border: 1px solid var(--mobile-card-border, var(--bc-border-subtle, rgba(0, 0, 0, 0.08)));
    border-radius: 16px;
    background: var(--mobile-card-bg, var(--bc-bg-glass, rgba(255, 255, 255, 0.54)));
    box-shadow: var(--mobile-shadow, var(--bc-shadow-card, 0 8px 22px rgba(23, 23, 23, 0.024)));
  }

  .mobile-section-head {
    margin-bottom: var(--mobile-section-gap, 7px);
  }

  .mobile-section-head h2 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 660;
    line-height: 1.22;
  }

  .mobile-ss-stack {
    display: grid;
    gap: var(--mobile-section-gap, 7px);
  }

  .mobile-ss-row {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .mobile-ss-row h3 {
    margin: 0;
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .mobile-ss-bar {
    display: flex;
    gap: 0;
    min-width: 0;
    overflow: hidden;
    border-radius: 11px;
  }

  .mobile-ss-segment {
    display: grid;
    flex: 0 0 var(--segment-width, auto);
    width: var(--segment-width, auto);
    max-width: var(--segment-width, none);
    min-width: 0;
    min-height: 40px;
    padding: 4px 1px;
    place-items: center;
    color: color-mix(in srgb, var(--segment-color) 62%, var(--bc-text-primary, #172033) 38%);
    text-align: center;
    border: 1px solid color-mix(in srgb, var(--segment-color) 25%, transparent);
    border-radius: 0;
    background: color-mix(in srgb, var(--segment-color) 12%, var(--bc-bg-surface-solid, white) 88%);
    box-shadow: var(--bc-shadow-card, 0 6px 14px rgba(23, 23, 23, 0.02));
    transition:
      background 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .mobile-ss-segment:first-child {
    border-top-left-radius: 11px;
    border-bottom-left-radius: 11px;
  }

  .mobile-ss-segment:last-child {
    border-top-right-radius: 11px;
    border-bottom-right-radius: 11px;
  }

  .mobile-ss-segment span {
    max-width: 100%;
    overflow: visible;
    font-size: 0.56rem;
    font-weight: 700;
    line-height: 1.12;
    overflow-wrap: normal;
    white-space: nowrap;
    word-break: keep-all;
  }

  .mobile-ss-segment small {
    color: color-mix(in srgb, var(--segment-color) 50%, var(--bc-text-secondary, #4f5661) 50%);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.5rem;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1.1;
  }

  .mobile-ss-segment.is-active,
  .mobile-ss-segment.is-selected {
    border-color: color-mix(in srgb, var(--segment-color) 46%, transparent);
    background: color-mix(in srgb, var(--segment-color) 18%, var(--bc-bg-surface-solid, white) 82%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--bc-bg-surface-solid, white) 55%, transparent),
      var(--bc-shadow-card, 0 8px 18px rgba(23, 23, 23, 0.04));
  }

  .mobile-ss-segment.is-selected {
    transform: translateY(-1px);
  }

  .mobile-ss-note {
    margin: var(--mobile-section-gap, 7px) 0 0;
    color: var(--muted, #6e7278);
    font-size: 0.62rem;
    line-height: 1.25;
    white-space: nowrap;
  }
}
</style>
