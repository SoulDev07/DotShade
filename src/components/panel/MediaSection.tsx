import { CameraIcon, CpuIcon, ImageIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { SAMPLE_MEDIA } from "@/engine/presets";
import { cn } from "@/lib/utils";
import { loadImageFile, loadVideoFile, toggleWebcam } from "@/state/media-actions";
import { useStudioStore } from "@/state/studio-store";

export const MediaSection = memo(function MediaSection() {
  const source = useStudioStore(
    useShallow((st) => ({ mediaType: st.source.mediaType, mediaUrl: st.source.mediaUrl })),
  );
  const isWebcamActive = useStudioStore((st) => st.isWebcamActive);
  const setSource = useStudioStore((st) => st.setSource);

  return (
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
              if (e.target.files?.[0]) loadImageFile(e.target.files[0]);
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
              if (e.target.files?.[0]) loadVideoFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          onClick={toggleWebcam}
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
});
