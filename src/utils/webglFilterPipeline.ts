import { FilterGradeParams, FilterId, getFilterById } from '../types/filters';

export interface WebGLRenderOptions {
  mirrorX?: boolean;
  cropRect?: [number, number, number, number]; // normalized [sx, sy, sw, sh] in top-left coords
  gcamStrength?: number; // 0..1 live Pixel HDR+ preview curve + halo-clamped acutance
  gcamAcutance?: number; // 0..1 Sabre edge acutance strength
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Map clip space (-1..1) to top-left UV space (0..1)
    v_uv = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D u_tex;
  varying vec2 v_uv;

  uniform float u_mirrorX;
  uniform vec4 u_cropRect;
  uniform float u_intensity;
  uniform float u_exposure;
  uniform float u_contrast;
  uniform float u_saturation;
  uniform float u_temperature;
  uniform float u_tint;
  uniform float u_highlights;
  uniform float u_shadows;
  uniform float u_clarity;
  uniform float u_fade;
  uniform float u_mono;
  uniform vec3 u_monoWeights;
  uniform float u_sepia;
  uniform vec3 u_shadowTint;
  uniform vec3 u_highlightTint;
  uniform float u_vignette;
  uniform float u_softGlow;
  uniform float u_gcamStrength;
  uniform float u_gcamAcutance;
  uniform vec2 u_texelSize;

  void main() {
    vec2 screenUv = v_uv;
    if (u_mirrorX > 0.5) {
      screenUv.x = 1.0 - screenUv.x;
    }
    vec2 texUv = vec2(
      u_cropRect.x + screenUv.x * u_cropRect.z,
      u_cropRect.y + screenUv.y * u_cropRect.w
    );

    vec2 clampedUv = clamp(texUv, 0.0, 1.0);
    vec4 texel = texture2D(u_tex, clampedUv);
    vec3 orig = texel.rgb;

    // Live GCam Pro Max HDR+ Viewfinder Pre-Pass (Highlight Roll-off + Shadow Recovery + Halo-Clamped Sabre Acutance)
    vec3 gcamBase = orig;
    if (u_gcamStrength > 0.001) {
      if (u_gcamAcutance > 0.001) {
        vec3 n = texture2D(u_tex, clamp(clampedUv + vec2(0.0, -u_texelSize.y), 0.0, 1.0)).rgb;
        vec3 s = texture2D(u_tex, clamp(clampedUv + vec2(0.0, u_texelSize.y), 0.0, 1.0)).rgb;
        vec3 wN = texture2D(u_tex, clamp(clampedUv + vec2(-u_texelSize.x, 0.0), 0.0, 1.0)).rgb;
        vec3 eN = texture2D(u_tex, clamp(clampedUv + vec2(u_texelSize.x, 0.0), 0.0, 1.0)).rgb;
        vec3 localMean = (n + s + wN + eN) * 0.25;
        vec3 detail = gcamBase - localMean;
        vec3 localMin = min(gcamBase, min(min(n, s), min(wN, eN)));
        vec3 localMax = max(gcamBase, max(max(n, s), max(wN, eN)));
        gcamBase = clamp(gcamBase + detail * (0.36 * u_gcamAcutance), localMin - 0.014, localMax + 0.014);
      }
      float gLuma = clamp(dot(gcamBase, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
      if (gLuma > 0.001) {
        float shBoost = (1.0 - smoothstep(0.04, 0.44, gLuma)) * smoothstep(0.0, 0.03, gLuma) * 0.24 * u_gcamStrength;
        float hiRoll = smoothstep(0.58, 0.99, gLuma) * 0.22 * u_gcamStrength;
        float sCurve = -sin(gLuma * 6.28318) * (0.045 * u_gcamStrength);
        float tonalMul = (1.0 + shBoost) * (1.0 - hiRoll) * ((gLuma + sCurve) / gLuma);
        gcamBase = clamp(gcamBase * tonalMul, 0.0, 1.0);
      }
      float gLum2 = dot(gcamBase, vec3(0.2126, 0.7152, 0.0722));
      float maxC = max(gcamBase.r, max(gcamBase.g, gcamBase.b));
      float minC = min(gcamBase.r, min(gcamBase.g, gcamBase.b));
      float sat = maxC > 0.001 ? (maxC - minC) / maxC : 0.0;
      float vib = 1.0 + 0.11 * u_gcamStrength * (1.0 - sat * 1.15);
      gcamBase = clamp(mix(vec3(gLum2), gcamBase, vib), 0.0, 1.0);
    }

    if (u_intensity <= 0.001) {
      gl_FragColor = vec4(gcamBase, texel.a);
      return;
    }

    vec3 c = gcamBase;

    // 1. Exposure lift
    if (abs(u_exposure) > 0.001) {
      c = c * (1.0 + u_exposure * 0.36) + u_exposure * 0.12;
    }

    // 2. Color Temperature & Tint
    c.r += u_temperature * 0.24;
    c.b -= u_temperature * 0.24;
    c.g -= u_tint * 0.20;
    c.r += u_tint * 0.09;
    c.b += u_tint * 0.09;

    // 3. Tone & Split-Tone Recovery (Shadows / Highlights)
    float luma = clamp(dot(clamp(c, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    float shMask = 1.0 - smoothstep(0.05, 0.55, luma);
    float hiMask = smoothstep(0.45, 0.95, luma);
    c += u_shadows * shMask * 0.36;
    c += u_highlights * hiMask * 0.32;
    c += u_shadowTint * shMask;
    c += u_highlightTint * hiMask;

    // 4. Portrait soft radiance & midtone clarity
    if (u_softGlow > 0.001) {
      float skinLift = smoothstep(0.2, 0.85, luma) * u_softGlow;
      c += skinLift * 0.14;
      c = mix(c, (c - 0.5) * 0.94 + 0.52, clamp(u_softGlow * 0.5, 0.0, 0.25));
    }
    if (abs(u_clarity) > 0.001) {
      float midMask = 1.0 - abs(luma - 0.5) * 2.0;
      c = (c - 0.5) * (1.0 + u_clarity * 0.35 * midMask) + 0.5;
    }

    // 5. Filmic Contrast & Matte Shadow Floor
    c = (c - 0.5) * u_contrast + 0.5;
    if (u_fade > 0.001) {
      c = c * (1.0 - u_fade * 0.55) + u_fade;
    }

    // 6. Chromatic Saturation
    float lum2 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(lum2), c, u_saturation);

    // 7. Monochrome & Archival Sepia
    if (u_mono > 0.001) {
      float m = dot(c, u_monoWeights);
      c = mix(c, vec3(m), u_mono);
    }
    if (u_sepia > 0.001) {
      vec3 sep = vec3(
        dot(c, vec3(0.393, 0.769, 0.189)),
        dot(c, vec3(0.349, 0.686, 0.168)),
        dot(c, vec3(0.272, 0.534, 0.131))
      );
      c = mix(c, sep, u_sepia);
    }

    // 8. Optical Vignette
    if (u_vignette > 0.001) {
      float dist = distance(v_uv, vec2(0.5)) * 1.4142;
      float vig = smoothstep(0.42, 1.16, dist) * u_vignette;
      c *= (1.0 - clamp(vig, 0.0, 0.85));
    }

    c = clamp(c, 0.0, 1.0);
    vec3 finalColor = mix(gcamBase, c, clamp(u_intensity, 0.0, 1.0));
    gl_FragColor = vec4(finalColor, texel.a);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class WebGLFilterRenderer {
  public readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private posBuffer: WebGLBuffer | null = null;
  private locations: Record<string, WebGLUniformLocation | null> = {};
  private disposed = false;

  constructor(canvas?: HTMLCanvasElement, preserveDrawingBuffer = false) {
    this.canvas = canvas ?? document.createElement('canvas');
    const gl = this.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uniformNames = [
      'u_tex',
      'u_mirrorX',
      'u_cropRect',
      'u_intensity',
      'u_exposure',
      'u_contrast',
      'u_saturation',
      'u_temperature',
      'u_tint',
      'u_highlights',
      'u_shadows',
      'u_clarity',
      'u_fade',
      'u_mono',
      'u_monoWeights',
      'u_sepia',
      'u_shadowTint',
      'u_highlightTint',
      'u_vignette',
      'u_softGlow',
      'u_gcamStrength',
      'u_gcamAcutance',
      'u_texelSize',
    ];
    for (const name of uniformNames) {
      this.locations[name] = gl.getUniformLocation(program, name);
    }

    this.gl = gl;
    this.program = program;
    this.texture = texture;
    this.posBuffer = buffer;
  }

  public isReady(): boolean {
    return !this.disposed && Boolean(this.gl && this.program && this.texture);
  }

  public render(
    source: TexImageSource,
    width: number,
    height: number,
    grade: FilterGradeParams,
    intensityPercent: number,
    options?: WebGLRenderOptions
  ): boolean {
    if (this.disposed || !this.gl || !this.program || !this.texture) return false;
    const gl = this.gl;

    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
      return false;
    }

    const crop = options?.cropRect ?? [0, 0, 1, 1];
    const intensityNorm = Math.min(1, Math.max(0, intensityPercent / 100));

    gl.uniform1i(this.locations.u_tex, 0);
    gl.uniform1f(this.locations.u_mirrorX, options?.mirrorX ? 1.0 : 0.0);
    gl.uniform4f(this.locations.u_cropRect, crop[0], crop[1], crop[2], crop[3]);
    gl.uniform1f(this.locations.u_intensity, intensityNorm);
    gl.uniform1f(this.locations.u_exposure, grade.exposure);
    gl.uniform1f(this.locations.u_contrast, grade.contrast);
    gl.uniform1f(this.locations.u_saturation, grade.saturation);
    gl.uniform1f(this.locations.u_temperature, grade.temperature);
    gl.uniform1f(this.locations.u_tint, grade.tint);
    gl.uniform1f(this.locations.u_highlights, grade.highlights);
    gl.uniform1f(this.locations.u_shadows, grade.shadows);
    gl.uniform1f(this.locations.u_clarity, grade.clarity);
    gl.uniform1f(this.locations.u_fade, grade.fade);
    gl.uniform1f(this.locations.u_mono, grade.mono);
    gl.uniform3f(
      this.locations.u_monoWeights,
      grade.monoWeights[0],
      grade.monoWeights[1],
      grade.monoWeights[2]
    );
    gl.uniform1f(this.locations.u_sepia, grade.sepia);
    gl.uniform3f(
      this.locations.u_shadowTint,
      grade.shadowTint[0],
      grade.shadowTint[1],
      grade.shadowTint[2]
    );
    gl.uniform3f(
      this.locations.u_highlightTint,
      grade.highlightTint[0],
      grade.highlightTint[1],
      grade.highlightTint[2]
    );
    gl.uniform1f(this.locations.u_vignette, grade.vignette);
    gl.uniform1f(this.locations.u_softGlow, grade.softGlow);
    gl.uniform1f(this.locations.u_gcamStrength, options?.gcamStrength ?? 0.0);
    gl.uniform1f(this.locations.u_gcamAcutance, options?.gcamAcutance ?? 0.0);
    gl.uniform2f(this.locations.u_texelSize, 1.0 / w, 1.0 / h);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  public dispose(releaseContext = true): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    if (gl) {
      if (this.texture) gl.deleteTexture(this.texture);
      if (this.posBuffer) gl.deleteBuffer(this.posBuffer);
      if (this.program) gl.deleteProgram(this.program);
      if (releaseContext) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.posBuffer = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

let sharedRenderer: WebGLFilterRenderer | null = null;

function getSharedOffscreenRenderer(): WebGLFilterRenderer | null {
  if (typeof document === 'undefined') return null;
  if (!sharedRenderer) {
    sharedRenderer = new WebGLFilterRenderer(undefined, true);
  }
  return sharedRenderer.isReady() ? sharedRenderer : null;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Software CPU fallback matching the exact GLSL shader math for environments without WebGL.
 */
function applyFilterCpuFallback(
  canvas: HTMLCanvasElement,
  grade: FilterGradeParams,
  intensityPercent: number
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const intensity = Math.min(1, Math.max(0, intensityPercent / 100));
  if (intensity <= 0.001) return;

  const inv255 = 1 / 255;
  const cx = w / 2;
  const cy = h / 2;
  const maxHalf = Math.max(1, Math.hypot(cx, cy));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const origR = d[idx] * inv255;
      const origG = d[idx + 1] * inv255;
      const origB = d[idx + 2] * inv255;

      let r = origR;
      let g = origG;
      let b = origB;

      if (Math.abs(grade.exposure) > 0.001) {
        const gain = 1 + grade.exposure * 0.36;
        const offset = grade.exposure * 0.12;
        r = r * gain + offset;
        g = g * gain + offset;
        b = b * gain + offset;
      }

      r += grade.temperature * 0.24 + grade.tint * 0.09;
      g -= grade.tint * 0.2;
      b -= grade.temperature * 0.24 - grade.tint * 0.09;

      const cR = Math.max(0, Math.min(1, r));
      const cG = Math.max(0, Math.min(1, g));
      const cB = Math.max(0, Math.min(1, b));
      const luma = 0.2126 * cR + 0.7152 * cG + 0.0722 * cB;
      const shMask = 1 - smoothstepJS(0.05, 0.55, luma);
      const hiMask = smoothstepJS(0.45, 0.95, luma);

      const toneDelta = grade.shadows * shMask * 0.36 + grade.highlights * hiMask * 0.32;
      r += toneDelta + grade.shadowTint[0] * shMask + grade.highlightTint[0] * hiMask;
      g += toneDelta + grade.shadowTint[1] * shMask + grade.highlightTint[1] * hiMask;
      b += toneDelta + grade.shadowTint[2] * shMask + grade.highlightTint[2] * hiMask;

      if (grade.softGlow > 0.001) {
        const skinLift = smoothstepJS(0.2, 0.85, luma) * grade.softGlow * 0.14;
        r += skinLift;
        g += skinLift;
        b += skinLift;
      }

      if (Math.abs(grade.clarity) > 0.001) {
        const midMask = 1 - Math.abs(luma - 0.5) * 2;
        const cl = 1 + grade.clarity * 0.35 * midMask;
        r = (r - 0.5) * cl + 0.5;
        g = (g - 0.5) * cl + 0.5;
        b = (b - 0.5) * cl + 0.5;
      }

      r = (r - 0.5) * grade.contrast + 0.5;
      g = (g - 0.5) * grade.contrast + 0.5;
      b = (b - 0.5) * grade.contrast + 0.5;

      if (grade.fade > 0.001) {
        const s = 1 - grade.fade * 0.55;
        r = r * s + grade.fade;
        g = g * s + grade.fade;
        b = b * s + grade.fade;
      }

      const lum2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum2 + (r - lum2) * grade.saturation;
      g = lum2 + (g - lum2) * grade.saturation;
      b = lum2 + (b - lum2) * grade.saturation;

      if (grade.mono > 0.001) {
        const m =
          r * grade.monoWeights[0] + g * grade.monoWeights[1] + b * grade.monoWeights[2];
        r = r + (m - r) * grade.mono;
        g = g + (m - g) * grade.mono;
        b = b + (m - b) * grade.mono;
      }

      if (grade.sepia > 0.001) {
        const sr = r * 0.393 + g * 0.769 + b * 0.189;
        const sg = r * 0.349 + g * 0.686 + b * 0.168;
        const sb = r * 0.272 + g * 0.534 + b * 0.131;
        r = r + (sr - r) * grade.sepia;
        g = g + (sg - g) * grade.sepia;
        b = b + (sb - b) * grade.sepia;
      }

      if (grade.vignette > 0.001) {
        const dist = (Math.hypot(x - cx, y - cy) / maxHalf) * 1.4142;
        const vig = smoothstepJS(0.42, 1.16, dist) * grade.vignette;
        const factor = 1 - Math.min(0.85, Math.max(0, vig));
        r *= factor;
        g *= factor;
        b *= factor;
      }

      r = Math.max(0, Math.min(1, r));
      g = Math.max(0, Math.min(1, g));
      b = Math.max(0, Math.min(1, b));

      d[idx] = clampByte((origR + (r - origR) * intensity) * 255);
      d[idx + 1] = clampByte((origG + (g - origG) * intensity) * 255);
      d[idx + 2] = clampByte((origB + (b - origB) * intensity) * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Applies a color filter in-place onto a target 2D Canvas via the GPU WebGL pipeline
 * (falling back transparently to the exact-parity CPU shader if WebGL is unavailable).
 */
export function applyFilterToCanvas(
  canvas: HTMLCanvasElement,
  filterId: FilterId,
  intensityPercent: number
): void {
  if (filterId === 'original' || intensityPercent <= 0) return;
  const def = getFilterById(filterId);
  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return;

  const renderer = getSharedOffscreenRenderer();
  if (renderer && renderer.render(canvas, w, h, def.grade, intensityPercent)) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(renderer.canvas, 0, 0, w, h);
      ctx.restore();
      return;
    }
  }

  applyFilterCpuFallback(canvas, def.grade, intensityPercent);
}

/**
 * Generates a small photographic sample canvas when live camera preview hasn't emitted a frame yet.
 */
export function createFilterSampleSourceCanvas(width = 112, height = 84): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  // Sunset / cyan / skin-tone gradient sky & landscape blocks for clear color preview
  const sky = ctx.createLinearGradient(0, 0, width, height * 0.68);
  sky.addColorStop(0, '#1e3a5f');
  sky.addColorStop(0.55, '#4b79a1');
  sky.addColorStop(1, '#e89b6c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Warm sun highlight orb
  const sun = ctx.createRadialGradient(width * 0.72, height * 0.34, 2, width * 0.72, height * 0.34, width * 0.32);
  sun.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
  sun.addColorStop(0.45, 'rgba(245, 173, 94, 0.45)');
  sun.addColorStop(1, 'rgba(245, 173, 94, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, height);

  // Silhouette hill + emerald foliage
  ctx.fillStyle = '#183a2d';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.7);
  ctx.quadraticCurveTo(width * 0.35, height * 0.5, width * 0.7, height * 0.68);
  ctx.lineTo(width, height * 0.62);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Skin-tone / architecture accent patch for portrait/color visibility
  ctx.fillStyle = '#d99e7e';
  ctx.beginPath();
  ctx.arc(width * 0.28, height * 0.62, width * 0.11, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

/**
 * Renders preview thumbnail data URLs for any list of filter IDs using the single shared GPU renderer.
 */
export function renderFilterThumbnailUrls(
  source: TexImageSource,
  sourceWidth: number,
  sourceHeight: number,
  filterIds: FilterId[],
  thumbWidth = 96,
  thumbHeight = 72
): Partial<Record<FilterId, string>> {
  const result: Partial<Record<FilterId, string>> = {};
  if (typeof document === 'undefined' || sourceWidth <= 0 || sourceHeight <= 0) return result;

  // Center-crop source into a single small temp canvas first so every thumbnail reuses fast GPU upload
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = thumbWidth;
  baseCanvas.height = thumbHeight;
  const bCtx = baseCanvas.getContext('2d');
  if (!bCtx) return result;

  const targetRatio = thumbWidth / thumbHeight;
  const srcRatio = sourceWidth / sourceHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (srcRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  try {
    bCtx.drawImage(source as CanvasImageSource, sx, sy, sw, sh, 0, 0, thumbWidth, thumbHeight);
  } catch {
    baseCanvas.width = 0;
    baseCanvas.height = 0;
    return result;
  }

  const renderer = getSharedOffscreenRenderer();
  const temp2d = document.createElement('canvas');
  temp2d.width = thumbWidth;
  temp2d.height = thumbHeight;
  const tCtx = temp2d.getContext('2d', { willReadFrequently: true });

  for (const id of filterIds) {
    const def = getFilterById(id);
    if (id === 'original') {
      result[id] = baseCanvas.toDataURL('image/jpeg', 0.8);
      continue;
    }
    if (renderer && renderer.render(baseCanvas, thumbWidth, thumbHeight, def.grade, 100)) {
      result[id] = renderer.canvas.toDataURL('image/jpeg', 0.8);
    } else if (tCtx) {
      tCtx.clearRect(0, 0, thumbWidth, thumbHeight);
      tCtx.drawImage(baseCanvas, 0, 0);
      applyFilterCpuFallback(temp2d, def.grade, 100);
      result[id] = temp2d.toDataURL('image/jpeg', 0.8);
    }
  }

  baseCanvas.width = 0;
  baseCanvas.height = 0;
  temp2d.width = 0;
  temp2d.height = 0;
  return result;
}
