import { hexToRgb, parseColorToNormalizedRgba } from "@/lib/utils";

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
];

export const PALETTE_MAP = new Map<string, ColorPalette>(
  RETRO_PALETTES.map((palette) => [palette.id, palette])
);

/**
 * Finds the closest color index in an array of Hex colors using Euclidean distance in sRGB
 */
export function findClosestPaletteColor(
  r: number,
  g: number,
  b: number,
  palette: string[]
): [number, number, number] {
  let minDistance = Infinity;
  let closestRgb: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < palette.length; i++) {
    const palRgb = hexToRgb(palette[i]);
    // Weighted Euclidean distance (human perception favors green, then red, then blue)
    const dr = r - palRgb[0];
    const dg = g - palRgb[1];
    const db = b - palRgb[2];
    const distance = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;

    if (distance < minDistance) {
      minDistance = distance;
      closestRgb = palRgb;
    }
  }

  return closestRgb;
}

/**
 * Flattens an array of hex colors into a Float32Array suitable for WebGL uniforms (vec4 array)
 * Pads up to maxColors (default 16).
 */
export function paletteToVec4Array(colors: string[], maxColors = 16): Float32Array {
  const result = new Float32Array(maxColors * 4);
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
