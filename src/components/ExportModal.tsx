"use client";

import React, { useState } from "react";
import {
  X,
  DownloadSimple,
  Copy,
  Check,
  VideoCamera,
  Image as ImageIcon,
  Code,
  FilmStrip,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DotShadeLogo } from "./ui/DotShadeLogo";
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

export function ExportModal({
  isOpen,
  onClose,
  settings,
  onCaptureBlob,
  canvasRef,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "gif" | "code">("image");
  const [codeType, setCodeType] = useState<"vgpu" | "webgl" | "react">("vgpu");
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

      toast.success("Image exported successfully!", {
        description: `Downloaded as ${imageFormat.toUpperCase()}`,
      });
    } catch (err) {
      console.error("Export image error:", err);
      toast.error("Failed to export image.");
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

  // Export Video (WebM)
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
        a.download = `dither-capture-${Date.now()}.webm`;
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

  // Export Animated GIF
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
      a.download = `dither-animation-${Date.now()}.gif`;
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

  // Generate vgpu WebGPU code snippet
  const generatedVgpuCode = `// WebGPU Dither with vgpu (https://vgpu.sh/)
import { init, effect, surface, sampler, frame } from "vgpu";
import { ditherWgslShader } from "@/engine/shaders/dither.wgsl";

export async function renderDither(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const gpu = await init();
  const output = surface(gpu, canvas);
  const shader = effect(gpu, ditherWgslShader);

  // Upload image texture
  const tex = gpu.device.createTexture({
    size: [image.naturalWidth, image.naturalHeight, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  gpu.device.queue.copyExternalImageToTexture({ source: image }, { texture: tex }, [image.naturalWidth, image.naturalHeight]);

  shader.set({
    src: tex,
    samp: sampler(gpu, { minFilter: "linear", magFilter: "linear" }),
    params: {
      resolution: [canvas.width, canvas.height],
      ditherType: ${settings.ditherType === "8x8" ? 4 : settings.ditherType === "4x4" ? 3 : settings.ditherType === "2x2" ? 2 : 1},
      pxSize: ${settings.pxSize},
      threshold: ${settings.threshold},
      colorMode: ${settings.colorMode === "paper" ? 1 : settings.colorMode === "duotone" ? 2 : 5},
      colorSteps: ${settings.colorSteps},
      inverted: ${settings.inverted ? 1 : 0},
      scale: ${settings.scale},
      contrast: ${settings.contrast},
      brightness: ${settings.brightness},
    },
  });

  frame(gpu, (f) => {
    f.pass(output, shader);
  });
}`;

  // Generate WebGL2 code snippet
  const generatedWebGLCode = `// WebGL2 Dither Shader
import { DitherWebGLRenderer } from "@/engine/webgl-renderer";

export function renderDitherWebGL(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const mount = new DitherWebGLRenderer(canvas, ${JSON.stringify(settings, null, 2)});
  mount.setImage(image);
  mount.render();
}`;

  // Generate React JSX code snippet
  const generatedReactCode = `import { DitherCanvas } from "@/components/DitherCanvas";

export function DitherDemo() {
  const settings = ${JSON.stringify(settings, null, 2)};

  return (
    <div className="w-[600px] h-[400px] rounded-lg overflow-hidden border border-neutral-800">
      <DitherCanvas
        src="${settings.mediaUrl || "https://images.unsplash.com/photo-1509423350716-97f9360b4e09"}"
        settings={settings}
      />
    </div>
  );
};`;

  const currentCode =
    codeType === "vgpu"
      ? generatedVgpuCode
      : codeType === "webgl"
      ? generatedWebGLCode
      : generatedReactCode;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
    toast.success("Code copied to clipboard!", {
      description: `${codeType === "react" ? "React DitherCanvas" : codeType.toUpperCase()} snippet`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-2xl modal-enter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
              Export Studio
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-secondary border border-border text-[10px] font-mono text-muted-foreground uppercase font-medium">
              {settings.engine}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors btn-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-border bg-secondary/30 px-4 pt-1.5 gap-1">
          {[
            { id: "image", label: "Image", icon: ImageIcon },
            { id: "video", label: "Video", icon: VideoCamera },
            { id: "gif", label: "GIF", icon: FilmStrip },
            { id: "code", label: "Code", icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-colors btn-press",
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
          {/* Image Export */}
          {activeTab === "image" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["png", "webp", "jpeg"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImageFormat(fmt)}
                      className={cn(
                        "py-2 px-2.5 rounded-md border text-xs font-mono uppercase transition-colors btn-press",
                        imageFormat === fmt
                          ? "bg-secondary border-primary/50 text-foreground font-medium"
                          : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-border-hover"
                      )}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="flex-1 py-2.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press shadow-sm"
                >
                  <DownloadSimple className="w-3.5 h-3.5" />
                  <span>{isExporting ? "Rendering..." : "Download Image"}</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  disabled={isExporting}
                  className="py-2.5 px-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-xs rounded-md flex items-center justify-center gap-2 transition-colors btn-press"
                  title="Copy directly to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          {/* Video Export */}
          {activeTab === "video" && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 5, 10].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setRecordDuration(dur)}
                      className={cn(
                        "py-2 px-2.5 rounded-md border text-xs font-mono transition-colors btn-press",
                        recordDuration === dur
                          ? "bg-secondary border-primary/50 text-foreground font-medium"
                          : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-border-hover"
                      )}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

              {isRecording && (
                <div className="space-y-1.5 p-3 bg-secondary/50 border border-border rounded-md">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-foreground">Recording stream...</span>
                    <span className="text-muted-foreground tabular-nums">{recordProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-75"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="w-full py-2.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press shadow-sm"
              >
                <VideoCamera className="w-3.5 h-3.5" />
                <span>{isRecording ? `Recording (${recordProgress}%)...` : `Record ${recordDuration}s WebM`}</span>
              </button>
            </div>
          )}

          {/* GIF Export */}
          {activeTab === "gif" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                    Frames
                  </label>
                  <select
                    value={gifFrames}
                    onChange={(e) => setGifFrames(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-secondary border border-border rounded-md text-xs font-mono text-foreground focus:outline-none"
                  >
                    <option value="15">15 Frames</option>
                    <option value="30">30 Frames</option>
                    <option value="45">45 Frames</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                    Frame Rate
                  </label>
                  <select
                    value={gifFps}
                    onChange={(e) => setGifFps(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-secondary border border-border rounded-md text-xs font-mono text-foreground focus:outline-none"
                  >
                    <option value="10">10 FPS</option>
                    <option value="15">15 FPS</option>
                    <option value="24">24 FPS</option>
                  </select>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5 p-3 bg-secondary/50 border border-border rounded-md">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-foreground">Encoding GIF...</span>
                    <span className="text-muted-foreground tabular-nums">{gifProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-75"
                      style={{ width: `${gifProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="w-full py-2.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 btn-press shadow-sm"
              >
                <FilmStrip className="w-3.5 h-3.5" />
                <span>{isExporting ? `Encoding (${gifProgress}%)...` : "Export GIF"}</span>
              </button>
            </div>
          )}

          {/* Code Snippet */}
          {activeTab === "code" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-secondary/70 p-0.5 rounded-lg border border-border">
                  {(["vgpu", "webgl", "react"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setCodeType(type)}
                      className={cn(
                        "px-2 py-1 text-[10px] font-mono rounded-md transition-colors uppercase btn-press",
                        codeType === type
                          ? "bg-card text-foreground font-medium shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type === "react" ? "React" : type}
                    </button>
                  ))}
                </div>

                <button
                  onClick={copyCodeToClipboard}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-md text-xs font-mono transition-colors btn-press"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <pre className="p-3 bg-background border border-border rounded-lg text-[11px] font-mono text-foreground/90 overflow-x-auto leading-relaxed max-h-60">
                <code>{currentCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
