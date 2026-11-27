import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_FRAME, DEFAULT_SOURCE, DEFAULT_STYLE } from "@/engine/defaults";
import { getPaletteRoles, PALETTE_MAP, RETRO_PALETTES } from "@/engine/palettes";
import { PRESET_MAP, resolvePresetStyle } from "@/engine/presets";
import {
  COLOR_MODES,
  DITHER_PATTERNS,
  type FrameSettings,
  type RenderSettings,
  type SourceState,
  type StyleSettings,
} from "@/engine/types";

export interface MediaDimensions {
  width: number;
  height: number;
}

/** The current image source, decoded once and shared by every consumer. */
export interface DecodedImage {
  url: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

interface StudioState {
  style: StyleSettings;
  frame: FrameSettings;
  source: SourceState;
  activePresetId: string | null;

  isSplitView: boolean;
  isViewingOriginal: boolean;
  zoom: number;
  isWebcamActive: boolean;
  mediaDimensions: MediaDimensions | null;
  decodedImage: DecodedImage | null;

  setStyle: (partial: Partial<StyleSettings>) => void;
  setFrame: (partial: Partial<FrameSettings>) => void;
  setSource: (partial: Partial<SourceState>) => void;
  applyPreset: (id: string) => void;
  applyPalette: (id: string) => void;
  randomize: () => { pattern: string; paletteName: string };
  resetAll: () => void;
  resetAdjustments: () => void;

  setSplitView: (value: boolean | ((prev: boolean) => boolean)) => void;
  setViewingOriginal: (value: boolean | ((prev: boolean) => boolean)) => void;
  setZoom: (value: number | ((prev: number) => number)) => void;
  setWebcamActive: (value: boolean) => void;
  setMediaDimensions: (value: MediaDimensions | null) => void;
  setDecodedImage: (value: DecodedImage | null) => void;
}

/** Blob URLs are revoked shortly after replacement so in-flight loads can finish. */
function scheduleRevoke(url: string | undefined) {
  if (!url?.startsWith("blob:") || typeof window === "undefined") return;
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const resolve = <T>(value: T | ((prev: T) => T), prev: T): T =>
  typeof value === "function" ? (value as (p: T) => T)(prev) : value;

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export const useStudioStore = create<StudioState>()(
  subscribeWithSelector((set, get) => ({
    style: DEFAULT_STYLE,
    frame: DEFAULT_FRAME,
    source: DEFAULT_SOURCE,
    activePresetId: null,

    isSplitView: false,
    isViewingOriginal: false,
    zoom: 1,
    isWebcamActive: false,
    mediaDimensions: null,
    decodedImage: null,

    setStyle: (partial) =>
      set((s) => ({ style: { ...s.style, ...partial }, activePresetId: null })),
    setFrame: (partial) => set((s) => ({ frame: { ...s.frame, ...partial } })),

    setSource: (partial) => {
      const prevUrl = get().source.mediaUrl;
      if (partial.mediaUrl !== undefined && partial.mediaUrl !== prevUrl) scheduleRevoke(prevUrl);
      set((s) => ({ source: { ...s.source, ...partial } }));
    },

    applyPreset: (id) => {
      const preset = PRESET_MAP.get(id);
      if (!preset) return;
      set((s) => {
        // A preset defines the whole look but leaves the user's tone adjustments alone.
        const { brightness, contrast, saturation, gamma, proceduralShape, animationSpeed } =
          s.style;
        return {
          style: {
            ...DEFAULT_STYLE,
            ...resolvePresetStyle(preset),
            brightness,
            contrast,
            saturation,
            gamma,
            proceduralShape,
            animationSpeed,
          },
          activePresetId: id,
        };
      });
    },

    applyPalette: (id) => {
      const pal = PALETTE_MAP.get(id);
      if (!pal) return;
      const roles = getPaletteRoles(pal);
      set((s) => {
        const base = { paletteId: pal.id, palette: [...pal.colors] };
        let next: Partial<StyleSettings>;
        if (s.style.colorMode === "duotone") {
          next = { ...base, colorBack: roles.back, colorFront: roles.front };
        } else if (s.style.colorMode === "paper") {
          next = {
            ...base,
            colorBack: roles.back,
            colorFront: roles.front,
            colorHighlight: roles.highlight,
          };
        } else {
          next = { ...base, colorMode: "palette" };
        }
        return { style: { ...s.style, ...next }, activePresetId: null };
      });
    },

    randomize: () => {
      const pattern = pick(DITHER_PATTERNS);
      const palette = pick(RETRO_PALETTES);
      const roles = getPaletteRoles(palette);
      set((s) => ({
        style: {
          ...s.style,
          ditherType: pattern,
          colorMode: pick(COLOR_MODES),
          paletteId: palette.id,
          palette: [...palette.colors],
          colorBack: roles.back,
          colorFront: roles.front,
          colorHighlight: roles.highlight,
          pxSize: Number((1 + Math.random() * 3).toFixed(1)),
          threshold: Number((0.35 + Math.random() * 0.3).toFixed(2)),
          colorSteps: Math.floor(2 + Math.random() * 6),
          halftoneAngle: Math.floor(Math.random() * 12) * 15,
          halftoneScale: Number((1 + Math.random() * 3).toFixed(1)),
        },
        activePresetId: null,
        isViewingOriginal: false,
      }));
      return { pattern, paletteName: palette.name };
    },

    resetAll: () => {
      scheduleRevoke(get().source.mediaUrl);
      set({
        style: DEFAULT_STYLE,
        frame: DEFAULT_FRAME,
        source: DEFAULT_SOURCE,
        activePresetId: null,
        isViewingOriginal: false,
      });
    },

    resetAdjustments: () =>
      set((s) => ({
        style: {
          ...s.style,
          brightness: DEFAULT_STYLE.brightness,
          contrast: DEFAULT_STYLE.contrast,
          saturation: DEFAULT_STYLE.saturation,
          gamma: DEFAULT_STYLE.gamma,
        },
        frame: {
          ...s.frame,
          scale: DEFAULT_FRAME.scale,
          rotation: DEFAULT_FRAME.rotation,
          offsetX: DEFAULT_FRAME.offsetX,
          offsetY: DEFAULT_FRAME.offsetY,
        },
        activePresetId: null,
      })),

    setSplitView: (value) => set((s) => ({ isSplitView: resolve(value, s.isSplitView) })),
    setViewingOriginal: (value) =>
      set((s) => ({ isViewingOriginal: resolve(value, s.isViewingOriginal) })),
    setZoom: (value) => set((s) => ({ zoom: resolve(value, s.zoom) })),
    setWebcamActive: (value) => set({ isWebcamActive: value }),
    setMediaDimensions: (value) => set({ mediaDimensions: value }),
    setDecodedImage: (value) => set({ decodedImage: value }),
  })),
);

/** Flattened settings for the engine mounts. */
export function selectRenderSettings(s: {
  style: StyleSettings;
  frame: FrameSettings;
  source: SourceState;
}): RenderSettings {
  return { ...s.style, ...s.frame, animated: s.source.animated };
}
