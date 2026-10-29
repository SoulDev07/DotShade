import {
  init,
  surface,
  effect,
  sampler,
  texture,
  frame,
  type Gpu,
  type Surface,
  type Effect,
  type Texture,
} from "vgpu";
import ditherShader from "./shaders/dither.wgsl";
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

  private gpu: Gpu | null = null;
  private vgpuSurface: Surface | null = null;
  private ditherEffect: Effect | null = null;
  private defaultSampler: GPUSampler | null = null;
  private sourceTexture: Texture | null = null;
  private dummyTexture: Texture | null = null;

  private rafId: number | null = null;
  private startTime = performance.now();
  private imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap | null = null;
  private imageAspectRatio = 1;
  private hasImage = false;
  private isReady = false;

  private initPromise: Promise<boolean> | null = null;

  private cachedResolution: [number, number] = [800, 600];
  private cachedPaletteArray = new Float32Array(64);
  private cachedColorBack = "";
  private cachedColorFront = "";
  private cachedColorHighlight = "";
  private cachedPaletteKey = "";
  private cachedParams: Record<string, any> = {};

  constructor(canvas: HTMLCanvasElement, options: DitherSettings) {
    this.canvas = canvas;
    this.options = { ...options };

    this.cachedParams = {
      resolution: this.cachedResolution,
      pixelRatio: 1,
      imageAspectRatio: 1,
      hasImage: 0,
      time: 0,
      ditherType: 4,
      pxSize: 2,
      threshold: 0.5,
      halftoneAngle: 45,
      halftoneScale: 2,
      colorMode: 1,
      colorSteps: 4,
      inverted: 0,
      fit: 2,
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      gamma: 1,
      proceduralShape: 1,
      paletteCount: 2,
      pad0: 0,
      pad1: 0,
      pad2: 0,
      colorBack: [0, 0, 0, 1],
      colorFront: [1, 1, 1, 1],
      colorHighlight: [1, 1, 1, 1],
    };

    for (let i = 0; i < 16; i++) {
      this.cachedParams[`palette_${i}`] = [0, 0, 0, 1];
    }

    this.updateCachedUniforms();
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
      this.gpu.gpu.queue.writeTexture(
        { texture: this.dummyTexture.gpu },
        dummyPixel,
        { bytesPerRow: 4 },
        [1, 1]
      );

      this.ditherEffect = effect(this.gpu, ditherShader);
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

  private updateSourceTexture(source: GPUCopyExternalImageSource, width: number, height: number) {
    if (!this.gpu) return;

    try {
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));

      if (!this.sourceTexture || this.sourceTexture.size[0] !== w || this.sourceTexture.size[1] !== h) {
        this.sourceTexture?.destroy();
        this.sourceTexture = texture(this.gpu, {
          kind: "2d",
          size: [w, h],
          format: "rgba8unorm",
          usage: ["copy_dst", "texture_binding", "render_attachment"],
          label: "source-image",
        });
      }

      this.gpu.gpu.queue.copyExternalImageToTexture(
        { source },
        { texture: this.sourceTexture.gpu },
        [w, h]
      );
    } catch (e) {
      console.warn("Texture update failed in vgpu mount:", e);
    }
  }

  private updateCachedUniforms() {
    const opt = this.options;
    const p = this.cachedParams;
    p.ditherType = DITHER_TYPES[opt.ditherType] || 4;
    p.pxSize = opt.pxSize;
    p.threshold = opt.threshold;
    p.halftoneAngle = opt.halftoneAngle;
    p.halftoneScale = opt.halftoneScale;
    p.colorMode = COLOR_MODES[opt.colorMode] || 1;
    p.colorSteps = opt.colorSteps;
    p.inverted = opt.inverted ? 1 : 0;
    p.fit = FIT_MODES[opt.fit] || 2;
    p.scale = opt.scale;
    p.rotation = opt.rotation;
    p.offsetX = opt.offsetX;
    p.offsetY = opt.offsetY;
    p.brightness = opt.brightness;
    p.contrast = opt.contrast;
    p.saturation = opt.saturation;
    p.gamma = opt.gamma;
    p.proceduralShape = PROCEDURAL_SHAPES[opt.proceduralShape] || 1;

    if (opt.colorBack !== this.cachedColorBack) {
      p.colorBack = parseColorToNormalizedRgba(opt.colorBack);
      this.cachedColorBack = opt.colorBack;
    }
    if (opt.colorFront !== this.cachedColorFront) {
      p.colorFront = parseColorToNormalizedRgba(opt.colorFront);
      this.cachedColorFront = opt.colorFront;
    }
    if (opt.colorHighlight !== this.cachedColorHighlight) {
      p.colorHighlight = parseColorToNormalizedRgba(opt.colorHighlight);
      this.cachedColorHighlight = opt.colorHighlight;
    }

    const paletteColors = opt.palette && opt.palette.length > 0 ? opt.palette : ["#000000", "#ffffff"];
    const paletteKey = paletteColors.join(",");
    if (paletteKey !== this.cachedPaletteKey) {
      paletteToVec4Array(paletteColors, 16, this.cachedPaletteArray);
      p.paletteCount = Math.min(16, paletteColors.length);
      for (let i = 0; i < 16; i++) {
        const idx = i * 4;
        const entry = p[`palette_${i}`];
        entry[0] = this.cachedPaletteArray[idx];
        entry[1] = this.cachedPaletteArray[idx + 1];
        entry[2] = this.cachedPaletteArray[idx + 2];
        entry[3] = this.cachedPaletteArray[idx + 3];
      }
      this.cachedPaletteKey = paletteKey;
    }
  }

  public updateOptions(newOptions: DitherSettings) {
    if (this.isDisposed) return;
    const wasAnimated = this.options.animated;
    this.options = { ...newOptions };
    this.updateCachedUniforms();
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

    const currentTexture =
      this.hasImage && this.sourceTexture ? this.sourceTexture : this.dummyTexture;

    this.cachedResolution[0] = this.canvas.width || 800;
    this.cachedResolution[1] = this.canvas.height || 600;
    this.cachedParams.pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.cachedParams.imageAspectRatio = this.imageAspectRatio;
    this.cachedParams.hasImage = this.hasImage ? 1 : 0;
    this.cachedParams.time = elapsedTime;

    try {
      this.ditherEffect.set({
        src: currentTexture,
        samp: this.defaultSampler,
        params: this.cachedParams,
      });

      frame(this.gpu, (f) => {
        f.pass(this.vgpuSurface!, this.ditherEffect!);
      });
    } catch (e) {
      console.error("vgpu render error:", e);
    } finally {
      this.isRendering = false;
    }
  }

  public startAnimation() {
    if (this.rafId !== null) return;
    const loop = () => {
      if (this.isDisposed) {
        this.rafId = null;
        return;
      }
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
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  public dispose() {
    this.isDisposed = true;
    this.stopAnimation();
    this.sourceTexture?.destroy();
    this.sourceTexture = null;
    this.dummyTexture?.destroy();
    this.dummyTexture = null;
    this.vgpuSurface?.dispose();
    this.vgpuSurface = null;
    this.gpu?.dispose();
    this.gpu = null;
  }
}
