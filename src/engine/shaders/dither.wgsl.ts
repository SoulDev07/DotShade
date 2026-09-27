// WGSL dither shader for vgpu (https://vgpu.sh/) and native WebGPU

export const ditherWgslShader = `
struct FullscreenVertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> FullscreenVertexOut {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var uv = array<vec2f, 3>(vec2f(0.0, 1.0), vec2f(2.0, 1.0), vec2f(0.0, -1.0));
  var out: FullscreenVertexOut;
  out.position = vec4f(pos[vi], 0.0, 1.0);
  out.uv = uv[vi];
  return out;
}

struct Params {
  resolution: vec2f,
  pixelRatio: f32,
  imageAspectRatio: f32,
  hasImage: u32,
  time: f32,
  ditherType: u32,
  pxSize: f32,
  threshold: f32,
  halftoneAngle: f32,
  halftoneScale: f32,
  colorMode: u32,
  colorSteps: f32,
  inverted: u32,
  fit: u32,
  scale: f32,
  rotation: f32,
  offsetX: f32,
  offsetY: f32,
  brightness: f32,
  contrast: f32,
  saturation: f32,
  gamma: f32,
  proceduralShape: u32,
  paletteCount: u32,
  colorBack: vec4f,
  colorFront: vec4f,
  colorHighlight: vec4f,
  palette_0: vec4f,
  palette_1: vec4f,
  palette_2: vec4f,
  palette_3: vec4f,
  palette_4: vec4f,
  palette_5: vec4f,
  palette_6: vec4f,
  palette_7: vec4f,
  palette_8: vec4f,
  palette_9: vec4f,
  palette_10: vec4f,
  palette_11: vec4f,
  palette_12: vec4f,
  palette_13: vec4f,
  palette_14: vec4f,
  palette_15: vec4f,
};

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> params: Params;

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

// Hash function
fn hash21(p_in: vec2f) -> f32 {
  var p = fract(p_in * vec2f(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

// 2D Simplex Noise in WGSL
fn mod289_3(x: vec3f) -> vec3f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn mod289_2(x: vec2f) -> vec2f {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

fn permute_3(x: vec3f) -> vec3f {
  return mod289_3(((x * 34.0) + 1.0) * x);
}

fn snoise2(v: vec2f) -> f32 {
  let C = vec4f(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  var i = floor(v + dot(v, C.yy));
  let x0 = v - i + dot(i, C.xx);

  var i1: vec2f;
  if (x0.x > x0.y) {
    i1 = vec2f(1.0, 0.0);
  } else {
    i1 = vec2f(0.0, 1.0);
  }

  var x12 = x0.xyxy + C.xxzz;
  x12.x -= i1.x;
  x12.y -= i1.y;

  i = mod289_2(i);
  let p = permute_3(permute_3(i.y + vec3f(0.0, i1.y, 1.0)) + i.x + vec3f(0.0, i1.x, 1.0));

  var m = max(vec3f(0.5) - vec3f(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3f(0.0));
  m = m * m;
  m = m * m;

  let x = 2.0 * fract(p * C.www) - 1.0;
  let h = abs(x) - 0.5;
  let ox = floor(x + 0.5);
  let a0 = x - ox;

  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

  let g0 = a0.x * x0.x + h.x * x0.y;
  let g12 = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * (m.x * g0 + m.y * g12.x + m.z * g12.y);
}

// Bayer 2x2
fn bayer2(p: vec2u) -> f32 {
  let m = array<f32, 4>(0.0, 2.0, 3.0, 1.0);
  return m[(p.y % 2u) * 2u + (p.x % 2u)] / 4.0;
}

// Bayer 4x4
fn bayer4(p: vec2u) -> f32 {
  let m = array<f32, 16>(
    0.0,  8.0,  2.0, 10.0,
   12.0,  4.0, 14.0,  6.0,
    3.0, 11.0,  1.0,  9.0,
   15.0,  7.0, 13.0,  5.0
  );
  return m[(p.y % 4u) * 4u + (p.x % 4u)] / 16.0;
}

// Bayer 8x8
fn bayer8(p: vec2u) -> f32 {
  let m = array<f32, 64>(
    0.0, 32.0,  8.0, 40.0,  2.0, 34.0, 10.0, 42.0,
   48.0, 16.0, 56.0, 24.0, 50.0, 18.0, 58.0, 26.0,
   12.0, 44.0,  4.0, 36.0, 14.0, 46.0,  6.0, 38.0,
   60.0, 28.0, 52.0, 20.0, 62.0, 30.0, 54.0, 22.0,
    3.0, 35.0, 11.0, 43.0,  1.0, 33.0,  9.0, 41.0,
   51.0, 19.0, 59.0, 27.0, 49.0, 17.0, 57.0, 25.0,
   15.0, 47.0,  7.0, 39.0, 13.0, 45.0,  5.0, 37.0,
   63.0, 31.0, 55.0, 23.0, 61.0, 29.0, 53.0, 21.0
  );
  return m[(p.y % 8u) * 8u + (p.x % 8u)] / 64.0;
}

// Clustered 8x8 for newsprint
fn clustered8(p: vec2u) -> f32 {
  let m = array<f32, 64>(
    24.0, 10.0, 12.0, 26.0, 35.0, 47.0, 49.0, 37.0,
     8.0,  0.0,  2.0, 14.0, 45.0, 59.0, 61.0, 51.0,
    22.0,  6.0,  4.0, 16.0, 43.0, 57.0, 63.0, 53.0,
    30.0, 20.0, 18.0, 28.0, 33.0, 41.0, 55.0, 39.0,
    34.0, 46.0, 48.0, 36.0, 25.0, 11.0, 13.0, 27.0,
    44.0, 58.0, 60.0, 50.0,  9.0,  1.0,  3.0, 15.0,
    42.0, 56.0, 62.0, 52.0, 23.0,  7.0,  5.0, 17.0,
    32.0, 40.0, 54.0, 38.0, 31.0, 21.0, 19.0, 29.0
  );
  return m[(p.y % 8u) * 8u + (p.x % 8u)] / 64.0;
}

fn getDitherPattern(coord: vec2f, ditherType: u32) -> f32 {
  let p = vec2u(coord);
  switch (ditherType) {
    case 1u: { // Random noise
      return hash21(coord + fract(params.time * 0.05));
    }
    case 2u: { // Bayer 2x2
      return bayer2(p);
    }
    case 3u: { // Bayer 4x4
      return bayer4(p);
    }
    case 4u: { // Bayer 8x8
      return bayer8(p);
    }
    case 5u: { // Bayer 16x16 approximated
      let coarse = bayer4(p / 4u);
      let fine = bayer4(p);
      return (coarse * 16.0 + fine) / 256.0;
    }
    case 6u: { // Halftone Dot Screen
      let rad = radians(params.halftoneAngle);
      let rot = mat2x2f(cos(rad), -sin(rad), sin(rad), cos(rad));
      let htP = rot * coord / max(params.halftoneScale * params.pxSize, 1.0);
      let d = length(fract(htP) - vec2f(0.5));
      return clamp(d * 1.414, 0.0, 1.0);
    }
    case 7u: { // Crosshatch
      let diag1 = fract((coord.x + coord.y) / (4.0 * params.pxSize));
      let diag2 = fract((coord.x - coord.y) / (4.0 * params.pxSize));
      return (diag1 + diag2) * 0.5;
    }
    case 8u: { // Clustered
      return clustered8(p);
    }
    default: {
      return bayer8(p);
    }
  }
}

// Procedural visual generators
fn generateProceduralColor(uv: vec2f) -> vec3f {
  let t = params.time * 0.5;
  let p = (uv - 0.5) * 2.0;

  switch (params.proceduralShape) {
    case 1u: { // Simplex Noise
      let n1 = snoise2(p * 2.5 + vec2f(t * 0.2, -t * 0.15));
      let n2 = snoise2(p * 5.0 - vec2f(t * 0.1, t * 0.25)) * 0.5;
      let val = clamp(0.5 + 0.5 * (n1 + n2), 0.0, 1.0);
      return vec3f(val);
    }
    case 2u: { // Liquid Warp
      var q = p;
      q.x += 0.3 * sin(3.0 * q.y + t);
      q.y += 0.3 * cos(3.0 * q.x + t * 0.8);
      let n = snoise2(q * 3.0);
      let val = clamp(0.5 + 0.5 * n, 0.0, 1.0);
      return vec3f(val);
    }
    case 3u: { // Dots grid
      let grid = fract(p * 4.0 + vec2f(t * 0.1, 0.0)) - vec2f(0.5);
      let d = length(grid);
      let val = 1.0 - smoothstep(0.15, 0.45, d);
      return vec3f(val);
    }
    case 4u: { // Sine Waves
      let w = sin(p.x * 6.0 + sin(p.y * 4.0 + t) * 2.0 + t);
      let val = 0.5 + 0.5 * w;
      return vec3f(val);
    }
    case 5u: { // Ripple
      let dist = length(p);
      let r = sin(dist * 12.0 - t * 3.0);
      let val = clamp(0.5 + 0.5 * r * exp(-dist * 0.8), 0.0, 1.0);
      return vec3f(val);
    }
    case 6u: { // Swirl
      let r = length(p);
      let theta = atan2(p.y, p.x) + r * 3.0 - t;
      let val = 0.5 + 0.5 * sin(theta * 4.0);
      return vec3f(val);
    }
    case 7u: { // Sphere 3D shading
      let r = length(p);
      if (r > 0.9) { return vec3f(0.05); }
      let z = sqrt(max(0.0, 0.81 - r * r));
      let normal = normalize(vec3f(p.x, p.y, z));
      let light = normalize(vec3f(cos(t), sin(t), 1.2));
      let diff = max(dot(normal, light), 0.0);
      return vec3f(diff);
    }
    default: {
      return vec3f(0.5 + 0.5 * snoise2(p * 3.0));
    }
  }
}

fn getPaletteColor(index: u32) -> vec4f {
  switch (index) {
    case 0u: { return params.palette_0; }
    case 1u: { return params.palette_1; }
    case 2u: { return params.palette_2; }
    case 3u: { return params.palette_3; }
    case 4u: { return params.palette_4; }
    case 5u: { return params.palette_5; }
    case 6u: { return params.palette_6; }
    case 7u: { return params.palette_7; }
    case 8u: { return params.palette_8; }
    case 9u: { return params.palette_9; }
    case 10u: { return params.palette_10; }
    case 11u: { return params.palette_11; }
    case 12u: { return params.palette_12; }
    case 13u: { return params.palette_13; }
    case 14u: { return params.palette_14; }
    default: { return params.palette_15; }
  }
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Quantize coordinate to pixel block size
  let px = max(1.0, params.pxSize);
  let pixelCoord = floor((uv * params.resolution) / px);
  let sampleUv = (pixelCoord * px + vec2f(px * 0.5)) / params.resolution;

  // Media Aspect Ratio & UV fitting
  var texUv = sampleUv;
  let canvasAspect = params.resolution.x / max(params.resolution.y, 1.0);
  let imgAspect = max(0.001, params.imageAspectRatio);

  if (params.fit == 2u) { // Cover
    if (canvasAspect > imgAspect) {
      let scaleY = imgAspect / canvasAspect;
      texUv.y = (texUv.y - 0.5) * scaleY + 0.5;
    } else {
      let scaleX = canvasAspect / imgAspect;
      texUv.x = (texUv.x - 0.5) * scaleX + 0.5;
    }
  } else if (params.fit == 1u) { // Contain
    if (canvasAspect > imgAspect) {
      let scaleX = canvasAspect / imgAspect;
      texUv.x = (texUv.x - 0.5) * scaleX + 0.5;
    } else {
      let scaleY = imgAspect / canvasAspect;
      texUv.y = (texUv.y - 0.5) * scaleY + 0.5;
    }
  }

  // User transformations: Center -> Scale -> Rotate -> Offset
  var tUv = texUv - vec2f(0.5);
  let ang = radians(params.rotation);
  let rotMat = mat2x2f(cos(ang), -sin(ang), sin(ang), cos(ang));
  tUv = rotMat * tUv;
  tUv = tUv / max(params.scale, 0.001);
  tUv += vec2f(0.5) - vec2f(params.offsetX, -params.offsetY);

  var baseColor: vec3f;
  if (params.hasImage == 1u) {
    if (tUv.x < 0.0 || tUv.x > 1.0 || tUv.y < 0.0 || tUv.y > 1.0) {
      baseColor = vec3f(0.0);
    } else {
      let sampled = textureSampleLevel(src, samp, tUv, 0.0);
      baseColor = sampled.rgb;
    }
  } else {
    baseColor = generateProceduralColor(tUv);
  }

  // Adjustments: Brightness, Contrast, Saturation, Gamma
  baseColor += vec3f(params.brightness);
  baseColor = (baseColor - vec3f(0.5)) * max(params.contrast, 0.0) + vec3f(0.5);
  let luma = dot(baseColor, vec3f(0.299, 0.587, 0.114));
  baseColor = mix(vec3f(luma), baseColor, max(params.saturation, 0.0));
  baseColor = pow(max(baseColor, vec3f(0.0)), vec3f(1.0 / max(params.gamma, 0.001)));
  baseColor = clamp(baseColor, vec3f(0.0), vec3f(1.0));

  var gray = dot(baseColor, vec3f(0.299, 0.587, 0.114));
  if (params.inverted == 1u) {
    gray = 1.0 - gray;
    baseColor = vec3f(1.0) - baseColor;
  }

  // Dither threshold matrix
  let thresholdVal = getDitherPattern(pixelCoord, params.ditherType);
  let ditherBias = (thresholdVal - 0.5);
  let ditherStrength = 0.5;

  let steps = max(params.colorSteps, 1.0);
  let steppedLuma = clamp(gray + ditherBias * ditherStrength + (params.threshold - 0.5), 0.0, 1.0);
  let quantLevel = floor(steppedLuma * steps + 0.5) / steps;

  var outColor: vec4f;

  switch (params.colorMode) {
    case 1u: { // Paper 3-Color Ramp (Dark, Mid/Front, Highlight)
      if (quantLevel < 0.45) {
        let tRamp = quantLevel / 0.45;
        outColor = mix(params.colorBack, params.colorFront, tRamp);
      } else {
        let tRamp = (quantLevel - 0.45) / 0.55;
        outColor = mix(params.colorFront, params.colorHighlight, tRamp);
      }
    }
    case 2u: { // Duotone (Back to Front)
      outColor = mix(params.colorBack, params.colorFront, quantLevel);
    }
    case 3u: { // Original Colors Quantized
      let ditheredR = clamp(floor((baseColor.r + ditherBias * 0.35) * steps + 0.5) / steps, 0.0, 1.0);
      let ditheredG = clamp(floor((baseColor.g + ditherBias * 0.35) * steps + 0.5) / steps, 0.0, 1.0);
      let ditheredB = clamp(floor((baseColor.b + ditherBias * 0.35) * steps + 0.5) / steps, 0.0, 1.0);
      outColor = vec4f(ditheredR, ditheredG, ditheredB, 1.0);
    }
    case 4u: { // Palette Array Quantized
      let count = max(params.paletteCount, 2u);
      var bestIdx = 0u;
      var bestDist = 999.0;
      let targetRgb = baseColor + vec3f(ditherBias * (0.8 / f32(count)));

      for (var i = 0u; i < 16u; i = i + 1u) {
        if (i >= count) { break; }
        let palCol = getPaletteColor(i).rgb;
        let diff = palCol - targetRgb;
        let dist = dot(diff, diff);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      outColor = getPaletteColor(bestIdx);
    }
    case 5u: { // Grayscale
      outColor = vec4f(vec3f(quantLevel), 1.0);
    }
    default: {
      outColor = vec4f(vec3f(quantLevel), 1.0);
    }
  }

  return vec4f(outColor.rgb, 1.0);
}
`;
