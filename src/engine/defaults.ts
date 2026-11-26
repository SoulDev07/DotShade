import type { FrameSettings, SourceState, StyleSettings } from "./types";

/** Fallback colours when a colour string is missing or unparseable. */
export const DEFAULT_COLORS = {
  back: "#000000",
  front: "#ffffff",
  highlight: "#e5e5e5",
} as const;

export const DEFAULT_STYLE: StyleSettings = {
  engine: "vgpu",
  ditherType: "8x8",
  cpuAlgorithm: "floyd-steinberg",
  pxSize: 2,
  threshold: 0.5,
  halftoneAngle: 45,
  halftoneScale: 2,
  colorMode: "original",
  colorBack: DEFAULT_COLORS.back,
  colorFront: DEFAULT_COLORS.front,
  colorHighlight: DEFAULT_COLORS.highlight,
  paletteId: "macintosh-1bit",
  palette: ["#000000", "#ffffff"],
  colorSteps: 4,
  inverted: false,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  proceduralShape: "simplex",
  animationSpeed: 1,
};

export const DEFAULT_FRAME: FrameSettings = {
  fit: "contain",
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_SOURCE: SourceState = {
  mediaType: "image",
  mediaUrl: "/samples/botanical-palm.webp",
  animated: false,
};
