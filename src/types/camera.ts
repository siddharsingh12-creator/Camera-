export type PreviewAspectRatio = 'RATIO_4_3' | 'RATIO_16_9' | 'RATIO_1_1' | 'FULL';

export const ASPECT_RATIO_OPTIONS: { id: PreviewAspectRatio; label: string; ratioValue: number | null }[] = [
  { id: 'RATIO_4_3', label: '4:3', ratioValue: 3 / 4 },
  { id: 'RATIO_16_9', label: '16:9', ratioValue: 9 / 16 },
  { id: 'RATIO_1_1', label: '1:1', ratioValue: 1 },
  { id: 'FULL', label: 'FULL', ratioValue: null },
];

export type ShutterTimer = 'OFF' | 'SEC_3' | 'SEC_5' | 'SEC_10';

export const SHUTTER_TIMER_META: Record<ShutterTimer, { seconds: number; label: string; next: ShutterTimer }> = {
  OFF: { seconds: 0, label: 'OFF', next: 'SEC_3' },
  SEC_3: { seconds: 3, label: '3s', next: 'SEC_5' },
  SEC_5: { seconds: 5, label: '5s', next: 'SEC_10' },
  SEC_10: { seconds: 10, label: '10s', next: 'OFF' },
};

export type CaptureSpeedMode = 'MAX_QUALITY' | 'QUICK';

export type FlashSetting = 'OFF' | 'AUTO' | 'ON';

export const FLASH_NEXT: Record<FlashSetting, FlashSetting> = {
  OFF: 'AUTO',
  AUTO: 'ON',
  ON: 'OFF',
};

export type LensOption = 'BACK' | 'FRONT';

export type CameraPermissionStatus = 'NOT_REQUESTED' | 'DENIED' | 'PERMANENTLY_DENIED' | 'NO_HARDWARE' | 'GRANTED';

export type AppCaptureDomain = 'PHOTO' | 'VIDEO';

export type CameraLensRole = 'WIDE' | 'ULTRA_WIDE' | 'TELEPHOTO' | 'MACRO' | 'FRONT' | 'EXTERNAL' | 'AUXILIARY';

export const LENS_ROLE_META: Record<CameraLensRole, { displayName: string; shortTag: string }> = {
  WIDE: { displayName: 'Main Wide', shortTag: 'WIDE' },
  ULTRA_WIDE: { displayName: 'Ultra-Wide', shortTag: 'UW' },
  TELEPHOTO: { displayName: 'Telephoto', shortTag: 'TELE' },
  MACRO: { displayName: 'Macro', shortTag: 'MACRO' },
  FRONT: { displayName: 'Front', shortTag: 'FRONT' },
  EXTERNAL: { displayName: 'External', shortTag: 'EXT' },
  AUXILIARY: { displayName: 'Auxiliary', shortTag: 'AUX' },
};

export type HardwareLevelLabel = 'LEGACY' | 'LIMITED' | 'FULL' | 'LEVEL_3' | 'EXTERNAL' | 'VIRTUAL' | 'UNKNOWN';

export type StabilizationSelection = 'AUTO' | 'OIS' | 'EIS' | 'OFF';

export type WhiteBalanceOption =
  | 'AUTO'
  | 'DAYLIGHT'
  | 'CLOUDY_DAYLIGHT'
  | 'SHADE'
  | 'INCANDESCENT'
  | 'FLUORESCENT'
  | 'WARM_FLUORESCENT'
  | 'TWILIGHT'
  | 'MANUAL_KELVIN';

export const WHITE_BALANCE_META: Record<
  WhiteBalanceOption,
  { label: string; shortTag: string; approxKelvin: number | null }
> = {
  AUTO: { label: 'Auto WB', shortTag: 'AWB', approxKelvin: null },
  DAYLIGHT: { label: 'Daylight', shortTag: 'DAY', approxKelvin: 5500 },
  CLOUDY_DAYLIGHT: { label: 'Cloudy', shortTag: 'CLD', approxKelvin: 6500 },
  SHADE: { label: 'Shade', shortTag: 'SHD', approxKelvin: 7500 },
  INCANDESCENT: { label: 'Tungsten', shortTag: 'TUNG', approxKelvin: 2800 },
  FLUORESCENT: { label: 'Fluorescent', shortTag: 'FLR', approxKelvin: 4000 },
  WARM_FLUORESCENT: { label: 'Warm Fluor', shortTag: 'WFL', approxKelvin: 3200 },
  TWILIGHT: { label: 'Twilight', shortTag: 'TWL', approxKelvin: 4800 },
  MANUAL_KELVIN: { label: 'Manual Kelvin', shortTag: 'K', approxKelvin: 5500 },
};

export type CaptureOutputFormat = 'JPEG' | 'RAW_DNG' | 'RAW_PLUS_JPEG';

export const CAPTURE_FORMAT_META: Record<CaptureOutputFormat, { label: string; shortTag: string }> = {
  JPEG: { label: 'JPEG', shortTag: 'JPG' },
  RAW_DNG: { label: 'RAW (DNG)', shortTag: 'RAW' },
  RAW_PLUS_JPEG: { label: 'RAW + JPEG', shortTag: 'RAW+JPG' },
};

export type ProControlTab = 'ISO' | 'SHUTTER' | 'EV' | 'WB' | 'FOCUS' | 'FORMAT' | 'TOOLS' | 'PRESETS';

export type FocusPeakingColor = 'CYAN' | 'RED' | 'YELLOW';

export interface ResolutionSpec {
  width: number;
  height: number;
}

export interface OpticalZoomStop {
  label: string;
  zoomRatio: number | null;
  targetCameraId: string;
  focalLengthMm: number;
  equiv35mmFocal: number | null;
  role: CameraLensRole;
  isPhysicalSubSensor: boolean;
}

export interface FocusCapabilities {
  isAutoFocusSupported: boolean;
  afModes: string[];
  isManualFocusSupported: boolean;
  minimumFocusDistanceDiopters: number;
  minimumFocusDistanceCm: number | null;
  focusCalibrationLabel: string;
  isMacroFocusCapable: boolean;
  unsupportedManualReason: string | null;
}

export interface ExposureAndRawCapabilities {
  isManualExposureSupported: boolean;
  isAeLockSupported: boolean;
  isoRange: [number, number] | null;
  shutterRangeNs: [number, number] | null;
  exposureCompRange: [number, number];
  exposureCompStep: number;
  supportedAwbModes: WhiteBalanceOption[];
  isManualKelvinSupported: boolean;
  unsupportedWhiteBalanceReason: string | null;
  isRawSupported: boolean;
  isCameraXRawOnlySupported: boolean;
  isCameraXRawJpegSupported: boolean;
  rawOutputSizes: ResolutionSpec[];
  unsupportedManualReason: string | null;
  unsupportedRawReason: string | null;
}

export interface VideoAndStabilizationCapabilities {
  supportedFpsRanges: [number, number][];
  highSpeedFpsRanges: [number, number][];
  supportedVideoSizes: ResolutionSpec[];
  isOisSupported: boolean;
  isEisSupported: boolean;
  isPreviewStabilizationSupported: boolean;
  unsupportedStabilizationReason: string | null;
}

export interface CameraHardwareProfile {
  cameraId: string;
  deviceId: string;
  label: string;
  isVirtual: boolean;
  isLogicalMultiCamera: boolean;
  isPhysicalOnlySensor: boolean;
  isCameraXSelectable: boolean;
  parentLogicalCameraId: string | null;
  physicalCameraIds: string[];
  lensFacing: 'BACK' | 'FRONT' | 'EXTERNAL';
  facingLabel: string;
  role: CameraLensRole;
  hardwareLevel: HardwareLevelLabel;
  isBackwardCompatible: boolean;
  isBurstSupported: boolean;
  isZslSupported: boolean;
  focalLengthsMm: number[];
  equivalent35mmFocalLength: number | null;
  horizontalFovDegrees: number | null;
  sensorPhysicalSizeMm: string | null;
  apertures: number[];
  maxDigitalZoom: number;
  controlZoomRatioRange: [number, number] | null;
  hasOpticalZoom: boolean;
  opticalZoomExplanation: string;
  opticalZoomStops: OpticalZoomStop[];
  supportedJpegResolutions: ResolutionSpec[];
  maxJpegResolution: ResolutionSpec | null;
  hasFlash: boolean;
  flashExplanation: string;
  focusCapabilities: FocusCapabilities;
  exposureAndRaw: ExposureAndRawCapabilities;
  videoAndStabilization: VideoAndStabilizationCapabilities;
  capabilityTags: string[];
}

export interface DeviceCameraInventory {
  allLogicalAndStandaloneCameras: CameraHardwareProfile[];
  allPhysicalSensors: CameraHardwareProfile[];
  selectableCameras: CameraHardwareProfile[];
  backCameraCount: number;
  frontCameraCount: number;
  externalCameraCount: number;
  hasUltraWide: boolean;
  hasTelephoto: boolean;
  hasMacro: boolean;
  hasLevelSensor: boolean;
  hasMotionSensorForPanorama: boolean;
  isInitialized: boolean;
  scanError: string | null;
}

export interface SensorCapabilities {
  maxSensorJpegSize: ResolutionSpec | null;
  activeCaptureSize: ResolutionSpec | null;
  hasFlash: boolean;
  minZoomRatio: number;
  maxZoomRatio: number;
  currentZoomRatio: number;
  exposureRange: [number, number];
  exposureStep: number;
  currentExposureIndex: number;
}

export interface CapturedPhotoInfo {
  id: string;
  url: string;
  blob?: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  displayName: string;
  timestampMillis: number;
  isVideo: boolean;
  durationMs: number;
  mimeType: string;
  videoFrameRate: number | null;
  isHdrVideo: boolean;
}

export interface FocusPointState {
  x: number;
  y: number;
  timestamp: number;
  isLockedSuccess: boolean | null;
}

export interface ManualProSettings {
  isProPanelOpen: boolean;
  activeProTab: ProControlTab;
  isManualIsoEnabled: boolean;
  manualIso: number | null;
  isManualShutterEnabled: boolean;
  manualShutterNs: number | null;
  whiteBalanceMode: WhiteBalanceOption;
  manualKelvin: number;
  isManualFocusEnabled: boolean;
  manualFocusDiopters: number;
  isExposureLockEnabled: boolean;
  captureOutputFormat: CaptureOutputFormat;
  isRawCaptureEnabled: boolean;
  stabilizationSelection: StabilizationSelection;
  isFocusPeakingEnabled: boolean;
  focusPeakingColor: FocusPeakingColor;
  isHistogramEnabled: boolean;
  isZebraEnabled: boolean;
  zebraThresholdPercent: number;
}

export interface LiveExposureTelemetry {
  iso: number | null;
  shutterNs: number | null;
  aperture: number | null;
  focusDistanceDiopters: number | null;
}

export interface ProPreset {
  id: string;
  name: string;
  isManualIsoEnabled: boolean;
  manualIso: number | null;
  isManualShutterEnabled: boolean;
  manualShutterNs: number | null;
  whiteBalanceMode: WhiteBalanceOption;
  manualKelvin: number;
  isManualFocusEnabled: boolean;
  manualFocusDiopters: number;
  exposureCompIndex: number;
  captureOutputFormat: CaptureOutputFormat;
  stabilizationSelection: StabilizationSelection;
  isFocusPeakingEnabled: boolean;
  isHistogramEnabled: boolean;
  isZebraEnabled: boolean;
}

export interface FrameAnalysisData {
  lumaBins: number[];
  redBins: number[];
  greenBins: number[];
  blueBins: number[];
  highlightClippedPercent: number;
  shadowClippedPercent: number;
  focusPeakingPoints: number[]; // flat [x, y, x, y, ...] normalized 0..1
  zebraHighlightPoints: number[];
  zebraShadowPoints: number[];
  meanLuma: number;
  highlightShare: number;
  shadowShare: number;
  isWarmScene: boolean;
}

export type PhotographyMode =
  | 'STANDARD'
  | 'HDR'
  | 'NIGHT'
  | 'PORTRAIT'
  | 'MACRO'
  | 'HIGH_RES'
  | 'PANORAMA'
  | 'LOW_LIGHT'
  | 'AUTO_SCENE'
  | 'NATURAL_COLOR';

export const PHOTOGRAPHY_MODE_LIST: {
  mode: PhotographyMode;
  label: string;
  shortTag: string;
  description: string;
}[] = [
  { mode: 'STANDARD', label: 'Photo', shortTag: 'PHOTO', description: 'Full-resolution native sensor capture with natural tone mapping' },
  { mode: 'HDR', label: 'HDR', shortTag: 'HDR', description: 'Multi-exposure high dynamic range tone fusion' },
  { mode: 'NIGHT', label: 'Night', shortTag: 'NIGHT', description: 'Multi-frame night computational exposure boost' },
  { mode: 'PORTRAIT', label: 'Portrait', shortTag: 'PORTRAIT', description: 'Optical depth bokeh with natural skin texture preservation' },
  { mode: 'MACRO', label: 'Macro', shortTag: 'MACRO', description: 'Dedicated macro sensor or close-focus magnification' },
  { mode: 'HIGH_RES', label: 'Hi-Res', shortTag: 'HI-RES', description: 'Unbinned highest native sensor megapixel stream' },
  { mode: 'PANORAMA', label: 'Panorama', shortTag: 'PANO', description: 'Guided multi-frame sweep with feather seam stitching' },
  { mode: 'LOW_LIGHT', label: 'Low Light', shortTag: 'LOW LT', description: 'Aligned multi-frame noise-reduction stack' },
  { mode: 'AUTO_SCENE', label: 'Auto Scene', shortTag: 'SCENE', description: 'Live frame telemetry selecting scene optimization' },
  { mode: 'NATURAL_COLOR', label: 'Natural', shortTag: 'NATURAL', description: 'True color fidelity with oversharpening disabled' },
];

export type DetectedSceneType =
  | 'Standard Scene'
  | 'Portrait Subject'
  | 'Low Light Scene'
  | 'High Contrast'
  | 'Close Focus'
  | 'Landscape';

export interface ModeAvailability {
  mode: PhotographyMode;
  isSupported: boolean;
  backendLabel: string;
  reason: string;
}

export interface CameraModeCapabilities {
  cameraId: string | null;
  modes: Record<PhotographyMode, ModeAvailability>;
  isInitialized: boolean;
}

export interface PanoramaSessionState {
  isActive: boolean;
  capturedSlicesCount: number;
  maxSlices: number;
  currentYawDeg: number;
  targetStepDeg: number;
  pitchTiltDeg: number;
  isStitching: boolean;
  statusHint: string;
}

export type VideoQualityOption = 'SD_480P' | 'HD_720P' | 'FHD_1080P' | 'QHD_2K' | 'UHD_4K';

export const VIDEO_QUALITY_META: Record<
  VideoQualityOption,
  { shortLabel: string; displayName: string; nominalWidth: number; nominalHeight: number }
> = {
  SD_480P: { shortLabel: '480p', displayName: 'SD 480p', nominalWidth: 720, nominalHeight: 480 },
  HD_720P: { shortLabel: '720p', displayName: 'HD 720p', nominalWidth: 1280, nominalHeight: 720 },
  FHD_1080P: { shortLabel: '1080p', displayName: 'Full HD 1080p', nominalWidth: 1920, nominalHeight: 1080 },
  QHD_2K: { shortLabel: '2K', displayName: '2K QHD 1440p', nominalWidth: 2560, nominalHeight: 1440 },
  UHD_4K: { shortLabel: '4K', displayName: '4K UHD 2160p', nominalWidth: 3840, nominalHeight: 2160 },
};

export type VideoFpsOption = 24 | 30 | 60 | 120 | 240;

export const VIDEO_FPS_OPTIONS: { fps: VideoFpsOption; label: string; isHighSpeed: boolean }[] = [
  { fps: 24, label: '24', isHighSpeed: false },
  { fps: 30, label: '30', isHighSpeed: false },
  { fps: 60, label: '60', isHighSpeed: false },
  { fps: 120, label: '120', isHighSpeed: true },
  { fps: 240, label: '240', isHighSpeed: true },
];

export type VideoBitrateOption = 'AUTO' | 'MBPS_10' | 'MBPS_20' | 'MBPS_35' | 'MBPS_50' | 'MBPS_80';

export const VIDEO_BITRATE_META: Record<VideoBitrateOption, { label: string; bitrateBps: number | null }> = {
  AUTO: { label: 'AUTO', bitrateBps: null },
  MBPS_10: { label: '10M', bitrateBps: 10_000_000 },
  MBPS_20: { label: '20M', bitrateBps: 20_000_000 },
  MBPS_35: { label: '35M', bitrateBps: 35_000_000 },
  MBPS_50: { label: '50M', bitrateBps: 50_000_000 },
  MBPS_80: { label: '80M', bitrateBps: 80_000_000 },
};

export interface VideoQualityAvailability {
  quality: VideoQualityOption;
  isSupported: boolean;
  resolvedSize: ResolutionSpec | null;
  reason: string;
}

export interface VideoFpsAvailability {
  fps: VideoFpsOption;
  isSupported: boolean;
  reason: string;
}

export interface CameraVideoCapabilities {
  cameraId: string | null;
  qualities: Record<VideoQualityOption, VideoQualityAvailability>;
  fpsOptions: Record<VideoFpsOption, VideoFpsAvailability>;
  hdrSupported: boolean;
  hdrLabel: string;
  hdrReason: string;
  isVideoStabilizationSupported: boolean;
  isOisSupported: boolean;
  isEisSupported: boolean;
  maxEncoderBitrateBps: number;
  isInitialized: boolean;
}

export interface VideoSettings {
  quality: VideoQualityOption;
  fps: VideoFpsOption;
  bitrate: VideoBitrateOption;
  stabilization: StabilizationSelection;
  isHdrEnabled: boolean;
  isAudioEnabled: boolean;
  isSlowMotionBakedIn: boolean;
  isTorchEnabled: boolean;
}

export interface VideoRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  elapsedDurationMs: number;
  recordedBytes: number;
  audioAmplitude: number;
  hasAudioTrack: boolean;
}

export interface CameraUiState {
  permissionStatus: CameraPermissionStatus;
  isVirtualSensor: boolean;
  captureDomain: AppCaptureDomain;
  deviceInventory: DeviceCameraInventory;
  activeCameraId: string | null;
  activeHardwareProfile: CameraHardwareProfile | null;
  lensOption: LensOption;
  hasBackCamera: boolean;
  hasFrontCamera: boolean;
  aspectRatio: PreviewAspectRatio;
  flashSetting: FlashSetting;
  shutterTimer: ShutterTimer;
  countdownRemainingSeconds: number | null;
  captureSpeedMode: CaptureSpeedMode;
  isBurstModeEnabled: boolean;
  burstProgressCount: number | null;
  isGridEnabled: boolean;
  isLevelEnabled: boolean;
  isFrontMirrorEnabled: boolean;
  isVolumeShutterEnabled: boolean;
  isCapturing: boolean;
  shutterBlinkCounter: number;
  sensorCapabilities: SensorCapabilities;
  manualSettings: ManualProSettings;
  liveTelemetry: LiveExposureTelemetry;
  frameAnalysis: FrameAnalysisData | null;
  customPresets: ProPreset[];
  photographyMode: PhotographyMode;
  modeCapabilities: CameraModeCapabilities;
  detectedAutoScene: DetectedSceneType;
  panoramaState: PanoramaSessionState;
  videoCapabilities: CameraVideoCapabilities;
  videoSettings: VideoSettings;
  videoRecordingState: VideoRecordingState;
  isVideoSettingsOpen: boolean;
  isHardwareInspectorOpen: boolean;
  inspectorSelectedCameraId: string | null;
  capturedMedia: CapturedPhotoInfo[];
  lastCapturedPhoto: CapturedPhotoInfo | null;
  inspectedPhoto: CapturedPhotoInfo | null;
  isPhotoViewerOpen: boolean;
  isGallerySheetOpen: boolean;
  focusPoint: FocusPointState | null;
  statusBanner: string | null;
  errorMessage: string | null;
}
