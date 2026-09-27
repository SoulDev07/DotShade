"use client";

import React, { useState } from "react";
import {
  Sliders,
  Palette,
  Image as ImageIcon,
  Bookmark,
  Cpu,
  Lightning,
  Stack,
  Camera,
  VideoCamera as VideoIcon,
  ArrowCounterClockwise,
  Check,
  Scan,
  CornersOut,
  ArrowsOutLineVertical,
  Sun,
  MagnifyingGlass,
  X,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RETRO_PALETTES } from "@/engine/palettes";
import type { DitherSettings } from "@/engine/types";
import { SliderControl } from "./ui/SliderControl";
import { SegmentedControl } from "./ui/SegmentedControl";
import { DualColorPicker, ColorSwatchPicker } from "./ui/ColorSwatchPicker";

export type { DitherSettings } from "@/engine/types";

interface ControlPanelProps {
  settings: DitherSettings;
  onChange: (updater: Partial<DitherSettings>) => void;
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onToggleWebcam: () => void;
  isWebcamActive: boolean;
  onApplyPreset: (preset: Partial<DitherSettings>) => void;
  isViewingOriginal?: boolean;
  onToggleOriginal?: () => void;
}

const SAMPLE_MEDIA = [
  {
    name: "Botanical Palm",
    type: "image",
    url: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Cyber Tokyo",
    type: "image",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Vintage Portrait",
    type: "image",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Paper Flowers",
    type: "image",
    url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Anime Skyline",
    type: "image",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop",
  },
];

export interface PresetItem {
  name: string;
  desc: string;
  category: "retro" | "terminal" | "print" | "mono" | "stylized";
  colors: string[];
  preset: Partial<DitherSettings>;
}

const PRESETS: PresetItem[] = [
  {
    name: "Paper Mint",
    desc: "Navy & lime mint 8x8 ramp",
    category: "print",
    colors: ["#000c38", "#94ffaf", "#eaff94"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "paper" as const,
      colorBack: "#000c38",
      colorFront: "#94ffaf",
      colorHighlight: "#eaff94",
      pxSize: 2,
      colorSteps: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "PSX 15-Bit",
    desc: "90s console 15-bit color banding",
    category: "retro",
    colors: ["#181820", "#387080", "#c05070", "#e8d8b0"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "original" as const,
      colorSteps: 4,
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Game Boy DMG",
    desc: "1989 Nintendo 4-tone olive LCD",
    category: "retro",
    colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "gameboy-dmg",
      palette: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
      pxSize: 2.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Game Boy Pocket",
    desc: "1996 authentic silver-gray LCD",
    category: "retro",
    colors: ["#2b2b26", "#706b66", "#a89f91", "#c5bcab"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "gameboy-pocket",
      palette: ["#2b2b26", "#706b66", "#a89f91", "#c5bcab"],
      pxSize: 2.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "PICO-8 Fantasy",
    desc: "16-color fantasy console matrix",
    category: "retro",
    colors: ["#1d2b53", "#ff004d", "#29adff", "#ffec27"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "pico-8",
      palette: [
        "#000000", "#1d2b53", "#7e2553", "#008751",
        "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
        "#ff004d", "#ffa300", "#ffec27", "#00e436",
        "#29adff", "#83769c", "#ff77a8", "#ffccaa"
      ],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Cyber Neon",
    desc: "Magenta & cyan 4x4 matrix",
    category: "stylized",
    colors: ["#080417", "#ff007f", "#00f0ff", "#ffe600"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "cyberpunk-neon",
      palette: ["#080417", "#ff007f", "#00f0ff", "#ffe600"],
      pxSize: 2,
      threshold: 0.48,
      fit: "contain" as const,
    },
  },
  {
    name: "Matrix Phosphor",
    desc: "VT100 green CRT terminal glow",
    category: "terminal",
    colors: ["#051505", "#0d3a14", "#18b532", "#4aff68"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "crt-green",
      palette: ["#051505", "#0d3a14", "#18b532", "#4aff68"],
      pxSize: 2,
      threshold: 0.52,
      fit: "contain" as const,
    },
  },
  {
    name: "Amber Terminal",
    desc: "Warm P3 amber CRT phosphor",
    category: "terminal",
    colors: ["#140700", "#522300", "#ff8800", "#ffc870"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "amber-terminal",
      palette: ["#140700", "#522300", "#ff8800", "#ffc870"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Thermal FLIR",
    desc: "Infrared heat-map false color",
    category: "stylized",
    colors: ["#000004", "#781c6d", "#ed6925", "#fcffa4"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "thermal-flir",
      palette: ["#000004", "#320a5e", "#781c6d", "#bb3754", "#ed6925", "#fbb41a", "#fcffa4"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "1-Bit Atkinson",
    desc: "1984 Macintosh OS pure 1-bit",
    category: "mono",
    colors: ["#000000", "#ffffff"],
    preset: {
      engine: "cpu" as const,
      cpuAlgorithm: "atkinson" as const,
      colorMode: "grayscale" as const,
      pxSize: 1,
      threshold: 0.5,
      inverted: false,
      fit: "contain" as const,
    },
  },
  {
    name: "Floyd-Steinberg",
    desc: "1976 classic newsprint diffusion",
    category: "mono",
    colors: ["#101014", "#f0f0f4"],
    preset: {
      engine: "cpu" as const,
      cpuAlgorithm: "floyd-steinberg" as const,
      colorMode: "grayscale" as const,
      pxSize: 1,
      threshold: 0.5,
      inverted: false,
      fit: "contain" as const,
    },
  },
  {
    name: "Newspaper Halftone",
    desc: "45° dot halftone screen",
    category: "print",
    colors: ["#141416", "#e8e5db"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "halftone" as const,
      halftoneAngle: 45,
      halftoneScale: 2.5,
      pxSize: 1.5,
      colorMode: "duotone" as const,
      colorBack: "#e8e5db",
      colorFront: "#141416",
      fit: "contain" as const,
    },
  },
  {
    name: "Manga Screentone",
    desc: "60° dense Japanese screentone",
    category: "print",
    colors: ["#111113", "#f4f3ef"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "halftone" as const,
      halftoneAngle: 60,
      halftoneScale: 1.8,
      pxSize: 1,
      colorMode: "duotone" as const,
      colorBack: "#f4f3ef",
      colorFront: "#111113",
      fit: "contain" as const,
    },
  },
  {
    name: "Risograph Pop",
    desc: "Federal blue, pink & sun print",
    category: "print",
    colors: ["#f6f4ee", "#fedb00", "#ff48b0", "#003882"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "clustered" as const,
      colorMode: "palette" as const,
      paletteId: "risograph-pop",
      palette: ["#f6f4ee", "#fedb00", "#ff48b0", "#003882"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "CGA Mode 1",
    desc: "1981 IBM PC cyan & magenta",
    category: "retro",
    colors: ["#000000", "#00aaaa", "#aa00aa", "#aaaaaa"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "cga-mode1",
      palette: ["#000000", "#00aaaa", "#aa00aa", "#aaaaaa"],
      pxSize: 2.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Commodore 64",
    desc: "1982 C64 microcomputer 16-color",
    category: "retro",
    colors: ["#0000aa", "#dd8855", "#00cc55", "#eeee77"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "commodore-64",
      palette: [
        "#000000", "#ffffff", "#880000", "#aaffee",
        "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
        "#dd8855", "#664400", "#ff7777", "#333333",
        "#777777", "#aaff66", "#0088ff", "#bbbbbb"
      ],
      pxSize: 2.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Vaporwave Sunset",
    desc: "Dusk-to-dawn synthwave gradient",
    category: "stylized",
    colors: ["#120324", "#9e1966", "#f0436a", "#fced9b"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "vaporwave-sunset",
      palette: ["#120324", "#4b0c55", "#9e1966", "#f0436a", "#f99879", "#fced9b"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Blueprint",
    desc: "Cyanotype architectural print",
    category: "print",
    colors: ["#002b5c", "#76d7ea"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "crosshatch" as const,
      colorMode: "duotone" as const,
      colorBack: "#002b5c",
      colorFront: "#76d7ea",
      pxSize: 2,
      threshold: 0.52,
      fit: "contain" as const,
    },
  },
  {
    name: "Vintage Sepia",
    desc: "Antique 19th-century albumen photo",
    category: "print",
    colors: ["#1a0f07", "#8c5b32", "#f3e5cb"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "duotone" as const,
      colorBack: "#f3e5cb",
      colorFront: "#1a0f07",
      pxSize: 1.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Dracula Dark",
    desc: "Goth cyber purple & neon green",
    category: "terminal",
    colors: ["#282a36", "#bd93f9", "#ff79c6", "#50fa7b"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "dracula",
      palette: ["#282a36", "#44475a", "#6272a4", "#bd93f9", "#ff79c6", "#50fa7b", "#f8f8f2"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "ZX Spectrum",
    desc: "1982 Sinclair 8-color clash",
    category: "retro",
    colors: ["#000000", "#d70000", "#00d7d7", "#ffff00"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "zx-spectrum",
      palette: [
        "#000000", "#0000d7", "#d70000", "#d700d7",
        "#00d700", "#00d7d7", "#d7d700", "#d7d7d7",
        "#0000ff", "#ff0000", "#ff00ff", "#00ff00",
        "#00ffff", "#ffff00", "#ffffff"
      ],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Solarized Dark",
    desc: "High-contrast developer scheme",
    category: "terminal",
    colors: ["#002b36", "#268bd2", "#859900", "#eee8d5"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "solarized-dark",
      palette: ["#002b36", "#073642", "#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#dc322f", "#eee8d5"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Sega Genesis",
    desc: "16-bit arcade console palette",
    category: "retro",
    colors: ["#000000", "#2080c0", "#d02000", "#f8b000"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "4x4" as const,
      colorMode: "palette" as const,
      paletteId: "sega-genesis",
      palette: [
        "#000000", "#181818", "#383838", "#585858",
        "#002040", "#005080", "#2080c0", "#60b0e0",
        "#800000", "#d02000", "#f07000", "#f8b000",
        "#005800", "#209020", "#58d058", "#f8f8f8"
      ],
      pxSize: 2.5,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Nord Arctic",
    desc: "Cool north-bluish design theme",
    category: "stylized",
    colors: ["#2e3440", "#88c0d0", "#81a1c1", "#eceff4"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "palette" as const,
      paletteId: "nord-frost",
      palette: ["#2e3440", "#3b4252", "#434c5e", "#88c0d0", "#81a1c1", "#8fbcbb", "#eceff4"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
];

export function ControlPanel({
  settings,
  onChange,
  onUploadImage,
  onUploadVideo,
  onToggleWebcam,
  isWebcamActive,
  onApplyPreset,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<"dither" | "palette" | "adjust" | "presets">("dither");
  const [presetCategory, setPresetCategory] = useState<string>("all");
  const [presetSearch, setPresetSearch] = useState<string>("");

  const resetAdjustments = () => {
    onChange({
      brightness: 0,
      contrast: 1,
      saturation: 1,
      gamma: 1,
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    });
  };

  return (
    <aside className="w-full lg:w-80 bg-card border-l border-border flex flex-col h-full overflow-hidden select-none">
      {/* Navigation Tabs */}
      <nav className="flex items-center border-b border-border bg-muted/40 p-1 gap-1 shrink-0">
        {[
          { id: "dither", label: "Dither", icon: Sliders },
          { id: "palette", label: "Color", icon: Palette },
          { id: "adjust", label: "Adjust", icon: ImageIcon },
          { id: "presets", label: "Presets", icon: Bookmark },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-mono transition-all btn-press",
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-foreground/90">
        {/* Dither Tab */}
        {activeTab === "dither" && (
          <div className="space-y-4">
            {/* Engine Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Engine
              </label>
              <SegmentedControl
                value={settings.engine}
                onChange={(engine) => onChange({ engine })}
                options={[
                  { value: "vgpu", label: "WebGPU", icon: Lightning },
                  { value: "webgl", label: "WebGL", icon: Stack },
                  { value: "cpu", label: "CPU", icon: Cpu },
                ]}
              />
            </div>

            {/* Pattern Selector */}
            {settings.engine !== "cpu" ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                  Matrix Pattern
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "8x8", label: "Bayer 8×8" },
                    { id: "4x4", label: "Bayer 4×4" },
                    { id: "2x2", label: "Bayer 2×2" },
                    { id: "16x16", label: "Bayer 16×16" },
                    { id: "halftone", label: "Halftone" },
                    { id: "crosshatch", label: "Crosshatch" },
                    { id: "clustered", label: "Clustered" },
                    { id: "noise", label: "Noise" },
                  ].map((item) => {
                    const isSelected = settings.ditherType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange({ ditherType: item.id as any })}
                        className={cn(
                          "py-2 px-2.5 rounded-md border text-left font-mono text-[11px] transition-all btn-press flex items-center justify-between",
                          isSelected
                            ? "bg-secondary text-primary border-primary/50 font-medium shadow-sm"
                            : "bg-secondary/30 border-border text-muted-foreground hover:border-border-hover hover:text-foreground"
                        )}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                  Diffusion Algorithm
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: "floyd-steinberg", label: "Floyd-Steinberg" },
                    { id: "atkinson", label: "Atkinson" },
                    { id: "sierra3", label: "Sierra-3" },
                    { id: "sierra-lite", label: "Sierra Lite" },
                    { id: "burkes", label: "Burkes" },
                    { id: "stucki", label: "Stucki" },
                    { id: "jarvis", label: "Jarvis" },
                  ].map((item) => {
                    const isSelected = settings.cpuAlgorithm === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange({ cpuAlgorithm: item.id as any })}
                        className={cn(
                          "py-2 px-2.5 rounded-md border text-left font-mono text-[11px] transition-all btn-press flex items-center justify-between",
                          isSelected
                            ? "bg-secondary text-primary border-primary/50 font-medium shadow-sm"
                            : "bg-secondary/30 border-border text-muted-foreground hover:border-border-hover hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="pt-2 border-t border-border space-y-3">
              <SliderControl
                label="Pixel Size"
                value={settings.pxSize}
                min={0.5}
                max={16}
                step={0.5}
                unit="px"
                defaultValue={2}
                onChange={(pxSize) => onChange({ pxSize })}
              />

              <SliderControl
                label="Threshold Bias"
                value={settings.threshold}
                min={0.0}
                max={1.0}
                step={0.02}
                defaultValue={0.5}
                onChange={(threshold) => onChange({ threshold })}
              />

              {settings.ditherType === "halftone" && (
                <>
                  <SliderControl
                    label="Screen Angle"
                    value={settings.halftoneAngle}
                    min={0}
                    max={90}
                    step={5}
                    unit="°"
                    defaultValue={45}
                    onChange={(halftoneAngle) => onChange({ halftoneAngle })}
                  />
                  <SliderControl
                    label="Dot Scale"
                    value={settings.halftoneScale}
                    min={1}
                    max={8}
                    step={0.5}
                    defaultValue={2}
                    onChange={(halftoneScale) => onChange({ halftoneScale })}
                  />
                </>
              )}
            </div>

            {/* Invert Output Toggle */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-center justify-between cursor-pointer font-mono text-[11px] p-2 rounded-md bg-secondary/30 border border-border hover:border-border-hover transition-colors">
                <span className="text-foreground font-medium">Invert Output</span>
                <input
                  type="checkbox"
                  checked={settings.inverted}
                  onChange={(e) => onChange({ inverted: e.target.checked })}
                  className="w-4 h-4 rounded-sm border-border bg-background text-primary focus:ring-ring focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Palette Tab */}
        {activeTab === "palette" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Color Mode
              </label>
              <SegmentedControl
                value={settings.colorMode}
                onChange={(colorMode) => onChange({ colorMode })}
                size="sm"
                options={[
                  { value: "paper", label: "Paper" },
                  { value: "duotone", label: "Duotone" },
                  { value: "palette", label: "Palette" },
                  { value: "original", label: "RGB" },
                  { value: "grayscale", label: "Mono" },
                ]}
              />
            </div>

            {settings.colorMode === "paper" && (
              <div className="space-y-2 p-2.5 bg-secondary/20 rounded-lg border border-border">
                <DualColorPicker
                  backLabel="Background"
                  frontLabel="Foreground"
                  colorBack={settings.colorBack}
                  colorFront={settings.colorFront}
                  onBackChange={(colorBack) => onChange({ colorBack })}
                  onFrontChange={(colorFront) => onChange({ colorFront })}
                  onSwap={() =>
                    onChange({
                      colorBack: settings.colorFront,
                      colorFront: settings.colorBack,
                    })
                  }
                />
                <ColorSwatchPicker
                  label="Highlight"
                  color={settings.colorHighlight}
                  onChange={(colorHighlight) => onChange({ colorHighlight })}
                />
              </div>
            )}

            {settings.colorMode === "duotone" && (
              <div className="p-2.5 bg-secondary/20 rounded-lg border border-border">
                <DualColorPicker
                  backLabel="Dark Shade"
                  frontLabel="Light Shade"
                  colorBack={settings.colorBack}
                  colorFront={settings.colorFront}
                  onBackChange={(colorBack) => onChange({ colorBack })}
                  onFrontChange={(colorFront) => onChange({ colorFront })}
                  onSwap={() =>
                    onChange({
                      colorBack: settings.colorFront,
                      colorFront: settings.colorBack,
                    })
                  }
                />
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Hardware Palettes
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {RETRO_PALETTES.map((pal) => {
                  const isSelected = settings.paletteId === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          paletteId: pal.id,
                          palette: [...pal.colors],
                          colorMode: "palette",
                        })
                      }
                      className={cn(
                        "p-2 rounded-md border text-left font-mono transition-all btn-press flex flex-col gap-1.5",
                        isSelected
                          ? "bg-secondary text-foreground border-primary/50 shadow-sm"
                          : "bg-secondary/30 border-border text-muted-foreground hover:border-border-hover hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium truncate">
                          {pal.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground/70">{pal.colors.length}c</span>
                      </div>
                      <div className="flex h-2.5 w-full rounded-sm overflow-hidden border border-border">
                        {pal.colors.map((c, i) => (
                          <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <SliderControl
                label="Quantization Steps"
                value={settings.colorSteps}
                min={1}
                max={16}
                step={1}
                defaultValue={2}
                onChange={(colorSteps) => onChange({ colorSteps })}
              />
            </div>
          </div>
        )}

        {/* Adjust Tab */}
        {activeTab === "adjust" && (
          <div className="space-y-4">
            {/* Input Media Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Source Media
              </label>
              <div className="grid grid-cols-2 gap-1">
                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-secondary/40 hover:bg-secondary border border-border rounded-md cursor-pointer font-mono text-[11px] text-foreground transition-colors btn-press">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadImage(e.target.files[0]);
                    }}
                  />
                </label>

                <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-secondary/40 hover:bg-secondary border border-border rounded-md cursor-pointer font-mono text-[11px] text-foreground transition-colors btn-press">
                  <VideoIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadVideo(e.target.files[0]);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={onToggleWebcam}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 border rounded-md font-mono text-[11px] transition-colors btn-press",
                    isWebcamActive
                      ? "bg-destructive/20 border-destructive text-destructive-foreground"
                      : "bg-secondary/40 hover:bg-secondary border-border text-foreground"
                  )}
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isWebcamActive ? "Stop Cam" : "Webcam"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ mediaType: "procedural" })}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 border rounded-md font-mono text-[11px] transition-colors btn-press",
                    settings.mediaType === "procedural"
                      ? "bg-secondary border-primary/50 text-foreground font-semibold"
                      : "bg-secondary/40 hover:bg-secondary border-border text-foreground"
                  )}
                >
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Procedural</span>
                </button>
              </div>
            </div>

            {/* Viewport Fit Mode */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Framing & Fit
              </label>
              <SegmentedControl
                value={settings.fit}
                onChange={(fit) => onChange({ fit })}
                options={[
                  { value: "contain", label: "Fit", icon: Scan },
                  { value: "cover", label: "Fill", icon: CornersOut },
                  { value: "fill", label: "Stretch", icon: ArrowsOutLineVertical },
                ]}
              />
            </div>

            {/* Transform Controls: Scale & Rotation */}
            <div className="space-y-3 pt-2 border-t border-border">
              <SliderControl
                label="Scale"
                value={settings.scale}
                min={0.2}
                max={3.0}
                step={0.05}
                unit="x"
                defaultValue={1.0}
                onChange={(scale) => onChange({ scale })}
              />

              <SliderControl
                label="Rotation"
                value={settings.rotation}
                min={0}
                max={360}
                step={5}
                unit="°"
                defaultValue={0}
                onChange={(rotation) => onChange({ rotation })}
              />
            </div>

            {/* Image Adjustments */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                  Tone & Color
                </span>
                <button
                  type="button"
                  onClick={resetAdjustments}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors btn-press"
                  title="Reset adjustments"
                >
                  <ArrowCounterClockwise className="w-2.5 h-2.5" />
                  Reset
                </button>
              </div>

              <SliderControl
                label="Brightness"
                value={settings.brightness}
                min={-0.5}
                max={0.5}
                step={0.02}
                defaultValue={0}
                formatValue={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
                onChange={(brightness) => onChange({ brightness })}
              />

              <SliderControl
                label="Contrast"
                value={settings.contrast}
                min={0.2}
                max={2.5}
                step={0.05}
                unit="x"
                defaultValue={1.0}
                onChange={(contrast) => onChange({ contrast })}
              />

              <SliderControl
                label="Saturation"
                value={settings.saturation}
                min={0.0}
                max={2.0}
                step={0.05}
                unit="x"
                defaultValue={1.0}
                onChange={(saturation) => onChange({ saturation })}
              />

              <SliderControl
                label="Gamma"
                value={settings.gamma}
                min={0.5}
                max={2.5}
                step={0.05}
                defaultValue={1.0}
                onChange={(gamma) => onChange({ gamma })}
              />
            </div>

            {/* Sample Library */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium">
                Sample Library
              </label>
              <div className="space-y-1">
                {SAMPLE_MEDIA.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onChange({ mediaType: "image", mediaUrl: item.url })}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md border font-mono text-[11px] transition-all text-left btn-press",
                      settings.mediaUrl === item.url && settings.mediaType === "image"
                        ? "bg-secondary text-foreground border-primary/50 font-medium"
                        : "bg-secondary/30 border-border text-muted-foreground hover:border-border-hover hover:text-foreground"
                    )}
                  >
                    <span>{item.name}</span>
                    <span className="text-[9px] text-muted-foreground/70 uppercase font-mono px-1 py-0.5 rounded-sm bg-secondary">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Presets Tab */}
        {activeTab === "presets" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-muted-foreground block font-medium flex items-center gap-1.5">
                <Sparkle className="w-3.5 h-3.5 text-primary" />
                Style Presets
              </label>
              <span className="text-[10px] font-mono text-muted-foreground/70">
                {PRESETS.length} Presets
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="Search presets (Game Boy, PSX, CRT...)"
                className="w-full pl-8 pr-7 py-1.5 rounded-md bg-secondary/30 border border-border text-[11px] font-mono placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
              {presetSearch && (
                <button
                  type="button"
                  onClick={() => setPresetSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All" },
                { id: "retro", label: "Retro" },
                { id: "terminal", label: "Terminal" },
                { id: "print", label: "Print" },
                { id: "mono", label: "1-Bit" },
                { id: "stylized", label: "Stylized" },
              ].map((cat) => {
                const isSelected = presetCategory === cat.id;
                const count =
                  cat.id === "all"
                    ? PRESETS.length
                    : PRESETS.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPresetCategory(cat.id)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all btn-press flex items-center gap-1",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/50"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={cn(
                        "text-[9px] px-1 py-0.2 rounded-full",
                        isSelected
                          ? "bg-black/20 text-primary-foreground"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Preset Cards List */}
            <div className="space-y-1.5 pt-1">
              {PRESETS.filter((preset) => {
                const matchesCat =
                  presetCategory === "all" || preset.category === presetCategory;
                const query = presetSearch.trim().toLowerCase();
                const matchesQuery =
                  !query ||
                  preset.name.toLowerCase().includes(query) ||
                  preset.desc.toLowerCase().includes(query) ||
                  preset.category.toLowerCase().includes(query);
                return matchesCat && matchesQuery;
              }).map((preset) => {
                const isCurrent =
                  (preset.preset.paletteId && settings.paletteId === preset.preset.paletteId) ||
                  (preset.preset.colorMode === "paper" &&
                    settings.colorMode === "paper" &&
                    settings.colorBack === preset.preset.colorBack) ||
                  (preset.preset.engine === "cpu" &&
                    settings.engine === "cpu" &&
                    settings.cpuAlgorithm === preset.preset.cpuAlgorithm) ||
                  (preset.name === "PSX 15-Bit" &&
                    settings.colorMode === "original" &&
                    settings.colorSteps === 4) ||
                  (preset.name === "Newspaper Halftone" &&
                    settings.ditherType === "halftone" &&
                    settings.halftoneAngle === 45) ||
                  (preset.name === "Manga Screentone" &&
                    settings.ditherType === "halftone" &&
                    settings.halftoneAngle === 60) ||
                  (preset.name === "Blueprint" &&
                    settings.ditherType === "crosshatch" &&
                    settings.colorBack === "#002b5c") ||
                  (preset.name === "Vintage Sepia" &&
                    settings.colorMode === "duotone" &&
                    settings.colorFront === "#1a0f07");

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => onApplyPreset(preset.preset)}
                    className={cn(
                      "w-full flex flex-col p-2.5 rounded-md border text-left transition-all btn-press gap-1.5 group relative",
                      isCurrent
                        ? "bg-secondary/80 border-primary/60 shadow-xs"
                        : "bg-secondary/30 hover:bg-secondary/70 border-border hover:border-border-hover"
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "text-[11px] font-mono font-semibold truncate transition-colors",
                            isCurrent
                              ? "text-primary"
                              : "text-foreground group-hover:text-primary"
                          )}
                        >
                          {preset.name}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider font-mono text-muted-foreground/60 px-1 py-0.2 rounded bg-secondary/80 shrink-0">
                          {preset.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && <Check className="w-3 h-3 text-primary shrink-0" />}
                        <div className="flex h-2.5 w-14 rounded-xs overflow-hidden border border-border/80 shadow-2xs">
                          {preset.colors.map((c, i) => (
                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground line-clamp-1">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}

              {/* Empty Search Result */}
              {PRESETS.filter((preset) => {
                const matchesCat =
                  presetCategory === "all" || preset.category === presetCategory;
                const query = presetSearch.trim().toLowerCase();
                return (
                  matchesCat &&
                  (!query ||
                    preset.name.toLowerCase().includes(query) ||
                    preset.desc.toLowerCase().includes(query))
                );
              }).length === 0 && (
                <div className="p-4 text-center text-muted-foreground font-mono text-[11px] border border-dashed border-border rounded-md space-y-1.5">
                  <p>No presets found matching "{presetSearch}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPresetSearch("");
                      setPresetCategory("all");
                    }}
                    className="text-primary hover:underline text-[10px]"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
