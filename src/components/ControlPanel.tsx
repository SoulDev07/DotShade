"use client";

import React, { useState, useId } from "react";
import {
  Sliders,
  Palette,
  ImageIcon,
  Bookmark,
  Cpu,
  Lightning,
  Stack,
  Camera,
  VideoCameraIcon as VideoIcon,
  ArrowCounterClockwise,
  Check,
  Scan,
  CornersOut,
  ArrowsOutLineVertical,
  Sun,
  MagnifyingGlass,
  X,
  Sparkle,
  DiceFive,
  CaretDown,
  CaretRight,
  Eyedropper,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { RETRO_PALETTES } from "@/engine/palettes";
import type { DitherSettings } from "@/engine/types";
import { extractPaletteFromImageData } from "@/engine/gif-export";
import { toast } from "sonner";
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
    url: "/samples/botanical-palm.webp",
  },
  {
    name: "Cyber Tokyo",
    type: "image",
    url: "/samples/cyber-tokyo.webp",
  },
  {
    name: "Vintage Portrait",
    type: "image",
    url: "/samples/vintage-portrait.webp",
  },
  {
    name: "Paper Flowers",
    type: "image",
    url: "/samples/paper-flowers.webp",
  },
  {
    name: "Anime Skyline",
    type: "image",
    url: "/samples/anime-skyline.webp",
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
    name: "Macintosh 1-Bit",
    desc: "1984 original Macintosh pure black & white",
    category: "mono",
    colors: ["#000000", "#ffffff"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "8x8" as const,
      colorMode: "paper" as const,
      colorBack: "#000000",
      colorFront: "#ffffff",
      colorHighlight: "#ffffff",
      paletteId: "macintosh-1bit",
      palette: ["#000000", "#ffffff"],
      pxSize: 2,
      threshold: 0.5,
      fit: "contain" as const,
    },
  },
  {
    name: "Floyd-Steinberg",
    desc: "1976 classic newsprint error diffusion",
    category: "mono",
    colors: ["#000000", "#ffffff"],
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
    name: "1-Bit Atkinson",
    desc: "1984 Bill Atkinson HyperCard diffusion",
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
    name: "Newspaper Halftone",
    desc: "45° ink dot halftone press screen",
    category: "print",
    colors: ["#000000", "#ffffff"],
    preset: {
      engine: "vgpu" as const,
      ditherType: "halftone" as const,
      halftoneAngle: 45,
      halftoneScale: 2.5,
      pxSize: 1.5,
      colorMode: "duotone" as const,
      colorBack: "#ffffff",
      colorFront: "#000000",
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
];

interface SectionHeaderProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

function SectionHeader({
  title,
  icon: Icon,
  isOpen,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 px-4 bg-neutral-950 hover:bg-neutral-900 border-y border-border transition-colors text-left btn-press select-none group"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-4 h-4 text-neutral-300 group-hover:text-white transition-colors shrink-0" />
        <span className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider text-white truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOpen ? (
          <CaretDown className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
        ) : (
          <CaretRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
        )}
      </div>
    </button>
  );
}

export function ControlPanel({
  settings,
  onChange,
  onUploadImage,
  onUploadVideo,
  onToggleWebcam,
  isWebcamActive,
  onApplyPreset,
}: ControlPanelProps) {
  const [openSections, setOpenSections] = useState({
    media: true,
    dither: true,
    color: true,
    presets: true,
    adjust: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  const handleHardwarePaletteClick = (pal: { id: string; colors: string[] }) => {
    if (settings.colorMode === "duotone") {
      onChange({
        paletteId: pal.id,
        palette: [...pal.colors],
        colorBack: pal.colors[0],
        colorFront: pal.colors[pal.colors.length - 1],
      });
    } else if (settings.colorMode === "paper") {
      onChange({
        paletteId: pal.id,
        palette: [...pal.colors],
        colorBack: pal.colors[0],
        colorFront: pal.colors[1] || pal.colors[0],
        colorHighlight: pal.colors[2] || pal.colors[pal.colors.length - 1],
      });
    } else {
      onChange({
        paletteId: pal.id,
        palette: [...pal.colors],
        colorMode: "palette",
      });
    }
  };

  const [isExtractingPalette, setIsExtractingPalette] = useState(false);
  const [extractCount, setExtractCount] = useState(4);

  const handleExtractPalette = async () => {
    if (settings.mediaType !== "image" || !settings.mediaUrl) {
      toast.info("Please load an image first to extract its palette!");
      return;
    }
    setIsExtractingPalette(true);
    try {
      const img = new Image();
      if (settings.mediaUrl.startsWith("http://") || settings.mediaUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = settings.mediaUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const maxDim = 250;
      let w = img.naturalWidth || 250;
      let h = img.naturalHeight || 250;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not initialize 2D context");
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const colors = extractPaletteFromImageData(imgData, extractCount);

      if (colors && colors.length > 0) {
        onChange({
          paletteId: "custom",
          palette: colors,
          colorMode: "palette",
          colorBack: colors[0],
          colorFront: colors[colors.length - 1],
          colorHighlight: colors[1] || colors[colors.length - 1],
        });
        toast.success(`Extracted ${colors.length}-color palette from image!`);
      }
    } catch (err) {
      console.error("Extract palette error:", err);
      toast.error("Could not extract palette from image.");
    } finally {
      setIsExtractingPalette(false);
    }
  };

  return (
    <aside
      className="w-full lg:w-[410px] bg-card border-l border-border flex flex-col h-full overflow-hidden select-none"
      style={{ borderLeftWidth: "1px" }}
    >
      
      <div className="h-11 px-4 bg-neutral-950 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-white inline-block" />
          <span className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider text-white">
            STUDIO CONTROLS
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border text-xs text-foreground/90">

        <section className="bg-card">
          <SectionHeader
            title="SOURCE MEDIA"
            icon={ImageIcon}
            isOpen={openSections.media}
            onToggle={() => toggleSection("media")}
          />

          {openSections.media && (
            <div className="p-4 space-y-3.5 bg-black/40">
              
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-secondary/50 hover:bg-neutral-800 border border-border cursor-pointer font-mono text-xs text-white transition-colors btn-press font-bold">
                  <ImageIcon className="w-4 h-4 text-white" />
                  <span>IMAGE</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadImage(e.target.files[0]);
                      // Reset so re-picking the same file fires onChange.
                      e.target.value = "";
                    }}
                  />
                </label>

                <label className="flex items-center justify-center gap-2 py-2.5 px-3 bg-secondary/50 hover:bg-neutral-800 border border-border cursor-pointer font-mono text-xs text-white transition-colors btn-press font-bold">
                  <VideoIcon className="w-4 h-4 text-white" />
                  <span>VIDEO</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadVideo(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={onToggleWebcam}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 border font-mono text-xs transition-colors btn-press font-bold",
                    isWebcamActive
                      ? "bg-white text-black font-bold border-white"
                      : "bg-secondary/50 hover:bg-neutral-800 border-border text-white"
                  )}
                >
                  <Camera className="w-4 h-4" />
                  <span>{isWebcamActive ? "STOP CAM" : "WEBCAM"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ mediaType: "procedural" })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 border font-mono text-xs transition-colors btn-press font-bold",
                    settings.mediaType === "procedural" && !isWebcamActive
                      ? "bg-white text-black font-bold border-white"
                      : "bg-secondary/50 hover:bg-neutral-800 border-border text-white"
                  )}
                >
                  <Cpu className="w-4 h-4" />
                  <span>PROCEDURAL</span>
                </button>
              </div>

              <div className="pt-2.5 border-t border-border/60 space-y-2">
                <span className="text-xs font-mono text-neutral-300 block font-bold uppercase tracking-wider">
                  Quick Sample Library
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {SAMPLE_MEDIA.map((item) => {
                    const isSelected = settings.mediaUrl === item.url && settings.mediaType === "image";
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => onChange({ mediaType: "image", mediaUrl: item.url })}
                        className={cn(
                          "w-full flex items-center justify-between py-2 px-3 border font-mono text-xs transition-all text-left btn-press",
                          isSelected
                            ? "bg-white text-black border-white font-bold"
                            : "bg-secondary/30 border-border text-neutral-300 hover:border-white hover:text-white"
                        )}
                      >
                        <span className="truncate">{item.name}</span>
                        <span className={cn(
                          "text-[10px] uppercase font-mono px-1.5 py-0.5 border font-medium",
                          isSelected ? "border-black text-black bg-neutral-200" : "border-neutral-700 text-neutral-400 bg-secondary"
                        )}>
                          {item.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="DITHER MATRIX & ENGINE"
            icon={Sliders}
            isOpen={openSections.dither}
            onToggle={() => toggleSection("dither")}
          />

          {openSections.dither && (
            <div className="p-4 space-y-4 bg-black/40">
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
                  Rendering Engine
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

              {settings.engine !== "cpu" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
                    Matrix Pattern
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
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
                            "py-2.5 px-3 border text-left font-mono text-xs transition-all btn-press flex items-center justify-between font-bold",
                            isSelected
                              ? "bg-white text-black border-white shadow-sm"
                              : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white"
                          )}
                        >
                          <span>{item.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-black font-bold shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
                    Diffusion Algorithm
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
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
                            "py-2.5 px-3 border text-left font-mono text-xs transition-all btn-press flex items-center justify-between font-bold",
                            isSelected
                              ? "bg-white text-black border-white shadow-sm"
                              : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white"
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-black shrink-0 font-bold" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2.5 border-t border-border/60 space-y-3.5">
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

              <div className="pt-2.5 border-t border-border/60">
                <label className="flex items-center justify-between cursor-pointer font-mono text-xs p-2.5 bg-secondary/40 border border-border hover:border-white transition-colors">
                  <span className="text-white font-bold uppercase tracking-wide">▸ Invert Output</span>
                  <input
                    type="checkbox"
                    checked={settings.inverted}
                    onChange={(e) => onChange({ inverted: e.target.checked })}
                    className="w-4 h-4 border-border bg-black text-white focus:ring-ring focus:ring-offset-0 cursor-pointer accent-white"
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="COLOR & PALETTES"
            icon={Palette}
            isOpen={openSections.color}
            onToggle={() => toggleSection("color")}
          />

          {openSections.color && (
            <div className="p-4 space-y-4 bg-black/40">
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
                  Color Mode
                </label>
                <SegmentedControl
                  value={settings.colorMode}
                  onChange={(colorMode) => onChange({ colorMode })}
                  size="sm"
                  options={[
                    { value: "duotone", label: "Duotone" },
                    { value: "paper", label: "Paper" },
                    { value: "palette", label: "Palette" },
                    { value: "original", label: "RGB" },
                    { value: "grayscale", label: "Mono" },
                  ]}
                />
              </div>

              {settings.colorMode === "duotone" && (
                <div className="p-3 bg-secondary/30 border border-border space-y-1.5">
                  <span className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider mb-1.5">
                    Duotone Shades
                  </span>
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
                  <p className="text-[10px] font-mono text-neutral-400 pt-1">
                    Tip: Click any Hardware Palette below to load its colors into Duotone!
                  </p>
                </div>
              )}

              {settings.colorMode === "paper" && (
                <div className="space-y-2.5 p-3 bg-secondary/30 border border-border">
                  <span className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider mb-1.5">
                    Paper Inks
                  </span>
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

              {/* Extract Palette from Image */}
              <div className="p-3 bg-secondary/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-200 font-bold uppercase tracking-wider">
                    <Eyedropper className="w-3.5 h-3.5 text-white" />
                    <span>Auto-Palette from Image</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">
                    PNNQUANT
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-neutral-300">Colors:</span>
                  <div className="flex gap-1">
                    {[2, 4, 8, 16].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setExtractCount(count)}
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-mono border transition-colors btn-press",
                          extractCount === count
                            ? "bg-white text-black border-white font-bold"
                            : "bg-black/60 border-border text-neutral-400 hover:text-white"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExtractPalette}
                  disabled={isExtractingPalette || settings.mediaType !== "image"}
                  className="w-full py-2 px-3 bg-secondary hover:bg-neutral-800 text-white font-mono text-xs font-bold border border-border hover:border-white flex items-center justify-center gap-2 transition-colors disabled:opacity-40 btn-press"
                >
                  <Sparkle className="w-3.5 h-3.5 text-white" />
                  <span>
                    {isExtractingPalette
                      ? "EXTRACTING..."
                      : `EXTRACT ${extractCount}-COLOR PALETTE`}
                  </span>
                </button>
              </div>

              <div className="space-y-2 pt-2.5 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
                    Hardware Palettes
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">
                    {settings.colorMode === "duotone"
                      ? "CLICK SETS DUOTONE"
                      : `${RETRO_PALETTES.length} PALETTES`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {RETRO_PALETTES.map((pal) => {
                    const isSelected =
                      settings.paletteId === pal.id ||
                      (settings.colorMode === "duotone" &&
                        settings.colorBack.toLowerCase() === pal.colors[0].toLowerCase() &&
                        settings.colorFront.toLowerCase() === pal.colors[pal.colors.length - 1].toLowerCase());

                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => handleHardwarePaletteClick(pal)}
                        className={cn(
                          "p-2.5 border text-left font-mono transition-all btn-press flex flex-col gap-2 relative",
                          isSelected
                            ? "bg-neutral-900 text-white border-2 border-white shadow-sm"
                            : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white"
                        )}
                        title={
                          settings.colorMode === "duotone"
                            ? `Set Duotone to ${pal.name} (${pal.colors[0]} & ${pal.colors[pal.colors.length - 1]})`
                            : `Apply ${pal.name}`
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">
                            {pal.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">{pal.colors.length}c</span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden border border-border">
                          {pal.colors.map((c, i) => (
                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2.5 border-t border-border/60">
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
        </section>

        <section className="bg-card">
          <SectionHeader
            title="STYLE PRESETS"
            icon={Bookmark}
            isOpen={openSections.presets}
            onToggle={() => toggleSection("presets")}
          />

          {openSections.presets && (
            <div className="p-4 space-y-3.5 bg-black/40">
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search presets (Game Boy, 1-Bit...)"
                    className="w-full pl-9 pr-8 py-2 bg-black border border-border text-xs font-mono placeholder:text-neutral-500 text-white focus:outline-none focus:border-white transition-colors"
                  />
                  {presetSearch && (
                    <button
                      type="button"
                      onClick={() => setPresetSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = PRESETS[Math.floor(Math.random() * PRESETS.length)];
                    if (rnd) onApplyPreset(rnd.preset);
                  }}
                  className="px-2.5 py-2 bg-secondary/60 hover:bg-neutral-800 border border-border hover:border-neutral-400 text-neutral-200 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors btn-press shrink-0"
                  title="Apply random curated preset"
                >
                  <DiceFive className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">RANDOM</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: "ALL" },
                  { id: "mono", label: "1-BIT" },
                  { id: "print", label: "PRINT" },
                  { id: "retro", label: "RETRO" },
                  { id: "terminal", label: "CRT" },
                  { id: "stylized", label: "STYLE" },
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
                        "px-2.5 py-1.5 text-xs font-mono whitespace-nowrap transition-all btn-press flex items-center gap-1.5",
                        isSelected
                          ? "bg-white text-black font-bold border border-white"
                          : "bg-secondary/40 text-neutral-300 hover:text-white hover:bg-secondary/70 border border-border"
                      )}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1 font-bold",
                          isSelected
                            ? "text-black/80"
                            : "text-neutral-400"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
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
                        "w-full flex flex-col p-2.5 border text-left transition-all btn-press gap-1.5 group relative",
                        isCurrent
                          ? "bg-neutral-900 border-2 border-white shadow-sm"
                          : "bg-secondary/30 hover:bg-secondary/70 border-border hover:border-neutral-400"
                      )}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "text-xs font-mono font-bold truncate transition-colors",
                              isCurrent
                                ? "text-white"
                                : "text-foreground group-hover:text-white"
                            )}
                          >
                            {preset.name}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-300 px-1.5 py-0.5 bg-secondary border border-border shrink-0 font-bold">
                            {preset.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent && <Check className="w-4 h-4 text-white shrink-0 font-bold" />}
                          <div className="flex h-3 w-16 overflow-hidden border border-border">
                            {preset.colors.map((c, i) => (
                              <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400 line-clamp-1">
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}

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
                  <div className="p-4 text-center text-neutral-400 font-mono text-xs border border-dashed border-border space-y-1.5">
                    <p>No presets found matching "{presetSearch}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPresetSearch("");
                        setPresetCategory("all");
                      }}
                      className="text-white hover:underline text-xs font-bold"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="bg-card">
          <SectionHeader
            title="FRAMING & ADJUSTMENTS"
            icon={Sun}
            isOpen={openSections.adjust}
            onToggle={() => toggleSection("adjust")}
          />

          {openSections.adjust && (
            <div className="p-4 space-y-4 bg-black/40">
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-200 block font-bold uppercase tracking-wider">
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

              <div className="space-y-3.5 pt-2.5 border-t border-border/60">
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

              <div className="space-y-3.5 pt-2.5 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-neutral-400" />
                    Tone & Contrast
                  </span>
                  <button
                    type="button"
                    onClick={resetAdjustments}
                    className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors btn-press font-bold"
                    title="Reset adjustments to defaults"
                  >
                    <ArrowCounterClockwise className="w-3 h-3" />
                    RESET
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
                  unit="x"
                  defaultValue={1.0}
                  onChange={(gamma) => onChange({ gamma })}
                />
              </div>
            </div>
          )}
        </section>

      </div>
    </aside>
  );
}
