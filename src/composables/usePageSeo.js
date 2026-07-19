import { useHead } from "@unhead/vue";
import { computed, unref } from "vue";
import { defaultSeoPage, getCanonicalUrl, getSeoPage } from "../config/seo";

export const usePageSeo = (path) => {
  const page = computed(() => getSeoPage(unref(path)) || defaultSeoPage);

  useHead(() => ({
    title: page.value.title,
    meta: [
      { name: "description", content: page.value.description },
      { name: "robots", content: page.value.index ? "index, follow" : "noindex, nofollow" },
      { property: "og:title", content: page.value.title },
      { property: "og:description", content: page.value.description },
      { property: "og:url", content: getCanonicalUrl(page.value.path) },
      { property: "og:type", content: page.value.type },
    ],
    link: [{ rel: "canonical", href: getCanonicalUrl(page.value.path) }],
  }));

  return page;
};
