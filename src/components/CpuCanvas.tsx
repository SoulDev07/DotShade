"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import {
  type CaptureSource,
  clearCaptureSource,
  setCaptureSource,
} from "@/engine/capture-registry";
import { renderCpu } from "@/engine/cpu-dither-client";
import { useStudioStore } from "@/state/studio-store";

let videoNoticeShown = false;

/**
 * CPU error-diffusion canvas. Source pixels already live in the worker; each settings change
 * only sends options, and superseded requests are dropped by the client.
 */
export function CpuCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const options = useStudioStore(
    useShallow((s) => ({
      algorithm: s.style.cpuAlgorithm,
      colorMode: s.style.colorMode,
      colorBack: s.style.colorBack,
      colorFront: s.style.colorFront,
      colorHighlight: s.style.colorHighlight,
      palette: s.style.palette,
      colorSteps: s.style.colorSteps,
      threshold: s.style.threshold,
      brightness: s.style.brightness,
      contrast: s.style.contrast,
      gamma: s.style.gamma,
      inverted: s.style.inverted,
    })),
  );
  const decoded = useStudioStore((s) => s.decodedImage);
  const mediaType = useStudioStore((s) => s.source.mediaType);
  const isWebcamActive = useStudioStore((s) => s.isWebcamActive);
  const isStill = mediaType === "image" && !isWebcamActive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const capture: CaptureSource = {
      canvas,
      drawTo: (ctx, w, h) => ctx.drawImage(canvas, 0, 0, w, h),
      toBlob: (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality)),
    };
    setCaptureSource(capture);
    return () => clearCaptureSource(capture);
  }, []);

  useEffect(() => {
    if (!isStill && !videoNoticeShown) {
      videoNoticeShown = true;
      toast.info("CPU engine dithers still images only", {
        description: "Switch to the WebGPU or WebGL engine for video/webcam.",
      });
    }
  }, [isStill]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isStill || !decoded) return;
    let stale = false;

    renderCpu(options)
      .then((result) => {
        if (stale || !result) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (canvas.width !== result.width || canvas.height !== result.height) {
          canvas.width = result.width;
          canvas.height = result.height;
        }
        ctx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
      })
      .catch((err) => console.warn("CPU dither failed:", err));

    return () => {
      stale = true;
    };
  }, [options, decoded, isStill]);

  return <canvas ref={canvasRef} className="pixel-art h-full w-full object-contain" />;
}
