import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppCaptureDomain,
  CameraHardwareProfile,
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
  SHUTTER_TIMER_META,
  StabilizationSelection,
  VideoBitrateOption,
  VideoFpsOption,
  VideoQualityOption,
  WHITE_BALANCE_META,
  WhiteBalanceOption,
} from './types/camera';
import { loadSavedPresets, persistPresets } from './utils/cameraUtils';
import {
  buildVirtualCameraInventory,
  evaluateModeCapabilities,
  evaluateVideoCapabilities,
  extractSensorCapabilities,
  scanBrowserCameraInventory,
} from './utils/webCameraHardware';
import { PermissionWelcomeScreen } from './components/PermissionWelcomeScreen';
import { CameraScreen } from './components/CameraScreen';
import { HardwareInspectorOverlay } from './components/HardwareInspectorOverlay';
import { PhotoViewerOverlay, SessionGalleryModal } from './components/PhotoViewerOverlay';

function createInitialUiState(): CameraUiState {
  const virtualInv = buildVirtualCameraInventory();
  const defaultProfile = virtualInv.selectableCameras[0] ?? null;

  return {
    permissionStatus: 'NOT_REQUESTED',
    isVirtualSensor: false,
    captureDomain: 'PHOTO',
    deviceInventory: virtualInv,
    activeCameraId: defaultProfile?.cameraId ?? null,
    activeHardwareProfile: defaultProfile,
    lensOption: 'BACK',
    hasBackCamera: true,
    hasFrontCamera: true,
    aspectRatio: 'RATIO_4_3',
    flashSetting: 'OFF',
    shutterTimer: 'OFF',
    countdownRemainingSeconds: null,
    captureSpeedMode: 'MAX_QUALITY',
    isBurstModeEnabled: false,
    burstProgressCount: null,
    isGridEnabled: false,
    isLevelEnabled: false,
    isFrontMirrorEnabled: true,
    isVolumeShutterEnabled: true,
    isCapturing: false,
    shutterBlinkCounter: 0,
    sensorCapabilities: extractSensorCapabilities(defaultProfile, defaultProfile?.maxJpegResolution ?? null),
    manualSettings: {
      isProPanelOpen: false,
      activeProTab: 'ISO',
      isManualIsoEnabled: false,
      manualIso: null,
      isManualShutterEnabled: false,
      manualShutterNs: null,
      whiteBalanceMode: 'AUTO',
      manualKelvin: 5500,
      isManualFocusEnabled: false,
      manualFocusDiopters: 0,
      isExposureLockEnabled: false,
      captureOutputFormat: 'JPEG',
      isRawCaptureEnabled: false,
      stabilizationSelection: 'AUTO',
      isFocusPeakingEnabled: false,
      focusPeakingColor: 'CYAN',
      isHistogramEnabled: false,
      isZebraEnabled: false,
      zebraThresholdPercent: 95,
    },
    liveTelemetry: {
      iso: 100,
      shutterNs: 16_666_666,
      aperture: 1.8,
      focusDistanceDiopters: 0.4,
    },
    frameAnalysis: null,
    customPresets: loadSavedPresets(),
    photographyMode: 'STANDARD',
    modeCapabilities: evaluateModeCapabilities(defaultProfile),
    detectedAutoScene: 'Standard Scene',
    panoramaState: {
      isActive: false,
      capturedSlicesCount: 0,
      maxSlices: 5,
      currentYawDeg: 0,
      targetStepDeg: 18,
      pitchTiltDeg: 0,
      isStitching: false,
      statusHint: 'Tap shutter to start panorama sweep',
    },
    videoCapabilities: evaluateVideoCapabilities(defaultProfile),
    videoSettings: {
      quality: 'FHD_1080P',
      fps: 30,
      bitrate: 'AUTO',
      stabilization: 'AUTO',
      isHdrEnabled: false,
      isAudioEnabled: true,
      isSlowMotionBakedIn: false,
      isTorchEnabled: false,
    },
    videoRecordingState: {
      isRecording: false,
      isPaused: false,
      isFinalizing: false,
      elapsedDurationMs: 0,
      recordedBytes: 0,
      audioAmplitude: 0,
      hasAudioTrack: false,
    },
    isVideoSettingsOpen: false,
    isHardwareInspectorOpen: false,
    inspectorSelectedCameraId: defaultProfile?.cameraId ?? null,
    capturedMedia: [],
    lastCapturedPhoto: null,
    inspectedPhoto: null,
    isPhotoViewerOpen: false,
    isGallerySheetOpen: false,
    focusPoint: null,
    statusBanner: null,
    errorMessage: null,
  };
}

export function App() {
  const [uiState, setUiState] = useState<CameraUiState>(() => createInitialUiState());
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const shutterHandlerRef = useRef<(() => void) | null>(null);

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMediaStream(null);
  }, []);

  // Open physical browser camera track (or switch deviceId / facingMode / audio track)
  const acquireCameraStream = useCallback(
    async (options?: {
      deviceId?: string;
      facingMode?: 'environment' | 'user';
      withAudio?: boolean;
    }): Promise<boolean> => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUiState((prev) => ({
          ...prev,
          permissionStatus: 'NO_HARDWARE',
          errorMessage: 'Camera API unavailable in this browser context.',
        }));
        return false;
      }

      stopActiveStream();

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      };

      if (options?.deviceId && !options.deviceId.startsWith('virtual-')) {
        videoConstraints.deviceId = { exact: options.deviceId };
      } else {
        videoConstraints.facingMode = { ideal: options?.facingMode ?? 'environment' };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: Boolean(options?.withAudio),
        });
        streamRef.current = stream;
        setMediaStream(stream);

        const videoTrack = stream.getVideoTracks()[0] ?? null;
        const inventory = await scanBrowserCameraInventory(videoTrack);
        const settings = videoTrack?.getSettings();

        const matchedProfile: CameraHardwareProfile | null =
          inventory.selectableCameras.find((c) => settings?.deviceId && c.deviceId === settings.deviceId) ??
          inventory.selectableCameras[0] ??
          null;

        const actualSize =
          settings?.width && settings?.height
            ? { width: settings.width, height: settings.height }
            : matchedProfile?.maxJpegResolution ?? { width: 1920, height: 1080 };

        setUiState((prev) => ({
          ...prev,
          permissionStatus: 'GRANTED',
          isVirtualSensor: false,
          deviceInventory: inventory,
          activeCameraId: matchedProfile?.cameraId ?? null,
          activeHardwareProfile: matchedProfile,
          lensOption: matchedProfile?.lensFacing === 'FRONT' ? 'FRONT' : 'BACK',
          hasBackCamera: inventory.backCameraCount > 0 || inventory.selectableCameras.length > 0,
          hasFrontCamera: inventory.frontCameraCount > 0 || inventory.selectableCameras.length > 1,
          sensorCapabilities: extractSensorCapabilities(matchedProfile, actualSize),
          modeCapabilities: evaluateModeCapabilities(matchedProfile),
          videoCapabilities: evaluateVideoCapabilities(matchedProfile),
          inspectorSelectedCameraId: matchedProfile?.cameraId ?? null,
          errorMessage: null,
        }));
        return true;
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setUiState((prev) => ({
            ...prev,
            permissionStatus: 'PERMANENTLY_DENIED',
            errorMessage:
              'Camera access was denied. Enable camera permissions in browser settings or use Virtual Optical Sensor.',
          }));
        } else {
          setUiState((prev) => ({
            ...prev,
            permissionStatus: 'NO_HARDWARE',
            errorMessage:
              'No physical camera sensor detected on this device. Launch Virtual Optical Sensor to test all manual DSLR, panorama, and video controls.',
          }));
        }
        return false;
      }
    },
    [stopActiveStream]
  );

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopActiveStream();
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    };
  }, [stopActiveStream]);

  // Launch Virtual Optical Sensor fallback
  const handleUseVirtualSensor = useCallback(() => {
    stopActiveStream();
    const inv = buildVirtualCameraInventory();
    const profile = inv.selectableCameras[0] ?? null;
    setUiState((prev) => ({
      ...prev,
      permissionStatus: 'GRANTED',
      isVirtualSensor: true,
      deviceInventory: inv,
      activeCameraId: profile?.cameraId ?? '0',
      activeHardwareProfile: profile,
      lensOption: 'BACK',
      hasBackCamera: true,
      hasFrontCamera: true,
      sensorCapabilities: extractSensorCapabilities(profile, profile?.maxJpegResolution ?? null),
      modeCapabilities: evaluateModeCapabilities(profile),
      videoCapabilities: evaluateVideoCapabilities(profile),
      inspectorSelectedCameraId: profile?.cameraId ?? '0',
      statusBanner: 'Virtual Optical Sensor Active',
      errorMessage: null,
    }));
  }, [stopActiveStream]);

  // Keyboard Spacebar shutter shortcut (mirrors physical volume shutter button)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!uiState.isVolumeShutterEnabled) return;
      if (uiState.permissionStatus !== 'GRANTED') return;
      if (uiState.isPhotoViewerOpen || uiState.isGallerySheetOpen || uiState.isHardwareInspectorOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        shutterHandlerRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    uiState.isVolumeShutterEnabled,
    uiState.permissionStatus,
    uiState.isPhotoViewerOpen,
    uiState.isGallerySheetOpen,
    uiState.isHardwareInspectorOpen,
  ]);

  // Auto-dismiss transient status banner
  useEffect(() => {
    if (!uiState.statusBanner) return;
    const id = window.setTimeout(() => {
      setUiState((prev) => ({ ...prev, statusBanner: null }));
    }, 3000);
    return () => window.clearTimeout(id);
  }, [uiState.statusBanner]);

  const handleSelectCameraId = useCallback(
    (cameraId: string) => {
      const target = uiState.deviceInventory.selectableCameras.find((c) => c.cameraId === cameraId);
      if (!target) return;

      if (uiState.isVirtualSensor || target.isVirtual) {
        setUiState((prev) => ({
          ...prev,
          activeCameraId: target.cameraId,
          activeHardwareProfile: target,
          lensOption: target.lensFacing === 'FRONT' ? 'FRONT' : 'BACK',
          sensorCapabilities: extractSensorCapabilities(target, target.maxJpegResolution),
          modeCapabilities: evaluateModeCapabilities(target),
          videoCapabilities: evaluateVideoCapabilities(target),
          inspectorSelectedCameraId: target.cameraId,
          isHardwareInspectorOpen: false,
        }));
        return;
      }

      void acquireCameraStream({
        deviceId: target.deviceId,
        withAudio: uiState.captureDomain === 'VIDEO' && uiState.videoSettings.isAudioEnabled,
      });
    },
    [uiState.deviceInventory.selectableCameras, uiState.isVirtualSensor, uiState.captureDomain, uiState.videoSettings.isAudioEnabled, acquireCameraStream]
  );

  const handleSwitchCamera = useCallback(() => {
    const nextLens = uiState.lensOption === 'BACK' ? 'FRONT' : 'BACK';
    const nextTarget = uiState.deviceInventory.selectableCameras.find(
      (c) => c.lensFacing === nextLens
    );

    if (uiState.isVirtualSensor || !mediaStream) {
      if (nextTarget) handleSelectCameraId(nextTarget.cameraId);
      return;
    }

    if (nextTarget) {
      handleSelectCameraId(nextTarget.cameraId);
    } else {
      void acquireCameraStream({
        facingMode: nextLens === 'FRONT' ? 'user' : 'environment',
        withAudio: uiState.captureDomain === 'VIDEO' && uiState.videoSettings.isAudioEnabled,
      });
    }
  }, [uiState.lensOption, uiState.deviceInventory.selectableCameras, uiState.isVirtualSensor, mediaStream, handleSelectCameraId, acquireCameraStream, uiState.captureDomain, uiState.videoSettings.isAudioEnabled]);

  const handleSelectCaptureDomain = useCallback(
    (domain: AppCaptureDomain) => {
      setUiState((prev) => ({
        ...prev,
        captureDomain: domain,
        isVideoSettingsOpen: false,
        manualSettings: { ...prev.manualSettings, isProPanelOpen: false },
      }));
      if (!uiState.isVirtualSensor && uiState.permissionStatus === 'GRANTED') {
        void acquireCameraStream({
          deviceId: uiState.activeHardwareProfile?.deviceId,
          withAudio: domain === 'VIDEO' && uiState.videoSettings.isAudioEnabled,
        });
      }
    },
    [uiState.isVirtualSensor, uiState.permissionStatus, uiState.activeHardwareProfile?.deviceId, uiState.videoSettings.isAudioEnabled, acquireCameraStream]
  );

  const handleCancelCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setUiState((prev) => ({ ...prev, countdownRemainingSeconds: null }));
  }, []);

  const handleStartCountdown = useCallback(
    (onComplete: () => void) => {
      const secs = SHUTTER_TIMER_META[uiState.shutterTimer].seconds;
      if (secs <= 0) {
        onComplete();
        return;
      }
      handleCancelCountdown();
      let rem = secs;
      setUiState((prev) => ({ ...prev, countdownRemainingSeconds: rem }));
      countdownTimerRef.current = window.setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          handleCancelCountdown();
          onComplete();
        } else {
          setUiState((prev) => ({ ...prev, countdownRemainingSeconds: rem }));
        }
      }, 1000);
    },
    [uiState.shutterTimer, handleCancelCountdown]
  );

  const handleMediaCaptured = useCallback((item: CapturedPhotoInfo, keepBurstCount = false) => {
    setUiState((prev) => ({
      ...prev,
      capturedMedia: [item, ...prev.capturedMedia],
      lastCapturedPhoto: item,
      isCapturing: keepBurstCount ? prev.isCapturing : false,
      statusBanner: item.isVideo
        ? `Saved Video (${item.width}×${item.height})`
        : `${item.displayName} · ${(item.sizeBytes / 1024).toFixed(0)} KB`,
    }));
  }, []);

  if (uiState.permissionStatus !== 'GRANTED') {
    return (
      <div className="h-full w-full bg-[#090A0D]">
        <PermissionWelcomeScreen
          permissionStatus={uiState.permissionStatus}
          errorMessage={uiState.errorMessage}
          onOpenCameraClick={() => void acquireCameraStream()}
          onUseVirtualSensorClick={handleUseVirtualSensor}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#090A0D]">
      <CameraScreen
        uiState={uiState}
        mediaStream={mediaStream}
        onSelectCaptureDomain={handleSelectCaptureDomain}
        onSelectCameraId={handleSelectCameraId}
        onSwitchCamera={handleSwitchCamera}
        onSelectAspectRatio={(ratio: PreviewAspectRatio) =>
          setUiState((prev) => ({ ...prev, aspectRatio: ratio }))
        }
        onToggleFlash={() =>
          setUiState((prev) => ({ ...prev, flashSetting: FLASH_NEXT[prev.flashSetting] }))
        }
        onCycleTimer={() =>
          setUiState((prev) => ({
            ...prev,
            shutterTimer: SHUTTER_TIMER_META[prev.shutterTimer].next,
          }))
        }
        onToggleQuickCapture={() =>
          setUiState((prev) => ({
            ...prev,
            captureSpeedMode: prev.captureSpeedMode === 'MAX_QUALITY' ? 'QUICK' : 'MAX_QUALITY',
          }))
        }
        onToggleBurstMode={() =>
          setUiState((prev) => ({ ...prev, isBurstModeEnabled: !prev.isBurstModeEnabled }))
        }
        onZoomChange={(zoom: number) =>
          setUiState((prev) => ({
            ...prev,
            sensorCapabilities: { ...prev.sensorCapabilities, currentZoomRatio: zoom },
          }))
        }
        onExposureCompChange={(index: number) =>
          setUiState((prev) => ({
            ...prev,
            sensorCapabilities: { ...prev.sensorCapabilities, currentExposureIndex: index },
          }))
        }
        onFocusPointChange={(pt) => setUiState((prev) => ({ ...prev, focusPoint: pt }))}
        onToggleProPanel={() =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isProPanelOpen: !prev.manualSettings.isProPanelOpen,
            },
          }))
        }
        onSelectProTab={(tab: ProControlTab) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: { ...prev.manualSettings, activeProTab: tab },
          }))
        }
        onSetManualIso={(enabled: boolean, iso: number | null) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isManualIsoEnabled: enabled,
              manualIso: iso,
            },
          }))
        }
        onSetManualShutter={(enabled: boolean, ns: number | null) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isManualShutterEnabled: enabled,
              manualShutterNs: ns,
            },
          }))
        }
        onSetWhiteBalance={(wb: WhiteBalanceOption) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              whiteBalanceMode: wb,
              manualKelvin: WHITE_BALANCE_META[wb].approxKelvin ?? prev.manualSettings.manualKelvin,
            },
          }))
        }
        onSetManualKelvin={(kelvin: number) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              whiteBalanceMode: 'MANUAL_KELVIN',
              manualKelvin: kelvin,
            },
          }))
        }
        onSetManualFocus={(enabled: boolean, diopters: number | null) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isManualFocusEnabled: enabled,
              manualFocusDiopters: diopters ?? prev.manualSettings.manualFocusDiopters,
            },
          }))
        }
        onSelectCaptureFormat={(fmt: CaptureOutputFormat) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              captureOutputFormat: fmt,
              isRawCaptureEnabled: fmt !== 'JPEG',
            },
          }))
        }
        onToggleExposureLock={() =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isExposureLockEnabled: !prev.manualSettings.isExposureLockEnabled,
            },
          }))
        }
        onSelectStabilization={(stab: StabilizationSelection) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: { ...prev.manualSettings, stabilizationSelection: stab },
          }))
        }
        onToggleFocusPeaking={() =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isFocusPeakingEnabled: !prev.manualSettings.isFocusPeakingEnabled,
            },
          }))
        }
        onCycleFocusPeakingColor={() =>
          setUiState((prev) => {
            const order = ['CYAN', 'RED', 'YELLOW'] as const;
            const next = order[(order.indexOf(prev.manualSettings.focusPeakingColor) + 1) % order.length];
            return {
              ...prev,
              manualSettings: { ...prev.manualSettings, focusPeakingColor: next },
            };
          })
        }
        onToggleHistogram={() =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isHistogramEnabled: !prev.manualSettings.isHistogramEnabled,
            },
          }))
        }
        onToggleZebra={() =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: {
              ...prev.manualSettings,
              isZebraEnabled: !prev.manualSettings.isZebraEnabled,
            },
          }))
        }
        onSetZebraThreshold={(pct: number) =>
          setUiState((prev) => ({
            ...prev,
            manualSettings: { ...prev.manualSettings, zebraThresholdPercent: pct },
          }))
        }
        onToggleGrid={() => setUiState((prev) => ({ ...prev, isGridEnabled: !prev.isGridEnabled }))}
        onToggleLevel={() =>
          setUiState((prev) => ({ ...prev, isLevelEnabled: !prev.isLevelEnabled }))
        }
        onToggleFrontMirror={() =>
          setUiState((prev) => ({ ...prev, isFrontMirrorEnabled: !prev.isFrontMirrorEnabled }))
        }
        onToggleVolumeShutter={() =>
          setUiState((prev) => ({
            ...prev,
            isVolumeShutterEnabled: !prev.isVolumeShutterEnabled,
          }))
        }
        onSavePreset={(name: string) =>
          setUiState((prev) => {
            const nextPreset: ProPreset = {
              id: `preset_${Date.now()}`,
              name,
              isManualIsoEnabled: prev.manualSettings.isManualIsoEnabled,
              manualIso: prev.manualSettings.manualIso,
              isManualShutterEnabled: prev.manualSettings.isManualShutterEnabled,
              manualShutterNs: prev.manualSettings.manualShutterNs,
              whiteBalanceMode: prev.manualSettings.whiteBalanceMode,
              manualKelvin: prev.manualSettings.manualKelvin,
              isManualFocusEnabled: prev.manualSettings.isManualFocusEnabled,
              manualFocusDiopters: prev.manualSettings.manualFocusDiopters,
              exposureCompIndex: prev.sensorCapabilities.currentExposureIndex,
              captureOutputFormat: prev.manualSettings.captureOutputFormat,
              stabilizationSelection: prev.manualSettings.stabilizationSelection,
              isFocusPeakingEnabled: prev.manualSettings.isFocusPeakingEnabled,
              isHistogramEnabled: prev.manualSettings.isHistogramEnabled,
              isZebraEnabled: prev.manualSettings.isZebraEnabled,
            };
            const updated = [...prev.customPresets, nextPreset];
            persistPresets(updated);
            return { ...prev, customPresets: updated, statusBanner: `Saved preset "${name}"` };
          })
        }
        onApplyPreset={(preset: ProPreset) =>
          setUiState((prev) => ({
            ...prev,
            sensorCapabilities: {
              ...prev.sensorCapabilities,
              currentExposureIndex: preset.exposureCompIndex,
            },
            manualSettings: {
              ...prev.manualSettings,
              isManualIsoEnabled: preset.isManualIsoEnabled,
              manualIso: preset.manualIso,
              isManualShutterEnabled: preset.isManualShutterEnabled,
              manualShutterNs: preset.manualShutterNs,
              whiteBalanceMode: preset.whiteBalanceMode,
              manualKelvin: preset.manualKelvin,
              isManualFocusEnabled: preset.isManualFocusEnabled,
              manualFocusDiopters: preset.manualFocusDiopters,
              captureOutputFormat: preset.captureOutputFormat,
              stabilizationSelection: preset.stabilizationSelection,
              isFocusPeakingEnabled: preset.isFocusPeakingEnabled,
              isHistogramEnabled: preset.isHistogramEnabled,
              isZebraEnabled: preset.isZebraEnabled,
            },
            statusBanner: `Applied preset "${preset.name}"`,
          }))
        }
        onDeletePreset={(id: string) =>
          setUiState((prev) => {
            const updated = prev.customPresets.filter((p) => p.id !== id);
            persistPresets(updated);
            return { ...prev, customPresets: updated };
          })
        }
        onResetAllToAuto={() =>
          setUiState((prev) => ({
            ...prev,
            sensorCapabilities: { ...prev.sensorCapabilities, currentExposureIndex: 0 },
            manualSettings: {
              ...prev.manualSettings,
              isManualIsoEnabled: false,
              manualIso: null,
              isManualShutterEnabled: false,
              manualShutterNs: null,
              whiteBalanceMode: 'AUTO',
              manualKelvin: 5500,
              isManualFocusEnabled: false,
              manualFocusDiopters: 0,
              isExposureLockEnabled: false,
              captureOutputFormat: 'JPEG',
              isRawCaptureEnabled: false,
              stabilizationSelection: 'AUTO',
              isFocusPeakingEnabled: false,
              isHistogramEnabled: false,
              isZebraEnabled: false,
            },
            statusBanner: 'All sensor parameters reset to Auto',
          }))
        }
        onSelectPhotographyMode={(mode: PhotographyMode) =>
          setUiState((prev) => ({
            ...prev,
            photographyMode: mode,
            isBurstModeEnabled: mode === 'STANDARD' ? prev.isBurstModeEnabled : false,
          }))
        }
        onSelectVideoQuality={(q: VideoQualityOption) =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, quality: q },
          }))
        }
        onSelectVideoFps={(fps: VideoFpsOption) =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: {
              ...prev.videoSettings,
              fps,
              isHdrEnabled: fps >= 120 ? false : prev.videoSettings.isHdrEnabled,
            },
          }))
        }
        onSelectVideoBitrate={(br: VideoBitrateOption) =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, bitrate: br },
          }))
        }
        onToggleVideoHdr={() =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, isHdrEnabled: !prev.videoSettings.isHdrEnabled },
          }))
        }
        onSelectVideoStabilization={(stab: StabilizationSelection) =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, stabilization: stab },
          }))
        }
        onToggleVideoAudio={() => {
          const nextAudio = !uiState.videoSettings.isAudioEnabled;
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, isAudioEnabled: nextAudio },
          }));
          if (!uiState.isVirtualSensor && uiState.captureDomain === 'VIDEO') {
            void acquireCameraStream({
              deviceId: uiState.activeHardwareProfile?.deviceId,
              withAudio: nextAudio,
            });
          }
        }}
        onToggleVideoSlowMoBaked={() =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: {
              ...prev.videoSettings,
              isSlowMotionBakedIn: !prev.videoSettings.isSlowMotionBakedIn,
            },
          }))
        }
        onToggleVideoTorch={() =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: {
              ...prev.videoSettings,
              isTorchEnabled: !prev.videoSettings.isTorchEnabled,
            },
          }))
        }
        onToggleVideoSettingsOpen={() =>
          setUiState((prev) => ({
            ...prev,
            isVideoSettingsOpen: !prev.isVideoSettingsOpen,
          }))
        }
        onOpenHardwareInspector={() =>
          setUiState((prev) => ({
            ...prev,
            isHardwareInspectorOpen: true,
            inspectorSelectedCameraId: prev.activeCameraId,
          }))
        }
        onOpenLastPhoto={() => {
          if (uiState.lastCapturedPhoto) {
            setUiState((prev) => ({
              ...prev,
              inspectedPhoto: prev.lastCapturedPhoto,
              isPhotoViewerOpen: true,
            }));
          } else {
            setUiState((prev) => ({ ...prev, isGallerySheetOpen: true }));
          }
        }}
        onOpenGallery={() => setUiState((prev) => ({ ...prev, isGallerySheetOpen: true }))}
        onDismissBanner={() => setUiState((prev) => ({ ...prev, statusBanner: null }))}
        onDismissError={() => setUiState((prev) => ({ ...prev, errorMessage: null }))}
        onUpdateAnalysis={(analysis: FrameAnalysisData, detectedScene: DetectedSceneType) =>
          setUiState((prev) => ({
            ...prev,
            frameAnalysis: analysis,
            detectedAutoScene: detectedScene,
          }))
        }
        onMediaCaptured={handleMediaCaptured}
        onSetCapturingState={(isCapturing: boolean, burstProgressCount: number | null = null) =>
          setUiState((prev) => ({ ...prev, isCapturing, burstProgressCount }))
        }
        onTriggerShutterFlash={() =>
          setUiState((prev) => ({ ...prev, shutterBlinkCounter: prev.shutterBlinkCounter + 1 }))
        }
        onUpdatePanoramaState={(patch) =>
          setUiState((prev) => ({
            ...prev,
            panoramaState: { ...prev.panoramaState, ...patch },
          }))
        }
        onUpdateVideoRecordingState={(patch) =>
          setUiState((prev) => ({
            ...prev,
            videoRecordingState: { ...prev.videoRecordingState, ...patch },
          }))
        }
        onStartCountdown={handleStartCountdown}
        onCancelCountdown={handleCancelCountdown}
        registerShutterHandler={(fn) => {
          shutterHandlerRef.current = fn;
        }}
      />

      {/* Hardware Capabilities Inspector Overlay */}
      {uiState.isHardwareInspectorOpen && (
        <HardwareInspectorOverlay
          inventory={uiState.deviceInventory}
          selectedCameraId={uiState.inspectorSelectedCameraId}
          activeCameraId={uiState.activeCameraId}
          onSelectCamera={(id: string) =>
            setUiState((prev) => ({ ...prev, inspectorSelectedCameraId: id }))
          }
          onUseCameraInViewfinder={handleSelectCameraId}
          onClose={() => setUiState((prev) => ({ ...prev, isHardwareInspectorOpen: false }))}
        />
      )}

      {/* Fullscreen Photo/Video Viewer Overlay */}
      {uiState.isPhotoViewerOpen && uiState.inspectedPhoto && (
        <PhotoViewerOverlay
          photo={uiState.inspectedPhoto}
          onClose={() => setUiState((prev) => ({ ...prev, isPhotoViewerOpen: false }))}
        />
      )}

      {/* Session Media Gallery Overlay */}
      {uiState.isGallerySheetOpen && (
        <SessionGalleryModal
          media={uiState.capturedMedia}
          onSelectMedia={(item) =>
            setUiState((prev) => ({
              ...prev,
              inspectedPhoto: item,
              isPhotoViewerOpen: true,
              isGallerySheetOpen: false,
            }))
          }
          onImportLocalFile={(file: File) => {
            const url = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');
            const item: CapturedPhotoInfo = {
              id: `IMP_${Date.now()}`,
              url,
              blob: file,
              width: 1920,
              height: 1080,
              sizeBytes: file.size,
              displayName: file.name,
              timestampMillis: Date.now(),
              isVideo,
              durationMs: 0,
              mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
              videoFrameRate: null,
              isHdrVideo: false,
            };
            setUiState((prev) => ({
              ...prev,
              capturedMedia: [item, ...prev.capturedMedia],
              lastCapturedPhoto: item,
              inspectedPhoto: item,
              isPhotoViewerOpen: true,
              isGallerySheetOpen: false,
            }));
          }}
          onClose={() => setUiState((prev) => ({ ...prev, isGallerySheetOpen: false }))}
        />
      )}
    </div>
  );
}

export default App;
