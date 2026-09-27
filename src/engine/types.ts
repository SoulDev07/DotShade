export type EngineMode = "vgpu" | "webgl" | "cpu";

export type DitherPattern =
  | "8x8"
  | "4x4"
  | "2x2"
  | "16x16"
  | "noise"
  | "halftone"
  | "crosshatch"
  | "clustered";

export type CpuAlgorithm =
  | "floyd-steinberg"
  | "atkinson"
  | "sierra3"
  | "sierra-lite"
  | "burkes"
  | "stucki"
  | "jarvis";

export type ColorMode = "paper" | "duotone" | "original" | "palette" | "grayscale";
export type FitMode = "contain" | "cover" | "fill";
export type ProceduralShape = "simplex" | "warp" | "dots" | "waves" | "ripple" | "swirl" | "sphere";
export type MediaType = "image" | "video" | "webcam" | "procedural";

export interface DitherSettings {
  engine: EngineMode;
  mediaType: MediaType;
  mediaUrl: string;
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
  fit: FitMode;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  proceduralShape: ProceduralShape;
  animated: boolean;
  animationSpeed: number;
}
