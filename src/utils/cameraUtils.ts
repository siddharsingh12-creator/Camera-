import {
  DetectedSceneType,
  FrameAnalysisData,
  ProPreset,
  ResolutionSpec,
} from '../types/camera';

export function formatShutterSpeed(ns: number): string {
  if (ns <= 0) return '—';
  const seconds = ns / 1_000_000_000;
  if (seconds >= 0.45) {
    return `${seconds.toFixed(1)}s`;
  }
  const denom = Math.max(1, Math.round(1_000_000_000 / ns));
  return `1/${denom}s`;
}

export function formatDurationMs(durationMs: number): string {
  const totalSec = Math.max(0, Math.floor(durationMs / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1.0) return `${mb.toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function computeGcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

export function formatResolutionLabel(spec: ResolutionSpec): string {
  const mp = (spec.width * spec.height) / 1_000_000;
  const gcd = computeGcd(spec.width, spec.height);
  const w = spec.width / gcd;
  const h = spec.height / gcd;
  let ar = `${w}:${h}`;
  if ((w === 4 && h === 3) || (w === 3 && h === 4)) ar = '4:3';
  else if ((w === 16 && h === 9) || (w === 9 && h === 16)) ar = '16:9';
  else if ((w === 3 && h === 2) || (w === 2 && h === 3)) ar = '3:2';
  else if (w === 1 && h === 1) ar = '1:1';
  return `${spec.width}×${spec.height} (${mp.toFixed(1)} MP · ${ar})`;
}

// LocalStorage-backed Pro Presets Repository (mirrors ProPresetsRepository.kt)
const PRESETS_STORAGE_KEY = 'ultra_cam_pro_presets_v1';

export function loadSavedPresets(): ProPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is ProPreset =>
          Boolean(p) &&
          typeof p === 'object' &&
          typeof (p as ProPreset).id === 'string' &&
          typeof (p as ProPreset).name === 'string'
      )
      .slice(-12)
      .map((p) => ({
        ...p,
        name: p.name.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 48) || 'Custom Preset',
      }));
  } catch {
    return [];
  }
}

export function persistPresets(presets: ProPreset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.slice(-12)));
  } catch {
    // Ignore storage quota errors
  }
}

// Real-time RGB/Luma Histogram, Zebra Exposure & Sobel Focus Peaking Analyzer
export function analyzeImageData(
  imageData: ImageData,
  options: {
    isHistogramEnabled: boolean;
    isZebraEnabled: boolean;
    zebraThresholdPercent: number;
    isFocusPeakingEnabled: boolean;
    isAutoSceneEnabled: boolean;
  }
): { analysis: FrameAnalysisData; detectedScene: DetectedSceneType } {
  const { width, height, data } = imageData;
  const lumaRaw = new Int32Array(48);
  const rRaw = new Int32Array(48);
  const gRaw = new Int32Array(48);
  const bRaw = new Int32Array(48);

  const thresholdIre = Math.floor((Math.min(100, Math.max(75, options.zebraThresholdPercent)) * 255) / 100);
  const shadowThreshold = 8;

  const zebraHighlightPoints: number[] = [];
  const zebraShadowPoints: number[] = [];
  const focusPeakingPoints: number[] = [];

  const gridCols = 72;
  const gridRows = 54;
  const stepX = Math.max(2, Math.floor(width / gridCols));
  const stepY = Math.max(2, Math.floor(height / gridRows));

  let totalSamples = 0;
  let highlightClipped = 0;
  let shadowClipped = 0;
  let sumLuma = 0;
  let warmSampleCount = 0;
  let chromaSampleCount = 0;
  let sharpEdgeCount = 0;

  const getLuma = (px: number, py: number): number => {
    const idx = (py * width + px) * 4;
    return (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
  };

  for (let y = stepY; y < height - stepY; y += stepY) {
    for (let x = stepX; x < width - stepX; x += stepX) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luma = (r * 77 + g * 150 + b * 29) >> 8;

      totalSamples++;
      sumLuma += luma;

      if (luma >= thresholdIre) highlightClipped++;
      if (luma <= shadowThreshold) shadowClipped++;

      if (options.isHistogramEnabled || options.isAutoSceneEnabled) {
        if (options.isHistogramEnabled) {
          lumaRaw[Math.min(47, (luma * 47) >> 8)]++;
          rRaw[Math.min(47, (r * 47) >> 8)]++;
          gRaw[Math.min(47, (g * 47) >> 8)]++;
          bRaw[Math.min(47, (b * 47) >> 8)]++;
        }
        if (options.isAutoSceneEnabled) {
          chromaSampleCount++;
          if (r > g + 10 && r > b + 20) warmSampleCount++;
        }
      }

      if (options.isZebraEnabled) {
        if (luma >= thresholdIre && zebraHighlightPoints.length < 3200) {
          zebraHighlightPoints.push(x / width, y / height);
        } else if (luma <= shadowThreshold && zebraShadowPoints.length < 1600) {
          zebraShadowPoints.push(x / width, y / height);
        }
      }

      if ((options.isFocusPeakingEnabled || options.isAutoSceneEnabled) && focusPeakingPoints.length < 2400) {
        const xl = Math.max(0, x - 2);
        const xr = Math.min(width - 1, x + 2);
        const yu = Math.max(0, y - 2);
        const yd = Math.min(height - 1, y + 2);
        const gx = Math.abs(getLuma(xr, y) - getLuma(xl, y));
        const gy = Math.abs(getLuma(x, yd) - getLuma(x, yu));
        const grad = gx + gy;
        if (grad >= 44) {
          sharpEdgeCount++;
          if (options.isFocusPeakingEnabled) {
            focusPeakingPoints.push(x / width, y / height);
          }
        }
      }
    }
  }

  const normalize = (arr: Int32Array): number[] => {
    let peak = 1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > peak) peak = arr[i];
    }
    return Array.from(arr, (v) => Math.min(1, Math.max(0, v / peak)));
  };

  const hiPct = totalSamples > 0 ? (highlightClipped * 100) / totalSamples : 0;
  const shPct = totalSamples > 0 ? (shadowClipped * 100) / totalSamples : 0;
  const meanLuma = totalSamples > 0 ? Math.min(1, Math.max(0, sumLuma / (totalSamples * 255))) : 0.5;
  const isWarmScene = chromaSampleCount > 0 && warmSampleCount / chromaSampleCount > 0.24;

  let detectedScene: DetectedSceneType = 'Standard Scene';
  if (meanLuma < 0.25) {
    detectedScene = 'Low Light Scene';
  } else if (hiPct > 5 && shPct > 5) {
    detectedScene = 'High Contrast';
  } else if (isWarmScene && meanLuma > 0.35) {
    detectedScene = 'Portrait Subject';
  } else if (totalSamples > 0 && sharpEdgeCount / totalSamples > 0.28) {
    detectedScene = 'Close Focus';
  } else if (meanLuma > 0.58) {
    detectedScene = 'Landscape';
  }

  return {
    analysis: {
      lumaBins: normalize(lumaRaw),
      redBins: normalize(rRaw),
      greenBins: normalize(gRaw),
      blueBins: normalize(bRaw),
      highlightClippedPercent: hiPct,
      shadowClippedPercent: shPct,
      focusPeakingPoints,
      zebraHighlightPoints,
      zebraShadowPoints,
      meanLuma,
      highlightShare: hiPct / 100,
      shadowShare: shPct / 100,
      isWarmScene,
    },
    detectedScene,
  };
}
