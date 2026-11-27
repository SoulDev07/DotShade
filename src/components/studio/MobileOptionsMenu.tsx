import {
  ArrowCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { resetStudio } from "@/state/media-actions";
import { useStudioStore } from "@/state/studio-store";

interface MobileOptionsMenuProps {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const MobileOptionsMenu = memo(function MobileOptionsMenu({
  isFullscreen,
  toggleFullscreen,
}: MobileOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fit = useStudioStore((s) => s.frame.fit);
  const zoom = useStudioStore((s) => s.zoom);
  const mediaDimensions = useStudioStore((s) => s.mediaDimensions);
  const setFrame = useStudioStore((s) => s.setFrame);
  const setZoom = useStudioStore((s) => s.setZoom);

  return (
    <div className="relative xl:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "btn-press flex items-center justify-center border p-1.5 transition-colors",
          isOpen
            ? "border-white bg-white font-bold text-black"
            : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground",
        )}
        title="More Studio Tools"
      >
        <DotsThreeVerticalIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="modal-enter absolute top-full right-0 z-50 mt-1.5 flex w-52 flex-col gap-2 border-2 border-white bg-black p-2.5 shadow-[3px_3px_0_rgba(255,255,255,0.25)]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-1 font-mono text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              <span>OPTIONS</span>
              {mediaDimensions && (
                <span className="text-[9px] text-neutral-300">
                  {mediaDimensions.width}×{mediaDimensions.height}px
                </span>
              )}
            </div>

            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[11px] text-neutral-300">Framing</span>
              <div className="border-border flex border bg-neutral-900">
                {(
                  [
                    ["contain", "FIT"],
                    ["cover", "FILL"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFrame({ fit: value });
                      setIsOpen(false);
                    }}
                    className={cn(
                      "px-2 py-0.5 font-mono text-[10px]",
                      fit === value ? "bg-white font-bold text-black" : "text-neutral-400",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[11px] text-neutral-300">Zoom</span>
              <div className="border-border flex items-center gap-1 border bg-neutral-900 px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                  className="px-1 text-xs text-neutral-400 hover:text-white"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-[10px] font-bold text-white"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                  className="px-1 text-xs text-neutral-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-neutral-800 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  resetStudio();
                  setIsOpen(false);
                }}
                className="border-border flex w-full items-center justify-between border bg-neutral-900 px-2 py-1.5 font-mono text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <span>RESET ALL</span>
                <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  setIsOpen(false);
                }}
                className="border-border flex w-full items-center justify-between border bg-neutral-900 px-2 py-1.5 font-mono text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <span>{isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}</span>
                {isFullscreen ? (
                  <CornersInIcon className="h-3.5 w-3.5" />
                ) : (
                  <CornersOutIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
