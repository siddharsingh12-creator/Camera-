import desertSceneImg from '../assets/images/scene_rajasthan_desert_1795341374112.jpg';
import mountainsSceneImg from '../assets/images/scene_misty_mountains_1795341375645.jpg';
import citySceneImg from '../assets/images/scene_cinematic_city_1795341374883.jpg';
import oceanSceneImg from '../assets/images/scene_golden_ocean_1795341373287.jpg';
import forestSceneImg from '../assets/images/scene_sunlit_forest_1795341373963.jpg';
import templeSceneImg from '../assets/images/scene_heritage_temple_1795341373711.jpg';

export type DoubleExposureSceneId =
  | 'DESERT'
  | 'MOUNTAINS'
  | 'CITY'
  | 'OCEAN'
  | 'FOREST'
  | 'TEMPLE'
  | 'CUSTOM';

export type DoubleExposureBlendMode = 'SCREEN' | 'LIGHTEN' | 'OVERLAY';

export type DoubleExposureBlendStrength = 'SOFT' | 'MEDIUM' | 'STRONG';

export type DoubleExposureExportPreset = 'EDITORIAL_1080X1350' | 'UHD_4K';

export type DoubleExposureExportFormat = 'JPG_100' | 'JPG_PLUS_RAW';

export type DoubleExposureTimerOption = 0 | 3 | 10;

export interface DetectedFaceBox {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  confidence: number;
}

export interface DoubleExposureScenePreset {
  id: Exclude<DoubleExposureSceneId, 'CUSTOM'>;
  name: string;
  subtitle: string;
  imageUrl: string;
  recommendedBlend: DoubleExposureBlendMode;
  recommendedOpacity: number;
}

export const DOUBLE_EXPOSURE_SCENES: DoubleExposureScenePreset[] = [
  {
    id: 'DESERT',
    name: 'Desert',
    subtitle: 'Rajasthan Golden Sunset',
    imageUrl: desertSceneImg,
    recommendedBlend: 'SCREEN',
    recommendedOpacity: 45,
  },
  {
    id: 'MOUNTAINS',
    name: 'Mountains',
    subtitle: 'Himalayan Mist Peaks',
    imageUrl: mountainsSceneImg,
    recommendedBlend: 'SCREEN',
    recommendedOpacity: 48,
  },
  {
    id: 'CITY',
    name: 'City',
    subtitle: 'Golden Hour Skyline',
    imageUrl: citySceneImg,
    recommendedBlend: 'LIGHTEN',
    recommendedOpacity: 46,
  },
  {
    id: 'OCEAN',
    name: 'Ocean',
    subtitle: 'Coastal Sunset Cliffs',
    imageUrl: oceanSceneImg,
    recommendedBlend: 'SCREEN',
    recommendedOpacity: 45,
  },
  {
    id: 'FOREST',
    name: 'Forest',
    subtitle: 'Sunlit Ancient Pines',
    imageUrl: forestSceneImg,
    recommendedBlend: 'OVERLAY',
    recommendedOpacity: 44,
  },
  {
    id: 'TEMPLE',
    name: 'Temple',
    subtitle: 'Sandstone Heritage',
    imageUrl: templeSceneImg,
    recommendedBlend: 'SCREEN',
    recommendedOpacity: 45,
  },
];

export interface DoubleExposureParams {
  sceneId: DoubleExposureSceneId;
  blendMode: DoubleExposureBlendMode;
  blendStrength: DoubleExposureBlendStrength;
  opacity: number; // 0..100 (default 45)
  faceProtection: number; // 0..100 (default 92)
  fadeEdge: number; // 0..100 (default 58)
  highlights: number; // -100..+100 (default -30)
  shadows: number; // -100..+100 (default +20)
  contrast: number; // -100..+100 (default +8)
  clarity: number; // -100..+100 (default +15)
  dehaze: number; // 0..100 (default +10)
  saturation: number; // -100..+100 (default +6)
  temperature: number; // -100..+100 (default +6)
  vignette: number; // -100..+100 (default -15)
  offsetX: number; // -0.5..+0.5
  offsetY: number; // -0.5..+0.5
  zoom: number; // 0.6..2.4
  rotateDeg: number; // -180..+180
  exportPreset: DoubleExposureExportPreset;
  exportFormat: DoubleExposureExportFormat;
}

export const DEFAULT_DOUBLE_EXPOSURE_PARAMS: DoubleExposureParams = {
  sceneId: 'DESERT',
  blendMode: 'SCREEN',
  blendStrength: 'MEDIUM',
  opacity: 45,
  faceProtection: 92,
  fadeEdge: 58,
  highlights: -30,
  shadows: 20,
  contrast: 8,
  clarity: 15,
  dehaze: 10,
  saturation: 6,
  temperature: 6,
  vignette: -15,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.08,
  rotateDeg: 0,
  exportPreset: 'EDITORIAL_1080X1350',
  exportFormat: 'JPG_100',
};
