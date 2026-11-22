import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppCaptureDomain,
  CameraHardwareProfile,
  CameraUiState,
  CameraUserPreferences,
  CaptureOutputFormat,
  CapturedPhotoInfo,
  DetectedSceneType,
  FLASH_NEXT,
  FlashSetting,
  FrameAnalysisData,
  GalleryFilterTab,
  PhotographyMode,
  PreviewAspectRatio,
  ProControlTab,
  ProPreset,
  SHUTTER_TIMER_META,
  ShutterTimer,
  StabilizationSelection,
  VIDEO_QUALITY_META,
  VideoBitrateOption,
  VideoFpsOption,
  VideoQualityOption,
  WHITE_BALANCE_META,
  WhiteBalanceOption,
} from './types/camera';
import {
  FilterId,
  getFilterById,
  loadFilterPreferences,
  persistFilterPreferences,
} from './types/filters';
import { loadSavedPresets, persistPresets } from './utils/cameraUtils';
import {
  clearCameraPreferences,
  loadCameraPreferences,
  loadLastSessionState,
  persistCameraPreferences,
  playTimerBeep,
  saveLastSessionState,
} from './utils/settingsStorage';
import {
  buildPickedMediaItems,
  deleteMediaFromDb,
  loadAllMediaFromDb,
  saveMediaToDb,
  updateMediaFavoriteInDb,
} from './utils/mediaStorage';
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
import { PhotoViewerOverlay } from './components/PhotoViewerOverlay';
import { GalleryOverlay } from './components/GalleryOverlay';
import { PhotoEditorOverlay } from './components/PhotoEditorOverlay';
import { VideoEditorOverlay } from './components/VideoEditorOverlay';
import { CameraSettingsOverlay } from './components/CameraSettingsOverlay';

function resolvePreferredLens(prefs: CameraUserPreferences): 'BACK' | 'FRONT' {
  if (prefs.defaultCameraLens === 'LAST_USED') {
    return loadLastSessionState()?.lens ?? 'BACK';
  }
  return prefs.defaultCameraLens;
}

function createInitialUiState(prefs: CameraUserPreferences): CameraUiState {
  const virtualInv = buildVirtualCameraInventory();
  const preferredLens = resolvePreferredLens(prefs);
  const defaultProfile =
    virtualInv.selectableCameras.find((c) => c.lensFacing === preferredLens) ??
    virtualInv.selectableCameras[0] ??
    null;

  const lastSession = loadLastSessionState();
  const filterPrefs = loadFilterPreferences();
  let initialDomain: AppCaptureDomain = 'PHOTO';
  let initialPhotoMode: PhotographyMode = 'STANDARD';
  let initialProOpen = false;

  if (prefs.defaultCameraMode === 'VIDEO') {
    initialDomain = 'VIDEO';
  } else if (prefs.defaultCameraMode === 'PRO_MANUAL') {
    initialProOpen = true;
  } else if (prefs.defaultCameraMode === 'LAST_USED' && lastSession) {
    initialDomain = lastSession.domain;
    initialPhotoMode = lastSession.photographyMode;
  } else if (prefs.defaultCameraMode !== 'LAST_USED') {
    initialPhotoMode = prefs.defaultCameraMode;
  }

  return {
    permissionStatus: 'NOT_REQUESTED',
    isVirtualSensor: false,
    captureDomain: initialDomain,
    deviceInventory: virtualInv,
    activeCameraId: defaultProfile?.cameraId ?? null,
    activeHardwareProfile: defaultProfile,
    lensOption: preferredLens,
    hasBackCamera: true,
    hasFrontCamera: true,
    aspectRatio: 'RATIO_4_3',
    flashSetting: prefs.defaultFlash,
    shutterTimer: prefs.defaultTimer,
    countdownRemainingSeconds: null,
    captureSpeedMode: 'MAX_QUALITY',
    isBurstModeEnabled: false,
    burstProgressCount: null,
    isGridEnabled: prefs.gridStyle !== 'OFF',
    isLevelEnabled: false,
    isFrontMirrorEnabled: prefs.mirrorSelfie,
    isVolumeShutterEnabled: prefs.volumeShutterAction !== 'OFF',
    isCapturing: false,
    shutterBlinkCounter: 0,
    sensorCapabilities: extractSensorCapabilities(defaultProfile, defaultProfile?.maxJpegResolution ?? null),
    manualSettings: {
      isProPanelOpen: initialProOpen,
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
    photographyMode: initialPhotoMode,
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
      quality: prefs.defaultVideoQuality,
      fps: prefs.defaultVideoFps,
      bitrate: 'AUTO',
      stabilization: 'AUTO',
      isHdrEnabled: false,
      isAudioEnabled: prefs.audioRecordingPref !== 'MUTE',
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
    isQuickSettingsOpen: false,
    isSettingsOpen: false,
    isHardwareInspectorOpen: false,
    inspectorSelectedCameraId: defaultProfile?.cameraId ?? null,
    capturedMedia: [],
    lastCapturedPhoto: null,
    inspectedPhoto: null,
    isPhotoViewerOpen: false,
    isGallerySheetOpen: false,
    isPhotoEditorOpen: false,
    editorTargetPhoto: null,
    isVideoEditorOpen: false,
    videoEditorTarget: null,
    activeFilterId: filterPrefs.lastFilterId,
    filterIntensity: filterPrefs.lastIntensity,
    favoriteFilterIds: filterPrefs.favoriteFilterIds,
    isFilterPanelOpen: false,
    preserveOriginalOnFilteredCapture: filterPrefs.preserveOriginalOnFilteredCapture,
    focusPoint: null,
    statusBanner: null,
    errorMessage: null,
  };
}

export function App() {
  const [preferences, setPreferences] = useState<CameraUserPreferences>(() => loadCameraPreferences());
  const [uiState, setUiState] = useState<CameraUiState>(() => createInitialUiState(preferences));
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [galleryTab, setGalleryTab] = useState<GalleryFilterTab>('RECENT');

  const preferencesRef = useRef<CameraUserPreferences>(preferences);
  preferencesRef.current = preferences;
  const uiStateRef = useRef<CameraUiState>(uiState);
  uiStateRef.current = uiState;
  const capturedMediaRef = useRef<CapturedPhotoInfo[]>(uiState.capturedMedia);
  capturedMediaRef.current = uiState.capturedMedia;

  const streamRef = useRef<MediaStream | null>(null);
  const streamRequestIdRef = useRef(0);
  const intentionalStopRef = useRef(false);
  const pausedForBackgroundRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);
  const shutterHandlerRef = useRef<(() => void) | null>(null);

  const stopActiveStream = useCallback(() => {
    intentionalStopRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
    }
    setMediaStream(null);
  }, []);

  // Open physical browser camera track strictly for video preview (never requests microphone here)
  const acquireCameraStream = useCallback(
    async (options?: {
      deviceId?: string;
      facingMode?: 'environment' | 'user';
      domain?: AppCaptureDomain;
    }): Promise<boolean> => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUiState((prev) => ({
          ...prev,
          permissionStatus: 'NO_HARDWARE',
          errorMessage: 'Camera API unavailable in this browser context.',
        }));
        return false;
      }

      const reqId = ++streamRequestIdRef.current;
      stopActiveStream();
      intentionalStopRef.current = false;

      const targetDomain = options?.domain ?? uiStateRef.current.captureDomain;
      const preferredLens = resolvePreferredLens(preferencesRef.current);
      const videoSpec = VIDEO_QUALITY_META[uiStateRef.current.videoSettings.quality];

      const videoConstraints: MediaTrackConstraints =
        targetDomain === 'VIDEO'
          ? {
              width: { ideal: videoSpec.nominalWidth },
              height: { ideal: videoSpec.nominalHeight },
              frameRate: { ideal: Math.min(60, uiStateRef.current.videoSettings.fps) },
            }
          : {
              width: { ideal: 3840 },
              height: { ideal: 2160 },
            };

      if (options?.deviceId && !options.deviceId.startsWith('virtual-')) {
        videoConstraints.deviceId = { exact: options.deviceId };
      } else {
        const targetFacing = options?.facingMode ?? (preferredLens === 'FRONT' ? 'user' : 'environment');
        videoConstraints.facingMode = { ideal: targetFacing };
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        // Abort if superseded by a newer lens switch, component unmount, or background transition
        if (reqId !== streamRequestIdRef.current || isUnmountedRef.current || document.hidden) {
          stream.getTracks().forEach((t) => t.stop());
          if (document.hidden && !isUnmountedRef.current) {
            pausedForBackgroundRef.current = true;
          }
          return false;
        }

        streamRef.current = stream;
        setMediaStream(stream);

        const videoTrack = stream.getVideoTracks()[0] ?? null;
        if (videoTrack) {
          videoTrack.onended = () => {
            if (intentionalStopRef.current || isUnmountedRef.current || document.hidden) return;
            streamRef.current = null;
            setMediaStream(null);

            const checkRevoked = async () => {
              let nextStatus: CameraUiState['permissionStatus'] = 'NO_HARDWARE';
              let msg =
                'Camera stream was interrupted or disconnected. Tap Retry or launch Virtual Optical Sensor.';
              try {
                if (navigator.permissions?.query) {
                  const res = await navigator.permissions.query({
                    name: 'camera' as PermissionName,
                  });
                  if (res.state === 'denied') {
                    nextStatus = 'PERMANENTLY_DENIED';
                    msg =
                      'Camera permission was revoked while the app was open. Re-enable permission in browser settings.';
                  }
                }
              } catch {
                // Ignore unsupported PermissionName queries
              }
              if (!isUnmountedRef.current) {
                setUiState((prev) => ({
                  ...prev,
                  permissionStatus: nextStatus,
                  errorMessage: msg,
                }));
              }
            };
            void checkRevoked();
          };
        }

        const inventory = await scanBrowserCameraInventory(videoTrack);
        if (reqId !== streamRequestIdRef.current || isUnmountedRef.current) {
          return false;
        }

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
        if (reqId !== streamRequestIdRef.current || isUnmountedRef.current) {
          return false;
        }
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

  // Hydrate persisted gallery media from IndexedDB on startup
  useEffect(() => {
    let active = true;
    void loadAllMediaFromDb().then((stored) => {
      if (!active || stored.length === 0) return;
      setUiState((prev) => ({
        ...prev,
        capturedMedia: stored,
        lastCapturedPhoto: stored[0] ?? null,
      }));
    });
    return () => {
      active = false;
    };
  }, []);

  // Release camera hardware immediately on background/pagehide; re-acquire cleanly on foreground
  useEffect(() => {
    const cancelCountdownAndRelease = () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setUiState((prev) =>
        prev.countdownRemainingSeconds !== null ? { ...prev, countdownRemainingSeconds: null } : prev
      );
      const current = uiStateRef.current;
      if (current.permissionStatus === 'GRANTED' && !current.isVirtualSensor) {
        streamRequestIdRef.current += 1;
        stopActiveStream();
        pausedForBackgroundRef.current = true;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelCountdownAndRelease();
      } else if (pausedForBackgroundRef.current) {
        pausedForBackgroundRef.current = false;
        const current = uiStateRef.current;
        if (current.permissionStatus === 'GRANTED' && !current.isVirtualSensor) {
          void acquireCameraStream({
            deviceId: current.activeHardwareProfile?.deviceId,
            facingMode: current.lensOption === 'FRONT' ? 'user' : 'environment',
            domain: current.captureDomain,
          });
        }
      }
    };

    const onPageHide = () => {
      cancelCountdownAndRelease();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [stopActiveStream, acquireCameraStream]);

  // Clean up camera stream, timers, and blob URLs on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      streamRequestIdRef.current += 1;
      stopActiveStream();
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
      capturedMediaRef.current.forEach((m) => {
        if (m.url.startsWith('blob:')) URL.revokeObjectURL(m.url);
      });
    };
  }, [stopActiveStream]);

  // Persist last used lens/domain/mode for LAST_USED startup preferences
  useEffect(() => {
    if (uiState.permissionStatus !== 'GRANTED') return;
    saveLastSessionState({
      lens: uiState.lensOption,
      domain: uiState.captureDomain,
      photographyMode: uiState.photographyMode,
    });
  }, [uiState.permissionStatus, uiState.lensOption, uiState.captureDomain, uiState.photographyMode]);

  // Persist user filter selection, intensity, favorites, and dual-save preference
  useEffect(() => {
    persistFilterPreferences({
      favoriteFilterIds: uiState.favoriteFilterIds,
      lastFilterId: uiState.activeFilterId,
      lastIntensity: uiState.filterIntensity,
      preserveOriginalOnFilteredCapture: uiState.preserveOriginalOnFilteredCapture,
    });
  }, [
    uiState.favoriteFilterIds,
    uiState.activeFilterId,
    uiState.filterIntensity,
    uiState.preserveOriginalOnFilteredCapture,
  ]);

  // Launch Virtual Optical Sensor fallback
  const handleUseVirtualSensor = useCallback(() => {
    stopActiveStream();
    const inv = buildVirtualCameraInventory();
    const preferredLens = resolvePreferredLens(preferencesRef.current);
    const profile =
      inv.selectableCameras.find((c) => c.lensFacing === preferredLens) ??
      inv.selectableCameras[0] ??
      null;
    setUiState((prev) => ({
      ...prev,
      permissionStatus: 'GRANTED',
      isVirtualSensor: true,
      deviceInventory: inv,
      activeCameraId: profile?.cameraId ?? '0',
      activeHardwareProfile: profile,
      lensOption: profile?.lensFacing === 'FRONT' ? 'FRONT' : 'BACK',
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

  // Update persisted camera preferences + sync live viewfinder controls
  const handleUpdatePreferences = useCallback(
    (updater: (prev: CameraUserPreferences) => CameraUserPreferences) => {
      setPreferences((prev) => {
        const next = updater(prev);
        persistCameraPreferences(next);

        setUiState((ui) => ({
          ...ui,
          isGridEnabled: next.gridStyle !== 'OFF',
          shutterTimer: next.defaultTimer,
          flashSetting: next.defaultFlash,
          isFrontMirrorEnabled: next.mirrorSelfie,
          isVolumeShutterEnabled: next.volumeShutterAction !== 'OFF',
          videoSettings: {
            ...ui.videoSettings,
            quality: next.defaultVideoQuality,
            fps: next.defaultVideoFps,
            isAudioEnabled: next.audioRecordingPref !== 'MUTE',
          },
        }));

        return next;
      });
    },
    []
  );

  // Hardware volume / Spacebar shortcut (Capture or Zoom +/- based on preferences)
  useEffect(() => {
    const action = preferences.volumeShutterAction;
    if (action === 'OFF' || !uiState.isVolumeShutterEnabled) return;
    if (uiState.permissionStatus !== 'GRANTED') return;
    if (
      uiState.isPhotoViewerOpen ||
      uiState.isGallerySheetOpen ||
      uiState.isPhotoEditorOpen ||
      uiState.isVideoEditorOpen ||
      uiState.isHardwareInspectorOpen ||
      uiState.isSettingsOpen
    ) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (action === 'CAPTURE') {
        if (
          e.code === 'Space' ||
          e.key === 'AudioVolumeUp' ||
          e.key === 'AudioVolumeDown' ||
          e.code === 'PageUp' ||
          e.code === 'PageDown'
        ) {
          e.preventDefault();
          shutterHandlerRef.current?.();
        }
      } else if (action === 'ZOOM') {
        const isZoomIn =
          e.key === 'AudioVolumeUp' || e.code === 'PageUp' || e.code === 'ArrowUp';
        const isZoomOut =
          e.key === 'AudioVolumeDown' || e.code === 'PageDown' || e.code === 'ArrowDown';
        if (isZoomIn || isZoomOut) {
          e.preventDefault();
          setUiState((prev) => {
            const step = isZoomIn ? 0.2 : -0.2;
            const nextZoom = Math.min(
              prev.sensorCapabilities.maxZoomRatio,
              Math.max(
                prev.sensorCapabilities.minZoomRatio,
                Number((prev.sensorCapabilities.currentZoomRatio + step).toFixed(2))
              )
            );
            return {
              ...prev,
              sensorCapabilities: { ...prev.sensorCapabilities, currentZoomRatio: nextZoom },
            };
          });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    preferences.volumeShutterAction,
    uiState.isVolumeShutterEnabled,
    uiState.permissionStatus,
    uiState.isPhotoViewerOpen,
    uiState.isGallerySheetOpen,
    uiState.isPhotoEditorOpen,
    uiState.isVideoEditorOpen,
    uiState.isHardwareInspectorOpen,
    uiState.isSettingsOpen,
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
        domain: uiState.captureDomain,
      });
    },
    [uiState.deviceInventory.selectableCameras, uiState.isVirtualSensor, uiState.captureDomain, acquireCameraStream]
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
        domain: uiState.captureDomain,
      });
    }
  }, [uiState.lensOption, uiState.deviceInventory.selectableCameras, uiState.isVirtualSensor, mediaStream, handleSelectCameraId, acquireCameraStream, uiState.captureDomain]);

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
          domain,
        });
      }
    },
    [uiState.isVirtualSensor, uiState.permissionStatus, uiState.activeHardwareProfile?.deviceId, acquireCameraStream]
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
      if (preferencesRef.current.timerAudioBeep) {
        playTimerBeep(rem === 1);
      }
      setUiState((prev) => ({ ...prev, countdownRemainingSeconds: rem }));
      countdownTimerRef.current = window.setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          handleCancelCountdown();
          onComplete();
        } else {
          if (preferencesRef.current.timerAudioBeep) {
            playTimerBeep(rem === 1);
          }
          setUiState((prev) => ({ ...prev, countdownRemainingSeconds: rem }));
        }
      }, 1000);
    },
    [uiState.shutterTimer, handleCancelCountdown]
  );

  const handleMediaCaptured = useCallback((item: CapturedPhotoInfo, keepBurstCount = false) => {
    const prefs = preferencesRef.current;
    const isPrivate = prefs.privacy.privateSessionMode;

    if (!isPrivate) {
      void saveMediaToDb(item).then((res) => {
        if (!res.ok && !isUnmountedRef.current) {
          setUiState((prev) => ({
            ...prev,
            errorMessage: res.error ?? 'Failed to save media to local storage.',
          }));
        }
      });
    }

    if (prefs.saveLocation === 'GALLERY_AND_DOWNLOAD') {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.displayName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setUiState((prev) => ({
      ...prev,
      capturedMedia: [item, ...prev.capturedMedia],
      lastCapturedPhoto: item,
      isCapturing: keepBurstCount ? prev.isCapturing : false,
      statusBanner: item.isVideo
        ? `${isPrivate ? 'Private' : 'Saved'} Video (${item.width}×${item.height})`
        : `${item.displayName} · ${(item.sizeBytes / 1024).toFixed(0)} KB${isPrivate ? ' (Private)' : ''}`,
    }));
  }, []);

  const handleToggleFavorite = useCallback((id: string) => {
    setUiState((prev) => {
      let updatedStatus = prev.statusBanner;
      const nextMedia = prev.capturedMedia.map((m) => {
        if (m.id !== id) return m;
        const nextFav = !m.isFavorite;
        void updateMediaFavoriteInDb(id, nextFav);
        updatedStatus = nextFav ? 'Added to Favorites' : 'Removed from Favorites';
        return { ...m, isFavorite: nextFav };
      });
      const nextInspected =
        prev.inspectedPhoto?.id === id
          ? { ...prev.inspectedPhoto, isFavorite: !prev.inspectedPhoto.isFavorite }
          : prev.inspectedPhoto;
      const nextLast =
        prev.lastCapturedPhoto?.id === id
          ? { ...prev.lastCapturedPhoto, isFavorite: !prev.lastCapturedPhoto.isFavorite }
          : prev.lastCapturedPhoto;

      return {
        ...prev,
        capturedMedia: nextMedia,
        inspectedPhoto: nextInspected,
        lastCapturedPhoto: nextLast,
        statusBanner: updatedStatus,
      };
    });
  }, []);

  const handleDeleteMediaIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    ids.forEach((id) => {
      void deleteMediaFromDb(id);
    });
    setUiState((prev) => {
      const removedSet = new Set(ids);
      prev.capturedMedia.forEach((m) => {
        if (removedSet.has(m.id) && m.url.startsWith('blob:')) {
          URL.revokeObjectURL(m.url);
        }
      });
      const remaining = prev.capturedMedia.filter((m) => !removedSet.has(m.id));
      const inspectedRemoved = prev.inspectedPhoto && removedSet.has(prev.inspectedPhoto.id);
      const nextInspected = inspectedRemoved ? (remaining[0] ?? null) : prev.inspectedPhoto;
      return {
        ...prev,
        capturedMedia: remaining,
        lastCapturedPhoto: remaining[0] ?? null,
        inspectedPhoto: nextInspected,
        isPhotoViewerOpen: inspectedRemoved ? Boolean(nextInspected) && prev.isPhotoViewerOpen : prev.isPhotoViewerOpen,
        statusBanner: ids.length === 1 ? 'Deleted media item' : `Deleted ${ids.length} items`,
      };
    });
  }, []);

  const handleShareItem = useCallback(async (item: CapturedPhotoInfo) => {
    if (navigator.share && item.blob) {
      try {
        const file = new File([item.blob], item.displayName, { type: item.mimeType });
        await navigator.share({
          title: item.displayName,
          files: [file],
        });
        return;
      } catch {
        // Fallback to clean file download if system share sheet is dismissed or unsupported
      }
    }
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handlePickMediaFiles = useCallback(async (files: FileList) => {
    const imported = await buildPickedMediaItems(files);
    if (imported.length === 0) {
      setUiState((prev) => ({
        ...prev,
        errorMessage: 'Selected files could not be read or contained empty data.',
      }));
      return;
    }
    void Promise.all(imported.map((item) => saveMediaToDb(item))).then((results) => {
      const failed = results.find((r) => !r.ok);
      if (failed && !isUnmountedRef.current) {
        setUiState((prev) => ({
          ...prev,
          errorMessage: failed.error ?? 'Some imported items could not be persisted locally.',
        }));
      }
    });
    setUiState((prev) => ({
      ...prev,
      capturedMedia: [...imported, ...prev.capturedMedia],
      lastCapturedPhoto: imported[0] ?? prev.lastCapturedPhoto,
      statusBanner: `Imported ${imported.length} ${imported.length === 1 ? 'item' : 'items'} via Photo Picker`,
    }));
  }, []);

  const handleSaveEditedCopy = useCallback((newItem: CapturedPhotoInfo) => {
    void saveMediaToDb(newItem).then((res) => {
      if (!res.ok && !isUnmountedRef.current) {
        setUiState((prev) => ({
          ...prev,
          errorMessage: res.error ?? 'Failed to save edited copy to device storage.',
        }));
      }
    });
    setUiState((prev) => ({
      ...prev,
      capturedMedia: [newItem, ...prev.capturedMedia],
      lastCapturedPhoto: newItem,
      inspectedPhoto: newItem,
      isPhotoEditorOpen: false,
      editorTargetPhoto: null,
      isPhotoViewerOpen: true,
      statusBanner: `Saved non-destructive copy (${newItem.width}×${newItem.height})`,
    }));
  }, []);

  const handleSaveFilteredVideoCopy = useCallback((newItem: CapturedPhotoInfo) => {
    void saveMediaToDb(newItem).then((res) => {
      if (!res.ok && !isUnmountedRef.current) {
        setUiState((prev) => ({
          ...prev,
          errorMessage: res.error ?? 'Failed to save filtered video copy to device storage.',
        }));
      }
    });
    setUiState((prev) => ({
      ...prev,
      capturedMedia: [newItem, ...prev.capturedMedia],
      lastCapturedPhoto: newItem,
      inspectedPhoto: newItem,
      isVideoEditorOpen: false,
      videoEditorTarget: null,
      isPhotoViewerOpen: true,
      statusBanner: `Saved filtered video copy (${newItem.width}×${newItem.height})`,
    }));
  }, []);

  const handleToggleFavoriteFilter = useCallback((id: FilterId) => {
    if (id === 'original') return;
    setUiState((prev) => {
      const exists = prev.favoriteFilterIds.includes(id);
      const nextFavs = exists
        ? prev.favoriteFilterIds.filter((fid) => fid !== id)
        : [...prev.favoriteFilterIds, id];
      const name = getFilterById(id).name;
      return {
        ...prev,
        favoriteFilterIds: nextFavs,
        statusBanner: exists ? `Removed "${name}" from favorite filters` : `Starred filter "${name}"`,
      };
    });
  }, []);

  const handleResetAllSettings = useCallback(() => {
    const defaults = clearCameraPreferences();
    setPreferences(defaults);
    setUiState((prev) => ({
      ...prev,
      aspectRatio: 'RATIO_4_3',
      flashSetting: defaults.defaultFlash,
      shutterTimer: defaults.defaultTimer,
      captureSpeedMode: 'MAX_QUALITY',
      isBurstModeEnabled: false,
      isGridEnabled: defaults.gridStyle !== 'OFF',
      isLevelEnabled: false,
      isFrontMirrorEnabled: defaults.mirrorSelfie,
      isVolumeShutterEnabled: defaults.volumeShutterAction !== 'OFF',
      photographyMode: 'STANDARD',
      activeFilterId: 'original',
      filterIntensity: 85,
      preserveOriginalOnFilteredCapture: false,
      sensorCapabilities: {
        ...prev.sensorCapabilities,
        currentZoomRatio: prev.sensorCapabilities.minZoomRatio,
        currentExposureIndex: 0,
      },
      videoSettings: {
        ...prev.videoSettings,
        quality: defaults.defaultVideoQuality,
        fps: defaults.defaultVideoFps,
        isAudioEnabled: defaults.audioRecordingPref !== 'MUTE',
      },
      statusBanner: 'Camera settings restored to defaults',
    }));
  }, []);

  const handleClearGalleryCache = useCallback(() => {
    capturedMediaRef.current.forEach((m) => {
      void deleteMediaFromDb(m.id);
      if (m.url.startsWith('blob:')) URL.revokeObjectURL(m.url);
    });
    setUiState((prev) => ({
      ...prev,
      capturedMedia: [],
      lastCapturedPhoto: null,
      inspectedPhoto: null,
      isPhotoViewerOpen: false,
      statusBanner: 'Cleared all stored gallery media',
    }));
  }, []);

  const totalMediaBytes = uiState.capturedMedia.reduce((acc, m) => acc + m.sizeBytes, 0);

  const sharedOverlays = (
    <>
      {/* Fullscreen Camera Settings & HUD Customization */}
      {uiState.isSettingsOpen && (
        <CameraSettingsOverlay
          preferences={preferences}
          activeProfile={uiState.activeHardwareProfile}
          storedMediaCount={uiState.capturedMedia.length}
          storedMediaTotalBytes={totalMediaBytes}
          onUpdatePreferences={handleUpdatePreferences}
          onResetAllSettings={handleResetAllSettings}
          onOpenHardwareInspector={() =>
            setUiState((prev) => ({
              ...prev,
              isSettingsOpen: false,
              isHardwareInspectorOpen: true,
              inspectorSelectedCameraId: prev.activeCameraId,
            }))
          }
          onClearGalleryCache={handleClearGalleryCache}
          onClose={() => setUiState((prev) => ({ ...prev, isSettingsOpen: false }))}
        />
      )}

      {/* Fullscreen Non-Destructive Photo Editor */}
      {uiState.isPhotoEditorOpen && uiState.editorTargetPhoto && (
        <PhotoEditorOverlay
          photo={uiState.editorTargetPhoto}
          favoriteFilterIds={uiState.favoriteFilterIds}
          onToggleFavoriteFilter={handleToggleFavoriteFilter}
          onSaveEditedCopy={handleSaveEditedCopy}
          onClose={() =>
            setUiState((prev) => ({
              ...prev,
              isPhotoEditorOpen: false,
              editorTargetPhoto: null,
            }))
          }
        />
      )}

      {/* Fullscreen Non-Destructive Video Filter Studio */}
      {uiState.isVideoEditorOpen && uiState.videoEditorTarget && (
        <VideoEditorOverlay
          video={uiState.videoEditorTarget}
          favoriteFilterIds={uiState.favoriteFilterIds}
          onToggleFavoriteFilter={handleToggleFavoriteFilter}
          onSaveFilteredVideoCopy={handleSaveFilteredVideoCopy}
          onClose={() =>
            setUiState((prev) => ({
              ...prev,
              isVideoEditorOpen: false,
              videoEditorTarget: null,
            }))
          }
        />
      )}

      {/* Fullscreen Photo/Video Viewer Overlay */}
      {uiState.isPhotoViewerOpen &&
        uiState.inspectedPhoto &&
        !uiState.isPhotoEditorOpen &&
        !uiState.isVideoEditorOpen && (
          <PhotoViewerOverlay
            photo={uiState.inspectedPhoto}
            allItems={uiState.capturedMedia}
            onSelectPhoto={(item) =>
              setUiState((prev) => ({ ...prev, inspectedPhoto: item }))
            }
            onEditPhoto={(item) =>
              setUiState((prev) => ({
                ...prev,
                editorTargetPhoto: item,
                isPhotoEditorOpen: true,
              }))
            }
            onEditVideo={(item) =>
              setUiState((prev) => ({
                ...prev,
                videoEditorTarget: item,
                isVideoEditorOpen: true,
              }))
            }
            onToggleFavorite={handleToggleFavorite}
            onDeletePhoto={(id) => handleDeleteMediaIds([id])}
            onSharePhoto={(item) => void handleShareItem(item)}
            onClose={() => setUiState((prev) => ({ ...prev, isPhotoViewerOpen: false }))}
          />
        )}

      {/* Built-in Gallery Overlay */}
      {uiState.isGallerySheetOpen && (
        <GalleryOverlay
          media={uiState.capturedMedia}
          activeTab={galleryTab}
          onChangeTab={setGalleryTab}
          onSelectMedia={(item) =>
            setUiState((prev) => ({
              ...prev,
              inspectedPhoto: item,
              isPhotoViewerOpen: true,
            }))
          }
          onEditPhoto={(item) =>
            setUiState((prev) => ({
              ...prev,
              editorTargetPhoto: item,
              isPhotoEditorOpen: true,
            }))
          }
          onEditVideo={(item) =>
            setUiState((prev) => ({
              ...prev,
              videoEditorTarget: item,
              isVideoEditorOpen: true,
            }))
          }
          onToggleFavorite={handleToggleFavorite}
          onDeleteItems={handleDeleteMediaIds}
          onShareItem={(item) => void handleShareItem(item)}
          onPickMediaFiles={(files) => void handlePickMediaFiles(files)}
          onClose={() => setUiState((prev) => ({ ...prev, isGallerySheetOpen: false }))}
        />
      )}
    </>
  );

  if (uiState.permissionStatus !== 'GRANTED') {
    return (
      <div className="h-full w-full bg-[#090A0D]">
        <PermissionWelcomeScreen
          permissionStatus={uiState.permissionStatus}
          errorMessage={uiState.errorMessage}
          galleryCount={uiState.capturedMedia.length}
          onOpenCameraClick={() => void acquireCameraStream()}
          onUseVirtualSensorClick={handleUseVirtualSensor}
          onOpenGalleryClick={() =>
            setUiState((prev) => ({ ...prev, isGallerySheetOpen: true }))
          }
          onOpenSettingsClick={() =>
            setUiState((prev) => ({ ...prev, isSettingsOpen: true }))
          }
        />
        {sharedOverlays}
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#090A0D]">
      <CameraScreen
        uiState={uiState}
        preferences={preferences}
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
        onSelectFlashDirect={(flash: FlashSetting) =>
          handleUpdatePreferences((prev) => ({ ...prev, defaultFlash: flash }))
        }
        onCycleTimer={() =>
          setUiState((prev) => ({
            ...prev,
            shutterTimer: SHUTTER_TIMER_META[prev.shutterTimer].next,
          }))
        }
        onSelectTimerDirect={(timer: ShutterTimer) =>
          handleUpdatePreferences((prev) => ({ ...prev, defaultTimer: timer }))
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
          setUiState((prev) => {
            const nextOpen = !prev.manualSettings.isProPanelOpen;
            return {
              ...prev,
              isFilterPanelOpen: nextOpen ? false : prev.isFilterPanelOpen,
              isQuickSettingsOpen: nextOpen ? false : prev.isQuickSettingsOpen,
              manualSettings: {
                ...prev.manualSettings,
                isProPanelOpen: nextOpen,
              },
            };
          })
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
        onToggleGrid={() => {
          const nextEnabled = !uiState.isGridEnabled;
          handleUpdatePreferences((prev) => ({
            ...prev,
            gridStyle: nextEnabled
              ? prev.gridStyle === 'OFF'
                ? 'THIRDS'
                : prev.gridStyle
              : 'OFF',
          }));
        }}
        onToggleLevel={() =>
          setUiState((prev) => ({ ...prev, isLevelEnabled: !prev.isLevelEnabled }))
        }
        onToggleFrontMirror={() =>
          handleUpdatePreferences((prev) => ({ ...prev, mirrorSelfie: !prev.mirrorSelfie }))
        }
        onToggleVolumeShutter={() =>
          handleUpdatePreferences((prev) => ({
            ...prev,
            volumeShutterAction: prev.volumeShutterAction === 'OFF' ? 'CAPTURE' : 'OFF',
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
        onToggleVideoAudio={() =>
          setUiState((prev) => ({
            ...prev,
            videoSettings: { ...prev.videoSettings, isAudioEnabled: !prev.videoSettings.isAudioEnabled },
          }))
        }
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
          setUiState((prev) => {
            const nextOpen = !prev.isVideoSettingsOpen;
            return {
              ...prev,
              isFilterPanelOpen: nextOpen ? false : prev.isFilterPanelOpen,
              isQuickSettingsOpen: nextOpen ? false : prev.isQuickSettingsOpen,
              isVideoSettingsOpen: nextOpen,
            };
          })
        }
        onToggleQuickSettings={() =>
          setUiState((prev) => {
            const nextOpen = !prev.isQuickSettingsOpen;
            return {
              ...prev,
              isFilterPanelOpen: nextOpen ? false : prev.isFilterPanelOpen,
              isQuickSettingsOpen: nextOpen,
            };
          })
        }
        onCloseQuickSettings={() =>
          setUiState((prev) => ({ ...prev, isQuickSettingsOpen: false }))
        }
        onOpenSettings={() =>
          setUiState((prev) => ({
            ...prev,
            isQuickSettingsOpen: false,
            isSettingsOpen: true,
          }))
        }
        onUpdatePreferences={handleUpdatePreferences}
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
        onReportError={(msg: string) => setUiState((prev) => ({ ...prev, errorMessage: msg }))}
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
        onSelectFilter={(id: FilterId) =>
          setUiState((prev) => ({
            ...prev,
            activeFilterId: id,
          }))
        }
        onChangeFilterIntensity={(intensity: number) =>
          setUiState((prev) => ({
            ...prev,
            filterIntensity: Math.min(100, Math.max(0, intensity)),
          }))
        }
        onToggleFavoriteFilter={handleToggleFavoriteFilter}
        onResetFilter={() =>
          setUiState((prev) => ({
            ...prev,
            activeFilterId: 'original',
            statusBanner: 'Filter reset to Original',
          }))
        }
        onToggleFilterPanel={() =>
          setUiState((prev) => {
            const nextOpen = !prev.isFilterPanelOpen;
            return {
              ...prev,
              isFilterPanelOpen: nextOpen,
              isVideoSettingsOpen: nextOpen ? false : prev.isVideoSettingsOpen,
              isQuickSettingsOpen: nextOpen ? false : prev.isQuickSettingsOpen,
              manualSettings: {
                ...prev.manualSettings,
                isProPanelOpen: nextOpen ? false : prev.manualSettings.isProPanelOpen,
              },
            };
          })
        }
        onTogglePreserveOriginal={() =>
          setUiState((prev) => ({
            ...prev,
            preserveOriginalOnFilteredCapture: !prev.preserveOriginalOnFilteredCapture,
          }))
        }
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

      {sharedOverlays}
    </div>
  );
}

export default App;
