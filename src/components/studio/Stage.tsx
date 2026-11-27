import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { memo, type RefObject, useEffect, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { getWebcamStream, loadDroppedFile } from "@/state/media-actions";
import { useStudioStore } from "@/state/studio-store";
import { CpuCanvas } from "../CpuCanvas";
import { DitherCanvas } from "../DitherCanvas";
import { SplitCompareSlider } from "../SplitCompareSlider";
import { VideoControls } from "../VideoControls";

const FIT_CLASS = {
  contain: "object-contain",
  fill: "object-fill",
  cover: "object-cover",
} as const;

/** Frame transform applied to the raw source so it lines up with the dithered output. */
function useFrameStyle(): { className: string; style: React.CSSProperties } {
  const frame = useStudioStore(useShallow((s) => s.frame));
  return {
    className: FIT_CLASS[frame.fit],
    style: {
      transform: `translate(${frame.offsetX * 100}%, ${frame.offsetY * 100}%) rotate(${frame.rotation}deg) scale(${frame.scale})`,
      transformOrigin: "center center",
    },
  };
}

/** The un-dithered source, shown in split view. */
const OriginalMedia = memo(function OriginalMedia() {
  const { className, style } = useFrameStyle();
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const mediaUrl = useStudioStore((s) => s.source.mediaUrl);
  const isWebcamActive = useStudioStore((s) => s.isWebcamActive);

  if (isWebcamActive) {
    const stream = getWebcamStream();
    if (!stream) return null;
    return (
      <video
        ref={(el) => {
          if (el && el.srcObject !== stream) {
            el.srcObject = stream;
            el.play().catch(() => {});
          }
        }}
        autoPlay
        muted
        playsInline
        className={cn("h-full w-full", className)}
        style={style}
      />
    );
  }
  if (mediaType === "video") {
    return (
      <video
        src={mediaUrl}
        autoPlay
        loop
        muted
        className={cn("h-full w-full", className)}
        style={style}
      />
    );
  }
  return (
    <img
      src={mediaUrl}
      alt="Original Source"
      className={cn("h-full w-full", className)}
      style={style}
    />
  );
});

/** Full-stage original (hold/toggle "SOURCE"): the still image and the "RAW" badge. */
const OriginalOverlay = memo(function OriginalOverlay() {
  const { className, style } = useFrameStyle();
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const mediaUrl = useStudioStore((s) => s.source.mediaUrl);
  const isWebcamActive = useStudioStore((s) => s.isWebcamActive);
  const setViewingOriginal = useStudioStore((s) => s.setViewingOriginal);

  return (
    <>
      {mediaType === "image" && (
        <img
          src={mediaUrl}
          alt="Original Source"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full select-none",
            className,
          )}
          style={style}
        />
      )}
      <div
        className="absolute top-3 left-3 z-20 flex items-center gap-2 border border-white bg-black px-3 py-1.5 font-mono text-xs text-white"
        style={{ boxShadow: "2px 2px 0 rgba(0,0,0,1)" }}
      >
        <EyeIcon className="h-3.5 w-3.5 text-white" />
        <span className="text-[11px] font-bold tracking-wider uppercase">
          SOURCE {mediaType === "video" || isWebcamActive ? "VIDEO" : "PHOTO"}
        </span>
        <span className="border-l border-neutral-700 pl-2 text-[10px] text-neutral-300">RAW</span>
        <button
          type="button"
          onClick={() => setViewingOriginal(false)}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary ml-1 p-0.5 transition-colors"
          title="Return to dithered (O)"
        >
          <EyeSlashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
});

/** Hidden/raw `<video>` that feeds both GPU engines and the raw-video view. */
function SourceVideo({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const mediaUrl = useStudioStore((s) => s.source.mediaUrl);
  const isWebcamActive = useStudioStore((s) => s.isWebcamActive);
  const showRaw = useStudioStore(
    (s) => s.isViewingOriginal && (s.source.mediaType === "video" || s.isWebcamActive),
  );
  const { className, style } = useFrameStyle();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const stream = getWebcamStream();
    if (isWebcamActive && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch((err) => console.warn("Webcam autoplay rejected:", err));
      }
    } else if (video.srcObject) {
      video.srcObject = null;
    }
  }, [isWebcamActive, videoRef]);

  return (
    <video
      ref={videoRef}
      src={mediaType === "video" && !isWebcamActive ? mediaUrl : undefined}
      loop={!isWebcamActive}
      muted
      playsInline
      autoPlay={mediaType === "video" || isWebcamActive}
      className={cn("absolute inset-0 h-full w-full select-none", showRaw ? className : "hidden")}
      style={showRaw ? style : undefined}
    />
  );
}

/** Video dimensions come from the element's metadata; image dimensions from the decoded bitmap. */
function useVideoDimensions(videoRef: RefObject<HTMLVideoElement | null>) {
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const mediaUrl = useStudioStore((s) => s.source.mediaUrl);
  const isWebcamActive = useStudioStore((s) => s.isWebcamActive);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-bind when the source changes
  useEffect(() => {
    const { setMediaDimensions } = useStudioStore.getState();
    if (mediaType === "procedural") {
      setMediaDimensions(null);
      return;
    }
    const video = videoRef.current;
    if (mediaType !== "video" || !video) return;
    const update = () => {
      if (video.videoWidth && video.videoHeight) {
        setMediaDimensions({ width: video.videoWidth, height: video.videoHeight });
      }
    };
    video.addEventListener("loadedmetadata", update);
    if (video.videoWidth) update();
    return () => video.removeEventListener("loadedmetadata", update);
  }, [mediaType, mediaUrl, isWebcamActive, videoRef]);
}

interface StageProps {
  stageRef: RefObject<HTMLDivElement | null>;
}

export const Stage = memo(function Stage({ stageRef }: StageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoDimensions(videoRef);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) loadDroppedFile(files[0]);
    },
    noClick: true,
    noKeyboard: true,
    accept: { "image/*": [], "video/*": [] },
  });

  const { engine, fit, zoom, mediaDimensions, isViewingOriginal, isSplitView, mediaType } =
    useStudioStore(
      useShallow((s) => ({
        engine: s.style.engine,
        fit: s.frame.fit,
        zoom: s.zoom,
        mediaDimensions: s.mediaDimensions,
        isViewingOriginal: s.isViewingOriginal,
        isSplitView: s.isSplitView,
        mediaType: s.source.mediaType,
      })),
    );

  const containerStyle = useMemo<React.CSSProperties>(() => {
    const transform = zoom !== 1 ? `scale(${zoom})` : undefined;
    if (!mediaDimensions || fit !== "contain") {
      return { width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", transform };
    }
    const { width, height } = mediaDimensions;
    const isLandscape = width >= height;
    return {
      aspectRatio: `${width} / ${height}`,
      width: isLandscape ? "100%" : "auto",
      height: !isLandscape ? "100%" : "auto",
      maxWidth: "100%",
      maxHeight: "100%",
      transform,
    };
  }, [mediaDimensions, fit, zoom]);

  return (
    <div
      ref={stageRef}
      {...getRootProps()}
      className="bg-background relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 outline-none sm:p-4 lg:p-6"
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="modal-enter dither-drop pointer-events-none absolute inset-4 z-50 flex flex-col items-center justify-center border-2 border-white bg-black/95">
          <div className="font-mono text-sm font-bold tracking-widest text-white uppercase">
            ▓ DROP MEDIA TO DITHER ▓
          </div>
          <div className="mt-1 font-mono text-[11px] text-neutral-300">
            Release image or video to load into studio
          </div>
        </div>
      )}

      <div
        className="border-border bg-card/90 relative flex items-center justify-center overflow-hidden border transition-[transform] duration-150 ease-out"
        style={{
          ...containerStyle,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.18), 2px 2px 0 rgba(0,0,0,1)",
        }}
      >
        <div className={cn("absolute inset-0", isViewingOriginal && "invisible")}>
          {engine === "cpu" ? <CpuCanvas /> : <DitherCanvas videoRef={videoRef} />}
          {isSplitView && !isViewingOriginal && (
            <SplitCompareSlider originalElement={<OriginalMedia />} />
          )}
        </div>

        <SourceVideo videoRef={videoRef} />

        {isViewingOriginal && <OriginalOverlay />}
      </div>

      {mediaType === "video" && (
        <div className="absolute bottom-2.5 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-2 sm:bottom-6 sm:px-4">
          <VideoControls videoRef={videoRef} />
        </div>
      )}
    </div>
  );
});
