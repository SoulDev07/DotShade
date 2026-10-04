"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  DownloadSimple,
  Copy,
  VideoCameraIcon,
  ImageIcon,
  FilmStrip,
  Check,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { DitherSettings } from "@/engine/types";
import { ClientGifEncoder } from "@/engine/gif-export";
import { toast } from "sonner";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DitherSettings;
  onCaptureBlob: (type: "image/png" | "image/webp" | "image/jpeg") => Promise<Blob | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Export dialog supporting multi-format output:
 *  - Still image downloads (PNG / WebP / JPEG) & OS clipboard copying
 *  - High-framerate WebM video recording via canvas.captureStream and MediaRecorder
 *  - Client-side animated GIF rendering via ClientGifEncoder
 */
export function ExportModal({
  isOpen,
  onClose,
  settings,
  onCaptureBlob,
  canvasRef,
}: ExportModalProps) {
  const isMotionMedia =
    settings.mediaType === "video" ||
    settings.mediaType === "webcam" ||
    (settings.mediaType === "procedural" && settings.animated);

  const validTabs = useMemo(() => {
    if (isMotionMedia) {
      return [
        { id: "video" as const, label: "VIDEO", icon: VideoCameraIcon, badge: "WEBM" },
        { id: "gif" as const, label: "GIF", icon: FilmStrip, badge: "LOOP" },
        { id: "image" as const, label: "FRAME", icon: ImageIcon, badge: "STILL" },
      ];
    }
    return [
      { id: "image" as const, label: "IMAGE", icon: ImageIcon, badge: "PNG / WEBP / JPEG" },
    ];
  }, [isMotionMedia]);

  const [activeTab, setActiveTab] = useState<"image" | "video" | "gif">("image");
  const [imageFormat, setImageFormat] = useState<"png" | "webp" | "jpeg">("png");
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const mimeType =
        imageFormat === "png"
          ? "image/png"
          : imageFormat === "webp"
          ? "image/webp"
          : "image/jpeg";

      const blob = await onCaptureBlob(mimeType);
      if (!blob) throw new Error("Failed to generate image blob");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dotshade-${settings.ditherType}-${Date.now()}.${imageFormat}`;
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
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
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

  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setRecordProgress(0);

    try {
      const stream = canvas.captureStream(60);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
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
      console.error("Video recording error:", err);
      toast.error("Video recording failed.");
      setIsRecording(false);
    }
  };

  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setGifProgress(0);

    try {
      const encoder = new ClientGifEncoder(canvas.width, canvas.height);
      encoder.start(settings.palette || ["#000000", "#ffffff"], 0);

      const ctx = canvas.getContext("2d");
      const delayMs = Math.round(1000 / gifFps);

      for (let i = 0; i < gifFrames; i++) {
        if (ctx) {
          const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          encoder.addFrame(frameData, delayMs);
        }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
      style={{ backdropFilter: "none" }}
    >
      <div
        className="relative w-full max-w-md bg-black border-2 border-white overflow-hidden flex flex-col modal-enter"
        style={{ boxShadow: "4px 4px 0 rgba(255,255,255,0.2)" }}
      >
        
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              ▓ EXPORT
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white border border-transparent hover:border-neutral-700 transition-colors btn-press"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {validTabs.length > 1 && (
          <div className="flex border-b border-border bg-neutral-950" style={{ gap: "0" }}>
            {validTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono border-b-2 transition-colors btn-press flex-1 justify-center",
                    isActive
                      ? "border-white text-white font-bold bg-neutral-900"
                      : "border-transparent text-neutral-400 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-neutral-400")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          
          {activeTab === "image" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block mb-1.5 font-bold">
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
                        "py-2 px-2 border text-left font-mono transition-colors btn-press flex flex-col items-center justify-center",
                        imageFormat === item.fmt
                          ? "bg-white border-white text-black font-bold shadow-sm"
                          : "bg-secondary/40 border-border text-neutral-300 hover:text-white hover:border-white"
                      )}
                    >
                      <span className="text-xs uppercase font-bold">{item.label}</span>
                      <span className={cn("text-[9px]", imageFormat === item.fmt ? "text-black/80" : "text-neutral-400")}>
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="flex-1 py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-bold border border-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press"
                  style={{ boxShadow: "2px 2px 0 rgba(255,255,255,0.2)" }}
                >
                  <DownloadSimple className="w-4 h-4" />
                  <span>{isExporting ? "RENDERING..." : `DOWNLOAD .${imageFormat.toUpperCase()}`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="py-2.5 px-3 bg-secondary hover:bg-neutral-800 border border-border text-white font-mono text-xs flex items-center justify-center gap-2 transition-colors btn-press"
                  title="Copy directly to clipboard"
                >
                  <Copy className="w-4 h-4" />
                  <span>COPY</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "video" && isMotionMedia && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block mb-1.5 font-bold">
                  Recording Duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 5, 10].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setRecordDuration(dur)}
                      className={cn(
                        "py-2 px-2.5 border text-xs font-mono transition-colors btn-press",
                        recordDuration === dur
                          ? "bg-white border-white text-black font-bold"
                          : "bg-secondary/40 border-border text-neutral-300 hover:text-white hover:border-white"
                      )}
                    >
                      {dur} SECONDS
                    </button>
                  ))}
                </div>
              </div>

              {isRecording && (
                <div className="space-y-1.5 p-3 bg-neutral-900 border border-neutral-700">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white font-bold">Recording stream...</span>
                    <span className="text-neutral-300 tabular-nums">{recordProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 border border-neutral-700 overflow-hidden">
                    <div
                      className="h-full pixel-progress transition-all duration-75"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-bold border border-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press"
              >
                <VideoCameraIcon className="w-4 h-4" />
                <span>{isRecording ? `RECORDING (${recordProgress}%)...` : `RECORD ${recordDuration}s WEBM`}</span>
              </button>
            </div>
          )}

          {activeTab === "gif" && isMotionMedia && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block mb-1 font-bold">
                    Frame Count
                  </label>
                  <select
                    value={gifFrames}
                    onChange={(e) => setGifFrames(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-black border border-border text-xs font-mono text-white focus:outline-none focus:border-white"
                  >
                    <option value="15">15 Frames</option>
                    <option value="30">30 Frames</option>
                    <option value="45">45 Frames</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block mb-1 font-bold">
                    Frame Rate
                  </label>
                  <select
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-black border border-border text-xs font-mono text-white focus:outline-none focus:border-white"
                  >
                    <option value="10">10 FPS</option>
                    <option value="15">15 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5 p-3 bg-neutral-900 border border-neutral-700">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white font-bold">Encoding GIF...</span>
                    <span className="text-neutral-300 tabular-nums">{gifProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 border border-neutral-700 overflow-hidden">
                    <div
                      className="h-full pixel-progress transition-all duration-75"
                      style={{ width: `${gifProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportGif}
                disabled={isExporting}
                className="w-full py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-bold border border-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press"
              >
                <FilmStrip className="w-4 h-4" />
                <span>{isExporting ? `ENCODING (${gifProgress}%)...` : "EXPORT ANIMATED GIF"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
