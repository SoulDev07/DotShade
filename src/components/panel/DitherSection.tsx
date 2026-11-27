import { CheckIcon, CpuIcon, LightningIcon, StackIcon } from "@phosphor-icons/react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/state/studio-store";
import { SegmentedControl } from "../ui/SegmentedControl";
import { SliderControl } from "../ui/SliderControl";

export const DitherSection = memo(function DitherSection() {
  const style = useStudioStore(
    useShallow((st) => ({
      engine: st.style.engine,
      ditherType: st.style.ditherType,
      cpuAlgorithm: st.style.cpuAlgorithm,
      pxSize: st.style.pxSize,
      threshold: st.style.threshold,
      halftoneAngle: st.style.halftoneAngle,
      halftoneScale: st.style.halftoneScale,
      inverted: st.style.inverted,
    })),
  );
  const setStyle = useStudioStore((st) => st.setStyle);

  return (
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
});
