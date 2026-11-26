export const ENGINE_MODES = ["vgpu", "webgl", "cpu"] as const;
export type EngineMode = (typeof ENGINE_MODES)[number];

export const DITHER_PATTERNS = [
  "8x8",
  "4x4",
  "2x2",
  "16x16",
  "noise",
  "halftone",
  "crosshatch",
  "clustered",
] as const;
export type DitherPattern = (typeof DITHER_PATTERNS)[number];

export const CPU_ALGORITHMS = [
  "floyd-steinberg",
  "atkinson",
  "sierra3",
  "sierra-lite",
  "burkes",
  "stucki",
  "jarvis",
] as const;
export type CpuAlgorithm = (typeof CPU_ALGORITHMS)[number];

export const COLOR_MODES = ["paper", "duotone", "original", "palette", "grayscale"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const FIT_MODES = ["contain", "cover", "fill"] as const;
export type FitMode = (typeof FIT_MODES)[number];

export const PROCEDURAL_SHAPES = [
  "simplex",
  "warp",
  "dots",
  "waves",
  "ripple",
  "swirl",
  "sphere",
] as const;
export type ProceduralShape = (typeof PROCEDURAL_SHAPES)[number];

export type MediaType = "image" | "video" | "procedural";

/** Everything that defines the *look*. This is what share links carry. */
export interface StyleSettings {
  engine: EngineMode;
  ditherType: DitherPattern;
  cpuAlgorithm: CpuAlgorithm;
  pxSize: number;
  threshold: number;
  halftoneAngle: number;
  halftoneScale: number;
  colorMode: ColorMode;
  colorBack: string;
  colorFront: string;
  colorHighlight: string;
  paletteId: string;
  palette: string[];
  colorSteps: number;
  inverted: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  proceduralShape: ProceduralShape;
  animationSpeed: number;
}

/** How the source is placed on the stage. Never shared. */
export interface FrameSettings {
  fit: FitMode;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}

/** Which media is loaded. */
export interface SourceState {
  mediaType: MediaType;
  mediaUrl: string;
  animated: boolean;
}

/** Flattened settings handed to the engine mounts. */
export type RenderSettings = StyleSettings & FrameSettings & { animated: boolean };
