import { ditherWgslShader } from "./shaders/dither.wgsl";
import { parseColorToNormalizedRgba } from "@/lib/utils";
import { paletteToVec4Array } from "./palettes";
import type { DitherSettings } from "./types";

const DITHER_TYPES: Record<string, number> = {
  noise: 1,
  "2x2": 2,
  "4x4": 3,
  "8x8": 4,
  "16x16": 5,
  halftone: 6,
  crosshatch: 7,
  clustered: 8,
};

const COLOR_MODES: Record<string, number> = {
  paper: 1,
  duotone: 2,
  original: 3,
  palette: 4,
  grayscale: 5,
};

const FIT_MODES: Record<string, number> = {
  contain: 1,
  cover: 2,
  fill: 3,
};

const PROCEDURAL_SHAPES: Record<string, number> = {
  simplex: 1,
  warp: 2,
  dots: 3,
  waves: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
};

export class DitherVgpuMount {
  public canvas: HTMLCanvasElement;
  private options: DitherSettings;
  private isDisposed = false;
  private isRendering = false;

  private gpu: any = null;
  private vgpuSurface: any = null;
  private ditherEffect: any = null;
  private defaultSampler: any = null;
  private sourceTexture: any = null;
  private dummyTexture: any = null;

  private rafId: number | null = null;
  private startTime = performance.now();
  private imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap | null = null;
  private imageAspectRatio = 1;
  private hasImage = false;
  private isReady = false;

  private vgpuLib: any = null;
  private initPromise: Promise<boolean> | null = null;

  constructor(canvas: HTMLCanvasElement, options: DitherSettings) {
    this.canvas = canvas;
    this.options = { ...options };
  }

  private getRawQueue(): GPUQueue | null {
    return (
      (this.gpu?.gpu?.queue as GPUQueue) ??
      (this.gpu?.device?.gpu?.queue as GPUQueue) ??
      (this.gpu?.device?.queue?.gpu as GPUQueue) ??
      null
    );
  }

  private getRawDevice(): GPUDevice | null {
    return (
      (this.gpu?.gpu as GPUDevice) ??
      (this.gpu?.device?.gpu as GPUDevice) ??
      null
    );
  }

  public async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.gpu) {
      throw new Error("WebGPU is not supported on this device/browser.");
    }

    try {
      // Import vgpu (https://vgpu.sh/)
      let vgpu: any;
      try {
        vgpu = await (Function('return import("vgpu")')());
      } catch {
        vgpu = await (Function('return import("https://esm.sh/vgpu@0.5.0")')());
      }

      this.vgpuLib = vgpu;
      const { init, surface, effect, sampler, texture, frame } = vgpu;
      this.gpu = await init();
      if (!this.gpu || this.isDisposed) return false;

      this.vgpuSurface = surface(this.gpu, this.canvas, { dpr: 1 });
      this.defaultSampler = sampler(this.gpu, {
        minFilter: "linear",
        magFilter: "linear",
      });

      this.dummyTexture = texture(this.gpu, {
        kind: "2d",
        size: [1, 1],
        format: "rgba8unorm",
        usage: ["copy_dst", "texture_binding"],
        label: "dummy-1x1",
      });

      const dummyPixel = new Uint8Array([128, 128, 128, 255]);
      const rawQueue = this.getRawQueue();
      const rawDummyTexture =
        this.dummyTexture?.gpu ?? this.dummyTexture?.gpuTexture ?? this.dummyTexture;

      if (rawQueue && rawDummyTexture) {
        rawQueue.writeTexture(
          { texture: rawDummyTexture },
          dummyPixel,
          { bytesPerRow: 4 },
          [1, 1]
        );
      }

      this.ditherEffect = effect(this.gpu, ditherWgslShader);
      this.isReady = true;

      this.render();

      if (this.options.animated) {
        this.startAnimation();
      }

      return true;
    } catch (err) {
      console.error("vgpu init failed:", err);
      throw err;
    }
  }

  public setImage(source: HTMLImageElement | HTMLVideoElement | ImageBitmap | null) {
    if (this.isDisposed) return;
    this.imageSource = source;

    if (source) {
      let width = 0;
      let height = 0;
      if (source instanceof HTMLImageElement) {
        width = source.naturalWidth || source.width || 1;
        height = source.naturalHeight || source.height || 1;
      } else if (source instanceof HTMLVideoElement) {
        width = source.videoWidth || source.width || 1;
        height = source.videoHeight || source.height || 1;
      } else if (source instanceof ImageBitmap) {
        width = source.width || 1;
        height = source.height || 1;
      }

      this.imageAspectRatio = width / Math.max(1, height);
      this.hasImage = true;
      this.updateSourceTexture(source, width, height);
    } else {
      this.hasImage = false;
      this.imageAspectRatio = 1;
    }

    this.render();
  }

  private updateSourceTexture(source: any, width: number, height: number) {
    if (!this.gpu) return;

    try {
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));

      const rawQueue = this.getRawQueue();
      if (!rawQueue) return;

      if (
        !this.sourceTexture ||
        this.sourceTexture.size?.[0] !== w ||
        this.sourceTexture.size?.[1] !== h
      ) {
        if (this.sourceTexture?.destroy) {
          this.sourceTexture.destroy();
        }

        if (this.vgpuLib?.texture) {
          this.sourceTexture = this.vgpuLib.texture(this.gpu, {
            kind: "2d",
            size: [w, h],
            format: "rgba8unorm",
            usage: ["copy_dst", "texture_binding", "render_attachment"],
            label: "source-image",
          });
        } else {
          const rawDevice = this.getRawDevice();
          if (rawDevice) {
            // GPUTextureUsage.TEXTURE_BINDING (4) | GPUTextureUsage.COPY_DST (2) | GPUTextureUsage.RENDER_ATTACHMENT (16)
            this.sourceTexture = rawDevice.createTexture({
              size: [w, h, 1],
              format: "rgba8unorm",
              usage: 4 | 2 | 16,
            });
          }
        }
      }

      const rawTexture =
        this.sourceTexture?.gpu ?? this.sourceTexture?.gpuTexture ?? this.sourceTexture;
      if (rawTexture) {
        rawQueue.copyExternalImageToTexture(
          { source },
          { texture: rawTexture },
          [w, h]
        );
      }
    } catch (e) {
      console.warn("Texture update failed in vgpu mount:", e);
    }
  }

  public updateOptions(newOptions: DitherSettings) {
    const wasAnimated = this.options.animated;
    this.options = { ...newOptions };
    if (newOptions.animated !== wasAnimated) {
      if (newOptions.animated) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    }
    this.render();
  }

  public render() {
    if (this.isDisposed || !this.isReady || !this.ditherEffect || !this.gpu || !this.vgpuSurface) return;
    if (this.isRendering) return;
    this.isRendering = true;

    const opt = this.options;
    const now = performance.now();
    const elapsedTime = ((now - this.startTime) / 1000) * (opt.animationSpeed || 1);

    if (
      this.imageSource instanceof HTMLVideoElement &&
      this.imageSource.readyState >= 2 &&
      !this.imageSource.paused
    ) {
      const w = this.imageSource.videoWidth || 1;
      const h = this.imageSource.videoHeight || 1;
      this.updateSourceTexture(this.imageSource, w, h);
    }

    const cBack = parseColorToNormalizedRgba(opt.colorBack);
    const cFront = parseColorToNormalizedRgba(opt.colorFront);
    const cHighlight = parseColorToNormalizedRgba(opt.colorHighlight);

    const paletteArray = paletteToVec4Array(opt.palette);
    const paletteParams: Record<string, number[]> = {};
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      paletteParams[`palette_${i}`] = [
        paletteArray[idx] ?? 0,
        paletteArray[idx + 1] ?? 0,
        paletteArray[idx + 2] ?? 0,
        paletteArray[idx + 3] ?? 1,
      ];
    }

    const currentTexture =
      this.hasImage && this.sourceTexture ? this.sourceTexture : this.dummyTexture;

    try {
      this.ditherEffect.set({
        src: currentTexture,
        samp: this.defaultSampler,
        params: {
          resolution: [this.canvas.width || 800, this.canvas.height || 600],
          pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
          imageAspectRatio: this.imageAspectRatio,
          hasImage: this.hasImage ? 1 : 0,
          time: elapsedTime,
          ditherType: DITHER_TYPES[opt.ditherType] || 4,
          pxSize: opt.pxSize,
          threshold: opt.threshold,
          halftoneAngle: opt.halftoneAngle,
          halftoneScale: opt.halftoneScale,
          colorMode: COLOR_MODES[opt.colorMode] || 1,
          colorSteps: opt.colorSteps,
          inverted: opt.inverted ? 1 : 0,
          fit: FIT_MODES[opt.fit] || 2,
          scale: opt.scale,
          rotation: opt.rotation,
          offsetX: opt.offsetX,
          offsetY: opt.offsetY,
          brightness: opt.brightness,
          contrast: opt.contrast,
          saturation: opt.saturation,
          gamma: opt.gamma,
          proceduralShape: PROCEDURAL_SHAPES[opt.proceduralShape] || 1,
          paletteCount: Math.min(16, opt.palette.length),
          colorBack: cBack,
          colorFront: cFront,
          colorHighlight: cHighlight,
          ...paletteParams,
        },
      });

      const frameFn = this.vgpuLib?.frame;
      if (typeof frameFn === "function") {
        frameFn(this.gpu, (currentFrame: any) => {
          if (currentFrame?.pass) {
            currentFrame.pass({ target: this.vgpuSurface }, (pass: any) => {
              pass.draw(this.ditherEffect);
            });
          } else {
            this.ditherEffect.draw(this.vgpuSurface);
          }
        });
      } else {
        this.ditherEffect.draw(this.vgpuSurface);
      }
    } catch (e) {
      console.error("vgpu render error:", e);
    } finally {
      this.isRendering = false;
    }
  }

  public startAnimation() {
    if (this.rafId !== null) return;
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stopAnimation() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public async getSnapshotBlob(
    type: "image/png" | "image/webp" | "image/jpeg" = "image/png",
    quality = 0.95
  ): Promise<Blob | null> {
    this.render();
    try {
      if (this.vgpuSurface?.color?.read) {
        const bytes = await this.vgpuSurface.color.read({ mipLevel: 0, region: "all" });
        if (bytes && bytes.length > 0) {
          const offscreen = document.createElement("canvas");
          offscreen.width = this.canvas.width;
          offscreen.height = this.canvas.height;
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            const imgData = ctx.createImageData(offscreen.width, offscreen.height);
            imgData.data.set(bytes);
            ctx.putImageData(imgData, 0, 0);
            return new Promise((resolve) => offscreen.toBlob(resolve, type, quality));
          }
        }
      }
    } catch {
      // fallback to direct canvas.toBlob
    }
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  public dispose() {
    this.isDisposed = true;
    this.stopAnimation();
    if (this.sourceTexture?.destroy) {
      this.sourceTexture.destroy();
      this.sourceTexture = null;
    }
    if (this.dummyTexture?.destroy) {
      this.dummyTexture.destroy();
      this.dummyTexture = null;
    }
    if (this.vgpuSurface?.dispose) {
      this.vgpuSurface.dispose();
      this.vgpuSurface = null;
    }
    if (this.gpu?.dispose) {
      this.gpu.dispose();
      this.gpu = null;
    }
  }
}
