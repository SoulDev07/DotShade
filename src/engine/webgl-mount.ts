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
import { ditherFragmentShader, ditherVertexShader } from "./shaders/dither.glsl";
import type { RenderSettings } from "./types";

const UNIFORM_NAMES = [
  "u_resolution",
  "u_pixelRatio",
  "u_time",
  "u_imageAspectRatio",
  "u_hasImage",
  "u_ditherType",
  "u_pxSize",
  "u_threshold",
  "u_halftoneAngle",
  "u_halftoneScale",
  "u_colorMode",
  "u_colorBack",
  "u_colorFront",
  "u_colorHighlight",
  "u_palette",
  "u_paletteCount",
  "u_colorSteps",
  "u_inverted",
  "u_fit",
  "u_scale",
  "u_rotation",
  "u_offset",
  "u_brightness",
  "u_contrast",
  "u_saturation",
  "u_gamma",
  "u_proceduralShape",
  "u_image",
] as const;

type Uniforms = Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation | null>;

export class DitherWebGLMount implements DitherMount {
  public canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private uniforms: Uniforms | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private currentTime = 0;
  private scheduler: FrameScheduler;
  private videoDirty = false;
  private options: RenderSettings;
  private isDisposed = false;

  private imageSource: MountSource | null = null;
  private imageAspectRatio = 1;
  private hasImage = false;

  // Cached uniform buffers to avoid per-frame allocations
  private cachedBackRgba = new Float32Array(4);
  private cachedFrontRgba = new Float32Array(4);
  private cachedHlRgba = new Float32Array(4);
  private cachedPaletteArray = new Float32Array(64);
  private cachedPaletteCount = 2;
  private cachedColorBack = "";
  private cachedColorFront = "";
  private cachedColorHighlight = "";
  private cachedPaletteKey = "";
  private texWidth = 0;
  private texHeight = 0;
  private posBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement, options: RenderSettings) {
    this.canvas = canvas;
    this.options = { ...options };

    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      throw new Error("WebGL2 is not supported by your browser/device.");
    }
    this.gl = gl;

    this.initGL();
    this.updateCachedUniforms();

    this.scheduler = new FrameScheduler(
      (dt) => {
        if (this.scheduler && this.isContinuous())
          this.currentTime += dt * this.options.animationSpeed;
        this.render();
      },
      () => {
        this.videoDirty = true;
      },
    );
    this.syncLoopPolicy();
    this.invalidate();
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

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create WebGL shader.");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL Shader compile error: ${info}`);
    }
    return shader;
  }

  private initGL() {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, ditherVertexShader);
    const fs = this.createShader(gl.FRAGMENT_SHADER, ditherFragmentShader);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program.");

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      throw new Error(`WebGL program link error: ${info}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.program = program;

    const uniforms = {} as Uniforms;
    for (const name of UNIFORM_NAMES) uniforms[name] = gl.getUniformLocation(program, name);
    this.uniforms = uniforms;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.vao = vao;

    const posBuffer = gl.createBuffer();
    this.posBuffer = posBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = texture;
  }

  public setImage(source: MountSource | null) {
    if (this.isDisposed) return;
    this.imageSource = source;
    this.scheduler.watchVideo(source instanceof HTMLVideoElement ? source : null);
    if (source) {
      this.hasImage = true;
      const { width, height } = getSourceSize(source);
      this.imageAspectRatio = width / Math.max(1, height);
      this.updateTexture();
    } else {
      this.hasImage = false;
      this.imageAspectRatio = 1;
    }
    this.videoDirty = false;
    this.syncLoopPolicy();
    this.invalidate();
  }

  private updateCachedUniforms() {
    if (this.options.colorBack !== this.cachedColorBack) {
      const [r, g, b, a] = hexToNormalizedRgba(this.options.colorBack);
      this.cachedBackRgba[0] = r;
      this.cachedBackRgba[1] = g;
      this.cachedBackRgba[2] = b;
      this.cachedBackRgba[3] = a;
      this.cachedColorBack = this.options.colorBack;
    }
    if (this.options.colorFront !== this.cachedColorFront) {
      const [r, g, b, a] = hexToNormalizedRgba(this.options.colorFront);
      this.cachedFrontRgba[0] = r;
      this.cachedFrontRgba[1] = g;
      this.cachedFrontRgba[2] = b;
      this.cachedFrontRgba[3] = a;
      this.cachedColorFront = this.options.colorFront;
    }
    if (this.options.colorHighlight !== this.cachedColorHighlight) {
      const [r, g, b, a] = hexToNormalizedRgba(this.options.colorHighlight);
      this.cachedHlRgba[0] = r;
      this.cachedHlRgba[1] = g;
      this.cachedHlRgba[2] = b;
      this.cachedHlRgba[3] = a;
      this.cachedColorHighlight = this.options.colorHighlight;
    }
    const paletteColors =
      this.options.palette?.length > 0
        ? this.options.palette
        : [DEFAULT_COLORS.back, DEFAULT_COLORS.front];
    const paletteKey = paletteColors.join(",");
    if (paletteKey !== this.cachedPaletteKey) {
      paletteToVec4Array(paletteColors, 16, this.cachedPaletteArray);
      this.cachedPaletteCount = Math.min(16, paletteColors.length);
      this.cachedPaletteKey = paletteKey;
    }
  }

  public updateTexture() {
    if (this.isDisposed || !this.imageSource || !this.gl || !this.texture) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const { width: srcW, height: srcH } = getSourceSize(this.imageSource);

    if (srcW > 0 && srcH > 0 && this.texWidth === srcW && this.texHeight === srcH) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.imageSource);
    } else {
      this.texWidth = srcW;
      this.texHeight = srcH;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.imageSource);
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
    if (this.isDisposed || !this.gl || !this.program || !this.uniforms) return;
    const gl = this.gl;
    const u = this.uniforms;

    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) return;

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    if (this.imageSource instanceof HTMLVideoElement) {
      const polling = this.scheduler.isPollingVideo && !this.imageSource.paused;
      if (this.videoDirty || polling) {
        this.videoDirty = false;
        if (this.imageSource.readyState >= 2) this.updateTexture();
      }
    }

    const o = this.options;
    gl.uniform2f(u.u_resolution, width, height);
    gl.uniform1f(u.u_pixelRatio, getPixelRatio());
    gl.uniform1f(u.u_time, this.currentTime);
    gl.uniform1f(u.u_imageAspectRatio, this.imageAspectRatio);
    gl.uniform1i(u.u_hasImage, this.hasImage ? 1 : 0);

    gl.uniform1i(u.u_ditherType, DITHER_TYPE_IDS[o.ditherType] || 4);
    gl.uniform1f(u.u_pxSize, o.pxSize);
    gl.uniform1f(u.u_threshold, o.threshold);
    gl.uniform1f(u.u_halftoneAngle, o.halftoneAngle);
    gl.uniform1f(u.u_halftoneScale, o.halftoneScale);
    gl.uniform1i(u.u_colorMode, COLOR_MODE_IDS[o.colorMode] || 1);

    gl.uniform4fv(u.u_colorBack, this.cachedBackRgba);
    gl.uniform4fv(u.u_colorFront, this.cachedFrontRgba);
    gl.uniform4fv(u.u_colorHighlight, this.cachedHlRgba);
    gl.uniform4fv(u.u_palette, this.cachedPaletteArray);
    gl.uniform1i(u.u_paletteCount, this.cachedPaletteCount);

    gl.uniform1f(u.u_colorSteps, o.colorSteps);
    gl.uniform1i(u.u_inverted, o.inverted ? 1 : 0);

    gl.uniform1i(u.u_fit, FIT_MODE_IDS[o.fit] || 2);
    gl.uniform1f(u.u_scale, o.scale);
    gl.uniform1f(u.u_rotation, o.rotation);
    gl.uniform2f(u.u_offset, o.offsetX, o.offsetY);

    gl.uniform1f(u.u_brightness, o.brightness);
    gl.uniform1f(u.u_contrast, o.contrast);
    gl.uniform1f(u.u_saturation, o.saturation);
    gl.uniform1f(u.u_gamma, o.gamma);
    gl.uniform1i(u.u_proceduralShape, PROCEDURAL_SHAPE_IDS[o.proceduralShape] || 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u.u_image, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public dispose() {
    this.isDisposed = true;
    this.scheduler.dispose();
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.gl && this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
    if (this.gl && this.posBuffer) {
      this.gl.deleteBuffer(this.posBuffer);
      this.posBuffer = null;
    }
  }

  /** Without preserveDrawingBuffer the buffer is only valid right after a draw, so draw and read in one task. */
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
}
