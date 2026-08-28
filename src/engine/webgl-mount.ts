import { ditherVertexShader, ditherFragmentShader } from "./shaders/dither.glsl";
import { parseColorToNormalizedRgba } from "@/lib/utils";
import { paletteToVec4Array } from "./palettes";

export interface DitherMountOptions {
  canvas: HTMLCanvasElement;
  ditherType?: "noise" | "2x2" | "4x4" | "8x8" | "16x16" | "halftone" | "crosshatch" | "clustered";
  pxSize?: number;
  threshold?: number;
  halftoneAngle?: number;
  halftoneScale?: number;
  colorMode?: "paper" | "duotone" | "original" | "palette" | "grayscale";
  colorBack?: string;
  colorFront?: string;
  colorHighlight?: string;
  palette?: string[];
  colorSteps?: number;
  inverted?: boolean;
  fit?: "contain" | "cover" | "fill";
  scale?: number;
  rotation?: number;
  offsetX?: number;
  offsetY?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  proceduralShape?: "simplex" | "warp" | "dots" | "waves" | "ripple" | "swirl" | "sphere";
  animated?: boolean;
  animationSpeed?: number;
  minPixelRatio?: number;
  maxPixelCount?: number;
}

const DITHER_TYPES = {
  noise: 1,
  "2x2": 2,
  "4x4": 3,
  "8x8": 4,
  "16x16": 5,
  halftone: 6,
  crosshatch: 7,
  clustered: 8,
} as const;

const COLOR_MODES = {
  paper: 1,
  duotone: 2,
  original: 3,
  palette: 4,
  grayscale: 5,
} as const;

const FIT_MODES = {
  contain: 1,
  cover: 2,
  fill: 3,
} as const;

const PROCEDURAL_SHAPES = {
  simplex: 1,
  warp: 2,
  dots: 3,
  waves: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
} as const;

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
  private options: DitherMountOptions;
  private isDisposed = false;

  private imageSource: HTMLImageElement | HTMLVideoElement | ImageBitmap | null = null;
  private imageAspectRatio = 1;
  private hasImage = false;

  constructor(options: DitherMountOptions) {
    this.canvas = options.canvas;
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
      throw new Error(`GLSL compilation error: ${info}`);
    }
    return shader;
  }

  private initGL() {
    const gl = this.gl;

    const vertShader = this.createShader(gl.VERTEX_SHADER, ditherVertexShader);
    const fragShader = this.createShader(gl.FRAGMENT_SHADER, ditherFragmentShader);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program.");

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`WebGL Program link error: ${info}`);
    }

    this.program = program;
    gl.useProgram(program);

    // Full-screen quad geometry
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Texture unit
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.program) return null;
    if (!this.uniformLocs.has(name)) {
      const loc = this.gl.getUniformLocation(this.program, name);
      this.uniformLocs.set(name, loc);
      return loc;
    }
    return this.uniformLocs.get(name) || null;
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

  public updateOptions(newOptions: Partial<DitherMountOptions>) {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.animated !== undefined) {
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

    // If source is an active video, upload current frame
    if (this.imageSource instanceof HTMLVideoElement && !this.imageSource.paused) {
      this.updateTexture();
    }

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const effectiveDpr = Math.max(1, this.options.minPixelRatio ?? dpr);

    // Set Uniforms
    gl.uniform2f(this.getUniformLocation("u_resolution"), width, height);
    gl.uniform1f(this.getUniformLocation("u_pixelRatio"), effectiveDpr);
    gl.uniform1f(this.getUniformLocation("u_time"), this.currentTime);
    gl.uniform1f(this.getUniformLocation("u_imageAspectRatio"), this.imageAspectRatio);
    gl.uniform1i(this.getUniformLocation("u_hasImage"), this.hasImage ? 1 : 0);

    // Dither mode
    const dType = DITHER_TYPES[this.options.ditherType || "8x8"] || 4;
    gl.uniform1i(this.getUniformLocation("u_ditherType"), dType);
    gl.uniform1f(this.getUniformLocation("u_pxSize"), this.options.pxSize ?? 2);
    gl.uniform1f(this.getUniformLocation("u_threshold"), this.options.threshold ?? 0.5);
    gl.uniform1f(this.getUniformLocation("u_halftoneAngle"), this.options.halftoneAngle ?? 45);
    gl.uniform1f(this.getUniformLocation("u_halftoneScale"), this.options.halftoneScale ?? 2);

    // Color mode
    const cMode = COLOR_MODES[this.options.colorMode || "paper"] || 1;
    gl.uniform1i(this.getUniformLocation("u_colorMode"), cMode);

    const backRgba = parseColorToNormalizedRgba(this.options.colorBack || "#000c38");
    const frontRgba = parseColorToNormalizedRgba(this.options.colorFront || "#94ffaf");
    const hlRgba = parseColorToNormalizedRgba(this.options.colorHighlight || "#eaff94");

    gl.uniform4fv(this.getUniformLocation("u_colorBack"), backRgba);
    gl.uniform4fv(this.getUniformLocation("u_colorFront"), frontRgba);
    gl.uniform4fv(this.getUniformLocation("u_colorHighlight"), hlRgba);

    // Multi-color palette array
    const paletteColors = this.options.palette || ["#000000", "#ffffff"];
    const palArray = paletteToVec4Array(paletteColors, 16);
    gl.uniform4fv(this.getUniformLocation("u_palette"), palArray);
    gl.uniform1i(this.getUniformLocation("u_paletteCount"), paletteColors.length);

    gl.uniform1f(this.getUniformLocation("u_colorSteps"), this.options.colorSteps ?? 2);
    gl.uniform1i(this.getUniformLocation("u_inverted"), this.options.inverted ? 1 : 0);

    // Transforms
    const fitMode = FIT_MODES[this.options.fit || "cover"] || 2;
    gl.uniform1i(this.getUniformLocation("u_fit"), fitMode);
    gl.uniform1f(this.getUniformLocation("u_scale"), this.options.scale ?? 1);
    gl.uniform1f(this.getUniformLocation("u_rotation"), this.options.rotation ?? 0);
    gl.uniform2f(
      this.getUniformLocation("u_offset"),
      this.options.offsetX ?? 0,
      this.options.offsetY ?? 0
    );

    // Adjustments
    gl.uniform1f(this.getUniformLocation("u_brightness"), this.options.brightness ?? 0);
    gl.uniform1f(this.getUniformLocation("u_contrast"), this.options.contrast ?? 1);
    gl.uniform1f(this.getUniformLocation("u_saturation"), this.options.saturation ?? 1);
    gl.uniform1f(this.getUniformLocation("u_gamma"), this.options.gamma ?? 1);

    // Procedural Shape
    const pShape = PROCEDURAL_SHAPES[this.options.proceduralShape || "simplex"] || 1;
    gl.uniform1i(this.getUniformLocation("u_proceduralShape"), pShape);

    // Texture binding unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.getUniformLocation("u_image"), 0);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private startAnimation() {
    if (this.rafId) return;
    this.lastTime = performance.now();

    const loop = (time: number) => {
      if (this.isDisposed) return;
      const delta = (time - this.lastTime) * 0.001;
      this.lastTime = time;

      const speed = this.options.animationSpeed ?? 1.0;
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
    }
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
    }
    if (this.gl && this.vao) {
      this.gl.deleteVertexArray(this.vao);
    }
  }

  /**
   * Capture high-resolution still frame offscreen (e.g. 2x, 4x, or custom resolution)
   */
  public captureHighResSnapshot(width: number, height: number): ImageData | null {
    if (!this.gl || !this.program) return null;

    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;

    const mount = new DitherWebGLMount({
      ...this.options,
      canvas: offscreen,
      minPixelRatio: 1,
    });

    mount.setMediaSource(this.imageSource);
    mount.render();

    const gl = mount.gl;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Flip Y because WebGL readPixels is bottom-to-top
    const flippedData = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const srcRow = (height - 1 - y) * width * 4;
      const dstRow = y * width * 4;
      for (let x = 0; x < width * 4; x++) {
        flippedData[dstRow + x] = pixels[srcRow + x];
      }
    }

    mount.dispose();
    return new ImageData(flippedData, width, height);
  }

  /**
   * Get current frame as Blob (image/png, image/webp, image/jpeg)
   */
  public async getSnapshotBlob(type: "image/png" | "image/webp" | "image/jpeg" = "image/png", quality = 0.95): Promise<Blob | null> {
    this.render();
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }
}
