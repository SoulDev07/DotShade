import { type ClassValue, clsx } from "clsx";
import { colord, extend } from "colord";
import labPlugin from "colord/plugins/lab";
import { twMerge } from "tailwind-merge";

extend([labPlugin]);

export { colord };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseColorToNormalizedRgba(color: string): [number, number, number, number] {
  if (!color || typeof color !== "string") return [0, 0, 0, 1];
  const c = colord(color.trim());
  if (!c.isValid()) return [0, 0, 0, 1];
  const { r, g, b, a } = c.toRgb();
  return [r / 255, g / 255, b / 255, a];
}
