import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Info,
  Pause,
  Play,
  Share2,
  SlidersHorizontal,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CapturedPhotoInfo } from '../types/camera';
import { formatDurationMs, formatFileSize } from '../utils/cameraUtils';

interface PhotoViewerOverlayProps {
  photo: CapturedPhotoInfo;
  allItems: CapturedPhotoInfo[];
  onSelectPhoto: (item: CapturedPhotoInfo) => void;
  onEditPhoto: (item: CapturedPhotoInfo) => void;
  onEditVideo: (item: CapturedPhotoInfo) => void;
  onToggleFavorite: (id: string) => void;
  onDeletePhoto: (id: string) => void;
  onSharePhoto: (item: CapturedPhotoInfo) => void;
  onClose: () => void;
}

export const PhotoViewerOverlay: React.FC<PhotoViewerOverlayProps> = ({
  photo,
  allItems,
  onSelectPhoto,
  onEditPhoto,
  onEditVideo,
  onToggleFavorite,
  onDeletePhoto,
  onSharePhoto,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoPosMs, setVideoPosMs] = useState(0);
  const [videoTotalMs, setVideoTotalMs] = useState(photo.durationMs);

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentIdx = allItems.findIndex((item) => item.id === photo.id);
  const prevItem = currentIdx > 0 ? allItems[currentIdx - 1] : null;
  const nextItem = currentIdx >= 0 && currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null;

  const originalItem = photo.originalId
    ? allItems.find((item) => item.id === photo.originalId) ?? null
    : null;

  // Reset zoom & video timing when navigating between items
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setVideoPosMs(0);
    setVideoTotalMs(photo.durationMs);
    setIsVideoPlaying(true);
  }, [photo.id, photo.durationMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else if (isInfoOpen) setIsInfoOpen(false);
        else onClose();
      } else if (e.key === 'ArrowLeft' && prevItem) {
        onSelectPhoto(prevItem);
      } else if (e.key === 'ArrowRight' && nextItem) {
        onSelectPhoto(nextItem);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onSelectPhoto, prevItem, nextItem, isInfoOpen, showDeleteConfirm]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = photo.displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime >= v.duration && v.duration > 0) v.currentTime = 0;
      void v.play();
      setIsVideoPlaying(true);
    } else {
      v.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const megapixels = ((photo.width * photo.height) / 1_000_000).toFixed(1);
  const aspectLabel = (() => {
    if (photo.width <= 0 || photo.height <= 0) return '—';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(photo.width, photo.height);
    const rw = photo.width / g;
    const rh = photo.height / g;
    return rw <= 24 && rh <= 24 ? `${rw}:${rh}` : `${(photo.width / photo.height).toFixed(2)}:1`;
  })();
  const formattedDate = new Date(photo.timestampMillis).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="photo_viewer_overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Top Scrim & Navigation Header */}
      <header className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#090A0D]/90 px-4 py-3 backdrop-blur-md lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media viewer"
            data-testid="close_photo_viewer_button"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="font-display truncate text-[15px] font-semibold text-[#F6F7F9]">
              {photo.displayName}
            </div>
            <div className="font-mono-tech tabular-nums flex items-center gap-2 text-[11px] text-[#7D8594]">
              <span>{photo.width}×{photo.height} px</span>
              <span aria-hidden="true">·</span>
              <span>{formatFileSize(photo.sizeBytes)}</span>
              {photo.isEditedCopy && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#67E8F9]">Edited Copy</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Viewer Action Buttons */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => (photo.isVideo ? onEditVideo(photo) : onEditPhoto(photo))}
            data-testid="viewer_edit_photo_button"
            className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F6F7F9] px-3.5 py-2 text-[13px] font-semibold text-[#090A0D] transition hover:bg-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{photo.isVideo ? 'Filter' : 'Edit'}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(photo.id)}
            aria-label={photo.isFavorite ? 'Remove favorite' : 'Favorite'}
            data-testid="viewer_favorite_button"
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition ${
              photo.isFavorite
                ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#F59E0B]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Heart className={`h-5 w-5 ${photo.isFavorite ? 'fill-[#F59E0B]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsInfoOpen((v) => !v)}
            aria-label="Media information"
            data-testid="viewer_info_button"
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition ${
              isInfoOpen
                ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
            }`}
          >
            <Info className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onSharePhoto(photo)}
            aria-label="Share"
            data-testid="share_photo_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download"
            data-testid="open_in_gallery_button"
            className="hidden h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26] sm:flex"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete"
            data-testid="viewer_delete_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:border-[#F87171]/60 hover:text-[#F87171]"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Viewer + Optional Right Information Panel */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Media Viewport */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-4">
          {photo.isVideo ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <video
                ref={videoRef}
                src={photo.url}
                autoPlay
                playsInline
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (Number.isFinite(dur) && dur > 0) setVideoTotalMs(Math.round(dur * 1000));
                }}
                onTimeUpdate={(e) => {
                  setVideoPosMs(Math.round(e.currentTarget.currentTime * 1000));
                }}
                onEnded={() => setIsVideoPlaying(false)}
                onClick={togglePlayPause}
                className="max-h-full max-w-full cursor-pointer object-contain"
              />
              {!isVideoPlaying && (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label="Play video"
                  data-testid="video_player_play_pause"
                  className="absolute flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/60 bg-[#090A0D]/75 text-[#F6F7F9] backdrop-blur-sm transition hover:bg-[#090A0D]"
                >
                  <Play className="ml-0.5 h-8 w-8 fill-current" />
                </button>
              )}
            </div>
          ) : (
            <img
              src={photo.url}
              alt={photo.displayName}
              draggable={false}
              referrerPolicy="no-referrer"
              onDoubleClick={() => {
                if (scale > 1.2) {
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                } else {
                  setScale(2.5);
                }
              }}
              onWheel={(e) => {
                const next = Math.min(5, Math.max(1, scale - e.deltaY * 0.002));
                setScale(next);
                if (next <= 1) setOffset({ x: 0, y: 0 });
              }}
              onMouseDown={(e) => {
                if (scale > 1) {
                  dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                }
              }}
              onMouseMove={(e) => {
                if (dragStartRef.current && scale > 1) {
                  setOffset({
                    x: e.clientX - dragStartRef.current.x,
                    y: e.clientY - dragStartRef.current.y,
                  });
                }
              }}
              onMouseUp={() => {
                dragStartRef.current = null;
              }}
              onMouseLeave={() => {
                dragStartRef.current = null;
              }}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
              className={`max-h-full max-w-full object-contain transition-transform duration-75 ${
                scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
              }`}
            />
          )}

          {/* Previous / Next Navigation Arrows */}
          {prevItem && (
            <button
              type="button"
              onClick={() => onSelectPhoto(prevItem)}
              aria-label="Previous media"
              className="absolute left-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#090A0D]/75 text-[#F6F7F9] backdrop-blur-md transition hover:bg-[#1A1D26]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {nextItem && (
            <button
              type="button"
              onClick={() => onSelectPhoto(nextItem)}
              aria-label="Next media"
              className="absolute right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#090A0D]/75 text-[#F6F7F9] backdrop-blur-md transition hover:bg-[#1A1D26]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Slide-Over Photo / Video Information Inspector */}
        {isInfoOpen && (
          <aside
            data-testid="photo_info_panel"
            className="absolute inset-x-0 bottom-0 z-30 max-h-[68vh] overflow-y-auto rounded-t-2xl border-t border-white/15 bg-[#12141A]/98 p-5 backdrop-blur-md lg:static lg:max-h-none lg:w-[340px] lg:rounded-none lg:border-t-0 lg:border-l"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-display text-[16px] font-semibold text-[#F6F7F9]">
                {photo.isVideo ? 'Video Information' : 'Photo Information'}
              </h2>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                aria-label="Close info panel"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="text-[11px] font-medium text-[#7D8594]">File &amp; Format</div>
                <dl className="mt-2 flex flex-col gap-2 text-[13px]">
                  <InfoRow label="File Name" value={photo.displayName} />
                  <InfoRow label="Captured" value={formattedDate} />
                  <InfoRow label="Format" value={photo.mimeType.toUpperCase()} />
                  <InfoRow label="File Size" value={`${formatFileSize(photo.sizeBytes)} (${photo.sizeBytes.toLocaleString()} B)`} />
                </dl>
              </div>

              <div className="border-t border-white/8 pt-3">
                <div className="text-[11px] font-medium text-[#7D8594]">Dimensions &amp; Stream</div>
                <dl className="mt-2 flex flex-col gap-2 text-[13px]">
                  <InfoRow label="Resolution" value={`${photo.width} × ${photo.height} px`} />
                  {!photo.isVideo && <InfoRow label="Megapixels" value={`${megapixels} MP`} />}
                  <InfoRow label="Aspect Ratio" value={aspectLabel} />
                  {photo.isVideo && (
                    <>
                      <InfoRow label="Duration" value={formatDurationMs(videoTotalMs || photo.durationMs)} />
                      {photo.videoFrameRate && (
                        <InfoRow label="Frame Rate" value={`${photo.videoFrameRate} fps`} />
                      )}
                      <InfoRow label="Dynamic Range" value={photo.isHdrVideo ? '10-bit HDR' : 'Standard (SDR)'} />
                    </>
                  )}
                </dl>
              </div>

              {photo.captureMeta && (
                <div className="border-t border-white/8 pt-3">
                  <div className="text-[11px] font-medium text-[#7D8594]">Capture Telemetry</div>
                  <dl className="mt-2 flex flex-col gap-2 text-[13px]">
                    {photo.captureMeta.cameraLabel && (
                      <InfoRow label="Camera" value={photo.captureMeta.cameraLabel} />
                    )}
                    {photo.captureMeta.lensLabel && (
                      <InfoRow label="Lens" value={photo.captureMeta.lensLabel} />
                    )}
                    {photo.captureMeta.mode && (
                      <InfoRow label="Mode" value={photo.captureMeta.mode} />
                    )}
                    {photo.captureMeta.iso && (
                      <InfoRow label="ISO" value={`ISO ${photo.captureMeta.iso}`} />
                    )}
                    {photo.captureMeta.shutterSpeed && (
                      <InfoRow label="Shutter" value={photo.captureMeta.shutterSpeed} />
                    )}
                    {photo.captureMeta.aperture && (
                      <InfoRow label="Aperture" value={`f/${photo.captureMeta.aperture.toFixed(1)}`} />
                    )}
                    {photo.captureMeta.whiteBalance && (
                      <InfoRow label="White Balance" value={photo.captureMeta.whiteBalance} />
                    )}
                    {photo.captureMeta.computationalEngine && (
                      <InfoRow label="Engine" value={photo.captureMeta.computationalEngine} />
                    )}
                    {typeof photo.captureMeta.framesMerged === 'number' && (
                      <InfoRow label="Frames Merged" value={`${photo.captureMeta.framesMerged} frames`} />
                    )}
                    {photo.captureMeta.topShotSummary && (
                      <InfoRow label="Top Shot" value={photo.captureMeta.topShotSummary} />
                    )}
                    {photo.captureMeta.hdrDynamicRange && (
                      <InfoRow label="Dynamic Range" value={photo.captureMeta.hdrDynamicRange} />
                    )}
                    {photo.captureMeta.awbCalibration && (
                      <InfoRow label="AWB Science" value={photo.captureMeta.awbCalibration} />
                    )}
                    {photo.captureMeta.filterName && (
                      <InfoRow
                        label="Filter"
                        value={
                          typeof photo.captureMeta.filterIntensity === 'number'
                            ? `${photo.captureMeta.filterName} (${photo.captureMeta.filterIntensity}%)`
                            : photo.captureMeta.filterName
                        }
                      />
                    )}
                  </dl>
                </div>
              )}

              {photo.isEditedCopy && (
                <div className="border-t border-white/8 pt-3">
                  <div className="text-[11px] font-medium text-[#67E8F9]">Non-Destructive Edit Copy</div>
                  {photo.editSummary && (
                    <p className="font-mono-tech mt-1.5 text-[11px] leading-relaxed text-[#B4BAC6]">
                      {photo.editSummary}
                    </p>
                  )}
                  {originalItem && (
                    <button
                      type="button"
                      onClick={() => onSelectPhoto(originalItem)}
                      className="mt-2.5 flex min-h-[40px] w-full cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#1A1D26] px-3 text-[12px] font-medium text-[#F6F7F9] hover:bg-[#242834]"
                    >
                      View Preserved Original
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Video Transport Bar or Image Zoom Hint Bar */}
      <footer className="border-t border-white/10 bg-[#090A0D]/95 px-4 py-3 backdrop-blur-md lg:px-6">
        {photo.isVideo ? (
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isVideoPlaying ? 'Pause' : 'Play'}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
            >
              {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <span className="font-mono-tech tabular-nums text-[12px] text-[#F6F7F9]">
              {formatDurationMs(videoPosMs)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(100, videoTotalMs)}
              value={Math.min(Math.max(100, videoTotalMs), videoPosMs)}
              onChange={(e) => {
                const ms = parseInt(e.target.value, 10);
                setVideoPosMs(ms);
                if (videoRef.current) videoRef.current.currentTime = ms / 1000;
              }}
              aria-label="Seek video position"
              className="ultra-slider h-5 flex-1 bg-white/15"
            />
            <span className="font-mono-tech tabular-nums text-[12px] text-[#7D8594]">
              {formatDurationMs(videoTotalMs)}
            </span>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-[#F87171]" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl items-center justify-between text-[12px] text-[#7D8594]">
            <span className="font-mono-tech tabular-nums">
              {currentIdx >= 0 ? `${currentIdx + 1} / ${allItems.length}` : '1 / 1'}
              {scale > 1.01 ? ` · Zoom ${scale.toFixed(1)}×` : ' · Double-click or scroll to zoom'}
            </span>
            <div className="flex items-center gap-4">
              {scale > 1.01 && (
                <button
                  type="button"
                  onClick={() => {
                    setScale(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="cursor-pointer font-medium text-[#67E8F9] hover:underline"
                >
                  Reset Zoom
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="flex cursor-pointer items-center gap-1.5 font-medium text-[#F6F7F9] hover:text-[#67E8F9] sm:hidden"
              >
                <Download className="h-4 w-4" />
                <span>Save File</span>
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
              Delete {photo.isVideo ? 'video' : 'photo'}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B4BAC6]">
              Remove <span className="text-[#F6F7F9]">{photo.displayName}</span> from your Ultra Cam
              Pro gallery?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[44px] cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-[#F6F7F9] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeletePhoto(photo.id);
                }}
                className="min-h-[44px] cursor-pointer rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="shrink-0 text-[#7D8594]">{label}</dt>
    <dd className="font-mono-tech tabular-nums min-w-0 break-all text-right text-[#F6F7F9]">
      {value}
    </dd>
  </div>
);
