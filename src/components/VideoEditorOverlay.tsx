import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  SplitSquareHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CapturedPhotoInfo } from '../types/camera';
import { CAMERA_FILTERS, FilterId, getFilterById } from '../types/filters';
import { formatDurationMs } from '../utils/cameraUtils';
import {
  createFilterSampleSourceCanvas,
  renderFilterThumbnailUrls,
  WebGLFilterRenderer,
} from '../utils/webglFilterPipeline';
import { FilterCarouselBar } from './FilterCarouselBar';

interface VideoEditorOverlayProps {
  video: CapturedPhotoInfo;
  favoriteFilterIds: FilterId[];
  onToggleFavoriteFilter: (id: FilterId) => void;
  onSaveFilteredVideoCopy: (newItem: CapturedPhotoInfo) => void;
  onClose: () => void;
}

export const VideoEditorOverlay: React.FC<VideoEditorOverlayProps> = ({
  video,
  favoriteFilterIds,
  onToggleFavoriteFilter,
  onSaveFilteredVideoCopy,
  onClose,
}) => {
  const [sourceUrl, setSourceUrl] = useState<string>(video.url);
  const [activeFilterId, setActiveFilterId] = useState<FilterId>('original');
  const [filterIntensity, setFilterIntensity] = useState<number>(85);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [isSplitCompare, setIsSplitCompare] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5);

  const [durationSec, setDurationSec] = useState<number>(() =>
    Math.max(0.1, (video.durationMs || 0) / 1000)
  );
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState<number>(() =>
    Math.max(0.1, (video.durationMs || 0) / 1000)
  );
  const [currentSec, setCurrentSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({
    width: video.width || 1280,
    height: video.height || 720,
  });

  const [thumbnails, setThumbnails] = useState<Partial<Record<FilterId, string>>>(() => {
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

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);
  const glRendererRef = useRef<WebGLFilterRenderer | null>(null);
  const isDraggingSplitRef = useRef(false);
  const cancelExportRef = useRef(false);
  const activeFilterRef = useRef(activeFilterId);
  activeFilterRef.current = activeFilterId;
  const intensityRef = useRef(filterIntensity);
  intensityRef.current = filterIntensity;
  const holdingOrigRef = useRef(isHoldingOriginal);
  holdingOrigRef.current = isHoldingOriginal;
  const splitCompareRef = useRef(isSplitCompare);
  splitCompareRef.current = isSplitCompare;
  const trimRef = useRef({ start: trimStartSec, end: trimEndSec });
  trimRef.current = { start: trimStartSec, end: trimEndSec };

  // Create dedicated object URL if blob exists so playback & export stay decoupled
  useEffect(() => {
    if (video.blob) {
      const objUrl = URL.createObjectURL(video.blob);
      setSourceUrl(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    }
    setSourceUrl(video.url);
    return undefined;
  }, [video]);

  const hasTrimChanges =
    trimStartSec > 0.08 || (durationSec > 0.25 && trimEndSec < durationSec - 0.08);
  const hasFilterChanges = activeFilterId !== 'original' && filterIntensity > 0;
  const hasAnyChanges = hasFilterChanges || hasTrimChanges;

  const activeFilterDef = useMemo(() => getFilterById(activeFilterId), [activeFilterId]);

  // Initialize GPU WebGL renderer for real-time video preview and clean up on unmount
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const renderer = new WebGLFilterRenderer(canvas, false);
    glRendererRef.current = renderer;
    return () => {
      renderer.dispose();
      glRendererRef.current = null;
    };
  }, []);

  // Split compare pointer drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingSplitRef.current || !canvasBoxRef.current) return;
      const rect = canvasBoxRef.current.getBoundingClientRect();
      setSplitPos(Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / Math.max(1, rect.width))));
    };
    const onUp = () => {
      isDraggingSplitRef.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Live RAF render loop pushing video frames through WebGL shader
  useEffect(() => {
    let rafId = 0;
    const drawFrame = () => {
      const v = videoElRef.current;
      const renderer = glRendererRef.current;

      if (v && renderer && renderer.isReady() && v.readyState >= 2 && v.videoWidth > 0 && !isExporting) {
        const { start, end } = trimRef.current;
        if (!v.paused && end > start + 0.05 && v.currentTime >= end) {
          v.currentTime = start;
        }
        setCurrentSec(v.currentTime);

        const vw = v.videoWidth;
        const vh = v.videoHeight;
        const maxSide = 1280;
        const scale = Math.max(vw, vh) > maxSide ? maxSide / Math.max(vw, vh) : 1;
        const pw = Math.max(2, Math.round(vw * scale));
        const ph = Math.max(2, Math.round(vh * scale));

        const filterId = holdingOrigRef.current ? 'original' : activeFilterRef.current;
        const def = getFilterById(filterId);
        const effIntensity = filterId === 'original' ? 0 : intensityRef.current;

        renderer.render(v, pw, ph, def.grade, effIntensity);

        if (splitCompareRef.current && origCanvasRef.current) {
          const origC = origCanvasRef.current;
          if (origC.width !== pw || origC.height !== ph) {
            origC.width = pw;
            origC.height = ph;
          }
          const oCtx = origC.getContext('2d');
          if (oCtx) {
            oCtx.drawImage(v, 0, 0, pw, ph);
          }
        }
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isExporting]);

  const togglePlayPause = useCallback(() => {
    const v = videoElRef.current;
    if (!v || isExporting) return;
    if (v.paused) {
      if (v.currentTime < trimStartSec || v.currentTime >= trimEndSec) {
        v.currentTime = trimStartSec;
      }
      void v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, [isExporting, trimStartSec, trimEndSec]);

  const toggleMute = useCallback(() => {
    const v = videoElRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleResetAll = useCallback(() => {
    setActiveFilterId('original');
    setFilterIntensity(85);
    setTrimStartSec(0);
    setTrimEndSec(durationSec);
  }, [durationSec]);

  // Real GPU-processed video export preserving full native source resolution & audio
  const handleExportFilteredVideo = useCallback(async () => {
    if (isExporting || !hasAnyChanges) return;
    if (typeof MediaRecorder === 'undefined') {
      setExportError('MediaRecorder is unavailable in this browser for video export.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    cancelExportRef.current = false;

    const previewVid = videoElRef.current;
    if (previewVid && !previewVid.paused) {
      previewVid.pause();
      setIsPlaying(false);
    }

    const exportVid = document.createElement('video');
    exportVid.src = sourceUrl;
    exportVid.playsInline = true;
    exportVid.crossOrigin = 'anonymous';
    exportVid.muted = isMuted;

    let exportRenderer: WebGLFilterRenderer | null = null;
    let exportTracks: MediaStreamTrack[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        exportVid.onloadeddata = () => resolve();
        exportVid.onerror = () => reject(new Error('Failed to decode source video for export'));
      });

      const fullW = exportVid.videoWidth || videoDims.width || 1280;
      const fullH = exportVid.videoHeight || videoDims.height || 720;
      const effStart = Math.max(0, Math.min(trimStartSec, (exportVid.duration || durationSec) - 0.1));
      const effEnd = Math.max(
        effStart + 0.1,
        Math.min(trimEndSec || exportVid.duration || durationSec, exportVid.duration || durationSec)
      );

      exportVid.currentTime = effStart;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          exportVid.removeEventListener('seeked', onSeeked);
          resolve();
        };
        exportVid.addEventListener('seeked', onSeeked);
      });

      exportRenderer = new WebGLFilterRenderer(undefined, false);
      if (!exportRenderer.isReady()) {
        throw new Error('GPU WebGL context unavailable for filtered video encoding');
      }

      const def = getFilterById(activeFilterId);
      const effIntensity = activeFilterId === 'original' ? 0 : filterIntensity;
      exportRenderer.render(exportVid, fullW, fullH, def.grade, effIntensity);

      if (typeof exportRenderer.canvas.captureStream !== 'function') {
        throw new Error('Canvas captureStream is unsupported in this browser.');
      }

      const fps =
        video.videoFrameRate && video.videoFrameRate >= 24 && video.videoFrameRate <= 60
          ? video.videoFrameRate
          : 30;
      const canvasStream = exportRenderer.canvas.captureStream(fps);

      const vidWithCapture = exportVid as HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };
      let audioTracks: MediaStreamTrack[] = [];
      if (!isMuted) {
        try {
          const cap = vidWithCapture.captureStream?.() ?? vidWithCapture.mozCaptureStream?.();
          if (cap) {
            audioTracks = cap.getAudioTracks();
          }
        } catch {
          // Proceed with video-only export if browser restricts captureStream audio
        }
      }

      const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      exportTracks = combinedStream.getTracks();

      const candidateMimes = [
        'video/mp4;codecs=avc1',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = candidateMimes.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const chunks: Blob[] = [];

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      const stoppedPromise = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };
        recorder.onerror = () => reject(new Error('Filtered video encoding failed'));
        recorder.onstop = () => {
          const finalMime = recorder.mimeType || mimeType || 'video/webm';
          resolve(new Blob(chunks, { type: finalMime }));
        };
      });

      recorder.start(250);
      await exportVid.play();

      await new Promise<void>((resolve) => {
        const pump = () => {
          if (cancelExportRef.current || exportVid.ended || exportVid.currentTime >= effEnd - 0.02) {
            exportVid.pause();
            if (recorder.state !== 'inactive') recorder.stop();
            resolve();
            return;
          }
          exportRenderer?.render(exportVid, fullW, fullH, def.grade, effIntensity);
          const span = Math.max(0.1, effEnd - effStart);
          const pct = Math.min(99, Math.max(0, Math.round(((exportVid.currentTime - effStart) / span) * 100)));
          setExportProgress(pct);
          requestAnimationFrame(pump);
        };
        requestAnimationFrame(pump);
      });

      const exportedBlob = await stoppedPromise;

      if (cancelExportRef.current) {
        return;
      }
      if (exportedBlob.size <= 0) {
        throw new Error('Rendered video copy was empty');
      }

      const ext = exportedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const baseName = video.displayName.replace(/\.[^/.]+$/, '');
      const filterSuffix = activeFilterId !== 'original' ? `_${def.shortLabel.replace(/\s+/g, '')}` : '_TRIM';
      const fileName = `${baseName}${filterSuffix}_${Date.now().toString().slice(-4)}.${ext}`;

      const summaryParts: string[] = [];
      if (hasFilterChanges) summaryParts.push(`${def.name} (${filterIntensity}%)`);
      if (hasTrimChanges) {
        summaryParts.push(
          `Trim ${formatDurationMs(Math.round(effStart * 1000))}–${formatDurationMs(Math.round(effEnd * 1000))}`
        );
      }

      const newItem: CapturedPhotoInfo = {
        id: `VID_EDIT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: URL.createObjectURL(exportedBlob),
        blob: exportedBlob,
        width: fullW,
        height: fullH,
        sizeBytes: exportedBlob.size,
        displayName: fileName,
        timestampMillis: Date.now(),
        isVideo: true,
        durationMs: Math.round((effEnd - effStart) * 1000),
        mimeType: exportedBlob.type || mimeType || 'video/webm',
        videoFrameRate: fps,
        isHdrVideo: video.isHdrVideo,
        isFavorite: video.isFavorite,
        originalId: video.originalId ?? video.id,
        isEditedCopy: true,
        editSummary: summaryParts.join(' · '),
        captureMeta: {
          ...video.captureMeta,
          format: ext.toUpperCase(),
          ...(hasFilterChanges
            ? {
                filterName: def.name,
                filterIntensity,
              }
            : {}),
        },
      };

      setExportProgress(100);
      onSaveFilteredVideoCopy(newItem);
    } catch (err) {
      if (!cancelExportRef.current) {
        setExportError(err instanceof Error ? err.message : 'Unable to export filtered video.');
      }
    } finally {
      exportVid.pause();
      exportVid.src = '';
      exportTracks.forEach((t) => t.stop());
      exportRenderer?.dispose();
      setIsExporting(false);
    }
  }, [
    isExporting,
    hasAnyChanges,
    hasFilterChanges,
    hasTrimChanges,
    sourceUrl,
    isMuted,
    videoDims.width,
    videoDims.height,
    trimStartSec,
    trimEndSec,
    durationSec,
    activeFilterId,
    filterIntensity,
    video,
    onSaveFilteredVideoCopy,
  ]);

  return (
    <div
      data-testid="video_editor_overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Hidden backing video decoder driving GPU WebGL shaders */}
      <video
        ref={videoElRef}
        src={sourceUrl}
        autoPlay
        loop
        playsInline
        muted={isMuted}
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : durationSec;
          setDurationSec(dur);
          setTrimStartSec(0);
          setTrimEndSec(dur);
          if (el.videoWidth > 0 && el.videoHeight > 0) {
            setVideoDims({ width: el.videoWidth, height: el.videoHeight });
          }
        }}
        onLoadedData={(e) => {
          const el = e.currentTarget;
          if (el.videoWidth > 0 && el.videoHeight > 0) {
            const thumbs = renderFilterThumbnailUrls(
              el,
              el.videoWidth,
              el.videoHeight,
              CAMERA_FILTERS.map((f) => f.id)
            );
            setThumbnails(thumbs);
          }
        }}
        className="sr-only"
      />

      {/* Top Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#090A0D] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => (hasAnyChanges ? setShowDiscardConfirm(true) : onClose())}
            aria-label="Close video editor"
            data-testid="close_video_editor_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26] disabled:opacity-40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-[16px] font-semibold text-[#F6F7F9]">Video Filter Studio</h1>
            <div className="font-mono-tech tabular-nums text-[11px] text-[#7D8594]">
              {videoDims.width} × {videoDims.height} px · Original clip preserved
            </div>
          </div>
        </div>

        {/* Center Comparison & Reset Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!hasFilterChanges || isExporting}
            onPointerDown={() => setIsHoldingOriginal(true)}
            onPointerUp={() => setIsHoldingOriginal(false)}
            onPointerLeave={() => setIsHoldingOriginal(false)}
            onPointerCancel={() => setIsHoldingOriginal(false)}
            data-testid="video_editor_hold_original_button"
            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-35 ${
              isHoldingOriginal
                ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">{isHoldingOriginal ? 'Original' : 'Hold Original'}</span>
          </button>

          <button
            type="button"
            disabled={!hasFilterChanges || isExporting}
            onClick={() => setIsSplitCompare((v) => !v)}
            data-testid="video_editor_split_button"
            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-35 ${
              isSplitCompare
                ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Split</span>
          </button>

          {hasAnyChanges && !isExporting && (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex min-h-[44px] cursor-pointer items-center gap-1 rounded-xl border border-white/15 bg-[#12141A] px-3 py-2 text-[12px] font-medium text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Save Filtered Copy CTA */}
        <button
          type="button"
          disabled={!hasAnyChanges || isExporting}
          onClick={() => void handleExportFilteredVideo()}
          data-testid="video_editor_save_copy_button"
          className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F6F7F9] px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-[#090A0D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isExporting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#090A0D] border-t-transparent" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{isExporting ? `Rendering ${exportProgress}%` : 'Save Filtered Copy'}</span>
        </button>
      </header>

      {/* Main Stage + Controls Sidebar */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Video GPU Stage */}
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#050608] p-4 lg:p-6">
          <div
            ref={canvasBoxRef}
            onClick={togglePlayPause}
            className="relative inline-flex max-h-[46vh] max-w-full cursor-pointer items-center justify-center lg:max-h-[72vh]"
          >
            <canvas
              ref={previewCanvasRef}
              className="max-h-[46vh] max-w-full rounded-sm shadow-2xl lg:max-h-[72vh]"
            />

            {isSplitCompare && hasFilterChanges && (
              <>
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${(1 - splitPos) * 100}% 0 0)` }}
                >
                  <canvas
                    ref={origCanvasRef}
                    className="h-full w-full rounded-sm object-contain"
                  />
                </div>
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    isDraggingSplitRef.current = true;
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ left: `${splitPos * 100}%` }}
                  className="absolute top-0 bottom-0 z-20 w-6 -translate-x-1/2 cursor-ew-resize"
                >
                  <div className="mx-auto h-full w-0.5 bg-[#67E8F9] shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                  <div className="font-mono-tech absolute top-3 right-4 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#F6F7F9]">
                    Original
                  </div>
                  <div className="font-mono-tech absolute top-3 left-4 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#67E8F9]">
                    {activeFilterDef.shortLabel}
                  </div>
                </div>
              </>
            )}

            {isHoldingOriginal && (
              <div className="font-mono-tech pointer-events-none absolute top-3 left-3 rounded-lg bg-[#090A0D]/85 px-2.5 py-1 text-[11px] font-semibold text-[#F59E0B]">
                Original
              </div>
            )}

            {!isPlaying && !isExporting && (
              <span className="pointer-events-none absolute flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-[#090A0D]/70 text-[#F6F7F9]">
                <Play className="ml-0.5 h-7 w-7 fill-current" />
              </span>
            )}
          </div>

          {/* Transport Scrubber Bar */}
          <div className="mt-4 flex w-full max-w-2xl items-center gap-3 rounded-xl border border-white/10 bg-[#12141A]/90 px-3 py-2">
            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isExporting}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#1A1D26] text-[#F6F7F9] hover:bg-[#242834]"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <span className="font-mono-tech tabular-nums text-[11px] text-[#F6F7F9]">
              {formatDurationMs(Math.round(currentSec * 1000))}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, durationSec)}
              step={0.05}
              value={Math.min(durationSec, currentSec)}
              disabled={isExporting}
              onChange={(e) => {
                const sec = parseFloat(e.target.value);
                setCurrentSec(sec);
                if (videoElRef.current) videoElRef.current.currentTime = sec;
              }}
              aria-label="Seek video frame"
              className="ultra-slider h-5 flex-1 bg-white/15"
            />
            <span className="font-mono-tech tabular-nums text-[11px] text-[#7D8594]">
              {formatDurationMs(Math.round(durationSec * 1000))}
            </span>
            <button
              type="button"
              onClick={toggleMute}
              disabled={isExporting}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#1A1D26] text-[#F6F7F9] hover:bg-[#242834]"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-[#F87171]" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {exportError && (
            <div className="mt-3 max-w-xl rounded-xl border border-[#F87171]/50 bg-[#12141A] px-4 py-2 text-[12px] text-[#F87171]">
              {exportError}
            </div>
          )}

          {/* Export Rendering Progress Overlay */}
          {isExporting && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#090A0D]/85 p-6 backdrop-blur-md">
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5 text-center">
                <div className="font-display text-[16px] font-semibold text-[#F6F7F9]">
                  Encoding Filtered Video Copy
                </div>
                <p className="mt-1 text-[12px] text-[#B4BAC6]">
                  GPU processing at full native {videoDims.width}×{videoDims.height} resolution…
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#1A1D26]">
                  <div
                    className="h-full bg-[#67E8F9] transition-all duration-150"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="font-mono-tech tabular-nums mt-2 text-[12px] font-semibold text-[#67E8F9]">
                  {exportProgress}%
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelExportRef.current = true;
                  }}
                  className="mt-4 min-h-[40px] cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-[12px] font-medium text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]"
                >
                  Cancel Export
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right / Bottom Filter & Trim Panel */}
        <aside className="flex max-h-[44vh] flex-col gap-4 overflow-y-auto border-t border-white/10 bg-[#12141A] p-4 lg:max-h-none lg:w-[376px] lg:border-t-0 lg:border-l">
          <FilterCarouselBar
            activeFilterId={activeFilterId}
            intensity={filterIntensity}
            favoriteFilterIds={favoriteFilterIds}
            thumbnails={thumbnails}
            isCompareOriginalHeld={isHoldingOriginal}
            onSelectFilter={setActiveFilterId}
            onIntensityChange={setFilterIntensity}
            onToggleFavoriteFilter={onToggleFavoriteFilter}
            onResetFilter={() => setActiveFilterId('original')}
            onCompareHoldChange={setIsHoldingOriginal}
          />

          {/* Non-destructive Trim Range */}
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#F6F7F9]">
                <Scissors className="h-3.5 w-3.5 text-[#67E8F9]" />
                <span>Trim Clip Range</span>
              </span>
              <span className="font-mono-tech tabular-nums text-[11px] text-[#7D8594]">
                {formatDurationMs(Math.round((trimEndSec - trimStartSec) * 1000))}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-[#B4BAC6]">
                <span>Start</span>
                <span className="font-mono-tech tabular-nums text-[#F6F7F9]">
                  {formatDurationMs(Math.round(trimStartSec * 1000))}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, trimEndSec - 0.15)}
                step={0.05}
                value={trimStartSec}
                disabled={isExporting || durationSec <= 0.25}
                onChange={(e) => {
                  const s = parseFloat(e.target.value);
                  setTrimStartSec(s);
                  if (videoElRef.current) videoElRef.current.currentTime = s;
                }}
                className="ultra-slider h-5 w-full bg-[#1A1D26]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-[#B4BAC6]">
                <span>End</span>
                <span className="font-mono-tech tabular-nums text-[#F6F7F9]">
                  {formatDurationMs(Math.round(trimEndSec * 1000))}
                </span>
              </div>
              <input
                type="range"
                min={Math.min(durationSec, trimStartSec + 0.15)}
                max={Math.max(0.2, durationSec)}
                step={0.05}
                value={trimEndSec}
                disabled={isExporting || durationSec <= 0.25}
                onChange={(e) => {
                  const endVal = parseFloat(e.target.value);
                  setTrimEndSec(endVal);
                  if (videoElRef.current) videoElRef.current.currentTime = endVal;
                }}
                className="ultra-slider h-5 w-full bg-[#1A1D26]"
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Discard Unsaved Video Edits Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
              Discard unsaved video edits?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B4BAC6]">
              Your original recorded video remains untouched.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="min-h-[44px] cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-[#F6F7F9] hover:bg-white/5"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="min-h-[44px] cursor-pointer rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
