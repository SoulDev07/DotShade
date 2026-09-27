"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import {
  CornersOut,
  CornersIn,
  SquareSplitHorizontal,
  ArrowCounterClockwise,
  DownloadSimple,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { DitherCanvas, type DitherCanvasHandle } from "./DitherCanvas";
import { ControlPanel } from "./ControlPanel";
import { SplitCompareSlider } from "./SplitCompareSlider";
import { VideoControls } from "./VideoControls";
import { ExportModal } from "./ExportModal";
import { processCpuDithering } from "@/engine/cpu-dither";
import type { DitherSettings } from "@/engine/types";
import { DotShadeLogo } from "./ui/DotShadeLogo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INITIAL_SETTINGS: DitherSettings = {
  engine: "vgpu",
  mediaType: "image",
  mediaUrl: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?q=80&w=1200&auto=format&fit=crop",
  ditherType: "8x8",
  cpuAlgorithm: "floyd-steinberg",
  pxSize: 2,
  threshold: 0.5,
  halftoneAngle: 45,
  halftoneScale: 2,
  colorMode: "paper",
  colorBack: "#000c38",
  colorFront: "#94ffaf",
  colorHighlight: "#eaff94",
  paletteId: "paper-mint",
  palette: ["#000c38", "#94ffaf", "#eaff94"],
  colorSteps: 2,
  inverted: false,
  fit: "contain",
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
  const [settings, setSettings] = useState<DitherSettings>(INITIAL_SETTINGS);
  const deferredSettings = useDeferredValue(settings);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const handleCloseExport = useCallback(() => setIsExportOpen(false), []);
  const handleOpenExport = useCallback(() => setIsExportOpen(true), []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const ditherRef = useRef<DitherCanvasHandle>(null);
  const cpuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHeldRef = useRef(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const handleOriginalPointerDown = useCallback(() => {
    if (settings.mediaType === "procedural" && !isWebcamActive) return;
    isHeldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      isHeldRef.current = true;
      setIsSplitView(false);
      setIsViewingOriginal(true);
    }, 180);
  }, [settings.mediaType, isWebcamActive]);

  const handleOriginalPointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHeldRef.current) {
      isHeldRef.current = false;
      setIsViewingOriginal(false);
    }
  }, []);

  const handleOriginalPointerLeave = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHeldRef.current) {
      isHeldRef.current = false;
      setIsViewingOriginal(false);
    }
  }, []);

  const handleOriginalClick = useCallback(() => {
    if (settings.mediaType === "procedural" && !isWebcamActive) {
      toast.info("Original view is not applicable for procedural patterns");
      return;
    }
    if (!isHeldRef.current) {
      setIsViewingOriginal((prev) => {
        const next = !prev;
        if (next) setIsSplitView(false);
        return next;
      });
    }
  }, [settings.mediaType, isWebcamActive]);

  const updateSettings = useCallback((updater: Partial<DitherSettings>) => {
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
        toast.success("Loaded image into workspace", { description: file.name });
      } else if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        updateSettings({ mediaType: "video", mediaUrl: url });
        toast.success("Loaded video into workspace", { description: file.name });
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
          toast.success("Image pasted from clipboard!");
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [updateSettings]);

  // Handle Webcam
  const toggleWebcam = useCallback(async () => {
    if (isWebcamActive) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((track) => track.stop());
        webcamStreamRef.current = null;
      }
      setIsWebcamActive(false);
      toast.info("Webcam disconnected");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      webcamStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play();
      }
      setIsWebcamActive(true);
      updateSettings({ mediaType: "video" });
      toast.success("Live webcam connected!");
    } catch (err) {
      console.error("Failed to access webcam:", err);
      toast.error("Could not access webcam. Please check permissions.");
    }
  }, [isWebcamActive, updateSettings]);

  const handleUploadImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    updateSettings({ mediaType: "image", mediaUrl: url });
    toast.success("Uploaded image", { description: file.name });
  }, [updateSettings]);

  const handleUploadVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    updateSettings({ mediaType: "video", mediaUrl: url, animated: true });
    toast.success("Uploaded video", { description: file.name });
  }, [updateSettings]);

  // Track media natural dimensions for pixel-perfect aspect framing
  useEffect(() => {
    if (settings.mediaType === "image" && settings.mediaUrl) {
      const img = new Image();
      if (settings.mediaUrl.startsWith("http://") || settings.mediaUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = settings.mediaUrl;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setMediaDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };
    } else if (settings.mediaType === "video" && videoElementRef.current) {
      const v = videoElementRef.current;
      const handleLoaded = () => {
        if (v.videoWidth && v.videoHeight) {
          setMediaDimensions({
            width: v.videoWidth,
            height: v.videoHeight,
          });
        }
      };
      v.addEventListener("loadedmetadata", handleLoaded);
      if (v.videoWidth) handleLoaded();
      return () => v.removeEventListener("loadedmetadata", handleLoaded);
    } else if (settings.mediaType === "procedural") {
      setMediaDimensions(null);
    }
  }, [settings.mediaType, settings.mediaUrl]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleOpenExport();
      } else if (e.key === "Tab") {
        e.preventDefault();
        setIsSplitView((prev) => !prev);
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        handleReset();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if ((e.key.toLowerCase() === "o" || e.key === "\\") && !e.ctrlKey && !e.metaKey) {
        if (e.repeat) return;
        e.preventDefault();
        handleOriginalClick();
      } else if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) {
        setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))));
      } else if ((e.key === "-" || e.key === "_") && !e.ctrlKey && !e.metaKey) {
        setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
      } else if (e.key === "0" && !e.ctrlKey && !e.metaKey) {
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOriginalClick]);

  const handleReset = () => {
    setSettings(INITIAL_SETTINGS);
    setIsViewingOriginal(false);
    toast.info("Settings reset to defaults");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // CPU dither pipeline fallback execution
  // Uses deferredSettings and requestAnimationFrame so rapid slider drags don't choke the main thread
  useEffect(() => {
    if (deferredSettings.engine !== "cpu" || !cpuCanvasRef.current) return;
    const canvas = cpuCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isSubscribed = true;
    let animFrameId: number | null = null;

    const runCpu = async () => {
      if (!deferredSettings.mediaUrl) return;
      const img = new Image();
      if (deferredSettings.mediaUrl.startsWith("http://") || deferredSettings.mediaUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = deferredSettings.mediaUrl;
      img.onload = () => {
        if (!isSubscribed) return;
        animFrameId = requestAnimationFrame(() => {
          if (!isSubscribed) return;
          const maxDim = 600;
          let w = img.naturalWidth || 600;
          let h = img.naturalHeight || 400;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const processed = processCpuDithering(imgData, {
            algorithm: deferredSettings.cpuAlgorithm,
            colorMode: deferredSettings.colorMode,
            colorBack: deferredSettings.colorBack,
            colorFront: deferredSettings.colorFront,
            colorHighlight: deferredSettings.colorHighlight,
            palette: deferredSettings.palette,
            colorSteps: deferredSettings.colorSteps,
            threshold: deferredSettings.threshold,
            brightness: deferredSettings.brightness,
            contrast: deferredSettings.contrast,
            gamma: deferredSettings.gamma,
            inverted: deferredSettings.inverted,
          });
          if (isSubscribed) {
            ctx.putImageData(processed, 0, 0);
          }
        });
      };
    };

    runCpu();
    return () => {
      isSubscribed = false;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    };
  }, [
    deferredSettings.engine,
    deferredSettings.mediaUrl,
    deferredSettings.cpuAlgorithm,
    deferredSettings.colorMode,
    deferredSettings.colorBack,
    deferredSettings.colorFront,
    deferredSettings.colorHighlight,
    deferredSettings.palette,
    deferredSettings.colorSteps,
    deferredSettings.threshold,
    deferredSettings.brightness,
    deferredSettings.contrast,
    deferredSettings.gamma,
    deferredSettings.inverted,
  ]);

  const handleCaptureBlob = useCallback(
    async (type: "image/png" | "image/webp" | "image/jpeg"): Promise<Blob | null> => {
      if (settings.engine === "cpu" && cpuCanvasRef.current) {
        return new Promise((resolve) => {
          cpuCanvasRef.current?.toBlob((blob) => resolve(blob), type, 0.95);
        });
      }
      return (await ditherRef.current?.getSnapshotBlob(type, 0.95)) ?? null;
    },
    [settings.engine]
  );

  const objectFitClass =
    settings.fit === "contain"
      ? "object-contain"
      : settings.fit === "fill"
      ? "object-fill"
      : "object-cover";

  const mediaTransformStyle = useMemo<React.CSSProperties>(
    () => ({
      transform: `translate(${settings.offsetX * 100}%, ${settings.offsetY * 100}%) rotate(${settings.rotation}deg) scale(${settings.scale})`,
      transformOrigin: "center center",
    }),
    [settings.offsetX, settings.offsetY, settings.rotation, settings.scale]
  );

  const activeMediaSrc =
    settings.mediaType === "video" || isWebcamActive
      ? videoElementRef.current
      : settings.mediaType === "image"
      ? settings.mediaUrl
      : null;

  // Memoize DitherCanvas node using deferredSettings for interruptible rendering
  const ditherCanvasElement = useMemo(
    () => (
      <DitherCanvas
        ref={ditherRef}
        settings={deferredSettings}
        src={activeMediaSrc}
      />
    ),
    [deferredSettings, activeMediaSrc]
  );

  // Memoize original element for SplitCompareSlider
  const originalMediaElement = useMemo(() => {
    if (settings.mediaType === "video") {
      return (
        <video
          src={settings.mediaUrl}
          autoPlay
          loop
          muted
          className={cn("w-full h-full", objectFitClass)}
          style={mediaTransformStyle}
        />
      );
    }
    return (
      <img
        src={settings.mediaUrl}
        alt="Original Source"
        className={cn("w-full h-full", objectFitClass)}
        style={mediaTransformStyle}
      />
    );
  }, [settings.mediaType, settings.mediaUrl, objectFitClass, mediaTransformStyle]);

  const stageContainerStyle = useMemo<React.CSSProperties>(() => {
    if (!mediaDimensions || settings.fit !== "contain") {
      return {
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
      };
    }
    const { width, height } = mediaDimensions;
    const isLandscape = width >= height;
    return {
      aspectRatio: `${width} / ${height}`,
      width: isLandscape ? "100%" : "auto",
      height: !isLandscape ? "100%" : "auto",
      maxWidth: "100%",
      maxHeight: "100%",
      transform: zoom !== 1 ? `scale(${zoom})` : undefined,
    };
  }, [mediaDimensions, settings.fit, zoom]);

  return (
    <div className="flex flex-col lg:flex-row w-screen h-screen overflow-hidden bg-background text-foreground font-sans select-none">
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-12 border-b border-border bg-card px-4 flex items-center justify-between z-30 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <DotShadeLogo size={20} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              DotShade
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-medium">
              {settings.engine}
            </span>
            {mediaDimensions && (
              <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground border-l border-border pl-2.5">
                {mediaDimensions.width} × {mediaDimensions.height} px
              </span>
            )}
          </div>

          <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => {
                setIsViewingOriginal(false);
                setIsSplitView(false);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-mono transition-all btn-press",
                !isViewingOriginal && !isSplitView
                  ? "bg-card text-foreground font-semibold shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              Dither
            </button>
            <button
              type="button"
              onClick={() => {
                if (settings.mediaType === "procedural" && !isWebcamActive) {
                  toast.info("Split view is not applicable for procedural mode");
                  return;
                }
                setIsViewingOriginal(false);
                setIsSplitView((prev) => !prev);
              }}
              disabled={settings.mediaType === "procedural" && !isWebcamActive}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all btn-press",
                settings.mediaType === "procedural" && !isWebcamActive
                  ? "opacity-40 cursor-not-allowed text-muted-foreground/50 border border-transparent"
                  : isSplitView
                  ? "bg-card text-foreground font-semibold shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
              title="Split Comparison (Tab)"
            >
              <SquareSplitHorizontal className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={handleOriginalClick}
              onPointerDown={handleOriginalPointerDown}
              onPointerUp={handleOriginalPointerUp}
              onPointerLeave={handleOriginalPointerLeave}
              disabled={settings.mediaType === "procedural" && !isWebcamActive}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all btn-press",
                settings.mediaType === "procedural" && !isWebcamActive
                  ? "opacity-40 cursor-not-allowed text-muted-foreground/50 border border-transparent"
                  : isViewingOriginal
                  ? "bg-card text-foreground font-semibold shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
              title="View Original (Click to toggle, hold to peek, or press 'O')"
            >
              {isViewingOriginal ? (
                <EyeSlash className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>Original</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => updateSettings({ fit: "contain" })}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono transition-all btn-press",
                  settings.fit === "contain"
                    ? "bg-card text-foreground font-semibold shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
                title="Fit to stage"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ fit: "cover" })}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono transition-all btn-press",
                  settings.fit === "cover"
                    ? "bg-card text-foreground font-semibold shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
                title="Fill stage"
              >
                Fill
              </button>
            </div>

            <div className="hidden sm:flex items-center bg-secondary/80 rounded-lg border border-border px-1 py-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center text-xs font-mono text-muted-foreground hover:text-foreground rounded transition-colors btn-press"
                title="Zoom out (-)"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                title="Reset zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center text-xs font-mono text-muted-foreground hover:text-foreground rounded transition-colors btn-press"
                title="Zoom in (+)"
              >
                +
              </button>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 bg-secondary hover:bg-secondary/80 border border-border hover:border-border-hover text-muted-foreground hover:text-foreground rounded-lg text-xs font-mono transition-colors btn-press"
              title="Reset Settings (R)"
            >
              <ArrowCounterClockwise className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-secondary hover:bg-secondary/80 border border-border hover:border-border-hover text-muted-foreground hover:text-foreground rounded-lg text-xs font-mono transition-colors btn-press"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <CornersIn className="w-3.5 h-3.5" /> : <CornersOut className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleOpenExport}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-mono font-semibold transition-colors btn-press shadow-sm"
              title="Export (Ctrl+S)"
            >
              <DownloadSimple className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </header>

        <div
          ref={stageRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDraggingOver(false);
          }}
          onDrop={(e) => {
            setIsDraggingOver(false);
            handleDrop(e);
          }}
          className="flex-1 relative flex items-center justify-center p-4 lg:p-6 overflow-hidden bg-background"
        >
          {isDraggingOver && (
            <div className="absolute inset-4 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md border-2 border-dashed border-primary rounded-2xl pointer-events-none modal-enter">
              <div className="text-sm font-mono font-semibold text-primary uppercase tracking-widest">
                Drop Media to Dither
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                Release image or video to load into studio
              </div>
            </div>
          )}

          <div
            className="relative rounded-xl border border-border bg-card/90 overflow-hidden flex items-center justify-center shadow-xl transition-[transform] duration-150 ease-out"
            style={stageContainerStyle}
          >
            <video
              ref={videoElementRef}
              src={settings.mediaType === "video" ? settings.mediaUrl : undefined}
              loop
              muted
              playsInline
              autoPlay={settings.mediaType === "video" || isWebcamActive}
              className={cn(
                isViewingOriginal && (settings.mediaType === "video" || isWebcamActive)
                  ? cn("w-full h-full select-none", objectFitClass)
                  : "hidden"
              )}
              style={
                isViewingOriginal && (settings.mediaType === "video" || isWebcamActive)
                  ? mediaTransformStyle
                  : undefined
              }
            />

            {isViewingOriginal ? (
              settings.mediaType === "image" ? (
                <img
                  src={settings.mediaUrl}
                  alt="Original Source"
                  className={cn("w-full h-full select-none pointer-events-none", objectFitClass)}
                  style={mediaTransformStyle}
                />
              ) : null
            ) : isSplitView ? (
              <SplitCompareSlider
                originalElement={originalMediaElement}
                ditheredElement={ditherCanvasElement}
              />
            ) : settings.engine === "cpu" ? (
              <canvas
                ref={cpuCanvasRef}
                className="w-full h-full object-contain pixel-art"
              />
            ) : (
              ditherCanvasElement
            )}

            {isViewingOriginal && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-card/95 border border-primary/40 rounded-md text-xs font-mono text-primary shadow-xl backdrop-blur-md">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Original {settings.mediaType === "video" || isWebcamActive ? "Video" : "Photo"}
                </span>
                <span className="text-[10px] text-muted-foreground border-l border-border pl-2">
                  Raw Source
                </span>
                <button
                  onClick={() => setIsViewingOriginal(false)}
                  className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Return to dithered (O)"
                >
                  <EyeSlash className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {settings.mediaType === "video" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
              <VideoControls videoRef={videoElementRef} />
            </div>
          )}
        </div>
      </main>

      <ControlPanel
        settings={settings}
        onChange={updateSettings}
        onUploadImage={handleUploadImage}
        onUploadVideo={handleUploadVideo}
        onToggleWebcam={toggleWebcam}
        isWebcamActive={isWebcamActive}
        onApplyPreset={updateSettings}
        isViewingOriginal={isViewingOriginal}
        onToggleOriginal={handleOriginalClick}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={handleCloseExport}
        settings={settings}
        onCaptureBlob={handleCaptureBlob}
        canvasRef={
          (settings.engine === "cpu"
            ? cpuCanvasRef
            : { current: ditherRef.current?.canvas ?? null }) as React.RefObject<HTMLCanvasElement | null>
        }
      />
    </div>
  );
}
