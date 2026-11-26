import { DEFAULT_FRAME, DEFAULT_STYLE } from "./defaults";

export interface SettingRange {
  min: number;
  max: number;
  step: number;
  default: number;
}

const range = (min: number, max: number, step: number, def: number): SettingRange => ({
  min,
  max,
  step,
  default: def,
});

/** Single source of truth for every numeric setting (sliders, codec clamping, reset). */
export const SETTING_RANGES = {
  pxSize: range(0.5, 16, 0.5, DEFAULT_STYLE.pxSize),
  threshold: range(0, 1, 0.02, DEFAULT_STYLE.threshold),
  halftoneAngle: range(0, 90, 5, DEFAULT_STYLE.halftoneAngle),
  halftoneScale: range(1, 8, 0.5, DEFAULT_STYLE.halftoneScale),
  colorSteps: range(1, 16, 1, DEFAULT_STYLE.colorSteps),
  brightness: range(-0.5, 0.5, 0.02, DEFAULT_STYLE.brightness),
  contrast: range(0.2, 2.5, 0.05, DEFAULT_STYLE.contrast),
  saturation: range(0, 2, 0.05, DEFAULT_STYLE.saturation),
  gamma: range(0.5, 2.5, 0.05, DEFAULT_STYLE.gamma),
  animationSpeed: range(0, 5, 0.1, DEFAULT_STYLE.animationSpeed),
  scale: range(0.2, 3, 0.05, DEFAULT_FRAME.scale),
  rotation: range(0, 360, 5, DEFAULT_FRAME.rotation),
  offsetX: range(-1, 1, 0.01, DEFAULT_FRAME.offsetX),
  offsetY: range(-1, 1, 0.01, DEFAULT_FRAME.offsetY),
} as const satisfies Record<string, SettingRange>;

export type RangedSetting = keyof typeof SETTING_RANGES;

export function clampToRange(key: RangedSetting, value: number): number {
  const r = SETTING_RANGES[key];
  return Math.min(r.max, Math.max(r.min, value));
}
