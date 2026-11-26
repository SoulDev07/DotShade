import { DEFAULT_COLORS } from "./defaults";
import { PALETTE_MAP } from "./palettes";
import type { StyleSettings } from "./types";

export interface SampleMedia {
  id: string;
  name: string;
  type: "image";
  url: string;
}

export const SAMPLE_MEDIA: SampleMedia[] = [
  {
    id: "botanical-palm",
    name: "Botanical Palm",
    type: "image",
    url: "/samples/botanical-palm.webp",
  },
  { id: "cyber-tokyo", name: "Cyber Tokyo", type: "image", url: "/samples/cyber-tokyo.webp" },
  {
    id: "vintage-portrait",
    name: "Vintage Portrait",
    type: "image",
    url: "/samples/vintage-portrait.webp",
  },
  { id: "paper-flowers", name: "Paper Flowers", type: "image", url: "/samples/paper-flowers.webp" },
  { id: "anime-skyline", name: "Anime Skyline", type: "image", url: "/samples/anime-skyline.webp" },
];

export type PresetCategory = "retro" | "terminal" | "print" | "mono" | "stylized";

export const PRESET_CATEGORIES: { id: "all" | PresetCategory; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "mono", label: "1-BIT" },
  { id: "print", label: "PRINT" },
  { id: "retro", label: "RETRO" },
  { id: "terminal", label: "CRT" },
  { id: "stylized", label: "STYLE" },
];

export interface Preset {
  id: string;
  name: string;
  desc: string;
  category: PresetCategory;
  /** Hardware palette; its colours come from PALETTE_MAP (never duplicated here). */
  paletteId?: string;
  /** Overrides applied on top of DEFAULT_STYLE. */
  style: Partial<StyleSettings>;
}

export const PRESETS: Preset[] = [
  {
    id: "macintosh-1bit",
    name: "Macintosh 1-Bit",
    desc: "1984 original Macintosh pure black & white",
    category: "mono",
    paletteId: "macintosh-1bit",
    style: {
      engine: "vgpu",
      ditherType: "8x8",
      colorMode: "paper",
      colorBack: "#000000",
      colorFront: "#ffffff",
      colorHighlight: "#ffffff",
      pxSize: 2,
      threshold: 0.5,
    },
  },
  {
    id: "floyd-steinberg",
    name: "Floyd-Steinberg",
    desc: "1976 classic newsprint error diffusion",
    category: "mono",
    style: {
      engine: "cpu",
      cpuAlgorithm: "floyd-steinberg",
      colorMode: "grayscale",
      pxSize: 1,
      threshold: 0.5,
      inverted: false,
    },
  },
  {
    id: "atkinson",
    name: "1-Bit Atkinson",
    desc: "1984 Bill Atkinson HyperCard diffusion",
    category: "mono",
    style: {
      engine: "cpu",
      cpuAlgorithm: "atkinson",
      colorMode: "grayscale",
      pxSize: 1,
      threshold: 0.5,
      inverted: false,
    },
  },
  {
    id: "newspaper-halftone",
    name: "Newspaper Halftone",
    desc: "45° ink dot halftone press screen",
    category: "print",
    style: {
      engine: "vgpu",
      ditherType: "halftone",
      halftoneAngle: 45,
      halftoneScale: 2.5,
      pxSize: 1.5,
      colorMode: "duotone",
      colorBack: "#ffffff",
      colorFront: "#000000",
    },
  },
  {
    id: "gameboy-pocket",
    name: "Game Boy Pocket",
    desc: "1996 authentic silver-gray LCD",
    category: "retro",
    paletteId: "gameboy-pocket",
    style: { engine: "vgpu", ditherType: "8x8", colorMode: "palette", pxSize: 2.5, threshold: 0.5 },
  },
  {
    id: "paper-mint",
    name: "Paper Mint",
    desc: "Navy & lime mint 8x8 ramp",
    category: "print",
    style: {
      engine: "vgpu",
      ditherType: "8x8",
      colorMode: "paper",
      colorBack: "#000c38",
      colorFront: "#94ffaf",
      colorHighlight: "#eaff94",
      pxSize: 2,
      colorSteps: 2,
      threshold: 0.5,
    },
  },
  {
    id: "gameboy-dmg",
    name: "Game Boy DMG",
    desc: "1989 Nintendo 4-tone olive LCD",
    category: "retro",
    paletteId: "gameboy-dmg",
    style: { engine: "vgpu", ditherType: "8x8", colorMode: "palette", pxSize: 2.5, threshold: 0.5 },
  },
  {
    id: "cga-mode1",
    name: "CGA Mode 1",
    desc: "1981 IBM PC cyan & magenta",
    category: "retro",
    paletteId: "cga-mode1",
    style: { engine: "vgpu", ditherType: "4x4", colorMode: "palette", pxSize: 2.5, threshold: 0.5 },
  },
  {
    id: "matrix-phosphor",
    name: "Matrix Phosphor",
    desc: "VT100 green CRT terminal glow",
    category: "terminal",
    paletteId: "crt-green",
    style: { engine: "vgpu", ditherType: "8x8", colorMode: "palette", pxSize: 2, threshold: 0.52 },
  },
  {
    id: "amber-terminal",
    name: "Amber Terminal",
    desc: "Warm P3 amber CRT phosphor",
    category: "terminal",
    paletteId: "amber-terminal",
    style: { engine: "vgpu", ditherType: "8x8", colorMode: "palette", pxSize: 2, threshold: 0.5 },
  },
  {
    id: "pico-8",
    name: "PICO-8 Fantasy",
    desc: "16-color fantasy console matrix",
    category: "retro",
    paletteId: "pico-8",
    style: { engine: "vgpu", ditherType: "4x4", colorMode: "palette", pxSize: 2, threshold: 0.5 },
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    desc: "Magenta & cyan 4x4 matrix",
    category: "stylized",
    paletteId: "cyberpunk-neon",
    style: { engine: "vgpu", ditherType: "4x4", colorMode: "palette", pxSize: 2, threshold: 0.48 },
  },
  {
    id: "commodore-64",
    name: "Commodore 64",
    desc: "1982 C64 microcomputer 16-color",
    category: "retro",
    paletteId: "commodore-64",
    style: { engine: "vgpu", ditherType: "8x8", colorMode: "palette", pxSize: 2.5, threshold: 0.5 },
  },
  {
    id: "manga-screentone",
    name: "Manga Screentone",
    desc: "60° dense Japanese screentone",
    category: "print",
    style: {
      engine: "vgpu",
      ditherType: "halftone",
      halftoneAngle: 60,
      halftoneScale: 1.8,
      pxSize: 1,
      colorMode: "duotone",
      colorBack: "#f4f3ef",
      colorFront: "#111113",
    },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    desc: "Cyanotype architectural print",
    category: "print",
    style: {
      engine: "vgpu",
      ditherType: "crosshatch",
      colorMode: "duotone",
      colorBack: "#002b5c",
      colorFront: "#76d7ea",
      pxSize: 2,
      threshold: 0.52,
    },
  },
  {
    id: "vintage-sepia",
    name: "Vintage Sepia",
    desc: "Antique 19th-century albumen photo",
    category: "print",
    style: {
      engine: "vgpu",
      ditherType: "8x8",
      colorMode: "duotone",
      colorBack: "#f3e5cb",
      colorFront: "#1a0f07",
      pxSize: 1.5,
      threshold: 0.5,
    },
  },
  {
    id: "psx-15bit",
    name: "PSX 15-Bit",
    desc: "90s console 15-bit color banding",
    category: "retro",
    style: {
      engine: "vgpu",
      ditherType: "4x4",
      colorMode: "original",
      colorSteps: 4,
      pxSize: 2,
      threshold: 0.5,
    },
  },
];

export const PRESET_MAP = new Map(PRESETS.map((p) => [p.id, p]));

/** Style overrides for a preset, with hardware-palette colours filled in from the registry. */
export function resolvePresetStyle(preset: Preset): Partial<StyleSettings> {
  const out: Partial<StyleSettings> = { ...preset.style };
  if (preset.paletteId) {
    const pal = PALETTE_MAP.get(preset.paletteId);
    if (pal) {
      out.paletteId = pal.id;
      out.palette = [...pal.colors];
    }
  }
  return out;
}

/** Swatch colours for a preset card, derived from its palette or back/front colours. */
export function getPresetSwatches(preset: Preset): string[] {
  const resolved = resolvePresetStyle(preset);
  if (preset.paletteId && resolved.palette && resolved.colorMode === "palette") {
    return resolved.palette;
  }
  const back = resolved.colorBack ?? DEFAULT_COLORS.back;
  const front = resolved.colorFront ?? DEFAULT_COLORS.front;
  if (resolved.colorMode === "paper" && resolved.colorHighlight) {
    return [back, front, resolved.colorHighlight];
  }
  return [back, front];
}

/** Preset whose overrides all match the given style, preferring the most specific match. */
export function findMatchingPresetId(style: StyleSettings): string | null {
  let best: { id: string; size: number } | null = null;
  for (const preset of PRESETS) {
    const overrides = resolvePresetStyle(preset) as Record<string, unknown>;
    const keys = Object.keys(overrides);
    const matches = keys.every((k) => {
      const a = (style as unknown as Record<string, unknown>)[k];
      const b = overrides[k];
      return Array.isArray(a) && Array.isArray(b) ? a.join() === b.join() : a === b;
    });
    if (matches && (!best || keys.length > best.size)) best = { id: preset.id, size: keys.length };
  }
  return best?.id ?? null;
}
