"use client";

import {
  CopyIcon,
  DownloadSimpleIcon,
  FilmStripIcon,
  ImageIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_COLORS } from "@/engine/defaults";
import { ClientGifEncoder } from "@/engine/gif-export";
import type { StyleSettings } from "@/engine/types";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/state/studio-store";

let mediabunnyModule: Promise<typeof import("mediabunny")> | null = null;
const loadMediabunny = () => (mediabunnyModule ??= import("mediabunny"));

function getGifPalette(s: StyleSettings): string[] | null {
  switch (s.colorMode) {
    case "palette":
      return s.palette.length > 0 ? s.palette : [DEFAULT_COLORS.back, DEFAULT_COLORS.front];
    case "duotone":
      return [s.colorBack, s.colorFront];
    case "paper":
      return [s.colorBack, s.colorFront, s.colorHighlight];
    case "grayscale":
      return [DEFAULT_COLORS.back, DEFAULT_COLORS.front];
    default:
      return null;
  }
}

type MediaOutput = InstanceType<typeof import("mediabunny").Output>;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureBlob: (type: "image/png" | "image/webp" | "image/jpeg") => Promise<Blob | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function ExportModal({ isOpen, onClose, onCaptureBlob, canvasRef }: ExportModalProps) {
  const style = useStudioStore((st) => st.style);
  const source = useStudioStore((st) => st.source);
  const isMotionMedia =
    source.mediaType === "video" || (source.mediaType === "procedural" && source.animated);

  const validTabs = useMemo(() => {
    if (isMotionMedia) {
      return [
        { id: "video" as const, label: "VIDEO", icon: VideoCameraIcon, badge: "MP4 / WEBM" },
        { id: "gif" as const, label: "GIF", icon: FilmStripIcon, badge: "LOOP" },
        { id: "image" as const, label: "FRAME", icon: ImageIcon, badge: "STILL" },
      ];
    }
    return [{ id: "image" as const, label: "IMAGE", icon: ImageIcon, badge: "PNG / WEBP / JPEG" }];
  }, [isMotionMedia]);

  const [activeTab, setActiveTab] = useState<"image" | "video" | "gif">("image");
  const [imageFormat, setImageFormat] = useState<"png" | "webp" | "jpeg">("png");
  const [videoFormat, setVideoFormat] = useState<"mp4" | "webm">("mp4");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isMotionMedia) {
        setActiveTab("video");
      } else {
        setActiveTab("image");
      }
    }
  }, [isOpen, isMotionMedia]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(5);
  const [recordProgress, setRecordProgress] = useState(0);

  const [gifFrames, setGifFrames] = useState(30);
  const [gifFps, setGifFps] = useState(15);
  const [gifProgress, setGifProgress] = useState(0);

  if (!isOpen) return null;

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const mimeType =
        imageFormat === "png" ? "image/png" : imageFormat === "webp" ? "image/webp" : "image/jpeg";

      const blob = await onCaptureBlob(mimeType);
      if (!blob) throw new Error("Failed to generate image blob");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dotshade-${style.ditherType}-${Date.now()}.${imageFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Image exported successfully!", {
        description: `Saved as ${imageFormat.toUpperCase()}`,
      });
    } catch (err) {
      console.error("Export image error:", err);
      toast.error("Failed to export image.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    setIsExporting(true);
    try {
      const blob = await onCaptureBlob("image/png");
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Image copied to clipboard!");
      } else {
        throw new Error("Clipboard API not supported");
      }
    } catch (err) {
      console.error("Copy image error:", err);
      toast.error("Failed to copy image to clipboard.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setRecordProgress(0);

    let stream: MediaStream | null = null;
    try {
      const mediaStream = canvas.captureStream(60);
      stream = mediaStream;
      // Probe: not every browser ships the same codecs.
      const mimeType =
        typeof MediaRecorder !== "undefined"
          ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) =>
              MediaRecorder.isTypeSupported(type),
            )
          : undefined;
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        mediaStream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dotshade-capture-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);

        toast.success("Video exported successfully!", {
          description: `Captured ${recordDuration}s WebM`,
        });
      };

      mediaRecorder.start();

      const totalMs = recordDuration * 1000;
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(100, Math.round((elapsed / totalMs) * 100));
        setRecordProgress(progress);
        if (elapsed >= totalMs) {
          clearInterval(interval);
          if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error("WebM recording error:", err);
      toast.error("Video recording failed.");
      // Stop the capture stream even though onstop never ran.
      stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handleExportMp4 = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof window === "undefined" || typeof VideoEncoder === "undefined") {
      toast.info("WebCodecs MP4 encoder not supported in this browser; using WebM.");
      return handleExportWebm();
    }

    setIsRecording(true);
    setRecordProgress(0);

    // handleExportWebm returns after *starting*, so it owns isRecording from
    // here on — the finally must not clear it mid-capture.
    let handedOff = false;
    let output: MediaOutput | null = null;

    try {
      const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality, canEncodeVideo } =
        await loadMediabunny();

      const isAvcSupported = await canEncodeVideo("avc").catch(() => false);
      if (!isAvcSupported) {
        toast.info("H.264 encoding not supported in this browser; falling back to WebM.");
        handedOff = true;
        return handleExportWebm();
      }

      const evenWidth = canvas.width - (canvas.width % 2);
      const evenHeight = canvas.height - (canvas.height % 2);
      const isOdd = canvas.width % 2 !== 0 || canvas.height % 2 !== 0;

      let sourceCanvas: HTMLCanvasElement = canvas;
      let offscreenCtx: CanvasRenderingContext2D | null = null;

      if (isOdd) {
        sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = evenWidth;
        sourceCanvas.height = evenHeight;
        offscreenCtx = sourceCanvas.getContext("2d");
      }

      const fps = 30;
      const target = new BufferTarget();
      output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });

      const videoSource = new CanvasSource(sourceCanvas, {
        codec: "avc",
        quality: new Quality("high"),
      });

      output.addVideoTrack(videoSource);
      await output.start();

      const totalFrames = recordDuration * fps;
      const frameDurationSec = 1 / fps;
      const frameIntervalMs = 1000 / fps;

      try {
        const startedAt = performance.now();
        for (let i = 0; i < totalFrames; i++) {
          if (offscreenCtx) {
            offscreenCtx.drawImage(canvas, 0, 0, evenWidth, evenHeight);
          }

          await videoSource.add(i * frameDurationSec, frameDurationSec);
          setRecordProgress(Math.min(100, Math.round(((i + 1) / totalFrames) * 100)));
          // Schedule against the wall clock so encode time doesn't stretch the capture.
          const target = startedAt + (i + 1) * frameIntervalMs;
          await new Promise((r) => setTimeout(r, Math.max(0, target - performance.now())));
        }
      } finally {
        videoSource.close();
      }

      await output.finalize();

      if (!target.buffer) {
        throw new Error("Target buffer is empty after finalization");
      }

      const blob = new Blob([target.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dotshade-capture-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("MP4 video exported successfully!", {
        description: `Captured ${recordDuration}s H.264 MP4`,
      });
    } catch (err) {
      console.error("MP4 export error:", err);
      try {
        if (output && output.state !== "finalized") await output.cancel();
      } catch {}
      toast.error("MP4 export failed. Falling back to WebM...");
      handedOff = true;
      await handleExportWebm();
    } finally {
      if (!handedOff) setIsRecording(false);
    }
  };

  const handleExportVideo = async () => {
    if (videoFormat === "mp4") {
      await handleExportMp4();
    } else {
      await handleExportWebm();
    }
  };

  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setGifProgress(0);

    try {
      const maxDim = 640;
      let exportW = canvas.width || 640;
      let exportH = canvas.height || 480;
      if (exportW > maxDim || exportH > maxDim) {
        if (exportW > exportH) {
          exportH = Math.max(1, Math.round((exportH * maxDim) / exportW));
          exportW = maxDim;
        } else {
          exportW = Math.max(1, Math.round((exportW * maxDim) / exportH));
          exportH = maxDim;
        }
      }

      const offscreen = document.createElement("canvas");
      offscreen.width = exportW;
      offscreen.height = exportH;
      const ctx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not initialize offscreen context for GIF capture");

      const encoder = new ClientGifEncoder(exportW, exportH);
      encoder.start(getGifPalette(style), 0);

      const delayMs = Math.round(1000 / gifFps);

      for (let i = 0; i < gifFrames; i++) {
        ctx.clearRect(0, 0, exportW, exportH);
        ctx.drawImage(canvas, 0, 0, exportW, exportH);
        const frameData = ctx.getImageData(0, 0, exportW, exportH);
        encoder.addFrame(frameData, delayMs);
        setGifProgress(Math.round(((i + 1) / gifFrames) * 100));
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const gifBlob = encoder.finish();
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dotshade-animation-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("GIF animation exported!", {
        description: `${gifFrames} frames @ ${gifFps}fps`,
      });
    } catch (err) {
      console.error("GIF export error:", err);
      toast.error("Failed to generate GIF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4"
      style={{ backdropFilter: "none" }}
    >
      <div
        className="modal-enter relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden border-2 border-white bg-black"
        style={{ boxShadow: "4px 4px 0 rgba(255,255,255,0.2)" }}
      >
        <div className="border-border flex shrink-0 items-center justify-between border-b bg-neutral-900/60 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-wider text-white uppercase">
              ▓ EXPORT
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press border border-transparent p-1 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
            title="Close (Esc)"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {validTabs.length > 1 && (
          <div className="border-border flex shrink-0 border-b bg-neutral-950" style={{ gap: "0" }}>
            {validTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "btn-press flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 font-mono text-[11px] transition-colors",
                    isActive
                      ? "border-white bg-neutral-900 font-bold text-white"
                      : "border-transparent text-neutral-400 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-neutral-400")}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          {activeTab === "image" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                  File Format
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { fmt: "png" as const, label: ".PNG", desc: "Lossless" },
                    { fmt: "webp" as const, label: ".WEBP", desc: "Modern" },
                    { fmt: "jpeg" as const, label: ".JPEG", desc: "Universal" },
                  ].map((item) => (
                    <button
                      key={item.fmt}
                      type="button"
                      onClick={() => setImageFormat(item.fmt)}
                      className={cn(
                        "btn-press flex flex-col items-center justify-center border px-2 py-2 text-left font-mono transition-colors",
                        imageFormat === item.fmt
                          ? "border-white bg-white font-bold text-black shadow-sm"
                          : "bg-secondary/40 border-border text-neutral-300 hover:border-white hover:text-white",
                      )}
                    >
                      <span className="text-xs font-bold uppercase">{item.label}</span>
                      <span
                        className={cn(
                          "text-[9px]",
                          imageFormat === item.fmt ? "text-black/80" : "text-neutral-400",
                        )}
                      >
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="btn-press flex flex-1 items-center justify-center gap-2 border border-white bg-white px-3 py-2.5 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
                  style={{ boxShadow: "2px 2px 0 rgba(255,255,255,0.2)" }}
                >
                  <DownloadSimpleIcon className="h-4 w-4" />
                  <span>
                    {isExporting ? "RENDERING..." : `DOWNLOAD .${imageFormat.toUpperCase()}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="bg-secondary border-border btn-press flex items-center justify-center gap-2 border px-3 py-2.5 font-mono text-xs text-white transition-colors hover:bg-neutral-800"
                  title="Copy directly to clipboard"
                >
                  <CopyIcon className="h-4 w-4" />
                  <span>COPY</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "video" && isMotionMedia && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVideoFormat("mp4")}
                    className={cn(
                      "btn-press flex flex-col items-center border px-2.5 py-2 font-mono text-xs transition-colors",
                      videoFormat === "mp4"
                        ? "border-white bg-white font-bold text-black"
                        : "bg-secondary/40 border-border text-neutral-300 hover:border-white hover:text-white",
                    )}
                  >
                    <span>MP4 (H.264)</span>
                    <span className="text-[9px] opacity-75">UNIVERSAL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoFormat("webm")}
                    className={cn(
                      "btn-press flex flex-col items-center border px-2.5 py-2 font-mono text-xs transition-colors",
                      videoFormat === "webm"
                        ? "border-white bg-white font-bold text-black"
                        : "bg-secondary/40 border-border text-neutral-300 hover:border-white hover:text-white",
                    )}
                  >
                    <span>WEBM (VP9)</span>
                    <span className="text-[9px] opacity-75">STREAM</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                  Recording Duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 5, 10].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setRecordDuration(dur)}
                      className={cn(
                        "btn-press border px-2.5 py-2 font-mono text-xs transition-colors",
                        recordDuration === dur
                          ? "border-white bg-white font-bold text-black"
                          : "bg-secondary/40 border-border text-neutral-300 hover:border-white hover:text-white",
                      )}
                    >
                      {dur} SECONDS
                    </button>
                  ))}
                </div>
              </div>

              {isRecording && (
                <div className="space-y-1.5 border border-neutral-700 bg-neutral-900 p-3">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="font-bold text-white">
                      Recording {videoFormat.toUpperCase()} stream...
                    </span>
                    <span className="text-neutral-300 tabular-nums">{recordProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden border border-neutral-700 bg-neutral-950">
                    <div
                      className="pixel-progress h-full transition-all duration-75"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isRecording}
                className="btn-press flex w-full items-center justify-center gap-2 border border-white bg-white px-3 py-2.5 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                <VideoCameraIcon className="h-4 w-4" />
                <span>
                  {isRecording
                    ? `RECORDING (${recordProgress}%)...`
                    : `RECORD ${recordDuration}s ${videoFormat.toUpperCase()}`}
                </span>
              </button>
            </div>
          )}

          {activeTab === "gif" && isMotionMedia && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-mono text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                    Frame Count
                  </label>
                  <select
                    value={gifFrames}
                    onChange={(e) => setGifFrames(parseInt(e.target.value, 10))}
                    className="border-border w-full border bg-black p-2 font-mono text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="15">15 Frames</option>
                    <option value="30">30 Frames</option>
                    <option value="45">45 Frames</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                    Frame Rate
                  </label>
                  <select
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value, 10))}
                    className="border-border w-full border bg-black p-2 font-mono text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="10">10 FPS</option>
                    <option value="15">15 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5 border border-neutral-700 bg-neutral-900 p-3">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="font-bold text-white">Encoding GIF...</span>
                    <span className="text-neutral-300 tabular-nums">{gifProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden border border-neutral-700 bg-neutral-950">
                    <div
                      className="pixel-progress h-full transition-all duration-75"
                      style={{ width: `${gifProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportGif}
                disabled={isExporting}
                className="btn-press flex w-full items-center justify-center gap-2 border border-white bg-white px-3 py-2.5 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                <FilmStripIcon className="h-4 w-4" />
                <span>{isExporting ? `ENCODING (${gifProgress}%)...` : "EXPORT ANIMATED GIF"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
