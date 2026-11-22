import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crop,
  Eye,
  Palette,
  Redo2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Undo2,
} from 'lucide-react';
import {
  CapturedPhotoInfo,
  CropAspectPreset,
  EditorToolCategory,
  PhotoEditParams,
} from '../types/camera';
import { CAMERA_FILTERS, FilterId, getFilterById } from '../types/filters';
import { renderFilterThumbnailUrls } from '../utils/webglFilterPipeline';
import { FilterCarouselBar } from './FilterCarouselBar';
import {
  areEditParamsEqual,
  buildEditSummary,
  cloneEditParams,
  DEFAULT_CROP_RECT,
  DEFAULT_PHOTO_EDIT_PARAMS,
  exportFullResEditedPhoto,
  fitCropRectToAspect,
  getAspectPresetRatio,
  getOrientedDimensions,
  hasAnyEdits,
  loadImageElement,
  renderEditedPhotoToCanvas,
} from '../utils/photoEditorEngine';

interface PhotoEditorOverlayProps {
  photo: CapturedPhotoInfo;
  favoriteFilterIds?: FilterId[];
  onToggleFavoriteFilter?: (id: FilterId) => void;
  onSaveEditedCopy: (newItem: CapturedPhotoInfo) => void;
  onClose: () => void;
}

type AdjustmentKey =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'highlights'
  | 'shadows'
  | 'sharpness'
  | 'temperature'
  | 'tint'
  | 'vignette';

interface AdjustmentSpec {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
}

const ADJUSTMENT_SPECS: AdjustmentSpec[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'vignette', label: 'Vignette', min: -100, max: 100 },
];

const CROP_PRESETS: CropAspectPreset[] = ['ORIGINAL', 'FREE', '1:1', '4:3', '3:2', '16:9', '9:16'];

type CropDragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export const PhotoEditorOverlay: React.FC<PhotoEditorOverlayProps> = ({
  photo,
  favoriteFilterIds = [],
  onToggleFavoriteFilter,
  onSaveEditedCopy,
  onClose,
}) => {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterThumbnails, setFilterThumbnails] = useState<Partial<Record<FilterId, string>>>({});
  const [localFavoriteIds, setLocalFavoriteIds] = useState<FilterId[]>(favoriteFilterIds);

  const [history, setHistory] = useState<PhotoEditParams[]>(() => [
    cloneEditParams(DEFAULT_PHOTO_EDIT_PARAMS),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [draftParams, setDraftParams] = useState<PhotoEditParams>(() =>
    cloneEditParams(DEFAULT_PHOTO_EDIT_PARAMS)
  );

  const [activeTool, setActiveTool] = useState<EditorToolCategory>('ADJUST');
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [isSplitCompare, setIsSplitCompare] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const effectiveFavoriteIds = onToggleFavoriteFilter ? favoriteFilterIds : localFavoriteIds;
  const handleToggleFavFilter = useCallback(
    (id: FilterId) => {
      if (onToggleFavoriteFilter) {
        onToggleFavoriteFilter(id);
      } else {
        setLocalFavoriteIds((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
      }
    },
    [onToggleFavoriteFilter]
  );

  const isRawSource =
    /\.(dng|raw|cr2|nef|arw|rw2|orf|raf)$/i.test(photo.displayName) ||
    photo.mimeType.toLowerCase().includes('dng') ||
    Boolean(photo.captureMeta?.isRawOriginal);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCompareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);

  const cropDragRef = useRef<{
    mode: CropDragMode;
    startX: number;
    startY: number;
    startCrop: PhotoEditParams['crop'];
    boxWidth: number;
    boxHeight: number;
  } | null>(null);
  const isDraggingSplitRef = useRef(false);
  const draftParamsRef = useRef(draftParams);
  draftParamsRef.current = draftParams;

  // Load source image safely from blob or URL without mutating original
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const src = photo.blob ? ((objectUrl = URL.createObjectURL(photo.blob)), objectUrl) : photo.url;

    loadImageElement(src)
      .then((img) => {
        if (!cancelled) {
          setSourceImg(img);
          setLoadError(null);
          const thumbs = renderFilterThumbnailUrls(
            img,
            img.naturalWidth || photo.width,
            img.naturalHeight || photo.height,
            CAMERA_FILTERS.map((f) => f.id)
          );
          setFilterThumbnails(thumbs);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to decode image');
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const modified = hasAnyEdits(draftParams);

  const commitParams = useCallback(
    (next: PhotoEditParams) => {
      const cloned = cloneEditParams(next);
      setDraftParams(cloned);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        if (areEditParamsEqual(sliced[sliced.length - 1], cloned)) return sliced;
        const appended = [...sliced, cloned].slice(-40);
        setHistoryIndex(appended.length - 1);
        return appended;
      });
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const targetIdx = historyIndex - 1;
    setHistoryIndex(targetIdx);
    setDraftParams(cloneEditParams(history[targetIdx]));
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const targetIdx = historyIndex + 1;
    setHistoryIndex(targetIdx);
    setDraftParams(cloneEditParams(history[targetIdx]));
  }, [canRedo, history, historyIndex]);

  const handleResetAll = useCallback(() => {
    commitParams(DEFAULT_PHOTO_EDIT_PARAMS);
  }, [commitParams]);

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) setShowDiscardConfirm(false);
        else if (modified) setShowDiscardConfirm(true);
        else onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, modified, onClose, showDiscardConfirm]);

  // Re-render live preview canvas whenever sourceImg or draftParams or tool mode changes
  useEffect(() => {
    if (!sourceImg || !previewCanvasRef.current) return;

    const applyCrop = activeTool !== 'CROP';
    const rafId = requestAnimationFrame(() => {
      const target = previewCanvasRef.current;
      if (!target) return;

      const rendered = renderEditedPhotoToCanvas(sourceImg, draftParams, {
        maxSide: 1200,
        applyCrop,
        skipAdjustments: isHoldingOriginal,
      });

      target.width = rendered.width;
      target.height = rendered.height;
      const tCtx = target.getContext('2d');
      if (tCtx) {
        tCtx.clearRect(0, 0, target.width, target.height);
        tCtx.drawImage(rendered, 0, 0);
      }
      rendered.width = 0;
      rendered.height = 0;

      if (isSplitCompare && originalCompareCanvasRef.current) {
        const origRendered = renderEditedPhotoToCanvas(sourceImg, draftParams, {
          maxSide: 1200,
          applyCrop,
          skipAdjustments: true,
        });
        const origCanvas = originalCompareCanvasRef.current;
        origCanvas.width = origRendered.width;
        origCanvas.height = origRendered.height;
        const oCtx = origCanvas.getContext('2d');
        if (oCtx) {
          oCtx.clearRect(0, 0, origCanvas.width, origCanvas.height);
          oCtx.drawImage(origRendered, 0, 0);
        }
        origRendered.width = 0;
        origRendered.height = 0;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [sourceImg, draftParams, activeTool, isHoldingOriginal, isSplitCompare]);

  // Compute live output pixel dimensions for readout
  const outputDimensions = useMemo(() => {
    if (!sourceImg) return { width: photo.width, height: photo.height };
    const oriented = getOrientedDimensions(
      sourceImg.naturalWidth || photo.width,
      sourceImg.naturalHeight || photo.height,
      draftParams.rotationQuarterTurns
    );
    return {
      width: Math.max(1, Math.round(oriented.width * draftParams.crop.width)),
      height: Math.max(1, Math.round(oriented.height * draftParams.crop.height)),
    };
  }, [sourceImg, photo.width, photo.height, draftParams.rotationQuarterTurns, draftParams.crop.width, draftParams.crop.height]);

  // Interactive Crop Marquee Drag Handlers
  const startCropDrag = (mode: CropDragMode, e: React.PointerEvent) => {
    e.stopPropagation();
    const box = canvasBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    cropDragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...draftParams.crop },
      boxWidth: Math.max(1, rect.width),
      boxHeight: Math.max(1, rect.height),
    };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingSplitRef.current && canvasBoxRef.current) {
        const rect = canvasBoxRef.current.getBoundingClientRect();
        const nextSplit = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / Math.max(1, rect.width)));
        setSplitPos(nextSplit);
        return;
      }

      const drag = cropDragRef.current;
      if (!drag || !drag.mode) return;

      const dx = (e.clientX - drag.startX) / drag.boxWidth;
      const dy = (e.clientY - drag.startY) / drag.boxHeight;
      const s = drag.startCrop;
      const minSize = 0.12;

      const oriented = sourceImg
        ? getOrientedDimensions(
            sourceImg.naturalWidth || photo.width,
            sourceImg.naturalHeight || photo.height,
            draftParamsRef.current.rotationQuarterTurns
          )
        : { width: photo.width, height: photo.height };

      const targetRatio = getAspectPresetRatio(
        draftParamsRef.current.cropAspect,
        oriented.width,
        oriented.height
      );
      const imgAspect = oriented.width / Math.max(1, oriented.height);

      let next = { ...s };
      if (drag.mode === 'move') {
        next.x = Math.max(0, Math.min(1 - s.width, s.x + dx));
        next.y = Math.max(0, Math.min(1 - s.height, s.y + dy));
      } else {
        let left = s.x;
        let top = s.y;
        let right = s.x + s.width;
        let bottom = s.y + s.height;

        if (drag.mode.includes('w')) left = Math.min(right - minSize, Math.max(0, s.x + dx));
        if (drag.mode.includes('e')) right = Math.max(left + minSize, Math.min(1, s.x + s.width + dx));
        if (drag.mode.includes('n')) top = Math.min(bottom - minSize, Math.max(0, s.y + dy));
        if (drag.mode.includes('s')) bottom = Math.max(top + minSize, Math.min(1, s.y + s.height + dy));

        let w = right - left;
        let h = bottom - top;

        if (targetRatio) {
          // normalized width/height ratio on image: (w * imgW) / (h * imgH) = targetRatio -> w/h = targetRatio / imgAspect
          const normRatio = targetRatio / imgAspect;
          h = w / normRatio;
          if (drag.mode.includes('n')) {
            top = bottom - h;
            if (top < 0) {
              top = 0;
              h = bottom;
              w = h * normRatio;
              if (drag.mode.includes('w')) left = right - w;
            }
          } else {
            if (top + h > 1) {
              h = 1 - top;
              w = h * normRatio;
              if (drag.mode.includes('w')) left = right - w;
            }
          }
          if (left < 0) {
            left = 0;
            w = right;
            h = w / normRatio;
          }
          if (left + w > 1) {
            w = 1 - left;
            h = w / normRatio;
          }
        }

        next = {
          x: Math.max(0, Math.min(1 - minSize, left)),
          y: Math.max(0, Math.min(1 - minSize, top)),
          width: Math.max(minSize, Math.min(1, w)),
          height: Math.max(minSize, Math.min(1, h)),
        };
      }

      setDraftParams((prev) => ({ ...prev, crop: next }));
    };

    const onPointerUp = () => {
      if (isDraggingSplitRef.current) {
        isDraggingSplitRef.current = false;
      }
      if (cropDragRef.current) {
        cropDragRef.current = null;
        commitParams(draftParamsRef.current);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [commitParams, sourceImg, photo.width, photo.height]);

  const handleSaveCopy = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const exported = await exportFullResEditedPhoto(photo, draftParams, exportFormat);
      const url = URL.createObjectURL(exported.blob);
      const activeFilterDef =
        draftParams.filterId !== 'original' && draftParams.filterIntensity > 0
          ? getFilterById(draftParams.filterId)
          : null;
      const newItem: CapturedPhotoInfo = {
        id: `EDIT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url,
        blob: exported.blob,
        width: exported.width,
        height: exported.height,
        sizeBytes: exported.blob.size,
        displayName: exported.fileName,
        timestampMillis: Date.now(),
        isVideo: false,
        durationMs: 0,
        mimeType: exported.mimeType,
        videoFrameRate: null,
        isHdrVideo: false,
        isFavorite: photo.isFavorite,
        originalId: photo.originalId ?? photo.id,
        isEditedCopy: true,
        editSummary: buildEditSummary(draftParams),
        captureMeta: {
          ...photo.captureMeta,
          format: exportFormat.toUpperCase(),
          isRawOriginal: false,
          ...(activeFilterDef
            ? {
                filterName: activeFilterDef.name,
                filterIntensity: draftParams.filterIntensity,
              }
            : {}),
          ...(draftParams.hdrPlusEnabled
            ? {
                computationalEngine: 'GCam Pro Max (HDR+ Enhanced · Sabre)',
                hdrDynamicRange: 'HDR+ Enhanced',
                awbCalibration: 'Pixel AWB',
              }
            : {}),
        },
      };
      onSaveEditedCopy(newItem);
    } finally {
      setIsSaving(false);
    }
  };

  const rotateByQuarter = (delta: number) => {
    const nextTurns = (((draftParams.rotationQuarterTurns + delta) % 4) + 4) % 4;
    const oriented = sourceImg
      ? getOrientedDimensions(sourceImg.naturalWidth, sourceImg.naturalHeight, nextTurns)
      : { width: photo.width, height: photo.height };

    const nextCrop =
      draftParams.cropAspect === 'ORIGINAL'
        ? { ...DEFAULT_CROP_RECT }
        : fitCropRectToAspect(draftParams.cropAspect, oriented.width, oriented.height);

    commitParams({
      ...draftParams,
      rotationQuarterTurns: nextTurns,
      crop: nextCrop,
    });
  };

  const selectCropAspect = (preset: CropAspectPreset) => {
    const oriented = sourceImg
      ? getOrientedDimensions(
          sourceImg.naturalWidth,
          sourceImg.naturalHeight,
          draftParams.rotationQuarterTurns
        )
      : { width: photo.width, height: photo.height };

    const nextCrop =
      preset === 'FREE'
        ? draftParams.crop
        : fitCropRectToAspect(preset, oriented.width, oriented.height);

    commitParams({
      ...draftParams,
      cropAspect: preset,
      crop: nextCrop,
    });
  };

  return (
    <div
      data-testid="photo_editor_overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Top Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#090A0D] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (modified ? setShowDiscardConfirm(true) : onClose())}
            aria-label="Close photo editor"
            data-testid="close_editor_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-[16px] font-semibold text-[#F6F7F9]">Photo Editor</h1>
            <div className="font-mono-tech tabular-nums text-[11px] text-[#7D8594]">
              {outputDimensions.width} × {outputDimensions.height} px ·{' '}
              {isRawSource ? 'RAW original preserved · Exports filtered copy' : 'Original preserved'}
            </div>
          </div>
        </div>

        {/* Center Undo / Redo / Compare Strip */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            aria-label="Undo edit"
            data-testid="editor_undo_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] transition hover:bg-[#1A1D26] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={handleRedo}
            aria-label="Redo edit"
            data-testid="editor_redo_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] transition hover:bg-[#1A1D26] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={!modified}
            onPointerDown={() => setIsHoldingOriginal(true)}
            onPointerUp={() => setIsHoldingOriginal(false)}
            onPointerLeave={() => setIsHoldingOriginal(false)}
            onPointerCancel={() => setIsHoldingOriginal(false)}
            data-testid="editor_hold_original_button"
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
            disabled={!modified}
            onClick={() => setIsSplitCompare((v) => !v)}
            aria-label="Split screen compare"
            data-testid="editor_split_compare_button"
            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-35 ${
              isSplitCompare
                ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            <span className="hidden md:inline">Split</span>
          </button>

          {modified && (
            <button
              type="button"
              onClick={handleResetAll}
              data-testid="editor_reset_all_button"
              className="min-h-[44px] cursor-pointer rounded-xl border border-white/15 bg-[#12141A] px-3 py-2 text-[12px] font-medium text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]"
            >
              Reset
            </button>
          )}
        </div>

        {/* Save Copy Primary CTA */}
        <button
          type="button"
          disabled={isSaving || !sourceImg}
          onClick={() => void handleSaveCopy()}
          data-testid="editor_save_copy_button"
          className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F6F7F9] px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-[#090A0D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#090A0D] border-t-transparent" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{isSaving ? 'Exporting…' : 'Save Copy'}</span>
        </button>
      </header>

      {/* Main Editor Workspace: Center Canvas + Studio Control Sidebar/Deck */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Canvas Stage */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#050608] p-4 lg:p-8">
          {loadError ? (
            <div className="rounded-2xl border border-[#F87171]/40 bg-[#12141A] p-6 text-center">
              <p className="text-[14px] text-[#F87171]">{loadError}</p>
            </div>
          ) : (
            <div ref={canvasBoxRef} className="relative inline-flex max-h-full max-w-full items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                className="max-h-[52vh] max-w-full rounded-sm shadow-2xl lg:max-h-[78vh]"
              />

              {/* Split Before/After Comparison Overlay */}
              {isSplitCompare && modified && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${(1 - splitPos) * 100}% 0 0)` }}
                  >
                    <canvas
                      ref={originalCompareCanvasRef}
                      className="h-full w-full rounded-sm object-contain"
                    />
                  </div>
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      isDraggingSplitRef.current = true;
                    }}
                    style={{ left: `${splitPos * 100}%` }}
                    className="absolute top-0 bottom-0 z-20 w-6 -translate-x-1/2 cursor-ew-resize"
                  >
                    <div className="mx-auto h-full w-0.5 bg-[#67E8F9] shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                    <div className="font-mono-tech absolute top-3 right-4 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#F6F7F9]">
                      Original
                    </div>
                    <div className="font-mono-tech absolute top-3 left-4 rounded bg-[#090A0D]/80 px-2 py-0.5 text-[10px] text-[#67E8F9]">
                      Edited
                    </div>
                  </div>
                </>
              )}

              {/* Interactive Crop Marquee Overlay */}
              {activeTool === 'CROP' && (
                <div className="absolute inset-0">
                  {/* Darkened area outside crop box */}
                  <div
                    className="pointer-events-none absolute bg-black/55"
                    style={{
                      left: 0,
                      right: 0,
                      top: 0,
                      height: `${draftParams.crop.y * 100}%`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute bg-black/55"
                    style={{
                      left: 0,
                      right: 0,
                      bottom: 0,
                      top: `${(draftParams.crop.y + draftParams.crop.height) * 100}%`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute bg-black/55"
                    style={{
                      left: 0,
                      width: `${draftParams.crop.x * 100}%`,
                      top: `${draftParams.crop.y * 100}%`,
                      height: `${draftParams.crop.height * 100}%`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute bg-black/55"
                    style={{
                      right: 0,
                      left: `${(draftParams.crop.x + draftParams.crop.width) * 100}%`,
                      top: `${draftParams.crop.y * 100}%`,
                      height: `${draftParams.crop.height * 100}%`,
                    }}
                  />

                  {/* Active Draggable Crop Box */}
                  <div
                    onPointerDown={(e) => startCropDrag('move', e)}
                    style={{
                      left: `${draftParams.crop.x * 100}%`,
                      top: `${draftParams.crop.y * 100}%`,
                      width: `${draftParams.crop.width * 100}%`,
                      height: `${draftParams.crop.height * 100}%`,
                    }}
                    className="absolute cursor-move border border-[#F6F7F9]"
                  >
                    {/* Rule of thirds alignment lines */}
                    <div className="pointer-events-none absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
                    <div className="pointer-events-none absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
                    <div className="pointer-events-none absolute right-0 left-0 top-1/3 h-px bg-white/30" />
                    <div className="pointer-events-none absolute right-0 left-0 top-2/3 h-px bg-white/30" />

                    {/* 4 Corner Handles */}
                    <button
                      type="button"
                      aria-label="Resize crop top-left"
                      onPointerDown={(e) => startCropDrag('nw', e)}
                      className="absolute -top-2.5 -left-2.5 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-[#090A0D] bg-[#F6F7F9]"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop top-right"
                      onPointerDown={(e) => startCropDrag('ne', e)}
                      className="absolute -top-2.5 -right-2.5 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-[#090A0D] bg-[#F6F7F9]"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop bottom-left"
                      onPointerDown={(e) => startCropDrag('sw', e)}
                      className="absolute -bottom-2.5 -left-2.5 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-[#090A0D] bg-[#F6F7F9]"
                    />
                    <button
                      type="button"
                      aria-label="Resize crop bottom-right"
                      onPointerDown={(e) => startCropDrag('se', e)}
                      className="absolute -right-2.5 -bottom-2.5 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-[#090A0D] bg-[#F6F7F9]"
                    />
                  </div>
                </div>
              )}

              {/* Hold-to-Compare status indicator */}
              {isHoldingOriginal && (
                <div className="font-mono-tech pointer-events-none absolute top-3 left-3 rounded-lg bg-[#090A0D]/85 px-2.5 py-1 text-[11px] font-semibold text-[#F59E0B]">
                  Original
                </div>
              )}
            </div>
          )}
        </div>

        {/* Studio Controls Sidebar / Bottom Panel */}
        <aside className="flex max-h-[44vh] flex-col border-t border-white/10 bg-[#12141A] lg:max-h-none lg:w-[376px] lg:border-t-0 lg:border-l">
          {/* Category Segmented Tabs */}
          <div className="grid grid-cols-3 gap-1 border-b border-white/10 p-2.5">
            <button
              type="button"
              onClick={() => setActiveTool('ADJUST')}
              data-testid="editor_tab_adjust"
              className={`flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-medium transition ${
                activeTool === 'ADJUST'
                  ? 'bg-[#F6F7F9] text-[#090A0D]'
                  : 'text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span>Tone</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('FILTERS')}
              data-testid="editor_tab_filters"
              className={`flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-medium transition ${
                activeTool === 'FILTERS'
                  ? 'bg-[#F6F7F9] text-[#090A0D]'
                  : 'text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]'
              }`}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('CROP')}
              data-testid="editor_tab_crop"
              className={`flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-[12px] font-medium transition ${
                activeTool === 'CROP'
                  ? 'bg-[#F6F7F9] text-[#090A0D]'
                  : 'text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]'
              }`}
            >
              <Crop className="h-3.5 w-3.5 shrink-0" />
              <span>Crop</span>
            </button>
          </div>

          {/* Scrollable Tool Sliders / Controls */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTool === 'FILTERS' ? (
              <div className="flex flex-col gap-4">
                <FilterCarouselBar
                  activeFilterId={draftParams.filterId}
                  intensity={draftParams.filterIntensity}
                  favoriteFilterIds={effectiveFavoriteIds}
                  thumbnails={filterThumbnails}
                  isCompareOriginalHeld={isHoldingOriginal}
                  onSelectFilter={(filterId) =>
                    commitParams({ ...draftParams, filterId })
                  }
                  onIntensityChange={(filterIntensity) =>
                    setDraftParams((prev) => ({ ...prev, filterIntensity }))
                  }
                  onIntensityCommit={() => commitParams(draftParamsRef.current)}
                  onToggleFavoriteFilter={handleToggleFavFilter}
                  onResetFilter={() =>
                    commitParams({ ...draftParams, filterId: 'original' })
                  }
                  onCompareHoldChange={setIsHoldingOriginal}
                />
                {isRawSource && (
                  <div className="rounded-xl border border-[#67E8F9]/30 bg-[#67E8F9]/10 p-3 text-[11px] leading-relaxed text-[#B4BAC6]">
                    Original RAW/DNG image data remains intact. Saving creates a separate full-resolution graded copy.
                  </div>
                )}
              </div>
            ) : activeTool === 'ADJUST' ? (
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() =>
                    commitParams({
                      ...draftParams,
                      hdrPlusEnabled: !draftParams.hdrPlusEnabled,
                    })
                  }
                  data-testid="editor_gcam_hdr_enhance_button"
                  className={`flex min-h-[46px] cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                    draftParams.hdrPlusEnabled
                      ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#F6F7F9]'
                      : 'border-white/15 bg-[#1A1D26] text-[#B4BAC6] hover:bg-[#242834] hover:text-[#F6F7F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles
                      className={`h-4 w-4 shrink-0 ${
                        draftParams.hdrPlusEnabled ? 'text-[#67E8F9]' : 'text-[#7D8594]'
                      }`}
                    />
                    <div>
                      <div className="text-[13px] font-medium text-[#F6F7F9]">
                        GCam HDR+ Enhanced
                      </div>
                      <div className="text-[11px] text-[#7D8594]">
                        Highlight roll-off · Shadow lift · Sabre acutance
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-mono-tech rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      draftParams.hdrPlusEnabled
                        ? 'bg-[#67E8F9] text-[#090A0D]'
                        : 'bg-white/10 text-[#7D8594]'
                    }`}
                  >
                    {draftParams.hdrPlusEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
                {ADJUSTMENT_SPECS.map((spec) => {
                  const val = draftParams[spec.key];
                  const isZero = val === 0;
                  return (
                    <div key={spec.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-[#F6F7F9]">
                          {spec.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono-tech tabular-nums text-[12px] font-medium ${
                              isZero ? 'text-[#7D8594]' : 'text-[#67E8F9]'
                            }`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </span>
                          {!isZero && (
                            <button
                              type="button"
                              onClick={() => commitParams({ ...draftParams, [spec.key]: 0 })}
                              aria-label={`Reset ${spec.label}`}
                              className="cursor-pointer text-[11px] text-[#7D8594] hover:text-[#F6F7F9]"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={1}
                        value={val}
                        data-testid={`editor_slider_${spec.key}`}
                        onChange={(e) => {
                          const nextVal = parseInt(e.target.value, 10);
                          setDraftParams((prev) => ({ ...prev, [spec.key]: nextVal }));
                        }}
                        onPointerUp={() => commitParams(draftParamsRef.current)}
                        onKeyUp={() => commitParams(draftParamsRef.current)}
                        className="ultra-slider h-5 w-full bg-[#1A1D26]"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* 90-degree Rotation Buttons */}
                <div>
                  <div className="mb-2 text-[12px] font-medium text-[#B4BAC6]">Rotate 90°</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => rotateByQuarter(-1)}
                      data-testid="editor_rotate_left"
                      className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#1A1D26] px-3 text-[13px] font-medium text-[#F6F7F9] hover:bg-[#242834]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Rotate Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateByQuarter(1)}
                      data-testid="editor_rotate_right"
                      className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#1A1D26] px-3 text-[13px] font-medium text-[#F6F7F9] hover:bg-[#242834]"
                    >
                      <RotateCw className="h-4 w-4" />
                      <span>Rotate Right</span>
                    </button>
                  </div>
                </div>

                {/* Precision Straighten Angle Dial */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#F6F7F9]">Straighten</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-tech tabular-nums text-[12px] font-medium ${
                          draftParams.straightenDeg === 0 ? 'text-[#7D8594]' : 'text-[#F59E0B]'
                        }`}
                      >
                        {draftParams.straightenDeg > 0 ? `+${draftParams.straightenDeg.toFixed(1)}°` : `${draftParams.straightenDeg.toFixed(1)}°`}
                      </span>
                      {draftParams.straightenDeg !== 0 && (
                        <button
                          type="button"
                          onClick={() => commitParams({ ...draftParams, straightenDeg: 0 })}
                          className="cursor-pointer text-[11px] text-[#7D8594] hover:text-[#F6F7F9]"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={0.5}
                    value={draftParams.straightenDeg}
                    data-testid="editor_slider_straighten"
                    onChange={(e) => {
                      const deg = parseFloat(e.target.value);
                      setDraftParams((prev) => ({ ...prev, straightenDeg: deg }));
                    }}
                    onPointerUp={() => commitParams(draftParamsRef.current)}
                    onKeyUp={() => commitParams(draftParamsRef.current)}
                    className="ultra-slider ultra-slider-amber mt-2 h-5 w-full bg-[#1A1D26]"
                  />
                  <div className="font-mono-tech mt-1 flex justify-between text-[10px] text-[#7D8594]">
                    <span>-45°</span>
                    <span>0°</span>
                    <span>+45°</span>
                  </div>
                </div>

                {/* Aspect Ratio Presets */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#B4BAC6]">Crop Aspect Ratio</span>
                    <button
                      type="button"
                      onClick={() =>
                        commitParams({
                          ...draftParams,
                          cropAspect: 'ORIGINAL',
                          crop: { ...DEFAULT_CROP_RECT },
                        })
                      }
                      className="cursor-pointer text-[11px] text-[#67E8F9] hover:underline"
                    >
                      Reset Crop
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CROP_PRESETS.map((preset) => {
                      const selected = draftParams.cropAspect === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => selectCropAspect(preset)}
                          data-testid={`crop_preset_${preset.toLowerCase()}`}
                          className={`font-mono-tech min-h-[38px] cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                            selected
                              ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                              : 'border-white/15 bg-[#1A1D26] text-[#F6F7F9] hover:bg-[#242834]'
                          }`}
                        >
                          {preset === 'ORIGINAL' ? 'Orig' : preset === 'FREE' ? 'Free' : preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Export Quality Selector */}
                <div className="border-t border-white/10 pt-4">
                  <div className="mb-2 text-[12px] font-medium text-[#B4BAC6]">Export Quality</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat('jpeg')}
                      className={`min-h-[42px] cursor-pointer rounded-xl border px-3 py-2 text-[12px] font-medium transition ${
                        exportFormat === 'jpeg'
                          ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                          : 'border-white/15 bg-[#1A1D26] text-[#B4BAC6]'
                      }`}
                    >
                      JPEG · 98% Max
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('png')}
                      className={`min-h-[42px] cursor-pointer rounded-xl border px-3 py-2 text-[12px] font-medium transition ${
                        exportFormat === 'png'
                          ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                          : 'border-white/15 bg-[#1A1D26] text-[#B4BAC6]'
                      }`}
                    >
                      PNG · Lossless
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Discard Unsaved Edits Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
              Discard unsaved adjustments?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B4BAC6]">
              Your original image remains untouched. Any unapplied adjustments will be lost.
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
