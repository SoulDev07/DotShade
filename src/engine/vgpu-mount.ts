import {
  type Effect,
  effect,
  frame,
  type Gpu,
  init,
  type Surface,
  sampler,
  surface,
  type Texture,
  texture,
} from "vgpu";
import { hexToNormalizedRgba } from "@/lib/color";
import { getPixelRatio } from "@/lib/dpr";
import { DEFAULT_COLORS } from "./defaults";
import { FrameScheduler } from "./frame-scheduler";
import {
  COLOR_MODE_IDS,
  DITHER_TYPE_IDS,
  type DitherMount,
  FIT_MODE_IDS,
  getSourceSize,
  type MountSource,
  PROCEDURAL_SHAPE_IDS,
  type SnapshotType,
} from "./mount-types";
import { paletteToVec4Array } from "./palettes";
import ditherShader from "./shaders/dither.wgsl";
import type { RenderSettings } from "./types";

/**
 * One GPU device is shared by every mount: engine switches and remounts only create and
 * dispose surfaces, textures and effects, never the device itself.
 */
let sharedGpu: Promise<Gpu> | null = null;
function getSharedGpu(): Promise<Gpu> {
  if (!sharedGpu) {
    sharedGpu = init().catch((err) => {
      sharedGpu = null;
      throw err;
    });
  }
  return sharedGpu;
}

export class DitherVgpuMount implements DitherMount {
  public canvas: HTMLCanvasElement;
  private options: RenderSettings;
  private isDisposed = false;

  private gpu: Gpu | null = null;
  private vgpuSurface: Surface | null = null;
  private ditherEffect: Effect | null = null;
  private defaultSampler: GPUSampler | null = null;
  private sourceTexture: Texture | null = null;
  private dummyTexture: Texture | null = null;

  private scheduler: FrameScheduler;
  private currentTime = 0;
  private videoDirty = false;
  private imageSource: MountSource | null = null;
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
  private cachedParams: Record<string, unknown> & Record<`palette_${number}`, number[]> =
    {} as never;

  constructor(canvas: HTMLCanvasElement, options: RenderSettings) {
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

    this.scheduler = new FrameScheduler(
      (dt) => {
        if (this.isContinuous()) this.currentTime += dt * this.options.animationSpeed;
        this.render();
      },
      () => {
        this.videoDirty = true;
      },
    );
  }

  /** Procedural animation runs every frame; still images and video redraw on demand. */
  private isContinuous(): boolean {
    if (this.imageSource instanceof HTMLVideoElement) return this.scheduler.isPollingVideo;
    return this.options.animated && !this.hasImage;
  }

  private syncLoopPolicy() {
    this.scheduler.setContinuous(this.isContinuous());
  }

  public invalidate() {
    this.scheduler.invalidate();
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
      this.gpu = await getSharedGpu();
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
        [1, 1],
      );

      this.ditherEffect = effect(this.gpu, ditherShader);
      this.isReady = true;
      this.syncLoopPolicy();
      this.invalidate();

      return true;
    } catch (err) {
      console.error("vgpu init failed:", err);
      throw err;
    }
  }

  public setImage(source: MountSource | null) {
    if (this.isDisposed) return;
    this.imageSource = source;
    this.scheduler.watchVideo(source instanceof HTMLVideoElement ? source : null);

    if (source) {
      const { width, height } = getSourceSize(source);
      this.imageAspectRatio = width / Math.max(1, height);
      this.hasImage = true;
      this.updateSourceTexture(source, width, height);
    } else {
      this.hasImage = false;
      this.imageAspectRatio = 1;
    }

    this.videoDirty = false;
    this.syncLoopPolicy();
    this.invalidate();
  }

  private updateSourceTexture(source: GPUCopyExternalImageSource, width: number, height: number) {
    if (!this.gpu) return;

    try {
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));

      if (
        !this.sourceTexture ||
        this.sourceTexture.size[0] !== w ||
        this.sourceTexture.size[1] !== h
      ) {
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
        [w, h],
      );
    } catch (e) {
      console.warn("Texture update failed in vgpu mount:", e);
    }
  }

  private updateCachedUniforms() {
    const opt = this.options;
    const p = this.cachedParams;
    p.ditherType = DITHER_TYPE_IDS[opt.ditherType] || 4;
    p.pxSize = opt.pxSize;
    p.threshold = opt.threshold;
    p.halftoneAngle = opt.halftoneAngle;
    p.halftoneScale = opt.halftoneScale;
    p.colorMode = COLOR_MODE_IDS[opt.colorMode] || 1;
    p.colorSteps = opt.colorSteps;
    p.inverted = opt.inverted ? 1 : 0;
    p.fit = FIT_MODE_IDS[opt.fit] || 2;
    p.scale = opt.scale;
    p.rotation = opt.rotation;
    p.offsetX = opt.offsetX;
    p.offsetY = opt.offsetY;
    p.brightness = opt.brightness;
    p.contrast = opt.contrast;
    p.saturation = opt.saturation;
    p.gamma = opt.gamma;
    p.proceduralShape = PROCEDURAL_SHAPE_IDS[opt.proceduralShape] || 1;

    if (opt.colorBack !== this.cachedColorBack) {
      p.colorBack = hexToNormalizedRgba(opt.colorBack);
      this.cachedColorBack = opt.colorBack;
    }
    if (opt.colorFront !== this.cachedColorFront) {
      p.colorFront = hexToNormalizedRgba(opt.colorFront);
      this.cachedColorFront = opt.colorFront;
    }
    if (opt.colorHighlight !== this.cachedColorHighlight) {
      p.colorHighlight = hexToNormalizedRgba(opt.colorHighlight);
      this.cachedColorHighlight = opt.colorHighlight;
    }

    const paletteColors =
      opt.palette && opt.palette.length > 0
        ? opt.palette
        : [DEFAULT_COLORS.back, DEFAULT_COLORS.front];
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

  public updateOptions(newOptions: RenderSettings) {
    if (this.isDisposed) return;
    this.options = { ...newOptions };
    this.updateCachedUniforms();
    this.syncLoopPolicy();
    this.invalidate();
  }

  /** Draws one frame synchronously. Uploads a new video frame first when one is pending. */
  public render() {
    if (this.isDisposed || !this.isReady || !this.ditherEffect || !this.gpu || !this.vgpuSurface)
      return;

    if (this.imageSource instanceof HTMLVideoElement) {
      const polling = this.scheduler.isPollingVideo && !this.imageSource.paused;
      if ((this.videoDirty || polling) && this.imageSource.readyState >= 2) {
        this.videoDirty = false;
        const { width, height } = getSourceSize(this.imageSource);
        this.updateSourceTexture(this.imageSource, width, height);
      }
    }

    const currentTexture =
      this.hasImage && this.sourceTexture ? this.sourceTexture : this.dummyTexture;

    this.cachedResolution[0] = this.canvas.width || 800;
    this.cachedResolution[1] = this.canvas.height || 600;
    this.cachedParams.pixelRatio = getPixelRatio();
    this.cachedParams.imageAspectRatio = this.imageAspectRatio;
    this.cachedParams.hasImage = this.hasImage ? 1 : 0;
    this.cachedParams.time = this.currentTime;

    try {
      this.ditherEffect.set({
        src: currentTexture,
        samp: this.defaultSampler,
        params: this.cachedParams,
      });

      frame(this.gpu, (f) => {
        f.pass(this.vgpuSurface as Surface, this.ditherEffect as Effect);
      });
    } catch (e) {
      console.error("vgpu render error:", e);
    }
  }

  public captureTo(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.render();
    ctx.drawImage(this.canvas, 0, 0, width, height);
  }

  public snapshotBlob(type: SnapshotType = "image/png", quality = 0.95): Promise<Blob | null> {
    this.render();
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  public dispose() {
    this.isDisposed = true;
    this.scheduler.dispose();
    this.sourceTexture?.destroy();
    this.sourceTexture = null;
    this.dummyTexture?.destroy();
    this.dummyTexture = null;
    this.vgpuSurface?.dispose();
    this.vgpuSurface = null;
    // The Gpu device is shared across mounts and intentionally left alive.
    this.gpu = null;
  }
}
