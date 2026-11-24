"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowsOutLineVerticalIcon,
  BookmarkIcon,
  CameraIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckIcon,
  CornersOutIcon,
  CpuIcon,
  DiceFiveIcon,
  EyedropperIcon,
  ImageIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PaletteIcon,
  ScanIcon,
  SlidersIcon,
  SparkleIcon,
  StackIcon,
  SunIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { extractPaletteFromImageData } from "@/engine/gif-export";
import { RETRO_PALETTES } from "@/engine/palettes";
import type { DitherSettings } from "@/engine/types";
import { cn } from "@/lib/utils";
import { ColorSwatchPicker, DualColorPicker } from "./ui/ColorSwatchPicker";
import { SegmentedControl } from "./ui/SegmentedControl";
import { SliderControl } from "./ui/SliderControl";

export type { DitherSettings } from "@/engine/types";

interface ControlPanelProps {
  settings: DitherSettings;
  onChange: (updater: Partial<DitherSettings>) => void;
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onToggleWebcam: () => void;
  isWebcamActive: boolean;
  onApplyPreset: (preset: Partial<DitherSettings>) => void;
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
        "#000000",
        "#1d2b53",
        "#7e2553",
        "#008751",
        "#ab5236",
        "#5f574f",
        "#c2c3c7",
        "#fff1e8",
        "#ff004d",
        "#ffa300",
        "#ffec27",
        "#00e436",
        "#29adff",
        "#83769c",
        "#ff77a8",
        "#ffccaa",
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
        "#000000",
        "#ffffff",
        "#880000",
        "#aaffee",
        "#cc44cc",
        "#00cc55",
        "#0000aa",
        "#eeee77",
        "#dd8855",
        "#664400",
        "#ff7777",
        "#333333",
        "#777777",
        "#aaff66",
        "#0088ff",
        "#bbbbbb",
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

function SectionHeader({ title, icon: Icon, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="border-border btn-press group flex w-full items-center justify-between border-y bg-neutral-950 px-4 py-2.5 text-left transition-colors select-none hover:bg-neutral-900"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-white" />
        <span className="truncate font-mono text-xs font-bold tracking-wider text-white uppercase sm:text-[13px]">
          {title}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOpen ? (
          <CaretDownIcon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-white" />
        ) : (
          <CaretRightIcon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-white" />
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

  type MobileTab = "media" | "dither" | "color" | "presets" | "adjust";
  type MobileSheetState = "collapsed" | "docked" | "expanded";

  const [mobileTab, setMobileTab] = useState<MobileTab>("dither");
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("docked");

  const handleMobileTabClick = (tab: MobileTab) => {
    if (mobileTab === tab) {
      setMobileSheetState((prev) => (prev === "collapsed" ? "docked" : "collapsed"));
    } else {
      setMobileTab(tab);
      if (mobileSheetState === "collapsed") {
        setMobileSheetState("docked");
      }
    }
  };

  const renderMediaContent = () => (
    <div className="space-y-3.5 bg-black/40 p-3.5 sm:p-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="bg-secondary/50 border-border btn-press flex cursor-pointer items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs font-bold text-white transition-colors hover:bg-neutral-800">
          <ImageIcon className="h-4 w-4 text-white" />
          <span>IMAGE</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onUploadImage(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>

        <label className="bg-secondary/50 border-border btn-press flex cursor-pointer items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs font-bold text-white transition-colors hover:bg-neutral-800">
          <VideoCameraIcon className="h-4 w-4 text-white" />
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
            "btn-press flex items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs font-bold transition-colors",
            isWebcamActive
              ? "border-white bg-white font-bold text-black"
              : "bg-secondary/50 border-border text-white hover:bg-neutral-800",
          )}
        >
          <CameraIcon className="h-4 w-4" />
          <span>{isWebcamActive ? "STOP CAM" : "WEBCAM"}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange({ mediaType: "procedural" })}
          className={cn(
            "btn-press flex items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs font-bold transition-colors",
            settings.mediaType === "procedural" && !isWebcamActive
              ? "border-white bg-white font-bold text-black"
              : "bg-secondary/50 border-border text-white hover:bg-neutral-800",
          )}
        >
          <CpuIcon className="h-4 w-4" />
          <span>PROCEDURAL</span>
        </button>
      </div>

      <div className="border-border/60 space-y-2 border-t pt-2.5">
        <span className="block font-mono text-xs font-bold tracking-wider text-neutral-300 uppercase">
          Quick Sample Library
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {SAMPLE_MEDIA.map((item) => {
            const isSelected = settings.mediaUrl === item.url && settings.mediaType === "image";
            return (
              <button
                key={item.name}
                type="button"
                onClick={() =>
                  onChange({ mediaType: "image", mediaUrl: item.url, animated: false })
                }
                className={cn(
                  "btn-press flex w-full items-center justify-between border px-3 py-2 text-left font-mono text-xs transition-all",
                  isSelected
                    ? "border-white bg-white font-bold text-black"
                    : "bg-secondary/30 border-border text-neutral-300 hover:border-white hover:text-white",
                )}
              >
                <span className="truncate">{item.name}</span>
                <span
                  className={cn(
                    "ml-2 shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase",
                    isSelected
                      ? "border-black bg-neutral-200 text-black"
                      : "bg-secondary border-neutral-700 text-neutral-400",
                  )}
                >
                  {item.type}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDitherContent = () => (
    <div className="space-y-4 bg-black/40 p-3.5 sm:p-4">
      <div className="space-y-1.5">
        <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
          Rendering Engine
        </label>
        <SegmentedControl
          value={settings.engine}
          onChange={(engine) => onChange({ engine })}
          options={[
            { value: "vgpu", label: "WebGPU", icon: LightningIcon },
            { value: "webgl", label: "WebGL", icon: StackIcon },
            { value: "cpu", label: "CPU", icon: CpuIcon },
          ]}
        />
      </div>

      {settings.engine !== "cpu" ? (
        <div className="space-y-1.5">
          <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            Matrix Pattern
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "8x8", label: "Bayer 8×8" },
                { id: "4x4", label: "Bayer 4×4" },
                { id: "2x2", label: "Bayer 2×2" },
                { id: "16x16", label: "Bayer 16×16" },
                { id: "halftone", label: "Halftone" },
                { id: "crosshatch", label: "Crosshatch" },
                { id: "clustered", label: "Clustered" },
                { id: "noise", label: "Noise" },
              ] as const
            ).map((item) => {
              const isSelected = settings.ditherType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ ditherType: item.id })}
                  className={cn(
                    "btn-press flex items-center justify-between border px-3 py-2.5 text-left font-mono text-xs font-bold transition-all",
                    isSelected
                      ? "border-white bg-white text-black shadow-sm"
                      : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {isSelected && (
                    <CheckIcon className="ml-1 h-4 w-4 shrink-0 font-bold text-black" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            Diffusion Algorithm
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "floyd-steinberg", label: "Floyd-Steinberg" },
                { id: "atkinson", label: "Atkinson" },
                { id: "sierra3", label: "Sierra-3" },
                { id: "sierra-lite", label: "Sierra Lite" },
                { id: "burkes", label: "Burkes" },
                { id: "stucki", label: "Stucki" },
                { id: "jarvis", label: "Jarvis" },
              ] as const
            ).map((item) => {
              const isSelected = settings.cpuAlgorithm === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ cpuAlgorithm: item.id })}
                  className={cn(
                    "btn-press flex items-center justify-between border px-3 py-2.5 text-left font-mono text-xs font-bold transition-all",
                    isSelected
                      ? "border-white bg-white text-black shadow-sm"
                      : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {isSelected && (
                    <CheckIcon className="ml-1 h-4 w-4 shrink-0 font-bold text-black" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-border/60 space-y-3.5 border-t pt-2.5">
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

      <div className="border-border/60 border-t pt-2.5">
        <label className="bg-secondary/40 border-border flex cursor-pointer items-center justify-between border p-2.5 font-mono text-xs transition-colors hover:border-white">
          <span className="font-bold tracking-wide text-white uppercase">▸ Invert Output</span>
          <input
            type="checkbox"
            checked={settings.inverted}
            onChange={(e) => onChange({ inverted: e.target.checked })}
            className="border-border focus:ring-ring h-4 w-4 cursor-pointer bg-black text-white accent-white focus:ring-offset-0"
          />
        </label>
      </div>
    </div>
  );

  const renderColorContent = () => (
    <div className="space-y-4 bg-black/40 p-3.5 sm:p-4">
      <div className="space-y-1.5">
        <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
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
        <div className="bg-secondary/30 border-border space-y-1.5 border p-3">
          <span className="mb-1.5 block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
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
          <p className="pt-1 font-mono text-[10px] text-neutral-400">
            Tip: Click any Hardware Palette below to load its colors into Duotone!
          </p>
        </div>
      )}

      {settings.colorMode === "paper" && (
        <div className="bg-secondary/30 border-border space-y-2.5 border p-3">
          <span className="mb-1.5 block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
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

      <div className="bg-secondary/30 border-border space-y-2 border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            <EyedropperIcon className="h-3.5 w-3.5 text-white" />
            <span>Auto-Palette from Image</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-neutral-400">PNNQUANT</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-neutral-300">Colors:</span>
          <div className="flex gap-1">
            {[2, 4, 8, 16].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setExtractCount(count)}
                className={cn(
                  "btn-press border px-2 py-0.5 font-mono text-[11px] transition-colors",
                  extractCount === count
                    ? "border-white bg-white font-bold text-black"
                    : "border-border bg-black/60 text-neutral-400 hover:text-white",
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
          className="bg-secondary border-border btn-press flex w-full items-center justify-center gap-2 border px-3 py-2 font-mono text-xs font-bold text-white transition-colors hover:border-white hover:bg-neutral-800 disabled:opacity-40"
        >
          <SparkleIcon className="h-3.5 w-3.5 text-white" />
          <span>
            {isExtractingPalette ? "EXTRACTING..." : `EXTRACT ${extractCount}-COLOR PALETTE`}
          </span>
        </button>
      </div>

      <div className="border-border/60 space-y-2 border-t pt-2.5">
        <div className="flex items-center justify-between">
          <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            Hardware Palettes
          </label>
          <span className="font-mono text-[10px] font-bold text-neutral-400">
            {settings.colorMode === "duotone"
              ? "CLICK SETS DUOTONE"
              : `${RETRO_PALETTES.length} PALETTES`}
          </span>
        </div>

        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:max-h-60">
          {RETRO_PALETTES.map((pal) => {
            const isSelected =
              settings.paletteId === pal.id ||
              (settings.colorMode === "duotone" &&
                settings.colorBack.toLowerCase() === pal.colors[0].toLowerCase() &&
                settings.colorFront.toLowerCase() ===
                  pal.colors[pal.colors.length - 1].toLowerCase());

            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => handleHardwarePaletteClick(pal)}
                className={cn(
                  "btn-press relative flex flex-col gap-2 border p-2.5 text-left font-mono transition-all",
                  isSelected
                    ? "border-2 border-white bg-neutral-900 text-white shadow-sm"
                    : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white",
                )}
                title={
                  settings.colorMode === "duotone"
                    ? `Set Duotone to ${pal.name} (${pal.colors[0]} & ${pal.colors[pal.colors.length - 1]})`
                    : `Apply ${pal.name}`
                }
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold">{pal.name}</span>
                  <span className="text-[10px] text-neutral-400">{pal.colors.length}c</span>
                </div>
                <div className="border-border flex h-3 w-full overflow-hidden border">
                  {pal.colors.map((c, i) => (
                    <div key={i} className="h-full flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-border/60 border-t pt-2.5">
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
  );

  const renderPresetsContent = () => (
    <div className="space-y-3.5 bg-black/40 p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            placeholder="Search presets (Game Boy, 1-Bit...)"
            className="border-border w-full border bg-black py-2 pr-8 pl-9 font-mono text-xs text-white transition-colors placeholder:text-neutral-500 focus:border-white focus:outline-none"
          />
          {presetSearch && (
            <button
              type="button"
              onClick={() => setPresetSearch("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-white"
              title="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const rnd = PRESETS[Math.floor(Math.random() * PRESETS.length)];
            if (rnd) onApplyPreset(rnd.preset);
          }}
          className="bg-secondary/60 border-border btn-press flex shrink-0 items-center gap-1.5 border px-2.5 py-2 font-mono text-xs font-bold text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-800 hover:text-white"
          title="Apply random curated preset"
        >
          <DiceFiveIcon className="text-primary h-3.5 w-3.5" />
          <span className="hidden sm:inline">RANDOM</span>
        </button>
      </div>

      <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1">
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
            cat.id === "all" ? PRESETS.length : PRESETS.filter((p) => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setPresetCategory(cat.id)}
              className={cn(
                "btn-press flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs whitespace-nowrap transition-all",
                isSelected
                  ? "border border-white bg-white font-bold text-black"
                  : "bg-secondary/40 hover:bg-secondary/70 border-border border text-neutral-300 hover:text-white",
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  "px-1 text-[10px] font-bold",
                  isSelected ? "text-black/80" : "text-neutral-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 sm:max-h-72">
        {PRESETS.filter((preset) => {
          const matchesCat = presetCategory === "all" || preset.category === presetCategory;
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
                "btn-press group relative flex w-full flex-col gap-1.5 border p-2.5 text-left transition-all",
                isCurrent
                  ? "border-2 border-white bg-neutral-900 shadow-sm"
                  : "bg-secondary/30 hover:bg-secondary/70 border-border hover:border-neutral-400",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-mono text-xs font-bold transition-colors",
                      isCurrent ? "text-white" : "text-foreground group-hover:text-white",
                    )}
                  >
                    {preset.name}
                  </span>
                  <span className="bg-secondary border-border shrink-0 border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-neutral-300 uppercase">
                    {preset.category}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isCurrent && <CheckIcon className="h-4 w-4 shrink-0 font-bold text-white" />}
                  <div className="border-border flex h-3 w-16 overflow-hidden border">
                    {preset.colors.map((c, i) => (
                      <div key={i} className="h-full flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <span className="line-clamp-1 font-mono text-[11px] text-neutral-400">
                {preset.desc}
              </span>
            </button>
          );
        })}

        {PRESETS.filter((preset) => {
          const matchesCat = presetCategory === "all" || preset.category === presetCategory;
          const query = presetSearch.trim().toLowerCase();
          return (
            matchesCat &&
            (!query ||
              preset.name.toLowerCase().includes(query) ||
              preset.desc.toLowerCase().includes(query))
          );
        }).length === 0 && (
          <div className="border-border space-y-1.5 border border-dashed p-4 text-center font-mono text-xs text-neutral-400">
            <p>No presets found matching "{presetSearch}"</p>
            <button
              type="button"
              onClick={() => {
                setPresetSearch("");
                setPresetCategory("all");
              }}
              className="text-xs font-bold text-white hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdjustContent = () => (
    <div className="space-y-4 bg-black/40 p-3.5 sm:p-4">
      <div className="space-y-1.5">
        <label className="block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
          Framing & Fit
        </label>
        <SegmentedControl
          value={settings.fit}
          onChange={(fit) => onChange({ fit })}
          options={[
            { value: "contain", label: "Fit", icon: ScanIcon },
            { value: "cover", label: "Fill", icon: CornersOutIcon },
            { value: "fill", label: "Stretch", icon: ArrowsOutLineVerticalIcon },
          ]}
        />
      </div>

      <div className="border-border/60 space-y-3.5 border-t pt-2.5">
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

      <div className="border-border/60 space-y-3.5 border-t pt-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            <SunIcon className="h-4 w-4 text-neutral-400" />
            Tone & Contrast
          </span>
          <button
            type="button"
            onClick={resetAdjustments}
            className="btn-press flex items-center gap-1 font-mono text-xs font-bold text-neutral-400 transition-colors hover:text-white"
            title="Reset adjustments to defaults"
          >
            <ArrowCounterClockwiseIcon className="h-3 w-3" />
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
  );

  return (
    <>
      <aside
        className="bg-card border-border hidden h-full shrink-0 flex-col overflow-hidden border-l select-none sm:flex sm:w-[320px] md:w-[350px] lg:w-[380px] xl:w-[410px]"
        style={{ borderLeftWidth: "1px" }}
      >
        <div className="border-border flex h-11 shrink-0 items-center justify-between border-b bg-neutral-950 px-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2 w-2 bg-white" />
            <span className="font-mono text-xs font-bold tracking-wider text-white uppercase sm:text-[13px]">
              STUDIO CONTROLS
            </span>
          </div>
        </div>

        <div className="divide-border text-foreground/90 flex-1 divide-y overflow-y-auto text-xs">
          <section className="bg-card">
            <SectionHeader
              title="SOURCE MEDIA"
              icon={ImageIcon}
              isOpen={openSections.media}
              onToggle={() => toggleSection("media")}
            />
            {openSections.media && renderMediaContent()}
          </section>

          <section className="bg-card">
            <SectionHeader
              title="DITHER MATRIX & ENGINE"
              icon={SlidersIcon}
              isOpen={openSections.dither}
              onToggle={() => toggleSection("dither")}
            />
            {openSections.dither && renderDitherContent()}
          </section>

          <section className="bg-card">
            <SectionHeader
              title="COLOR & PALETTES"
              icon={PaletteIcon}
              isOpen={openSections.color}
              onToggle={() => toggleSection("color")}
            />
            {openSections.color && renderColorContent()}
          </section>

          <section className="bg-card">
            <SectionHeader
              title="STYLE PRESETS"
              icon={BookmarkIcon}
              isOpen={openSections.presets}
              onToggle={() => toggleSection("presets")}
            />
            {openSections.presets && renderPresetsContent()}
          </section>

          <section className="bg-card">
            <SectionHeader
              title="FRAMING & ADJUSTMENTS"
              icon={SunIcon}
              isOpen={openSections.adjust}
              onToggle={() => toggleSection("adjust")}
            />
            {openSections.adjust && renderAdjustContent()}
          </section>
        </div>
      </aside>

      <div
        className={cn(
          "border-border bg-card z-30 flex shrink-0 flex-col border-t transition-[height] duration-150 ease-out select-none sm:hidden",
          mobileSheetState === "collapsed" && "h-[calc(3.5rem+env(safe-area-inset-bottom,0px))]",
          mobileSheetState === "docked" && "h-[48dvh] max-h-[48dvh]",
          mobileSheetState === "expanded" && "h-[78dvh] max-h-[78dvh]",
        )}
      >
        {mobileSheetState !== "collapsed" && (
          <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border-b bg-black/60">
            <div className="border-border flex h-10 shrink-0 items-center justify-between border-b bg-neutral-950 px-3">
              <div className="flex min-w-0 items-center gap-2">
                {mobileTab === "media" && <ImageIcon className="h-4 w-4 shrink-0 text-white" />}
                {mobileTab === "dither" && <SlidersIcon className="h-4 w-4 shrink-0 text-white" />}
                {mobileTab === "color" && <PaletteIcon className="h-4 w-4 shrink-0 text-white" />}
                {mobileTab === "presets" && (
                  <BookmarkIcon className="h-4 w-4 shrink-0 text-white" />
                )}
                {mobileTab === "adjust" && <SunIcon className="h-4 w-4 shrink-0 text-white" />}
                <span className="truncate font-mono text-xs font-bold tracking-wider text-white uppercase">
                  {mobileTab === "media" && "SOURCE MEDIA"}
                  {mobileTab === "dither" && "DITHER MATRIX"}
                  {mobileTab === "color" && "COLOR & PALETTES"}
                  {mobileTab === "presets" && "STYLE PRESETS"}
                  {mobileTab === "adjust" && "FRAMING & ADJUST"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setMobileSheetState((prev) => (prev === "docked" ? "expanded" : "docked"))
                  }
                  className="border-border btn-press flex items-center gap-1 border px-2 py-1 font-mono text-[10px] text-neutral-300 transition-colors hover:border-white hover:text-white"
                  title={mobileSheetState === "docked" ? "Expand panel" : "Dock panel"}
                >
                  {mobileSheetState === "docked" ? (
                    <>
                      <CaretUpIcon className="h-3 w-3" />
                      <span>EXPAND</span>
                    </>
                  ) : (
                    <>
                      <CaretDownIcon className="h-3 w-3" />
                      <span>HALF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setMobileSheetState("collapsed")}
                  className="btn-press flex items-center justify-center border border-transparent p-1 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
                  title="Collapse panel"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 touch-pan-y space-y-4 overflow-y-auto overscroll-contain p-3.5">
              {mobileTab === "media" && renderMediaContent()}
              {mobileTab === "dither" && renderDitherContent()}
              {mobileTab === "color" && renderColorContent()}
              {mobileTab === "presets" && renderPresetsContent()}
              {mobileTab === "adjust" && renderAdjustContent()}
            </div>
          </div>
        )}

        <nav
          aria-label="Studio Navigation"
          className="pb-safe divide-border/60 flex h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] shrink-0 items-stretch divide-x bg-neutral-950"
        >
          {[
            { id: "media" as const, label: "MEDIA", icon: ImageIcon },
            { id: "dither" as const, label: "DITHER", icon: SlidersIcon },
            { id: "color" as const, label: "COLOR", icon: PaletteIcon },
            { id: "presets" as const, label: "PRESETS", icon: BookmarkIcon },
            { id: "adjust" as const, label: "ADJUST", icon: SunIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = mobileTab === tab.id && mobileSheetState !== "collapsed";
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleMobileTabClick(tab.id)}
                className={cn(
                  "btn-press flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] transition-all",
                  isSelected
                    ? "bg-white font-bold text-black shadow-inner"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white",
                )}
              >
                <Icon className={cn("h-4 w-4", isSelected ? "text-black" : "text-neutral-300")} />
                <span className="text-[9px] tracking-wider sm:text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
