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

export type ActiveDitherMount = DitherWebGLMount | DitherVgpuMount;

export interface DitherCanvasProps {
  settings: DitherSettings;
  src?: string | HTMLImageElement | HTMLVideoElement | null;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (mount: ActiveDitherMount) => void;
  onError?: (error: unknown) => void;
}

export interface DitherCanvasHandle {
  mount: ActiveDitherMount | null;
  canvas: HTMLCanvasElement | null;
  render: () => void;
  getSnapshotBlob: (
    type?: "image/png" | "image/webp" | "image/jpeg",
    quality?: number
  ) => Promise<Blob | null>;
}
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

    const applySource = useCallback((mount: ActiveDitherMount | null, media: typeof src) => {
      if (!mount) return;
      if (!media) {
        mount.setImage(null);
        return;
      }

      if (typeof media === "string") {
        const img = new Image();
        if (media.startsWith("http://") || media.startsWith("https://")) {
          img.crossOrigin = "anonymous";
        }
        img.src = media;
        img.onload = () => {
          mount.setImage(img);
        };
      } else if (media instanceof HTMLImageElement) {
        if (media.complete) {
          mount.setImage(media);
        } else {
          media.onload = () => {
            mount.setImage(media);
          };
        }
      } else if (media instanceof HTMLVideoElement) {
        mount.setImage(media);
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
        get mount() {
          return mountRef.current;
        },
        get canvas() {
          return canvasRef.current;
        },
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

