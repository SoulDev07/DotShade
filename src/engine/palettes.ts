import { hexToRgb, parseColorToNormalizedRgba, deltaE } from "@/lib/utils";

export interface ColorPalette {
  id: string;
  name: string;
  category: "retro" | "monochrome" | "paper" | "stylized" | "custom";
  colors: string[];
  description: string;
}

export const RETRO_PALETTES: ColorPalette[] = [
  {
    id: "paper-mint",
    name: "Paper Mint",
    category: "paper",
    colors: ["#000c38", "#94ffaf", "#eaff94"],
    description: "Classic Paper Shaders 3-color palette with deep navy, mint ink, and neon lime highlights.",
  },
  {
    id: "gameboy-dmg",
    name: "Game Boy DMG",
    category: "retro",
    colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    description: "Iconic 1989 Nintendo Game Boy 4-shade olive LCD matrix.",
  },
  {
    id: "gameboy-pocket",
    name: "Game Boy Pocket",
    category: "retro",
    colors: ["#2b2b26", "#706b66", "#a89f91", "#c5bcab"],
    description: "Silver/gray LCD screen tones from the 1996 Game Boy Pocket.",
  },
  {
    id: "macintosh-1bit",
    name: "Macintosh 1-Bit",
    category: "monochrome",
    colors: ["#000000", "#ffffff"],
    description: "High-contrast pure 1-bit black & white from original 1984 Macintosh OS.",
  },
  {
    id: "crt-green",
    name: "CRT Phosphor Green",
    category: "retro",
    colors: ["#051505", "#0d3a14", "#18b532", "#4aff68"],
    description: "Vintage VT100 / Apple II P1 green phosphor terminal glow.",
  },
  {
    id: "amber-terminal",
    name: "Amber Terminal",
    category: "retro",
    colors: ["#140700", "#522300", "#ff8800", "#ffc870"],
    description: "Classic P3 amber CRT display with warm golden glow.",
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    category: "stylized",
    colors: ["#080417", "#2b0938", "#ff007f", "#00f0ff", "#ffe600"],
    description: "High-voltage neon magenta, cyan, and electric yellow over midnight violet.",
  },
  {
    id: "cga-mode1",
    name: "CGA Mode 1",
    category: "retro",
    colors: ["#000000", "#00aaaa", "#aa00aa", "#aaaaaa"],
    description: "1981 IBM PC Color Graphics Adapter Palette 1 (Black, Cyan, Magenta, White).",
  },
  {
    id: "cga-mode2",
    name: "CGA Mode 2",
    category: "retro",
    colors: ["#000000", "#55ff55", "#ff5555", "#ffff55"],
    description: "IBM PC CGA Palette 2 (Black, Green, Red, Yellow).",
  },
  {
    id: "commodore-64",
    name: "Commodore 64",
    category: "retro",
    colors: [
      "#000000", "#ffffff", "#880000", "#aaffee",
      "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
      "#dd8855", "#664400", "#ff7777", "#333333",
      "#777777", "#aaff66", "#0088ff", "#bbbbbb"
    ],
    description: "Full authentic 16-color palette from the best-selling Commodore 64 microcomputer.",
  },
  {
    id: "zx-spectrum",
    name: "ZX Spectrum",
    category: "retro",
    colors: [
      "#000000", "#0000d7", "#d70000", "#d700d7",
      "#00d700", "#00d7d7", "#d7d700", "#d7d7d7",
      "#0000ff", "#ff0000", "#ff00ff", "#00ff00",
      "#00ffff", "#ffff00", "#ffffff"
    ],
    description: "1982 Sinclair ZX Spectrum 15-color bright & standard palette.",
  },
  {
    id: "nes-classic",
    name: "NES 8-Bit",
    category: "retro",
    colors: [
      "#000000", "#002070", "#183c5c", "#7c0800",
      "#a01800", "#881400", "#384000", "#104c00",
      "#fc9838", "#00a800", "#58d854", "#e45c10",
      "#bcbcbc", "#f8f8f8"
    ],
    description: "Core action game colors from the Nintendo Entertainment System.",
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    category: "stylized",
    colors: ["#002b36", "#073642", "#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#dc322f", "#eee8d5"],
    description: "Ethan Schoonover's precision Solarized color palette optimized for contrast.",
  },
  {
    id: "vaporwave-sunset",
    name: "Vaporwave Sunset",
    category: "stylized",
    colors: ["#120324", "#4b0c55", "#9e1966", "#f0436a", "#f99879", "#fced9b"],
    description: "Dusk-to-dawn synthwave gradient from deep indigo to glowing peach.",
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    category: "stylized",
    colors: ["#2d3142", "#ef8354", "#4f5d75", "#bfc0c0", "#ffffff"],
    description: "Soft modern pastel tones with balanced warm and cool contrast.",
  },
  {
    id: "pico-8",
    name: "PICO-8",
    category: "retro",
    colors: [
      "#000000", "#1d2b53", "#7e2553", "#008751",
      "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
      "#ff004d", "#ffa300", "#ffec27", "#00e436",
      "#29adff", "#83769c", "#ff77a8", "#ffccaa"
    ],
    description: "Lexaloffle's beloved 16-color fantasy console palette, widely celebrated in pixel art.",
  },
  {
    id: "thermal-flir",
    name: "Thermal FLIR",
    category: "stylized",
    colors: ["#000004", "#320a5e", "#781c6d", "#bb3754", "#ed6925", "#fbb41a", "#fcffa4"],
    description: "False-color infrared thermal heatmap gradient from deep violet to yellow-white.",
  },
  {
    id: "risograph-pop",
    name: "Risograph Pop",
    category: "paper",
    colors: ["#f6f4ee", "#fedb00", "#ff48b0", "#003882"],
    description: "Spot color Risograph print: warm cream paper, sunflower yellow, fluorescent pink, and federal blue.",
  },
  {
    id: "nord-frost",
    name: "Nord Frost",
    category: "stylized",
    colors: ["#2e3440", "#3b4252", "#434c5e", "#88c0d0", "#81a1c1", "#8fbcbb", "#eceff4"],
    description: "Arctic, north-bluish clean developer palette with high readability.",
  },
  {
    id: "dracula",
    name: "Dracula",
    category: "stylized",
    colors: ["#282a36", "#44475a", "#6272a4", "#bd93f9", "#ff79c6", "#50fa7b", "#f8f8f2"],
    description: "Classic dark theme with vibrant pastel neon accents.",
  },
  {
    id: "teletext",
    name: "Teletext Ceefax",
    category: "retro",
    colors: ["#000000", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff"],
    description: "1976 BBC broadcast teletext 3-bit RGB 8-color graphics.",
  },
  {
    id: "sepia-vintage",
    name: "Vintage Sepia",
    category: "monochrome",
    colors: ["#1a0f07", "#4d2e18", "#8c5b32", "#c49a6c", "#f3e5cb"],
    description: "Warm antique albumen and daguerreotype photographic tones.",
  },
  {
    id: "gameboy-color",
    name: "Game Boy Color",
    category: "retro",
    colors: ["#000000", "#006395", "#e40058", "#ffffff"],
    description: "Iconic high-contrast 4-color boot palette from Nintendo Game Boy Color.",
  },
  {
    id: "sega-genesis",
    name: "Sega Genesis",
    category: "retro",
    colors: [
      "#000000", "#181818", "#383838", "#585858",
      "#002040", "#005080", "#2080c0", "#60b0e0",
      "#800000", "#d02000", "#f07000", "#f8b000",
      "#005800", "#209020", "#58d058", "#f8f8f8"
    ],
    description: "Authentic 16-color arcade palette from the 16-bit Sega Genesis / Mega Drive.",
  },
];

/**
 * Map of palette ID to palette definition for quick O(1) lookups.
 */
export const PALETTE_MAP = new Map<string, ColorPalette>(
  RETRO_PALETTES.map((palette) => [palette.id, palette])
);

export type RgbTuple = [number, number, number];

/**
 * Finds the closest color in a pre-parsed RGB color palette using perceptually-weighted
 * Euclidean distance in RGB color space without string parsing overhead.
 * Weights (0.30 R, 0.59 G, 0.11 B) account for human eye sensitivity to green wavelengths.
 *
 * @param r - Source red component [0..255]
 * @param g - Source green component [0..255]
 * @param b - Source blue component [0..255]
 * @param palette - Array of pre-parsed [r, g, b] tuples
 * @returns The closest [r, g, b] color tuple from the palette
 */
export function findClosestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: RgbTuple[]
): RgbTuple {
  let minDistance = Infinity;
  let closestRgb: RgbTuple = palette[0] || [0, 0, 0];

  for (let i = 0; i < palette.length; i++) {
    const palRgb = palette[i];
    // CIEDE2000 perceptual color distance for superior visual accuracy
    const distance = deltaE(
      { r, g, b },
      { r: palRgb[0], g: palRgb[1], b: palRgb[2] }
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestRgb = palRgb;
      if (distance === 0) break;
    }
  }

  return closestRgb;
}

/** Converts hex colors to a flat Float32Array for WebGL/WebGPU vec4 palette uniforms */
export function paletteToVec4Array(
  colors: string[],
  maxColors = 16,
  targetBuffer?: Float32Array
): Float32Array {
  const result = targetBuffer && targetBuffer.length >= maxColors * 4
    ? targetBuffer
    : new Float32Array(maxColors * 4);
  for (let i = 0; i < maxColors; i++) {
    const colorHex = i < colors.length ? colors[i] : colors[colors.length - 1] || "#000000";
    const [r, g, b, a] = parseColorToNormalizedRgba(colorHex);
    result[i * 4 + 0] = r;
    result[i * 4 + 1] = g;
    result[i * 4 + 2] = b;
    result[i * 4 + 3] = a;
  }
  return result;
}
