import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ASPECT_RATIO_OPTIONS,
  AppCaptureDomain,
  CameraUiState,
  CaptureOutputFormat,
  CapturedPhotoInfo,
  DetectedSceneType,
  FLASH_NEXT,
  FrameAnalysisData,
  PhotographyMode,
  PreviewAspectRatio,
  ProControlTab,
  ProPreset,
  StabilizationSelection,
  VideoBitrateOption,
  VideoFpsOption,
  VideoQualityOption,
  WhiteBalanceOption,
} from '../types/camera';
import { analyzeImageData } from '../utils/cameraUtils';
import {
  buildViewfinderFilterCss,
  renderVirtualSensorFrame,
  stitchPanoramaSlices,
} from '../utils/webCameraHardware';
import {
  AspectRatioSelectorPill,
  BurstModePill,
  CameraLevelOverlay,
  DynamicLensSelectorBar,
  FlashToggleButton,
  FocusReticleOverlay,
  GalleryIconButton,
  HardwareInspectorButton,
  LastPhotoThumbnailButton,
  ProToggleButton,
  QuickCapturePill,
  RuleOfThirdsGrid,
  SensorTelemetryPill,
  ShutterButton,
  SwitchCameraButton,
  TimerCountdownOverlay,
  TimerToggleButton,
  ZoomSliderBar,
} from './CameraControls';
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
  mediaStream: MediaStream | null;
  onSelectCaptureDomain: (domain: AppCaptureDomain) => void;
  onSelectCameraId: (id: string) => void;
  onSwitchCamera: () => void;
  onSelectAspectRatio: (ratio: PreviewAspectRatio) => void;
  onToggleFlash: () => void;
  onCycleTimer: () => void;
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
  onOpenHardwareInspector: () => void;
  onOpenLastPhoto: () => void;
  onOpenGallery: () => void;
  onDismissBanner: () => void;
  onDismissError: () => void;
  onUpdateAnalysis: (analysis: FrameAnalysisData, detectedScene: DetectedSceneType) => void;
  onMediaCaptured: (item: CapturedPhotoInfo, keepBurstCount?: boolean) => void;
  onSetCapturingState: (isCapturing: boolean, burstProgressCount?: number | null) => void;
  onTriggerShutterFlash: () => void;
  onUpdatePanoramaState: (patch: Partial<CameraUiState['panoramaState']>) => void;
  onUpdateVideoRecordingState: (patch: Partial<CameraUiState['videoRecordingState']>) => void;
  onStartCountdown: (onComplete: () => void) => void;
  onCancelCountdown: () => void;
  registerShutterHandler: (fn: (() => void) | null) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  uiState,
  mediaStream,
  onSelectCaptureDomain,
  onSelectCameraId,
  onSwitchCamera,
  onSelectAspectRatio,
  onToggleFlash,
  onCycleTimer,
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
  onOpenHardwareInspector,
  onOpenLastPhoto,
  onOpenGallery,
  onDismissBanner,
  onDismissError,
  onUpdateAnalysis,
  onMediaCaptured,
  onSetCapturingState,
  onTriggerShutterFlash,
  onUpdatePanoramaState,
  onUpdateVideoRecordingState,
  onStartCountdown,
  onCancelCountdown,
  registerShutterHandler,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const [modesDetailOpen, setModesDetailOpen] = useState(false);
  const [flashOverlayVisible, setFlashOverlayVisible] = useState(false);
  const [rollDegrees, setRollDegrees] = useState(0);
  const [windowSize, setWindowSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const isWideLandscape = windowSize.w >= 600 && windowSize.w > windowSize.h;
  const isFrontCamera = uiState.activeHardwareProfile?.lensFacing === 'FRONT';
  const zoomRatio = uiState.sensorCapabilities.currentZoomRatio;
  const isBurstEligible =
    uiState.captureDomain === 'PHOTO' && uiState.photographyMode === 'STANDARD';

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

  // Track window dimensions for adaptive Portrait vs Wide Landscape layout
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Trigger shutter blink flash overlay
  useEffect(() => {
    if (uiState.shutterBlinkCounter === 0) return;
    setFlashOverlayVisible(true);
    const id = window.setTimeout(() => setFlashOverlayVisible(false), 120);
    return () => window.clearTimeout(id);
  }, [uiState.shutterBlinkCounter]);

  // Bind live MediaStream to video element
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || uiState.isVirtualSensor) return;
    if (mediaStream) {
      videoEl.srcObject = mediaStream;
      void videoEl.play().catch(() => {
        // Autoplay promise rejection ignored when muted playsInline is set
      });
    } else {
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

  // Virtual Optical Sensor animation loop
  useEffect(() => {
    if (!uiState.isVirtualSensor) return;
    let rafId = 0;
    const startMs = performance.now();

    const draw = (now: number) => {
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
  }, [uiState.isVirtualSensor, uiState.activeHardwareProfile?.lensFacing, uiState.lensOption, zoomRatio]);

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

    const intervalId = window.setInterval(() => {
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
      onUpdateAnalysis(analysis, detectedScene);
    }, 85);

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
    onUpdateAnalysis,
  ]);

  // Helper: Render current viewfinder frame at full target resolution to a Canvas
  const captureCurrentFrameToCanvas = useCallback((): HTMLCanvasElement | null => {
    const outCanvas = document.createElement('canvas');
    let srcW = 1920;
    let srcH = 1440;
    let sourceEl: HTMLVideoElement | HTMLCanvasElement | null = null;

    if (uiState.isVirtualSensor) {
      sourceEl = virtualCanvasRef.current;
      if (sourceEl) {
        srcW = uiState.sensorCapabilities.activeCaptureSize?.width ?? 1920;
        srcH = uiState.sensorCapabilities.activeCaptureSize?.height ?? 1440;
      }
    } else if (videoRef.current && videoRef.current.readyState >= 2) {
      sourceEl = videoRef.current;
      srcW = videoRef.current.videoWidth || 1920;
      srcH = videoRef.current.videoHeight || 1080;
    }

    if (!sourceEl) return null;

    // Crop to selected aspect ratio
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

    // Clamp max canvas output for panorama slices or fast JPEG encoding
    const scaleDown = Math.max(drawW, drawH) > 4032 ? 4032 / Math.max(drawW, drawH) : 1;
    outCanvas.width = Math.max(64, Math.round(drawW * scaleDown));
    outCanvas.height = Math.max(64, Math.round(drawH * scaleDown));

    const ctx = outCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.save();
    ctx.filter = filterCss;

    // Apply front-camera mirror if enabled
    if (isFrontCamera && uiState.isFrontMirrorEnabled) {
      ctx.translate(outCanvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Apply digital zoom crop (if physical video track, virtual canvas already scales)
    const cropZoom = uiState.isVirtualSensor ? 1 : Math.max(1, zoomRatio);
    const sx = Math.max(0, (srcW - drawW / cropZoom) / 2);
    const sy = Math.max(0, (srcH - drawH / cropZoom) / 2);
    const sw = drawW / cropZoom;
    const sh = drawH / cropZoom;

    ctx.drawImage(sourceEl, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);

    // Subtle HDR/Portrait computational post-pass
    if (uiState.photographyMode === 'PORTRAIT') {
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
  }, [
    uiState.isVirtualSensor,
    uiState.sensorCapabilities.activeCaptureSize,
    uiState.aspectRatio,
    uiState.isFrontMirrorEnabled,
    uiState.photographyMode,
    filterCss,
    isFrontCamera,
    zoomRatio,
  ]);

  const encodeAndSaveCanvas = useCallback(
    async (canvas: HTMLCanvasElement, prefix: string, keepBurstCount = false): Promise<void> => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const quality = uiState.captureSpeedMode === 'QUICK' ? 0.88 : 0.96;
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode photo'))),
          'image/jpeg',
          quality
        );
      });
      const ts = Date.now();
      const url = URL.createObjectURL(blob);
      onMediaCaptured(
        {
          id: `${prefix}_${ts}_${Math.random().toString(36).slice(2, 6)}`,
          url,
          blob,
          width: canvas.width,
          height: canvas.height,
          sizeBytes: blob.size,
          displayName: `${prefix}_${ts}.jpg`,
          timestampMillis: ts,
          isVideo: false,
          durationMs: 0,
          mimeType: 'image/jpeg',
          videoFrameRate: null,
          isHdrVideo: false,
        },
        keepBurstCount
      );
    },
    [uiState.captureSpeedMode, onMediaCaptured]
  );

  // Panorama Actions
  const handleCapturePanoramaSlice = useCallback(() => {
    const canvas = captureCurrentFrameToCanvas();
    if (!canvas) return;
    // Scale panorama slices for smooth horizontal stitching
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
  }, [captureCurrentFrameToCanvas, onTriggerShutterFlash, onUpdatePanoramaState, uiState.panoramaState.maxSlices, uiState.panoramaState.targetStepDeg]);

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
        displayName: `UltraCam_PANO_${ts}.jpg`,
        timestampMillis: ts,
        isVideo: false,
        durationMs: 0,
        mimeType: 'image/jpeg',
        videoFrameRate: null,
        isHdrVideo: false,
      });
    } finally {
      panoramaSlicesRef.current = [];
      onUpdatePanoramaState({
        isActive: false,
        isStitching: false,
        capturedSlicesCount: 0,
        currentYawDeg: 0,
        statusHint: 'Tap shutter to start panorama sweep',
      });
    }
  }, [onMediaCaptured, onUpdatePanoramaState]);

  const handleCancelPanorama = useCallback(() => {
    panoramaSlicesRef.current = [];
    onUpdatePanoramaState({
      isActive: false,
      isStitching: false,
      capturedSlicesCount: 0,
      currentYawDeg: 0,
      statusHint: 'Tap shutter to start panorama sweep',
    });
  }, [onUpdatePanoramaState]);

  // Execute Still Capture (Single, Computational Mode, Burst, or Panorama)
  const executePhotoCapture = useCallback(async () => {
    if (uiState.photographyMode === 'PANORAMA') {
      if (!uiState.panoramaState.isActive) {
        panoramaSlicesRef.current = [];
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

    if (uiState.isBurstModeEnabled && isBurstEligible) {
      onSetCapturingState(true, 0);
      for (let i = 1; i <= 5; i++) {
        onSetCapturingState(true, i);
        onTriggerShutterFlash();
        const canvas = captureCurrentFrameToCanvas();
        if (canvas) {
          await encodeAndSaveCanvas(canvas, `UltraCam_BURST_${i}`, true);
        }
        await new Promise((r) => window.setTimeout(r, 110));
      }
      onSetCapturingState(false, null);
      return;
    }

    onSetCapturingState(true, null);
    onTriggerShutterFlash();
    const canvas = captureCurrentFrameToCanvas();
    if (canvas) {
      const modeTag = uiState.photographyMode === 'STANDARD' ? 'UltraCam' : `UltraCam_${uiState.photographyMode}`;
      await encodeAndSaveCanvas(canvas, modeTag, false);
    }
    onSetCapturingState(false, null);
  }, [
    uiState.photographyMode,
    uiState.panoramaState.isActive,
    uiState.isBurstModeEnabled,
    isBurstEligible,
    onUpdatePanoramaState,
    handleCapturePanoramaSlice,
    onSetCapturingState,
    onTriggerShutterFlash,
    captureCurrentFrameToCanvas,
    encodeAndSaveCanvas,
  ]);

  // Video Recording Controls
  const stopVideoRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    onUpdateVideoRecordingState({ isFinalizing: true });
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    try {
      recorder.stop();
    } catch {
      onUpdateVideoRecordingState({ isRecording: false, isPaused: false, isFinalizing: false });
    }
  }, [onUpdateVideoRecordingState]);

  const startVideoRecording = useCallback(() => {
    let streamToRecord: MediaStream | null = null;
    if (uiState.isVirtualSensor && virtualCanvasRef.current) {
      const fps = Math.min(60, uiState.videoSettings.fps);
      streamToRecord = virtualCanvasRef.current.captureStream(fps);
    } else if (mediaStream) {
      streamToRecord = mediaStream;
    }

    if (!streamToRecord) return;

    // Pick best supported MediaRecorder mimeType
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

      const recorder = new MediaRecorder(streamToRecord, options);
      mediaRecorderRef.current = recorder;

      const audioTracks = streamToRecord.getAudioTracks();
      const hasAudioTrack = uiState.videoSettings.isAudioEnabled && audioTracks.length > 0;

      // Setup optional AudioContext meter for live audio bars
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

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        const ts = Date.now();
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const durationMs = Math.max(
          500,
          Date.now() - recordStartTimeRef.current - pausedAccumMsRef.current
        );
        const w = uiState.isVirtualSensor
          ? (virtualCanvasRef.current?.width ?? 1920)
          : (videoRef.current?.videoWidth ?? 1920);
        const h = uiState.isVirtualSensor
          ? (virtualCanvasRef.current?.height ?? 1080)
          : (videoRef.current?.videoHeight ?? 1080);

        if (audioCtxRef.current) {
          void audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
          analyserRef.current = null;
        }

        onMediaCaptured({
          id: `VID_${ts}`,
          url: URL.createObjectURL(blob),
          blob,
          width: w,
          height: h,
          sizeBytes: blob.size,
          displayName: `UltraCam_VID_${ts}.${ext}`,
          timestampMillis: ts,
          isVideo: true,
          durationMs,
          mimeType: finalMime,
          videoFrameRate: uiState.videoSettings.fps,
          isHdrVideo: uiState.videoSettings.isHdrEnabled,
        });

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
    } catch {
      onUpdateVideoRecordingState({ isRecording: false, isPaused: false, isFinalizing: false });
    }
  }, [
    uiState.isVirtualSensor,
    uiState.videoSettings.fps,
    uiState.videoSettings.bitrate,
    uiState.videoSettings.isAudioEnabled,
    uiState.videoSettings.isHdrEnabled,
    mediaStream,
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
        onStartCountdown(() => startVideoRecording());
      } else {
        startVideoRecording();
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

  // Clean up timer interval if screen unmounts
  useEffect(() => {
    return () => {
      if (recordTimerRef.current !== null) window.clearInterval(recordTimerRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close().catch(() => {});
    };
  }, []);

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
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              style={{
                filter: filterCss,
                transform: `${isFrontCamera && uiState.isFrontMirrorEnabled ? 'scaleX(-1) ' : ''}scale(${Math.max(1, zoomRatio)})`,
              }}
              className="h-full w-full object-cover transition-transform duration-75"
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

          {uiState.isGridEnabled && <RuleOfThirdsGrid />}
          {uiState.isLevelEnabled && <CameraLevelOverlay rollDegrees={rollDegrees} />}
          <FocusReticleOverlay focusPoint={uiState.focusPoint} />
          <TimerCountdownOverlay remainingSeconds={uiState.countdownRemainingSeconds} />

          {/* Shutter flash feedback */}
          {flashOverlayVisible && (
            <div className="pointer-events-none absolute inset-0 bg-white/35 transition-opacity duration-100" />
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
          className={`absolute top-0 right-0 left-0 z-20 flex flex-col items-center px-3 pt-3 ${
            isWideLandscape ? 'pr-[132px]' : ''
          }`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            {/* Left Sensor Telemetry */}
            <div className="min-w-0">
              <SensorTelemetryPill
                resolutionText={resolutionText}
                lensLabel={
                  uiState.isVirtualSensor
                    ? 'VIRTUAL'
                    : uiState.activeHardwareProfile?.lensFacing ?? uiState.lensOption
                }
                onClick={onOpenHardwareInspector}
              />
            </div>

            {/* Center Aspect Ratio (Photo) or Video Controls */}
            {uiState.captureDomain === 'PHOTO' ? (
              <AspectRatioSelectorPill
                selected={uiState.aspectRatio}
                onSelect={onSelectAspectRatio}
              />
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

            {/* Right Flash/Torch, Timer, Inspector */}
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
              {!uiState.videoRecordingState.isRecording && (
                <TimerToggleButton
                  shutterTimer={uiState.shutterTimer}
                  onClick={onCycleTimer}
                />
              )}
              <HardwareInspectorButton onClick={onOpenHardwareInspector} />
            </div>
          </div>

          {/* Video Recording HUD */}
          {uiState.videoRecordingState.isRecording && (
            <VideoRecordingStatusHud
              recordingState={uiState.videoRecordingState}
              videoSettings={uiState.videoSettings}
            />
          )}

          {/* Pro Exposure Metering Bar (Photo mode) */}
          {uiState.captureDomain === 'PHOTO' && (
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
              {uiState.sensorCapabilities.maxZoomRatio > 1.05 && (
                <div className="mb-2 flex w-full justify-center">
                  <ZoomSliderBar
                    currentZoom={zoomRatio}
                    minZoom={uiState.sensorCapabilities.minZoomRatio}
                    maxZoom={uiState.sensorCapabilities.maxZoomRatio}
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
                    <ProToggleButton
                      isOpen={uiState.manualSettings.isProPanelOpen}
                      hasAnyManualActive={hasAnyManualActive}
                      onClick={onToggleProPanel}
                    />
                  </div>
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

        {/* Landscape Mode Floating Panels on Bottom-Left */}
        {isWideLandscape && (
          <div className="pointer-events-none absolute right-[136px] bottom-4 left-4 z-20 flex flex-col items-center gap-2">
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

              {uiState.sensorCapabilities.maxZoomRatio > 1.05 && (
                <ZoomSliderBar
                  currentZoom={zoomRatio}
                  minZoom={uiState.sensorCapabilities.minZoomRatio}
                  maxZoom={uiState.sensorCapabilities.maxZoomRatio}
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

      {/* Landscape Right Control Rail */}
      {isWideLandscape && (
        <div className="z-20 flex h-full w-[124px] shrink-0 flex-col items-center justify-between border-l border-white/10 bg-[#090A0D]/92 px-2 py-5 backdrop-blur-md">
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
                <ProToggleButton
                  isOpen={uiState.manualSettings.isProPanelOpen}
                  hasAnyManualActive={hasAnyManualActive}
                  onClick={onToggleProPanel}
                />
              </>
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
