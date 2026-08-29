"use client";

import React, { useState } from "react";
import {
  Sliders,
  Palette,
  Image as ImageIcon,
  Video as VideoIcon,
  Camera,
  Sparkles,
  RotateCw,
  Sun,
  Contrast,
  Layers,
  Check,
  Plus,
  Trash2,
  Bookmark,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RETRO_PALETTES, type ColorPalette } from "@/engine/palettes";

export interface StudioSettings {
  mediaType: "image" | "video" | "webcam" | "procedural";
  mediaUrl: string;
  ditherType: "noise" | "2x2" | "4x4" | "8x8" | "16x16" | "halftone" | "crosshatch" | "clustered";
  cpuAlgorithm?: "floyd-steinberg" | "atkinson" | "sierra3" | "sierra-lite" | "burkes" | "stucki" | "jarvis";
  engineMode: "gpu" | "cpu";
  pxSize: number;
  threshold: number;
  halftoneAngle: number;
  halftoneScale: number;
  colorMode: "paper" | "duotone" | "original" | "palette" | "grayscale";
  colorBack: string;
  colorFront: string;
  colorHighlight: string;
  paletteId: string;
  customPalette: string[];
  colorSteps: number;
  inverted: boolean;
  fit: "contain" | "cover" | "fill";
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  proceduralShape: "simplex" | "warp" | "dots" | "waves" | "ripple" | "swirl" | "sphere";
  animated: boolean;
  animationSpeed: number;
}

interface ControlPanelProps {
  settings: StudioSettings;
  onChange: (updater: Partial<StudioSettings>) => void;
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onToggleWebcam: () => void;
  isWebcamActive: boolean;
  onOpenExport: () => void;
  onApplyPreset: (preset: Partial<StudioSettings>) => void;
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

export function ControlPanel({
  settings,
  onChange,
  onUploadImage,
  onUploadVideo,
  onToggleWebcam,
  isWebcamActive,
  onOpenExport,
  onApplyPreset,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<"media" | "dither" | "colors" | "adjust" | "presets">("dither");
  const [newColorInput, setNewColorInput] = useState("#ff007f");

  const addCustomColor = () => {
    if (!settings.customPalette.includes(newColorInput) && settings.customPalette.length < 16) {
      onChange({ customPalette: [...settings.customPalette, newColorInput] });
    }
  };

  const removeCustomColor = (index: number) => {
    if (settings.customPalette.length > 2) {
      const next = settings.customPalette.filter((_, i) => i !== index);
      onChange({ customPalette: next });
    }
  };

  return (
    <aside className="w-full lg:w-96 bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-800 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Sidebar Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 p-2 bg-neutral-950/60">
        <button
          onClick={() => setActiveTab("media")}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
            activeTab === "media"
              ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Source</span>
        </button>

        <button
          onClick={() => setActiveTab("dither")}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
            activeTab === "dither"
              ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Dither</span>
        </button>

        <button
          onClick={() => setActiveTab("colors")}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
            activeTab === "colors"
              ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <Palette className="w-4 h-4" />
          <span>Colors</span>
        </button>

        <button
          onClick={() => setActiveTab("adjust")}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
            activeTab === "adjust"
              ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <Sun className="w-4 h-4" />
          <span>Transform</span>
        </button>

        <button
          onClick={() => setActiveTab("presets")}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all",
            activeTab === "presets"
              ? "bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <Bookmark className="w-4 h-4" />
          <span>Presets</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
        {/* --- 1. MEDIA SOURCE TAB --- */}
        {activeTab === "media" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                Input Source
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-2 p-3 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 rounded-xl cursor-pointer transition-all text-xs font-medium text-neutral-200">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadImage(e.target.files[0]);
                    }}
                  />
                </label>

                <label className="flex items-center justify-center gap-2 p-3 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 rounded-xl cursor-pointer transition-all text-xs font-medium text-neutral-200">
                  <VideoIcon className="w-4 h-4 text-blue-400" />
                  <span>Upload Video</span>
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
                  onClick={onToggleWebcam}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 border rounded-xl transition-all text-xs font-medium",
                    isWebcamActive
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-neutral-800/80 hover:bg-neutral-700/80 border-neutral-700 text-neutral-200"
                  )}
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>{isWebcamActive ? "Stop Webcam" : "Live Webcam"}</span>
                </button>

                <button
                  onClick={() => onChange({ mediaType: "procedural" })}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 border rounded-xl transition-all text-xs font-medium",
                    settings.mediaType === "procedural"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-neutral-800/80 hover:bg-neutral-700/80 border-neutral-700 text-neutral-200"
                  )}
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Procedural</span>
                </button>
              </div>
            </div>

            {/* Procedural Generator Selection */}
            {settings.mediaType === "procedural" && (
              <div className="space-y-3 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 block">
                  Procedural Shader Shape
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    ["simplex", "warp", "dots", "waves", "ripple", "swirl", "sphere"] as const
                  ).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => onChange({ proceduralShape: shape })}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs capitalize border text-left transition-all",
                        settings.proceduralShape === shape
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                          : "border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      )}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Gallery */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                Sample Library
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_MEDIA.map((item) => (
                  <button
                    key={item.name}
                    onClick={() =>
                      onChange({
                        mediaType: "image",
                        mediaUrl: item.url,
                      })
                    }
                    className="p-2 bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-left text-xs text-neutral-300 transition-all flex flex-col gap-1"
                  >
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">{item.type}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 2. DITHER ALGORITHMS TAB --- */}
        {activeTab === "dither" && (
          <div className="space-y-5">
            {/* Engine Mode */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Dithering Engine
                </label>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {settings.engineMode.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-neutral-950/80 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => onChange({ engineMode: "gpu" })}
                  className={cn(
                    "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                    settings.engineMode === "gpu"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  WebGL2 GPU (60fps)
                </button>
                <button
                  onClick={() => onChange({ engineMode: "cpu" })}
                  className={cn(
                    "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                    settings.engineMode === "cpu"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  CPU Diffusion
                </button>
              </div>
            </div>

            {/* GPU Shader Algorithms */}
            {settings.engineMode === "gpu" ? (
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                  Shader Dither Pattern
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "8x8", label: "Bayer 8x8 (Default)" },
                      { id: "4x4", label: "Bayer 4x4" },
                      { id: "2x2", label: "Bayer 2x2" },
                      { id: "16x16", label: "Bayer 16x16" },
                      { id: "noise", label: "Random Noise" },
                      { id: "halftone", label: "Halftone Dot Screen" },
                      { id: "crosshatch", label: "Crosshatch Screen" },
                      { id: "clustered", label: "Clustered Print" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onChange({ ditherType: item.id })}
                      className={cn(
                        "p-2 rounded-lg text-xs border text-left transition-all",
                        settings.ditherType === item.id
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* CPU Error Diffusion Algorithms */
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                  Error Diffusion Algorithm
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "floyd-steinberg", label: "Floyd-Steinberg" },
                      { id: "atkinson", label: "Atkinson (1-Bit Mac)" },
                      { id: "sierra3", label: "Sierra-3" },
                      { id: "sierra-lite", label: "Sierra Lite" },
                      { id: "burkes", label: "Burkes" },
                      { id: "stucki", label: "Stucki" },
                      { id: "jarvis", label: "Jarvis-Judice" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onChange({ cpuAlgorithm: item.id })}
                      className={cn(
                        "p-2 rounded-lg text-xs border text-left transition-all",
                        settings.cpuAlgorithm === item.id
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sliders: Pixel Size & Threshold */}
            <div className="space-y-4 pt-2 border-t border-neutral-800">
              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-neutral-400">Pixel Grid Size</span>
                  <span className="text-emerald-400 font-semibold">{settings.pxSize} px</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={settings.pxSize}
                  onChange={(e) => onChange({ pxSize: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-neutral-400">Dither Threshold Bias</span>
                  <span className="text-emerald-400 font-semibold">{settings.threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.02}
                  value={settings.threshold}
                  onChange={(e) => onChange({ threshold: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {settings.ditherType === "halftone" && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-neutral-400">Halftone Screen Angle</span>
                      <span className="text-emerald-400 font-semibold">{settings.halftoneAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={settings.halftoneAngle}
                      onChange={(e) => onChange({ halftoneAngle: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-neutral-400">Halftone Dot Scale</span>
                      <span className="text-emerald-400 font-semibold">{settings.halftoneScale}x</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={0.5}
                      value={settings.halftoneScale}
                      onChange={(e) => onChange({ halftoneScale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Animation Toggle & Speed */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    Live Noise Animation
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.animated}
                    onChange={(e) => onChange({ animated: e.target.checked })}
                    className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                {settings.animated && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-neutral-400">Animation Speed</span>
                      <span className="text-emerald-400 font-semibold">{settings.animationSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      value={settings.animationSpeed}
                      onChange={(e) => onChange({ animationSpeed: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 3. COLORS & PALETTE TAB --- */}
        {activeTab === "colors" && (
          <div className="space-y-5">
            {/* Color Mode Switcher */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                Color Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "paper", label: "3-Color Ramp" },
                    { id: "duotone", label: "Duotone" },
                    { id: "original", label: "Original" },
                    { id: "palette", label: "Retro Palette" },
                    { id: "grayscale", label: "Grayscale" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onChange({ colorMode: mode.id })}
                    className={cn(
                      "py-2 px-1 rounded-lg text-xs font-medium border text-center transition-all",
                      settings.colorMode === mode.id
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                        : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Invert Luminance */}
            <div className="flex items-center justify-between p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
              <span className="text-xs font-medium text-neutral-300">Invert Luminance</span>
              <input
                type="checkbox"
                checked={settings.inverted}
                onChange={(e) => onChange({ inverted: e.target.checked })}
                className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Paper 3-Color Mode Pickers */}
            {settings.colorMode === "paper" && (
              <div className="space-y-3 p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 block">
                  3-Color Ramp Settings
                </label>

                {/* colorBack */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">colorBack</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.colorBack}
                      onChange={(e) => onChange({ colorBack: e.target.value })}
                      className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.colorBack}
                      onChange={(e) => onChange({ colorBack: e.target.value })}
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-200"
                    />
                  </div>
                </div>

                {/* colorFront */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">colorFront</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.colorFront}
                      onChange={(e) => onChange({ colorFront: e.target.value })}
                      className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.colorFront}
                      onChange={(e) => onChange({ colorFront: e.target.value })}
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-200"
                    />
                  </div>
                </div>

                {/* colorHighlight */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">colorHighlight</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.colorHighlight}
                      onChange={(e) => onChange({ colorHighlight: e.target.value })}
                      className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.colorHighlight}
                      onChange={(e) => onChange({ colorHighlight: e.target.value })}
                      className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-neutral-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duotone Mode */}
            {settings.colorMode === "duotone" && (
              <div className="space-y-3 p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 block">
                  Duotone Colors
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">Dark Tone</span>
                  <input
                    type="color"
                    value={settings.colorBack}
                    onChange={(e) => onChange({ colorBack: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">Light Tone</span>
                  <input
                    type="color"
                    value={settings.colorFront}
                    onChange={(e) => onChange({ colorFront: e.target.value })}
                    className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Original Color Steps */}
            {settings.colorMode === "original" && (
              <div className="space-y-3 p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">Color Quantization Steps</span>
                  <span className="text-emerald-400 font-semibold">{settings.colorSteps} levels</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={settings.colorSteps}
                  onChange={(e) => onChange({ colorSteps: parseInt(e.target.value, 10) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Retro Palettes Library */}
            {settings.colorMode === "palette" && (
              <div className="space-y-4">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                  Retro Color Palettes
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {RETRO_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      onClick={() =>
                        onChange({
                          paletteId: pal.id,
                          customPalette: pal.colors,
                        })
                      }
                      className={cn(
                        "w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3",
                        settings.paletteId === pal.id
                          ? "bg-neutral-800 border-emerald-500 shadow-sm"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-200 truncate">{pal.name}</div>
                        <div className="text-[10px] text-neutral-500">{pal.colors.length} colors</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {pal.colors.slice(0, 5).map((c, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-black/40"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Palette Builder */}
                <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                      Active Palette Swatches
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {settings.customPalette.length}/16
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {settings.customPalette.map((col, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className="w-6 h-6 rounded-md border border-neutral-700 cursor-pointer"
                          style={{ backgroundColor: col }}
                        />
                        {settings.customPalette.length > 2 && (
                          <button
                            onClick={() => removeCustomColor(idx)}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={newColorInput}
                      onChange={(e) => setNewColorInput(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <button
                      onClick={addCustomColor}
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Color
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 4. TRANSFORMS & ADJUSTMENTS TAB --- */}
        {activeTab === "adjust" && (
          <div className="space-y-5">
            {/* Object Fit */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                Object Fit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["cover", "contain", "fill"] as const).map((fit) => (
                  <button
                    key={fit}
                    onClick={() => onChange({ fit })}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-xs capitalize border transition-all",
                      settings.fit === fit
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                        : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                    )}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale / Zoom */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Scale / Zoom</span>
                <span className="text-emerald-400 font-semibold">{settings.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.05}
                value={settings.scale}
                onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Rotation Angle</span>
                <span className="text-emerald-400 font-semibold">{settings.rotation}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={settings.rotation}
                onChange={(e) => onChange({ rotation: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Brightness</span>
                <span className="text-emerald-400 font-semibold">{settings.brightness > 0 ? `+${settings.brightness.toFixed(2)}` : settings.brightness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.5}
                max={0.5}
                step={0.02}
                value={settings.brightness}
                onChange={(e) => onChange({ brightness: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Contrast</span>
                <span className="text-emerald-400 font-semibold">{settings.contrast.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.05}
                value={settings.contrast}
                onChange={(e) => onChange({ contrast: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Saturation</span>
                <span className="text-emerald-400 font-semibold">{settings.saturation.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={2.0}
                step={0.05}
                value={settings.saturation}
                onChange={(e) => onChange({ saturation: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Gamma */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-neutral-400">Gamma Curve</span>
                <span className="text-emerald-400 font-semibold">{settings.gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={settings.gamma}
                onChange={(e) => onChange({ gamma: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* --- 5. PRESETS TAB --- */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
              Curated Style Presets
            </label>

            <div className="space-y-2">
              {[
                {
                  name: "Paper Mint (Default)",
                  desc: "Paper Shaders 8x8 matrix with navy & lime mint.",
                  preset: {
                    ditherType: "8x8" as const,
                    colorMode: "paper" as const,
                    colorBack: "#000c38",
                    colorFront: "#94ffaf",
                    colorHighlight: "#eaff94",
                    pxSize: 2,
                    colorSteps: 2,
                    threshold: 0.5,
                  },
                },
                {
                  name: "Cyberpunk 2077",
                  desc: "Neon magenta & electric cyan 4x4 matrix.",
                  preset: {
                    ditherType: "4x4" as const,
                    colorMode: "palette" as const,
                    paletteId: "cyberpunk-neon",
                    customPalette: ["#080417", "#ff007f", "#00f0ff", "#ffe600"],
                    pxSize: 2.5,
                    threshold: 0.48,
                  },
                },
                {
                  name: "Game Boy DMG",
                  desc: "Authentic 1989 Nintendo 4-shade olive LCD.",
                  preset: {
                    ditherType: "8x8" as const,
                    colorMode: "palette" as const,
                    paletteId: "gameboy-dmg",
                    customPalette: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
                    pxSize: 3,
                    threshold: 0.5,
                  },
                },
                {
                  name: "1-Bit Macintosh",
                  desc: "Pure 1984 Apple Atkinson error diffusion.",
                  preset: {
                    engineMode: "cpu" as const,
                    cpuAlgorithm: "atkinson" as const,
                    colorMode: "grayscale" as const,
                    pxSize: 1,
                    threshold: 0.5,
                  },
                },
                {
                  name: "CRT Green Terminal",
                  desc: "Vintage phosphor terminal scan.",
                  preset: {
                    ditherType: "8x8" as const,
                    colorMode: "paper" as const,
                    colorBack: "#051505",
                    colorFront: "#18b532",
                    colorHighlight: "#4aff68",
                    pxSize: 2,
                    threshold: 0.52,
                  },
                },
                {
                  name: "Pop Art Halftone",
                  desc: "45-degree angled CMYK comic dot screen.",
                  preset: {
                    ditherType: "halftone" as const,
                    halftoneAngle: 45,
                    halftoneScale: 2.5,
                    colorMode: "paper" as const,
                    colorBack: "#ffffff",
                    colorFront: "#e11d48",
                    colorHighlight: "#facc15",
                    pxSize: 2,
                    threshold: 0.5,
                  },
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onApplyPreset(item.preset)}
                  className="w-full p-3 bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 rounded-xl text-left transition-all group"
                >
                  <div className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer Export Button */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950/90">
        <button
          onClick={onOpenExport}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          <span>Export & Copy Code</span>
        </button>
      </div>
    </aside>
  );
}
