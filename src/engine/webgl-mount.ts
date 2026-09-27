import { ditherVertexShader, ditherFragmentShader } from "./shaders/dither.glsl";
import { parseColorToNormalizedRgba } from "@/lib/utils";
import { paletteToVec4Array } from "./palettes";
import type { DitherSettings } from "./types";

export type DitherMountOptions = DitherSettings;

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

export class DitherWebGLMount {
  public canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private uniformLocs: Map<string, WebGLUniformLocation | null> = new Map();
  private vao: WebGLVertexArrayObject | null = null;
  private texture: WebGLTexture | null = null;
  private rafId: number | null = null;
  private lastTime = 0;
  private currentTime = 0;
  private options: DitherSettings;
  private isDisposed = false;

  private imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap | null = null;
  private imageAspectRatio = 1;
  private hasImage = false;

  constructor(canvas: HTMLCanvasElement, options: DitherSettings) {
    this.canvas = canvas;
    this.options = { ...options };

    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error("WebGL2 is not supported by your browser/device.");
    }
    this.gl = gl;

    this.initGL();
    this.render();

    if (this.options.animated) {
      this.startAnimation();
    }
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
      throw new Error("WebGL Shader compile error: " + info);
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
      throw new Error("WebGL program link error: " + info);
    }

    this.program = program;

    // Full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.vao = vao;

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Initial 1x1 white texture
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
      new Uint8Array([255, 255, 255, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = texture;
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocs.has(name) && this.gl && this.program) {
      this.uniformLocs.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniformLocs.get(name) ?? null;
  }

  public setMediaSource(source: HTMLImageElement | HTMLVideoElement | ImageBitmap | null) {
    this.imageSource = source;
    if (source) {
      this.hasImage = true;
      if (source instanceof HTMLVideoElement) {
        this.imageAspectRatio = (source.videoWidth || 16) / (source.videoHeight || 9);
      } else if (source instanceof HTMLImageElement) {
        this.imageAspectRatio = (source.naturalWidth || 1) / (source.naturalHeight || 1);
      } else if (source instanceof ImageBitmap) {
        this.imageAspectRatio = source.width / source.height;
      }
      this.updateTexture();
    } else {
      this.hasImage = false;
      this.imageAspectRatio = 1;
    }
    this.render();
  }

  public updateTexture() {
    if (!this.imageSource || !this.gl || !this.texture) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.imageSource
    );
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

  public render(now = 0) {
    if (this.isDisposed || !this.gl || !this.program) return;
    const gl = this.gl;

    const width = this.canvas.width;
    const height = this.canvas.height;
    if (width === 0 || height === 0) return;

    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    if (this.imageSource instanceof HTMLVideoElement && !this.imageSource.paused) {
      this.updateTexture();
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    gl.uniform2f(this.getUniformLocation("u_resolution"), width, height);
    gl.uniform1f(this.getUniformLocation("u_pixelRatio"), dpr);
    gl.uniform1f(this.getUniformLocation("u_time"), this.currentTime);
    gl.uniform1f(this.getUniformLocation("u_imageAspectRatio"), this.imageAspectRatio);
    gl.uniform1i(this.getUniformLocation("u_hasImage"), this.hasImage ? 1 : 0);

    const dType = DITHER_TYPES[this.options.ditherType] || 4;
    gl.uniform1i(this.getUniformLocation("u_ditherType"), dType);
    gl.uniform1f(this.getUniformLocation("u_pxSize"), this.options.pxSize);
    gl.uniform1f(this.getUniformLocation("u_threshold"), this.options.threshold);
    gl.uniform1f(this.getUniformLocation("u_halftoneAngle"), this.options.halftoneAngle);
    gl.uniform1f(this.getUniformLocation("u_halftoneScale"), this.options.halftoneScale);

    const cMode = COLOR_MODES[this.options.colorMode] || 1;
    gl.uniform1i(this.getUniformLocation("u_colorMode"), cMode);

    const backRgba = parseColorToNormalizedRgba(this.options.colorBack);
    const frontRgba = parseColorToNormalizedRgba(this.options.colorFront);
    const hlRgba = parseColorToNormalizedRgba(this.options.colorHighlight);

    gl.uniform4fv(this.getUniformLocation("u_colorBack"), backRgba);
    gl.uniform4fv(this.getUniformLocation("u_colorFront"), frontRgba);
    gl.uniform4fv(this.getUniformLocation("u_colorHighlight"), hlRgba);

    const paletteColors = this.options.palette.length > 0 ? this.options.palette : ["#000000", "#ffffff"];
    const palArray = paletteToVec4Array(paletteColors, 16);
    gl.uniform4fv(this.getUniformLocation("u_palette"), palArray);
    gl.uniform1i(this.getUniformLocation("u_paletteCount"), paletteColors.length);

    gl.uniform1f(this.getUniformLocation("u_colorSteps"), this.options.colorSteps);
    gl.uniform1i(this.getUniformLocation("u_inverted"), this.options.inverted ? 1 : 0);

    const fitMode = FIT_MODES[this.options.fit] || 2;
    gl.uniform1i(this.getUniformLocation("u_fit"), fitMode);
    gl.uniform1f(this.getUniformLocation("u_scale"), this.options.scale);
    gl.uniform1f(this.getUniformLocation("u_rotation"), this.options.rotation);
    gl.uniform2f(this.getUniformLocation("u_offset"), this.options.offsetX, this.options.offsetY);

    gl.uniform1f(this.getUniformLocation("u_brightness"), this.options.brightness);
    gl.uniform1f(this.getUniformLocation("u_contrast"), this.options.contrast);
    gl.uniform1f(this.getUniformLocation("u_saturation"), this.options.saturation);
    gl.uniform1f(this.getUniformLocation("u_gamma"), this.options.gamma);

    const pShape = PROCEDURAL_SHAPES[this.options.proceduralShape] || 1;
    gl.uniform1i(this.getUniformLocation("u_proceduralShape"), pShape);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.getUniformLocation("u_image"), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private startAnimation() {
    if (this.rafId) return;
    this.lastTime = performance.now();

    const loop = (time: number) => {
      if (this.isDisposed) return;
      const delta = (time - this.lastTime) * 0.001;
      this.lastTime = time;

      const speed = this.options.animationSpeed;
      this.currentTime += delta * speed;

      this.render(time);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private stopAnimation() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public dispose() {
    this.isDisposed = true;
    this.stopAnimation();
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
  }

  public async getSnapshotBlob(
    type: "image/png" | "image/webp" | "image/jpeg" = "image/png",
    quality = 0.95
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }
}
