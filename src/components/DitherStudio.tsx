"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  SplitSquareHorizontal,
  RotateCcw,
  Download,
  Share2,
  Layers,
  Zap,
  Command,
} from "lucide-react";
import { PersonalDither, type PersonalDitherHandle } from "./ui/PersonalDither";
import { ControlPanel, type StudioSettings } from "./ControlPanel";
import { SplitCompareSlider } from "./SplitCompareSlider";
import { VideoControls } from "./VideoControls";
import { ExportModal } from "./ExportModal";
import { processCpuDithering } from "@/engine/cpu-dither";
import { cn } from "@/lib/utils";

const INITIAL_SETTINGS: StudioSettings = {
  mediaType: "image",
  mediaUrl: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?q=80&w=1200&auto=format&fit=crop",
  ditherType: "8x8",
  cpuAlgorithm: "floyd-steinberg",
  engineMode: "gpu",
  pxSize: 2,
  threshold: 0.5,
  halftoneAngle: 45,
  halftoneScale: 2,
  colorMode: "paper",
  colorBack: "#000c38",
  colorFront: "#94ffaf",
  colorHighlight: "#eaff94",
  paletteId: "paper-mint",
  customPalette: ["#000c38", "#94ffaf", "#eaff94"],
  colorSteps: 2,
  inverted: false,
  fit: "cover",
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  proceduralShape: "simplex",
  animated: false,
  animationSpeed: 1,
};

export function DitherStudio() {
  const [settings, setSettings] = useState<StudioSettings>(INITIAL_SETTINGS);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const ditherRef = useRef<PersonalDitherHandle>(null);
  const cpuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Update setting field helper
  const updateSettings = useCallback((updater: Partial<StudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...updater }));
  }, []);

  // Handle Drag & Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        updateSettings({ mediaType: "image", mediaUrl: url });
      } else if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        updateSettings({ mediaType: "video", mediaUrl: url });
      }
    }
  }, [updateSettings]);

  // Handle Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          updateSettings({ mediaType: "image", mediaUrl: url });
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [updateSettings]);

  // Handle Webcam Stream
  const toggleWebcam = useCallback(async () => {
    if (isWebcamActive) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
      }
      setIsWebcamActive(false);
      updateSettings({ mediaType: "image" });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        webcamStreamRef.current = stream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          videoElementRef.current.play();
        }
        setIsWebcamActive(true);
        updateSettings({ mediaType: "webcam", animated: true });
      } catch (err) {
        console.error("Webcam access error:", err);
      }
    }
  }, [isWebcamActive, updateSettings]);

  // Handle Image & Video Uploads
  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    updateSettings({ mediaType: "image", mediaUrl: url });
  };

  const handleUploadVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    updateSettings({ mediaType: "video", mediaUrl: url, animated: true });
  };

  // Reset to initial settings
  const handleReset = () => {
    setSettings(INITIAL_SETTINGS);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  // Global Keyboard Shortcuts (instant execution without delay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        const vid = videoElementRef.current;
        if (vid) {
          if (vid.paused) vid.play();
          else vid.pause();
        }
      } else if (e.code === "Tab") {
        e.preventDefault();
        setIsSplitView((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsExportOpen(true);
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Process CPU Dithering if engineMode === 'cpu'
  useEffect(() => {
    if (settings.engineMode !== "cpu" || !cpuCanvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = settings.mediaUrl;
    img.onload = () => {
      const canvas = cpuCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = img.naturalWidth || 600;
      const h = img.naturalHeight || 400;
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(img, 0, 0, w, h);
      const rawData = ctx.getImageData(0, 0, w, h);

      const ditheredData = processCpuDithering(rawData, {
        algorithm: settings.cpuAlgorithm || "floyd-steinberg",
        colorMode: settings.colorMode,
        colorBack: settings.colorBack,
        colorFront: settings.colorFront,
        colorHighlight: settings.colorHighlight,
        palette: settings.customPalette,
        colorSteps: settings.colorSteps,
        threshold: settings.threshold,
        brightness: settings.brightness,
        contrast: settings.contrast,
        gamma: settings.gamma,
        inverted: settings.inverted,
      });

      ctx.putImageData(ditheredData, 0, 0);
    };
  }, [
    settings.engineMode,
    settings.cpuAlgorithm,
    settings.mediaUrl,
    settings.colorMode,
    settings.colorBack,
    settings.colorFront,
    settings.colorHighlight,
    settings.customPalette,
    settings.colorSteps,
    settings.threshold,
    settings.brightness,
    settings.contrast,
    settings.gamma,
    settings.inverted,
  ]);

  // Capture Snapshot for Exporter
  const handleCaptureBlob = async (
    type: "image/png" | "image/webp" | "image/jpeg"
  ): Promise<Blob | null> => {
    if (settings.engineMode === "cpu" && cpuCanvasRef.current) {
      return new Promise((resolve) => {
        cpuCanvasRef.current?.toBlob((blob) => resolve(blob), type, 0.95);
      });
    }
    return (await ditherRef.current?.getSnapshotBlob(type, 0.95)) ?? null;
  };

  return (
    <div className="flex flex-col lg:flex-row w-screen h-screen overflow-hidden bg-[#08080a] text-neutral-100 font-sans select-none">
      {/* Hidden Video element for video & webcam playback */}
      <video
        ref={videoElementRef}
        src={settings.mediaType === "video" ? settings.mediaUrl : undefined}
        loop
        muted
        playsInline
        autoPlay={settings.mediaType === "video" || isWebcamActive}
        className="hidden"
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Studio Header Bar */}
        <header className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-xl px-5 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-4 h-4 text-neutral-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-neutral-100 tracking-wider uppercase font-mono">
                  Dither Studio
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons with Emil Tactile Micro-Interactions */}
          <div className="flex items-center gap-2">
            {/* Split Comparison Toggle */}
            <button
              onClick={() => setIsSplitView((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border btn-press",
                isSplitView
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold ring-1 ring-emerald-400/30"
                  : "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-neutral-200"
              )}
              title="Toggle Split Comparison (Tab)"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>

            {/* Reset Settings */}
            <button
              onClick={handleReset}
              className="p-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-mono btn-press"
              title="Reset Settings (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-neutral-400 hover:text-neutral-200 rounded-xl text-xs font-mono btn-press"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Export Trigger */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-mono font-bold btn-press shadow-md shadow-emerald-500/20"
              title="Export Media & Code (Ctrl+S)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Central Canvas Stage */}
        <div
          ref={stageRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 relative flex items-center justify-center p-4 lg:p-8 overflow-hidden subtle-grid"
        >
          {/* Main Visual Stage Wrapper */}
          <div className="relative w-full h-full max-w-5xl max-h-[82vh] rounded-3xl overflow-hidden glass-panel-glow flex items-center justify-center">
            {/* Split Comparison Mode */}
            {isSplitView ? (
              <SplitCompareSlider
                originalElement={
                  settings.mediaType === "video" ? (
                    <video
                      src={settings.mediaUrl}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={settings.mediaUrl}
                      alt="Original Source"
                      className="w-full h-full object-cover"
                    />
                  )
                }
                ditheredElement={
                  <PersonalDither
                    ref={ditherRef}
                    src={
                      settings.mediaType === "video" || isWebcamActive
                        ? videoElementRef.current
                        : settings.mediaType === "image"
                        ? settings.mediaUrl
                        : null
                    }
                    ditherType={settings.ditherType}
                    pxSize={settings.pxSize}
                    threshold={settings.threshold}
                    halftoneAngle={settings.halftoneAngle}
                    halftoneScale={settings.halftoneScale}
                    colorMode={settings.colorMode}
                    colorBack={settings.colorBack}
                    colorFront={settings.colorFront}
                    colorHighlight={settings.colorHighlight}
                    palette={settings.customPalette}
                    colorSteps={settings.colorSteps}
                    inverted={settings.inverted}
                    fit={settings.fit}
                    scale={settings.scale}
                    rotation={settings.rotation}
                    offsetX={settings.offsetX}
                    offsetY={settings.offsetY}
                    brightness={settings.brightness}
                    contrast={settings.contrast}
                    saturation={settings.saturation}
                    gamma={settings.gamma}
                    proceduralShape={settings.proceduralShape}
                    animated={settings.animated || isWebcamActive || settings.mediaType === "video"}
                    animationSpeed={settings.animationSpeed}
                  />
                }
              />
            ) : settings.engineMode === "cpu" ? (
              /* CPU Dither Canvas */
              <canvas
                ref={cpuCanvasRef}
                className="w-full h-full object-contain pixel-art"
              />
            ) : (
              /* Full GPU WebGL2 Shader View */
              <PersonalDither
                ref={ditherRef}
                src={
                  settings.mediaType === "video" || isWebcamActive
                    ? videoElementRef.current
                    : settings.mediaType === "image"
                    ? settings.mediaUrl
                    : null
                }
                ditherType={settings.ditherType}
                pxSize={settings.pxSize}
                threshold={settings.threshold}
                halftoneAngle={settings.halftoneAngle}
                halftoneScale={settings.halftoneScale}
                colorMode={settings.colorMode}
                colorBack={settings.colorBack}
                colorFront={settings.colorFront}
                colorHighlight={settings.colorHighlight}
                palette={settings.customPalette}
                colorSteps={settings.colorSteps}
                inverted={settings.inverted}
                fit={settings.fit}
                scale={settings.scale}
                rotation={settings.rotation}
                offsetX={settings.offsetX}
                offsetY={settings.offsetY}
                brightness={settings.brightness}
                contrast={settings.contrast}
                saturation={settings.saturation}
                gamma={settings.gamma}
                proceduralShape={settings.proceduralShape}
                animated={settings.animated || isWebcamActive || settings.mediaType === "video"}
                animationSpeed={settings.animationSpeed}
              />
            )}

            {/* Drag and drop overlay badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-[11px] font-mono text-neutral-400 pointer-events-none hidden md:block">
              Drop image/video or paste (Ctrl+V)
            </div>
          </div>

          {/* Floating Video Controls when video is active */}
          {settings.mediaType === "video" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
              <VideoControls videoRef={videoElementRef} />
            </div>
          )}
        </div>
      </main>

      {/* Right Control Sidebar */}
      <ControlPanel
        settings={settings}
        onChange={updateSettings}
        onUploadImage={handleUploadImage}
        onUploadVideo={handleUploadVideo}
        onToggleWebcam={toggleWebcam}
        isWebcamActive={isWebcamActive}
        onOpenExport={() => setIsExportOpen(true)}
        onApplyPreset={(preset) => updateSettings(preset)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        settings={settings}
        onCaptureBlob={handleCaptureBlob}
        canvasRef={
          (settings.engineMode === "cpu"
            ? cpuCanvasRef
            : { current: ditherRef.current?.canvas ?? null }) as React.RefObject<HTMLCanvasElement | null>
        }
      />
    </div>
  );
}
