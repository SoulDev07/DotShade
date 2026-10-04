/**
 * Execution engine mode:
 *  - "vgpu": Modern WebGPU acceleration via vgpu
 *  - "webgl": High-performance WebGL2 shader pipeline (broad compatibility)
 *  - "cpu": Multi-pass error-diffusion dithering on CPU ImageData
 */
export type EngineMode = "vgpu" | "webgl" | "cpu";

/**
 * Ordered dithering and spatial screening patterns evaluated in fragment shaders:
 *  - "8x8", "4x4", "2x2", "16x16": Bayer ordered threshold matrices
 *  - "noise": High-frequency white noise random dither
 *  - "halftone": Rotatable CMYK-style dot-screen raster
 *  - "crosshatch": Diagonal line etching
 *  - "clustered": Clustered-dot newsprint matrix
 */
export type DitherPattern =
  | "8x8"
  | "4x4"
  | "2x2"
  | "16x16"
  | "noise"
  | "halftone"
  | "crosshatch"
  | "clustered";

/**
 * Classic spatial error-diffusion algorithms for CPU image processing:
 *  - "floyd-steinberg": Standard 1976 4-neighbor error distribution
 *  - "atkinson": MacPaint 6-neighbor 3/4 error diffusion (high contrast)
 *  - "sierra3": 3-line Sierra error diffusion
 *  - "sierra-lite": Lightweight 2-line Sierra algorithm
 *  - "burkes": Burkes error distribution with 7 neighbors
 *  - "stucki": Stucki 3-line filter preserving crisp edges
 *  - "jarvis": Jarvis-Judice-Ninke 12-neighbor smoothing matrix
 */
export type CpuAlgorithm =
  | "floyd-steinberg"
  | "atkinson"
  | "sierra3"
  | "sierra-lite"
  | "burkes"
  | "stucki"
  | "jarvis";

/**
 * Color mapping strategy applied after dither thresholding:
 *  - "paper": 3-tone retro print ramp (Background / Foreground / Highlight)
 *  - "duotone": 2-tone gradient ramp (Background to Foreground)
 *  - "original": Preserves input colors quantized to discrete steps
 *  - "palette": Nearest-neighbor quantization against an arbitrary palette
 *  - "grayscale": Single-channel luminance output
 */
export type ColorMode = "paper" | "duotone" | "original" | "palette" | "grayscale";

/**
 * Coordinate mapping strategy for media within canvas boundaries.
 */
export type FitMode = "contain" | "cover" | "fill";

/**
 * Procedural generative patterns synthesized in real-time GLSL/WGSL shaders.
 */
export type ProceduralShape = "simplex" | "warp" | "dots" | "waves" | "ripple" | "swirl" | "sphere";

/**
 * Source media types supported by the rendering pipeline.
 */
export type MediaType = "image" | "video" | "webcam" | "procedural";

/**
 * Global reactive configuration state for dithering and canvas rendering.
 */
export interface DitherSettings {
  /** Target rendering hardware backend */
  engine: EngineMode;
  /** Active media input type */
  mediaType: MediaType;
  /** Data URL or object URL of current image or video */
  mediaUrl: string;
  /** Active ordered dithering pattern (GPU) */
  ditherType: DitherPattern;
  /** Active spatial error diffusion algorithm (CPU) */
  cpuAlgorithm: CpuAlgorithm;
  /** Size of each pixel dither block (e.g. 1 = 1:1, 4 = chunky pixels) */
  pxSize: number;
  /** Luminance threshold bias [0..1] */
  threshold: number;
  /** Halftone screen rotation angle in degrees [0..360] */
  halftoneAngle: number;
  /** Halftone dot frequency scale */
  halftoneScale: number;
  /** Color quantization and mapping mode */
  colorMode: ColorMode;
  /** Background / shadow color hex */
  colorBack: string;
  /** Foreground / midtone color hex */
  colorFront: string;
  /** Accent / highlight color hex (used in paper mode) */
  colorHighlight: string;
  /** Active palette identifier string */
  paletteId: string;
  /** Array of hex colors for multi-color palette mode */
  palette: string[];
  /** Number of discrete color quantization steps per RGB channel */
  colorSteps: number;
  /** Invert output luminance */
  inverted: boolean;
  /** Image aspect ratio fitting mode */
  fit: FitMode;
  /** Scale multiplier [0.1..5] */
  scale: number;
  /** Rotation angle in degrees [0..360] */
  rotation: number;
  /** Horizontal canvas translation offset [-1..1] */
  offsetX: number;
  /** Vertical canvas translation offset [-1..1] */
  offsetY: number;
  /** Image brightness adjustment [-1..1] */
  brightness: number;
  /** Image contrast multiplier [0..3] */
  contrast: number;
  /** Color saturation multiplier [0..3] */
  saturation: number;
  /** Gamma power curve adjustment [0.2..3] */
  gamma: number;
  /** Active procedural generative texture generator */
  proceduralShape: ProceduralShape;
  /** Whether the procedural animation or video playback is active */
  animated: boolean;
  /** Time scale multiplier for procedural movement */
  animationSpeed: number;
}
