<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  titleId: {
    type: String,
    required: true,
  },
  comingSoonLabel: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <section class="specification-card" :aria-labelledby="titleId">
    <div class="specification-card-inner">
      <h2 :id="titleId">{{ title }}</h2>
      <p>{{ comingSoonLabel }}</p>
    </div>
  </section>
</template>

<style scoped>
.specification-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--soft-line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: var(--card-shadow);
}

.specification-card-inner {
  display: grid;
  gap: 12px;
  min-height: 260px;
  align-content: start;
  padding-top: 2px;
}

.specification-card h2 {
  margin: 0;
  color: var(--ink);
  font-size: 0.96rem;
  font-weight: 600;
  line-height: 1.22;
}

.specification-card p {
  margin: 0;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.35;
}

@media (max-width: 767px) {
  .specification-card {
    padding: 12px;
    border-radius: var(--mobile-card-radius, 16px);
    background: var(--mobile-card-bg, var(--bc-bg-glass));
    box-shadow: var(--mobile-card-shadow, var(--bc-shadow-card));
  }

  .specification-card-inner {
    min-height: 180px;
    gap: 10px;
  }

  .specification-card h2 {
    font-size: 0.9rem;
    font-weight: 660;
  }

  .specification-card p {
    font-size: 0.7rem;
  }
}
</style>
