"use client";

import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { shallow } from "zustand/shallow";
import {
  type CaptureSource,
  clearCaptureSource,
  setCaptureSource,
} from "@/engine/capture-registry";
import type { DitherMount } from "@/engine/mount-types";
import { getPixelRatio } from "@/lib/dpr";
import { cn } from "@/lib/utils";
import { selectRenderSettings, useStudioStore } from "@/state/studio-store";

interface DitherCanvasProps {
  /** The hidden `<video>` element that feeds video and webcam sources. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

/**
 * GPU canvas. It never receives settings as props: it reads them from the store and pushes
 * changes straight into the mount, so dragging a slider doesn't re-render React at all.
 */
export const DitherCanvas = memo(function DitherCanvas({ videoRef, className }: DitherCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const engine = useStudioStore((s) => s.style.engine);
  const [webgpuFailed, setWebgpuFailed] = useState(false);
  const activeEngine = engine === "vgpu" && !webgpuFailed ? "vgpu" : "webgl";

  // A new engine choice gets a fresh WebGPU attempt.
  useEffect(() => {
    if (engine === "vgpu") setWebgpuFailed(false);
  }, [engine]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Each run owns a fresh canvas: a GPU surface can only be attached to a canvas once, and
    // an async init may still be in flight when React re-runs this effect.
    const canvas = document.createElement("canvas");
    canvas.className = "pixel-art pointer-events-none absolute inset-0 h-full w-full";
    canvas.setAttribute("aria-label", "DotShade Dither Canvas");
    container.appendChild(canvas);

    let cancelled = false;
    let mount: DitherMount | null = null;
    let capture: CaptureSource | null = null;
    let unsubscribe: (() => void)[] = [];
    let resizeRaf = 0;

    const applySize = (width: number, height: number) => {
      const dpr = getPixelRatio();
      const w = Math.max(1, Math.floor(width * dpr));
      const h = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const rect = container.getBoundingClientRect();
    applySize(rect.width || 500, rect.height || 300);

    // Source routing: image -> shared decoded bitmap, video/webcam -> <video>, procedural -> none.
    const syncSource = () => {
      if (!mount) return;
      const { source, isWebcamActive, decodedImage } = useStudioStore.getState();
      if (source.mediaType === "video" || isWebcamActive) {
        mount.setImage(videoRef.current);
      } else if (source.mediaType === "image") {
        mount.setImage(decodedImage?.bitmap ?? null);
      } else {
        mount.setImage(null);
      }
    };

    const attach = (m: DitherMount) => {
      mount = m;
      capture = {
        canvas,
        drawTo: (ctx, w, h) => m.captureTo(ctx, w, h),
        toBlob: (type, quality) => m.snapshotBlob(type, quality),
      };
      setCaptureSource(capture);

      m.updateOptions(selectRenderSettings(useStudioStore.getState()));
      syncSource();

      unsubscribe = [
        useStudioStore.subscribe(selectRenderSettings, (settings) => m.updateOptions(settings), {
          equalityFn: shallow,
        }),
        useStudioStore.subscribe(
          (s) => [s.source.mediaType, s.isWebcamActive, s.decodedImage] as const,
          syncSource,
          { equalityFn: shallow },
        ),
      ];
    };

    const initMount = async () => {
      if (activeEngine === "vgpu" && "gpu" in navigator) {
        try {
          const { DitherVgpuMount } = await import("@/engine/vgpu-mount");
          const vgpu = new DitherVgpuMount(canvas, selectRenderSettings(useStudioStore.getState()));
          const ok = await vgpu.init();
          if (cancelled) {
            vgpu.dispose();
            return;
          }
          if (ok) {
            attach(vgpu);
            return;
          }
          vgpu.dispose();
        } catch (err) {
          console.warn("vgpu (WebGPU) initialization failed, falling back to WebGL2:", err);
        }
        if (!cancelled) {
          toast.warning("WebGPU unavailable on this device", {
            description: "Switched to WebGL2 engine automatically.",
          });
          setWebgpuFailed(true);
        }
        return;
      }

      try {
        const { DitherWebGLMount } = await import("@/engine/webgl-mount");
        if (cancelled) return;
        attach(new DitherWebGLMount(canvas, selectRenderSettings(useStudioStore.getState())));
      } catch (err) {
        console.error("Failed to initialize WebGL Mount:", err);
      }
    };

    initMount();

    // Coalesce resize bursts into one resize + one redraw per frame.
    let pendingSize: { width: number; height: number } | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      pendingSize = { width, height };
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        if (!pendingSize) return;
        applySize(pendingSize.width, pendingSize.height);
        pendingSize = null;
        mount?.invalidate();
      });
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      for (const off of unsubscribe) off();
      if (capture) clearCaptureSource(capture);
      mount?.dispose();
      canvas.remove();
    };
  }, [activeEngine, videoRef]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-hidden select-none", className)}
    ></div>
  );
});
