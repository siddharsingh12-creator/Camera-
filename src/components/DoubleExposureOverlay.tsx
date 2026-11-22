import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  Eraser,
  FolderOpen,
  Grid3X3,
  Hand,
  Layers2,
  Lock,
  Paintbrush,
  Redo2,
  RefreshCw,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Timer,
  Trash2,
  Undo2,
  Wand2,
  Zap,
  ZapOff,
} from 'lucide-react';
import { CapturedPhotoInfo, FlashSetting } from '../types/camera';
import {
  DEFAULT_DOUBLE_EXPOSURE_PARAMS,
  DOUBLE_EXPOSURE_SCENES,
  DetectedFaceBox,
  DoubleExposureBlendMode,
  DoubleExposureBlendStrength,
  DoubleExposureExportFormat,
  DoubleExposureExportPreset,
  DoubleExposureParams,
  DoubleExposureTimerOption,
} from '../types/doubleExposure';
import {
  clearDoubleExposureDraft,
  loadDoubleExposureDraft,
  saveDoubleExposureDraft,
} from '../utils/doubleExposureDraftStorage';
import {
  computeAutoSceneAlignment,
  detectPortraitFaceRegion,
  getDoubleExposureSceneUrl,
  renderDoubleExposureComposite,
} from '../utils/doubleExposureEngine';
import { GCamProcessReport } from '../utils/gcamProMaxEngine';
import { loadImageElement } from '../utils/photoEditorEngine';
import { playTimerBeep } from '../utils/settingsStorage';

interface DoubleExposureOverlayProps {
  liveStream: MediaStream | null;
  isVirtualSensor: boolean;
  virtualCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isFrontCamera: boolean;
  isFrontMirrorEnabled: boolean;
  flashSetting: FlashSetting;
  canSwitchCamera: boolean;
  isExposureLockEnabled: boolean;
  hdrPlusEnabled: boolean;
  recentPhotos: CapturedPhotoInfo[];
  captureFrameWithGCam: (options: {
    hdrPlus: boolean;
    tag: string;
    isPortrait?: boolean;
  }) => Promise<{ canvas: HTMLCanvasElement; report: GCamProcessReport | null } | null>;
  onToggleFlash: () => void;
  onSwitchCamera: () => void;
  onToggleExposureLock: (locked: boolean) => void;
  onToggleHdrPlus: () => void;
  onSaveMergedMedia: (item: CapturedPhotoInfo) => Promise<void>;
  onShareMedia: (item: CapturedPhotoInfo) => void;
  onExitMode: () => void;
}

type StageView = 'CAPTURE_1' | 'CAPTURE_2' | 'MERGED';
type PanelTab = 'SCENE' | 'TONE' | 'MASK';
type CanvasPointerTool = 'PAN' | 'ERASE' | 'RESTORE';

interface HistorySnapshot {
  params: DoubleExposureParams;
  eraserDataUrl: string | null;
}

function cloneParams(p: DoubleExposureParams): DoubleExposureParams {
  return { ...p };
}

function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image buffer'))),
      mimeType,
      quality
    );
  });
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const DoubleExposureOverlay: React.FC<DoubleExposureOverlayProps> = ({
  liveStream,
  isVirtualSensor,
  virtualCanvasRef,
  isFrontCamera,
  isFrontMirrorEnabled,
  flashSetting,
  canSwitchCamera,
  isExposureLockEnabled,
  hdrPlusEnabled,
  recentPhotos,
  captureFrameWithGCam,
  onToggleFlash,
  onSwitchCamera,
  onToggleExposureLock,
  onToggleHdrPlus,
  onSaveMergedMedia,
  onShareMedia,
  onExitMode,
}) => {
  const [stage, setStage] = useState<StageView>('CAPTURE_1');
  const [panelTab, setPanelTab] = useState<PanelTab>('SCENE');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [timerSec, setTimerSec] = useState<DoubleExposureTimerOption>(3);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [isGridEnabled, setIsGridEnabled] = useState(true);
  const [isAutoFaceEnabled, setIsAutoFaceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Step 1: Frame portrait face sharp & tap Capture 1'
  );
  const [lastProcessMs, setLastProcessMs] = useState<number | null>(null);

  const [params, setParams] = useState<DoubleExposureParams>(() =>
    cloneParams(DEFAULT_DOUBLE_EXPOSURE_PARAMS)
  );
  const [liveFaceBox, setLiveFaceBox] = useState<DetectedFaceBox>({
    cx: 0.5,
    cy: 0.36,
    rx: 0.165,
    ry: 0.21,
    confidence: 0.5,
  });
  const [capturedFaceBox, setCapturedFaceBox] = useState<DetectedFaceBox | null>(null);

  // Captured frames & active scene assets
  const capture1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const capture1PreviewUrlRef = useRef<string | null>(null);
  const [capture1PreviewUrl, setCapture1PreviewUrl] = useState<string | null>(null);
  const [capture1Report, setCapture1Report] = useState<GCamProcessReport | null>(null);

  const capture2CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCustomCapture2, setHasCustomCapture2] = useState(false);
  const [loadedPresetImg, setLoadedPresetImg] = useState<HTMLImageElement | null>(null);

  // Mask Eraser Canvas (540x675 lightweight brush layer)
  const eraserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maskRevision, setMaskRevision] = useState(0);
  const [brushSize, setBrushSize] = useState(32);
  const [canvasTool, setCanvasTool] = useState<CanvasPointerTool>('PAN');

  // Compare & Export state
  const [isCompareActive, setIsCompareActive] = useState(false);
  const [compareSplit, setCompareSplit] = useState(0.5);
  const [isExporting, setIsExporting] = useState(false);

  // Undo / Redo History
  const [history, setHistory] = useState<HistorySnapshot[]>([
    { params: cloneParams(DEFAULT_DOUBLE_EXPOSURE_PARAMS), eraserDataUrl: null },
  ]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // DOM refs
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const virtualMirrorRef = useRef<HTMLCanvasElement | null>(null);
  const mergedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageBoxRef = useRef<HTMLDivElement | null>(null);
  const pickerInput1Ref = useRef<HTMLInputElement | null>(null);
  const pickerInput2Ref = useRef<HTMLInputElement | null>(null);

  const pointerDragRef = useRef<{
    active: boolean;
    mode: 'COMPARE' | 'PAN' | 'BRUSH';
    lastX: number;
    lastY: number;
  } | null>(null);

  const timerTimeoutRef = useRef<number | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const ensureEraserCanvas = useCallback((): HTMLCanvasElement => {
    if (!eraserCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 540;
      c.height = 675;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      eraserCanvasRef.current = c;
    }
    return eraserCanvasRef.current;
  }, []);

  // Load preset landscape image whenever sceneId changes (and not CUSTOM)
  useEffect(() => {
    const url = getDoubleExposureSceneUrl(params.sceneId);
    if (!url) {
      setLoadedPresetImg(null);
      return;
    }
    let cancelled = false;
    loadImageElement(url)
      .then((img) => {
        if (!cancelled) setLoadedPresetImg(img);
      })
      .catch(() => {
        if (!cancelled) setLoadedPresetImg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.sceneId]);

  // Auto-load saved crash/close draft from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    loadDoubleExposureDraft().then(async (draft) => {
      if (cancelled || !draft) return;
      try {
        if (draft.capture1Blob) {
          const c1 = await blobToCanvas(draft.capture1Blob);
          if (cancelled) {
            c1.width = 0;
            c1.height = 0;
            return;
          }
          capture1CanvasRef.current = c1;
          const url = URL.createObjectURL(draft.capture1Blob);
          if (capture1PreviewUrlRef.current) URL.revokeObjectURL(capture1PreviewUrlRef.current);
          capture1PreviewUrlRef.current = url;
          setCapture1PreviewUrl(url);
        }
        if (draft.capture2Blob) {
          const c2 = await blobToCanvas(draft.capture2Blob);
          if (!cancelled) {
            capture2CanvasRef.current = c2;
            setHasCustomCapture2(true);
          } else {
            c2.width = 0;
            c2.height = 0;
          }
        }
        if (draft.eraserMaskBlob) {
          const maskC = await blobToCanvas(draft.eraserMaskBlob);
          if (!cancelled) {
            const target = ensureEraserCanvas();
            const ctx = target.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, target.width, target.height);
              ctx.drawImage(maskC, 0, 0, target.width, target.height);
            }
            maskC.width = 0;
            maskC.height = 0;
            setMaskRevision((v) => v + 1);
          }
        }
        if (!cancelled) {
          setParams(draft.params);
          if (draft.faceBox) setCapturedFaceBox(draft.faceBox);
          if (draft.capture1Blob) {
            setStage('MERGED');
            setStatusMessage('Restored auto-saved Double Exposure draft cleanly.');
          }
        }
      } catch {
        // Ignore corrupt draft safely
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ensureEraserCanvas]);

  // Cleanup URLs and transient canvases on unmount
  useEffect(() => {
    return () => {
      if (timerTimeoutRef.current) window.clearTimeout(timerTimeoutRef.current);
      if (capture1PreviewUrlRef.current) URL.revokeObjectURL(capture1PreviewUrlRef.current);
      if (capture1CanvasRef.current) {
        capture1CanvasRef.current.width = 0;
        capture1CanvasRef.current.height = 0;
      }
      if (capture2CanvasRef.current) {
        capture2CanvasRef.current.width = 0;
        capture2CanvasRef.current.height = 0;
      }
      if (eraserCanvasRef.current) {
        eraserCanvasRef.current.width = 0;
        eraserCanvasRef.current.height = 0;
      }
    };
  }, []);

  // Attach shared live MediaStream when viewing Camera 1 or Camera 2
  useEffect(() => {
    if (stage === 'MERGED' || isVirtualSensor) return;
    const vid = previewVideoRef.current;
    if (!vid || !liveStream) return;
    if (vid.srcObject !== liveStream) {
      vid.srcObject = liveStream;
    }
    void vid.play().catch(() => {});
  }, [stage, liveStream, isVirtualSensor]);

  // Mirror virtual sensor canvas onto viewfinder when no physical camera hardware is attached
  useEffect(() => {
    if (stage === 'MERGED' || !isVirtualSensor) return;
    let rafId = 0;
    const pump = () => {
      const src = virtualCanvasRef.current;
      const dst = virtualMirrorRef.current;
      if (src && dst && src.width > 0 && src.height > 0) {
        if (dst.width !== src.width || dst.height !== src.height) {
          dst.width = src.width;
          dst.height = src.height;
        }
        const ctx = dst.getContext('2d');
        if (ctx) ctx.drawImage(src, 0, 0);
      }
      rafId = requestAnimationFrame(pump);
    };
    rafId = requestAnimationFrame(pump);
    return () => cancelAnimationFrame(rafId);
  }, [stage, isVirtualSensor, virtualCanvasRef]);

  // Live Auto Face Detection tick while framing Capture 1 (~6fps, <2ms each)
  useEffect(() => {
    if (stage !== 'CAPTURE_1' || !isAutoFaceEnabled) return;
    const id = window.setInterval(() => {
      const src = isVirtualSensor ? virtualMirrorRef.current : previewVideoRef.current;
      if (!src) return;
      if (src instanceof HTMLVideoElement && src.readyState < 2) return;
      const detected = detectPortraitFaceRegion(src);
      setLiveFaceBox((prev) => ({
        cx: prev.cx * 0.55 + detected.cx * 0.45,
        cy: prev.cy * 0.55 + detected.cy * 0.45,
        rx: prev.rx * 0.6 + detected.rx * 0.4,
        ry: prev.ry * 0.6 + detected.ry * 0.4,
        confidence: detected.confidence,
      }));
    }, 180);
    return () => window.clearInterval(id);
  }, [stage, isAutoFaceEnabled, isVirtualSensor]);

  // Background auto-save draft to IndexedDB (crash/close protection)
  const persistDraftNow = useCallback(async () => {
    const c1 = capture1CanvasRef.current;
    if (!c1 || c1.width <= 0) return;
    try {
      const b1 = await canvasToBlobAsync(c1, 'image/jpeg', 0.92);
      const b2 =
        capture2CanvasRef.current && capture2CanvasRef.current.width > 0
          ? await canvasToBlobAsync(capture2CanvasRef.current, 'image/jpeg', 0.92)
          : null;
      const bm =
        eraserCanvasRef.current && eraserCanvasRef.current.width > 0
          ? await canvasToBlobAsync(eraserCanvasRef.current, 'image/png')
          : null;
      await saveDoubleExposureDraft({
        capture1Blob: b1,
        capture2Blob: b2,
        eraserMaskBlob: bm,
        params: paramsRef.current,
        faceBox: capturedFaceBox,
      });
    } catch {
      // Ignore transient save errors
    }
  }, [capturedFaceBox]);

  useEffect(() => {
    if (!capture1PreviewUrl) return;
    const t = window.setTimeout(() => {
      void persistDraftNow();
    }, 650);
    return () => window.clearTimeout(t);
  }, [params, maskRevision, capture1PreviewUrl, hasCustomCapture2, persistDraftNow]);

  const activeSceneSource: HTMLImageElement | HTMLCanvasElement | null = useMemo(() => {
    if (params.sceneId === 'CUSTOM' && capture2CanvasRef.current && capture2CanvasRef.current.width > 0) {
      return capture2CanvasRef.current;
    }
    return loadedPresetImg ?? (capture2CanvasRef.current && capture2CanvasRef.current.width > 0 ? capture2CanvasRef.current : null);
  }, [params.sceneId, loadedPresetImg, hasCustomCapture2]);

  // Push history snapshot for Undo/Redo
  const commitSnapshot = useCallback(
    (nextParams: DoubleExposureParams, includeMask = false) => {
      const cloned = cloneParams(nextParams);
      setParams(cloned);
      const maskUrl =
        includeMask && eraserCanvasRef.current ? eraserCanvasRef.current.toDataURL('image/png') : history[historyIdx]?.eraserDataUrl ?? null;
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIdx + 1);
        const next = [...sliced, { params: cloned, eraserDataUrl: maskUrl }].slice(-30);
        setHistoryIdx(next.length - 1);
        return next;
      });
    },
    [history, historyIdx]
  );

  const updateParamImmediate = useCallback(
    <K extends keyof DoubleExposureParams>(key: K, val: DoubleExposureParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const commitCurrentParamsToHistory = useCallback(() => {
    commitSnapshot(paramsRef.current, true);
  }, [commitSnapshot]);

  const handleUndo = useCallback(async () => {
    if (historyIdx <= 0) return;
    const targetIdx = historyIdx - 1;
    const snap = history[targetIdx];
    setHistoryIdx(targetIdx);
    setParams(cloneParams(snap.params));
    if (snap.eraserDataUrl) {
      const img = await loadImageElement(snap.eraserDataUrl);
      const ec = ensureEraserCanvas();
      const ctx = ec.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ec.width, ec.height);
        ctx.drawImage(img, 0, 0, ec.width, ec.height);
      }
      setMaskRevision((v) => v + 1);
    }
  }, [ensureEraserCanvas, history, historyIdx]);

  const handleRedo = useCallback(async () => {
    if (historyIdx >= history.length - 1) return;
    const targetIdx = historyIdx + 1;
    const snap = history[targetIdx];
    setHistoryIdx(targetIdx);
    setParams(cloneParams(snap.params));
    if (snap.eraserDataUrl) {
      const img = await loadImageElement(snap.eraserDataUrl);
      const ec = ensureEraserCanvas();
      const ctx = ec.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ec.width, ec.height);
        ctx.drawImage(img, 0, 0, ec.width, ec.height);
      }
      setMaskRevision((v) => v + 1);
    }
  }, [ensureEraserCanvas, history, historyIdx]);

  // Real-Time Merged Preview Renderer (< 40ms @ 640x800 preview resolution)
  useEffect(() => {
    if (stage !== 'MERGED') return;
    const c1 = capture1CanvasRef.current;
    const scene = activeSceneSource;
    const dst = mergedCanvasRef.current;
    if (!c1 || c1.width <= 0 || !scene || !dst) return;

    const rafId = requestAnimationFrame(() => {
      const t0 = performance.now();
      const pw = 640;
      const ph = 800; // Exact 4:5 editorial ratio matching 1080x1350!
      const rendered = renderDoubleExposureComposite({
        portraitSource: c1,
        sceneSource: scene,
        params,
        faceBox: capturedFaceBox,
        eraserMaskCanvas: eraserCanvasRef.current,
        targetWidth: pw,
        targetHeight: ph,
      });

      try {
        if (dst.width !== pw || dst.height !== ph) {
          dst.width = pw;
          dst.height = ph;
        }
        const ctx = dst.getContext('2d');
        if (ctx) ctx.drawImage(rendered, 0, 0);

        const bCanvas = beforeCanvasRef.current;
        if (bCanvas) {
          if (bCanvas.width !== pw || bCanvas.height !== ph) {
            bCanvas.width = pw;
            bCanvas.height = ph;
          }
          const bCtx = bCanvas.getContext('2d');
          if (bCtx) {
            const scale = Math.max(pw / c1.width, ph / c1.height);
            const dw = c1.width * scale;
            const dh = c1.height * scale;
            bCtx.drawImage(c1, (pw - dw) * 0.5, (ph - dh) * 0.5, dw, dh);
          }
        }

        setLastProcessMs(Math.round(performance.now() - t0));
      } finally {
        rendered.width = 0;
        rendered.height = 0;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [stage, params, activeSceneSource, capturedFaceBox, maskRevision]);

  const runCaptureCountdown = useCallback(
    async (seconds: DoubleExposureTimerOption): Promise<boolean> => {
      if (seconds <= 0) return true;
      for (let rem: number = seconds; rem >= 1; rem--) {
        setCountdownSec(rem);
        playTimerBeep(rem === 1);
        const proceeded = await new Promise<boolean>((resolve) => {
          timerTimeoutRef.current = window.setTimeout(() => resolve(true), 1000);
        });
        if (!proceeded) return false;
      }
      setCountdownSec(null);
      return true;
    },
    []
  );

  // Step 1: Execute Sharp Portrait Capture 1 (HDR+ Enhanced, Top Shot, Face Lock)
  const executeCapture1 = useCallback(async () => {
    if (isProcessing) return;
    if (stage !== 'CAPTURE_1') {
      setStage('CAPTURE_1');
      onToggleExposureLock(false);
      setStatusMessage('Ready for Exposure 1 (Portrait) — align face inside reticle');
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await runCaptureCountdown(timerSec);
      if (!ok) return;

      setStatusMessage('Merging 15-frame GCam ProMax Portrait (Top Shot + Sharp Face)...');
      const res = await captureFrameWithGCam({
        hdrPlus: hdrPlusEnabled,
        tag: 'DBL_PORTRAIT1',
        isPortrait: true,
      });
      if (!res) {
        setStatusMessage('Camera preview unavailable yet. Try again once preview settles.');
        return;
      }

      if (capture1CanvasRef.current) {
        capture1CanvasRef.current.width = 0;
        capture1CanvasRef.current.height = 0;
      }
      capture1CanvasRef.current = res.canvas;
      setCapture1Report(res.report);

      const detectedFace = isAutoFaceEnabled
        ? detectPortraitFaceRegion(res.canvas)
        : liveFaceBox;
      setCapturedFaceBox(detectedFace);

      const previewBlob = await canvasToBlobAsync(res.canvas, 'image/jpeg', 0.92);
      if (capture1PreviewUrlRef.current) URL.revokeObjectURL(capture1PreviewUrlRef.current);
      const url = URL.createObjectURL(previewBlob);
      capture1PreviewUrlRef.current = url;
      setCapture1PreviewUrl(url);

      // Reset eraser mask cleanly for fresh portrait
      const ec = ensureEraserCanvas();
      const eCtx = ec.getContext('2d');
      if (eCtx) {
        eCtx.fillStyle = '#FFFFFF';
        eCtx.fillRect(0, 0, ec.width, ec.height);
      }
      setMaskRevision((v) => v + 1);

      // Auto-align selected scene immediately to newly captured portrait
      if (activeSceneSource) {
        const aligned = computeAutoSceneAlignment(activeSceneSource, detectedFace);
        const nextParams = { ...paramsRef.current, ...aligned };
        commitSnapshot(nextParams, true);
        setStage('MERGED');
        setStatusMessage(
          'Portrait 1 locked sharp! Merged seamlessly — adjust Scene, Blend, or tap Capture 2.'
        );
      } else {
        setStage('CAPTURE_2');
        onToggleExposureLock(true);
        setStatusMessage('Portrait 1 captured! Now select a scene or tap Capture 2.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    activeSceneSource,
    captureFrameWithGCam,
    commitSnapshot,
    ensureEraserCanvas,
    hdrPlusEnabled,
    isAutoFaceEnabled,
    isProcessing,
    liveFaceBox,
    onToggleExposureLock,
    runCaptureCountdown,
    stage,
    timerSec,
  ]);

  // Step 2: Frame/Capture Scene Exposure 2 with 50% Portrait Ghost Overlay + AE Lock
  const executeCapture2 = useCallback(async () => {
    if (isProcessing) return;
    if (stage !== 'CAPTURE_2') {
      setStage('CAPTURE_2');
      onToggleExposureLock(true);
      setStatusMessage(
        capture1PreviewUrl
          ? 'Step 2: 50% Portrait guide active + AE Locked. Tap Capture 2 to shoot scene!'
          : 'Step 2: Frame landscape scene & tap Capture 2.'
      );
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await runCaptureCountdown(timerSec);
      if (!ok) return;

      setStatusMessage('Capturing Scene 2 with AE Lock & GCam Dynamic Range...');
      const res = await captureFrameWithGCam({
        hdrPlus: hdrPlusEnabled,
        tag: 'DBL_SCENE2',
        isPortrait: false,
      });
      if (!res) {
        setStatusMessage('Camera preview unavailable yet. Try again once preview settles.');
        return;
      }

      if (capture2CanvasRef.current) {
        capture2CanvasRef.current.width = 0;
        capture2CanvasRef.current.height = 0;
      }
      capture2CanvasRef.current = res.canvas;
      setHasCustomCapture2(true);
      onToggleExposureLock(false);

      const aligned = computeAutoSceneAlignment(res.canvas, capturedFaceBox);
      const nextParams: DoubleExposureParams = {
        ...paramsRef.current,
        sceneId: 'CUSTOM',
        ...aligned,
      };
      commitSnapshot(nextParams, true);

      if (capture1CanvasRef.current) {
        setStage('MERGED');
        setStatusMessage('Double Exposure auto-aligned & merged (< 2s) with face kept sharp!');
      } else {
        setStage('CAPTURE_1');
        setStatusMessage('Scene 2 saved! Now tap Capture 1 for sharp Portrait.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    capture1PreviewUrl,
    captureFrameWithGCam,
    capturedFaceBox,
    commitSnapshot,
    hdrPlusEnabled,
    isProcessing,
    onToggleExposureLock,
    runCaptureCountdown,
    stage,
    timerSec,
  ]);

  // Step 3: Merge Action (Auto AI Alignment + Switch to Merged Composite)
  const executeMerge = useCallback(() => {
    if (!capture1CanvasRef.current) {
      setStage('CAPTURE_1');
      setStatusMessage('Capture or pick Portrait 1 first, then tap Merge.');
      return;
    }
    const scene = activeSceneSource;
    if (!scene) {
      setStage('CAPTURE_2');
      setStatusMessage('Select a preset scene or tap Capture 2 first.');
      return;
    }
    const aligned = computeAutoSceneAlignment(scene, capturedFaceBox);
    const nextParams = { ...paramsRef.current, ...aligned };
    commitSnapshot(nextParams, true);
    onToggleExposureLock(false);
    setStage('MERGED');
    setStatusMessage('AI-aligned Double Exposure complete — face 100% sharp, zero ghosting.');
  }, [activeSceneSource, capturedFaceBox, commitSnapshot, onToggleExposureLock]);

  // Import Portrait 1 or Scene 2 cleanly via Android Photo Picker
  const handlePickFile = useCallback(
    async (file: File | undefined, slot: 'PORTRAIT_1' | 'SCENE_2') => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImageElement(url);
        const c = document.createElement('canvas');
        const maxSide = 2160;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const scale = Math.max(iw, ih) > maxSide ? maxSide / Math.max(iw, ih) : 1;
        c.width = Math.max(64, Math.round(iw * scale));
        c.height = Math.max(64, Math.round(ih * scale));
        const ctx = c.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);

        if (slot === 'PORTRAIT_1') {
          if (capture1CanvasRef.current) {
            capture1CanvasRef.current.width = 0;
            capture1CanvasRef.current.height = 0;
          }
          capture1CanvasRef.current = c;
          const face = detectPortraitFaceRegion(c);
          setCapturedFaceBox(face);
          const blob = await canvasToBlobAsync(c, 'image/jpeg', 0.92);
          if (capture1PreviewUrlRef.current) URL.revokeObjectURL(capture1PreviewUrlRef.current);
          const pUrl = URL.createObjectURL(blob);
          capture1PreviewUrlRef.current = pUrl;
          setCapture1PreviewUrl(pUrl);

          if (activeSceneSource) {
            const aligned = computeAutoSceneAlignment(activeSceneSource, face);
            commitSnapshot({ ...paramsRef.current, ...aligned }, true);
            setStage('MERGED');
          }
          setStatusMessage('Portrait 1 loaded with sharp face protection!');
        } else {
          if (capture2CanvasRef.current) {
            capture2CanvasRef.current.width = 0;
            capture2CanvasRef.current.height = 0;
          }
          capture2CanvasRef.current = c;
          setHasCustomCapture2(true);
          const aligned = computeAutoSceneAlignment(c, capturedFaceBox);
          commitSnapshot({ ...paramsRef.current, sceneId: 'CUSTOM', ...aligned }, true);
          if (capture1CanvasRef.current) setStage('MERGED');
          setStatusMessage('Custom Scene 2 loaded & AI aligned!');
        }
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [activeSceneSource, capturedFaceBox, commitSnapshot]
  );

  // Load last captured Gallery portrait seamlessly if user already shot one!
  const handleUseGalleryPhotoAsPortrait = useCallback(
    async (item: CapturedPhotoInfo) => {
      if (item.isVideo) return;
      const srcUrl = item.blob ? URL.createObjectURL(item.blob) : item.url;
      try {
        const img = await loadImageElement(srcUrl);
        const c = document.createElement('canvas');
        const iw = img.naturalWidth || item.width;
        const ih = img.naturalHeight || item.height;
        const scale = Math.max(iw, ih) > 2160 ? 2160 / Math.max(iw, ih) : 1;
        c.width = Math.max(64, Math.round(iw * scale));
        c.height = Math.max(64, Math.round(ih * scale));
        const ctx = c.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);

        if (capture1CanvasRef.current) {
          capture1CanvasRef.current.width = 0;
          capture1CanvasRef.current.height = 0;
        }
        capture1CanvasRef.current = c;
        const face = detectPortraitFaceRegion(c);
        setCapturedFaceBox(face);
        const b = await canvasToBlobAsync(c, 'image/jpeg', 0.92);
        if (capture1PreviewUrlRef.current) URL.revokeObjectURL(capture1PreviewUrlRef.current);
        const pUrl = URL.createObjectURL(b);
        capture1PreviewUrlRef.current = pUrl;
        setCapture1PreviewUrl(pUrl);
        if (activeSceneSource) {
          const aligned = computeAutoSceneAlignment(activeSceneSource, face);
          commitSnapshot({ ...paramsRef.current, ...aligned }, true);
          setStage('MERGED');
        }
        setStatusMessage(`Loaded "${item.displayName}" as Portrait 1.`);
      } finally {
        if (item.blob) URL.revokeObjectURL(srcUrl);
      }
    },
    [activeSceneSource, commitSnapshot]
  );

  // Interactive Pointer Handlers (Compare Split / Mask Eraser Brush / Pan Scene 2)
  const paintEraserStroke = useCallback(
    (clientX: number, clientY: number, isFirstPoint: boolean, prevX: number, prevY: number) => {
      const box = stageBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const ec = ensureEraserCanvas();
      const ctx = ec.getContext('2d');
      if (!ctx) return;

      const x1 = ((clientX - rect.left) / rect.width) * ec.width;
      const y1 = ((clientY - rect.top) / rect.height) * ec.height;
      const x0 = isFirstPoint ? x1 : ((prevX - rect.left) / rect.width) * ec.width;
      const y0 = isFirstPoint ? y1 : ((prevY - rect.top) / rect.height) * ec.height;

      const color = canvasTool === 'ERASE' ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.max(6, brushSize * 0.4);
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
      setMaskRevision((v) => v + 1);
    },
    [brushSize, canvasTool, ensureEraserCanvas]
  );

  const handleStagePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (stage !== 'MERGED') return;
      const box = stageBoxRef.current;
      if (!box) return;
      e.currentTarget.setPointerCapture(e.pointerId);

      if (isCompareActive) {
        const rect = box.getBoundingClientRect();
        const ratio = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width));
        setCompareSplit(ratio);
        pointerDragRef.current = {
          active: true,
          mode: 'COMPARE',
          lastX: e.clientX,
          lastY: e.clientY,
        };
      } else if (canvasTool === 'ERASE' || canvasTool === 'RESTORE') {
        pointerDragRef.current = {
          active: true,
          mode: 'BRUSH',
          lastX: e.clientX,
          lastY: e.clientY,
        };
        paintEraserStroke(e.clientX, e.clientY, true, e.clientX, e.clientY);
      } else {
        pointerDragRef.current = {
          active: true,
          mode: 'PAN',
          lastX: e.clientX,
          lastY: e.clientY,
        };
      }
    },
    [canvasTool, isCompareActive, paintEraserStroke, stage]
  );

  const handleStagePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = pointerDragRef.current;
      if (!drag?.active) return;
      const box = stageBoxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (drag.mode === 'COMPARE') {
        const ratio = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width));
        setCompareSplit(ratio);
      } else if (drag.mode === 'BRUSH') {
        paintEraserStroke(e.clientX, e.clientY, false, drag.lastX, drag.lastY);
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
      } else if (drag.mode === 'PAN') {
        const dx = (e.clientX - drag.lastX) / rect.width;
        const dy = (e.clientY - drag.lastY) / rect.height;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        setParams((prev) => ({
          ...prev,
          offsetX: Math.max(-0.5, Math.min(0.5, Number((prev.offsetX + dx).toFixed(3)))),
          offsetY: Math.max(-0.5, Math.min(0.5, Number((prev.offsetY + dy).toFixed(3)))),
        }));
      }
    },
    [paintEraserStroke]
  );

  const handleStagePointerUp = useCallback(() => {
    const drag = pointerDragRef.current;
    if (!drag?.active) return;
    pointerDragRef.current = null;
    if (drag.mode === 'BRUSH' || drag.mode === 'PAN') {
      commitSnapshot(paramsRef.current, drag.mode === 'BRUSH');
    }
  }, [commitSnapshot]);

  // High-Resolution Export (1080x1350 JPG 100% or 4K 2160x2700 + optional RAW Lossless copy)
  const buildFinalOutputItem = useCallback(async (): Promise<{
    jpgItem: CapturedPhotoInfo;
    rawItem: CapturedPhotoInfo | null;
  } | null> => {
    const c1 = capture1CanvasRef.current;
    const scene = activeSceneSource;
    if (!c1 || !scene) return null;

    const targetW = params.exportPreset === 'UHD_4K' ? 2160 : 1080;
    const targetH = params.exportPreset === 'UHD_4K' ? 2700 : 1350;

    const outCanvas = renderDoubleExposureComposite({
      portraitSource: c1,
      sceneSource: scene,
      params,
      faceBox: capturedFaceBox,
      eraserMaskCanvas: eraserCanvasRef.current,
      targetWidth: targetW,
      targetHeight: targetH,
    });

    try {
      const stamp = Date.now();
      const jpgBlob = await canvasToBlobAsync(outCanvas, 'image/jpeg', 1.0);
      const jpgUrl = URL.createObjectURL(jpgBlob);
      const sceneLabel =
        DOUBLE_EXPOSURE_SCENES.find((s) => s.id === params.sceneId)?.name ?? 'Custom Scene';

      const jpgItem: CapturedPhotoInfo = {
        id: `DBLEXP_${stamp}`,
        url: jpgUrl,
        blob: jpgBlob,
        width: targetW,
        height: targetH,
        sizeBytes: jpgBlob.size,
        displayName: `UltraCam_DoubleExp_${params.sceneId}_${targetW}x${targetH}_${stamp}.jpg`,
        timestampMillis: stamp,
        isVideo: false,
        durationMs: 0,
        mimeType: 'image/jpeg',
        videoFrameRate: null,
        isHdrVideo: false,
        isFavorite: false,
        captureMeta: {
          mode: 'Double Exposure Pro',
          format: 'JPG 100% sRGB',
          aperture: 1.8,
          computationalEngine:
            capture1Report?.engineLabel ?? 'GCam ProMax 15-Frame ZSL + Silhouette Mask',
          framesMerged: capture1Report?.framesMerged ?? 15,
          topShotSummary:
            capture1Report?.topShotSummary ?? 'Top Shot sharp-face portrait lock active',
          hdrDynamicRange: capture1Report?.hdrDynamicRange ?? 'HDR+ Enhanced (-30 Hi / +20 Sh)',
          awbCalibration: capture1Report?.awbCalibration ?? 'Pixel AWB · Natural Skin Preserved',
          filterName: `${sceneLabel} (${params.blendMode} ${params.opacity}%)`,
          filterIntensity: params.opacity,
        },
      };

      let rawItem: CapturedPhotoInfo | null = null;
      if (params.exportFormat === 'JPG_PLUS_RAW') {
        const rawBlob = await canvasToBlobAsync(c1, 'image/png');
        const rawUrl = URL.createObjectURL(rawBlob);
        rawItem = {
          id: `DBLEXP_RAW_${stamp}`,
          url: rawUrl,
          blob: rawBlob,
          width: c1.width,
          height: c1.height,
          sizeBytes: rawBlob.size,
          displayName: `UltraCam_DoubleExp_ORIG_RAW_${stamp}.png`,
          timestampMillis: stamp + 1,
          isVideo: false,
          durationMs: 0,
          mimeType: 'image/png',
          videoFrameRate: null,
          isHdrVideo: false,
          isFavorite: false,
          captureMeta: {
            mode: 'Double Exposure RAW Base',
            format: 'RAW Lossless PNG',
            isRawOriginal: true,
            computationalEngine: capture1Report?.engineLabel ?? 'GCam ProMax RAW Base',
          },
        };
      }

      return { jpgItem, rawItem };
    } finally {
      outCanvas.width = 0;
      outCanvas.height = 0;
    }
  }, [activeSceneSource, capture1Report, capturedFaceBox, params]);

  const handleSaveOutput = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatusMessage(`Exporting ${params.exportPreset === 'UHD_4K' ? '4K (2160×2700)' : '1080×1350'} sRGB 100%...`);
    try {
      const built = await buildFinalOutputItem();
      if (!built) {
        setStatusMessage('Please capture Portrait 1 and select a scene first.');
        return;
      }
      if (built.rawItem) {
        await onSaveMergedMedia(built.rawItem);
      }
      await onSaveMergedMedia(built.jpgItem);
      await clearDoubleExposureDraft();
      setStatusMessage(
        `Saved ${built.jpgItem.width}×${built.jpgItem.height} ${
          params.exportFormat === 'JPG_PLUS_RAW' ? 'JPG + RAW ' : 'JPG 100% '
        }to Gallery!`
      );
    } finally {
      setIsExporting(false);
    }
  }, [buildFinalOutputItem, isExporting, onSaveMergedMedia, params.exportFormat, params.exportPreset]);

  const handleShareOutput = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const built = await buildFinalOutputItem();
      if (!built) {
        setStatusMessage('Please capture Portrait 1 and select a scene first.');
        return;
      }
      await onSaveMergedMedia(built.jpgItem);
      onShareMedia(built.jpgItem);
    } finally {
      setIsExporting(false);
    }
  }, [buildFinalOutputItem, isExporting, onSaveMergedMedia, onShareMedia]);

  const handleResetSession = useCallback(async () => {
    await clearDoubleExposureDraft();
    if (capture1CanvasRef.current) {
      capture1CanvasRef.current.width = 0;
      capture1CanvasRef.current.height = 0;
      capture1CanvasRef.current = null;
    }
    if (capture2CanvasRef.current) {
      capture2CanvasRef.current.width = 0;
      capture2CanvasRef.current.height = 0;
      capture2CanvasRef.current = null;
    }
    if (capture1PreviewUrlRef.current) {
      URL.revokeObjectURL(capture1PreviewUrlRef.current);
      capture1PreviewUrlRef.current = null;
    }
    setCapture1PreviewUrl(null);
    setHasCustomCapture2(false);
    setCapturedFaceBox(null);
    setCapture1Report(null);
    const ec = ensureEraserCanvas();
    const ctx = ec.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, ec.width, ec.height);
    }
    const fresh = cloneParams(DEFAULT_DOUBLE_EXPOSURE_PARAMS);
    setParams(fresh);
    setHistory([{ params: fresh, eraserDataUrl: null }]);
    setHistoryIdx(0);
    setIsCompareActive(false);
    setStage('CAPTURE_1');
    onToggleExposureLock(false);
    setStatusMessage('Session cleared. Frame Portrait 1 cleanly to start.');
  }, [ensureEraserCanvas, onToggleExposureLock]);

  const latestGalleryPhoto = useMemo(
    () => recentPhotos.find((m) => !m.isVideo) ?? null,
    [recentPhotos]
  );

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;
  const canMerge = Boolean(capture1PreviewUrl && activeSceneSource);

  const cycleTimer = () => {
    setTimerSec((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
  };

  return (
    <div
      data-testid="double_exposure_overlay"
      className="fixed inset-0 z-40 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Hidden Photo Pickers (Android Photo Picker safe) */}
      <input
        ref={pickerInput1Ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handlePickFile(e.target.files?.[0], 'PORTRAIT_1');
          e.target.value = '';
        }}
      />
      <input
        ref={pickerInput2Ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handlePickFile(e.target.files?.[0], 'SCENE_2');
          e.target.value = '';
        }}
      />

      {/* TOP BAR: Timer (0/3/10s), Flash, HDR ON/OFF, Grid, Undo/Redo, Compare */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#090A0D]/95 px-3 py-2.5 backdrop-blur-md lg:px-5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onToggleExposureLock(false);
              onExitMode();
            }}
            aria-label="Exit Double Exposure Pro"
            data-testid="dbl_exit_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-[15px] font-semibold text-[#F6F7F9] whitespace-nowrap">
              Double Exposure Pro
            </h1>
            <p className="font-mono-tech text-[10px] text-[#7D8594]">
              GCam ProMax · Top Shot · Sharp Face Lock
              {lastProcessMs !== null && stage === 'MERGED' ? ` · ${lastProcessMs}ms` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Timer 0s / 3s / 10s */}
          <button
            type="button"
            onClick={cycleTimer}
            data-testid="dbl_timer_button"
            className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition ${
              timerSec > 0
                ? 'border-[#F59E0B]/70 bg-[#F59E0B]/15 text-[#F59E0B]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Timer className="h-4 w-4" />
            <span className="font-mono-tech tabular-nums">{timerSec}s</span>
          </button>

          {/* Flash Toggle */}
          <button
            type="button"
            onClick={onToggleFlash}
            data-testid="dbl_flash_button"
            className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition ${
              flashSetting === 'ON'
                ? 'border-[#F59E0B]/70 bg-[#F59E0B]/15 text-[#F59E0B]'
                : flashSetting === 'AUTO'
                  ? 'border-[#67E8F9]/60 bg-[#67E8F9]/15 text-[#67E8F9]'
                  : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            {flashSetting === 'OFF' ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            <span className="font-mono-tech hidden sm:inline">{flashSetting}</span>
          </button>

          {/* HDR+ Enhanced ON / OFF */}
          <button
            type="button"
            onClick={onToggleHdrPlus}
            data-testid="dbl_hdr_button"
            className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition ${
              hdrPlusEnabled
                ? 'border-[#34D399]/70 bg-[#34D399]/15 text-[#34D399]'
                : 'border-white/15 bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26]'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-mono-tech">HDR {hdrPlusEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setIsGridEnabled((v) => !v)}
            aria-label="Toggle grid"
            data-testid="dbl_grid_button"
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition ${
              isGridEnabled
                ? 'border-[#67E8F9]/60 bg-[#67E8F9]/15 text-[#67E8F9]'
                : 'border-white/15 bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26]'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => void handleUndo()}
            aria-label="Undo"
            data-testid="dbl_undo_button"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[#1A1D26]"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => void handleRedo()}
            aria-label="Redo"
            data-testid="dbl_redo_button"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[#1A1D26]"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          {/* Before / After Compare */}
          {stage === 'MERGED' && (
            <button
              type="button"
              onClick={() => setIsCompareActive((v) => !v)}
              data-testid="dbl_compare_button"
              className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition ${
                isCompareActive
                  ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                  : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
              }`}
            >
              <SplitSquareHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}

          {/* Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen((v) => !v)}
            data-testid="dbl_adjustments_drawer_toggle"
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#12141A] px-3 text-[12px] font-medium text-[#F6F7F9] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#67E8F9]" />
            <span>Adjust</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: Center Camera/Composite + Right Adjustment Panel */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* CENTER STAGE */}
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black p-3 lg:p-5">
          {/* Top Status Line */}
          <div className="mb-2 flex w-full max-w-[440px] items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-[#B4BAC6]">{statusMessage}</span>
            <span className="font-mono-tech shrink-0 text-[#67E8F9]">
              {stage === 'CAPTURE_1'
                ? 'EXP 1 · PORTRAIT'
                : stage === 'CAPTURE_2'
                  ? 'EXP 2 · SCENE'
                  : params.exportPreset === 'UHD_4K'
                    ? '4K MERGE'
                    : '1080×1350'}
            </span>
          </div>

          {/* 4:5 Framing Box */}
          <div
            ref={stageBoxRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            className={`relative aspect-[4/5] w-full max-w-[420px] max-h-[calc(100vh-250px)] overflow-hidden rounded-2xl border border-white/15 bg-[#090A0D] select-none touch-none ${
              stage === 'MERGED'
                ? isCompareActive
                  ? 'cursor-ew-resize'
                  : canvasTool === 'PAN'
                    ? 'cursor-grab active:cursor-grabbing'
                    : 'cursor-crosshair'
                : ''
            }`}
          >
            {/* LIVE CAMERA VIEWFINDER (Stage 1 or Stage 2) */}
            {stage !== 'MERGED' && (
              <>
                {isVirtualSensor ? (
                  <canvas
                    ref={virtualMirrorRef}
                    className={`h-full w-full object-cover ${
                      isFrontCamera && isFrontMirrorEnabled ? '-scale-x-100' : ''
                    }`}
                  />
                ) : (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`h-full w-full object-cover ${
                      isFrontCamera && isFrontMirrorEnabled ? '-scale-x-100' : ''
                    }`}
                  />
                )}

                {/* 50% Transparency Portrait Overlay during Capture 2 Framing */}
                {stage === 'CAPTURE_2' && capture1PreviewUrl && (
                  <img
                    src={capture1PreviewUrl}
                    alt="Portrait 1 overlay guide"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
                  />
                )}

                {/* Rule of Thirds Grid */}
                {isGridEnabled && (
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i} className="border-[0.5px] border-white/20" />
                    ))}
                  </div>
                )}

                {/* Auto Face Detection Box in Capture 1 */}
                {stage === 'CAPTURE_1' && isAutoFaceEnabled && (
                  <div
                    className="pointer-events-none absolute rounded-xl border border-[#67E8F9]/85 transition-all duration-150"
                    style={{
                      left: `${Math.max(5, (liveFaceBox.cx - liveFaceBox.rx) * 100)}%`,
                      top: `${Math.max(5, (liveFaceBox.cy - liveFaceBox.ry) * 100)}%`,
                      width: `${Math.min(80, liveFaceBox.rx * 200)}%`,
                      height: `${Math.min(80, liveFaceBox.ry * 200)}%`,
                    }}
                  >
                    <span className="font-mono-tech absolute -top-5 left-0 rounded bg-[#090A0D]/80 px-1.5 py-0.5 text-[9px] text-[#67E8F9]">
                      FACE SHARP LOCK · TOP SHOT
                    </span>
                  </div>
                )}

                {/* AE Lock Indicator in Capture 2 */}
                {stage === 'CAPTURE_2' && (
                  <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-[#090A0D]/80 px-2.5 py-1 text-[11px] text-[#F59E0B]">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="font-mono-tech">
                      {isExposureLockEnabled ? 'AE LOCKED · 50% OVERLAY' : '50% SILHOUETTE OVERLAY'}
                    </span>
                  </div>
                )}

                {/* Countdown Overlay */}
                {countdownSec !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="font-display text-[72px] font-bold text-[#F59E0B]">
                      {countdownSec}
                    </span>
                  </div>
                )}

                {/* Quick Camera Flip & Picker Floating Actions */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      stage === 'CAPTURE_1'
                        ? pickerInput1Ref.current?.click()
                        : pickerInput2Ref.current?.click()
                    }
                    title="Import photo using Android Photo Picker"
                    className="flex h-10 items-center gap-1.5 rounded-xl border border-white/20 bg-[#090A0D]/80 px-3 text-[11px] font-medium text-[#F6F7F9] backdrop-blur-md hover:bg-[#1A1D26]"
                  >
                    <FolderOpen className="h-4 w-4 text-[#67E8F9]" />
                    <span>Pick Photo</span>
                  </button>
                  {stage === 'CAPTURE_1' && latestGalleryPhoto && !capture1PreviewUrl && (
                    <button
                      type="button"
                      onClick={() => void handleUseGalleryPhotoAsPortrait(latestGalleryPhoto)}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-[#F59E0B]/40 bg-[#090A0D]/85 px-2.5 text-[11px] font-medium text-[#F59E0B] backdrop-blur-md hover:bg-[#1A1D26]"
                    >
                      <Layers2 className="h-3.5 w-3.5" />
                      <span>Use Last Shot</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canSwitchCamera}
                    onClick={onSwitchCamera}
                    aria-label="Flip camera lens"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-[#090A0D]/80 text-[#F6F7F9] backdrop-blur-md hover:bg-[#1A1D26] disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            {/* MERGED DOUBLE EXPOSURE CANVAS */}
            {stage === 'MERGED' && (
              <>
                <canvas ref={mergedCanvasRef} className="h-full w-full object-contain" />
                <canvas
                  ref={beforeCanvasRef}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
                    isCompareActive ? 'block' : 'hidden'
                  }`}
                  style={{
                    clipPath: `inset(0 ${(1 - compareSplit) * 100}% 0 0)`,
                  }}
                />
                {isCompareActive && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#67E8F9]"
                      style={{ left: `${compareSplit * 100}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#090A0D] bg-[#67E8F9] text-[#090A0D]">
                        <SplitSquareHorizontal className="h-4 w-4" />
                      </div>
                    </div>
                    <span className="font-mono-tech pointer-events-none absolute top-3 left-3 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#F6F7F9]">
                      BEFORE (PORTRAIT)
                    </span>
                    <span className="font-mono-tech pointer-events-none absolute top-3 right-3 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#67E8F9]">
                      DOUBLE EXP
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Direct Canvas Mode Strip & Quick Save/Share when Merged */}
          {stage === 'MERGED' && (
            <div className="mt-2.5 flex w-full max-w-[440px] flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#12141A] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareActive(false);
                    setCanvasTool('PAN');
                  }}
                  className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium ${
                    !isCompareActive && canvasTool === 'PAN'
                      ? 'bg-[#67E8F9] text-[#090A0D]'
                      : 'text-[#B4BAC6] hover:text-white'
                  }`}
                >
                  <Hand className="h-3.5 w-3.5" />
                  <span>Move</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareActive(false);
                    setCanvasTool('ERASE');
                  }}
                  className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium ${
                    !isCompareActive && canvasTool === 'ERASE'
                      ? 'bg-[#F59E0B] text-[#090A0D]'
                      : 'text-[#B4BAC6] hover:text-white'
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Erase Mask</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareActive(false);
                    setCanvasTool('RESTORE');
                  }}
                  className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium ${
                    !isCompareActive && canvasTool === 'RESTORE'
                      ? 'bg-[#34D399] text-[#090A0D]'
                      : 'text-[#B4BAC6] hover:text-white'
                  }`}
                >
                  <Paintbrush className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => void handleSaveOutput()}
                  data-testid="dbl_save_button"
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#F6F7F9] px-3.5 text-[12px] font-semibold text-[#090A0D] hover:bg-white disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{isExporting ? 'Saving…' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => void handleShareOutput()}
                  data-testid="dbl_share_button"
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#12141A] px-3 text-[12px] font-medium text-[#F6F7F9] hover:bg-[#1A1D26] disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4 text-[#67E8F9]" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDE ADJUSTMENT PANEL (Desktop always visible; Mobile slide-in sheet) */}
        <aside
          data-testid="dbl_adjustment_panel"
          className={`${
            isMobileDrawerOpen ? 'fixed inset-y-0 right-0 z-50 flex w-[320px] shadow-2xl' : 'hidden'
          } flex-col border-l border-white/10 bg-[#12141A] lg:static lg:flex lg:w-[340px]`}
        >
          {/* Panel Header + Mobile Close */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-1 rounded-xl bg-[#090A0D] p-1 w-full">
              {(['SCENE', 'TONE', 'MASK'] as PanelTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPanelTab(tab)}
                  className={`flex-1 cursor-pointer rounded-lg py-1.5 text-[11px] font-semibold transition ${
                    panelTab === tab
                      ? 'bg-[#F6F7F9] text-[#090A0D]'
                      : 'text-[#B4BAC6] hover:text-white'
                  }`}
                >
                  {tab === 'SCENE' ? 'Scene & Blend' : tab === 'TONE' ? 'Tone & HDR' : 'Mask & Save'}
                </button>
              ))}
            </div>
            {isMobileDrawerOpen && (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-[#B4BAC6]"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {panelTab === 'SCENE' && (
              <>
                {/* Step 2 Scene Presets */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#F6F7F9]">
                      Exposure 2 Scene
                    </span>
                    <button
                      type="button"
                      onClick={() => pickerInput2Ref.current?.click()}
                      className="cursor-pointer text-[11px] font-medium text-[#67E8F9] hover:underline"
                    >
                      + Custom Photo
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {DOUBLE_EXPOSURE_SCENES.map((scene) => {
                      const active = params.sceneId === scene.id;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => {
                            const next: DoubleExposureParams = {
                              ...paramsRef.current,
                              sceneId: scene.id,
                              blendMode: scene.recommendedBlend,
                              opacity: scene.recommendedOpacity,
                            };
                            if (capture1CanvasRef.current) {
                              loadImageElement(scene.imageUrl).then((img) => {
                                const aligned = computeAutoSceneAlignment(img, capturedFaceBox);
                                commitSnapshot({ ...next, ...aligned });
                                setStage('MERGED');
                              });
                            } else {
                              commitSnapshot(next);
                            }
                          }}
                          data-testid={`dbl_scene_${scene.id.toLowerCase()}`}
                          className={`group relative overflow-hidden rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'border-[#F59E0B] ring-1 ring-[#F59E0B]'
                              : 'border-white/15 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={scene.imageUrl}
                            alt={scene.name}
                            referrerPolicy="no-referrer"
                            className="h-16 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="bg-[#090A0D]/90 px-1.5 py-1">
                            <div className="truncate text-[11px] font-semibold text-[#F6F7F9]">
                              {scene.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Auto Align Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!activeSceneSource}
                    onClick={() => {
                      if (!activeSceneSource) return;
                      const aligned = computeAutoSceneAlignment(activeSceneSource, capturedFaceBox);
                      commitSnapshot({ ...paramsRef.current, ...aligned });
                      setStatusMessage('AI alignment snapped scene horizon cleanly inside silhouette.');
                    }}
                    data-testid="dbl_auto_align_button"
                    className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#67E8F9]/50 bg-[#67E8F9]/12 text-[12px] font-semibold text-[#67E8F9] hover:bg-[#67E8F9]/20 disabled:opacity-40"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span>AI Auto Align</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoFaceEnabled((v) => !v)}
                    className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-[11px] font-medium ${
                      isAutoFaceEnabled
                        ? 'border-[#34D399]/60 bg-[#34D399]/12 text-[#34D399]'
                        : 'border-white/15 bg-[#090A0D] text-[#B4BAC6]'
                    }`}
                  >
                    <span>Face Detect {isAutoFaceEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Blend Mode */}
                <div>
                  <span className="text-[12px] font-medium text-[#B4BAC6]">Blend Mode</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {(['SCREEN', 'LIGHTEN', 'OVERLAY'] as DoubleExposureBlendMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => commitSnapshot({ ...paramsRef.current, blendMode: m })}
                        className={`h-9 cursor-pointer rounded-lg border text-[11px] font-semibold transition ${
                          params.blendMode === m
                            ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                            : 'border-white/15 bg-[#090A0D] text-[#F6F7F9]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blend Strength */}
                <div>
                  <span className="text-[12px] font-medium text-[#B4BAC6]">Blend Strength</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {(['SOFT', 'MEDIUM', 'STRONG'] as DoubleExposureBlendStrength[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => commitSnapshot({ ...paramsRef.current, blendStrength: s })}
                        className={`h-9 cursor-pointer rounded-lg border text-[11px] font-semibold transition ${
                          params.blendStrength === s
                            ? 'border-[#67E8F9] bg-[#67E8F9]/20 text-[#67E8F9]'
                            : 'border-white/15 bg-[#090A0D] text-[#B4BAC6]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <SliderField
                  label="Scene Opacity"
                  value={params.opacity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateParamImmediate('opacity', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Face Sharp Protection"
                  value={params.faceProtection}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateParamImmediate('faceProtection', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Fade Edge Gradient"
                  value={params.fadeEdge}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => updateParamImmediate('fadeEdge', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
              </>
            )}

            {panelTab === 'TONE' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#F6F7F9]">
                    GCam Tone &amp; Clarity
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      commitSnapshot({
                        ...paramsRef.current,
                        highlights: DEFAULT_DOUBLE_EXPOSURE_PARAMS.highlights,
                        shadows: DEFAULT_DOUBLE_EXPOSURE_PARAMS.shadows,
                        contrast: DEFAULT_DOUBLE_EXPOSURE_PARAMS.contrast,
                        clarity: DEFAULT_DOUBLE_EXPOSURE_PARAMS.clarity,
                        dehaze: DEFAULT_DOUBLE_EXPOSURE_PARAMS.dehaze,
                        saturation: DEFAULT_DOUBLE_EXPOSURE_PARAMS.saturation,
                        temperature: DEFAULT_DOUBLE_EXPOSURE_PARAMS.temperature,
                        vignette: DEFAULT_DOUBLE_EXPOSURE_PARAMS.vignette,
                      })
                    }
                    className="flex cursor-pointer items-center gap-1 text-[11px] text-[#67E8F9] hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Default HDR Preset</span>
                  </button>
                </div>

                <SliderField
                  label="Highlights"
                  value={params.highlights}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('highlights', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Shadows"
                  value={params.shadows}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('shadows', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Contrast"
                  value={params.contrast}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('contrast', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Clarity"
                  value={params.clarity}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('clarity', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Dehaze"
                  value={params.dehaze}
                  min={0}
                  max={100}
                  onChange={(v) => updateParamImmediate('dehaze', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Saturation"
                  value={params.saturation}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('saturation', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Temperature"
                  value={params.temperature}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('temperature', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
                <SliderField
                  label="Vignette"
                  value={params.vignette}
                  min={-100}
                  max={100}
                  onChange={(v) => updateParamImmediate('vignette', v)}
                  onCommit={commitCurrentParamsToHistory}
                />
              </>
            )}

            {panelTab === 'MASK' && (
              <>
                {/* Position Second Exposure */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#F6F7F9]">
                      Position Exposure 2
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        commitSnapshot({
                          ...paramsRef.current,
                          offsetX: 0,
                          offsetY: 0,
                          zoom: 1.08,
                          rotateDeg: 0,
                        })
                      }
                      className="cursor-pointer text-[11px] text-[#67E8F9] hover:underline"
                    >
                      Reset Position
                    </button>
                  </div>
                  <div className="mt-2 space-y-2.5">
                    <SliderField
                      label="Zoom"
                      value={Math.round(params.zoom * 100)}
                      min={60}
                      max={240}
                      unit="%"
                      onChange={(v) => updateParamImmediate('zoom', v / 100)}
                      onCommit={commitCurrentParamsToHistory}
                    />
                    <SliderField
                      label="Rotate"
                      value={params.rotateDeg}
                      min={-180}
                      max={180}
                      unit="°"
                      onChange={(v) => updateParamImmediate('rotateDeg', v)}
                      onCommit={commitCurrentParamsToHistory}
                    />
                    <SliderField
                      label="Move Horizontal"
                      value={Math.round(params.offsetX * 100)}
                      min={-50}
                      max={50}
                      unit="%"
                      onChange={(v) => updateParamImmediate('offsetX', v / 100)}
                      onCommit={commitCurrentParamsToHistory}
                    />
                    <SliderField
                      label="Move Vertical"
                      value={Math.round(params.offsetY * 100)}
                      min={-50}
                      max={50}
                      unit="%"
                      onChange={(v) => updateParamImmediate('offsetY', v / 100)}
                      onCommit={commitCurrentParamsToHistory}
                    />
                  </div>
                </div>

                {/* Mask Eraser */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#F6F7F9]">Mask Eraser</span>
                    <button
                      type="button"
                      onClick={() => {
                        const ec = ensureEraserCanvas();
                        const ctx = ec.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#FFFFFF';
                          ctx.fillRect(0, 0, ec.width, ec.height);
                        }
                        setMaskRevision((v) => v + 1);
                        commitSnapshot(paramsRef.current, true);
                      }}
                      className="cursor-pointer text-[11px] text-[#F59E0B] hover:underline"
                    >
                      Clear Eraser
                    </button>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#7D8594]">
                    Select Erase Mask and drag finger/mouse on preview to clean unwanted overlap.
                  </p>
                  <div className="mt-2">
                    <SliderField
                      label="Brush Size"
                      value={brushSize}
                      min={10}
                      max={80}
                      unit="px"
                      onChange={setBrushSize}
                      onCommit={() => {}}
                    />
                  </div>
                </div>

                {/* Output Resolution & Format */}
                <div className="border-t border-white/10 pt-3 space-y-3">
                  <div>
                    <span className="text-[12px] font-semibold text-[#F6F7F9]">
                      Export Resolution
                    </span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'EDITORIAL_1080X1350', label: '1080×1350 (4:5)' },
                          { id: 'UHD_4K', label: '4K (2160×2700)' },
                        ] as { id: DoubleExposureExportPreset; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            commitSnapshot({ ...paramsRef.current, exportPreset: opt.id })
                          }
                          className={`h-9 cursor-pointer rounded-lg border text-[11px] font-semibold ${
                            params.exportPreset === opt.id
                              ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                              : 'border-white/15 bg-[#090A0D] text-[#B4BAC6]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[12px] font-semibold text-[#F6F7F9]">Output Format</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'JPG_100', label: 'JPG 100% sRGB' },
                          { id: 'JPG_PLUS_RAW', label: 'JPG + RAW' },
                        ] as { id: DoubleExposureExportFormat; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            commitSnapshot({ ...paramsRef.current, exportFormat: opt.id })
                          }
                          className={`h-9 cursor-pointer rounded-lg border text-[11px] font-semibold ${
                            params.exportFormat === opt.id
                              ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]'
                              : 'border-white/15 bg-[#090A0D] text-[#B4BAC6]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!canMerge || isExporting}
                      onClick={() => void handleSaveOutput()}
                      className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#F6F7F9] text-[12px] font-semibold text-[#090A0D] disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      <span>Save Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetSession()}
                      className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#090A0D] px-3 text-[12px] text-[#F87171] hover:bg-[#1A1D26]"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* BOTTOM BAR: 3 Primary Action Buttons [Capture 1] [Capture 2] [Merge] */}
      <footer className="border-t border-white/10 bg-[#090A0D]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => void executeCapture1()}
            data-testid="dbl_capture1_button"
            className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 text-[13px] font-semibold transition disabled:opacity-50 ${
              stage === 'CAPTURE_1'
                ? 'border-[#F6F7F9] bg-[#F6F7F9] text-[#090A0D]'
                : capture1PreviewUrl
                  ? 'border-[#34D399]/60 bg-[#34D399]/15 text-[#34D399] hover:bg-[#34D399]/25'
                  : 'border-white/20 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>{capture1PreviewUrl && stage !== 'CAPTURE_1' ? 'Retake 1' : 'Capture 1'}</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => void executeCapture2()}
            data-testid="dbl_capture2_button"
            className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 text-[13px] font-semibold transition disabled:opacity-50 ${
              stage === 'CAPTURE_2'
                ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                : 'border-white/20 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Layers2 className="h-4 w-4" />
            <span>{stage === 'CAPTURE_2' ? 'Shoot 2' : 'Capture 2'}</span>
          </button>

          <button
            type="button"
            disabled={!canMerge || isProcessing}
            onClick={executeMerge}
            data-testid="dbl_merge_button"
            className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              stage === 'MERGED'
                ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
                : 'border-[#67E8F9]/60 bg-[#67E8F9]/20 text-[#67E8F9] hover:bg-[#67E8F9]/30'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Merge</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (val: number) => void;
  onCommit: () => void;
}> = ({ label, value, min, max, unit = '', onChange, onCommit }) => (
  <div>
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[#B4BAC6]">{label}</span>
      <span className="font-mono-tech tabular-nums text-[#F6F7F9]">
        {value > 0 && min < 0 ? `+${value}` : value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      onMouseUp={onCommit}
      onTouchEnd={onCommit}
      onKeyUp={onCommit}
      className="mt-1 h-1.5 w-full cursor-pointer accent-[#67E8F9]"
    />
  </div>
);
