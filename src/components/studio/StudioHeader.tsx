import {
  ArrowCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  DiceFiveIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  SquareSplitHorizontalIcon,
} from "@phosphor-icons/react";
import { memo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { randomizeStudio, resetStudio, toggleOriginal } from "@/state/media-actions";
import { useStudioStore } from "@/state/studio-store";
import { DotShadeLogo } from "../ui/DotShadeLogo";
import { MobileOptionsMenu } from "./MobileOptionsMenu";

interface StudioHeaderProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  openExport: () => void;
  prefetchExport: () => void;
}

const ACTIVE = "bg-primary text-primary-foreground border-primary border font-bold";
const IDLE =
  "text-muted-foreground hover:text-foreground hover:border-border border border-transparent";
const DISABLED = "text-muted-foreground/50 cursor-not-allowed border border-transparent opacity-40";

export const StudioHeader = memo(function StudioHeader({
  isFullscreen,
  toggleFullscreen,
  openExport,
  prefetchExport,
}: StudioHeaderProps) {
  const { engine, mediaDimensions, fit, zoom, isSplitView, isViewingOriginal } = useStudioStore(
    useShallow((s) => ({
      engine: s.style.engine,
      mediaDimensions: s.mediaDimensions,
      fit: s.frame.fit,
      zoom: s.zoom,
      isSplitView: s.isSplitView,
      isViewingOriginal: s.isViewingOriginal,
    })),
  );
  const compareDisabled = useStudioStore(
    (s) => s.source.mediaType === "procedural" && !s.isWebcamActive,
  );
  const setFrame = useStudioStore((s) => s.setFrame);
  const setZoom = useStudioStore((s) => s.setZoom);

  // Hold the source button to peek at the original; a short click toggles it.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeldRef = useRef(false);

  useEffect(
    () => () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    },
    [],
  );

  const handlePointerDown = useCallback(() => {
    const { source, isWebcamActive } = useStudioStore.getState();
    if (source.mediaType === "procedural" && !isWebcamActive) return;
    isHeldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      isHeldRef.current = true;
      const s = useStudioStore.getState();
      s.setSplitView(false);
      s.setViewingOriginal(true);
    }, 180);
  }, []);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHeldRef.current) {
      isHeldRef.current = false;
      useStudioStore.getState().setViewingOriginal(false);
    }
  }, []);

  const handleOriginalClick = useCallback(() => {
    if (!isHeldRef.current) toggleOriginal();
  }, []);

  return (
    <header
      className="border-border bg-card z-30 flex h-12 shrink-0 items-center justify-between gap-1.5 border-b px-2.5 sm:gap-3 sm:px-4"
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.08)" }}
    >
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <DotShadeLogo size={18} />
        <span className="font-mono text-xs font-bold tracking-wider text-white uppercase">
          DotShade
        </span>
        <span
          className="bg-secondary border-border text-foreground hidden border px-2 py-0.5 font-mono text-[10px] font-medium uppercase sm:inline-block"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
        >
          {engine}
        </span>
        {mediaDimensions && (
          <span className="text-muted-foreground border-border hidden border-l pl-2.5 font-mono text-[10px] md:inline-block">
            {mediaDimensions.width} × {mediaDimensions.height} px
          </span>
        )}
      </div>

      <div
        className="bg-secondary/80 border-border flex shrink-0 items-center border p-0.5"
        style={{ gap: "1px" }}
      >
        <button
          type="button"
          onClick={() => {
            const s = useStudioStore.getState();
            s.setViewingOriginal(false);
            s.setSplitView(false);
          }}
          className={cn(
            "btn-press px-2 py-1 font-mono text-[11px] transition-all sm:px-2.5 sm:text-xs",
            !isViewingOriginal && !isSplitView ? ACTIVE : IDLE,
          )}
        >
          DITHER
        </button>
        <button
          type="button"
          onClick={() => {
            const s = useStudioStore.getState();
            if (s.source.mediaType === "procedural" && !s.isWebcamActive) {
              toast.info("Split view is not applicable for procedural mode");
              return;
            }
            s.setViewingOriginal(false);
            s.setSplitView((prev) => !prev);
          }}
          disabled={compareDisabled}
          className={cn(
            "btn-press flex items-center gap-1 px-2 py-1 font-mono text-xs transition-all sm:gap-1.5 sm:px-2.5",
            compareDisabled ? DISABLED : isSplitView ? ACTIVE : IDLE,
          )}
          title="Split Comparison (S)"
        >
          <SquareSplitHorizontalIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">SPLIT</span>
        </button>
        <button
          type="button"
          onClick={handleOriginalClick}
          onPointerDown={handlePointerDown}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          disabled={compareDisabled}
          className={cn(
            "btn-press flex items-center gap-1 px-2 py-1 font-mono text-xs transition-all sm:gap-1.5 sm:px-2.5",
            compareDisabled ? DISABLED : isViewingOriginal ? ACTIVE : IDLE,
          )}
          title="View Original (Click to toggle, hold to peek, or press 'O')"
        >
          {isViewingOriginal ? (
            <EyeSlashIcon className="h-3.5 w-3.5" />
          ) : (
            <EyeIcon className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">SOURCE</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div
          className="bg-secondary/80 border-border hidden items-center border p-0.5 xl:flex"
          style={{ gap: "1px" }}
        >
          {(
            [
              ["contain", "FIT", "Fit to stage"],
              ["cover", "FILL", "Fill stage"],
            ] as const
          ).map(([value, label, title]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrame({ fit: value })}
              className={cn(
                "btn-press px-2 py-0.5 font-mono text-[11px] transition-all",
                fit === value
                  ? ACTIVE
                  : "text-muted-foreground hover:text-foreground border border-transparent",
              )}
              title={title}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="bg-secondary/80 border-border hidden items-center border px-1 py-0.5 xl:flex"
          style={{ gap: "1px" }}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
            className="text-muted-foreground hover:text-primary btn-press flex h-5 w-5 items-center justify-center font-mono text-xs transition-colors"
            title="Zoom out (-)"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-primary hover:text-foreground px-1.5 font-mono text-[11px] tabular-nums transition-colors"
            title="Reset zoom (0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
            className="text-muted-foreground hover:text-primary btn-press flex h-5 w-5 items-center justify-center font-mono text-xs transition-colors"
            title="Zoom in (+)"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={randomizeStudio}
          className="bg-secondary border-border btn-press flex items-center gap-1 border px-2 py-1 font-mono text-xs text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-800 hover:text-white"
          title="Randomize style (X)"
        >
          <DiceFiveIcon className="text-primary h-3.5 w-3.5" />
          <span className="hidden font-bold sm:inline">RANDOM</span>
        </button>

        <button
          type="button"
          onClick={resetStudio}
          className="bg-secondary hover:bg-secondary/80 border-border hover:border-border-hover text-muted-foreground hover:text-foreground btn-press hidden border p-1.5 font-mono text-xs transition-colors xl:flex"
          title="Reset Settings (R)"
        >
          <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="bg-secondary hover:bg-secondary/80 border-border hover:border-border-hover text-muted-foreground hover:text-foreground btn-press hidden border p-1.5 font-mono text-xs transition-colors xl:flex"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? (
            <CornersInIcon className="h-3.5 w-3.5" />
          ) : (
            <CornersOutIcon className="h-3.5 w-3.5" />
          )}
        </button>

        <MobileOptionsMenu isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />

        <button
          type="button"
          onClick={openExport}
          onPointerEnter={prefetchExport}
          onFocus={prefetchExport}
          className="btn-press flex items-center gap-1.5 border border-white bg-white px-3 py-1 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-200"
          title="Export (Ctrl+S)"
          style={{ boxShadow: "2px 2px 0 rgba(255,255,255,0.3)" }}
        >
          <DownloadSimpleIcon className="h-3.5 w-3.5" />
          <span>EXPORT</span>
        </button>
      </div>
    </header>
  );
});
