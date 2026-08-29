"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Video,
  Image as ImageIcon,
  Code2,
  Sparkles,
  Film,
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import type { StudioSettings } from "./ControlPanel";
import { ClientGifEncoder } from "@/engine/gif-export";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onCaptureBlob: (type: "image/png" | "image/webp" | "image/jpeg") => Promise<Blob | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function ExportModal({
  isOpen,
  onClose,
  settings,
  onCaptureBlob,
  canvasRef,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "gif" | "code">("image");
  const [imageFormat, setImageFormat] = useState<"png" | "webp" | "jpeg">("png");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(5);
  const [recordProgress, setRecordProgress] = useState(0);

  // GIF states
  const [gifFrames, setGifFrames] = useState(30);
  const [gifFps, setGifFps] = useState(15);
  const [gifProgress, setGifProgress] = useState(0);

  if (!isOpen) return null;

  // Trigger celebration confetti on successful export
  const fireConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.65 },
      colors: ["#10b981", "#34d399", "#6ee7b7", "#ffffff"],
    });
  };

  // Download High-Res Image
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
      a.download = `dither-${settings.ditherType}-${Date.now()}.${imageFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      fireConfetti();
    } catch (err) {
      console.error("Export image error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image directly to Clipboard
  const handleCopyImage = async () => {
    setIsExporting(true);
    try {
      const blob = await onCaptureBlob("image/png");
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        fireConfetti();
      }
    } catch (err) {
      console.error("Copy image error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Record Real-Time Canvas Video (WebM)
  const handleRecordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    setRecordProgress(0);

    const stream = canvas.captureStream(60);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
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
      a.download = `dither-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsRecording(false);
      fireConfetti();
    };

    mediaRecorder.start();

    // Progress interval
    const totalMs = recordDuration * 1000;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setRecordProgress(progress);

      if (elapsed >= totalMs) {
        clearInterval(interval);
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }
    }, 80);
  };

  // Export Animated GIF
  const handleExportGif = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setGifProgress(0);

    try {
      const w = Math.min(canvas.width, 600);
      const h = Math.round((w / canvas.width) * canvas.height);

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      const encoder = new ClientGifEncoder(w, h);
      encoder.start(
        settings.colorMode === "paper"
          ? [settings.colorBack, settings.colorFront, settings.colorHighlight]
          : settings.customPalette,
        0
      );

      const delayMs = Math.round(1000 / gifFps);

      for (let i = 0; i < gifFrames; i++) {
        offCtx.drawImage(canvas, 0, 0, w, h);
        const imgData = offCtx.getImageData(0, 0, w, h);
        encoder.addFrame(imgData, delayMs);
        setGifProgress(Math.round(((i + 1) / gifFrames) * 100));
        await new Promise((r) => setTimeout(r, delayMs));
      }

      const gifBlob = encoder.finish();
      const url = URL.createObjectURL(gifBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dither-animation-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      fireConfetti();
    } catch (err) {
      console.error("GIF export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate React JSX code snippet
  const generatedReactCode = `import { PersonalDither } from "@/components/ui/PersonalDither";

export function DitherDemo() {
  return (
    <div className="w-[600px] h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
      <PersonalDither
        src="${settings.mediaUrl || "https://paper.design/flowers.webp"}"
        ditherType="${settings.ditherType}"
        pxSize={${settings.pxSize}}
        threshold={${settings.threshold}}
        colorMode="${settings.colorMode}"
        colorBack="${settings.colorBack}"
        colorFront="${settings.colorFront}"
        colorHighlight="${settings.colorHighlight}"
        colorSteps={${settings.colorSteps}}
        inverted={${settings.inverted}}
        fit="${settings.fit}"
        scale={${settings.scale}}
        rotation={${settings.rotation}}
        animated={${settings.animated}}
        animationSpeed={${settings.animationSpeed}}
      />
    </div>
  );
}`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(generatedReactCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200 ease-out">
      <div className="relative w-full max-w-xl glass-panel-glow rounded-3xl overflow-hidden flex flex-col modal-enter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-semibold text-neutral-100 uppercase tracking-widest font-mono">
              Export Suite & Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-xl hover:bg-white/5 btn-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 bg-black/20 px-6 pt-2">
          {[
            { id: "image", label: "Image", icon: ImageIcon },
            { id: "video", label: "Video", icon: Video },
            { id: "gif", label: "GIF", icon: Film },
            { id: "code", label: "React Code", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors duration-140 ease-out",
                  isActive
                    ? "border-emerald-400 text-emerald-400 font-semibold"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[60vh]">
          {/* --- 1. IMAGE EXPORT --- */}
          {activeTab === "image" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["png", "webp", "jpeg"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImageFormat(fmt)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-mono uppercase font-semibold btn-press",
                        imageFormat === fmt
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 text-neutral-400"
                      )}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 btn-press disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? "Rendering..." : "Download Image"}</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 font-medium rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 btn-press"
                  title="Copy directly to clipboard"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          {/* --- 2. VIDEO EXPORT --- */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setRecordDuration(dur)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-mono font-medium btn-press",
                        recordDuration === dur
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold ring-1 ring-emerald-400/40"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20 text-neutral-400"
                      )}
                    >
                      {dur}s Clip
                    </button>
                  ))}
                </div>
              </div>

              {isRecording && (
                <div className="space-y-2 p-3.5 bg-black/40 border border-red-500/30 rounded-2xl">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-red-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Capturing Canvas Stream...
                    </span>
                    <span className="text-neutral-400">{recordProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-75"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleRecordVideo}
                disabled={isRecording}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 btn-press disabled:opacity-50"
              >
                <Video className="w-4 h-4" />
                <span>{isRecording ? `Recording (${recordProgress}%)...` : `Record ${recordDuration}s WebM`}</span>
              </button>
            </div>
          )}

          {/* --- 3. GIF EXPORT --- */}
          {activeTab === "gif" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Frames
                  </label>
                  <select
                    value={gifFrames}
                    onChange={(e) => setGifFrames(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="15">15 Frames (~1s)</option>
                    <option value="30">30 Frames (~2s)</option>
                    <option value="45">45 Frames (~3s)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Frame Rate
                  </label>
                  <select
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="10">10 FPS</option>
                    <option value="15">15 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2 p-3.5 bg-black/40 border border-emerald-500/30 rounded-2xl">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">LZW Compression...</span>
                    <span className="text-neutral-400">{gifProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${gifProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 btn-press disabled:opacity-50"
              >
                <Film className="w-4 h-4" />
                <span>{isExporting ? `Encoding (${gifProgress}%)...` : "Export Animated GIF"}</span>
              </button>
            </div>
          )}

          {/* --- 4. REACT CODE SNIPPET --- */}
          {activeTab === "code" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Drop-in React Component
                </span>
                <button
                  onClick={copyCodeToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono btn-press"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy JSX"}</span>
                </button>
              </div>

              <pre className="p-4 bg-black/60 border border-white/10 rounded-2xl text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed max-h-64 shadow-inner">
                <code>{generatedReactCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
