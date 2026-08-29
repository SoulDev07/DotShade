"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { DitherWebGLMount, type DitherMountOptions } from "@/engine/webgl-mount";
import { cn } from "@/lib/utils";

export interface PersonalDitherProps extends Omit<DitherMountOptions, "canvas"> {
  src?: string | HTMLImageElement | HTMLVideoElement | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (mount: DitherWebGLMount) => void;
}

export interface PersonalDitherHandle {
  mount: DitherWebGLMount | null;
  canvas: HTMLCanvasElement | null;
  render: () => void;
  getSnapshotBlob: (type?: "image/png" | "image/webp" | "image/jpeg", quality?: number) => Promise<Blob | null>;
  captureHighResSnapshot: (width: number, height: number) => ImageData | null;
}

export const PersonalDither = forwardRef<PersonalDitherHandle, PersonalDitherProps>(
  function PersonalDither(
    {
      src,
      videoRef,
      className,
      style,
      onReady,
      ditherType = "8x8",
      pxSize = 2,
      threshold = 0.5,
      halftoneAngle = 45,
      halftoneScale = 2,
      colorMode = "paper",
      colorBack = "#000c38",
      colorFront = "#94ffaf",
      colorHighlight = "#eaff94",
      palette = ["#000000", "#ffffff"],
      colorSteps = 2,
      inverted = false,
      fit = "cover",
      scale = 1,
      rotation = 0,
      offsetX = 0,
      offsetY = 0,
      brightness = 0,
      contrast = 1,
      saturation = 1,
      gamma = 1,
      proceduralShape = "simplex",
      animated = false,
      animationSpeed = 1,
      minPixelRatio,
      maxPixelCount,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mountRef = useRef<DitherWebGLMount | null>(null);
    const loadedImageRef = useRef<HTMLImageElement | null>(null);

    // Initialize WebGL2 Mount
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

      let mount: DitherWebGLMount;
      try {
        mount = new DitherWebGLMount({
          canvas,
          ditherType,
          pxSize,
          threshold,
          halftoneAngle,
          halftoneScale,
          colorMode,
          colorBack,
          colorFront,
          colorHighlight,
          palette,
          colorSteps,
          inverted,
          fit,
          scale,
          rotation,
          offsetX,
          offsetY,
          brightness,
          contrast,
          saturation,
          gamma,
          proceduralShape,
          animated,
          animationSpeed,
          minPixelRatio,
          maxPixelCount,
        });
        mountRef.current = mount;
        if (onReady) onReady(mount);
      } catch (err) {
        console.error("Failed to initialize PersonalDither WebGL Mount:", err);
        return;
      }

      // Handle Container Resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            const curDpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(width * curDpr);
            canvas.height = Math.floor(height * curDpr);
            mount.render();
          }
        }
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        mount.dispose();
        mountRef.current = null;
      };
    }, []);

    // Update Mount Options when props change
    useEffect(() => {
      if (!mountRef.current) return;
      mountRef.current.updateOptions({
        ditherType,
        pxSize,
        threshold,
        halftoneAngle,
        halftoneScale,
        colorMode,
        colorBack,
        colorFront,
        colorHighlight,
        palette,
        colorSteps,
        inverted,
        fit,
        scale,
        rotation,
        offsetX,
        offsetY,
        brightness,
        contrast,
        saturation,
        gamma,
        proceduralShape,
        animated,
        animationSpeed,
      });
    }, [
      ditherType,
      pxSize,
      threshold,
      halftoneAngle,
      halftoneScale,
      colorMode,
      colorBack,
      colorFront,
      colorHighlight,
      palette,
      colorSteps,
      inverted,
      fit,
      scale,
      rotation,
      offsetX,
      offsetY,
      brightness,
      contrast,
      saturation,
      gamma,
      proceduralShape,
      animated,
      animationSpeed,
    ]);

    // Handle Media Source updates (Image, Video, Webcam)
    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      if (!src) {
        mount.setMediaSource(null);
        return;
      }

      if (typeof src === "string") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
          loadedImageRef.current = img;
          mount.setMediaSource(img);
        };
        img.onerror = (e) => {
          console.error("PersonalDither: Failed to load image", src, e);
        };
      } else if (src instanceof HTMLImageElement) {
        if (src.complete) {
          mount.setMediaSource(src);
        } else {
          src.onload = () => mount.setMediaSource(src);
        }
      } else if (src instanceof HTMLVideoElement) {
        mount.setMediaSource(src);
      }
    }, [src]);

    // Forward ref imperative methods
    useImperativeHandle(
      ref,
      () => ({
        mount: mountRef.current,
        canvas: canvasRef.current,
        render: () => mountRef.current?.render(),
        getSnapshotBlob: (type, quality) =>
          mountRef.current?.getSnapshotBlob(type, quality) ?? Promise.resolve(null),
        captureHighResSnapshot: (w, h) =>
          mountRef.current?.captureHighResSnapshot(w, h) ?? null,
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full h-full overflow-hidden select-none", className)}
        style={style}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none pixel-art"
          aria-label="Personal Dither Shader Canvas"
        />
      </div>
    );
  }
);
