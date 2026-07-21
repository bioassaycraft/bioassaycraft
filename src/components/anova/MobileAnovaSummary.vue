<script setup>
defineProps({
  copy: {
    type: Object,
    required: true,
  },
  summaryRows: {
    type: Array,
    default: () => [],
  },
  fullRows: {
    type: Array,
    default: () => [],
  },
  fullOpen: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: "summary",
    validator: (value) => ["summary", "full"].includes(value),
  },
  emptyText: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["select-row", "toggle-full"]);
</script>

<template>
  <section
    v-if="variant === 'summary' || (variant === 'full' && fullOpen)"
    class="mobile-anova-cards"
    :class="`is-${variant}`"
    aria-labelledby="mobile-anova-title"
  >
    <div v-if="variant === 'summary'" class="mobile-section-head">
      <h2 id="mobile-anova-title">{{ copy.mobile.anovaSummaryTitle }}</h2>
    </div>
    <div v-if="variant === 'summary' && summaryRows.length" class="mobile-anova-summary">
      <button
        v-for="row in summaryRows"
        :key="`summary-${row.key}`"
        type="button"
        :class="{ 'is-selected': row.isSelected }"
        :aria-pressed="row.isSelected"
        @click="emit('select-row', row.raw)"
      >
        <span class="mobile-summary-label">{{ row.label }}</span>
        <span class="mobile-summary-p-label">{{ copy.pValue }}</span>
        <strong class="mobile-summary-p-value">{{ row.pValue }}</strong>
      </button>
    </div>
    <button
      v-if="variant === 'summary' && fullRows.length"
      type="button"
      class="mobile-anova-toggle"
      @click="emit('toggle-full')"
    >
      {{ fullOpen ? copy.mobile.hideFullAnova : copy.mobile.viewFullAnova }}
    </button>
    <div v-if="variant === 'full' && fullRows.length && fullOpen" class="mobile-card-list">
      <button
        v-for="row in fullRows"
        :key="row.key"
        type="button"
        class="mobile-anova-card"
        :class="{ 'is-selected': row.isSelected }"
        :aria-pressed="row.isSelected"
        @click="emit('select-row', row.raw)"
      >
        <span class="mobile-anova-source">
          <i :style="{ background: row.color }"></i>
          {{ row.label }}
        </span>
        <span>
          {{ copy.ss }}
          <strong>{{ row.ss }}</strong>
        </span>
        <span>
          {{ copy.df }}
          <strong>{{ row.df }}</strong>
        </span>
        <span>
          {{ copy.ms }}
          <strong>{{ row.ms }}</strong>
        </span>
        <span>
          {{ copy.f }}
          <strong>{{ row.f }}</strong>
        </span>
        <span>
          {{ copy.pValue }}
          <strong>{{ row.pValue || "—" }}</strong>
        </span>
      </button>
    </div>
    <div v-else-if="variant === 'summary' && !fullRows.length" class="empty-table">
      {{ emptyText }}
    </div>
  </section>
</template>

<style scoped>
.mobile-anova-cards {
  display: none;
}

@media (max-width: 767px) {
  .mobile-anova-cards {
    display: block;
    margin-top: var(--mobile-section-gap, 7px);
    padding: 12px;
    border: 1px solid var(--mobile-card-border, var(--bc-border-subtle, rgba(0, 0, 0, 0.08)));
    border-radius: 16px;
    background: var(--mobile-card-bg, var(--bc-bg-glass, rgba(255, 255, 255, 0.46)));
  }

  .mobile-section-head {
    margin-bottom: 10px;
  }

  .mobile-section-head h2 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 660;
    line-height: 1.2;
  }

  .mobile-anova-summary {
    display: grid;
    gap: 7px;
  }

  .mobile-anova-summary button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 48px minmax(62px, auto);
    gap: 6px;
    align-items: center;
    width: 100%;
    min-height: 30px;
    padding: 5px 9px;
    color: var(--ink, #171717);
    border: 1px solid var(--bc-border-subtle, rgba(214, 217, 222, 0.54));
    border-radius: 11px;
    background: var(--bc-bg-input, rgba(255, 255, 255, 0.5));
    text-align: left;
  }

  .mobile-anova-summary button.is-selected {
    border-color: var(--bc-accent-border, rgba(49, 95, 186, 0.28));
    background: var(--bc-accent-soft, rgba(79, 127, 211, 0.1));
  }

  .mobile-summary-label {
    min-width: 0;
    font-size: 0.68rem;
    font-weight: 650;
    line-height: 1.22;
  }

  .mobile-summary-p-label {
    color: var(--muted, #6e7278);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.62rem;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    line-height: 1.2;
    text-align: left;
    white-space: nowrap;
  }

  .mobile-summary-p-value {
    color: var(--muted, #6e7278);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    font-weight: 650;
    line-height: 1.2;
    text-align: right;
    white-space: nowrap;
  }

  .mobile-anova-toggle {
    width: 100%;
    min-height: 32px;
    margin-top: 8px;
    border: 1px solid var(--bc-border-strong, rgba(79, 86, 97, 0.22));
    border-radius: 12px;
    background: var(--bc-bg-input, rgba(255, 255, 255, 0.42));
    color: var(--accent, #4f5661);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .mobile-card-list {
    display: grid;
    margin-top: 8px;
    gap: 8px;
  }

  .mobile-anova-card {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    padding: 10px;
    color: var(--ink, #171717);
    text-align: left;
    border: 1px solid var(--bc-border-subtle, rgba(214, 217, 222, 0.6));
    border-radius: 14px;
    background: var(--bc-bg-input, rgba(255, 255, 255, 0.58));
    transition:
      border-color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease;
  }

  .mobile-anova-card.is-selected {
    border-color: var(--bc-accent-border, rgba(49, 95, 186, 0.28));
    background: var(--bc-accent-soft, rgba(79, 127, 211, 0.09));
    box-shadow: var(--bc-shadow-card, 0 12px 28px rgba(23, 23, 23, 0.04));
  }

  .mobile-anova-card span {
    min-width: 0;
    color: var(--muted, #6e7278);
    font-size: 0.66rem;
    line-height: 1.25;
  }

  .mobile-anova-card strong {
    display: block;
    margin-top: 3px;
    overflow-wrap: anywhere;
    color: var(--ink, #171717);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .mobile-anova-source {
    display: flex;
    grid-column: 1 / -1;
    gap: 8px;
    align-items: center;
    color: var(--ink, #171717) !important;
    font-size: 0.76rem !important;
    font-weight: 650;
  }

  .mobile-anova-source i {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }

  .empty-table {
    color: var(--muted, #6e7278);
    font-size: 0.8rem;
    line-height: 1.45;
  }
}
</style>
