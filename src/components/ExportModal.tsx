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
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(5); // seconds
  const [recordProgress, setRecordProgress] = useState(0);

  // GIF states
  const [gifFrames, setGifFrames] = useState(30);
  const [gifFps, setGifFps] = useState(15);
  const [gifProgress, setGifProgress] = useState(0);

  if (!isOpen) return null;

  // Trigger celebration confetti on successful export
  const fireConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
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
    }, 100);
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
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider font-mono">
              Export Media & Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-2">
          {[
            { id: "image", label: "Image (PNG/WebP)", icon: ImageIcon },
            { id: "video", label: "Video (WebM/MP4)", icon: Video },
            { id: "gif", label: "Animated GIF", icon: Film },
            { id: "code", label: "React Component", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all",
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                )}
              >
                <Icon className="w-4 h-4" />
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
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                  Image Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["png", "webp", "jpeg"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImageFormat(fmt)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-mono uppercase font-medium transition-all",
                        imageFormat === fmt
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
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
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? "Processing..." : "Download Image"}</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-medium rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
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
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-2">
                  Recording Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setRecordDuration(dur)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all",
                        recordDuration === dur
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      )}
                    >
                      {dur} Seconds
                    </button>
                  ))}
                </div>
              </div>

              {isRecording && (
                <div className="space-y-2 p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-red-400 animate-pulse flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Recording Canvas Stream...
                    </span>
                    <span className="text-neutral-400">{recordProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-100"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleRecordVideo}
                disabled={isRecording}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Video className="w-4 h-4" />
                <span>{isRecording ? `Recording (${recordProgress}%)...` : `Record ${recordDuration}s WebM Clip`}</span>
              </button>
            </div>
          )}

          {/* --- 3. GIF EXPORT --- */}
          {activeTab === "gif" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Frame Count
                  </label>
                  <select
                    value={gifFrames}
                    onChange={(e) => setGifFrames(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="15">15 Frames (~1.0s)</option>
                    <option value="30">30 Frames (~2.0s)</option>
                    <option value="45">45 Frames (~3.0s)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Frame Rate (FPS)
                  </label>
                  <select
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="10">10 FPS</option>
                    <option value="15">15 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2 p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400">Encoding GIF LZW Blocks...</span>
                    <span className="text-neutral-400">{gifProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-100"
                      style={{ width: `${gifProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
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
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Ready-to-Use Component Code
                </span>
                <button
                  onClick={copyCodeToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-64">
                <code>{generatedReactCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
