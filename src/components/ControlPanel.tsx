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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { extractPaletteFromImageData } from "@/engine/gif-export";
import { getPaletteRoles, RETRO_PALETTES } from "@/engine/palettes";
import { getPresetSwatches, PRESET_CATEGORIES, PRESETS, SAMPLE_MEDIA } from "@/engine/presets";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/state/studio-store";
import { ColorSwatchPicker, DualColorPicker } from "./ui/ColorSwatchPicker";
import { SegmentedControl } from "./ui/SegmentedControl";
import { SliderControl } from "./ui/SliderControl";

interface ControlPanelProps {
  onUploadImage: (file: File) => void;
  onUploadVideo: (file: File) => void;
  onToggleWebcam: () => void;
}

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

export function ControlPanel({ onUploadImage, onUploadVideo, onToggleWebcam }: ControlPanelProps) {
  const style = useStudioStore((st) => st.style);
  const frame = useStudioStore((st) => st.frame);
  const source = useStudioStore((st) => st.source);
  const isWebcamActive = useStudioStore((st) => st.isWebcamActive);
  const activePresetId = useStudioStore((st) => st.activePresetId);
  const { setStyle, setFrame, setSource, applyPreset, applyPalette, resetAdjustments } =
    useStudioStore(
      useShallow((st) => ({
        setStyle: st.setStyle,
        setFrame: st.setFrame,
        setSource: st.setSource,
        applyPreset: st.applyPreset,
        applyPalette: st.applyPalette,
        resetAdjustments: st.resetAdjustments,
      })),
    );

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PRESETS) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, []);

  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();
    return PRESETS.filter((preset) => {
      if (presetCategory !== "all" && preset.category !== presetCategory) return false;
      return (
        !query ||
        preset.name.toLowerCase().includes(query) ||
        preset.desc.toLowerCase().includes(query) ||
        preset.category.toLowerCase().includes(query)
      );
    });
  }, [presetCategory, presetSearch]);

  const [isExtractingPalette, setIsExtractingPalette] = useState(false);
  const [extractCount, setExtractCount] = useState(4);

  const handleExtractPalette = async () => {
    if (source.mediaType !== "image" || !source.mediaUrl) {
      toast.info("Please load an image first to extract its palette!");
      return;
    }
    setIsExtractingPalette(true);
    try {
      const img = new Image();
      if (source.mediaUrl.startsWith("http://") || source.mediaUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = source.mediaUrl;
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
        const roles = getPaletteRoles({ colors });
        setStyle({
          paletteId: "custom",
          palette: colors,
          colorMode: "palette",
          colorBack: roles.back,
          colorFront: roles.front,
          colorHighlight: roles.highlight,
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
          onClick={() => setSource({ mediaType: "procedural" })}
          className={cn(
            "btn-press flex items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs font-bold transition-colors",
            source.mediaType === "procedural" && !isWebcamActive
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
            const isSelected = source.mediaUrl === item.url && source.mediaType === "image";
            return (
              <button
                key={item.name}
                type="button"
                onClick={() =>
                  setSource({ mediaType: "image", mediaUrl: item.url, animated: false })
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
          value={style.engine}
          onChange={(engine) => setStyle({ engine })}
          options={[
            { value: "vgpu", label: "WebGPU", icon: LightningIcon },
            { value: "webgl", label: "WebGL", icon: StackIcon },
            { value: "cpu", label: "CPU", icon: CpuIcon },
          ]}
        />
      </div>

      {style.engine !== "cpu" ? (
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
              const isSelected = style.ditherType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStyle({ ditherType: item.id })}
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
              const isSelected = style.cpuAlgorithm === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStyle({ cpuAlgorithm: item.id })}
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
          setting="pxSize"
          label="Pixel Size"
          value={style.pxSize}
          unit="px"
          onChange={(pxSize) => setStyle({ pxSize })}
        />

        <SliderControl
          setting="threshold"
          label="Threshold Bias"
          value={style.threshold}
          onChange={(threshold) => setStyle({ threshold })}
        />

        {style.ditherType === "halftone" && (
          <>
            <SliderControl
              setting="halftoneAngle"
              label="Screen Angle"
              value={style.halftoneAngle}
              unit="°"
              onChange={(halftoneAngle) => setStyle({ halftoneAngle })}
            />
            <SliderControl
              setting="halftoneScale"
              label="Dot Scale"
              value={style.halftoneScale}
              onChange={(halftoneScale) => setStyle({ halftoneScale })}
            />
          </>
        )}
      </div>

      <div className="border-border/60 border-t pt-2.5">
        <label className="bg-secondary/40 border-border flex cursor-pointer items-center justify-between border p-2.5 font-mono text-xs transition-colors hover:border-white">
          <span className="font-bold tracking-wide text-white uppercase">▸ Invert Output</span>
          <input
            type="checkbox"
            checked={style.inverted}
            onChange={(e) => setStyle({ inverted: e.target.checked })}
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
          value={style.colorMode}
          onChange={(colorMode) => setStyle({ colorMode })}
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

      {style.colorMode === "duotone" && (
        <div className="bg-secondary/30 border-border space-y-1.5 border p-3">
          <span className="mb-1.5 block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            Duotone Shades
          </span>
          <DualColorPicker
            backLabel="Dark Shade"
            frontLabel="Light Shade"
            colorBack={style.colorBack}
            colorFront={style.colorFront}
            onBackChange={(colorBack) => setStyle({ colorBack })}
            onFrontChange={(colorFront) => setStyle({ colorFront })}
            onSwap={() =>
              setStyle({
                colorBack: style.colorFront,
                colorFront: style.colorBack,
              })
            }
          />
          <p className="pt-1 font-mono text-[10px] text-neutral-400">
            Tip: Click any Hardware Palette below to load its colors into Duotone!
          </p>
        </div>
      )}

      {style.colorMode === "paper" && (
        <div className="bg-secondary/30 border-border space-y-2.5 border p-3">
          <span className="mb-1.5 block font-mono text-xs font-bold tracking-wider text-neutral-200 uppercase">
            Paper Inks
          </span>
          <DualColorPicker
            backLabel="Background"
            frontLabel="Foreground"
            colorBack={style.colorBack}
            colorFront={style.colorFront}
            onBackChange={(colorBack) => setStyle({ colorBack })}
            onFrontChange={(colorFront) => setStyle({ colorFront })}
            onSwap={() =>
              setStyle({
                colorBack: style.colorFront,
                colorFront: style.colorBack,
              })
            }
          />
          <ColorSwatchPicker
            label="Highlight"
            color={style.colorHighlight}
            onChange={(colorHighlight) => setStyle({ colorHighlight })}
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
          disabled={isExtractingPalette || source.mediaType !== "image"}
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
            {style.colorMode === "duotone"
              ? "CLICK SETS DUOTONE"
              : `${RETRO_PALETTES.length} PALETTES`}
          </span>
        </div>

        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:max-h-60">
          {RETRO_PALETTES.map((pal) => {
            const roles = getPaletteRoles(pal);
            const isSelected =
              style.paletteId === pal.id ||
              (style.colorMode === "duotone" &&
                style.colorBack.toLowerCase() === roles.back.toLowerCase() &&
                style.colorFront.toLowerCase() === roles.front.toLowerCase());

            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => applyPalette(pal.id)}
                className={cn(
                  "btn-press relative flex flex-col gap-2 border p-2.5 text-left font-mono transition-all",
                  isSelected
                    ? "border-2 border-white bg-neutral-900 text-white shadow-sm"
                    : "bg-secondary/40 border-border text-foreground hover:border-white hover:text-white",
                )}
                title={
                  style.colorMode === "duotone"
                    ? `Set Duotone to ${pal.name} (${roles.back} & ${roles.front})`
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
          setting="colorSteps"
          label="Quantization Steps"
          value={style.colorSteps}
          onChange={(colorSteps) => setStyle({ colorSteps })}
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
            applyPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)].id);
          }}
          className="bg-secondary/60 border-border btn-press flex shrink-0 items-center gap-1.5 border px-2.5 py-2 font-mono text-xs font-bold text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-800 hover:text-white"
          title="Apply random curated preset"
        >
          <DiceFiveIcon className="text-primary h-3.5 w-3.5" />
          <span className="hidden sm:inline">RANDOM</span>
        </button>
      </div>

      <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1">
        {PRESET_CATEGORIES.map((cat) => {
          const isSelected = presetCategory === cat.id;
          const count = cat.id === "all" ? PRESETS.length : categoryCounts[cat.id];
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
        {filteredPresets.map((preset) => {
          const isCurrent = activePresetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
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
                    {getPresetSwatches(preset).map((c, i) => (
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

        {filteredPresets.length === 0 && (
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
          value={frame.fit}
          onChange={(fit) => setFrame({ fit })}
          options={[
            { value: "contain", label: "Fit", icon: ScanIcon },
            { value: "cover", label: "Fill", icon: CornersOutIcon },
            { value: "fill", label: "Stretch", icon: ArrowsOutLineVerticalIcon },
          ]}
        />
      </div>

      <div className="border-border/60 space-y-3.5 border-t pt-2.5">
        <SliderControl
          setting="scale"
          label="Scale"
          value={frame.scale}
          unit="x"
          onChange={(scale) => setFrame({ scale })}
        />

        <SliderControl
          setting="rotation"
          label="Rotation"
          value={frame.rotation}
          unit="°"
          onChange={(rotation) => setFrame({ rotation })}
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
          setting="brightness"
          label="Brightness"
          value={style.brightness}
          formatValue={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
          onChange={(brightness) => setStyle({ brightness })}
        />

        <SliderControl
          setting="contrast"
          label="Contrast"
          value={style.contrast}
          unit="x"
          onChange={(contrast) => setStyle({ contrast })}
        />

        <SliderControl
          setting="saturation"
          label="Saturation"
          value={style.saturation}
          unit="x"
          onChange={(saturation) => setStyle({ saturation })}
        />

        <SliderControl
          setting="gamma"
          label="Gamma"
          value={style.gamma}
          unit="x"
          onChange={(gamma) => setStyle({ gamma })}
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
