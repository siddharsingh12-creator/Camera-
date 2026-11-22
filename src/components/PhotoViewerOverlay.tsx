import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Pause, Play, Share2, X, Image as ImageIcon } from 'lucide-react';
import { CapturedPhotoInfo } from '../types/camera';
import { formatDurationMs, formatFileSize } from '../utils/cameraUtils';

export const PhotoViewerOverlay: React.FC<{
  photo: CapturedPhotoInfo;
  onClose: () => void;
}> = ({ photo, onClose }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoPosMs, setVideoPosMs] = useState(0);
  const [videoTotalMs, setVideoTotalMs] = useState(photo.durationMs);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = photo.url;
    a.download = photo.displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share && photo.blob) {
      try {
        const file = new File([photo.blob], photo.displayName, { type: photo.mimeType });
        await navigator.share({
          title: photo.displayName,
          files: [file],
        });
        return;
      } catch {
        // Fallback to download
      }
    }
    handleDownload();
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

  const megapixels = ((photo.width * photo.height) / 1_000_000).toFixed(1);

  return (
    <div
      data-testid="photo_viewer_overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Media Canvas */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden pb-36">
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
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={togglePlayPause}
              data-testid="video_player_play_pause"
              className="absolute flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-[#090A0D]/60 text-[#F6F7F9] backdrop-blur-sm transition hover:bg-[#090A0D]/80"
            >
              {isVideoPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
            </button>
          </div>
        ) : (
          <img
            src={photo.url}
            alt={photo.displayName}
            draggable={false}
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
              if (scale > 1) dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
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
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
            className="max-h-full max-w-full cursor-grab object-contain transition-transform duration-75"
          />
        )}
      </div>

      {/* Top gradient bar */}
      <div
        className="pointer-events-none absolute top-0 right-0 left-0 px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(9,10,13,0.85), transparent)' }}
      >
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo preview"
            data-testid="close_photo_viewer_button"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/75 text-[#F6F7F9] hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[16px] font-semibold text-[#F6F7F9]">
              {photo.isVideo ? 'Recorded Video' : 'Captured Photo'}
            </div>
            <div className="font-mono-tech truncate text-[12px] text-[#7D8594]">
              {photo.displayName}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Inspector & Actions Sheet */}
      <div className="absolute right-0 bottom-0 left-0 rounded-t-[24px] border-t border-white/15 bg-[#12141A]/95 px-5 py-4 backdrop-blur-md">
        {photo.isVideo && videoTotalMs > 0 && (
          <div className="mb-3 flex items-center gap-2.5">
            <span className="font-mono-tech text-[10px] text-[#F6F7F9]">
              {formatDurationMs(videoPosMs)}
            </span>
            <input
              type="range"
              min={0}
              max={videoTotalMs}
              value={Math.min(videoTotalMs, videoPosMs)}
              onChange={(e) => {
                const ms = parseInt(e.target.value, 10);
                setVideoPosMs(ms);
                if (videoRef.current) videoRef.current.currentTime = ms / 1000;
              }}
              className="ultra-slider h-5 flex-1 bg-white/15"
            />
            <span className="font-mono-tech text-[10px] text-[#7D8594]">
              {formatDurationMs(videoTotalMs)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono-tech text-[10px] text-[#7D8594]">Native Resolution</div>
            <div className="font-display mt-0.5 text-[16px] font-semibold text-[#F6F7F9]">
              {photo.width > 0 && photo.height > 0
                ? `${photo.width} × ${photo.height} px`
                : photo.isVideo
                  ? 'Native Video'
                  : 'Native JPEG'}
            </div>
            <div className="font-mono-tech mt-0.5 text-[10px] text-[#67E8F9]">
              {photo.isVideo ? 'Saved in Session Movies' : 'Saved in Session Gallery'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {photo.isVideo ? (
              <span className="font-mono-tech rounded-full border border-[#34D399]/35 bg-[#34D399]/14 px-3 py-1 text-[12px] font-medium text-[#34D399]">
                {photo.videoFrameRate ? `${photo.videoFrameRate}fps` : 'WEBM/MP4'}
                {photo.isHdrVideo ? ' · HDR' : ''}
              </span>
            ) : (
              photo.width > 0 && (
                <span className="font-mono-tech rounded-full border border-[#67E8F9]/35 bg-[#67E8F9]/14 px-3 py-1 text-[12px] font-medium text-[#67E8F9]">
                  {megapixels} MP
                </span>
              )
            )}
            {photo.sizeBytes > 0 && (
              <span className="font-mono-tech rounded-full border border-white/15 bg-[#090A0D] px-3 py-1 text-[12px] font-medium text-[#F6F7F9]">
                {formatFileSize(photo.sizeBytes)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleShare}
            data-testid="share_photo_button"
            className="font-display flex h-[50px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 text-[14px] font-semibold text-[#F6F7F9] hover:bg-white/10"
          >
            <Share2 className="h-[18px] w-[18px]" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            data-testid="open_in_gallery_button"
            className="font-display flex h-[50px] flex-[1.3] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#F6F7F9] text-[14px] font-semibold text-[#090A0D] hover:bg-white"
          >
            <Download className="h-[18px] w-[18px]" />
            <span>Save File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const SessionGalleryModal: React.FC<{
  media: CapturedPhotoInfo[];
  onSelectMedia: (item: CapturedPhotoInfo) => void;
  onImportLocalFile: (file: File) => void;
  onClose: () => void;
}> = ({ media, onSelectMedia, onImportLocalFile, onClose }) => (
  <div className="fixed inset-0 z-40 flex flex-col bg-[#090A0D]/95 p-4 backdrop-blur-md">
    <div className="flex items-center justify-between border-b border-white/10 pb-3">
      <div>
        <h2 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
          Session Gallery ({media.length})
        </h2>
        <p className="font-mono-tech text-[10px] text-[#7D8594]">
          Captured photos, panoramas &amp; videos
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="font-display cursor-pointer rounded-full border border-white/15 bg-[#12141A] px-3.5 py-1.5 text-[12px] font-semibold text-[#67E8F9] hover:bg-[#1A1D26]">
          Open Device File
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportLocalFile(file);
            }}
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border border-white/15 bg-[#12141A] p-2 text-[#F6F7F9]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>

    {media.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <ImageIcon className="h-10 w-10 text-[#7D8594]" />
        <div className="font-display text-[15px] text-[#B4BAC6]">No media captured yet</div>
        <div className="text-[13px] text-[#7D8594]">
          Capture a photo, panorama, or video—or open a file from your device to inspect it.
        </div>
      </div>
    ) : (
      <div className="mt-4 grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {media.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectMedia(item)}
            className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[14px] border border-white/15 bg-[#12141A]"
          >
            {item.isVideo ? (
              <video src={item.url} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img src={item.url} alt={item.displayName} className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2.5 py-2 text-left">
              <span className="font-mono-tech truncate text-[10px] text-[#F6F7F9]">
                {item.width}×{item.height}
              </span>
              {item.isVideo && (
                <span className="font-mono-tech rounded bg-[#FF3B30] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {formatDurationMs(item.durationMs)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);
