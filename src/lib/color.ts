export type Rgb = [number, number, number];

/** Parses `#rgb` / `#rrggbb` (the `#` is optional) into `out`; leaves NaN components when invalid. */
export function parseHexInto(hex: string, out: Rgb): boolean {
  let h = hex.trim();
  if (h.charCodeAt(0) === 35) h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 && h.length !== 8) {
    out[0] = out[1] = out[2] = Number.NaN;
    return false;
  }
  const n = parseInt(h.slice(0, 6), 16);
  out[0] = (n >> 16) & 255;
  out[1] = (n >> 8) & 255;
  out[2] = n & 255;
  return !Number.isNaN(n);
}

/** Parses a hex colour to [r, g, b] in 0..255, or `fallback` when invalid. */
export function parseHex(hex: string, fallback: Rgb = [0, 0, 0]): Rgb {
  const out: Rgb = [0, 0, 0];
  return parseHexInto(hex ?? "", out) ? out : [...fallback];
}

/** Hex colour to normalised [r, g, b, a] for shader uniforms. */
export function hexToNormalizedRgba(hex: string): [number, number, number, number] {
  const [r, g, b] = parseHex(hex);
  const h = (hex ?? "").trim().replace(/^#/, "");
  const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
  return [r / 255, g / 255, b / 255, a];
}

const toHex2 = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}
