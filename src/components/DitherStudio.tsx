"use client";

import {
  ArrowCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  DiceFiveIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  SquareSplitHorizontalIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { processCpuDitheringAsync } from "@/engine/cpu-dither-client";
import { RETRO_PALETTES } from "@/engine/palettes";
import type { ColorMode, DitherPattern, DitherSettings, MediaType } from "@/engine/types";
import { cn } from "@/lib/utils";
import { ControlPanel } from "./ControlPanel";
import { DitherCanvas, type DitherCanvasHandle } from "./DitherCanvas";
import { ExportModal } from "./ExportModal";
import { SplitCompareSlider } from "./SplitCompareSlider";
import { DotShadeLogo } from "./ui/DotShadeLogo";
import { VideoControls } from "./VideoControls";

const INITIAL_SETTINGS: DitherSettings = {
  engine: "vgpu",
  mediaType: "image",
  mediaUrl: "/samples/botanical-palm.webp",
  ditherType: "8x8",
  cpuAlgorithm: "floyd-steinberg",
  pxSize: 2,
  threshold: 0.5,
  halftoneAngle: 45,
  halftoneScale: 2,
  colorMode: "original",
  colorBack: "#000000",
  colorFront: "#ffffff",
  colorHighlight: "#e5e5e5",
  paletteId: "macintosh-1bit",
  palette: ["#000000", "#ffffff"],
  colorSteps: 4,
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
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const prevMediaTypeRef = useRef<MediaType | null>(null);
  const prevAnimatedRef = useRef(false);
  const ditherRef = useRef<DitherCanvasHandle>(null);
  const cpuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHeldRef = useRef(false);
  const cachedCpuImageRef = useRef<{ url: string; img: HTMLImageElement } | null>(null);
  const cpuVideoNoticeRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const scheduleRevoke = useCallback((url: string | undefined) => {
    if (!url?.startsWith("blob:")) return;
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
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

  const updateSettings = useCallback(
    (updater: Partial<DitherSettings>) => {
      const prevUrl = settingsRef.current.mediaUrl;
      if (updater.mediaUrl !== undefined && updater.mediaUrl !== prevUrl) {
        scheduleRevoke(prevUrl);
      }
      settingsRef.current = { ...settingsRef.current, ...updater };
      setSettings((prev) => ({ ...prev, ...updater }));
    },
    [scheduleRevoke],
  );

  const onDropFiles = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.[0]) {
        const file = acceptedFiles[0];
        const url = URL.createObjectURL(file);
        if (file.type.startsWith("image/")) {
          updateSettings({ mediaType: "image", mediaUrl: url, animated: false });
          toast.success("Loaded image into workspace", { description: file.name });
        } else if (file.type.startsWith("video/")) {
          updateSettings({ mediaType: "video", mediaUrl: url, animated: true });
          toast.success("Loaded video into workspace", { description: file.name });
        } else {
          URL.revokeObjectURL(url);
        }
      }
    },
    [updateSettings],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [],
      "video/*": [],
    },
  });

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          updateSettings({ mediaType: "image", mediaUrl: url, animated: false });
          toast.success("Image pasted from clipboard!");
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [updateSettings]);

  const toggleWebcam = useCallback(async () => {
    if (isWebcamActive) {
      webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
      if (videoElementRef.current) videoElementRef.current.srcObject = null;
      setIsWebcamActive(false);
      const wasPrevTypeImage = prevMediaTypeRef.current === "image";
      const prevType = prevMediaTypeRef.current;
      const prevAnimated = prevAnimatedRef.current;
      prevMediaTypeRef.current = null;
      if (prevType) {
        updateSettings({ mediaType: prevType, animated: !wasPrevTypeImage && prevAnimated });
      }
      toast.info("Webcam disconnected");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      prevMediaTypeRef.current = settingsRef.current.mediaType;
      prevAnimatedRef.current = settingsRef.current.animated;
      webcamStreamRef.current = stream;
      updateSettings({ mediaType: "video", animated: true });
      setIsWebcamActive(true);
      toast.success("Live webcam connected!");
    } catch (err) {
      console.error("Failed to access webcam:", err);
      toast.error("Could not access webcam. Please check permissions.");
    }
  }, [isWebcamActive, updateSettings]);

  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;
    if (isWebcamActive) {
      const stream = webcamStreamRef.current;
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch((err) => console.warn("Webcam autoplay rejected:", err));
      }
    } else if (video.srcObject) {
      video.srcObject = null;
    }
  }, [isWebcamActive]);

  const handleUploadImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      updateSettings({ mediaType: "image", mediaUrl: url, animated: false });
      toast.success("Uploaded image", { description: file.name });
    },
    [updateSettings],
  );

  const handleUploadVideo = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      updateSettings({ mediaType: "video", mediaUrl: url, animated: true });
      toast.success("Uploaded video", { description: file.name });
    },
    [updateSettings],
  );

  useEffect(() => {
    let cancelled = false;
    if (settings.mediaType === "image" && settings.mediaUrl) {
      const img = new Image();
      if (settings.mediaUrl.startsWith("http://") || settings.mediaUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = settings.mediaUrl;
      img.onload = () => {
        if (cancelled) return;
        if (img.naturalWidth && img.naturalHeight) {
          setMediaDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };
      return () => {
        cancelled = true;
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

  const handleReset = useCallback(() => {
    scheduleRevoke(settingsRef.current.mediaUrl);
    settingsRef.current = INITIAL_SETTINGS;
    setSettings(INITIAL_SETTINGS);
    setIsViewingOriginal(false);
    toast.info("Settings reset to defaults");
  }, [scheduleRevoke]);

  const handleRandomize = useCallback(() => {
    const patterns: DitherPattern[] = [
      "8x8",
      "4x4",
      "2x2",
      "16x16",
      "noise",
      "halftone",
      "crosshatch",
      "clustered",
    ];
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

    const colorModes: ColorMode[] = ["paper", "duotone", "palette", "original", "grayscale"];
    const randomMode = colorModes[Math.floor(Math.random() * colorModes.length)];

    const randomPalette = RETRO_PALETTES[Math.floor(Math.random() * RETRO_PALETTES.length)];
    const randomPxSize = Number((1 + Math.random() * 3).toFixed(1));
    const randomThreshold = Number((0.35 + Math.random() * 0.3).toFixed(2));
    const randomColorSteps = Math.floor(2 + Math.random() * 6);

    const randomAngle = Math.floor(Math.random() * 12) * 15;
    const randomHalftoneScale = Number((1 + Math.random() * 3).toFixed(1));

    const colorBack = randomPalette.colors[0] || "#000000";
    const colorFront = randomPalette.colors[randomPalette.colors.length - 1] || "#ffffff";
    const colorHighlight =
      randomPalette.colors[1] || randomPalette.colors[randomPalette.colors.length - 1] || "#ffffff";

    setSettings((prev) => ({
      ...prev,
      ditherType: randomPattern,
      colorMode: randomMode,
      paletteId: randomPalette.id,
      palette: [...randomPalette.colors],
      colorBack,
      colorFront,
      colorHighlight,
      pxSize: randomPxSize,
      threshold: randomThreshold,
      colorSteps: randomColorSteps,
      halftoneAngle: randomAngle,
      halftoneScale: randomHalftoneScale,
    }));

    setIsViewingOriginal(false);
    toast.success(`Randomized: ${randomPattern.toUpperCase()} • ${randomPalette.name}`);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().catch(() => setIsFullscreen(false));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useHotkeys("escape", (e) => {
    e.preventDefault();
    if (isExportOpen) {
      setIsExportOpen(false);
    } else if (isViewingOriginal) {
      setIsViewingOriginal(false);
    } else if (isSplitView) {
      setIsSplitView(false);
    }
  });

  useHotkeys("mod+s", (e) => {
    e.preventDefault();
    handleOpenExport();
  });

  useHotkeys("s", (e) => {
    e.preventDefault();
    setIsSplitView((prev) => !prev);
  });

  useHotkeys("r", () => handleReset());
  useHotkeys("x", () => handleRandomize());
  useHotkeys("f", () => toggleFullscreen());
  useHotkeys(["o", "\\"], (e) => {
    e.preventDefault();
    handleOriginalClick();
  });
  useHotkeys(["+", "="], () => {
    setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))));
  });
  useHotkeys(["-", "_"], () => {
    setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
  });
  useHotkeys("0", () => setZoom(1));

  useEffect(() => {
    if (deferredSettings.engine !== "cpu" || !cpuCanvasRef.current) return;
    const canvas = cpuCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let isSubscribed = true;

    const runCpu = async () => {
      if (!deferredSettings.mediaUrl) return;

      if (deferredSettings.mediaType !== "image" || isWebcamActive) {
        if (!cpuVideoNoticeRef.current) {
          cpuVideoNoticeRef.current = true;
          toast.info("CPU engine dithers still images only", {
            description: "Switch to the WebGPU or WebGL engine for video/webcam.",
          });
        }
        return;
      }

      const processWithImage = async (img: HTMLImageElement) => {
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
        w = Math.max(1, w);
        h = Math.max(1, h);
        canvas.width = w;
        canvas.height = h;

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const processed = await processCpuDitheringAsync(imgData, {
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
      };

      if (cachedCpuImageRef.current?.url === deferredSettings.mediaUrl) {
        await processWithImage(cachedCpuImageRef.current.img);
        return;
      }

      const img = new Image();
      if (
        deferredSettings.mediaUrl.startsWith("http://") ||
        deferredSettings.mediaUrl.startsWith("https://")
      ) {
        img.crossOrigin = "anonymous";
      }
      img.src = deferredSettings.mediaUrl;
      img.onload = async () => {
        if (!isSubscribed) return;
        cachedCpuImageRef.current = { url: deferredSettings.mediaUrl, img };
        await processWithImage(img);
      };
    };

    runCpu();
    return () => {
      isSubscribed = false;
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
      if (settings.engine === "cpu") {
        const canvas = cpuCanvasRef.current;
        if (!canvas) return null;
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, 0.95));
      }
      return (await ditherRef.current?.getSnapshotBlob(type, 0.95)) ?? null;
    },
    [settings.engine],
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
    [settings.offsetX, settings.offsetY, settings.rotation, settings.scale],
  );

  const activeMediaSrc =
    settings.mediaType === "video" || isWebcamActive
      ? videoElementRef.current
      : settings.mediaType === "image"
        ? settings.mediaUrl
        : null;

  const ditherCanvasElement = useMemo(
    () => <DitherCanvas ref={ditherRef} settings={deferredSettings} src={activeMediaSrc} />,
    [deferredSettings, activeMediaSrc],
  );

  const ditheredElement =
    settings.engine === "cpu" ? (
      <canvas ref={cpuCanvasRef} className="pixel-art h-full w-full object-contain" />
    ) : (
      ditherCanvasElement
    );

  const exportCanvasRef = useMemo<React.RefObject<HTMLCanvasElement | null>>(
    () => ({
      get current() {
        return settings.engine === "cpu"
          ? cpuCanvasRef.current
          : (ditherRef.current?.canvas ?? null);
      },
    }),
    [settings.engine],
  );

  const showRawVideo = isViewingOriginal && (settings.mediaType === "video" || isWebcamActive);

  const originalMediaElement = useMemo(() => {
    if (isWebcamActive) {
      const stream = webcamStreamRef.current;
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
          className={cn("h-full w-full", objectFitClass)}
          style={mediaTransformStyle}
        />
      );
    }
    if (settings.mediaType === "video") {
      return (
        <video
          src={settings.mediaUrl}
          autoPlay
          loop
          muted
          className={cn("h-full w-full", objectFitClass)}
          style={mediaTransformStyle}
        />
      );
    }
    return (
      <img
        src={settings.mediaUrl}
        alt="Original Source"
        className={cn("h-full w-full", objectFitClass)}
        style={mediaTransformStyle}
      />
    );
  }, [isWebcamActive, settings.mediaType, settings.mediaUrl, objectFitClass, mediaTransformStyle]);

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
    <div className="bg-background text-foreground flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden font-sans select-none sm:flex-row">
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          className="border-border bg-card z-30 flex h-12 shrink-0 items-center justify-between gap-1.5 border-b px-2.5 sm:gap-3 sm:px-4"
          style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.08)" }}
        >
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <DotShadeLogo size={18} />
            <span className="font-mono text-xs font-bold tracking-wider text-white uppercase">
              DotShade
            </span>
            <span
              className="bg-secondary border-border text-foreground hidden border px-2 py-0.5 font-mono text-[10px] font-medium uppercase sm:inline-block"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
            >
              {settings.engine}
            </span>
            {mediaDimensions && (
              <span className="text-muted-foreground border-border hidden border-l pl-2.5 font-mono text-[10px] md:inline-block">
                {mediaDimensions.width} × {mediaDimensions.height} px
              </span>
            )}
          </div>

          <div
            className="bg-secondary/80 border-border flex shrink-0 items-center border p-0.5"
            style={{ gap: "1px" }}
          >
            <button
              type="button"
              onClick={() => {
                setIsViewingOriginal(false);
                setIsSplitView(false);
              }}
              className={cn(
                "btn-press px-2 py-1 font-mono text-[11px] transition-all sm:px-2.5 sm:text-xs",
                !isViewingOriginal && !isSplitView
                  ? "bg-primary text-primary-foreground border-primary border font-bold"
                  : "text-muted-foreground hover:text-foreground hover:border-border border border-transparent",
              )}
            >
              DITHER
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
                "btn-press flex items-center gap-1 px-2 py-1 font-mono text-xs transition-all sm:gap-1.5 sm:px-2.5",
                settings.mediaType === "procedural" && !isWebcamActive
                  ? "text-muted-foreground/50 cursor-not-allowed border border-transparent opacity-40"
                  : isSplitView
                    ? "bg-primary text-primary-foreground border-primary border font-bold"
                    : "text-muted-foreground hover:text-foreground hover:border-border border border-transparent",
              )}
              title="Split Comparison (S)"
            >
              <SquareSplitHorizontalIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SPLIT</span>
            </button>
            <button
              type="button"
              onClick={handleOriginalClick}
              onPointerDown={handleOriginalPointerDown}
              onPointerUp={handleOriginalPointerUp}
              onPointerLeave={handleOriginalPointerLeave}
              disabled={settings.mediaType === "procedural" && !isWebcamActive}
              className={cn(
                "btn-press flex items-center gap-1 px-2 py-1 font-mono text-xs transition-all sm:gap-1.5 sm:px-2.5",
                settings.mediaType === "procedural" && !isWebcamActive
                  ? "text-muted-foreground/50 cursor-not-allowed border border-transparent opacity-40"
                  : isViewingOriginal
                    ? "bg-primary text-primary-foreground border-primary border font-bold"
                    : "text-muted-foreground hover:text-foreground hover:border-border border border-transparent",
              )}
              title="View Original (Click to toggle, hold to peek, or press 'O')"
            >
              {isViewingOriginal ? (
                <EyeSlashIcon className="h-3.5 w-3.5" />
              ) : (
                <EyeIcon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">SOURCE</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="bg-secondary/80 border-border hidden items-center border p-0.5 xl:flex"
              style={{ gap: "1px" }}
            >
              <button
                type="button"
                onClick={() => updateSettings({ fit: "contain" })}
                className={cn(
                  "btn-press px-2 py-0.5 font-mono text-[11px] transition-all",
                  settings.fit === "contain"
                    ? "bg-primary text-primary-foreground border-primary border font-bold"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
                title="Fit to stage"
              >
                FIT
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ fit: "cover" })}
                className={cn(
                  "btn-press px-2 py-0.5 font-mono text-[11px] transition-all",
                  settings.fit === "cover"
                    ? "bg-primary text-primary-foreground border-primary border font-bold"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
                title="Fill stage"
              >
                FILL
              </button>
            </div>

            <div
              className="bg-secondary/80 border-border hidden items-center border px-1 py-0.5 xl:flex"
              style={{ gap: "1px" }}
            >
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                className="text-muted-foreground hover:text-primary btn-press flex h-5 w-5 items-center justify-center font-mono text-xs transition-colors"
                title="Zoom out (-)"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="text-primary hover:text-foreground px-1.5 font-mono text-[11px] tabular-nums transition-colors"
                title="Reset zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.15).toFixed(2))))}
                className="text-muted-foreground hover:text-primary btn-press flex h-5 w-5 items-center justify-center font-mono text-xs transition-colors"
                title="Zoom in (+)"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleRandomize}
              className="bg-secondary border-border btn-press flex items-center gap-1 border px-2 py-1 font-mono text-xs text-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-800 hover:text-white"
              title="Randomize style (X)"
            >
              <DiceFiveIcon className="text-primary h-3.5 w-3.5" />
              <span className="hidden font-bold sm:inline">RANDOM</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="bg-secondary hover:bg-secondary/80 border-border hover:border-border-hover text-muted-foreground hover:text-foreground btn-press hidden border p-1.5 font-mono text-xs transition-colors xl:flex"
              title="Reset Settings (R)"
            >
              <ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-secondary hover:bg-secondary/80 border-border hover:border-border-hover text-muted-foreground hover:text-foreground btn-press hidden border p-1.5 font-mono text-xs transition-colors xl:flex"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? (
                <CornersInIcon className="h-3.5 w-3.5" />
              ) : (
                <CornersOutIcon className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="relative xl:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className={cn(
                  "btn-press flex items-center justify-center border p-1.5 transition-colors",
                  isMobileMenuOpen
                    ? "border-white bg-white font-bold text-black"
                    : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground",
                )}
                title="More Studio Tools"
              >
                <DotsThreeVerticalIcon className="h-4 w-4" />
              </button>

              {isMobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)} />
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
                        <button
                          type="button"
                          onClick={() => {
                            updateSettings({ fit: "contain" });
                            setIsMobileMenuOpen(false);
                          }}
                          className={cn(
                            "px-2 py-0.5 font-mono text-[10px]",
                            settings.fit === "contain"
                              ? "bg-white font-bold text-black"
                              : "text-neutral-400",
                          )}
                        >
                          FIT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSettings({ fit: "cover" });
                            setIsMobileMenuOpen(false);
                          }}
                          className={cn(
                            "px-2 py-0.5 font-mono text-[10px]",
                            settings.fit === "cover"
                              ? "bg-white font-bold text-black"
                              : "text-neutral-400",
                          )}
                        >
                          FILL
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-[11px] text-neutral-300">Zoom</span>
                      <div className="border-border flex items-center gap-1 border bg-neutral-900 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))
                          }
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
                          handleReset();
                          setIsMobileMenuOpen(false);
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
                          setIsMobileMenuOpen(false);
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

            <button
              type="button"
              onClick={handleOpenExport}
              className="btn-press flex items-center gap-1.5 border border-white bg-white px-3 py-1 font-mono text-xs font-bold text-black transition-colors hover:bg-neutral-200"
              title="Export (Ctrl+S)"
              style={{ boxShadow: "2px 2px 0 rgba(255,255,255,0.3)" }}
            >
              <DownloadSimpleIcon className="h-3.5 w-3.5" />
              <span>EXPORT</span>
            </button>
          </div>
        </header>

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
              ...stageContainerStyle,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.18), 2px 2px 0 rgba(0,0,0,1)",
            }}
          >
            <div className={cn("absolute inset-0", isViewingOriginal && "invisible")}>
              {ditheredElement}

              {isSplitView && !isViewingOriginal && (
                <SplitCompareSlider originalElement={originalMediaElement} />
              )}
            </div>

            <video
              ref={videoElementRef}
              src={
                settings.mediaType === "video" && !isWebcamActive ? settings.mediaUrl : undefined
              }
              loop={!isWebcamActive}
              muted
              playsInline
              autoPlay={settings.mediaType === "video" || isWebcamActive}
              className={cn(
                "absolute inset-0 h-full w-full select-none",
                showRawVideo ? objectFitClass : "hidden",
              )}
              style={showRawVideo ? mediaTransformStyle : undefined}
            />

            {isViewingOriginal && settings.mediaType === "image" && (
              <img
                src={settings.mediaUrl}
                alt="Original Source"
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full select-none",
                  objectFitClass,
                )}
                style={mediaTransformStyle}
              />
            )}

            {isViewingOriginal && (
              <div
                className="absolute top-3 left-3 z-20 flex items-center gap-2 border border-white bg-black px-3 py-1.5 font-mono text-xs text-white"
                style={{ boxShadow: "2px 2px 0 rgba(0,0,0,1)" }}
              >
                <EyeIcon className="h-3.5 w-3.5 text-white" />
                <span className="text-[11px] font-bold tracking-wider uppercase">
                  SOURCE {settings.mediaType === "video" || isWebcamActive ? "VIDEO" : "PHOTO"}
                </span>
                <span className="border-l border-neutral-700 pl-2 text-[10px] text-neutral-300">
                  RAW
                </span>
                <button
                  type="button"
                  onClick={() => setIsViewingOriginal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary ml-1 p-0.5 transition-colors"
                  title="Return to dithered (O)"
                >
                  <EyeSlashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {settings.mediaType === "video" && (
            <div className="absolute bottom-2.5 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-2 sm:bottom-6 sm:px-4">
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
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={handleCloseExport}
        settings={settings}
        onCaptureBlob={handleCaptureBlob}
        canvasRef={exportCanvasRef}
      />
    </div>
  );
}
