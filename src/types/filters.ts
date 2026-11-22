import { AppCaptureDomain, PhotographyMode } from './camera';

export type FilterCategoryId =
  | 'NATURAL'
  | 'CINEMATIC'
  | 'COLOR'
  | 'BLACK_WHITE'
  | 'VINTAGE'
  | 'PORTRAIT'
  | 'LOW_LIGHT';

export type FilterId =
  | 'original'
  | 'natural'
  | 'clear'
  | 'vivid'
  | 'soft_natural'
  | 'cinematic'
  | 'teal_orange'
  | 'film_look'
  | 'moody'
  | 'dramatic'
  | 'warm'
  | 'cool'
  | 'golden'
  | 'sunset'
  | 'pastel'
  | 'classic_bw'
  | 'high_contrast_mono'
  | 'soft_mono'
  | 'vintage'
  | 'retro'
  | 'sepia'
  | 'matte_film'
  | 'soft_portrait'
  | 'natural_skin_tone'
  | 'portrait_glow'
  | 'night_clear'
  | 'night_warm'
  | 'low_light_natural';

export interface FilterGradeParams {
  exposure: number; // -0.5 .. +0.5
  contrast: number; // 0.6 .. 1.6 (1.0 = neutral)
  saturation: number; // 0.0 .. 1.6 (1.0 = neutral)
  temperature: number; // -0.4 .. +0.4 (+ warm, - cool)
  tint: number; // -0.3 .. +0.3 (+ magenta, - green)
  highlights: number; // -0.5 .. +0.5
  shadows: number; // -0.5 .. +0.5
  clarity: number; // -0.3 .. +0.4
  fade: number; // 0.0 .. 0.16 (matte lifted black floor)
  mono: number; // 0.0 .. 1.0 (B&W mix)
  monoWeights: [number, number, number]; // RGB luminance weights
  sepia: number; // 0.0 .. 1.0
  shadowTint: [number, number, number]; // -0.25 .. +0.25 RGB tint in shadows
  highlightTint: [number, number, number]; // -0.25 .. +0.25 RGB tint in highlights
  vignette: number; // 0.0 .. 0.55
  softGlow: number; // 0.0 .. 0.35
}

export interface CameraFilterDefinition {
  id: FilterId;
  name: string;
  shortLabel: string;
  category: FilterCategoryId;
  description: string;
  recommendedModes: PhotographyMode[];
  supportsVideo: boolean;
  grade: FilterGradeParams;
}

export const FILTER_CATEGORIES: { id: FilterCategoryId; label: string }[] = [
  { id: 'NATURAL', label: 'Natural' },
  { id: 'CINEMATIC', label: 'Cinematic' },
  { id: 'COLOR', label: 'Color' },
  { id: 'BLACK_WHITE', label: 'Black & White' },
  { id: 'VINTAGE', label: 'Vintage' },
  { id: 'PORTRAIT', label: 'Portrait' },
  { id: 'LOW_LIGHT', label: 'Low Light' },
];

const BASE_GRADE: FilterGradeParams = {
  exposure: 0,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  clarity: 0,
  fade: 0,
  mono: 0,
  monoWeights: [0.299, 0.587, 0.114],
  sepia: 0,
  shadowTint: [0, 0, 0],
  highlightTint: [0, 0, 0],
  vignette: 0,
  softGlow: 0,
};

function g(partial: Partial<FilterGradeParams>): FilterGradeParams {
  return {
    ...BASE_GRADE,
    ...partial,
    monoWeights: partial.monoWeights ?? [...BASE_GRADE.monoWeights],
    shadowTint: partial.shadowTint ?? [...BASE_GRADE.shadowTint],
    highlightTint: partial.highlightTint ?? [...BASE_GRADE.highlightTint],
  };
}

export const CAMERA_FILTERS: CameraFilterDefinition[] = [
  // NATURAL FILTERS (1-5)
  {
    id: 'original',
    name: 'Original',
    shortLabel: 'ORIG',
    category: 'NATURAL',
    description: 'Unprocessed native sensor output with zero color grading',
    recommendedModes: ['STANDARD', 'HDR', 'NIGHT', 'PORTRAIT', 'MACRO', 'HIGH_RES', 'PANORAMA', 'LOW_LIGHT', 'AUTO_SCENE', 'NATURAL_COLOR'],
    supportsVideo: true,
    grade: g({}),
  },
  {
    id: 'natural',
    name: 'Natural',
    shortLabel: 'NAT',
    category: 'NATURAL',
    description: 'Balanced optical contrast with true-to-life natural color rendition',
    recommendedModes: ['STANDARD', 'NATURAL_COLOR', 'AUTO_SCENE', 'MACRO'],
    supportsVideo: true,
    grade: g({
      contrast: 1.05,
      saturation: 1.04,
      shadows: 0.05,
      highlights: -0.04,
      clarity: 0.06,
    }),
  },
  {
    id: 'clear',
    name: 'Clear',
    shortLabel: 'CLEAR',
    category: 'NATURAL',
    description: 'Crisp micro-contrast and clean neutral highlight separation',
    recommendedModes: ['STANDARD', 'HIGH_RES', 'MACRO', 'HDR'],
    supportsVideo: true,
    grade: g({
      exposure: 0.03,
      contrast: 1.11,
      saturation: 1.05,
      temperature: -0.04,
      shadows: 0.06,
      highlights: 0.04,
      clarity: 0.18,
    }),
  },
  {
    id: 'vivid',
    name: 'Vivid',
    shortLabel: 'VIVID',
    category: 'NATURAL',
    description: 'Vibrant chromatic saturation with deep sculpted blacks',
    recommendedModes: ['STANDARD', 'HDR', 'AUTO_SCENE'],
    supportsVideo: true,
    grade: g({
      contrast: 1.14,
      saturation: 1.32,
      shadows: -0.05,
      highlights: 0.05,
      clarity: 0.12,
    }),
  },
  {
    id: 'soft_natural',
    name: 'Soft Natural',
    shortLabel: 'SOFT N',
    category: 'NATURAL',
    description: 'Gentle highlight roll-off and smooth open shadow detail',
    recommendedModes: ['STANDARD', 'PORTRAIT', 'NATURAL_COLOR'],
    supportsVideo: true,
    grade: g({
      exposure: 0.04,
      contrast: 0.92,
      saturation: 0.96,
      shadows: 0.14,
      highlights: -0.1,
      softGlow: 0.08,
    }),
  },

  // CINEMATIC FILTERS (6-10)
  {
    id: 'cinematic',
    name: 'Cinematic',
    shortLabel: 'CINE',
    category: 'CINEMATIC',
    description: 'Anamorphic contrast curve with cool deep shadows and warm skin highlights',
    recommendedModes: ['STANDARD', 'HDR', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      contrast: 1.18,
      saturation: 0.94,
      shadows: -0.06,
      highlights: -0.08,
      fade: 0.03,
      shadowTint: [-0.04, 0.02, 0.07],
      highlightTint: [0.06, 0.02, -0.04],
      vignette: 0.18,
    }),
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    shortLabel: 'T & O',
    category: 'CINEMATIC',
    description: 'Hollywood blockbuster split tone balancing teal shadows and amber highlights',
    recommendedModes: ['STANDARD', 'PORTRAIT', 'NIGHT'],
    supportsVideo: true,
    grade: g({
      contrast: 1.16,
      saturation: 1.08,
      temperature: 0.06,
      clarity: 0.1,
      shadowTint: [-0.11, 0.04, 0.12],
      highlightTint: [0.13, 0.04, -0.11],
      vignette: 0.14,
    }),
  },
  {
    id: 'film_look',
    name: 'Film Look',
    shortLabel: 'FILM',
    category: 'CINEMATIC',
    description: '35mm motion picture print tone with subtle shadow fade and rich midtones',
    recommendedModes: ['STANDARD', 'NATURAL_COLOR', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      contrast: 1.08,
      saturation: 0.95,
      temperature: 0.05,
      tint: -0.02,
      fade: 0.055,
      highlights: -0.09,
      shadowTint: [0.0, 0.03, 0.02],
      highlightTint: [0.05, 0.03, -0.02],
      vignette: 0.15,
    }),
  },
  {
    id: 'moody',
    name: 'Moody',
    shortLabel: 'MOODY',
    category: 'CINEMATIC',
    description: 'Low-key atmospheric grade with subdued saturation and slate shadows',
    recommendedModes: ['STANDARD', 'NIGHT', 'LOW_LIGHT'],
    supportsVideo: true,
    grade: g({
      exposure: -0.08,
      contrast: 1.2,
      saturation: 0.72,
      temperature: -0.05,
      shadows: -0.12,
      fade: 0.035,
      shadowTint: [-0.03, 0.01, 0.05],
      vignette: 0.28,
    }),
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    shortLabel: 'DRAMA',
    category: 'CINEMATIC',
    description: 'High-impact dynamic contrast with deep blacks and crisp midtone punch',
    recommendedModes: ['STANDARD', 'HDR', 'MACRO'],
    supportsVideo: true,
    grade: g({
      contrast: 1.32,
      saturation: 0.88,
      shadows: -0.18,
      highlights: 0.1,
      clarity: 0.28,
      vignette: 0.24,
    }),
  },

  // COLOR FILTERS (11-15)
  {
    id: 'warm',
    name: 'Warm',
    shortLabel: 'WARM',
    category: 'COLOR',
    description: 'Balanced amber warmth ideal for daylight and indoor scenes',
    recommendedModes: ['STANDARD', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      temperature: 0.2,
      tint: 0.02,
      saturation: 1.08,
      contrast: 1.03,
    }),
  },
  {
    id: 'cool',
    name: 'Cool',
    shortLabel: 'COOL',
    category: 'COLOR',
    description: 'Crisp blue-tinted clarity for architecture, mist, and overcast light',
    recommendedModes: ['STANDARD', 'MACRO', 'NIGHT'],
    supportsVideo: true,
    grade: g({
      temperature: -0.22,
      tint: -0.02,
      saturation: 1.03,
      contrast: 1.06,
      clarity: 0.08,
    }),
  },
  {
    id: 'golden',
    name: 'Golden',
    shortLabel: 'GOLD',
    category: 'COLOR',
    description: 'Luminous golden-hour radiance across highlights and midtones',
    recommendedModes: ['STANDARD', 'PORTRAIT', 'HDR'],
    supportsVideo: true,
    grade: g({
      exposure: 0.05,
      temperature: 0.24,
      saturation: 1.14,
      shadows: 0.08,
      highlightTint: [0.12, 0.07, -0.08],
      softGlow: 0.1,
    }),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    shortLabel: 'SUNSET',
    category: 'COLOR',
    description: 'Rich coral-magenta and warm amber dusk palette',
    recommendedModes: ['STANDARD', 'HDR', 'PANORAMA'],
    supportsVideo: true,
    grade: g({
      contrast: 1.1,
      saturation: 1.18,
      temperature: 0.22,
      tint: 0.14,
      shadowTint: [0.04, -0.02, 0.06],
      highlightTint: [0.12, 0.03, -0.05],
    }),
  },
  {
    id: 'pastel',
    name: 'Pastel',
    shortLabel: 'PASTEL',
    category: 'COLOR',
    description: 'Airy lifted shadows, soft hues, and delicate luminous whites',
    recommendedModes: ['STANDARD', 'PORTRAIT', 'NATURAL_COLOR'],
    supportsVideo: true,
    grade: g({
      exposure: 0.08,
      contrast: 0.86,
      saturation: 0.82,
      shadows: 0.18,
      highlights: -0.06,
      fade: 0.04,
      tint: 0.04,
      softGlow: 0.12,
    }),
  },

  // BLACK AND WHITE (16-18)
  {
    id: 'classic_bw',
    name: 'Classic B&W',
    shortLabel: 'B&W',
    category: 'BLACK_WHITE',
    description: 'Balanced panchromatic monochrome preserving natural tonal steps',
    recommendedModes: ['STANDARD', 'PORTRAIT', 'HIGH_RES'],
    supportsVideo: true,
    grade: g({
      mono: 1,
      monoWeights: [0.299, 0.587, 0.114],
      contrast: 1.12,
      clarity: 0.1,
    }),
  },
  {
    id: 'high_contrast_mono',
    name: 'High Contrast Mono',
    shortLabel: 'HC MONO',
    category: 'BLACK_WHITE',
    description: 'Bold street-photography black and white with deep ink shadows',
    recommendedModes: ['STANDARD', 'MACRO', 'HDR'],
    supportsVideo: true,
    grade: g({
      mono: 1,
      monoWeights: [0.42, 0.46, 0.12],
      contrast: 1.42,
      shadows: -0.18,
      highlights: 0.12,
      clarity: 0.28,
      vignette: 0.16,
    }),
  },
  {
    id: 'soft_mono',
    name: 'Soft Mono',
    shortLabel: 'SF MONO',
    category: 'BLACK_WHITE',
    description: 'Gentle silver-gelatin tonal gradation with lifted matte blacks',
    recommendedModes: ['STANDARD', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      mono: 1,
      monoWeights: [0.26, 0.62, 0.12],
      contrast: 0.94,
      shadows: 0.12,
      fade: 0.075,
      softGlow: 0.1,
    }),
  },

  // VINTAGE FILTERS (19-22)
  {
    id: 'vintage',
    name: 'Vintage',
    shortLabel: 'VINTG',
    category: 'VINTAGE',
    description: 'Aged color print warmth with muted greens and mellow contrast',
    recommendedModes: ['STANDARD', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      contrast: 0.95,
      saturation: 0.82,
      temperature: 0.14,
      tint: 0.03,
      fade: 0.065,
      shadowTint: [0.05, 0.02, -0.02],
      highlightTint: [0.07, 0.05, -0.04],
      vignette: 0.24,
    }),
  },
  {
    id: 'retro',
    name: 'Retro',
    shortLabel: 'RETRO',
    category: 'VINTAGE',
    description: '70s cross-processed palette with emerald shadows and cream highlights',
    recommendedModes: ['STANDARD', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      contrast: 1.06,
      saturation: 0.9,
      temperature: 0.08,
      fade: 0.05,
      shadowTint: [-0.04, 0.05, 0.04],
      highlightTint: [0.09, 0.06, -0.06],
      vignette: 0.18,
    }),
  },
  {
    id: 'sepia',
    name: 'Sepia',
    shortLabel: 'SEPIA',
    category: 'VINTAGE',
    description: 'Traditional warm silver-brown darkroom archival tone',
    recommendedModes: ['STANDARD', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      sepia: 0.92,
      contrast: 1.08,
      fade: 0.03,
      vignette: 0.22,
    }),
  },
  {
    id: 'matte_film',
    name: 'Matte Film',
    shortLabel: 'MATTE',
    category: 'VINTAGE',
    description: 'Lifted shadow floor and restrained editorial color saturation',
    recommendedModes: ['STANDARD', 'NATURAL_COLOR', 'PORTRAIT'],
    supportsVideo: true,
    grade: g({
      contrast: 0.92,
      saturation: 0.86,
      fade: 0.11,
      highlights: -0.1,
      shadows: 0.1,
      shadowTint: [0.02, 0.02, 0.03],
    }),
  },

  // PORTRAIT FILTERS (23-25)
  {
    id: 'soft_portrait',
    name: 'Soft Portrait',
    shortLabel: 'SOFT P',
    category: 'PORTRAIT',
    description: 'Flattering highlight smoothing and gentle shadow lift for portraits',
    recommendedModes: ['PORTRAIT', 'STANDARD'],
    supportsVideo: true,
    grade: g({
      exposure: 0.04,
      contrast: 0.95,
      saturation: 0.98,
      temperature: 0.06,
      shadows: 0.12,
      highlights: -0.08,
      softGlow: 0.22,
    }),
  },
  {
    id: 'natural_skin_tone',
    name: 'Natural Skin Tone',
    shortLabel: 'SKIN',
    category: 'PORTRAIT',
    description: 'Calibrated midtone warmth preserving realistic skin complexion',
    recommendedModes: ['PORTRAIT', 'STANDARD', 'NATURAL_COLOR'],
    supportsVideo: true,
    grade: g({
      exposure: 0.03,
      contrast: 1.02,
      saturation: 0.96,
      temperature: 0.08,
      tint: 0.03,
      shadows: 0.08,
      highlights: -0.05,
      softGlow: 0.1,
    }),
  },
  {
    id: 'portrait_glow',
    name: 'Portrait Glow',
    shortLabel: 'GLOW',
    category: 'PORTRAIT',
    description: 'Radiant backlit portrait sheen with warm midtones and soft bloom',
    recommendedModes: ['PORTRAIT', 'STANDARD'],
    supportsVideo: true,
    grade: g({
      exposure: 0.07,
      contrast: 0.97,
      saturation: 1.05,
      temperature: 0.1,
      shadows: 0.14,
      highlightTint: [0.08, 0.04, -0.03],
      softGlow: 0.3,
    }),
  },

  // LOW LIGHT FILTERS (26-28)
  {
    id: 'night_clear',
    name: 'Night Clear',
    shortLabel: 'NGT CLR',
    category: 'LOW_LIGHT',
    description: 'Shadow exposure lift and crisp cool clarity for dark urban scenes',
    recommendedModes: ['NIGHT', 'LOW_LIGHT', 'STANDARD'],
    supportsVideo: true,
    grade: g({
      exposure: 0.16,
      contrast: 1.1,
      saturation: 1.02,
      temperature: -0.07,
      shadows: 0.28,
      highlights: -0.1,
      clarity: 0.14,
    }),
  },
  {
    id: 'night_warm',
    name: 'Night Warm',
    shortLabel: 'NGT WRM',
    category: 'LOW_LIGHT',
    description: 'Golden amber streetlamp balance with deep shadow recovery',
    recommendedModes: ['NIGHT', 'LOW_LIGHT', 'STANDARD'],
    supportsVideo: true,
    grade: g({
      exposure: 0.14,
      contrast: 1.08,
      saturation: 1.06,
      temperature: 0.15,
      shadows: 0.24,
      highlights: -0.08,
      shadowTint: [-0.02, 0.01, 0.04],
      highlightTint: [0.09, 0.04, -0.04],
    }),
  },
  {
    id: 'low_light_natural',
    name: 'Low Light Natural',
    shortLabel: 'LOW NAT',
    category: 'LOW_LIGHT',
    description: 'Noise-conscious shadow brightening that preserves night ambiance',
    recommendedModes: ['LOW_LIGHT', 'NIGHT', 'STANDARD'],
    supportsVideo: true,
    grade: g({
      exposure: 0.12,
      contrast: 1.02,
      saturation: 0.94,
      shadows: 0.22,
      highlights: -0.06,
    }),
  },
];

const VALID_FILTER_IDS = new Set<string>(CAMERA_FILTERS.map((f) => f.id));

export function getFilterById(id: FilterId | string | null | undefined): CameraFilterDefinition {
  if (id && VALID_FILTER_IDS.has(id)) {
    return CAMERA_FILTERS.find((f) => f.id === id) ?? CAMERA_FILTERS[0];
  }
  return CAMERA_FILTERS[0];
}

export function isFilterCompatibleWithContext(
  filter: CameraFilterDefinition,
  domain: AppCaptureDomain,
  _mode: PhotographyMode
): boolean {
  if (domain === 'VIDEO') return filter.supportsVideo;
  return true;
}

const FILTER_PREFS_STORAGE_KEY = 'ultra_cam_pro_filter_prefs_v1';

export interface PersistedFilterPreferences {
  favoriteFilterIds: FilterId[];
  lastFilterId: FilterId;
  lastIntensity: number;
  preserveOriginalOnFilteredCapture: boolean;
}

export function loadFilterPreferences(): PersistedFilterPreferences {
  try {
    const raw = localStorage.getItem(FILTER_PREFS_STORAGE_KEY);
    if (!raw) {
      return {
        favoriteFilterIds: ['natural', 'cinematic', 'teal_orange', 'classic_bw'],
        lastFilterId: 'original',
        lastIntensity: 85,
        preserveOriginalOnFilteredCapture: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedFilterPreferences>;
    const favorites = Array.isArray(parsed.favoriteFilterIds)
      ? parsed.favoriteFilterIds.filter((id): id is FilterId => typeof id === 'string' && VALID_FILTER_IDS.has(id))
      : [];
    const lastFilterId: FilterId =
      typeof parsed.lastFilterId === 'string' && VALID_FILTER_IDS.has(parsed.lastFilterId)
        ? (parsed.lastFilterId as FilterId)
        : 'original';
    const lastIntensity =
      typeof parsed.lastIntensity === 'number' && Number.isFinite(parsed.lastIntensity)
        ? Math.min(100, Math.max(0, Math.round(parsed.lastIntensity)))
        : 85;
    return {
      favoriteFilterIds: favorites,
      lastFilterId,
      lastIntensity,
      preserveOriginalOnFilteredCapture: Boolean(parsed.preserveOriginalOnFilteredCapture),
    };
  } catch {
    return {
      favoriteFilterIds: ['natural', 'cinematic', 'teal_orange', 'classic_bw'],
      lastFilterId: 'original',
      lastIntensity: 85,
      preserveOriginalOnFilteredCapture: false,
    };
  }
}

export function persistFilterPreferences(prefs: PersistedFilterPreferences): void {
  try {
    localStorage.setItem(FILTER_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}
