/** Device pixel ratio capped at 2: higher ratios multiply GPU work for no visible gain. */
export function getPixelRatio(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}
