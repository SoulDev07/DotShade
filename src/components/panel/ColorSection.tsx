import { EyedropperIcon, SparkleIcon } from "@phosphor-icons/react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { extractCpuPalette } from "@/engine/cpu-dither-client";
import { getPaletteRoles, RETRO_PALETTES } from "@/engine/palettes";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/state/studio-store";
import { ColorSwatchPicker, DualColorPicker } from "../ui/ColorSwatchPicker";
import { SegmentedControl } from "../ui/SegmentedControl";
import { SliderControl } from "../ui/SliderControl";

export const ColorSection = memo(function ColorSection() {
  const style = useStudioStore(
    useShallow((st) => ({
      colorMode: st.style.colorMode,
      colorBack: st.style.colorBack,
      colorFront: st.style.colorFront,
      colorHighlight: st.style.colorHighlight,
      paletteId: st.style.paletteId,
      colorSteps: st.style.colorSteps,
    })),
  );
  const mediaType = useStudioStore((st) => st.source.mediaType);
  const hasImage = useStudioStore((st) => st.decodedImage !== null);
  const setStyle = useStudioStore((st) => st.setStyle);
  const applyPalette = useStudioStore((st) => st.applyPalette);

  const [isExtractingPalette, setIsExtractingPalette] = useState(false);
  const [extractCount, setExtractCount] = useState(4);

  const handleExtractPalette = async () => {
    if (mediaType !== "image" || !hasImage) {
      toast.info("Please load an image first to extract its palette!");
      return;
    }
    setIsExtractingPalette(true);
    try {
      const colors = await extractCpuPalette(extractCount);
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

  return (
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
          disabled={isExtractingPalette || mediaType !== "image"}
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
});
