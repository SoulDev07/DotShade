// Custom Vertex Shader
export const ditherVertexShader = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Custom High-Performance Fragment Shader
export const ditherFragmentShader = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// Canvas & Media
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform sampler2D u_image;
uniform float u_imageAspectRatio;
uniform bool u_hasImage;
uniform float u_time;

// Dithering Mode
// 1 = Random/Noise, 2 = Bayer 2x2, 3 = Bayer 4x4, 4 = Bayer 8x8, 5 = Bayer 16x16, 6 = Halftone, 7 = Crosshatch, 8 = Clustered Dots
uniform int u_ditherType;
uniform float u_pxSize;
uniform float u_threshold; // 0.0 to 1.0 (default 0.5)
uniform float u_halftoneAngle; // degrees 0 to 90
uniform float u_halftoneScale;

// Color Modes
// 1 = Paper 3-Color Ramp, 2 = Duotone, 3 = Original Colors Quantized, 4 = Palette Array Quantized, 5 = Grayscale
uniform int u_colorMode;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform vec4 u_colorHighlight;
uniform vec4 u_palette[16];
uniform int u_paletteCount;
uniform float u_colorSteps; // 1 to 16
uniform bool u_inverted;

// Transformations & Adjustments
// u_fit: 1 = contain, 2 = cover, 3 = fill
uniform int u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform vec2 u_offset;
uniform float u_brightness; // -1 to 1 (default 0)
uniform float u_contrast;   // 0 to 3 (default 1)
uniform float u_saturation; // 0 to 2 (default 1)
uniform float u_gamma;      // 0.2 to 3.0 (default 1)

// Procedural Pattern Shape (when u_hasImage is false)
// 1 = Simplex Noise, 2 = Warp Liquid, 3 = Dots, 4 = Sine Waves, 5 = Ripple, 6 = Swirl, 7 = Sphere
uniform int u_proceduralShape;

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// --- Procedural Hash & Noise Functions ---
float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

// 2D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// --- Bayer Matrices ---
const int bayer2x2[4] = int[4](0, 2, 3, 1);

const int bayer4x4[16] = int[16](
  0,  8,  2, 10,
 12,  4, 14,  6,
  3, 11,  1,  9,
 15,  7, 13,  5
);

const int bayer8x8[64] = int[64](
  0, 32,  8, 40,  2, 34, 10, 42,
 48, 16, 56, 24, 50, 18, 58, 26,
 12, 44,  4, 36, 14, 46,  6, 38,
 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43,  1, 33,  9, 41,
 51, 19, 59, 27, 49, 17, 57, 25,
 15, 47,  7, 39, 13, 45,  5, 37,
 63, 31, 55, 23, 61, 29, 53, 21
);

const int bayer16x16[256] = int[256](
    0, 128,  32, 160,   8, 136,  40, 168,   2, 130,  34, 162,  10, 138,  42, 170,
  192,  64, 224,  96, 200,  72, 232, 104, 194,  66, 226,  98, 202,  74, 234, 106,
   48, 176,  16, 144,  56, 184,  24, 152,  50, 178,  18, 146,  58, 186,  26, 154,
  240, 112, 208,  80, 248, 120, 216,  88, 242, 114, 210,  82, 250, 122, 218,  90,
   12, 140,  44, 172,   4, 132,  36, 164,  14, 142,  46, 174,   6, 134,  38, 166,
  204,  76, 236, 108, 196,  68, 228, 100, 206,  78, 238, 110, 198,  70, 230, 102,
   60, 188,  28, 156,  52, 180,  20, 148,  62, 190,  30, 158,  54, 182,  22, 150,
  252, 124, 220,  92, 244, 116, 212,  84, 254, 126, 222,  94, 246, 118, 214,  86,
    3, 131,  35, 163,  11, 139,  43, 171,   1, 129,  33, 161,   9, 137,  41, 169,
  195,  67, 227,  99, 203,  75, 235, 107, 193,  65, 225,  97, 201,  73, 233, 105,
   51, 179,  19, 147,  59, 187,  27, 155,  49, 177,  17, 145,  57, 185,  25, 153,
  243, 115, 211,  83, 251, 123, 219,  91, 241, 113, 209,  81, 249, 121, 217,  89,
   15, 143,  47, 175,   7, 135,  39, 167,  13, 141,  45, 173,   5, 133,  37, 165,
  207,  79, 239, 111, 199,  71, 231, 103, 205,  77, 237, 109, 197,  69, 229, 101,
   63, 191,  31, 159,  55, 183,  23, 151,  61, 189,  29, 157,  53, 181,  21, 149,
  255, 127, 223,  95, 247, 119, 215,  87, 253, 125, 221,  93, 245, 117, 213,  85
);

// Clustered 8x8 Dot Matrix for Newsprint Dithering
const int clustered8x8[64] = int[64](
  24, 10, 12, 26, 35, 47, 49, 37,
   8,  0,  2, 14, 45, 59, 61, 51,
  22,  6,  4, 16, 43, 57, 63, 53,
  30, 20, 18, 28, 33, 41, 55, 39,
  34, 46, 48, 36, 25, 11, 13, 27,
  44, 58, 60, 50,  9,  1,  3, 15,
  42, 56, 62, 52, 23,  7,  5, 17,
  32, 40, 54, 38, 31, 21, 19, 29
);

float getBayerThreshold(vec2 pos, int type) {
  if (type == 2) { // 2x2
    ivec2 p = ivec2(mod(pos, 2.0));
    return float(bayer2x2[p.y * 2 + p.x]) / 4.0;
  } else if (type == 3) { // 4x4
    ivec2 p = ivec2(mod(pos, 4.0));
    return float(bayer4x4[p.y * 4 + p.x]) / 16.0;
  } else if (type == 4) { // 8x8
    ivec2 p = ivec2(mod(pos, 8.0));
    return float(bayer8x8[p.y * 8 + p.x]) / 64.0;
  } else if (type == 5) { // 16x16
    ivec2 p = ivec2(mod(pos, 16.0));
    return float(bayer16x16[p.y * 16 + p.x]) / 256.0;
  } else if (type == 8) { // Clustered Dots
    ivec2 p = ivec2(mod(pos, 8.0));
    return float(clustered8x8[p.y * 8 + p.x]) / 64.0;
  }
  return 0.5;
}

// Halftone Screen Calculation
float getHalftoneThreshold(vec2 pixelPos, float angleDeg, float scale) {
  float angle = angleDeg * PI / 180.0;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rotPos = rot * pixelPos / max(scale, 1.0);
  float dotPattern = (sin(rotPos.x) + sin(rotPos.y) + 2.0) * 0.25;
  return dotPattern;
}

// Crosshatch Screen Calculation
float getCrosshatchThreshold(vec2 pixelPos, float gridSize) {
  float sz = max(gridSize * 2.0, 2.0);
  float line1 = mod(pixelPos.x + pixelPos.y, sz) < gridSize ? 1.0 : 0.0;
  float line2 = mod(pixelPos.x - pixelPos.y + sz * 2.0, sz) < gridSize ? 1.0 : 0.0;
  return (line1 + line2) * 0.5;
}

// Compute Image UV with Fit, Rotation, Scale, Offset
vec2 computeImageUV(vec2 uv) {
  vec2 imageBoxSize;
  if (u_fit == 1) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else { // fill
    imageBoxSize = u_resolution;
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution / imageBoxSize;

  vec2 centeredUV = uv - 0.5;
  centeredUV *= imageBoxScale;
  centeredUV -= u_offset;
  centeredUV /= max(u_scale, 0.01);

  float rad = u_rotation * PI / 180.0;
  mat2 rot = mat2(cos(rad), sin(rad), -sin(rad), cos(rad));
  centeredUV.x *= u_imageAspectRatio;
  centeredUV = rot * centeredUV;
  centeredUV.x /= u_imageAspectRatio;

  vec2 finalUV = centeredUV + 0.5;
  finalUV.y = 1.0 - finalUV.y; // Flip Y for WebGL texture orientation
  return finalUV;
}

// Procedural Shape Generator
float generateProceduralShape(vec2 uv, float t) {
  vec2 p = uv - 0.5;
  p /= max(u_scale, 0.01);

  float rad = u_rotation * PI / 180.0;
  mat2 rot = mat2(cos(rad), sin(rad), -sin(rad), cos(rad));
  p = rot * p;

  if (u_proceduralShape == 1) { // Simplex Noise
    vec2 sp = p * 4.0;
    float n = 0.5 * snoise(sp - vec2(0.0, 0.3 * t));
    n += 0.5 * snoise(2.0 * sp + vec2(0.0, 0.32 * t));
    return smoothstep(0.2, 0.8, n * 0.5 + 0.5);
  } else if (u_proceduralShape == 2) { // Warp Liquid
    vec2 wp = p * 8.0;
    for (float i = 1.0; i < 5.0; i++) {
      wp.x += 0.6 / i * cos(i * 2.5 * wp.y + t);
      wp.y += 0.6 / i * cos(i * 1.5 * wp.x + t);
    }
    float w = 0.15 / max(0.001, abs(sin(t - wp.y - wp.x)));
    return smoothstep(0.05, 0.95, w);
  } else if (u_proceduralShape == 3) { // Dots
    vec2 dp = p * 16.0;
    float stripe = floor(2.0 * dp.x / TWO_PI);
    float rand = hash21(vec2(stripe, 1.0));
    float d = sin(dp.x) * cos(dp.y - 4.0 * (rand - 0.5) * t);
    return pow(abs(d), 4.0);
  } else if (u_proceduralShape == 4) { // Sine Waves
    vec2 sp = p * 12.0;
    float wave = cos(0.5 * sp.x - 2.0 * t) * sin(1.5 * sp.x + t) * (0.75 + 0.25 * cos(3.0 * t));
    return 1.0 - smoothstep(-0.8, 0.8, sp.y + wave);
  } else if (u_proceduralShape == 5) { // Ripple
    float dist = length(p);
    return sin(pow(dist, 1.5) * 18.0 - 4.0 * t) * 0.5 + 0.5;
  } else if (u_proceduralShape == 6) { // Swirl
    float l = length(p);
    float angle = 6.0 * atan(p.y, p.x) + 3.0 * t;
    float offset = 1.0 / pow(max(l, 0.001), 1.2) + angle / TWO_PI;
    float mid = smoothstep(0.0, 1.0, pow(l, 1.2));
    return mix(0.0, fract(offset), mid);
  } else { // Sphere 3D
    vec2 sp = p * 2.5;
    float d = 1.0 - dot(sp, sp);
    if (d < 0.0) return 0.0;
    vec3 normal = vec3(sp, sqrt(max(0.0, d)));
    vec3 light = normalize(vec3(cos(1.5 * t), 0.8, sin(1.25 * t)));
    return clamp(0.5 + 0.5 * dot(light, normal), 0.0, 1.0);
  }
}

// Find closest color in palette uniform array
vec4 matchClosestPaletteColor(vec3 color, float lum) {
  float minDiff = 1000.0;
  vec4 closest = u_palette[0];
  int count = max(1, min(16, u_paletteCount));

  for (int i = 0; i < 16; i++) {
    if (i >= count) break;
    vec3 palColor = u_palette[i].rgb;
    // Perceptually weighted distance
    vec3 diff = color - palColor;
    float dist = 0.3 * diff.r * diff.r + 0.59 * diff.g * diff.g + 0.11 * diff.b * diff.b;
    if (dist < minDiff) {
      minDiff = dist;
      closest = u_palette[i];
    }
  }
  return closest;
}

void main() {
  float effectivePx = max(1.0, u_pxSize * u_pixelRatio);
  
  // Pixel grid alignment
  vec2 pixelPos = floor(gl_FragCoord.xy / effectivePx);
  vec2 canvasUV = (pixelPos * effectivePx + 0.5 * effectivePx) / u_resolution;

  // Sample or generate base color
  vec4 sourceColor;
  if (u_hasImage) {
    vec2 imgUV = computeImageUV(canvasUV);
    // Bounds check
    if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) {
      sourceColor = vec4(0.0);
    } else {
      sourceColor = texture(u_image, imgUV);
    }
  } else {
    float shapeVal = generateProceduralShape(canvasUV, u_time * 0.5);
    sourceColor = vec4(vec3(shapeVal), 1.0);
  }

  // Skip completely transparent background pixels
  if (sourceColor.a < 0.01) {
    fragColor = vec4(0.0);
    return;
  }

  // Adjust Brightness, Contrast, Saturation, Gamma
  vec3 rgb = sourceColor.rgb;
  // Brightness
  rgb += u_brightness;
  // Contrast
  rgb = (rgb - 0.5) * u_contrast + 0.5;
  // Saturation
  float baseLum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(baseLum), rgb, u_saturation);
  // Gamma
  rgb = pow(max(rgb, vec3(0.0)), vec3(1.0 / max(u_gamma, 0.01)));
  rgb = clamp(rgb, 0.0, 1.0);

  // Luminance
  float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (u_inverted) {
    lum = 1.0 - lum;
    rgb = 1.0 - rgb;
  }

  // Compute Dithering Threshold
  float ditherVal = 0.5;
  if (u_ditherType == 1) { // Random / Noise
    ditherVal = hash21(pixelPos + fract(u_time * 12.34));
  } else if (u_ditherType >= 2 && u_ditherType <= 5) { // Bayer 2x2, 4x4, 8x8, 16x16
    ditherVal = getBayerThreshold(pixelPos, u_ditherType);
  } else if (u_ditherType == 6) { // Halftone Dot Screen
    ditherVal = getHalftoneThreshold(pixelPos * effectivePx, u_halftoneAngle, u_halftoneScale * effectivePx);
  } else if (u_ditherType == 7) { // Crosshatch
    ditherVal = getCrosshatchThreshold(pixelPos, u_pxSize * 2.0);
  } else if (u_ditherType == 8) { // Clustered Dots
    ditherVal = getBayerThreshold(pixelPos, 8);
  }

  // Adjust dither threshold with user threshold bias
  float bias = (u_threshold - 0.5) * 0.8;
  ditherVal = clamp(ditherVal - bias, 0.0, 1.0);
  float ditherOffset = ditherVal - 0.5;

  float steps = max(1.0, u_colorSteps);
  float modulatedLum = clamp(lum + ditherOffset / steps, 0.0, 1.0);
  float quantLum = floor(modulatedLum * steps + 0.5) / steps;

  vec4 finalColor = vec4(0.0, 0.0, 0.0, 1.0);

  // 1 = Paper 3-Color Ramp (colorBack, colorFront, colorHighlight)
  if (u_colorMode == 1) {
    vec3 fg = u_colorFront.rgb * u_colorFront.a;
    float fgA = u_colorFront.a;
    vec3 bg = u_colorBack.rgb * u_colorBack.a;
    float bgA = u_colorBack.a;
    vec3 hl = u_colorHighlight.rgb * u_colorHighlight.a;
    float hlA = u_colorHighlight.a;

    // Smooth step highlight threshold
    float hlStep = step(1.02 - 0.02 * steps, modulatedLum);
    fg = mix(fg, hl, hlStep);
    fgA = mix(fgA, hlA, hlStep);

    vec3 col = fg * quantLum;
    float alpha = fgA * quantLum;
    col += bg * (1.0 - alpha);
    alpha += bgA * (1.0 - alpha);
    finalColor = vec4(col, alpha);
  }
  // 2 = Duotone (colorBack, colorFront)
  else if (u_colorMode == 2) {
    float bit = step(0.5, modulatedLum);
    vec3 col = mix(u_colorBack.rgb, u_colorFront.rgb, bit);
    float alpha = mix(u_colorBack.a, u_colorFront.a, bit);
    finalColor = vec4(col, alpha);
  }
  // 3 = Original Colors Quantized
  else if (u_colorMode == 3) {
    vec3 normColor = rgb / max(lum, 0.001);
    vec3 quantizedRgb = normColor * quantLum;
    finalColor = vec4(clamp(quantizedRgb, 0.0, 1.0), sourceColor.a);
  }
  // 4 = Palette Array Quantized
  else if (u_colorMode == 4) {
    vec3 ditheredRgb = clamp(rgb + ditherOffset * (1.0 / steps), 0.0, 1.0);
    finalColor = matchClosestPaletteColor(ditheredRgb, modulatedLum);
  }
  // 5 = Grayscale
  else {
    float bit = quantLum;
    finalColor = vec4(vec3(bit), sourceColor.a);
  }

  fragColor = finalColor;
}
`;
