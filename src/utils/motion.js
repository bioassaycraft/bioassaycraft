import { animate } from "motion";

export const motionDurations = {
  instant: 0.08,
  hover: 0.16,
  state: 0.22,
  panel: 0.26,
  page: 0.32,
  number: 0.38,
};

export const motionEasings = {
  standard: [0.22, 1, 0.36, 1],
  gentle: [0.25, 0.1, 0.25, 1],
  exit: [0.4, 0, 1, 1],
};

export const hoverTransition = {
  duration: motionDurations.hover,
  easing: motionEasings.standard,
};

export const pageEnterTransition = {
  duration: motionDurations.page,
  easing: motionEasings.standard,
};

export const panelTransition = {
  duration: motionDurations.panel,
  easing: motionEasings.standard,
};

export const numberChangeTransition = {
  duration: motionDurations.number,
  easing: motionEasings.gentle,
};

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function resolveMotionTransition(transition = panelTransition) {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }

  return transition;
}

export function animateElement(element, keyframes, transition = panelTransition) {
  if (!element || prefersReducedMotion()) {
    return null;
  }

  return animate(element, keyframes, resolveMotionTransition(transition));
}

export function getPanelEnterKeyframes(distance = 6) {
  return {
    opacity: [0, 1],
    transform: [`translateY(${distance}px)`, "translateY(0px)"],
  };
}

export function getNumberChangeKeyframes() {
  return {
    opacity: [0.62, 1],
    transform: ["translateY(2px)", "translateY(0px)"],
  };
}

export const motionGuidance = {
  intent:
    "Use motion to clarify state changes, not to decorate. Prefer opacity, small translation, and subtle numeric emphasis.",
  avoid:
    "Avoid bounce, rotation, large scale, parallax, and animation that competes with scientific content.",
};
