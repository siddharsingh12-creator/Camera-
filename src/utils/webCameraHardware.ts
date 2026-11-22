import {
  CameraHardwareProfile,
  CameraLensRole,
  CameraModeCapabilities,
  CameraVideoCapabilities,
  DeviceCameraInventory,
  ManualProSettings,
  ModeAvailability,
  PHOTOGRAPHY_MODE_LIST,
  PhotographyMode,
  ResolutionSpec,
  SensorCapabilities,
  VIDEO_FPS_OPTIONS,
  VIDEO_QUALITY_META,
  VideoFpsAvailability,
  VideoFpsOption,
  VideoQualityAvailability,
  VideoQualityOption,
  WhiteBalanceOption,
} from '../types/camera';

export function buildVirtualCameraInventory(): DeviceCameraInventory {
  const wideProfile: CameraHardwareProfile = {
    cameraId: '0',
    deviceId: 'virtual-wide-0',
    label: 'Virtual Optical Sensor (24mm Wide)',
    isVirtual: true,
    isLogicalMultiCamera: true,
    isPhysicalOnlySensor: false,
    isCameraXSelectable: true,
    parentLogicalCameraId: null,
    physicalCameraIds: ['2', '3'],
    lensFacing: 'BACK',
    facingLabel: 'Rear',
    role: 'WIDE',
    hardwareLevel: 'LEVEL_3',
    isBackwardCompatible: true,
    isBurstSupported: true,
    isZslSupported: true,
    focalLengthsMm: [6.8],
    equivalent35mmFocalLength: 24,
    horizontalFovDegrees: 78.4,
    sensorPhysicalSizeMm: '9.8 × 7.3 mm',
    apertures: [1.8],
    maxDigitalZoom: 10.0,
    controlZoomRatioRange: [0.6, 10.0],
    hasOpticalZoom: true,
    opticalZoomExplanation: 'Virtual multi-lens array (0.6× UW · 1× Wide · 3× Tele)',
    opticalZoomStops: [
      { label: '0.6×', zoomRatio: 0.6, targetCameraId: '2', focalLengthMm: 2.2, equiv35mmFocal: 14, role: 'ULTRA_WIDE', isPhysicalSubSensor: true },
      { label: '1×', zoomRatio: 1.0, targetCameraId: '0', focalLengthMm: 6.8, equiv35mmFocal: 24, role: 'WIDE', isPhysicalSubSensor: false },
      { label: '3×', zoomRatio: 3.0, targetCameraId: '3', focalLengthMm: 19.4, equiv35mmFocal: 70, role: 'TELEPHOTO', isPhysicalSubSensor: true },
    ],
    supportedJpegResolutions: [
      { width: 4032, height: 3024 },
      { width: 3840, height: 2160 },
      { width: 2560, height: 1440 },
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ],
    maxJpegResolution: { width: 4032, height: 3024 },
    hasFlash: true,
    flashExplanation: 'Simulated dual-tone LED flash & video torch',
    focusCapabilities: {
      isAutoFocusSupported: true,
      afModes: ['CONTINUOUS_PICTURE', 'CONTINUOUS_VIDEO', 'AUTO', 'MACRO'],
      isManualFocusSupported: true,
      minimumFocusDistanceDiopters: 10.0,
      minimumFocusDistanceCm: 10.0,
      focusCalibrationLabel: 'Calibrated (Virtual)',
      isMacroFocusCapable: true,
      unsupportedManualReason: null,
    },
    exposureAndRaw: {
      isManualExposureSupported: true,
      isAeLockSupported: true,
      isoRange: [50, 6400],
      shutterRangeNs: [125_000, 1_000_000_000],
      exposureCompRange: [-12, 12],
      exposureCompStep: 1 / 3,
      supportedAwbModes: [
        'AUTO',
        'DAYLIGHT',
        'CLOUDY_DAYLIGHT',
        'SHADE',
        'INCANDESCENT',
        'FLUORESCENT',
        'WARM_FLUORESCENT',
        'TWILIGHT',
        'MANUAL_KELVIN',
      ],
      isManualKelvinSupported: true,
      unsupportedWhiteBalanceReason: null,
      isRawSupported: false,
      isCameraXRawOnlySupported: false,
      isCameraXRawJpegSupported: false,
      rawOutputSizes: [],
      unsupportedManualReason: null,
      unsupportedRawReason: 'Browser Canvas pipeline exports full-res JPEG/PNG (DNG RAW requires native Camera2 HAL)',
    },
    videoAndStabilization: {
      supportedFpsRanges: [[24, 24], [30, 30], [60, 60]],
      highSpeedFpsRanges: [[120, 120]],
      supportedVideoSizes: [
        { width: 3840, height: 2160 },
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
      ],
      isOisSupported: true,
      isEisSupported: true,
      isPreviewStabilizationSupported: true,
      unsupportedStabilizationReason: null,
    },
    capabilityTags: ['MANUAL_SENSOR', 'MANUAL_POST_PROCESSING', 'ZSL_BURST', 'OPTICAL_STABILIZATION', 'WEB_VIRTUAL_SENSOR'],
  };

  const frontProfile: CameraHardwareProfile = {
    ...wideProfile,
    cameraId: '1',
    deviceId: 'virtual-front-1',
    label: 'Virtual Front Sensor (26mm)',
    isLogicalMultiCamera: false,
    physicalCameraIds: [],
    lensFacing: 'FRONT',
    facingLabel: 'Front',
    role: 'FRONT',
    hardwareLevel: 'FULL',
    focalLengthsMm: [3.2],
    equivalent35mmFocalLength: 26,
    horizontalFovDegrees: 80,
    apertures: [2.2],
    maxDigitalZoom: 4.0,
    controlZoomRatioRange: [1.0, 4.0],
    hasOpticalZoom: false,
    opticalZoomExplanation: 'Fixed front wide-angle optics',
    opticalZoomStops: [],
    hasFlash: false,
    flashExplanation: 'No physical flash unit on front sensor',
    supportedJpegResolutions: [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ],
    maxJpegResolution: { width: 1920, height: 1080 },
    capabilityTags: ['FRONT_FACING', 'WEB_VIRTUAL_SENSOR'],
  };

  return {
    allLogicalAndStandaloneCameras: [wideProfile, frontProfile],
    allPhysicalSensors: [],
    selectableCameras: [wideProfile, frontProfile],
    backCameraCount: 1,
    frontCameraCount: 1,
    externalCameraCount: 0,
    hasUltraWide: true,
    hasTelephoto: true,
    hasMacro: true,
    hasLevelSensor: true,
    hasMotionSensorForPanorama: true,
    isInitialized: true,
    scanError: null,
  };
}

function inferLensRole(label: string, facing: 'BACK' | 'FRONT' | 'EXTERNAL'): CameraLensRole {
  const lower = label.toLowerCase();
  if (facing === 'FRONT' || lower.includes('front') || lower.includes('facetime') || lower.includes('selfie')) {
    return 'FRONT';
  }
  if (lower.includes('ultra') || lower.includes('0.5') || lower.includes('0.6')) return 'ULTRA_WIDE';
  if (lower.includes('tele') || lower.includes('zoom') || lower.includes('periscope')) return 'TELEPHOTO';
  if (lower.includes('macro')) return 'MACRO';
  if (facing === 'EXTERNAL' || lower.includes('usb') || lower.includes('obs') || lower.includes('virtual')) return 'EXTERNAL';
  return 'WIDE';
}

function inferFacing(label: string, capabilities?: MediaTrackCapabilities & Record<string, unknown>): 'BACK' | 'FRONT' | 'EXTERNAL' {
  const facingMode = Array.isArray(capabilities?.facingMode) ? capabilities.facingMode[0] : undefined;
  if (facingMode === 'user') return 'FRONT';
  if (facingMode === 'environment') return 'BACK';
  const lower = label.toLowerCase();
  if (lower.includes('back') || lower.includes('rear') || lower.includes('environment')) return 'BACK';
  if (lower.includes('front') || lower.includes('user') || lower.includes('facetime') || lower.includes('integrated') || lower.includes('webcam')) {
    return 'FRONT';
  }
  return 'BACK';
}

export async function scanBrowserCameraInventory(
  activeTrack?: MediaStreamTrack | null
): Promise<DeviceCameraInventory> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return buildVirtualCameraInventory();
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');
    if (videoInputs.length === 0) {
      return buildVirtualCameraInventory();
    }

    const activeSettings = activeTrack?.getSettings();
    const activeCaps = (activeTrack?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & Record<string, unknown>;

    const profiles: CameraHardwareProfile[] = videoInputs.map((dev, idx) => {
      const isActive = activeSettings?.deviceId ? dev.deviceId === activeSettings.deviceId : idx === 0;
      const caps = isActive ? activeCaps : ({} as Record<string, unknown>);
      const facing = inferFacing(dev.label || `Camera ${idx}`, isActive ? activeCaps : undefined);
      const role = inferLensRole(dev.label || '', facing);

      const maxW = typeof (caps.width as { max?: number } | undefined)?.max === 'number'
        ? (caps.width as { max: number }).max
        : (activeSettings?.width ?? 1920);
      const maxH = typeof (caps.height as { max?: number } | undefined)?.max === 'number'
        ? (caps.height as { max: number }).max
        : (activeSettings?.height ?? 1080);

      const candidateRes: ResolutionSpec[] = [
        { width: maxW, height: maxH },
        { width: 3840, height: 2160 },
        { width: 2560, height: 1440 },
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 },
      ].filter((r) => r.width <= maxW && r.height <= maxH);

      const uniqueRes = candidateRes.filter(
        (r, i, arr) => arr.findIndex((o) => o.width === r.width && o.height === r.height) === i
      );

      const zoomCap = caps.zoom as { min?: number; max?: number } | undefined;
      const minZoom = typeof zoomCap?.min === 'number' ? zoomCap.min : 1.0;
      const maxZoom = typeof zoomCap?.max === 'number' ? Math.max(zoomCap.max, 4.0) : 6.0;

      const isoCap = caps.iso as { min?: number; max?: number } | undefined;
      const expTimeCap = caps.exposureTime as { min?: number; max?: number } | undefined;
      const expCompCap = caps.exposureCompensation as { min?: number; max?: number; step?: number } | undefined;
      const focusDistCap = caps.focusDistance as { min?: number; max?: number } | undefined;
      const colorTempCap = caps.colorTemperature as { min?: number; max?: number } | undefined;
      const hasTorch = Boolean(caps.torch);

      const supportedAwb: WhiteBalanceOption[] = [
        'AUTO',
        'DAYLIGHT',
        'CLOUDY_DAYLIGHT',
        'SHADE',
        'INCANDESCENT',
        'FLUORESCENT',
        'MANUAL_KELVIN',
      ];

      const tags: string[] = ['WEBRTC_MEDIA_STREAM', 'IMAGE_CAPTURE_API'];
      if (isoCap) tags.push('HARDWARE_ISO');
      if (expTimeCap) tags.push('HARDWARE_SHUTTER');
      if (expCompCap) tags.push('EXPOSURE_COMPENSATION');
      if (focusDistCap) tags.push('MANUAL_FOCUS');
      if (colorTempCap) tags.push('KELVIN_WHITE_BALANCE');
      if (hasTorch) tags.push('FLASH_TORCH');

      return {
        cameraId: String(idx),
        deviceId: dev.deviceId || `cam-${idx}`,
        label: dev.label || `Camera Sensor ${idx}`,
        isVirtual: false,
        isLogicalMultiCamera: false,
        isPhysicalOnlySensor: false,
        isCameraXSelectable: true,
        parentLogicalCameraId: null,
        physicalCameraIds: [],
        lensFacing: facing,
        facingLabel: facing === 'FRONT' ? 'Front' : facing === 'EXTERNAL' ? 'External' : 'Rear',
        role,
        hardwareLevel: isoCap || expTimeCap ? 'FULL' : 'LIMITED',
        isBackwardCompatible: true,
        isBurstSupported: true,
        isZslSupported: true,
        focalLengthsMm: [role === 'ULTRA_WIDE' ? 2.2 : role === 'TELEPHOTO' ? 18.0 : 4.8],
        equivalent35mmFocalLength: role === 'ULTRA_WIDE' ? 14 : role === 'TELEPHOTO' ? 70 : 26,
        horizontalFovDegrees: role === 'ULTRA_WIDE' ? 114 : role === 'TELEPHOTO' ? 34 : 76,
        sensorPhysicalSizeMm: '6.4 × 4.8 mm',
        apertures: [1.8],
        maxDigitalZoom: maxZoom,
        controlZoomRatioRange: [minZoom, maxZoom],
        hasOpticalZoom: false,
        opticalZoomExplanation: videoInputs.length > 1
          ? `${videoInputs.length} browser media video devices enumerated`
          : 'Single physical optical lens; digital zoom active',
        opticalZoomStops: [],
        supportedJpegResolutions: uniqueRes.length > 0 ? uniqueRes : [{ width: 1920, height: 1080 }],
        maxJpegResolution: uniqueRes[0] ?? { width: 1920, height: 1080 },
        hasFlash: hasTorch,
        flashExplanation: hasTorch ? 'Hardware torch / flash supported via MediaTrack' : 'No torch capability exposed by browser track',
        focusCapabilities: {
          isAutoFocusSupported: true,
          afModes: Array.isArray(caps.focusMode) ? (caps.focusMode as string[]) : ['CONTINUOUS', 'SINGLE'],
          isManualFocusSupported: true,
          minimumFocusDistanceDiopters: focusDistCap?.max ? 1 / Math.max(0.05, focusDistCap.min ?? 0.1) : 10,
          minimumFocusDistanceCm: 10,
          focusCalibrationLabel: focusDistCap ? 'Hardware FocusTrack' : 'Optical/Software Focus',
          isMacroFocusCapable: role === 'MACRO',
          unsupportedManualReason: null,
        },
        exposureAndRaw: {
          isManualExposureSupported: true,
          isAeLockSupported: true,
          isoRange: isoCap ? [Math.round(isoCap.min ?? 50), Math.round(isoCap.max ?? 3200)] : [50, 6400],
          shutterRangeNs: expTimeCap
            ? [Math.round((expTimeCap.min ?? 0.0002) * 1e9), Math.round((expTimeCap.max ?? 0.5) * 1e9)]
            : [125_000, 1_000_000_000],
          exposureCompRange: expCompCap
            ? [Math.round((expCompCap.min ?? -2) * 3), Math.round((expCompCap.max ?? 2) * 3)]
            : [-12, 12],
          exposureCompStep: expCompCap?.step ?? 1 / 3,
          supportedAwbModes: supportedAwb,
          isManualKelvinSupported: true,
          unsupportedWhiteBalanceReason: null,
          isRawSupported: false,
          isCameraXRawOnlySupported: false,
          isCameraXRawJpegSupported: false,
          rawOutputSizes: [],
          unsupportedManualReason: null,
          unsupportedRawReason: 'Web MediaStream captures JPEG/PNG; 16-bit DNG RAW requires native HAL',
        },
        videoAndStabilization: {
          supportedFpsRanges: [[24, 24], [30, 30], [60, 60]],
          highSpeedFpsRanges: [],
          supportedVideoSizes: uniqueRes,
          isOisSupported: false,
          isEisSupported: true,
          isPreviewStabilizationSupported: true,
          unsupportedStabilizationReason: null,
        },
        capabilityTags: tags,
      };
    });

    const backCount = profiles.filter((p) => p.lensFacing === 'BACK').length;
    const frontCount = profiles.filter((p) => p.lensFacing === 'FRONT').length;
    const extCount = profiles.filter((p) => p.lensFacing === 'EXTERNAL').length;

    return {
      allLogicalAndStandaloneCameras: profiles,
      allPhysicalSensors: [],
      selectableCameras: profiles,
      backCameraCount: backCount,
      frontCameraCount: frontCount,
      externalCameraCount: extCount,
      hasUltraWide: profiles.some((p) => p.role === 'ULTRA_WIDE'),
      hasTelephoto: profiles.some((p) => p.role === 'TELEPHOTO'),
      hasMacro: profiles.some((p) => p.role === 'MACRO'),
      hasLevelSensor: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
      hasMotionSensorForPanorama: true,
      isInitialized: true,
      scanError: null,
    };
  } catch (err) {
    return {
      ...buildVirtualCameraInventory(),
      scanError: err instanceof Error ? err.message : 'Unable to enumerate media devices',
    };
  }
}

export function extractSensorCapabilities(
  profile: CameraHardwareProfile | null,
  activeSize: ResolutionSpec | null,
  currentZoom = 1,
  currentExposureIndex = 0
): SensorCapabilities {
  const maxSize = profile?.maxJpegResolution ?? activeSize ?? { width: 1920, height: 1080 };
  const zoomRange = profile?.controlZoomRatioRange ?? [1, profile?.maxDigitalZoom ?? 6];
  return {
    maxSensorJpegSize: maxSize,
    activeCaptureSize: activeSize ?? maxSize,
    hasFlash: profile?.hasFlash ?? true,
    minZoomRatio: zoomRange[0],
    maxZoomRatio: zoomRange[1],
    currentZoomRatio: currentZoom,
    exposureRange: profile?.exposureAndRaw.exposureCompRange ?? [-12, 12],
    exposureStep: profile?.exposureAndRaw.exposureCompStep ?? 1 / 3,
    currentExposureIndex,
  };
}

export function evaluateModeCapabilities(profile: CameraHardwareProfile | null): CameraModeCapabilities {
  const modes = {} as Record<PhotographyMode, ModeAvailability>;
  for (const item of PHOTOGRAPHY_MODE_LIST) {
    let backendLabel = 'Optical Pipeline';
    let reason = item.description;
    if (item.mode === 'STANDARD') backendLabel = 'Max Sensor JPEG';
    else if (item.mode === 'HDR') backendLabel = 'Multi-Exposure Fusion';
    else if (item.mode === 'NIGHT') backendLabel = 'Night Frame Stack';
    else if (item.mode === 'PORTRAIT') backendLabel = 'Optical Depth Bokeh';
    else if (item.mode === 'MACRO') backendLabel = 'Close-Focus Optic';
    else if (item.mode === 'HIGH_RES') backendLabel = profile?.maxJpegResolution ? `${profile.maxJpegResolution.width}×${profile.maxJpegResolution.height}` : 'Native Sensor';
    else if (item.mode === 'PANORAMA') backendLabel = 'Sweep + Feather Stitch';
    else if (item.mode === 'LOW_LIGHT') backendLabel = 'Low-Light Denoise Stack';
    else if (item.mode === 'AUTO_SCENE') backendLabel = 'Live Telemetry AI';
    else if (item.mode === 'NATURAL_COLOR') backendLabel = 'True Color Profile';

    modes[item.mode] = {
      mode: item.mode,
      isSupported: true,
      backendLabel,
      reason,
    };
  }
  return {
    cameraId: profile?.cameraId ?? null,
    modes,
    isInitialized: true,
  };
}

export function evaluateVideoCapabilities(profile: CameraHardwareProfile | null): CameraVideoCapabilities {
  const maxW = profile?.maxJpegResolution?.width ?? 1920;
  const maxH = profile?.maxJpegResolution?.height ?? 1080;

  const qualities = {} as Record<VideoQualityOption, VideoQualityAvailability>;
  (Object.keys(VIDEO_QUALITY_META) as VideoQualityOption[]).forEach((q) => {
    const meta = VIDEO_QUALITY_META[q];
    const supported = meta.nominalWidth <= Math.max(maxW, 1920) || q === 'FHD_1080P';
    qualities[q] = {
      quality: q,
      isSupported: supported,
      resolvedSize: supported ? { width: meta.nominalWidth, height: meta.nominalHeight } : null,
      reason: supported ? `${meta.nominalWidth}×${meta.nominalHeight}` : `Exceeds sensor max (${maxW}×${maxH})`,
    };
  });

  const fpsOptions = {} as Record<VideoFpsOption, VideoFpsAvailability>;
  VIDEO_FPS_OPTIONS.forEach((opt) => {
    const supported = opt.fps <= 60 || (profile?.isVirtual === true && opt.fps === 120);
    fpsOptions[opt.fps] = {
      fps: opt.fps,
      isSupported: supported,
      reason: supported ? `${opt.fps} fps stream` : `${opt.fps} fps unsupported by browser MediaRecorder`,
    };
  });

  return {
    cameraId: profile?.cameraId ?? null,
    qualities,
    fpsOptions,
    hdrSupported: false,
    hdrLabel: 'SDR',
    hdrReason: '10-bit HLG/Dolby HDR video encoding requires native hardware MediaCodec',
    isVideoStabilizationSupported: true,
    isOisSupported: profile?.videoAndStabilization.isOisSupported ?? false,
    isEisSupported: true,
    maxEncoderBitrateBps: 80_000_000,
    isInitialized: true,
  };
}

// Compute CSS filter string reflecting real-time EV, ISO, Shutter, White Balance Kelvin, and Photography Mode
export function buildViewfinderFilterCss(
  manual: ManualProSettings,
  exposureIndex: number,
  exposureStep: number,
  mode: PhotographyMode
): string {
  let brightness = 1 + exposureIndex * exposureStep * 0.14;
  if (manual.isManualIsoEnabled && manual.manualIso) {
    brightness *= Math.min(1.65, Math.max(0.6, 0.75 + Math.log2(manual.manualIso / 100) * 0.14));
  }
  if (manual.isManualShutterEnabled && manual.manualShutterNs) {
    const ms = manual.manualShutterNs / 1_000_000;
    brightness *= Math.min(1.6, Math.max(0.55, 0.85 + Math.log2(Math.max(0.25, ms) / 16.6) * 0.12));
  }

  let contrast = 1.0;
  let saturate = 1.0;
  let sepia = 0.0;
  let hueRotate = 0;
  let blurPx = 0;

  // Color temperature simulation from Kelvin (5500K neutral)
  const kelvin = manual.whiteBalanceMode === 'AUTO'
    ? 5500
    : manual.whiteBalanceMode === 'MANUAL_KELVIN'
      ? manual.manualKelvin
      : ({
          DAYLIGHT: 5500,
          CLOUDY_DAYLIGHT: 6500,
          SHADE: 7500,
          INCANDESCENT: 2800,
          FLUORESCENT: 4000,
          WARM_FLUORESCENT: 3200,
          TWILIGHT: 4800,
          AUTO: 5500,
          MANUAL_KELVIN: manual.manualKelvin,
        }[manual.whiteBalanceMode] ?? 5500);

  if (kelvin > 5600) {
    sepia = Math.min(0.32, (kelvin - 5500) / 8000);
    saturate = 1.06;
  } else if (kelvin < 5400) {
    hueRotate = -Math.min(18, ((5500 - kelvin) / 3300) * 18);
    saturate = 0.94;
  }

  if (mode === 'HDR') {
    contrast = 1.12;
    saturate *= 1.12;
  } else if (mode === 'NIGHT' || mode === 'LOW_LIGHT') {
    brightness *= 1.18;
    contrast = 1.05;
  } else if (mode === 'NATURAL_COLOR') {
    contrast = 0.96;
    saturate *= 0.92;
  }

  if (manual.isManualFocusEnabled && manual.manualFocusDiopters > 6) {
    blurPx = 0.4;
  }

  return `brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(${saturate.toFixed(2)}) sepia(${sepia.toFixed(2)}) hue-rotate(${hueRotate.toFixed(1)}deg) blur(${blurPx}px)`;
}

// Procedural optical test scene renderer for devices without physical camera hardware
export function renderVirtualSensorFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tSec: number,
  lensFacing: 'BACK' | 'FRONT' | 'EXTERNAL',
  zoom: number
): void {
  ctx.save();
  const cx = w / 2;
  const cy = h / 2;

  // Deep studio gradient background
  const grad = ctx.createRadialGradient(cx, cy * 0.85, w * 0.05, cx, cy, Math.max(w, h) * 0.75);
  if (lensFacing === 'FRONT') {
    grad.addColorStop(0, '#1f293d');
    grad.addColorStop(0.5, '#121724');
    grad.addColorStop(1, '#08090d');
  } else {
    grad.addColorStop(0, '#1c2432');
    grad.addColorStop(0.45, '#111620');
    grad.addColorStop(1, '#07080c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  // Subtle ambient studio horizon light orbs
  const orb1X = cx + Math.sin(tSec * 0.45) * w * 0.16;
  const orb1Y = cy * 0.65 + Math.cos(tSec * 0.35) * h * 0.08;
  const orb1 = ctx.createRadialGradient(orb1X, orb1Y, 4, orb1X, orb1Y, w * 0.24);
  orb1.addColorStop(0, 'rgba(103, 232, 249, 0.35)');
  orb1.addColorStop(0.5, 'rgba(103, 232, 249, 0.08)');
  orb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, w, h);

  const orb2X = cx - Math.cos(tSec * 0.4) * w * 0.18;
  const orb2Y = cy * 1.15 + Math.sin(tSec * 0.3) * h * 0.06;
  const orb2 = ctx.createRadialGradient(orb2X, orb2Y, 4, orb2X, orb2Y, w * 0.22);
  orb2.addColorStop(0, 'rgba(245, 158, 11, 0.34)');
  orb2.addColorStop(0.55, 'rgba(245, 158, 11, 0.07)');
  orb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, w, h);

  // Architectural optical calibration geometry (sharp edges for Focus Peaking!)
  ctx.strokeStyle = 'rgba(246, 247, 249, 0.22)';
  ctx.lineWidth = 1.5;
  const radius = Math.min(w, h) * 0.24;

  // Rotating subtle calibration ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tSec * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI * 2) / 36;
    const r1 = radius * (i % 3 === 0 ? 0.86 : 0.92);
    const r2 = radius * 0.98;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.strokeStyle = i % 9 === 0 ? 'rgba(103, 232, 249, 0.65)' : 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();
  }
  ctx.restore();

  // Sharp high-contrast optical resolution chart bars in center
  const boxW = w * 0.18;
  const boxH = h * 0.12;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  // Color checker swatches for live RGB histogram & WB testing
  const swatches = ['#EF4444', '#F59E0B', '#34D399', '#67E8F9', '#3B82F6', '#F6F7F9'];
  const swW = (boxW * 0.8) / swatches.length;
  swatches.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(cx - boxW * 0.4 + idx * swW, cy + boxH * 0.15, swW - 2, boxH * 0.24);
  });

  ctx.fillStyle = 'rgba(246, 247, 249, 0.72)';
  ctx.font = `600 ${Math.max(11, Math.round(w * 0.018))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(
    lensFacing === 'FRONT' ? 'VIRTUAL FRONT SENSOR · 26MM' : 'VIRTUAL OPTICAL SENSOR · 24MM',
    cx,
    cy - boxH * 0.1
  );

  ctx.restore();
}

export async function stitchPanoramaSlices(slices: HTMLCanvasElement[]): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  if (slices.length === 0) {
    throw new Error('No panorama slices captured');
  }
  const sliceW = slices[0].width;
  const sliceH = slices[0].height;
  const overlap = Math.round(sliceW * 0.28);
  const stepX = sliceW - overlap;
  const totalW = sliceW + stepX * (slices.length - 1);

  const out = document.createElement('canvas');
  out.width = totalW;
  out.height = sliceH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  slices.forEach((slice, index) => {
    const destX = index * stepX;
    if (index === 0) {
      ctx.drawImage(slice, destX, 0);
    } else {
      // Feather blend overlap region
      const temp = document.createElement('canvas');
      temp.width = sliceW;
      temp.height = sliceH;
      const tCtx = temp.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(slice, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        const grad = tCtx.createLinearGradient(0, 0, overlap, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        tCtx.fillStyle = grad;
        tCtx.fillRect(0, 0, overlap, sliceH);
        tCtx.fillStyle = 'rgba(0,0,0,1)';
        tCtx.fillRect(overlap, 0, sliceW - overlap, sliceH);
        ctx.drawImage(temp, destX, 0);
      }
    }
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode stitched panorama'))), 'image/jpeg', 0.94);
  });
  return { blob, width: totalW, height: sliceH };
}
