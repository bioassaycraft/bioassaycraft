import { ref } from "vue";

export const LOCALE_STORAGE_KEY = "bioassaycraft.locale";
export const DEFAULT_LOCALE = "zh";

const supportedLocales = new Set(["zh", "en"]);

export const normalizeLocale = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn") return "zh";
  if (normalized === "en" || normalized === "en-us" || normalized === "en-gb") return "en";
  return supportedLocales.has(normalized) ? normalized : null;
};

const readStoredLocale = () => {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY)) || DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

const applyDocumentLocale = (nextLocale) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en";
};

const locale = ref(DEFAULT_LOCALE);
let storageListenerAttached = false;

applyDocumentLocale(locale.value);

export const hydrateStoredLocale = () => {
  locale.value = readStoredLocale();
  applyDocumentLocale(locale.value);
};

export const setLocale = (nextLocale) => {
  const normalized = normalizeLocale(nextLocale) || DEFAULT_LOCALE;
  locale.value = normalized;
  applyDocumentLocale(normalized);

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
};

export const useLocale = () => {
  if (typeof window !== "undefined" && !storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== LOCALE_STORAGE_KEY) return;
      const normalized = normalizeLocale(event.newValue) || DEFAULT_LOCALE;
      locale.value = normalized;
      applyDocumentLocale(normalized);
    });
  }

  return {
    locale,
    setLocale,
  };
};
