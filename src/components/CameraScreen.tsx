import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ASPECT_RATIO_OPTIONS,
  AppCaptureDomain,
  CameraUiState,
  CameraUserPreferences,
  CaptureOutputFormat,
  CapturedPhotoInfo,
  DetectedSceneType,
  FLASH_NEXT,
  FlashSetting,
  FrameAnalysisData,
  GridOverlayStyle,
  HdrPlusMode,
  PhotographyMode,
  PreviewAspectRatio,
  ProControlTab,
  ProPreset,
  SaveImageQuality,
  ShutterTimer,
  StabilizationSelection,
  VIDEO_QUALITY_META,
  VideoBitrateOption,
  VideoFpsOption,
  VideoQualityOption,
  WHITE_BALANCE_META,
  WhiteBalanceOption,
} from '../types/camera';
import { CAMERA_FILTERS, FilterId, getFilterById } from '../types/filters';
import { analyzeImageData, formatShutterSpeed } from '../utils/cameraUtils';
import {
  GCamProcessReport,
  processGCamProMaxCanvas,
  ZslFrameRingBuffer,
} from '../utils/gcamProMaxEngine';

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}
import { getImageEncodingConfig } from '../utils/settingsStorage';
import {
  buildViewfinderFilterCss,
  renderVirtualSensorFrame,
  stitchPanoramaSlices,
} from '../utils/webCameraHardware';
import {
  applyFilterToCanvas,
  createFilterSampleSourceCanvas,
  renderFilterThumbnailUrls,
  WebGLFilterRenderer,
} from '../utils/webglFilterPipeline';
import { FilterCarouselBar } from './FilterCarouselBar';
import {
  AspectRatioSelectorPill,
  BurstModePill,
  CameraLevelOverlay,
  CompositionGridOverlay,
  DynamicLensSelectorBar,
  FilterToggleButton,
  FlashToggleButton,
  FocusReticleOverlay,
  GCamEnginePill,
  GalleryIconButton,
  HardwareInspectorButton,
  LastPhotoThumbnailButton,
  ProToggleButton,
  QuickCapturePill,
  QuickSettingsButton,
  SensorTelemetryPill,
  SettingsGearButton,
  ShutterButton,
  SwitchCameraButton,
  TimerCountdownOverlay,
  TimerToggleButton,
  ZoomSliderBar,
} from './CameraControls';
import { QuickSettingsPanel } from './QuickSettingsPanel';
import {
  FocusPeakingOverlay,
  LiveHistogramCard,
  ProExposureInfoBar,
  ZebraExposureOverlay,
} from './ProDslrOverlays';
import { ProControlsPanel } from './ProControlsPanel';
import {
  PanoramaSweepHud,
  PhotographyModeCarousel,
  PhotographyModesDetailDialog,
} from './PhotographyModeBar';
import {
  CaptureDomainTogglePill,
  VideoAudioToggleButton,
  VideoPauseResumeButton,
  VideoQuickSpecPill,
  VideoRecordButton,
  VideoRecordingStatusHud,
  VideoSettingsDeck,
  VideoTorchButton,
} from './VideoControlsPanel';

export interface CameraScreenProps {
  uiState: CameraUiState;
  preferences: CameraUserPreferences;
  mediaStream: MediaStream | null;
  onSelectCaptureDomain: (domain: AppCaptureDomain) => void;
  onSelectCameraId: (id: string) => void;
  onSwitchCamera: () => void;
  onSelectAspectRatio: (ratio: PreviewAspectRatio) => void;
  onToggleFlash: () => void;
  onSelectFlashDirect: (flash: FlashSetting) => void;
  onCycleTimer: () => void;
  onSelectTimerDirect: (timer: ShutterTimer) => void;
  onToggleQuickCapture: () => void;
  onToggleBurstMode: () => void;
  onZoomChange: (zoom: number) => void;
  onExposureCompChange: (index: number) => void;
  onFocusPointChange: (pt: { x: number; y: number; timestamp: number; isLockedSuccess: boolean | null } | null) => void;
  onToggleProPanel: () => void;
  onSelectProTab: (tab: ProControlTab) => void;
  onSetManualIso: (enabled: boolean, iso: number | null) => void;
  onSetManualShutter: (enabled: boolean, ns: number | null) => void;
  onSetWhiteBalance: (wb: WhiteBalanceOption) => void;
  onSetManualKelvin: (kelvin: number) => void;
  onSetManualFocus: (enabled: boolean, diopters: number | null) => void;
  onSelectCaptureFormat: (fmt: CaptureOutputFormat) => void;
  onToggleExposureLock: () => void;
  onSelectStabilization: (stab: StabilizationSelection) => void;
  onToggleFocusPeaking: () => void;
  onCycleFocusPeakingColor: () => void;
  onToggleHistogram: () => void;
  onToggleZebra: () => void;
  onSetZebraThreshold: (pct: number) => void;
  onToggleGrid: () => void;
  onToggleLevel: () => void;
  onToggleFrontMirror: () => void;
  onToggleVolumeShutter: () => void;
  onSavePreset: (name: string) => void;
  onApplyPreset: (preset: ProPreset) => void;
  onDeletePreset: (id: string) => void;
  onResetAllToAuto: () => void;
  onSelectPhotographyMode: (mode: PhotographyMode) => void;
  onSelectVideoQuality: (q: VideoQualityOption) => void;
  onSelectVideoFps: (fps: VideoFpsOption) => void;
  onSelectVideoBitrate: (br: VideoBitrateOption) => void;
  onToggleVideoHdr: () => void;
  onSelectVideoStabilization: (stab: StabilizationSelection) => void;
  onToggleVideoAudio: () => void;
  onToggleVideoSlowMoBaked: () => void;
  onToggleVideoTorch: () => void;
  onToggleVideoSettingsOpen: () => void;
  onToggleQuickSettings: () => void;
  onCloseQuickSettings: () => void;
  onOpenSettings: () => void;
  onUpdatePreferences: (updater: (prev: CameraUserPreferences) => CameraUserPreferences) => void;
  onOpenHardwareInspector: () => void;
  onOpenLastPhoto: () => void;
  onOpenGallery: () => void;
  onDismissBanner: () => void;
  onDismissError: () => void;
  onReportError: (msg: string) => void;
  onUpdateAnalysis: (analysis: FrameAnalysisData, detectedScene: DetectedSceneType) => void;
  onMediaCaptured: (item: CapturedPhotoInfo, keepBurstCount?: boolean) => void;
  onSetCapturingState: (isCapturing: boolean, burstProgressCount?: number | null) => void;
  onTriggerShutterFlash: () => void;
  onUpdatePanoramaState: (patch: Partial<CameraUiState['panoramaState']>) => void;
  onUpdateVideoRecordingState: (patch: Partial<CameraUiState['videoRecordingState']>) => void;
  onStartCountdown: (onComplete: () => void) => void;
  onCancelCountdown: () => void;
  registerShutterHandler: (fn: (() => void) | null) => void;
  onSelectFilter: (id: FilterId) => void;
  onChangeFilterIntensity: (intensity: number) => void;
  onToggleFavoriteFilter: (id: FilterId) => void;
  onResetFilter: () => void;
  onToggleFilterPanel: () => void;
  onTogglePreserveOriginal: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  uiState,
  preferences,
  mediaStream,
  onSelectCaptureDomain,
  onSelectCameraId,
  onSwitchCamera,
  onSelectAspectRatio,
  onToggleFlash,
  onSelectFlashDirect,
  onCycleTimer,
  onSelectTimerDirect,
  onToggleQuickCapture,
  onToggleBurstMode,
  onZoomChange,
  onExposureCompChange,
  onFocusPointChange,
  onToggleProPanel,
  onSelectProTab,
  onSetManualIso,
  onSetManualShutter,
  onSetWhiteBalance,
  onSetManualKelvin,
  onSetManualFocus,
  onSelectCaptureFormat,
  onToggleExposureLock,
  onSelectStabilization,
  onToggleFocusPeaking,
  onCycleFocusPeakingColor,
  onToggleHistogram,
  onToggleZebra,
  onSetZebraThreshold,
  onToggleGrid,
  onToggleLevel,
  onToggleFrontMirror,
  onToggleVolumeShutter,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onResetAllToAuto,
  onSelectPhotographyMode,
  onSelectVideoQuality,
  onSelectVideoFps,
  onSelectVideoBitrate,
  onToggleVideoHdr,
  onSelectVideoStabilization,
  onToggleVideoAudio,
  onToggleVideoSlowMoBaked,
  onToggleVideoTorch,
  onToggleVideoSettingsOpen,
  onToggleQuickSettings,
  onCloseQuickSettings,
  onOpenSettings,
  onUpdatePreferences,
  onOpenHardwareInspector,
  onOpenLastPhoto,
  onOpenGallery,
  onDismissBanner,
  onDismissError,
  onReportError,
  onUpdateAnalysis,
  onMediaCaptured,
  onSetCapturingState,
  onTriggerShutterFlash,
  onUpdatePanoramaState,
  onUpdateVideoRecordingState,
  onStartCountdown,
  onCancelCountdown,
  registerShutterHandler,
  onSelectFilter,
  onChangeFilterIntensity,
  onToggleFavoriteFilter,
  onResetFilter,
  onToggleFilterPanel,
  onTogglePreserveOriginal,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const filteredViewfinderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewfinderGlRef = useRef<WebGLFilterRenderer | null>(null);
  const proBridgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewfinderBoxRef = useRef<HTMLDivElement | null>(null);

  const panoramaSlicesRef = useRef<HTMLCanvasElement[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  const pausedAccumMsRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number>(0);
  const recordedBytesRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const ownedRecordingTracksRef = useRef<MediaStreamTrack[]>([]);
  const recordingGlRendererRef = useRef<WebGLFilterRenderer | null>(null);
  const recordingRafRef = useRef<number | null>(null);
  const recBridgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const slowAnalysisCountRef = useRef(0);
  const zslRingRef = useRef<ZslFrameRingBuffer | null>(null);

  const [modesDetailOpen, setModesDetailOpen] = useState(false);
  const [flashOverlayVisible, setFlashOverlayVisible] = useState(false);
  const [screenFillFlashActive, setScreenFillFlashActive] = useState(false);
  const [rollDegrees, setRollDegrees] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState<boolean>(uiState.isVirtualSensor);
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [isThermalThrottled, setIsThermalThrottled] = useState(false);
  const [isCompareOriginalHeld, setIsCompareOriginalHeld] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [filterThumbnails, setFilterThumbnails] = useState<Partial<Record<FilterId, string>>>(() => {
    const sample = createFilterSampleSourceCanvas();
    const t = renderFilterThumbnailUrls(
      sample,
      sample.width,
      sample.height,
      CAMERA_FILTERS.map((f) => f.id)
    );
    sample.width = 0;
    sample.height = 0;
    return t;
  });
  const [windowSize, setWindowSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const isLowPowerMode = isLowBattery || isThermalThrottled;

  const isWideLandscape = windowSize.w >= 600 && windowSize.w > windowSize.h;
  const isFrontCamera = uiState.activeHardwareProfile?.lensFacing === 'FRONT';
  const zoomRatio = uiState.sensorCapabilities.currentZoomRatio;
  const isBurstEligible =
    uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'STANDARD';
  const uiCustom = preferences.uiCustomization;
  const cleanHud = uiCustom.cleanViewfinderMode;
  const isLeftRail = uiCustom.landscapeControlSide === 'LEFT';
  const fileBasePrefix = preferences.fileNamePrefix.trim() || 'UltraCam';

  const isFilterConfigured = uiState.activeFilterId !== 'original' && uiState.filterIntensity > 0;
  const isGcamLivePreviewActive =
    uiState.captureDomain === 'PHOTO' &&
    preferences.gcamEngine.hdrPlusMode !== 'OFF' &&
    !isCompareOriginalHeld;
  const isLiveFilterRendered =
    !webglUnavailable && ((isFilterConfigured && !isCompareOriginalHeld) || isGcamLivePreviewActive);
  const activeFilterDef = getFilterById(uiState.activeFilterId);

  const activeFilterRef = useRef(uiState.activeFilterId);
  activeFilterRef.current = uiState.activeFilterId;
  const filterIntensityRef = useRef(uiState.filterIntensity);
  filterIntensityRef.current = uiState.filterIntensity;
  const compareHeldRef = useRef(isCompareOriginalHeld);
  compareHeldRef.current = isCompareOriginalHeld;
  const gcamEngineRef = useRef(preferences.gcamEngine);
  gcamEngineRef.current = preferences.gcamEngine;
  const photographyModeRef = useRef(uiState.photographyMode);
  photographyModeRef.current = uiState.photographyMode;
  const captureDomainRef = useRef(uiState.captureDomain);
  captureDomainRef.current = uiState.captureDomain;
  const zoomRatioRef = useRef(zoomRatio);
  zoomRatioRef.current = zoomRatio;
  const isFrontCameraRef = useRef(isFrontCamera);
  isFrontCameraRef.current = isFrontCamera;
  const isFrontMirrorRef = useRef(uiState.isFrontMirrorEnabled);
  isFrontMirrorRef.current = uiState.isFrontMirrorEnabled;

  const hasAnyManualActive =
    uiState.manualSettings.isManualIsoEnabled ||
    uiState.manualSettings.isManualShutterEnabled ||
    uiState.manualSettings.whiteBalanceMode !== 'AUTO' ||
    uiState.manualSettings.isManualFocusEnabled ||
    uiState.manualSettings.isExposureLockEnabled ||
    uiState.manualSettings.isFocusPeakingEnabled ||
    uiState.manualSettings.isHistogramEnabled ||
    uiState.manualSettings.isZebraEnabled ||
    uiState.sensorCapabilities.currentExposureIndex !== 0;

  const sameFacingCameras = uiState.deviceInventory.selectableCameras.filter(
    (c) => c.lensFacing === (uiState.activeHardwareProfile?.lensFacing ?? uiState.lensOption)
  );

  // Track window dimensions & keep preview active across screen rotation
  useEffect(() => {
    const syncViewportAndPreview = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
      const videoEl = videoRef.current;
      if (videoEl && !uiState.isVirtualSensor && mediaStream && videoEl.paused) {
        void videoEl.play().catch(() => {});
      }
    };
    window.addEventListener('resize', syncViewportAndPreview);
    window.addEventListener('orientationchange', syncViewportAndPreview);
    return () => {
      window.removeEventListener('resize', syncViewportAndPreview);
      window.removeEventListener('orientationchange', syncViewportAndPreview);
    };
  }, [mediaStream, uiState.isVirtualSensor]);

  // Monitor optional Battery Status API to throttle heavy background analysis under low battery
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== 'function') return;

    let battery: BatteryManagerLike | null = null;
    let active = true;
    const updateBattery = () => {
      if (!active || !battery) return;
      setIsLowBattery(!battery.charging && battery.level <= 0.15);
    };

    void nav
      .getBattery()
      .then((b) => {
        if (!active) return;
        battery = b;
        updateBattery();
        b.addEventListener('levelchange', updateBattery);
        b.addEventListener('chargingchange', updateBattery);
      })
      .catch(() => {});

    return () => {
      active = false;
      if (battery) {
        battery.removeEventListener('levelchange', updateBattery);
        battery.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  // Trigger shutter blink flash overlay
  useEffect(() => {
    if (uiState.shutterBlinkCounter === 0) return;
    setFlashOverlayVisible(true);
    const id = window.setTimeout(() => setFlashOverlayVisible(false), 120);
    return () => window.clearTimeout(id);
  }, [uiState.shutterBlinkCounter]);

  // Bind live MediaStream to video element and track ready state to eliminate black preview screens
  useEffect(() => {
    const videoEl = videoRef.current;
    if (uiState.isVirtualSensor) {
      setIsPreviewReady(true);
      return;
    }
    if (!videoEl) return;
    if (mediaStream) {
      setIsPreviewReady(false);
      videoEl.srcObject = mediaStream;
      if (videoEl.readyState >= 2) {
        setIsPreviewReady(true);
      }
      void videoEl.play().catch(() => {
        // Autoplay promise rejection ignored when muted playsInline is set
      });
    } else {
      setIsPreviewReady(false);
      videoEl.srcObject = null;
    }
  }, [mediaStream, uiState.isVirtualSensor]);

  // Apply optical/track constraints cleanly if supported by active browser MediaStreamTrack
  useEffect(() => {
    if (!mediaStream || uiState.isVirtualSensor) return;
    const track = mediaStream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return;

    const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
    const advanced: Record<string, unknown> = {};

    if (caps.zoom) {
      const z = caps.zoom as { min?: number; max?: number };
      if (typeof z.min === 'number' && typeof z.max === 'number') {
        advanced.zoom = Math.min(z.max, Math.max(z.min, zoomRatio));
      }
    }
    if (caps.torch && uiState.captureDomain === 'VIDEO') {
      advanced.torch = uiState.videoSettings.isTorchEnabled;
    }
    if (Object.keys(advanced).length > 0) {
      void track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] }).catch(() => {
        // Silently ignore unsupported track constraint combinations
      });
    }
  }, [mediaStream, uiState.isVirtualSensor, zoomRatio, uiState.captureDomain, uiState.videoSettings.isTorchEnabled]);

  // Virtual Optical Sensor animation loop (battery/thermal aware pacing)
  useEffect(() => {
    if (!uiState.isVirtualSensor) return;
    let rafId = 0;
    const startMs = performance.now();
    let lastDrawMs = 0;

    const draw = (now: number) => {
      if (document.hidden || (isLowPowerMode && now - lastDrawMs < 42)) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastDrawMs = now;
      const canvas = virtualCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderVirtualSensorFrame(
            ctx,
            canvas.width,
            canvas.height,
            (now - startMs) / 1000,
            uiState.activeHardwareProfile?.lensFacing ?? uiState.lensOption,
            zoomRatio
          );
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [uiState.isVirtualSensor, uiState.activeHardwareProfile?.lensFacing, uiState.lensOption, zoomRatio, isLowPowerMode]);

  // DeviceOrientation level sensor listener
  useEffect(() => {
    if (!uiState.isLevelEnabled) return;
    const handleOrientation = (ev: DeviceOrientationEvent) => {
      if (typeof ev.gamma === 'number') {
        setRollDegrees(ev.gamma);
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [uiState.isLevelEnabled]);

  // Live Frame Analyzer (~12fps) for Histogram, Zebra, Focus Peaking, and Auto Scene
  const filterCss = buildViewfinderFilterCss(
    uiState.manualSettings,
    uiState.sensorCapabilities.currentExposureIndex,
    uiState.sensorCapabilities.exposureStep,
    uiState.photographyMode
  );
  const filterCssRef = useRef(filterCss);
  filterCssRef.current = filterCss;

  // Live GPU WebGL Viewfinder Filter Loop when any filter is active
  useEffect(() => {
    if (!isLiveFilterRendered) {
      if (viewfinderGlRef.current) {
        viewfinderGlRef.current.dispose();
        viewfinderGlRef.current = null;
      }
      return;
    }

    const canvas = filteredViewfinderCanvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLFilterRenderer(canvas, false);
    if (!renderer.isReady()) {
      renderer.dispose();
      setWebglUnavailable(true);
      return;
    }
    viewfinderGlRef.current = renderer;
    let rafId = 0;
    let lastRenderMs = 0;

    const renderLoop = (now: number) => {
      if (document.hidden || (isLowPowerMode && now - lastRenderMs < 40)) {
        rafId = requestAnimationFrame(renderLoop);
        return;
      }
      lastRenderMs = now;

      let src: TexImageSource | null = null;
      let sw = 0;
      let sh = 0;
      if (uiState.isVirtualSensor && virtualCanvasRef.current) {
        src = virtualCanvasRef.current;
        sw = virtualCanvasRef.current.width;
        sh = virtualCanvasRef.current.height;
      } else if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
        src = videoRef.current;
        sw = videoRef.current.videoWidth;
        sh = videoRef.current.videoHeight;
      }

      if (src && sw > 0 && sh > 0 && renderer.isReady()) {
        const maxPreview = 1280;
        const scale = Math.max(sw, sh) > maxPreview ? maxPreview / Math.max(sw, sh) : 1;
        const rw = Math.max(2, Math.round(sw * scale));
        const rh = Math.max(2, Math.round(sh * scale));

        const def = getFilterById(activeFilterRef.current);
        const effInt = activeFilterRef.current === 'original' ? 0 : filterIntensityRef.current;
        const curCss = filterCssRef.current;
        const gcamCfg = gcamEngineRef.current;
        const gcamLiveOn =
          captureDomainRef.current === 'PHOTO' && gcamCfg.hdrPlusMode !== 'OFF';
        const gcamStrength = gcamLiveOn
          ? gcamCfg.hdrPlusMode === 'HDR_PLUS_ENHANCED'
            ? 1.0
            : 0.72
          : 0.0;
        const gcamAcutance =
          gcamLiveOn &&
          gcamCfg.sabreSuperRes &&
          photographyModeRef.current !== 'NATURAL_COLOR'
            ? 1.0
            : 0.0;

        if (curCss !== 'none') {
          if (!proBridgeCanvasRef.current) {
            proBridgeCanvasRef.current = document.createElement('canvas');
          }
          const bridge = proBridgeCanvasRef.current;
          if (bridge.width !== rw || bridge.height !== rh) {
            bridge.width = rw;
            bridge.height = rh;
          }
          const bCtx = bridge.getContext('2d');
          if (bCtx) {
            bCtx.save();
            bCtx.filter = curCss;
            bCtx.drawImage(src as CanvasImageSource, 0, 0, rw, rh);
            bCtx.restore();
            renderer.render(bridge, rw, rh, def.grade, effInt, { gcamStrength, gcamAcutance });
          }
        } else {
          renderer.render(src, rw, rh, def.grade, effInt, { gcamStrength, gcamAcutance });
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      viewfinderGlRef.current = null;
    };
  }, [isLiveFilterRendered, uiState.isVirtualSensor, isLowPowerMode]);

  // Continuous Zero Shutter Lag (ZSL) Ring Buffer feeding multi-frame Sabre/HDR+ captures
  useEffect(() => {
    const wantsZsl =
      isPreviewReady &&
      uiState.captureDomain === 'PHOTO' &&
      preferences.gcamEngine.hdrPlusMode !== 'OFF' &&
      !isLowPowerMode;

    if (!wantsZsl) {
      zslRingRef.current?.clear();
      return;
    }

    if (!zslRingRef.current) {
      zslRingRef.current = new ZslFrameRingBuffer(15);
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden || !zslRingRef.current) return;
      let srcW = 0;
      let srcH = 0;
      let sourceEl: HTMLVideoElement | HTMLCanvasElement | null = null;
      if (uiState.isVirtualSensor && virtualCanvasRef.current) {
        sourceEl = virtualCanvasRef.current;
        srcW = sourceEl.width;
        srcH = sourceEl.height;
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        sourceEl = videoRef.current;
        srcW = videoRef.current.videoWidth;
        srcH = videoRef.current.videoHeight;
      }
      if (!sourceEl || srcW <= 0 || srcH <= 0) return;

      const arOpt = ASPECT_RATIO_OPTIONS.find((a) => a.id === uiState.aspectRatio);
      let drawW = srcW;
      let drawH = srcH;
      if (arOpt?.ratioValue) {
        const targetRatio = arOpt.ratioValue;
        const srcRatio = srcW / srcH;
        if (srcRatio > targetRatio) {
          drawW = Math.round(srcH * targetRatio);
        } else {
          drawH = Math.round(srcW / targetRatio);
        }
      }
      const cropZoom = uiState.isVirtualSensor ? 1 : Math.max(1, zoomRatio);
      const sw = Math.max(64, drawW / cropZoom);
      const sh = Math.max(64, drawH / cropZoom);
      const sx = Math.max(0, (srcW - sw) / 2);
      const sy = Math.max(0, (srcH - sh) / 2);

      zslRingRef.current.pushCroppedFrame(
        sourceEl,
        sx,
        sy,
        sw,
        sh,
        Math.round(sw),
        Math.round(sh),
        Boolean(isFrontCamera && uiState.isFrontMirrorEnabled),
        filterCss
      );
    }, 130);

    return () => {
      window.clearInterval(intervalId);
      zslRingRef.current?.clear();
    };
  }, [
    isPreviewReady,
    uiState.captureDomain,
    uiState.activeCameraId,
    uiState.isVirtualSensor,
    uiState.aspectRatio,
    uiState.isFrontMirrorEnabled,
    preferences.gcamEngine.hdrPlusMode,
    isFrontCamera,
    zoomRatio,
    filterCss,
    isLowPowerMode,
  ]);

  // Generate real-time filter preview thumbnails from current camera feed when Filter tray opens
  useEffect(() => {
    if (!uiState.isFilterPanelOpen) return;

    const refreshThumbnails = () => {
      let src: TexImageSource | null = null;
      let sw = 0;
      let sh = 0;
      if (uiState.isVirtualSensor && virtualCanvasRef.current) {
        src = virtualCanvasRef.current;
        sw = virtualCanvasRef.current.width;
        sh = virtualCanvasRef.current.height;
      } else if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
        src = videoRef.current;
        sw = videoRef.current.videoWidth;
        sh = videoRef.current.videoHeight;
      }

      if (src && sw > 0 && sh > 0) {
        const thumbs = renderFilterThumbnailUrls(
          src,
          sw,
          sh,
          CAMERA_FILTERS.map((f) => f.id)
        );
        if (Object.keys(thumbs).length > 0) {
          setFilterThumbnails(thumbs);
        }
      }
    };

    const timerId = window.setTimeout(refreshThumbnails, 80);
    return () => window.clearTimeout(timerId);
  }, [uiState.isFilterPanelOpen, isPreviewReady, uiState.activeCameraId, uiState.isVirtualSensor]);

  useEffect(() => {
    const needsAnalysis =
      uiState.manualSettings.isHistogramEnabled ||
      uiState.manualSettings.isZebraEnabled ||
      uiState.manualSettings.isFocusPeakingEnabled ||
      (uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'AUTO_SCENE');

    if (!needsAnalysis) return;

    if (!analysisCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 180;
      analysisCanvasRef.current = c;
    }

    const analyzerIntervalMs = isLowPowerMode ? 260 : 85;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      const targetCanvas = analysisCanvasRef.current;
      if (!targetCanvas) return;
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const source: CanvasImageSource | null = uiState.isVirtualSensor
        ? virtualCanvasRef.current
        : videoRef.current && videoRef.current.readyState >= 2
          ? videoRef.current
          : null;

      if (!source) return;
      const t0 = performance.now();
      ctx.save();
      ctx.filter = filterCss;
      ctx.drawImage(source, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.restore();

      const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
      const { analysis, detectedScene } = analyzeImageData(imgData, {
        isHistogramEnabled: uiState.manualSettings.isHistogramEnabled,
        isZebraEnabled: uiState.manualSettings.isZebraEnabled,
        zebraThresholdPercent: uiState.manualSettings.zebraThresholdPercent,
        isFocusPeakingEnabled: uiState.manualSettings.isFocusPeakingEnabled,
        isAutoSceneEnabled: uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'AUTO_SCENE',
      });
      const elapsed = performance.now() - t0;
      if (elapsed > 28) {
        slowAnalysisCountRef.current += 1;
        if (slowAnalysisCountRef.current >= 3) {
          setIsThermalThrottled(true);
        }
      } else if (elapsed < 14) {
        slowAnalysisCountRef.current = 0;
        if (isThermalThrottled) setIsThermalThrottled(false);
      }
      onUpdateAnalysis(analysis, detectedScene);
    }, analyzerIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [
    uiState.isVirtualSensor,
    uiState.manualSettings.isHistogramEnabled,
    uiState.manualSettings.isZebraEnabled,
    uiState.manualSettings.zebraThresholdPercent,
    uiState.manualSettings.isFocusPeakingEnabled,
    uiState.captureDomain,
    uiState.photographyMode,
    filterCss,
    isLowPowerMode,
    isThermalThrottled,
    onUpdateAnalysis,
  ]);

  // Helper: Render current viewfinder frame at native pixel fidelity (zero artificial upscaling)
  const captureCurrentFrameToCanvas = useCallback(
    (skipPortraitOverlay = false): HTMLCanvasElement | null => {
      let srcW = 0;
      let srcH = 0;
      let sourceEl: HTMLVideoElement | HTMLCanvasElement | null = null;

      if (uiState.isVirtualSensor) {
        sourceEl = virtualCanvasRef.current;
        if (sourceEl) {
          srcW = sourceEl.width;
          srcH = sourceEl.height;
        }
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        sourceEl = videoRef.current;
        srcW = videoRef.current.videoWidth;
        srcH = videoRef.current.videoHeight;
      }

      if (!sourceEl || srcW <= 0 || srcH <= 0) return null;

      // Crop to selected aspect ratio without exceeding source bounds
      const arOpt = ASPECT_RATIO_OPTIONS.find((a) => a.id === uiState.aspectRatio);
      let drawW = srcW;
      let drawH = srcH;
      if (arOpt?.ratioValue) {
        const targetRatio = arOpt.ratioValue;
        const srcRatio = srcW / srcH;
        if (srcRatio > targetRatio) {
          drawW = Math.round(srcH * targetRatio);
        } else {
          drawH = Math.round(srcW / targetRatio);
        }
      }

      // Apply digital zoom crop (if physical video track; virtual canvas renders zoom natively)
      const cropZoom = uiState.isVirtualSensor ? 1 : Math.max(1, zoomRatio);
      const sw = Math.max(64, drawW / cropZoom);
      const sh = Math.max(64, drawH / cropZoom);
      const sx = Math.max(0, (srcW - sw) / 2);
      const sy = Math.max(0, (srcH - sh) / 2);

      // Guarantee zero artificial upscaling: output dimensions are strictly <= cropped native source pixels
      const scaleDown = Math.max(sw, sh) > 4032 ? 4032 / Math.max(sw, sh) : 1;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = Math.max(64, Math.min(srcW, Math.round(sw * scaleDown)));
      outCanvas.height = Math.max(64, Math.min(srcH, Math.round(sh * scaleDown)));

      const ctx = outCanvas.getContext('2d');
      if (!ctx) {
        outCanvas.width = 0;
        outCanvas.height = 0;
        return null;
      }

      ctx.save();
      ctx.filter = filterCss;

      if (isFrontCamera && uiState.isFrontMirrorEnabled) {
        ctx.translate(outCanvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(sourceEl, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);

      if (!skipPortraitOverlay && uiState.photographyMode === 'PORTRAIT' && !preferences.gcamEngine.f17PortraitDepth) {
        const grad = ctx.createRadialGradient(
          outCanvas.width / 2,
          outCanvas.height / 2,
          outCanvas.width * 0.25,
          outCanvas.width / 2,
          outCanvas.height / 2,
          outCanvas.width * 0.72
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      }
      ctx.restore();

      return outCanvas;
    },
    [
      uiState.isVirtualSensor,
      uiState.aspectRatio,
      uiState.isFrontMirrorEnabled,
      uiState.photographyMode,
      preferences.gcamEngine.f17PortraitDepth,
      filterCss,
      isFrontCamera,
      zoomRatio,
    ]
  );

  const encodeAndSaveCanvas = useCallback(
    async (
      canvas: HTMLCanvasElement,
      suffixTag: string | null,
      keepBurstCount = false,
      filterMeta?: {
        filterName?: string;
        filterIntensity?: number;
        isRawOriginal?: boolean;
        gcamReport?: GCamProcessReport | null;
      } | null
    ): Promise<void> => {
      try {
        const encoding = getImageEncodingConfig(
          preferences.saveImageQuality,
          uiState.captureSpeedMode === 'QUICK'
        );
        const outW = canvas.width;
        const outH = canvas.height;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('Failed to encode photo'))),
            encoding.mimeType,
            encoding.quality
          );
        });
        const ts = Date.now();
        const url = URL.createObjectURL(blob);
        const effectiveIso = uiState.manualSettings.isManualIsoEnabled
          ? uiState.manualSettings.manualIso
          : uiState.liveTelemetry.iso;
        const effectiveNs = uiState.manualSettings.isManualShutterEnabled
          ? uiState.manualSettings.manualShutterNs
          : uiState.liveTelemetry.shutterNs;
        const prefixName = suffixTag ? `${fileBasePrefix}_${suffixTag}` : fileBasePrefix;
        onMediaCaptured(
          {
            id: `${prefixName}_${ts}_${Math.random().toString(36).slice(2, 6)}`,
            url,
            blob,
            width: outW,
            height: outH,
            sizeBytes: blob.size,
            displayName: `${prefixName}_${ts}.${encoding.ext}`,
            timestampMillis: ts,
            isVideo: false,
            durationMs: 0,
            mimeType: encoding.mimeType,
            videoFrameRate: null,
            isHdrVideo: false,
            isFavorite: false,
            captureMeta: preferences.privacy.stripMetadataOnSave
              ? undefined
              : {
                  cameraLabel: uiState.activeHardwareProfile?.label,
                  lensLabel: uiState.activeHardwareProfile?.facingLabel,
                  iso: effectiveIso,
                  shutterSpeed: effectiveNs ? formatShutterSpeed(effectiveNs) : null,
                  aperture:
                    uiState.photographyMode === 'PORTRAIT' && preferences.gcamEngine.f17PortraitDepth
                      ? 1.7
                      : (uiState.liveTelemetry.aperture ?? uiState.activeHardwareProfile?.apertures[0] ?? null),
                  whiteBalance:
                    uiState.manualSettings.whiteBalanceMode === 'MANUAL_KELVIN'
                      ? `${uiState.manualSettings.manualKelvin}K`
                      : WHITE_BALANCE_META[uiState.manualSettings.whiteBalanceMode].label,
                  mode: uiState.photographyMode,
                  format: encoding.ext.toUpperCase(),
                  ...(filterMeta?.gcamReport
                    ? {
                        computationalEngine: filterMeta.gcamReport.engineLabel,
                        framesMerged: filterMeta.gcamReport.framesMerged,
                        topShotSummary: filterMeta.gcamReport.topShotSummary,
                        hdrDynamicRange: filterMeta.gcamReport.hdrDynamicRange,
                        awbCalibration: filterMeta.gcamReport.awbCalibration,
                      }
                    : {}),
                  ...(filterMeta?.filterName
                    ? {
                        filterName: filterMeta.filterName,
                        filterIntensity: filterMeta.filterIntensity,
                      }
                    : {}),
                  ...(filterMeta?.isRawOriginal ? { isRawOriginal: true } : {}),
                },
          },
          keepBurstCount
        );
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    [
      preferences.saveImageQuality,
      preferences.privacy.stripMetadataOnSave,
      preferences.gcamEngine.f17PortraitDepth,
      fileBasePrefix,
      uiState.captureSpeedMode,
      uiState.manualSettings,
      uiState.liveTelemetry,
      uiState.activeHardwareProfile,
      uiState.photographyMode,
      onMediaCaptured,
    ]
  );

  // Helper: Run GCam Pro Max Engine + optional GPU color filter while preserving RAW/original when requested
  const saveCanvasWithFilterPipeline = useCallback(
    async (
      canvas: HTMLCanvasElement,
      suffixTag: string | null,
      keepBurstCount = false,
      auxCanvases: HTMLCanvasElement[] = []
    ): Promise<void> => {
      const shouldFilter =
        uiState.activeFilterId !== 'original' &&
        uiState.filterIntensity > 0 &&
        !isCompareOriginalHeld;

      const shouldPreserveOriginal =
        (shouldFilter && uiState.preserveOriginalOnFilteredCapture) ||
        uiState.manualSettings.isRawCaptureEnabled;

      if (shouldPreserveOriginal) {
        const origClone = document.createElement('canvas');
        origClone.width = canvas.width;
        origClone.height = canvas.height;
        const oCtx = origClone.getContext('2d');
        if (oCtx) {
          oCtx.drawImage(canvas, 0, 0);
          const origTag = uiState.manualSettings.isRawCaptureEnabled
            ? suffixTag
              ? `${suffixTag}_RAW`
              : 'RAW_ORIG'
            : suffixTag
              ? `${suffixTag}_ORIG`
              : 'ORIG';
          await encodeAndSaveCanvas(origClone, origTag, true, {
            isRawOriginal: uiState.manualSettings.isRawCaptureEnabled,
          });
        }
      }

      // Apply GCam Pro Max Engine (ZSL/Sabre multi-frame merge, HDR+ highlights/shadows, Pixel AWB, Chroma denoise, f/1.7 depth)
      let focusNormalized: { x: number; y: number } | null = null;
      if (uiState.focusPoint && viewfinderBoxRef.current) {
        const rect = viewfinderBoxRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          focusNormalized = {
            x: Math.min(1, Math.max(0, uiState.focusPoint.x / rect.width)),
            y: Math.min(1, Math.max(0, uiState.focusPoint.y / rect.height)),
          };
        }
      }

      const gcamReport = processGCamProMaxCanvas(canvas, auxCanvases, {
        engine: preferences.gcamEngine,
        photographyMode: uiState.photographyMode,
        isAutoWhiteBalance: uiState.manualSettings.whiteBalanceMode === 'AUTO',
        focusNormalized,
        isLowLightScene: uiState.detectedAutoScene === 'Low Light Scene',
      });

      if (!shouldFilter) {
        await encodeAndSaveCanvas(canvas, suffixTag, keepBurstCount, {
          gcamReport,
        });
        return;
      }

      const def = getFilterById(uiState.activeFilterId);
      applyFilterToCanvas(canvas, uiState.activeFilterId, uiState.filterIntensity);
      const filterSlug = def.shortLabel.replace(/\s+/g, '');
      const filteredTag = suffixTag ? `${suffixTag}_${filterSlug}` : filterSlug;
      await encodeAndSaveCanvas(canvas, filteredTag, keepBurstCount, {
        filterName: def.name,
        filterIntensity: uiState.filterIntensity,
        gcamReport,
      });
    },
    [
      uiState.activeFilterId,
      uiState.filterIntensity,
      uiState.preserveOriginalOnFilteredCapture,
      uiState.manualSettings.isRawCaptureEnabled,
      uiState.manualSettings.whiteBalanceMode,
      uiState.focusPoint,
      uiState.photographyMode,
      uiState.detectedAutoScene,
      preferences.gcamEngine,
      isCompareOriginalHeld,
      encodeAndSaveCanvas,
    ]
  );

  const releasePanoramaSlices = useCallback(() => {
    panoramaSlicesRef.current.forEach((slice) => {
      slice.width = 0;
      slice.height = 0;
    });
    panoramaSlicesRef.current = [];
  }, []);

  // Panorama Actions
  const handleCapturePanoramaSlice = useCallback(() => {
    const canvas = captureCurrentFrameToCanvas();
    if (!canvas) {
      onReportError('Camera preview is not ready yet. Wait a moment before capturing panorama slices.');
      return;
    }
    try {
      if (
        uiState.activeFilterId !== 'original' &&
        uiState.filterIntensity > 0 &&
        !isCompareOriginalHeld
      ) {
        applyFilterToCanvas(canvas, uiState.activeFilterId, uiState.filterIntensity);
      }

      const sliceCanvas = document.createElement('canvas');
      const targetH = Math.min(1080, canvas.height);
      const targetW = Math.round((canvas.width / canvas.height) * targetH);
      sliceCanvas.width = targetW;
      sliceCanvas.height = targetH;
      const sCtx = sliceCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, targetW, targetH);
      }

      panoramaSlicesRef.current.push(sliceCanvas);
      onTriggerShutterFlash();

      const nextCount = panoramaSlicesRef.current.length;
      onUpdatePanoramaState({
        isActive: true,
        capturedSlicesCount: nextCount,
        currentYawDeg: (nextCount - 1) * uiState.panoramaState.targetStepDeg,
        statusHint:
          nextCount >= uiState.panoramaState.maxSlices
            ? 'Max frames reached — ready to stitch'
            : `Captured ${nextCount}/${uiState.panoramaState.maxSlices} frames. Pan right and capture next slice.`,
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [
    captureCurrentFrameToCanvas,
    uiState.activeFilterId,
    uiState.filterIntensity,
    isCompareOriginalHeld,
    onReportError,
    onTriggerShutterFlash,
    onUpdatePanoramaState,
    uiState.panoramaState.maxSlices,
    uiState.panoramaState.targetStepDeg,
  ]);

  const handleFinishPanoramaStitch = useCallback(async () => {
    const slices = panoramaSlicesRef.current;
    if (slices.length < 2) return;
    onUpdatePanoramaState({ isStitching: true, statusHint: 'Feather-blending panorama frames…' });
    try {
      const { blob, width, height } = await stitchPanoramaSlices(slices);
      const ts = Date.now();
      const url = URL.createObjectURL(blob);
      onMediaCaptured({
        id: `PANO_${ts}`,
        url,
        blob,
        width,
        height,
        sizeBytes: blob.size,
        displayName: `${fileBasePrefix}_PANO_${ts}.jpg`,
        timestampMillis: ts,
        isVideo: false,
        durationMs: 0,
        mimeType: 'image/jpeg',
        videoFrameRate: null,
        isHdrVideo: false,
        isFavorite: false,
        captureMeta: preferences.privacy.stripMetadataOnSave
          ? undefined
          : {
              cameraLabel: uiState.activeHardwareProfile?.label,
              lensLabel: uiState.activeHardwareProfile?.facingLabel,
              mode: 'PANORAMA',
              format: 'JPEG',
            },
      });
    } catch (err) {
      onReportError(err instanceof Error ? err.message : 'Failed to stitch panorama frames.');
    } finally {
      releasePanoramaSlices();
      onUpdatePanoramaState({
        isActive: false,
        isStitching: false,
        capturedSlicesCount: 0,
        currentYawDeg: 0,
        statusHint: 'Tap shutter to start panorama sweep',
      });
    }
  }, [
    fileBasePrefix,
    preferences.privacy.stripMetadataOnSave,
    uiState.activeHardwareProfile,
    onMediaCaptured,
    onUpdatePanoramaState,
    onReportError,
    releasePanoramaSlices,
  ]);

  const handleCancelPanorama = useCallback(() => {
    releasePanoramaSlices();
    onUpdatePanoramaState({
      isActive: false,
      isStitching: false,
      capturedSlicesCount: 0,
      currentYawDeg: 0,
      statusHint: 'Tap shutter to start panorama sweep',
    });
  }, [onUpdatePanoramaState, releasePanoramaSlices]);

  // Execute Still Capture (Single, Computational Mode, Burst, or Panorama)
  const executePhotoCapture = useCallback(async () => {
    if (uiState.photographyMode === 'PANORAMA') {
      if (!uiState.panoramaState.isActive) {
        releasePanoramaSlices();
        onUpdatePanoramaState({
          isActive: true,
          capturedSlicesCount: 0,
          currentYawDeg: 0,
          statusHint: 'Pan slowly across scene and tap + Slice',
        });
      }
      handleCapturePanoramaSlice();
      return;
    }

    onSetCapturingState(true, uiState.isBurstModeEnabled && isBurstEligible ? 0 : null);
    let shouldScreenFill = false;
    try {
      if (uiState.isBurstModeEnabled && isBurstEligible) {
        let savedAny = false;
        for (let i = 1; i <= 5; i++) {
          onSetCapturingState(true, i);
          onTriggerShutterFlash();
          const canvas = captureCurrentFrameToCanvas();
          if (canvas) {
            await saveCanvasWithFilterPipeline(canvas, `BURST_${i}`, true);
            savedAny = true;
          }
          await new Promise((r) => window.setTimeout(r, 110));
        }
        if (!savedAny) {
          onReportError('Camera frame unavailable for burst capture.');
        }
        return;
      }

      shouldScreenFill = isFrontCamera && uiState.flashSetting === 'ON' && preferences.frontScreenFlash;
      if (shouldScreenFill) {
        setScreenFillFlashActive(true);
        await new Promise((r) => window.setTimeout(r, 150));
      }
      onTriggerShutterFlash();
      const canvas = captureCurrentFrameToCanvas(true);
      if (!canvas) {
        onReportError('Camera preview frame unavailable yet. Please try again once preview settles.');
        return;
      }

      // Collect up to 15 ZSL + rapid Sabre frames for Top Shot selection & HDR+ Enhanced merge
      const zslAuxFrames =
        preferences.gcamEngine.hdrPlusMode !== 'OFF'
          ? (zslRingRef.current?.getRecentFrames(2200) ?? [])
          : [];
      const tempBurstFrames: HTMLCanvasElement[] = [];

      const wantsEnhancedBurst =
        (preferences.gcamEngine.hdrPlusMode === 'HDR_PLUS_ENHANCED' ||
          uiState.photographyMode === 'HDR' ||
          uiState.photographyMode === 'NIGHT' ||
          uiState.photographyMode === 'LOW_LIGHT') &&
        uiState.captureSpeedMode !== 'QUICK';

      if (wantsEnhancedBurst && !isLowPowerMode) {
        const extraFrames =
          uiState.photographyMode === 'NIGHT' || uiState.photographyMode === 'LOW_LIGHT' ? 3 : 2;
        for (let f = 0; f < extraFrames; f++) {
          await new Promise((r) => window.setTimeout(r, 18));
          const extra = captureCurrentFrameToCanvas(true);
          if (extra) tempBurstFrames.push(extra);
        }
      }

      try {
        const modeTag = uiState.photographyMode === 'STANDARD' ? null : uiState.photographyMode;
        await saveCanvasWithFilterPipeline(canvas, modeTag, false, [
          ...tempBurstFrames,
          ...zslAuxFrames,
        ]);
      } finally {
        tempBurstFrames.forEach((c) => {
          c.width = 0;
          c.height = 0;
        });
      }
    } catch (err) {
      onReportError(err instanceof Error ? err.message : 'Photo capture failed.');
    } finally {
      if (shouldScreenFill) {
        setScreenFillFlashActive(false);
      }
      onSetCapturingState(false, null);
    }
  }, [
    uiState.photographyMode,
    uiState.panoramaState.isActive,
    uiState.isBurstModeEnabled,
    uiState.flashSetting,
    uiState.captureSpeedMode,
    isFrontCamera,
    isLowPowerMode,
    preferences.frontScreenFlash,
    preferences.gcamEngine.hdrPlusMode,
    isBurstEligible,
    releasePanoramaSlices,
    onUpdatePanoramaState,
    handleCapturePanoramaSlice,
    onSetCapturingState,
    onTriggerShutterFlash,
    captureCurrentFrameToCanvas,
    saveCanvasWithFilterPipeline,
    onReportError,
  ]);

  const stopMicStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  const stopOwnedRecordingTracks = useCallback(() => {
    if (recordingRafRef.current !== null) {
      cancelAnimationFrame(recordingRafRef.current);
      recordingRafRef.current = null;
    }
    if (recordingGlRendererRef.current) {
      recordingGlRendererRef.current.dispose();
      recordingGlRendererRef.current = null;
    }
    if (recBridgeCanvasRef.current) {
      recBridgeCanvasRef.current.width = 0;
      recBridgeCanvasRef.current.height = 0;
      recBridgeCanvasRef.current = null;
    }
    recordingDimensionsRef.current = null;
    ownedRecordingTracksRef.current.forEach((t) => t.stop());
    ownedRecordingTracksRef.current = [];
  }, []);

  // Video Recording Controls
  const stopVideoRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopMicStream();
      stopOwnedRecordingTracks();
      return;
    }
    onUpdateVideoRecordingState({ isFinalizing: true });
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      recorder.stop();
    } catch {
      stopMicStream();
      stopOwnedRecordingTracks();
      onUpdateVideoRecordingState({ isRecording: false, isPaused: false, isFinalizing: false });
    }
  }, [onUpdateVideoRecordingState, stopMicStream, stopOwnedRecordingTracks]);

  const startVideoRecording = useCallback(async () => {
    if (document.hidden) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return;

    let videoTracks: MediaStreamTrack[] = [];
    stopOwnedRecordingTracks();
    stopMicStream();

    const fps = Math.min(60, uiState.videoSettings.fps);
    const shouldUseGpuVideoFilter =
      uiState.isVirtualSensor ||
      (uiState.activeFilterId !== 'original' && uiState.filterIntensity > 0) ||
      filterCss !== 'none';

    if (shouldUseGpuVideoFilter) {
      const recSrc: HTMLCanvasElement | HTMLVideoElement | null = uiState.isVirtualSensor
        ? virtualCanvasRef.current
        : videoRef.current && videoRef.current.readyState >= 2
          ? videoRef.current
          : null;

      if (!recSrc) {
        onReportError('Camera video frame unavailable. Please wait for preview initialization.');
        return;
      }

      if (!uiState.isVirtualSensor && mediaStream) {
        const primaryTrack = mediaStream.getVideoTracks()[0];
        if (primaryTrack && typeof primaryTrack.applyConstraints === 'function') {
          const spec = VIDEO_QUALITY_META[uiState.videoSettings.quality];
          void primaryTrack
            .applyConstraints({
              width: { ideal: spec.nominalWidth },
              height: { ideal: spec.nominalHeight },
              frameRate: { ideal: fps },
            })
            .catch(() => {});
        }
      }

      const recW = uiState.isVirtualSensor
        ? virtualCanvasRef.current?.width ?? 1280
        : videoRef.current?.videoWidth || 1280;
      const recH = uiState.isVirtualSensor
        ? virtualCanvasRef.current?.height ?? 720
        : videoRef.current?.videoHeight || 720;

      const recGl = new WebGLFilterRenderer(undefined, false);
      if (!recGl.isReady() || typeof recGl.canvas.captureStream !== 'function') {
        recGl.dispose();
        onReportError('GPU video filter stream is unsupported in this browser.');
        return;
      }

      recordingGlRendererRef.current = recGl;
      recordingDimensionsRef.current = { width: recW, height: recH };

      const drawFilteredVideoFrame = () => {
        const srcEl: TexImageSource | null = uiState.isVirtualSensor
          ? virtualCanvasRef.current
          : videoRef.current && videoRef.current.readyState >= 2
            ? videoRef.current
            : null;
        if (!srcEl || !recGl.isReady()) return;

        const cz = uiState.isVirtualSensor ? 1 : Math.max(1, zoomRatioRef.current);
        const cw = 1 / cz;
        const ch = 1 / cz;
        const cropRect: [number, number, number, number] = [(1 - cw) / 2, (1 - ch) / 2, cw, ch];
        const mirrorX = Boolean(isFrontCameraRef.current && isFrontMirrorRef.current);

        const fid = compareHeldRef.current ? 'original' : activeFilterRef.current;
        const def = getFilterById(fid);
        const effInt = fid === 'original' ? 0 : filterIntensityRef.current;

        if (filterCssRef.current !== 'none') {
          if (!recBridgeCanvasRef.current) {
            recBridgeCanvasRef.current = document.createElement('canvas');
          }
          const bridge = recBridgeCanvasRef.current;
          if (bridge.width !== recW || bridge.height !== recH) {
            bridge.width = recW;
            bridge.height = recH;
          }
          const bCtx = bridge.getContext('2d');
          if (bCtx) {
            bCtx.save();
            bCtx.filter = filterCssRef.current;
            bCtx.drawImage(srcEl as CanvasImageSource, 0, 0, recW, recH);
            bCtx.restore();
            recGl.render(bridge, recW, recH, def.grade, effInt, { mirrorX, cropRect });
          }
        } else {
          recGl.render(srcEl, recW, recH, def.grade, effInt, { mirrorX, cropRect });
        }
      };

      drawFilteredVideoFrame();
      const canvasStream = recGl.canvas.captureStream(fps);
      videoTracks = canvasStream.getVideoTracks();
      ownedRecordingTracksRef.current = [...videoTracks];

      const pumpRec = () => {
        if (pauseStartedAtRef.current === 0) {
          drawFilteredVideoFrame();
        }
        recordingRafRef.current = requestAnimationFrame(pumpRec);
      };
      recordingRafRef.current = requestAnimationFrame(pumpRec);
    } else if (mediaStream) {
      videoTracks = mediaStream.getVideoTracks().filter((t) => t.readyState === 'live');
      const primaryTrack = videoTracks[0];
      if (primaryTrack && typeof primaryTrack.applyConstraints === 'function') {
        const spec = VIDEO_QUALITY_META[uiState.videoSettings.quality];
        void primaryTrack
          .applyConstraints({
            width: { ideal: spec.nominalWidth },
            height: { ideal: spec.nominalHeight },
            frameRate: { ideal: fps },
          })
          .catch(() => {});
      }
    }

    if (videoTracks.length === 0) {
      stopOwnedRecordingTracks();
      onReportError('Camera video track unavailable. Please wait for preview initialization.');
      return;
    }

    // Request microphone strictly on demand when recording with audio enabled
    let micStream: MediaStream | null = null;
    const wantsMic =
      uiState.videoSettings.isAudioEnabled && preferences.audioRecordingPref !== 'MUTE';
    if (wantsMic && navigator.mediaDevices?.getUserMedia) {
      const audioConstraints: boolean | MediaTrackConstraints =
        preferences.audioRecordingPref === 'HIGH_QUALITY_STEREO'
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              channelCount: 2,
            }
          : true;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
        if (document.hidden) {
          micStream.getTracks().forEach((t) => t.stop());
          stopOwnedRecordingTracks();
          return;
        }
        micStreamRef.current = micStream;
      } catch {
        onReportError('Microphone permission denied or unavailable — recording video without audio.');
      }
    }

    const combinedStream = new MediaStream([
      ...videoTracks,
      ...(micStream ? micStream.getAudioTracks() : []),
    ]);

    const candidateMimes = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const mimeType =
      candidateMimes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ??
      '';

    recordedChunksRef.current = [];
    recordedBytesRef.current = 0;

    try {
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;
      const targetBps =
        uiState.videoSettings.bitrate === 'AUTO'
          ? 12_000_000
          : ({
              AUTO: 12_000_000,
              MBPS_10: 10_000_000,
              MBPS_20: 20_000_000,
              MBPS_35: 35_000_000,
              MBPS_50: 50_000_000,
              MBPS_80: 80_000_000,
            }[uiState.videoSettings.bitrate] ?? 12_000_000);
      options.videoBitsPerSecond = targetBps;

      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

      const recordedFilterDef =
        uiState.activeFilterId !== 'original' && uiState.filterIntensity > 0
          ? getFilterById(uiState.activeFilterId)
          : null;
      const recordedFilterIntensity = uiState.filterIntensity;

      const audioTracks = combinedStream.getAudioTracks();
      const hasAudioTrack = wantsMic && audioTracks.length > 0;

      if (hasAudioTrack && typeof AudioContext !== 'undefined') {
        try {
          const actx = new AudioContext();
          const src = actx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
          const analyser = actx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          audioCtxRef.current = actx;
          analyserRef.current = analyser;
        } catch {
          // Ignore audio analyser failures
        }
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
          recordedBytesRef.current += ev.data.size;
        }
      };

      recorder.onerror = () => {
        stopMicStream();
        stopOwnedRecordingTracks();
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        if (audioCtxRef.current) {
          void audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
          analyserRef.current = null;
        }
        onReportError('Video recorder encountered an error and stopped.');
        onUpdateVideoRecordingState({
          isRecording: false,
          isPaused: false,
          isFinalizing: false,
          hasAudioTrack: false,
        });
      };

      recorder.onstop = () => {
        const w =
          recordingDimensionsRef.current?.width ??
          (uiState.isVirtualSensor
            ? (virtualCanvasRef.current?.width ?? 1280)
            : (videoRef.current?.videoWidth || 1280));
        const h =
          recordingDimensionsRef.current?.height ??
          (uiState.isVirtualSensor
            ? (virtualCanvasRef.current?.height ?? 720)
            : (videoRef.current?.videoHeight || 720));

        stopMicStream();
        stopOwnedRecordingTracks();
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }

        const finalMime = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        recordedChunksRef.current = [];
        const ts = Date.now();
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const durationMs = Math.max(
          500,
          Date.now() - recordStartTimeRef.current - pausedAccumMsRef.current
        );

        if (audioCtxRef.current) {
          void audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
          analyserRef.current = null;
        }

        if (blob.size > 0) {
          onMediaCaptured({
            id: `VID_${ts}`,
            url: URL.createObjectURL(blob),
            blob,
            width: w,
            height: h,
            sizeBytes: blob.size,
            displayName: `${fileBasePrefix}_VID_${ts}.${ext}`,
            timestampMillis: ts,
            isVideo: true,
            durationMs,
            mimeType: finalMime,
            videoFrameRate: uiState.videoSettings.fps,
            isHdrVideo: uiState.videoSettings.isHdrEnabled,
            isFavorite: false,
            captureMeta: preferences.privacy.stripMetadataOnSave
              ? undefined
              : {
                  cameraLabel: uiState.activeHardwareProfile?.label,
                  lensLabel: uiState.activeHardwareProfile?.facingLabel,
                  mode: 'VIDEO',
                  format: ext.toUpperCase(),
                  ...(recordedFilterDef
                    ? {
                        filterName: recordedFilterDef.name,
                        filterIntensity: recordedFilterIntensity,
                      }
                    : {}),
                },
          });
        } else {
          onReportError('Recorded video was empty and could not be saved.');
        }

        onUpdateVideoRecordingState({
          isRecording: false,
          isPaused: false,
          isFinalizing: false,
          elapsedDurationMs: 0,
          recordedBytes: 0,
          audioAmplitude: 0,
          hasAudioTrack: false,
        });
      };

      recordStartTimeRef.current = Date.now();
      pausedAccumMsRef.current = 0;
      pauseStartedAtRef.current = 0;

      recorder.start(500);

      onUpdateVideoRecordingState({
        isRecording: true,
        isPaused: false,
        isFinalizing: false,
        elapsedDurationMs: 0,
        recordedBytes: 0,
        hasAudioTrack,
      });

      recordTimerRef.current = window.setInterval(() => {
        if (pauseStartedAtRef.current !== 0) return;
        let amplitude = 0;
        if (analyserRef.current) {
          const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteTimeDomainData(buf);
          let maxDev = 0;
          for (let i = 0; i < buf.length; i++) {
            const dev = Math.abs(buf[i] - 128) / 128;
            if (dev > maxDev) maxDev = dev;
          }
          amplitude = Math.min(1, maxDev * 2.5);
        }
        onUpdateVideoRecordingState({
          elapsedDurationMs: Math.max(0, Date.now() - recordStartTimeRef.current - pausedAccumMsRef.current),
          recordedBytes: recordedBytesRef.current,
          audioAmplitude: amplitude,
        });
      }, 200);
    } catch (err) {
      stopMicStream();
      stopOwnedRecordingTracks();
      onReportError(err instanceof Error ? err.message : 'Unable to start video recording.');
      onUpdateVideoRecordingState({
        isRecording: false,
        isPaused: false,
        isFinalizing: false,
        hasAudioTrack: false,
      });
    }
  }, [
    uiState.isVirtualSensor,
    uiState.activeFilterId,
    uiState.filterIntensity,
    uiState.videoSettings.quality,
    uiState.videoSettings.fps,
    uiState.videoSettings.bitrate,
    uiState.videoSettings.isAudioEnabled,
    uiState.videoSettings.isHdrEnabled,
    uiState.activeHardwareProfile,
    preferences.audioRecordingPref,
    preferences.privacy.stripMetadataOnSave,
    filterCss,
    fileBasePrefix,
    mediaStream,
    stopMicStream,
    stopOwnedRecordingTracks,
    onReportError,
    onMediaCaptured,
    onUpdateVideoRecordingState,
  ]);

  const handlePauseResumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      pauseStartedAtRef.current = Date.now();
      onUpdateVideoRecordingState({ isPaused: true });
    } else if (recorder.state === 'paused') {
      recorder.resume();
      if (pauseStartedAtRef.current > 0) {
        pausedAccumMsRef.current += Date.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = 0;
      }
      onUpdateVideoRecordingState({ isPaused: false });
    }
  }, [onUpdateVideoRecordingState]);

  // Automatically finalize recording and release microphone immediately when app goes to background
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopVideoRecording();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [stopVideoRecording]);

  // Unified Shutter Trigger (respects timer countdown & video toggle)
  const handleShutterTrigger = useCallback(() => {
    if (uiState.countdownRemainingSeconds !== null) {
      onCancelCountdown();
      return;
    }

    if (uiState.captureDomain === 'VIDEO') {
      if (uiState.videoRecordingState.isRecording) {
        stopVideoRecording();
      } else if (uiState.shutterTimer !== 'OFF') {
        onStartCountdown(() => {
          void startVideoRecording();
        });
      } else {
        void startVideoRecording();
      }
      return;
    }

    if (uiState.shutterTimer !== 'OFF' && !uiState.panoramaState.isActive) {
      onStartCountdown(() => {
        void executePhotoCapture();
      });
    } else {
      void executePhotoCapture();
    }
  }, [
    uiState.countdownRemainingSeconds,
    uiState.captureDomain,
    uiState.videoRecordingState.isRecording,
    uiState.shutterTimer,
    uiState.panoramaState.isActive,
    onCancelCountdown,
    stopVideoRecording,
    onStartCountdown,
    startVideoRecording,
    executePhotoCapture,
  ]);

  useEffect(() => {
    registerShutterHandler(handleShutterTrigger);
    return () => registerShutterHandler(null);
  }, [registerShutterHandler, handleShutterTrigger]);

  // Clean up timers, microphone tracks, and offscreen canvases if CameraScreen unmounts
  useEffect(() => {
    return () => {
      if (recordTimerRef.current !== null) window.clearInterval(recordTimerRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close().catch(() => {});
      stopMicStream();
      stopOwnedRecordingTracks();
      releasePanoramaSlices();
      if (analysisCanvasRef.current) {
        analysisCanvasRef.current.width = 0;
        analysisCanvasRef.current.height = 0;
        analysisCanvasRef.current = null;
      }
      if (proBridgeCanvasRef.current) {
        proBridgeCanvasRef.current.width = 0;
        proBridgeCanvasRef.current.height = 0;
        proBridgeCanvasRef.current = null;
      }
      if (viewfinderGlRef.current) {
        viewfinderGlRef.current.dispose();
        viewfinderGlRef.current = null;
      }
      zslRingRef.current?.clear();
    };
  }, [stopMicStream, stopOwnedRecordingTracks, releasePanoramaSlices]);

  // Viewfinder Tap-to-Focus & Wheel Zoom
  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = viewfinderBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ts = Date.now();
    onFocusPointChange({ x, y, timestamp: ts, isLockedSuccess: null });
    window.setTimeout(() => {
      onFocusPointChange({ x, y, timestamp: ts, isLockedSuccess: true });
    }, 260);
    window.setTimeout(() => {
      onFocusPointChange(null);
    }, 1800);
  };

  const handleViewfinderWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = -e.deltaY * 0.0025;
    const next = Math.min(
      uiState.sensorCapabilities.maxZoomRatio,
      Math.max(uiState.sensorCapabilities.minZoomRatio, zoomRatio + delta)
    );
    onZoomChange(Number(next.toFixed(2)));
  };

  // Resolution badge formatting
  const activeRes = uiState.sensorCapabilities.activeCaptureSize;
  const resolutionText = activeRes
    ? `${activeRes.width}×${activeRes.height} · ${((activeRes.width * activeRes.height) / 1_000_000).toFixed(1)}MP`
    : 'MAX SENSOR';

  // Aspect ratio viewport style
  const arObj = ASPECT_RATIO_OPTIONS.find((a) => a.id === uiState.aspectRatio);
  const aspectStyle: React.CSSProperties = arObj?.ratioValue
    ? { aspectRatio: `${arObj.ratioValue}` }
    : { width: '100%', height: '100%' };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#090A0D] select-none sm:flex-row">
      {/* Main Viewfinder Area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        <div
          ref={viewfinderBoxRef}
          onClick={handleViewfinderClick}
          onWheel={handleViewfinderWheel}
          style={aspectStyle}
          className="relative flex max-h-full max-w-full cursor-crosshair items-center justify-center overflow-hidden bg-[#050608]"
        >
          {uiState.isVirtualSensor ? (
            <canvas
              ref={virtualCanvasRef}
              width={1280}
              height={960}
              style={{
                filter: filterCss,
                transform: `${isFrontCamera && uiState.isFrontMirrorEnabled ? 'scaleX(-1)' : ''}`,
              }}
              className={`h-full w-full object-cover ${
                isLiveFilterRendered ? 'pointer-events-none absolute inset-0 opacity-0' : ''
              }`}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                onLoadedData={() => setIsPreviewReady(true)}
                onPlaying={() => setIsPreviewReady(true)}
                style={{
                  filter: filterCss,
                  transform: `${isFrontCamera && uiState.isFrontMirrorEnabled ? 'scaleX(-1) ' : ''}scale(${Math.max(1, zoomRatio)})`,
                }}
                className={`h-full w-full object-cover transition-all duration-150 ${
                  isPreviewReady && !isLiveFilterRendered
                    ? 'opacity-100'
                    : isLiveFilterRendered
                      ? 'pointer-events-none absolute inset-0 opacity-0'
                      : 'opacity-0'
                }`}
              />
              {!isPreviewReady && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#090A0D]">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#67E8F9]/25 border-t-[#67E8F9]" />
                  <span className="font-mono-tech text-[11px] text-[#B4BAC6]">
                    Initializing camera preview…
                  </span>
                </div>
              )}
            </>
          )}

          {/* Live GPU WebGL Filtered Viewfinder Canvas */}
          {isLiveFilterRendered && (
            <canvas
              ref={filteredViewfinderCanvasRef}
              data-testid="filtered_viewfinder_canvas"
              style={{
                transform: `${isFrontCamera && uiState.isFrontMirrorEnabled ? 'scaleX(-1) ' : ''}scale(${uiState.isVirtualSensor ? 1 : Math.max(1, zoomRatio)})`,
              }}
              className={`h-full w-full object-cover transition-opacity duration-150 ${
                isPreviewReady ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            />
          )}

          {/* Live Pro Overlays inside Preview Bounds */}
          {uiState.manualSettings.isFocusPeakingEnabled && uiState.frameAnalysis && (
            <FocusPeakingOverlay
              points={uiState.frameAnalysis.focusPeakingPoints}
              peakingColor={uiState.manualSettings.focusPeakingColor}
            />
          )}

          {uiState.manualSettings.isZebraEnabled && uiState.frameAnalysis && (
            <ZebraExposureOverlay
              highlightPoints={uiState.frameAnalysis.zebraHighlightPoints}
              shadowPoints={uiState.frameAnalysis.zebraShadowPoints}
            />
          )}

          {uiState.isGridEnabled && preferences.gridStyle !== 'OFF' && (
            <CompositionGridOverlay
              style={preferences.gridStyle}
              opacityPercent={preferences.gridOpacityPercent}
            />
          )}
          {uiState.isLevelEnabled && <CameraLevelOverlay rollDegrees={rollDegrees} />}
          <FocusReticleOverlay focusPoint={uiState.focusPoint} />
          <TimerCountdownOverlay remainingSeconds={uiState.countdownRemainingSeconds} />

          {/* Shutter flash feedback & Front screen fill flash */}
          {flashOverlayVisible && (
            <div className="pointer-events-none absolute inset-0 bg-white/35 transition-opacity duration-100" />
          )}
          {screenFillFlashActive && (
            <div className="pointer-events-none fixed inset-0 z-40 bg-white/90" />
          )}

          {/* Edge vignetting gradient */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, transparent 18%, transparent 78%, rgba(0,0,0,0.65) 100%)',
            }}
          />
        </div>

        {/* Live RGB Histogram Floating Card */}
        {uiState.manualSettings.isHistogramEnabled && (
          <div className="absolute right-4 bottom-4 z-20 sm:top-20 sm:right-4 sm:bottom-auto">
            <LiveHistogramCard
              analysis={uiState.frameAnalysis}
              zebraThresholdPercent={uiState.manualSettings.zebraThresholdPercent}
            />
          </div>
        )}

        {/* Top HUD Bar */}
        <div
          className={`absolute top-0 right-0 left-0 z-30 flex flex-col items-center px-3 pt-3 ${
            isWideLandscape ? (isLeftRail ? 'pl-[132px]' : 'pr-[132px]') : ''
          }`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            {/* Left Sensor Telemetry */}
            <div className="min-w-0">
              {!cleanHud && uiCustom.showTelemetryPill && (
                <SensorTelemetryPill
                  resolutionText={resolutionText}
                  lensLabel={
                    uiState.isVirtualSensor
                      ? 'VIRTUAL'
                      : uiState.activeHardwareProfile?.lensFacing ?? uiState.lensOption
                  }
                  onClick={onOpenHardwareInspector}
                />
              )}
            </div>

            {/* Center Aspect Ratio (Photo) or Video Controls on md+ */}
            <div className="hidden md:flex md:items-center md:justify-center">
              {uiState.captureDomain === 'PHOTO' ? (
                !cleanHud &&
                uiCustom.showAspectRatioBar && (
                  <AspectRatioSelectorPill
                    selected={uiState.aspectRatio}
                    onSelect={onSelectAspectRatio}
                  />
                )
              ) : (
                <div className="flex items-center gap-1.5">
                  <VideoQuickSpecPill
                    settings={uiState.videoSettings}
                    capabilities={uiState.videoCapabilities}
                    isSettingsOpen={uiState.isVideoSettingsOpen}
                    enabled={!uiState.videoRecordingState.isRecording}
                    onClick={onToggleVideoSettingsOpen}
                  />
                  <VideoAudioToggleButton
                    isAudioEnabled={uiState.videoSettings.isAudioEnabled}
                    isRecording={uiState.videoRecordingState.isRecording}
                    onClick={onToggleVideoAudio}
                  />
                </div>
              )}
            </div>

            {/* Right Flash/Torch, Filters, Timer, Quick Settings, Settings, Inspector */}
            <div className="flex shrink-0 items-center gap-1.5">
              {uiState.captureDomain === 'VIDEO' ? (
                uiState.sensorCapabilities.hasFlash && (
                  <VideoTorchButton
                    isTorchEnabled={uiState.videoSettings.isTorchEnabled}
                    onClick={onToggleVideoTorch}
                  />
                )
              ) : (
                uiState.sensorCapabilities.hasFlash && (
                  <FlashToggleButton
                    flashSetting={uiState.flashSetting}
                    onClick={onToggleFlash}
                  />
                )
              )}
              <FilterToggleButton
                isOpen={uiState.isFilterPanelOpen}
                isFilterActive={isFilterConfigured}
                activeFilterLabel={isFilterConfigured ? activeFilterDef.shortLabel : undefined}
                onClick={onToggleFilterPanel}
              />
              {!uiState.videoRecordingState.isRecording && (
                <TimerToggleButton
                  shutterTimer={uiState.shutterTimer}
                  onClick={onCycleTimer}
                />
              )}
              {!uiState.videoRecordingState.isRecording && (
                <QuickSettingsButton
                  isOpen={uiState.isQuickSettingsOpen}
                  onClick={onToggleQuickSettings}
                />
              )}
              {!uiState.videoRecordingState.isRecording && (
                <SettingsGearButton onClick={onOpenSettings} />
              )}
              {!cleanHud && <HardwareInspectorButton onClick={onOpenHardwareInspector} />}
            </div>
          </div>

          {/* Mobile compact secondary strip for Aspect Ratio or Video Specs */}
          <div className="mt-2 flex items-center justify-center md:hidden">
            {uiState.captureDomain === 'PHOTO' ? (
              !cleanHud &&
              uiCustom.showAspectRatioBar && (
                <AspectRatioSelectorPill
                  selected={uiState.aspectRatio}
                  onSelect={onSelectAspectRatio}
                />
              )
            ) : (
              <div className="flex items-center gap-1.5">
                <VideoQuickSpecPill
                  settings={uiState.videoSettings}
                  capabilities={uiState.videoCapabilities}
                  isSettingsOpen={uiState.isVideoSettingsOpen}
                  enabled={!uiState.videoRecordingState.isRecording}
                  onClick={onToggleVideoSettingsOpen}
                />
                <VideoAudioToggleButton
                  isAudioEnabled={uiState.videoSettings.isAudioEnabled}
                  isRecording={uiState.videoRecordingState.isRecording}
                  onClick={onToggleVideoAudio}
                />
              </div>
            )}
          </div>

          {/* Quick Settings Popover Panel */}
          <AnimatePresence>
            {uiState.isQuickSettingsOpen && !uiState.videoRecordingState.isRecording && (
              <QuickSettingsPanel
                key="quick_settings_panel"
                preferences={preferences}
                aspectRatio={uiState.aspectRatio}
                flashSetting={uiState.flashSetting}
                shutterTimer={uiState.shutterTimer}
                isLevelEnabled={uiState.isLevelEnabled}
                isHistogramEnabled={uiState.manualSettings.isHistogramEnabled}
                hasFlash={uiState.sensorCapabilities.hasFlash}
                hasLevelSensor={uiState.deviceInventory.hasLevelSensor}
                onSelectAspectRatio={onSelectAspectRatio}
                onSelectFlash={onSelectFlashDirect}
                onSelectTimer={onSelectTimerDirect}
                onSelectGridStyle={(style: GridOverlayStyle) =>
                  onUpdatePreferences((prev) => ({ ...prev, gridStyle: style }))
                }
                onSelectImageQuality={(quality: SaveImageQuality) =>
                  onUpdatePreferences((prev) => ({ ...prev, saveImageQuality: quality }))
                }
                onSelectHdrPlusMode={(mode: HdrPlusMode) =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    gcamEngine: { ...prev.gcamEngine, hdrPlusMode: mode },
                  }))
                }
                onToggleSabreSuperRes={() =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    gcamEngine: {
                      ...prev.gcamEngine,
                      sabreSuperRes: !prev.gcamEngine.sabreSuperRes,
                    },
                  }))
                }
                onTogglePixelAwb={() =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    gcamEngine: {
                      ...prev.gcamEngine,
                      pixelAwbEnabled: !prev.gcamEngine.pixelAwbEnabled,
                    },
                  }))
                }
                onToggleLevel={onToggleLevel}
                onToggleHistogram={onToggleHistogram}
                onToggleMirrorSelfie={() =>
                  onUpdatePreferences((prev) => ({ ...prev, mirrorSelfie: !prev.mirrorSelfie }))
                }
                onToggleCleanViewfinder={() =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    uiCustomization: {
                      ...prev.uiCustomization,
                      cleanViewfinderMode: !prev.uiCustomization.cleanViewfinderMode,
                    },
                  }))
                }
                onOpenFullSettings={() => {
                  onCloseQuickSettings();
                  onOpenSettings();
                }}
                onClose={onCloseQuickSettings}
              />
            )}
          </AnimatePresence>

          {/* Video Recording HUD */}
          {uiState.videoRecordingState.isRecording && (
            <VideoRecordingStatusHud
              recordingState={uiState.videoRecordingState}
              videoSettings={uiState.videoSettings}
            />
          )}

          {/* Pro Exposure Metering Bar (Photo mode) */}
          {uiState.captureDomain === 'PHOTO' && !cleanHud && uiCustom.showExposureMeterBar && (
            <ProExposureInfoBar
              profile={uiState.activeHardwareProfile}
              sensorCapabilities={uiState.sensorCapabilities}
              manualSettings={uiState.manualSettings}
              liveTelemetry={uiState.liveTelemetry}
              onSelectProTab={(tab) => {
                if (!uiState.manualSettings.isProPanelOpen) onToggleProPanel();
                onSelectProTab(tab);
              }}
            />
          )}

          {/* Live Original Compare badge when Filter is active and carousel collapsed */}
          {isFilterConfigured && !uiState.isFilterPanelOpen && (
            <button
              type="button"
              onPointerDown={() => setIsCompareOriginalHeld(true)}
              onPointerUp={() => setIsCompareOriginalHeld(false)}
              onPointerLeave={() => setIsCompareOriginalHeld(false)}
              onPointerCancel={() => setIsCompareOriginalHeld(false)}
              data-testid="viewfinder_hold_original_button"
              className={`font-mono-tech mt-2 cursor-pointer rounded-full border px-3 py-1 text-[10px] font-medium backdrop-blur-md transition ${
                isCompareOriginalHeld
                  ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                  : 'border-white/20 bg-[#090A0D]/75 text-[#F6F7F9] hover:bg-[#1A1D26]'
              }`}
            >
              {isCompareOriginalHeld
                ? 'Showing Original'
                : `${activeFilterDef.name} ${uiState.filterIntensity}% · Hold Original`}
            </button>
          )}

          {/* Status Banner / Error Toast */}
          {(uiState.statusBanner || uiState.errorMessage) && (
            <button
              type="button"
              onClick={uiState.errorMessage ? onDismissError : onDismissBanner}
              className={`font-mono-tech mt-2 max-w-md cursor-pointer rounded-full border px-3.5 py-1 text-[11px] backdrop-blur-md ${
                uiState.errorMessage
                  ? 'border-[#F87171]/60 bg-[#090A0D]/85 text-[#F87171]'
                  : 'border-[#67E8F9]/50 bg-[#090A0D]/85 text-[#F6F7F9]'
              }`}
            >
              {uiState.errorMessage ?? uiState.statusBanner}
            </button>
          )}
        </div>

        {/* Floating Decks & Bottom Controls in Portrait, or Floating Overlays in Landscape */}
        {!isWideLandscape && (
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 flex flex-col items-center px-4 pb-5">
            <div className="pointer-events-auto flex w-full max-w-[540px] flex-col items-center">
              {/* Panorama Sweep HUD */}
              {uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'PANORAMA' && (
                <PanoramaSweepHud
                  state={uiState.panoramaState}
                  onCaptureNextSlice={handleCapturePanoramaSlice}
                  onFinishStitch={() => void handleFinishPanoramaStitch()}
                  onCancelSweep={handleCancelPanorama}
                />
              )}

              {/* Video Settings Deck */}
              {uiState.captureDomain === 'VIDEO' &&
                uiState.isVideoSettingsOpen &&
                !uiState.videoRecordingState.isRecording && (
                  <VideoSettingsDeck
                    settings={uiState.videoSettings}
                    capabilities={uiState.videoCapabilities}
                    sensorCapabilities={uiState.sensorCapabilities}
                    onSelectQuality={onSelectVideoQuality}
                    onSelectFps={onSelectVideoFps}
                    onSelectBitrate={onSelectVideoBitrate}
                    onToggleHdr={onToggleVideoHdr}
                    onSelectStabilization={onSelectVideoStabilization}
                    onToggleAudio={onToggleVideoAudio}
                    onToggleSlowMoBaked={onToggleVideoSlowMoBaked}
                    onExposureCompChange={onExposureCompChange}
                  />
                )}

              {/* Real-Time Filter Carousel Deck (Portrait) */}
              <AnimatePresence>
                {uiState.isFilterPanelOpen && (
                  <motion.div
                    key="filter_panel_portrait"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="mb-2.5 w-full"
                  >
                    <FilterCarouselBar
                      compact
                      activeFilterId={uiState.activeFilterId}
                      intensity={uiState.filterIntensity}
                      favoriteFilterIds={uiState.favoriteFilterIds}
                      thumbnails={filterThumbnails}
                      isCompareOriginalHeld={isCompareOriginalHeld}
                      showPreserveOriginalToggle={uiState.captureDomain === 'PHOTO'}
                      preserveOriginalOnCapture={uiState.preserveOriginalOnFilteredCapture}
                      onSelectFilter={onSelectFilter}
                      onIntensityChange={onChangeFilterIntensity}
                      onToggleFavoriteFilter={onToggleFavoriteFilter}
                      onResetFilter={onResetFilter}
                      onCompareHoldChange={setIsCompareOriginalHeld}
                      onTogglePreserveOriginal={onTogglePreserveOriginal}
                      onClose={onToggleFilterPanel}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual Pro DSLR Controls Panel */}
              {uiState.captureDomain === 'PHOTO' && uiState.manualSettings.isProPanelOpen && (
                <div className="mb-2.5 w-full">
                  <ProControlsPanel
                    profile={uiState.activeHardwareProfile}
                    sensorCapabilities={uiState.sensorCapabilities}
                    settings={uiState.manualSettings}
                    liveTelemetry={uiState.liveTelemetry}
                    customPresets={uiState.customPresets}
                    hasLevelSensor={uiState.deviceInventory.hasLevelSensor}
                    isFrontCamera={isFrontCamera}
                    isGridEnabled={uiState.isGridEnabled}
                    isLevelEnabled={uiState.isLevelEnabled}
                    isFrontMirrorEnabled={uiState.isFrontMirrorEnabled}
                    isVolumeShutterEnabled={uiState.isVolumeShutterEnabled}
                    onSelectProTab={onSelectProTab}
                    onSetManualIso={onSetManualIso}
                    onSetManualShutter={onSetManualShutter}
                    onSetWhiteBalance={onSetWhiteBalance}
                    onSetManualKelvin={onSetManualKelvin}
                    onSetManualFocus={onSetManualFocus}
                    onExposureCompChange={onExposureCompChange}
                    onSelectCaptureFormat={onSelectCaptureFormat}
                    onToggleExposureLock={onToggleExposureLock}
                    onSelectStabilization={onSelectStabilization}
                    onToggleFocusPeaking={onToggleFocusPeaking}
                    onCycleFocusPeakingColor={onCycleFocusPeakingColor}
                    onToggleHistogram={onToggleHistogram}
                    onToggleZebra={onToggleZebra}
                    onSetZebraThreshold={onSetZebraThreshold}
                    onToggleGrid={onToggleGrid}
                    onToggleLevel={onToggleLevel}
                    onToggleFrontMirror={onToggleFrontMirror}
                    onToggleVolumeShutter={onToggleVolumeShutter}
                    onSavePreset={onSavePreset}
                    onApplyPreset={onApplyPreset}
                    onDeletePreset={onDeletePreset}
                    onResetAllToAuto={onResetAllToAuto}
                  />
                </div>
              )}

              {/* Smooth Zoom Slider */}
              {uiState.sensorCapabilities.maxZoomRatio > 1.05 &&
                !cleanHud &&
                uiCustom.showZoomSlider && (
                  <div className="mb-2 flex w-full justify-center">
                    <ZoomSliderBar
                      currentZoom={zoomRatio}
                      minZoom={uiState.sensorCapabilities.minZoomRatio}
                      maxZoom={uiState.sensorCapabilities.maxZoomRatio}
                      accentTheme={uiCustom.hudAccentTheme}
                      onZoomChange={onZoomChange}
                    />
                  </div>
                )}

              {/* Optical Lens Selector */}
              <div className="mb-2">
                <DynamicLensSelectorBar
                  activeProfile={uiState.activeHardwareProfile}
                  sameFacingSelectableCameras={sameFacingCameras}
                  currentZoomRatio={zoomRatio}
                  maxZoomRatio={uiState.sensorCapabilities.maxZoomRatio}
                  onSelectCameraId={onSelectCameraId}
                  onSelectZoomRatio={onZoomChange}
                />
              </div>

              {/* PHOTO / VIDEO Domain Pill */}
              {!uiState.videoRecordingState.isRecording && (
                <div className="mb-2">
                  <CaptureDomainTogglePill
                    activeDomain={uiState.captureDomain}
                    enabled={!uiState.isCapturing}
                    onSelectDomain={onSelectCaptureDomain}
                  />
                </div>
              )}

              {/* Photography Modes Carousel & Photo Feature Row */}
              {uiState.captureDomain === 'PHOTO' && (
                <>
                  <div className="mb-2 w-full">
                    <PhotographyModeCarousel
                      activeMode={uiState.photographyMode}
                      modeCapabilities={uiState.modeCapabilities}
                      detectedScene={uiState.detectedAutoScene}
                      onSelectMode={onSelectPhotographyMode}
                      onOpenModesDetail={() => setModesDetailOpen(true)}
                    />
                  </div>
                  {!cleanHud && uiCustom.showCaptureFeatureStrip && (
                    <div className="no-scrollbar mb-3 flex w-full items-center justify-center gap-2 overflow-x-auto">
                      {isBurstEligible && (
                        <BurstModePill
                          isEnabled={uiState.isBurstModeEnabled}
                          onClick={onToggleBurstMode}
                        />
                      )}
                      <QuickCapturePill
                        mode={uiState.captureSpeedMode}
                        onClick={onToggleQuickCapture}
                      />
                      <GCamEnginePill
                        mode={preferences.gcamEngine.hdrPlusMode}
                        sabreEnabled={preferences.gcamEngine.sabreSuperRes}
                        onClick={() =>
                          onUpdatePreferences((prev) => {
                            const order: HdrPlusMode[] = ['HDR_PLUS_ENHANCED', 'HDR_PLUS_ZSL', 'OFF'];
                            const next =
                              order[(order.indexOf(prev.gcamEngine.hdrPlusMode) + 1) % order.length];
                            return {
                              ...prev,
                              gcamEngine: { ...prev.gcamEngine, hdrPlusMode: next },
                            };
                          })
                        }
                      />
                      <ProToggleButton
                        isOpen={uiState.manualSettings.isProPanelOpen}
                        hasAnyManualActive={hasAnyManualActive}
                        onClick={onToggleProPanel}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Primary Shutter / Video Action Row */}
              <div className="flex w-full items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <LastPhotoThumbnailButton
                    lastPhoto={uiState.lastCapturedPhoto}
                    onClick={onOpenLastPhoto}
                  />
                  <GalleryIconButton onClick={onOpenGallery} />
                </div>

                {uiState.captureDomain === 'VIDEO' ? (
                  <VideoRecordButton
                    isRecording={uiState.videoRecordingState.isRecording}
                    isPaused={uiState.videoRecordingState.isPaused}
                    isFinalizing={uiState.videoRecordingState.isFinalizing}
                    isCountingDown={uiState.countdownRemainingSeconds !== null}
                    enabled={!uiState.videoRecordingState.isFinalizing}
                    onClick={handleShutterTrigger}
                  />
                ) : (
                  <ShutterButton
                    isCapturing={uiState.isCapturing}
                    isCountingDown={uiState.countdownRemainingSeconds !== null}
                    burstProgressCount={uiState.burstProgressCount}
                    isBurstMode={uiState.isBurstModeEnabled && isBurstEligible}
                    enabled={!uiState.isCapturing}
                    onClick={handleShutterTrigger}
                  />
                )}

                {uiState.captureDomain === 'VIDEO' && uiState.videoRecordingState.isRecording ? (
                  <VideoPauseResumeButton
                    isPaused={uiState.videoRecordingState.isPaused}
                    enabled={!uiState.videoRecordingState.isFinalizing}
                    onClick={handlePauseResumeRecording}
                  />
                ) : (
                  <SwitchCameraButton
                    enabled={
                      uiState.hasBackCamera &&
                      uiState.hasFrontCamera &&
                      !uiState.videoRecordingState.isRecording
                    }
                    onClick={onSwitchCamera}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Landscape Mode Floating Panels */}
        {isWideLandscape && (
          <div
            className={`pointer-events-none absolute bottom-4 z-20 flex flex-col items-center gap-2 ${
              isLeftRail ? 'right-4 left-[136px]' : 'right-[136px] left-4'
            }`}
          >
            <div className="pointer-events-auto flex w-full max-w-[540px] flex-col items-center gap-2">
              {uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'PANORAMA' && (
                <PanoramaSweepHud
                  state={uiState.panoramaState}
                  onCaptureNextSlice={handleCapturePanoramaSlice}
                  onFinishStitch={() => void handleFinishPanoramaStitch()}
                  onCancelSweep={handleCancelPanorama}
                />
              )}

              {uiState.captureDomain === 'VIDEO' &&
                uiState.isVideoSettingsOpen &&
                !uiState.videoRecordingState.isRecording && (
                  <VideoSettingsDeck
                    settings={uiState.videoSettings}
                    capabilities={uiState.videoCapabilities}
                    sensorCapabilities={uiState.sensorCapabilities}
                    onSelectQuality={onSelectVideoQuality}
                    onSelectFps={onSelectVideoFps}
                    onSelectBitrate={onSelectVideoBitrate}
                    onToggleHdr={onToggleVideoHdr}
                    onSelectStabilization={onSelectVideoStabilization}
                    onToggleAudio={onToggleVideoAudio}
                    onToggleSlowMoBaked={onToggleVideoSlowMoBaked}
                    onExposureCompChange={onExposureCompChange}
                  />
                )}

              {/* Real-Time Filter Carousel Deck (Landscape) */}
              <AnimatePresence>
                {uiState.isFilterPanelOpen && (
                  <motion.div
                    key="filter_panel_landscape"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full"
                  >
                    <FilterCarouselBar
                      compact
                      activeFilterId={uiState.activeFilterId}
                      intensity={uiState.filterIntensity}
                      favoriteFilterIds={uiState.favoriteFilterIds}
                      thumbnails={filterThumbnails}
                      isCompareOriginalHeld={isCompareOriginalHeld}
                      showPreserveOriginalToggle={uiState.captureDomain === 'PHOTO'}
                      preserveOriginalOnCapture={uiState.preserveOriginalOnFilteredCapture}
                      onSelectFilter={onSelectFilter}
                      onIntensityChange={onChangeFilterIntensity}
                      onToggleFavoriteFilter={onToggleFavoriteFilter}
                      onResetFilter={onResetFilter}
                      onCompareHoldChange={setIsCompareOriginalHeld}
                      onTogglePreserveOriginal={onTogglePreserveOriginal}
                      onClose={onToggleFilterPanel}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {uiState.captureDomain === 'PHOTO' && uiState.manualSettings.isProPanelOpen && (
                <ProControlsPanel
                  profile={uiState.activeHardwareProfile}
                  sensorCapabilities={uiState.sensorCapabilities}
                  settings={uiState.manualSettings}
                  liveTelemetry={uiState.liveTelemetry}
                  customPresets={uiState.customPresets}
                  hasLevelSensor={uiState.deviceInventory.hasLevelSensor}
                  isFrontCamera={isFrontCamera}
                  isGridEnabled={uiState.isGridEnabled}
                  isLevelEnabled={uiState.isLevelEnabled}
                  isFrontMirrorEnabled={uiState.isFrontMirrorEnabled}
                  isVolumeShutterEnabled={uiState.isVolumeShutterEnabled}
                  onSelectProTab={onSelectProTab}
                  onSetManualIso={onSetManualIso}
                  onSetManualShutter={onSetManualShutter}
                  onSetWhiteBalance={onSetWhiteBalance}
                  onSetManualKelvin={onSetManualKelvin}
                  onSetManualFocus={onSetManualFocus}
                  onExposureCompChange={onExposureCompChange}
                  onSelectCaptureFormat={onSelectCaptureFormat}
                  onToggleExposureLock={onToggleExposureLock}
                  onSelectStabilization={onSelectStabilization}
                  onToggleFocusPeaking={onToggleFocusPeaking}
                  onCycleFocusPeakingColor={onCycleFocusPeakingColor}
                  onToggleHistogram={onToggleHistogram}
                  onToggleZebra={onToggleZebra}
                  onSetZebraThreshold={onSetZebraThreshold}
                  onToggleGrid={onToggleGrid}
                  onToggleLevel={onToggleLevel}
                  onToggleFrontMirror={onToggleFrontMirror}
                  onToggleVolumeShutter={onToggleVolumeShutter}
                  onSavePreset={onSavePreset}
                  onApplyPreset={onApplyPreset}
                  onDeletePreset={onDeletePreset}
                  onResetAllToAuto={onResetAllToAuto}
                />
              )}

              {uiState.sensorCapabilities.maxZoomRatio > 1.05 &&
                !cleanHud &&
                uiCustom.showZoomSlider && (
                  <ZoomSliderBar
                    currentZoom={zoomRatio}
                    minZoom={uiState.sensorCapabilities.minZoomRatio}
                    maxZoom={uiState.sensorCapabilities.maxZoomRatio}
                    accentTheme={uiCustom.hudAccentTheme}
                    onZoomChange={onZoomChange}
                  />
                )}

              <DynamicLensSelectorBar
                activeProfile={uiState.activeHardwareProfile}
                sameFacingSelectableCameras={sameFacingCameras}
                currentZoomRatio={zoomRatio}
                maxZoomRatio={uiState.sensorCapabilities.maxZoomRatio}
                onSelectCameraId={onSelectCameraId}
                onSelectZoomRatio={onZoomChange}
              />

              {!uiState.videoRecordingState.isRecording && (
                <CaptureDomainTogglePill
                  activeDomain={uiState.captureDomain}
                  enabled={!uiState.isCapturing}
                  onSelectDomain={onSelectCaptureDomain}
                />
              )}

              {uiState.captureDomain === 'PHOTO' && (
                <PhotographyModeCarousel
                  activeMode={uiState.photographyMode}
                  modeCapabilities={uiState.modeCapabilities}
                  detectedScene={uiState.detectedAutoScene}
                  onSelectMode={onSelectPhotographyMode}
                  onOpenModesDetail={() => setModesDetailOpen(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Landscape Control Rail (Right or Left per UI customization) */}
      {isWideLandscape && (
        <div
          className={`z-20 flex h-full w-[124px] shrink-0 flex-col items-center justify-between bg-[#090A0D]/92 px-2 py-5 backdrop-blur-md ${
            isLeftRail ? 'order-first border-r border-white/10' : 'border-l border-white/10'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            {uiState.captureDomain === 'VIDEO' ? (
              <VideoQuickSpecPill
                settings={uiState.videoSettings}
                capabilities={uiState.videoCapabilities}
                isSettingsOpen={uiState.isVideoSettingsOpen}
                enabled={!uiState.videoRecordingState.isRecording}
                onClick={onToggleVideoSettingsOpen}
              />
            ) : (
              !cleanHud &&
              uiCustom.showCaptureFeatureStrip && (
                <>
                  {isBurstEligible && (
                    <BurstModePill
                      isEnabled={uiState.isBurstModeEnabled}
                      onClick={onToggleBurstMode}
                    />
                  )}
                  <QuickCapturePill
                    mode={uiState.captureSpeedMode}
                    onClick={onToggleQuickCapture}
                  />
                  <GCamEnginePill
                    mode={preferences.gcamEngine.hdrPlusMode}
                    sabreEnabled={preferences.gcamEngine.sabreSuperRes}
                    onClick={() =>
                      onUpdatePreferences((prev) => {
                        const order: HdrPlusMode[] = ['HDR_PLUS_ENHANCED', 'HDR_PLUS_ZSL', 'OFF'];
                        const next =
                          order[(order.indexOf(prev.gcamEngine.hdrPlusMode) + 1) % order.length];
                        return {
                          ...prev,
                          gcamEngine: { ...prev.gcamEngine, hdrPlusMode: next },
                        };
                      })
                    }
                  />
                  <ProToggleButton
                    isOpen={uiState.manualSettings.isProPanelOpen}
                    hasAnyManualActive={hasAnyManualActive}
                    onClick={onToggleProPanel}
                  />
                </>
              )
            )}
          </div>

          {uiState.captureDomain === 'VIDEO' ? (
            <VideoRecordButton
              isRecording={uiState.videoRecordingState.isRecording}
              isPaused={uiState.videoRecordingState.isPaused}
              isFinalizing={uiState.videoRecordingState.isFinalizing}
              isCountingDown={uiState.countdownRemainingSeconds !== null}
              enabled={!uiState.videoRecordingState.isFinalizing}
              onClick={handleShutterTrigger}
            />
          ) : (
            <ShutterButton
              isCapturing={uiState.isCapturing}
              isCountingDown={uiState.countdownRemainingSeconds !== null}
              burstProgressCount={uiState.burstProgressCount}
              isBurstMode={uiState.isBurstModeEnabled && isBurstEligible}
              enabled={!uiState.isCapturing}
              onClick={handleShutterTrigger}
            />
          )}

          <div className="flex flex-col items-center gap-2.5">
            {uiState.captureDomain === 'VIDEO' && uiState.videoRecordingState.isRecording ? (
              <VideoPauseResumeButton
                isPaused={uiState.videoRecordingState.isPaused}
                enabled={!uiState.videoRecordingState.isFinalizing}
                onClick={handlePauseResumeRecording}
              />
            ) : (
              <SwitchCameraButton
                enabled={
                  uiState.hasBackCamera &&
                  uiState.hasFrontCamera &&
                  !uiState.videoRecordingState.isRecording
                }
                onClick={onSwitchCamera}
              />
            )}
            <LastPhotoThumbnailButton
              lastPhoto={uiState.lastCapturedPhoto}
              onClick={onOpenLastPhoto}
            />
            <GalleryIconButton onClick={onOpenGallery} />
          </div>
        </div>
      )}

      {/* Photography Modes Detail Modal */}
      {modesDetailOpen && (
        <PhotographyModesDetailDialog
          activeMode={uiState.photographyMode}
          capabilities={uiState.modeCapabilities}
          onSelectMode={onSelectPhotographyMode}
          onDismiss={() => setModesDetailOpen(false)}
        />
      )}

      {/* Unused import guard for FLASH_NEXT if referenced only in App */}
      <span className="hidden">{FLASH_NEXT[uiState.flashSetting]}</span>
    </div>
  );
};
