<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  node: {
    type: Object,
    default: null,
  },
  stats: {
    type: Array,
    default: () => [],
  },
  description: {
    type: String,
    required: true,
  },
  correspondingLabel: {
    type: String,
    default: "",
  },
  infoOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-info"]);
</script>

<template>
  <article class="mobile-node-detail" :class="{ 'is-empty': !node }">
    <div class="mobile-detail-title">
      <span v-if="node" class="mobile-detail-dot" :style="{ background: node.color }"></span>
      <strong>{{
        node ? node.mobileDetailLabel || node.mobileLabel : copy.mobile.detailTitle
      }}</strong>
      <button
        v-if="node"
        type="button"
        class="mobile-info-button"
        :class="{ 'is-active': infoOpen }"
        @click="emit('toggle-info')"
      >
        {{ copy.mobile.information }}
      </button>
    </div>
    <p v-if="!node || infoOpen">{{ description }}</p>
    <dl v-if="node" class="mobile-detail-grid">
      <div v-for="item in stats" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
    <p v-if="node" class="mobile-corresponding-row">
      {{ copy.mobile.correspondingRow }}:
      {{ correspondingLabel }}
    </p>
  </article>
</template>

<style scoped>
.mobile-node-detail {
  display: none;
}

@media (max-width: 768px) {
  .mobile-node-detail {
    display: block;
    margin-top: var(--mobile-section-gap, 7px);
    padding: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.62);
    transition:
      background 220ms ease,
      border-color 220ms ease;
  }

  .mobile-node-detail.is-empty {
    background: rgba(255, 255, 255, 0.22);
  }

  .mobile-detail-title {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .mobile-detail-dot {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }

  .mobile-detail-title strong {
    min-width: 0;
    font-size: 0.86rem;
    font-weight: 680;
    line-height: 1.25;
  }

  .mobile-detail-title button {
    height: 24px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted, #6e7278);
    line-height: 1;
  }

  .mobile-info-button {
    width: auto;
    min-width: 54px;
    margin-left: auto;
    padding: 0 9px;
    border: 1px solid rgba(79, 86, 97, 0.18) !important;
    background: rgba(255, 255, 255, 0.44) !important;
    color: var(--accent, #4f5661) !important;
    font-size: 0.62rem;
    font-weight: 700;
  }

  .mobile-info-button.is-active {
    background: rgba(79, 127, 211, 0.12) !important;
    color: #315fba !important;
  }

  .mobile-node-detail p {
    margin: 8px 0 0;
    color: var(--muted, #6e7278);
    font-size: 0.68rem;
    line-height: 1.34;
  }

  .mobile-detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    margin: 8px 0 0;
  }

  .mobile-detail-grid div {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .mobile-detail-grid dt {
    color: var(--muted, #6e7278);
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .mobile-detail-grid dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }

  .mobile-corresponding-row {
    padding-top: 8px;
    border-top: 1px solid var(--soft-line, rgba(214, 217, 222, 0.58));
  }
}
</style>
