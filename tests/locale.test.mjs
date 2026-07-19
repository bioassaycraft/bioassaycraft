import { afterEach, describe, expect, it, vi } from "vitest";

const modulePath = "../src/utils/locale.js";

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => (values.has(key) ? values.get(key) : null)),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
  };
};

const importFreshLocale = async ({ storedLocale } = {}) => {
  vi.resetModules();

  const localStorage = createStorage(
    storedLocale === undefined ? {} : { "bioassaycraft.locale": storedLocale },
  );
  vi.stubGlobal("window", {
    localStorage,
    addEventListener: vi.fn(),
  });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({
      content: {
        firstChild: null,
      },
    })),
    documentElement: {
      lang: "",
    },
  });
  vi.stubGlobal("navigator", {
    language: "en-US",
  });

  const localeModule = await import(`${modulePath}?case=${Math.random()}`);
  return { localeModule, localStorage };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shared locale state", () => {
  it("defaults to Chinese without using browser language", async () => {
    const { localeModule } = await importFreshLocale();

    expect(localeModule.DEFAULT_LOCALE).toBe("zh");
    expect(localeModule.useLocale().locale.value).toBe("zh");
    expect(global.document.documentElement.lang).toBe("zh-CN");
  });

  it("restores a stored user locale after hydration", async () => {
    const { localeModule } = await importFreshLocale({ storedLocale: "en" });

    expect(localeModule.useLocale().locale.value).toBe("zh");
    localeModule.hydrateStoredLocale();
    expect(localeModule.useLocale().locale.value).toBe("en");
    expect(global.document.documentElement.lang).toBe("en");
  });

  it("persists changes to the shared storage key", async () => {
    const { localeModule, localStorage } = await importFreshLocale();

    localeModule.setLocale("en");

    expect(localeModule.useLocale().locale.value).toBe("en");
    expect(localStorage.setItem).toHaveBeenCalledWith("bioassaycraft.locale", "en");
    expect(global.document.documentElement.lang).toBe("en");
  });

  it("falls back to Chinese for invalid stored values", async () => {
    const { localeModule } = await importFreshLocale({ storedLocale: "fr" });

    expect(localeModule.useLocale().locale.value).toBe("zh");
    expect(global.document.documentElement.lang).toBe("zh-CN");
  });
});
