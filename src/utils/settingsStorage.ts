import {
  CameraUserPreferences,
  PhotographyMode,
  SaveImageQuality,
} from '../types/camera';

const SETTINGS_STORAGE_KEY = 'ultra_cam_pro_settings_v1';
const LAST_SESSION_KEY = 'ultra_cam_pro_last_session_v1';

export const DEFAULT_CAMERA_PREFERENCES: CameraUserPreferences = {
  saveImageQuality: 'MAXIMUM',
  defaultCameraLens: 'BACK',
  defaultCameraMode: 'STANDARD',
  gridStyle: 'THIRDS',
  gridOpacityPercent: 30,
  defaultTimer: 'OFF',
  timerAudioBeep: true,
  defaultFlash: 'OFF',
  frontScreenFlash: true,
  mirrorSelfie: true,
  volumeShutterAction: 'CAPTURE',
  defaultVideoQuality: 'FHD_1080P',
  defaultVideoFps: 30,
  audioRecordingPref: 'MICROPHONE',
  saveLocation: 'IN_APP_GALLERY',
  fileNamePrefix: 'UltraCam',
  gcamEngine: {
    hdrPlusMode: 'HDR_PLUS_ENHANCED',
    topShotSelection: true,
    sabreSuperRes: true,
    pixelAwbEnabled: true,
    chromaDenoiseEnabled: true,
    f17PortraitDepth: true,
  },
  uiCustomization: {
    showExposureMeterBar: true,
    showZoomSlider: true,
    showAspectRatioBar: true,
    showCaptureFeatureStrip: true,
    showTelemetryPill: true,
    cleanViewfinderMode: false,
    landscapeControlSide: 'RIGHT',
    hudAccentTheme: 'CYAN',
  },
  privacy: {
    stripMetadataOnSave: false,
    privateSessionMode: false,
    scopedPickerOnly: true,
  },
};

const VALID_IMAGE_QUALITIES = new Set<string>(['MAXIMUM', 'HIGH', 'STANDARD', 'PNG_LOSSLESS']);
const VALID_LENS_PREFS = new Set<string>(['BACK', 'FRONT', 'LAST_USED']);
const VALID_MODE_PREFS = new Set<string>(['STANDARD', 'HDR', 'NIGHT', 'PORTRAIT', 'VIDEO', 'PRO_MANUAL', 'LAST_USED']);
const VALID_GRID_STYLES = new Set<string>(['OFF', 'THIRDS', 'GOLDEN_RATIO', 'DIAGONAL', 'SQUARE']);
const VALID_TIMERS = new Set<string>(['OFF', 'SEC_3', 'SEC_5', 'SEC_10']);
const VALID_FLASH = new Set<string>(['OFF', 'AUTO', 'ON']);
const VALID_VOLUME_ACTIONS = new Set<string>(['CAPTURE', 'ZOOM', 'OFF']);
const VALID_VIDEO_QUALITIES = new Set<string>(['SD_480P', 'HD_720P', 'FHD_1080P', 'QHD_2K', 'UHD_4K']);
const VALID_VIDEO_FPS = new Set<number>([24, 30, 60, 120, 240]);
const VALID_AUDIO_PREFS = new Set<string>(['MICROPHONE', 'HIGH_QUALITY_STEREO', 'MUTE']);
const VALID_SAVE_LOCS = new Set<string>(['IN_APP_GALLERY', 'GALLERY_AND_DOWNLOAD']);
const VALID_RAIL_SIDES = new Set<string>(['RIGHT', 'LEFT']);
const VALID_ACCENT_THEMES = new Set<string>(['CYAN', 'AMBER', 'TITANIUM']);
const VALID_HDR_PLUS_MODES = new Set<string>(['OFF', 'HDR_PLUS_ZSL', 'HDR_PLUS_ENHANCED']);

export function sanitizeFileNamePrefix(raw: unknown): string {
  if (typeof raw !== 'string') return 'UltraCam';
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  return cleaned || 'UltraCam';
}

export function loadCameraPreferences(): CameraUserPreferences {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return cloneDefaultPreferences();
    const parsed = JSON.parse(raw) as Partial<CameraUserPreferences>;
    if (!parsed || typeof parsed !== 'object') return cloneDefaultPreferences();

    const parsedGcam: Partial<CameraUserPreferences['gcamEngine']> =
      parsed.gcamEngine && typeof parsed.gcamEngine === 'object' ? parsed.gcamEngine : {};
    const parsedUi: Partial<CameraUserPreferences['uiCustomization']> =
      parsed.uiCustomization && typeof parsed.uiCustomization === 'object'
        ? parsed.uiCustomization
        : {};
    const parsedPrivacy: Partial<CameraUserPreferences['privacy']> =
      parsed.privacy && typeof parsed.privacy === 'object' ? parsed.privacy : {};

    return {
      saveImageQuality: VALID_IMAGE_QUALITIES.has(String(parsed.saveImageQuality))
        ? (parsed.saveImageQuality as SaveImageQuality)
        : DEFAULT_CAMERA_PREFERENCES.saveImageQuality,
      defaultCameraLens: VALID_LENS_PREFS.has(String(parsed.defaultCameraLens))
        ? (parsed.defaultCameraLens as CameraUserPreferences['defaultCameraLens'])
        : DEFAULT_CAMERA_PREFERENCES.defaultCameraLens,
      defaultCameraMode: VALID_MODE_PREFS.has(String(parsed.defaultCameraMode))
        ? (parsed.defaultCameraMode as CameraUserPreferences['defaultCameraMode'])
        : DEFAULT_CAMERA_PREFERENCES.defaultCameraMode,
      gridStyle: VALID_GRID_STYLES.has(String(parsed.gridStyle))
        ? (parsed.gridStyle as CameraUserPreferences['gridStyle'])
        : DEFAULT_CAMERA_PREFERENCES.gridStyle,
      gridOpacityPercent:
        typeof parsed.gridOpacityPercent === 'number' && Number.isFinite(parsed.gridOpacityPercent)
          ? Math.min(80, Math.max(15, Math.round(parsed.gridOpacityPercent)))
          : DEFAULT_CAMERA_PREFERENCES.gridOpacityPercent,
      defaultTimer: VALID_TIMERS.has(String(parsed.defaultTimer))
        ? (parsed.defaultTimer as CameraUserPreferences['defaultTimer'])
        : DEFAULT_CAMERA_PREFERENCES.defaultTimer,
      timerAudioBeep:
        typeof parsed.timerAudioBeep === 'boolean'
          ? parsed.timerAudioBeep
          : DEFAULT_CAMERA_PREFERENCES.timerAudioBeep,
      defaultFlash: VALID_FLASH.has(String(parsed.defaultFlash))
        ? (parsed.defaultFlash as CameraUserPreferences['defaultFlash'])
        : DEFAULT_CAMERA_PREFERENCES.defaultFlash,
      frontScreenFlash:
        typeof parsed.frontScreenFlash === 'boolean'
          ? parsed.frontScreenFlash
          : DEFAULT_CAMERA_PREFERENCES.frontScreenFlash,
      mirrorSelfie:
        typeof parsed.mirrorSelfie === 'boolean'
          ? parsed.mirrorSelfie
          : DEFAULT_CAMERA_PREFERENCES.mirrorSelfie,
      volumeShutterAction: VALID_VOLUME_ACTIONS.has(String(parsed.volumeShutterAction))
        ? (parsed.volumeShutterAction as CameraUserPreferences['volumeShutterAction'])
        : DEFAULT_CAMERA_PREFERENCES.volumeShutterAction,
      defaultVideoQuality: VALID_VIDEO_QUALITIES.has(String(parsed.defaultVideoQuality))
        ? (parsed.defaultVideoQuality as CameraUserPreferences['defaultVideoQuality'])
        : DEFAULT_CAMERA_PREFERENCES.defaultVideoQuality,
      defaultVideoFps: VALID_VIDEO_FPS.has(Number(parsed.defaultVideoFps))
        ? (Number(parsed.defaultVideoFps) as CameraUserPreferences['defaultVideoFps'])
        : DEFAULT_CAMERA_PREFERENCES.defaultVideoFps,
      audioRecordingPref: VALID_AUDIO_PREFS.has(String(parsed.audioRecordingPref))
        ? (parsed.audioRecordingPref as CameraUserPreferences['audioRecordingPref'])
        : DEFAULT_CAMERA_PREFERENCES.audioRecordingPref,
      saveLocation: VALID_SAVE_LOCS.has(String(parsed.saveLocation))
        ? (parsed.saveLocation as CameraUserPreferences['saveLocation'])
        : DEFAULT_CAMERA_PREFERENCES.saveLocation,
      fileNamePrefix: sanitizeFileNamePrefix(parsed.fileNamePrefix),
      gcamEngine: {
        hdrPlusMode: VALID_HDR_PLUS_MODES.has(String(parsedGcam.hdrPlusMode))
          ? (parsedGcam.hdrPlusMode as CameraUserPreferences['gcamEngine']['hdrPlusMode'])
          : DEFAULT_CAMERA_PREFERENCES.gcamEngine.hdrPlusMode,
        topShotSelection:
          typeof parsedGcam.topShotSelection === 'boolean'
            ? parsedGcam.topShotSelection
            : DEFAULT_CAMERA_PREFERENCES.gcamEngine.topShotSelection,
        sabreSuperRes:
          typeof parsedGcam.sabreSuperRes === 'boolean'
            ? parsedGcam.sabreSuperRes
            : DEFAULT_CAMERA_PREFERENCES.gcamEngine.sabreSuperRes,
        pixelAwbEnabled:
          typeof parsedGcam.pixelAwbEnabled === 'boolean'
            ? parsedGcam.pixelAwbEnabled
            : DEFAULT_CAMERA_PREFERENCES.gcamEngine.pixelAwbEnabled,
        chromaDenoiseEnabled:
          typeof parsedGcam.chromaDenoiseEnabled === 'boolean'
            ? parsedGcam.chromaDenoiseEnabled
            : DEFAULT_CAMERA_PREFERENCES.gcamEngine.chromaDenoiseEnabled,
        f17PortraitDepth:
          typeof parsedGcam.f17PortraitDepth === 'boolean'
            ? parsedGcam.f17PortraitDepth
            : DEFAULT_CAMERA_PREFERENCES.gcamEngine.f17PortraitDepth,
      },
      uiCustomization: {
        showExposureMeterBar:
          typeof parsedUi.showExposureMeterBar === 'boolean'
            ? parsedUi.showExposureMeterBar
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.showExposureMeterBar,
        showZoomSlider:
          typeof parsedUi.showZoomSlider === 'boolean'
            ? parsedUi.showZoomSlider
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.showZoomSlider,
        showAspectRatioBar:
          typeof parsedUi.showAspectRatioBar === 'boolean'
            ? parsedUi.showAspectRatioBar
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.showAspectRatioBar,
        showCaptureFeatureStrip:
          typeof parsedUi.showCaptureFeatureStrip === 'boolean'
            ? parsedUi.showCaptureFeatureStrip
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.showCaptureFeatureStrip,
        showTelemetryPill:
          typeof parsedUi.showTelemetryPill === 'boolean'
            ? parsedUi.showTelemetryPill
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.showTelemetryPill,
        cleanViewfinderMode:
          typeof parsedUi.cleanViewfinderMode === 'boolean'
            ? parsedUi.cleanViewfinderMode
            : DEFAULT_CAMERA_PREFERENCES.uiCustomization.cleanViewfinderMode,
        landscapeControlSide: VALID_RAIL_SIDES.has(String(parsedUi.landscapeControlSide))
          ? (parsedUi.landscapeControlSide as 'RIGHT' | 'LEFT')
          : DEFAULT_CAMERA_PREFERENCES.uiCustomization.landscapeControlSide,
        hudAccentTheme: VALID_ACCENT_THEMES.has(String(parsedUi.hudAccentTheme))
          ? (parsedUi.hudAccentTheme as CameraUserPreferences['uiCustomization']['hudAccentTheme'])
          : DEFAULT_CAMERA_PREFERENCES.uiCustomization.hudAccentTheme,
      },
      privacy: {
        stripMetadataOnSave:
          typeof parsedPrivacy.stripMetadataOnSave === 'boolean'
            ? parsedPrivacy.stripMetadataOnSave
            : DEFAULT_CAMERA_PREFERENCES.privacy.stripMetadataOnSave,
        privateSessionMode:
          typeof parsedPrivacy.privateSessionMode === 'boolean'
            ? parsedPrivacy.privateSessionMode
            : DEFAULT_CAMERA_PREFERENCES.privacy.privateSessionMode,
        scopedPickerOnly:
          typeof parsedPrivacy.scopedPickerOnly === 'boolean'
            ? parsedPrivacy.scopedPickerOnly
            : DEFAULT_CAMERA_PREFERENCES.privacy.scopedPickerOnly,
      },
    };
  } catch {
    return cloneDefaultPreferences();
  }
}

export function cloneDefaultPreferences(): CameraUserPreferences {
  return {
    ...DEFAULT_CAMERA_PREFERENCES,
    gcamEngine: { ...DEFAULT_CAMERA_PREFERENCES.gcamEngine },
    uiCustomization: { ...DEFAULT_CAMERA_PREFERENCES.uiCustomization },
    privacy: { ...DEFAULT_CAMERA_PREFERENCES.privacy },
  };
}

export function persistCameraPreferences(prefs: CameraUserPreferences): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCameraPreferences(): CameraUserPreferences {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LAST_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
  return cloneDefaultPreferences();
}

export interface LastUsedCameraState {
  lens: 'BACK' | 'FRONT';
  domain: 'PHOTO' | 'VIDEO';
  photographyMode: PhotographyMode;
}

export function loadLastSessionState(): LastUsedCameraState | null {
  try {
    const raw = localStorage.getItem(LAST_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastUsedCameraState;
  } catch {
    return null;
  }
}

export function saveLastSessionState(state: LastUsedCameraState): void {
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function getImageEncodingConfig(
  qualitySetting: SaveImageQuality,
  isQuickCapture: boolean
): { mimeType: string; quality: number; ext: string } {
  if (qualitySetting === 'PNG_LOSSLESS') {
    return { mimeType: 'image/png', quality: 1.0, ext: 'png' };
  }
  if (isQuickCapture) {
    return { mimeType: 'image/jpeg', quality: 0.88, ext: 'jpg' };
  }
  switch (qualitySetting) {
    case 'MAXIMUM':
      return { mimeType: 'image/jpeg', quality: 0.98, ext: 'jpg' };
    case 'HIGH':
      return { mimeType: 'image/jpeg', quality: 0.92, ext: 'jpg' };
    case 'STANDARD':
    default:
      return { mimeType: 'image/jpeg', quality: 0.85, ext: 'jpg' };
  }
}

export function playTimerBeep(isFinalSecond = false): void {
  try {
    if (typeof AudioContext === 'undefined') return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = isFinalSecond ? 1046 : 784;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 200);
  } catch {
    // Audio feedback unavailable or blocked by autoplay policy
  }
}
