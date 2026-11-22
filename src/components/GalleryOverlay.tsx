import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Film,
  Heart,
  Image as ImageIcon,
  Images,
  Play,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { CapturedPhotoInfo, GalleryFilterTab } from '../types/camera';
import { formatDurationMs, formatFileSize } from '../utils/cameraUtils';

interface GalleryOverlayProps {
  media: CapturedPhotoInfo[];
  activeTab: GalleryFilterTab;
  onChangeTab: (tab: GalleryFilterTab) => void;
  onSelectMedia: (item: CapturedPhotoInfo) => void;
  onEditPhoto: (item: CapturedPhotoInfo) => void;
  onEditVideo: (item: CapturedPhotoInfo) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onShareItem: (item: CapturedPhotoInfo) => void;
  onPickMediaFiles: (files: FileList) => void;
  onClose: () => void;
}

export const GalleryOverlay: React.FC<GalleryOverlayProps> = ({
  media,
  activeTab,
  onChangeTab,
  onSelectMedia,
  onEditPhoto,
  onEditVideo,
  onToggleFavorite,
  onDeleteItems,
  onShareItem,
  onPickMediaFiles,
  onClose,
}) => {
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  const counts = useMemo(() => {
    let photos = 0;
    let videos = 0;
    let favorites = 0;
    for (const m of media) {
      if (m.isVideo) videos++;
      else photos++;
      if (m.isFavorite) favorites++;
    }
    return { recent: media.length, photos, videos, favorites };
  }, [media]);

  const filteredMedia = useMemo(() => {
    const sorted = [...media].sort((a, b) => b.timestampMillis - a.timestampMillis);
    switch (activeTab) {
      case 'PHOTOS':
        return sorted.filter((m) => !m.isVideo);
      case 'VIDEOS':
        return sorted.filter((m) => m.isVideo);
      case 'FAVORITES':
        return sorted.filter((m) => m.isFavorite);
      case 'RECENT':
      default:
        return sorted;
    }
  }, [media, activeTab]);

  // Separate recent media into Photos vs Videos summary on the Recent tab when both exist
  const recentPhotos = useMemo(() => filteredMedia.filter((m) => !m.isVideo), [filteredMedia]);
  const recentVideos = useMemo(() => filteredMedia.filter((m) => m.isVideo), [filteredMedia]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const exitSelectionMode = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const handleOpenPicker = () => {
    pickerInputRef.current?.click();
  };

  const renderTile = (item: CapturedPhotoInfo) => {
    const isSelected = selectedIds.includes(item.id);
    const mp = item.width > 0 && item.height > 0 ? ((item.width * item.height) / 1_000_000).toFixed(1) : null;

    return (
      <div
        key={item.id}
        data-testid={`gallery_tile_${item.id}`}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[#12141A] transition-colors ${
          isSelected
            ? 'border-[#67E8F9] ring-2 ring-[#67E8F9]/30'
            : 'border-white/10 hover:border-white/25'
        }`}
      >
        <button
          type="button"
          onClick={() => (isSelecting ? toggleSelectId(item.id) : onSelectMedia(item))}
          className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-[#090A0D] text-left focus-visible:outline-2 focus-visible:outline-[#67E8F9]"
        >
          {item.isVideo ? (
            <video
              src={item.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <img
              src={item.url}
              alt={item.displayName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          )}

          {/* Measured contrast scrim */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

          {/* Video Play / Duration indicator */}
          {item.isVideo && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#090A0D]/70 text-[#F6F7F9] backdrop-blur-sm">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </div>
          )}

          {/* Selection Checkbox Overlay */}
          {isSelecting && (
            <span
              className={`absolute top-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-full border transition ${
                isSelected
                  ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
                  : 'border-white/60 bg-[#090A0D]/60 text-transparent'
              }`}
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
            </span>
          )}

          {/* Clean bottom-left unboxed info overlay */}
          <div className="pointer-events-none absolute right-2.5 bottom-2 left-2.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-[#F6F7F9]">
                {item.isEditedCopy ? `${item.displayName} (Edited)` : item.displayName}
              </div>
              <div className="font-mono-tech tabular-nums flex items-center gap-1.5 text-[10px] text-[#B4BAC6]">
                <span>{item.width}×{item.height}</span>
                {mp && !item.isVideo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{mp} MP</span>
                  </>
                )}
                {item.isVideo && item.durationMs > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#F6F7F9]">{formatDurationMs(item.durationMs)}</span>
                  </>
                )}
                {item.sizeBytes > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formatFileSize(item.sizeBytes)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Tile Quick Actions Bar (clean, single-line, >= 44px touch height) */}
        {!isSelecting && (
          <div className="flex items-center justify-between border-t border-white/8 px-2 py-1">
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              aria-label={item.isFavorite ? 'Remove from favorites' : 'Favorite item'}
              className={`flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] transition hover:bg-white/5 ${
                item.isFavorite ? 'text-[#F59E0B]' : 'text-[#B4BAC6] hover:text-[#F6F7F9]'
              }`}
            >
              <Heart className={`h-4 w-4 ${item.isFavorite ? 'fill-[#F59E0B]' : ''}`} />
              <span className="whitespace-nowrap">{item.isFavorite ? 'Saved' : 'Favorite'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => (item.isVideo ? onEditVideo(item) : onEditPhoto(item))}
                aria-label={`Edit ${item.displayName}`}
                data-testid={`gallery_edit_${item.id}`}
                className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[#67E8F9] transition hover:bg-white/5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{item.isVideo ? 'Filter' : 'Edit'}</span>
              </button>
              <button
                type="button"
                onClick={() => onShareItem(item)}
                aria-label={`Share ${item.displayName}`}
                className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg text-[#B4BAC6] transition hover:bg-white/5 hover:text-[#F6F7F9]"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteIds([item.id])}
                aria-label={`Delete ${item.displayName}`}
                className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg text-[#B4BAC6] transition hover:bg-white/5 hover:text-[#F87171]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="gallery_overlay"
      className="fixed inset-0 z-40 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Hidden System Photo Picker input (scopes permission strictly to picked files) */}
      <input
        ref={pickerInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onPickMediaFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Top 3-Zone Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#090A0D]/95 px-4 py-3 backdrop-blur-md lg:px-8">
        {/* Zone 1: Back & Title */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Return to camera"
            data-testid="close_gallery_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] transition hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-display whitespace-nowrap text-[18px] font-semibold tracking-tight text-[#F6F7F9]">
            Gallery
          </span>
        </div>

        {/* Zone 2: Segmented Filter Tabs */}
        <nav
          aria-label="Gallery media categories"
          className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#12141A] p-1"
        >
          {(
            [
              { id: 'RECENT', label: 'Recent', count: counts.recent },
              { id: 'PHOTOS', label: 'Photos', count: counts.photos },
              { id: 'VIDEOS', label: 'Videos', count: counts.videos },
              { id: 'FAVORITES', label: 'Favorites', count: counts.favorites },
            ] as { id: GalleryFilterTab; label: string; count: number }[]
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                data-testid={`gallery_tab_${tab.id.toLowerCase()}`}
                className={`flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#F6F7F9] text-[#090A0D]'
                    : 'text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono-tech tabular-nums text-[11px] ${
                    active ? 'text-[#090A0D]/70' : 'text-[#7D8594]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Photo Picker & Batch Select */}
        <div className="flex shrink-0 items-center gap-2">
          {filteredMedia.length > 0 && (
            <button
              type="button"
              onClick={() => (isSelecting ? exitSelectionMode() : setIsSelecting(true))}
              className={`min-h-[44px] cursor-pointer rounded-xl border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition ${
                isSelecting
                  ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
                  : 'border-white/15 bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]'
              }`}
            >
              {isSelecting ? 'Done' : 'Select'}
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenPicker}
            data-testid="photo_picker_button"
            className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F6F7F9] px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-[#090A0D] transition hover:bg-white"
          >
            <Images className="h-4 w-4" />
            <span>Pick Media</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-[1360px]">
          {filteredMedia.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#12141A]/60 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1D26] text-[#67E8F9]">
                {activeTab === 'VIDEOS' ? (
                  <Film className="h-7 w-7" />
                ) : activeTab === 'FAVORITES' ? (
                  <Heart className="h-7 w-7 text-[#F59E0B]" />
                ) : (
                  <ImageIcon className="h-7 w-7" />
                )}
              </div>
              <h2 className="font-display mt-4 text-[18px] font-semibold text-[#F6F7F9]">
                {activeTab === 'RECENT' && 'No recent media yet'}
                {activeTab === 'PHOTOS' && 'No photos in your gallery'}
                {activeTab === 'VIDEOS' && 'No recorded videos yet'}
                {activeTab === 'FAVORITES' && 'No favorite photos or videos yet'}
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#7D8594]">
                {activeTab === 'FAVORITES'
                  ? 'Tap Favorite on any captured photo or video to pin it here for quick access.'
                  : 'Capture new shots directly in Ultra Cam Pro or use the system Photo Picker to import specific photos and videos without granting broad storage access.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenPicker}
                  className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F6F7F9] px-5 py-2.5 text-[13px] font-semibold text-[#090A0D] transition hover:bg-white"
                >
                  <Images className="h-4 w-4" />
                  <span>Open Photo Picker</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-display flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-[#12141A] px-5 py-2.5 text-[13px] font-semibold text-[#F6F7F9] transition hover:bg-[#1A1D26]"
                >
                  <Camera className="h-4 w-4 text-[#67E8F9]" />
                  <span>Back to Camera</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'RECENT' && recentPhotos.length > 0 && recentVideos.length > 0 ? (
            <div className="flex flex-col gap-8">
              {/* Recent Photos Section */}
              <section>
                <div className="mb-3 flex items-baseline justify-between border-b border-white/8 pb-2">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="font-display text-[16px] font-semibold text-[#F6F7F9]">
                      Photos
                    </h2>
                    <span className="font-mono-tech tabular-nums text-[12px] text-[#7D8594]">
                      {recentPhotos.length} {recentPhotos.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeTab('PHOTOS')}
                    className="cursor-pointer text-[12px] font-medium text-[#67E8F9] hover:underline"
                  >
                    View all photos
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recentPhotos.map(renderTile)}
                </div>
              </section>

              {/* Recent Videos Section */}
              <section>
                <div className="mb-3 flex items-baseline justify-between border-b border-white/8 pb-2">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="font-display text-[16px] font-semibold text-[#F6F7F9]">
                      Videos
                    </h2>
                    <span className="font-mono-tech tabular-nums text-[12px] text-[#7D8594]">
                      {recentVideos.length} {recentVideos.length === 1 ? 'clip' : 'clips'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeTab('VIDEOS')}
                    className="cursor-pointer text-[12px] font-medium text-[#67E8F9] hover:underline"
                  >
                    View all videos
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recentVideos.map(renderTile)}
                </div>
              </section>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMedia.map(renderTile)}
            </div>
          )}
        </div>
      </main>

      {/* Batch Selection Action Bar */}
      {isSelecting && selectedIds.length > 0 && (
        <div className="border-t border-white/15 bg-[#12141A]/95 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4">
            <span className="font-mono-tech tabular-nums text-[13px] text-[#F6F7F9]">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach((id) => onToggleFavorite(id));
                  exitSelectionMode();
                }}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-[#1A1D26] px-4 py-2 text-[13px] font-medium text-[#F59E0B] hover:bg-[#242834]"
              >
                <Heart className="h-4 w-4" />
                <span>Toggle Favorite</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(selectedIds)}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D] hover:opacity-90"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (No window.confirm) */}
      {confirmDeleteIds && confirmDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
              Delete {confirmDeleteIds.length === 1 ? 'media item' : `${confirmDeleteIds.length} items`}?
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B4BAC6]">
              This permanently removes the selected media from your Ultra Cam Pro gallery. Original
              camera roll files outside this gallery remain untouched.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="min-h-[44px] cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-[#F6F7F9] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteItems(confirmDeleteIds);
                  setConfirmDeleteIds(null);
                  exitSelectionMode();
                }}
                className="min-h-[44px] cursor-pointer rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D] hover:opacity-90"
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
