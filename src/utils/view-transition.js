import { nextTick } from "vue";

const canUseViewTransition = () =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let transitionInProgress = false;

export async function navigateWithViewTransition(router, to) {
  if (!canUseViewTransition() || transitionInProgress) return router.push(to);

  transitionInProgress = true;
  let navigationStarted = false;

  try {
    const transition = document.startViewTransition(async () => {
      navigationStarted = true;
      await router.push(to);
      await nextTick();
    });
    await transition.finished;
  } catch {
    if (!navigationStarted) return router.push(to);
  } finally {
    transitionInProgress = false;
  }
}
