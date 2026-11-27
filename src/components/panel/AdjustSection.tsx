import {
  ArrowCounterClockwiseIcon,
  ArrowsOutLineVerticalIcon,
  CornersOutIcon,
  ScanIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStudioStore } from "@/state/studio-store";
import { SegmentedControl } from "../ui/SegmentedControl";
import { SliderControl } from "../ui/SliderControl";

export const AdjustSection = memo(function AdjustSection() {
  const style = useStudioStore(
    useShallow((st) => ({
      brightness: st.style.brightness,
      contrast: st.style.contrast,
      saturation: st.style.saturation,
      gamma: st.style.gamma,
    })),
  );
  const frame = useStudioStore(
    useShallow((st) => ({ fit: st.frame.fit, scale: st.frame.scale, rotation: st.frame.rotation })),
  );
  const setStyle = useStudioStore((st) => st.setStyle);
  const setFrame = useStudioStore((st) => st.setFrame);
  const resetAdjustments = useStudioStore((st) => st.resetAdjustments);

  return (
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
});
