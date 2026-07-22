<script setup>
defineProps({
  title: { type: String, required: true },
});
</script>

<template>
  <div class="mobile-page-title" :title="title">
    <span>{{ title }}</span>
  </div>
</template>

<style>
.mobile-page-title {
  display: none;
}

@media (max-width: 767px) {
  .mobile-page-title {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    width: 100%;
    height: 36px;
    min-height: 36px;
    overflow: hidden;
    /* Match the canvas behind the title so it remains one continuous surface
       below the mobile control bar in both colour schemes. */
    background: transparent;
    color: var(--ink, #171717);
    opacity: var(--mobile-page-title-opacity, 1);
    transform: translateY(var(--mobile-page-title-translate, 0px));
  }

  .mobile-page-title > span {
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  html.mobile-header-condensed .mobile-page-title {
    height: 0;
    min-height: 0;
    opacity: 0;
    transform: translateY(-8px);
    transition: height 220ms cubic-bezier(0.22, 1, 0.36, 1), min-height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .mobile-page-title {
    background: var(--bc-bg-page, #fff);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  html.mobile-header-condensed .mobile-page-title { transition: none; }
}
</style>
