import {
  CapturedPhotoInfo,
  CropAspectPreset,
  NormalizedCropRect,
  PhotoEditParams,
} from '../types/camera';
import { getFilterById } from '../types/filters';
import { processGCamProMaxCanvas } from './gcamProMaxEngine';
import { applyFilterToCanvas } from './webglFilterPipeline';

export const DEFAULT_CROP_RECT: NormalizedCropRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const DEFAULT_PHOTO_EDIT_PARAMS: PhotoEditParams = {
  rotationQuarterTurns: 0,
  straightenDeg: 0,
  cropAspect: 'ORIGINAL',
  crop: { ...DEFAULT_CROP_RECT },
  filterId: 'original',
  filterIntensity: 85,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  temperature: 0,
  tint: 0,
  vignette: 0,
  hdrPlusEnabled: false,
};

export function cloneEditParams(params: PhotoEditParams): PhotoEditParams {
  return {
    ...params,
    crop: { ...params.crop },
  };
}

export function areEditParamsEqual(a: PhotoEditParams, b: PhotoEditParams): boolean {
  const aFilter = a.filterIntensity <= 0 ? 'original' : a.filterId;
  const bFilter = b.filterIntensity <= 0 ? 'original' : b.filterId;
  const aFilterInt = aFilter === 'original' ? 0 : a.filterIntensity;
  const bFilterInt = bFilter === 'original' ? 0 : b.filterIntensity;
  return (
    a.rotationQuarterTurns === b.rotationQuarterTurns &&
    a.straightenDeg === b.straightenDeg &&
    a.cropAspect === b.cropAspect &&
    Math.abs(a.crop.x - b.crop.x) < 0.001 &&
    Math.abs(a.crop.y - b.crop.y) < 0.001 &&
    Math.abs(a.crop.width - b.crop.width) < 0.001 &&
    Math.abs(a.crop.height - b.crop.height) < 0.001 &&
    aFilter === bFilter &&
    aFilterInt === bFilterInt &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturation === b.saturation &&
    a.highlights === b.highlights &&
    a.shadows === b.shadows &&
    a.sharpness === b.sharpness &&
    a.temperature === b.temperature &&
    a.tint === b.tint &&
    a.vignette === b.vignette &&
    Boolean(a.hdrPlusEnabled) === Boolean(b.hdrPlusEnabled)
  );
}

export function hasAnyEdits(params: PhotoEditParams): boolean {
  return !areEditParamsEqual(params, DEFAULT_PHOTO_EDIT_PARAMS);
}

export function buildEditSummary(params: PhotoEditParams): string {
  const parts: string[] = [];
  if (params.filterId !== 'original' && params.filterIntensity > 0) {
    const f = getFilterById(params.filterId);
    parts.push(`${f.name} (${params.filterIntensity}%)`);
  }
  if (params.rotationQuarterTurns % 4 !== 0) {
    parts.push(`Rotate ${params.rotationQuarterTurns * 90}°`);
  }
  if (Math.abs(params.straightenDeg) >= 0.5) {
    parts.push(`Straighten ${params.straightenDeg > 0 ? '+' : ''}${params.straightenDeg.toFixed(1)}°`);
  }
  if (
    params.crop.width < 0.99 ||
    params.crop.height < 0.99 ||
    params.crop.x > 0.01 ||
    params.crop.y > 0.01
  ) {
    parts.push(params.cropAspect !== 'FREE' && params.cropAspect !== 'ORIGINAL' ? `Crop ${params.cropAspect}` : 'Cropped');
  }
  if (params.brightness !== 0) parts.push(`Brightness ${params.brightness > 0 ? '+' : ''}${params.brightness}`);
  if (params.contrast !== 0) parts.push(`Contrast ${params.contrast > 0 ? '+' : ''}${params.contrast}`);
  if (params.saturation !== 0) parts.push(`Saturation ${params.saturation > 0 ? '+' : ''}${params.saturation}`);
  if (params.highlights !== 0) parts.push(`Highlights ${params.highlights > 0 ? '+' : ''}${params.highlights}`);
  if (params.shadows !== 0) parts.push(`Shadows ${params.shadows > 0 ? '+' : ''}${params.shadows}`);
  if (params.sharpness !== 0) parts.push(`Sharpness +${params.sharpness}`);
  if (params.temperature !== 0) parts.push(`Temp ${params.temperature > 0 ? '+' : ''}${params.temperature}`);
  if (params.tint !== 0) parts.push(`Tint ${params.tint > 0 ? '+' : ''}${params.tint}`);
  if (params.hdrPlusEnabled) {
    parts.unshift('GCam HDR+');
  }
  if (params.vignette !== 0) parts.push(`Vignette ${params.vignette > 0 ? '+' : ''}${params.vignette}`);
  return parts.length > 0 ? parts.slice(0, 4).join(' · ') + (parts.length > 4 ? ` (+${parts.length - 4})` : '') : 'Edited copy';
}

export function getAspectPresetRatio(
  preset: CropAspectPreset,
  orientedWidth: number,
  orientedHeight: number
): number | null {
  switch (preset) {
    case 'ORIGINAL':
      return orientedWidth / Math.max(1, orientedHeight);
    case 'FREE':
      return null;
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    case '3:2':
      return 3 / 2;
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
  }
}

export function fitCropRectToAspect(
  preset: CropAspectPreset,
  orientedWidth: number,
  orientedHeight: number
): NormalizedCropRect {
  const targetRatio = getAspectPresetRatio(preset, orientedWidth, orientedHeight);
  if (!targetRatio || preset === 'ORIGINAL') {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const baseRatio = orientedWidth / Math.max(1, orientedHeight);
  let width = 1;
  let height = 1;
  if (targetRatio > baseRatio) {
    // Target is wider than base image -> shrink height
    height = baseRatio / targetRatio;
  } else {
    // Target is taller than base image -> shrink width
    width = targetRatio / baseRatio;
  }
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

export function getOrientedDimensions(
  srcWidth: number,
  srcHeight: number,
  rotationQuarterTurns: number
): { width: number; height: number } {
  const turns = ((rotationQuarterTurns % 4) + 4) % 4;
  if (turns === 1 || turns === 3) {
    return { width: srcHeight, height: srcWidth };
  }
  return { width: srcWidth, height: srcHeight };
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for editing'));
    img.src = src;
  });
}

/**
 * Renders an image with rotation + straighten (auto-scaled so corners stay edge-to-edge without black triangles)
 * and optional normalized crop onto a Canvas.
 */
export function renderGeometryCanvas(
  img: HTMLImageElement,
  params: PhotoEditParams,
  options: { maxSide?: number; applyCrop: boolean }
): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const turns = ((params.rotationQuarterTurns % 4) + 4) % 4;
  const oriented = getOrientedDimensions(srcW, srcH, turns);

  const crop = options.applyCrop ? params.crop : DEFAULT_CROP_RECT;
  const cropW = Math.max(16, Math.round(oriented.width * crop.width));
  const cropH = Math.max(16, Math.round(oriented.height * crop.height));

  let scale = 1;
  if (options.maxSide && Math.max(cropW, cropH) > options.maxSide) {
    scale = options.maxSide / Math.max(cropW, cropH);
  }

  const outW = Math.max(16, Math.round(cropW * scale));
  const outH = Math.max(16, Math.round(cropH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const fullW = oriented.width * scale;
  const fullH = oriented.height * scale;
  const offsetX = crop.x * fullW;
  const offsetY = crop.y * fullH;

  const totalAngleRad = (turns * Math.PI) / 2 + (params.straightenDeg * Math.PI) / 180;
  const straightenRad = Math.abs((params.straightenDeg * Math.PI) / 180);

  // Inscribed zoom multiplier so straightening never reveals empty corners
  const cosS = Math.cos(straightenRad);
  const sinS = Math.sin(straightenRad);
  const coverZoom =
    straightenRad > 0.0005
      ? Math.max(
          (oriented.width * cosS + oriented.height * sinS) / oriented.width,
          (oriented.width * sinS + oriented.height * cosS) / oriented.height
        )
      : 1;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Translate to center of full oriented frame relative to cropped viewport
  ctx.translate(fullW / 2 - offsetX, fullH / 2 - offsetY);
  ctx.rotate(totalAngleRad);
  ctx.scale(scale * coverZoom, scale * coverZoom);
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
  ctx.restore();

  return canvas;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Applies pixel-accurate non-destructive tonal, color, highlight/shadow recovery, and sharpness adjustments.
 */
export function applyPixelAdjustments(
  canvas: HTMLCanvasElement,
  params: PhotoEditParams
): void {
  const hasColorOrTone =
    params.brightness !== 0 ||
    params.contrast !== 0 ||
    params.saturation !== 0 ||
    params.highlights !== 0 ||
    params.shadows !== 0 ||
    params.temperature !== 0 ||
    params.tint !== 0 ||
    params.sharpness > 0;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  if (hasColorOrTone) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Precompute parameters
    const brightOffset = (params.brightness / 100) * 68;
    const brightGain = 1 + (params.brightness / 100) * 0.28;

    const cVal = params.contrast * 1.15; // [-115..115]
    const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

    const satFactor = 1 + params.saturation / 100;
    const tempShift = (params.temperature / 100) * 34;
    const tintShift = (params.tint / 100) * 28;
    const hiAmount = (params.highlights / 100) * 72;
    const shAmount = (params.shadows / 100) * 76;

    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. White balance: Temperature (warm R+/B-) & Tint (magenta R+B+/G-)
      if (tempShift !== 0) {
        r += tempShift;
        b -= tempShift;
      }
      if (tintShift !== 0) {
        g -= tintShift;
        r += tintShift * 0.45;
        b += tintShift * 0.45;
      }

      // 2. Brightness
      if (params.brightness !== 0) {
        r = r * brightGain + brightOffset;
        g = g * brightGain + brightOffset;
        b = b * brightGain + brightOffset;
      }

      // 3. Selective Highlights & Shadows recovery
      if (hiAmount !== 0 || shAmount !== 0) {
        const lumaNorm = Math.max(0, Math.min(1, (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255));
        let tonalDelta = 0;
        if (hiAmount !== 0) {
          tonalDelta += smoothstep(0.45, 0.96, lumaNorm) * hiAmount;
        }
        if (shAmount !== 0) {
          tonalDelta += (1 - smoothstep(0.04, 0.56, lumaNorm)) * shAmount;
        }
        r += tonalDelta;
        g += tonalDelta;
        b += tonalDelta;
      }

      // 4. Contrast around midtone 128
      if (params.contrast !== 0) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }

      // 5. Saturation (luminance-preserving)
      if (params.saturation !== 0) {
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = luma + (r - luma) * satFactor;
        g = luma + (g - luma) * satFactor;
        b = luma + (b - luma) * satFactor;
      }

      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
    }

    // 6. 3x3 Unsharp Mask Convolution Sharpness
    if (params.sharpness > 0 && w >= 3 && h >= 3) {
      const srcCopy = new Uint8ClampedArray(data);
      const k = (params.sharpness / 100) * 0.75;
      const centerWeight = 1 + 4 * k;
      const stride = w * 4;

      for (let y = 1; y < h - 1; y++) {
        const rowOff = y * stride;
        for (let x = 1; x < w - 1; x++) {
          const idx = rowOff + x * 4;
          const up = idx - stride;
          const down = idx + stride;
          const left = idx - 4;
          const right = idx + 4;

          data[idx] = clampByte(
            srcCopy[idx] * centerWeight -
              k * (srcCopy[up] + srcCopy[down] + srcCopy[left] + srcCopy[right])
          );
          data[idx + 1] = clampByte(
            srcCopy[idx + 1] * centerWeight -
              k * (srcCopy[up + 1] + srcCopy[down + 1] + srcCopy[left + 1] + srcCopy[right + 1])
          );
          data[idx + 2] = clampByte(
            srcCopy[idx + 2] * centerWeight -
              k * (srcCopy[up + 2] + srcCopy[down + 2] + srcCopy[left + 2] + srcCopy[right + 2])
          );
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // 7. Optical Vignette Overlay
  if (params.vignette !== 0) {
    const cx = w / 2;
    const cy = h / 2;
    const innerR = Math.min(w, h) * 0.28;
    const outerR = Math.hypot(cx, cy) * 1.02;
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    const strength = Math.min(0.85, Math.abs(params.vignette) / 100 * 0.82);
    const color = params.vignette > 0 ? '0, 0, 0' : '255, 255, 255';
    grad.addColorStop(0, `rgba(${color}, 0)`);
    grad.addColorStop(0.55, `rgba(${color}, ${(strength * 0.22).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${color}, ${strength.toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export function renderEditedPhotoToCanvas(
  img: HTMLImageElement,
  params: PhotoEditParams,
  options: { maxSide?: number; applyCrop: boolean; skipAdjustments?: boolean }
): HTMLCanvasElement {
  const canvas = renderGeometryCanvas(img, params, {
    maxSide: options.maxSide,
    applyCrop: options.applyCrop,
  });
  if (!options.skipAdjustments) {
    if (params.hdrPlusEnabled) {
      processGCamProMaxCanvas(canvas, [], {
        engine: {
          hdrPlusMode: 'HDR_PLUS_ENHANCED',
          topShotSelection: true,
          sabreSuperRes: true,
          pixelAwbEnabled: true,
          chromaDenoiseEnabled: true,
          f17PortraitDepth: false,
        },
        photographyMode: 'HDR',
        isAutoWhiteBalance: true,
      });
    }
    if (params.filterId !== 'original' && params.filterIntensity > 0) {
      applyFilterToCanvas(canvas, params.filterId, params.filterIntensity);
    }
    applyPixelAdjustments(canvas, params);
  }
  return canvas;
}

export async function exportFullResEditedPhoto(
  sourcePhoto: CapturedPhotoInfo,
  params: PhotoEditParams,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<{ blob: Blob; width: number; height: number; mimeType: string; fileName: string }> {
  let tempUrl: string | null = null;
  let src = sourcePhoto.url;
  if (sourcePhoto.blob) {
    tempUrl = URL.createObjectURL(sourcePhoto.blob);
    src = tempUrl;
  }

  try {
    const img = await loadImageElement(src);
    const fullCanvas = renderEditedPhotoToCanvas(img, params, {
      applyCrop: true,
      skipAdjustments: false,
    });

    try {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'png' ? 1.0 : 0.98;

      const blob = await new Promise<Blob>((resolve, reject) => {
        fullCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode edited photo'))),
          mimeType,
          quality
        );
      });

      const baseName = sourcePhoto.displayName.replace(/\.[^/.]+$/, '');
      const ext = format === 'png' ? 'png' : 'jpg';
      const fileName = `${baseName}_EDIT_${Date.now().toString().slice(-4)}.${ext}`;

      return {
        blob,
        width: fullCanvas.width,
        height: fullCanvas.height,
        mimeType,
        fileName,
      };
    } finally {
      fullCanvas.width = 0;
      fullCanvas.height = 0;
    }
  } finally {
    if (tempUrl) URL.revokeObjectURL(tempUrl);
  }
}
