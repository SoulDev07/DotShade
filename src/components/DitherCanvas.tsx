"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { DitherWebGLMount } from "@/engine/webgl-mount";
import { DitherVgpuMount } from "@/engine/vgpu-mount";
import type { DitherSettings } from "@/engine/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Union of active GPU mount instances (WebGL2 or WebGPU/vgpu).
 */
export type ActiveDitherMount = DitherWebGLMount | DitherVgpuMount;

/**
 * Props for the core DitherCanvas rendering component.
 */
export interface DitherCanvasProps {
  /** Current dither configuration settings */
  settings: DitherSettings;
  /** Image URL, HTMLImageElement, HTMLVideoElement, or null */
  src?: string | HTMLImageElement | HTMLVideoElement | null;
  /** Optional custom container CSS classes */
  className?: string;
  /** Optional container style object */
  style?: React.CSSProperties;
  /** Callback fired when the GPU mount is compiled and ready */
  onReady?: (mount: ActiveDitherMount) => void;
  /** Callback fired if hardware acceleration or shader compilation fails */
  onError?: (error: unknown) => void;
}

/**
 * Imperative ref methods exposed by DitherCanvas.
 */
export interface DitherCanvasHandle {
  /** Reference to the active GPU mount */
  mount: ActiveDitherMount | null;
  /** Reference to the underlying HTMLCanvasElement */
  canvas: HTMLCanvasElement | null;
  /** Imperatively requests a single frame redraw */
  render: () => void;
  /** Captures the current canvas contents as an image Blob */
  getSnapshotBlob: (
    type?: "image/png" | "image/webp" | "image/jpeg",
    quality?: number
  ) => Promise<Blob | null>;
}

/**
 * DitherCanvas:
 * Core responsive viewport managing WebGL2 and WebGPU canvas lifecycles.
 * Handles automatic fallback from WebGPU to WebGL2, DPR-aware high-DPI scaling,
 * container ResizeObserver events, and media source streaming.
 */
export const DitherCanvas = React.memo(
  forwardRef<DitherCanvasHandle, DitherCanvasProps>(function DitherCanvas(
    { settings, src, className, style, onReady, onError },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mountRef = useRef<ActiveDitherMount | null>(null);

    // Track active engine and version to guarantee a fresh canvas on engine change/fallback
    const [activeEngine, setActiveEngine] = useState<"vgpu" | "webgl">(
      settings.engine === "vgpu" ? "vgpu" : "webgl"
    );
    const [engineVersion, setEngineVersion] = useState(0);

    // Synchronize active engine when settings.engine changes
    useEffect(() => {
      const targetEngine = settings.engine === "vgpu" ? "vgpu" : "webgl";
      setActiveEngine(targetEngine);
      setEngineVersion((v) => v + 1);
    }, [settings.engine]);

    const applySource = useCallback((mount: any, media: typeof src) => {
      if (!mount) return;
      if (!media) {
        if (typeof mount.setImage === "function") mount.setImage(null);
        else if (typeof mount.setMediaSource === "function") mount.setMediaSource(null);
        return;
      }

      if (typeof media === "string") {
        const img = new Image();
        if (media.startsWith("http://") || media.startsWith("https://")) {
          img.crossOrigin = "anonymous";
        }
        img.src = media;
        img.onload = () => {
          if (typeof mount.setImage === "function") mount.setImage(img);
          else if (typeof mount.setMediaSource === "function") mount.setMediaSource(img);
        };
      } else if (media instanceof HTMLImageElement) {
        if (media.complete) {
          if (typeof mount.setImage === "function") mount.setImage(media);
          else if (typeof mount.setMediaSource === "function") mount.setMediaSource(media);
        } else {
          media.onload = () => {
            if (typeof mount.setImage === "function") mount.setImage(media);
            else if (typeof mount.setMediaSource === "function") mount.setMediaSource(media);
          };
        }
      } else if (media instanceof HTMLVideoElement) {
        if (typeof mount.setImage === "function") mount.setImage(media);
        else if (typeof mount.setMediaSource === "function") mount.setMediaSource(media);
      }
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width || 500));
      const h = Math.max(1, Math.floor(rect.height || 300));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      let isCancelled = false;
      let activeMount: ActiveDitherMount | null = null;

      const initMount = async () => {
        if (activeEngine === "vgpu" && typeof navigator !== "undefined" && "gpu" in navigator) {
          try {
            const vgpuMount = new DitherVgpuMount(canvas, settings);
            const ok = await vgpuMount.init();
            if (isCancelled) {
              vgpuMount.dispose();
              return;
            }
            if (ok) {
              activeMount = vgpuMount;
              mountRef.current = vgpuMount;
              if (onReady) onReady(vgpuMount);
              applySource(vgpuMount, src);
              return;
            }
          } catch (err) {
            console.warn("vgpu (WebGPU) initialization failed, falling back to WebGL2:", err);
            onError?.(err);
            if (!isCancelled) {
              toast.warning("WebGPU unavailable on this device", {
                description: "Switched to WebGL2 engine automatically.",
              });
              setActiveEngine("webgl");
              setEngineVersion((v) => v + 1);
              return;
            }
          }
        }

        try {
          const webglMount = new DitherWebGLMount(canvas, settings);
          if (isCancelled) {
            webglMount.dispose();
            return;
          }
          activeMount = webglMount;
          mountRef.current = webglMount;
          if (onReady) onReady(webglMount);
          applySource(webglMount, src);
        } catch (err) {
          console.error("Failed to initialize WebGL Mount:", err);
          onError?.(err);
        }
      };

      initMount();

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            const curDpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(width * curDpr);
            canvas.height = Math.floor(height * curDpr);
            activeMount?.render();
          }
        }
      });
      resizeObserver.observe(container);

      return () => {
        isCancelled = true;
        resizeObserver.disconnect();
        activeMount?.dispose();
        mountRef.current = null;
      };
    }, [activeEngine, engineVersion]);

    useEffect(() => {
      mountRef.current?.updateOptions(settings);
    }, [settings]);

    useEffect(() => {
      if (mountRef.current) {
        applySource(mountRef.current, src);
      }
    }, [src, applySource]);

    useImperativeHandle(
      ref,
      () => ({
        mount: mountRef.current,
        canvas: canvasRef.current,
        render: () => mountRef.current?.render(),
        getSnapshotBlob: (type, quality) =>
          mountRef.current?.getSnapshotBlob(type, quality) ?? Promise.resolve(null),
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full h-full overflow-hidden select-none", className)}
        style={style}
      >
        {/* Key forces fresh canvas DOM element on engine switch to prevent WebGPU / WebGL2 context collisions */}
        <canvas
          key={`${activeEngine}-${engineVersion}`}
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none pixel-art"
          aria-label="DotShade Dither Canvas"
        />
      </div>
    );
  })
);

