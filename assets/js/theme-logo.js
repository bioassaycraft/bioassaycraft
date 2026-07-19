(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const darkLogo = "/assets/brand/logo-dark.svg";
  const lightLogo = "/assets/brand/logo-light.svg";
  const logoSelector =
    "img[data-theme-logo], img[src$='/assets/brand/logo.svg'], img[src$='/assets/brand/logo-dark.svg'], img[src$='/assets/brand/logo-light.svg']";
  const darkModeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

  const parseColor = (value) => {
    const color = value.trim().toLowerCase();
    const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

    if (hex) {
      const raw = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
      return {
        r: Number.parseInt(raw.slice(0, 2), 16),
        g: Number.parseInt(raw.slice(2, 4), 16),
        b: Number.parseInt(raw.slice(4, 6), 16),
      };
    }

    const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return null;

    return {
      r: Number.parseInt(rgb[1], 10),
      g: Number.parseInt(rgb[2], 10),
      b: Number.parseInt(rgb[3], 10),
    };
  };

  const relativeLuminance = ({ r, g, b }) => {
    const channel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const themeFromPageColor = () => {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = document.body ? window.getComputedStyle(document.body) : null;
    const color =
      rootStyle.getPropertyValue("--bc-bg-page") ||
      rootStyle.getPropertyValue("--bc-bg") ||
      bodyStyle?.backgroundColor ||
      "";
    const parsed = parseColor(color);

    if (!parsed) return "";
    return relativeLuminance(parsed) < 0.45 ? "dark" : "light";
  };

  const currentTheme = () => themeFromPageColor() || (darkModeQuery?.matches ? "dark" : "light");

  const updateLogos = (root = document) => {
    const theme = currentTheme();
    const logo = theme === "dark" ? lightLogo : darkLogo;

    root.querySelectorAll?.(logoSelector).forEach((image) => {
      if (image.getAttribute("src") !== logo) {
        image.setAttribute("src", logo);
      }
      image.dataset.themeLogo = theme;
    });
  };

  const scheduleUpdate = () => window.requestAnimationFrame(() => updateLogos());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => updateLogos(), { once: true });
  } else {
    updateLogos();
  }

  if (darkModeQuery?.addEventListener) {
    darkModeQuery.addEventListener("change", scheduleUpdate);
  } else {
    darkModeQuery?.addListener?.(scheduleUpdate);
  }

  const themeAttributeObserver = new MutationObserver(scheduleUpdate);
  const observeThemeAttributes = (element) => {
    themeAttributeObserver.observe(element, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-color-scheme", "data-bs-theme"],
    });
  };

  observeThemeAttributes(document.documentElement);

  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length)) {
      scheduleUpdate();
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.body) {
    observeThemeAttributes(document.body);
  } else {
    document.addEventListener("DOMContentLoaded", () => observeThemeAttributes(document.body), {
      once: true,
    });
  }
})();
