import {
  BookmarkIcon,
  CaretDownIcon,
  CaretUpIcon,
  ImageIcon,
  PaletteIcon,
  SlidersIcon,
  SunIcon,
  XIcon,
} from "@phosphor-icons/react";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { AdjustSection } from "./AdjustSection";
import { ColorSection } from "./ColorSection";
import { DitherSection } from "./DitherSection";
import { MediaSection } from "./MediaSection";
import { PresetsSection } from "./PresetsSection";

type MobileTab = "media" | "dither" | "color" | "presets" | "adjust";
type MobileSheetState = "collapsed" | "docked" | "expanded";

export const MobileSheet = memo(function MobileSheet() {
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

  return (
    <div
      className={cn(
        "border-border bg-card z-30 flex shrink-0 flex-col border-t transition-[height] duration-150 ease-out select-none",
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
              {mobileTab === "presets" && <BookmarkIcon className="h-4 w-4 shrink-0 text-white" />}
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
            {mobileTab === "media" && <MediaSection />}
            {mobileTab === "dither" && <DitherSection />}
            {mobileTab === "color" && <ColorSection />}
            {mobileTab === "presets" && <PresetsSection />}
            {mobileTab === "adjust" && <AdjustSection />}
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
  );
});
