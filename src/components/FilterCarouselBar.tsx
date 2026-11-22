import React, { useMemo, useState } from 'react';
import { Eye, Heart, RotateCcw, ShieldCheck, X } from 'lucide-react';
import {
  CAMERA_FILTERS,
  FILTER_CATEGORIES,
  FilterCategoryId,
  FilterId,
  getFilterById,
} from '../types/filters';

type CategoryTab = 'ALL' | 'FAVORITES' | FilterCategoryId;

export interface FilterCarouselBarProps {
  activeFilterId: FilterId;
  intensity: number;
  favoriteFilterIds: FilterId[];
  thumbnails: Partial<Record<FilterId, string>>;
  compact?: boolean;
  isCompareOriginalHeld?: boolean;
  showPreserveOriginalToggle?: boolean;
  preserveOriginalOnCapture?: boolean;
  onSelectFilter: (id: FilterId) => void;
  onIntensityChange: (intensity: number) => void;
  onIntensityCommit?: () => void;
  onToggleFavoriteFilter: (id: FilterId) => void;
  onResetFilter: () => void;
  onCompareHoldChange?: (held: boolean) => void;
  onTogglePreserveOriginal?: () => void;
  onClose?: () => void;
}

export const FilterCarouselBar: React.FC<FilterCarouselBarProps> = ({
  activeFilterId,
  intensity,
  favoriteFilterIds,
  thumbnails,
  compact = false,
  isCompareOriginalHeld = false,
  showPreserveOriginalToggle = false,
  preserveOriginalOnCapture = false,
  onSelectFilter,
  onIntensityChange,
  onIntensityCommit,
  onToggleFavoriteFilter,
  onResetFilter,
  onCompareHoldChange,
  onTogglePreserveOriginal,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('ALL');

  const activeDef = useMemo(() => getFilterById(activeFilterId), [activeFilterId]);
  const isModified = activeFilterId !== 'original' && intensity > 0;

  const visibleFilters = useMemo(() => {
    if (selectedCategory === 'ALL') return CAMERA_FILTERS;
    if (selectedCategory === 'FAVORITES') {
      const orig = CAMERA_FILTERS[0];
      const favs = CAMERA_FILTERS.filter(
        (f) => f.id !== 'original' && favoriteFilterIds.includes(f.id)
      );
      return [orig, ...favs];
    }
    const orig = CAMERA_FILTERS[0];
    const catFilters = CAMERA_FILTERS.filter(
      (f) => f.category === selectedCategory && f.id !== 'original'
    );
    return [orig, ...catFilters];
  }, [selectedCategory, favoriteFilterIds]);

  return (
    <div
      data-testid="filter_carousel_bar"
      className={`flex w-full flex-col ${
        compact
          ? 'rounded-2xl border border-white/15 bg-[#090A0D]/90 p-2.5 backdrop-blur-md'
          : 'gap-3'
      }`}
    >
      {/* Header Row: Active filter name, Compare, Reset, Close */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display truncate text-[13px] font-semibold text-[#F6F7F9]">
              {activeDef.name}
            </span>
            {activeFilterId !== 'original' && (
              <span className="font-mono-tech tabular-nums text-[11px] font-medium text-[#67E8F9]">
                {intensity}%
              </span>
            )}
          </div>
          {!compact && (
            <p className="mt-0.5 truncate text-[11px] text-[#7D8594]">{activeDef.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isModified && onCompareHoldChange && (
            <button
              type="button"
              onPointerDown={() => onCompareHoldChange(true)}
              onPointerUp={() => onCompareHoldChange(false)}
              onPointerLeave={() => onCompareHoldChange(false)}
              onPointerCancel={() => onCompareHoldChange(false)}
              data-testid="filter_compare_button"
              className={`flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition ${
                isCompareOriginalHeld
                  ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
                  : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isCompareOriginalHeld ? 'Original' : 'Compare'}</span>
            </button>
          )}

          {activeFilterId !== 'original' && (
            <button
              type="button"
              onClick={onResetFilter}
              data-testid="filter_reset_button"
              className="flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-[#12141A] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[#B4BAC6] transition hover:bg-[#1A1D26] hover:text-[#F6F7F9]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filter panel"
              className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className={`no-scrollbar flex items-center gap-1 overflow-x-auto ${compact ? 'mt-2' : ''}`}>
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          data-testid="filter_cat_all"
          className={`min-h-[32px] shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition ${
            selectedCategory === 'ALL'
              ? 'bg-[#F6F7F9] text-[#090A0D]'
              : 'bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]'
          }`}
        >
          All (28)
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategory('FAVORITES')}
          data-testid="filter_cat_favorites"
          className={`flex min-h-[32px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition ${
            selectedCategory === 'FAVORITES'
              ? 'bg-[#F59E0B] text-[#090A0D]'
              : 'bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]'
          }`}
        >
          <Heart className={`h-3 w-3 ${selectedCategory === 'FAVORITES' ? 'fill-current' : 'text-[#F59E0B]'}`} />
          <span>Favorites ({favoriteFilterIds.length})</span>
        </button>
        {FILTER_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              data-testid={`filter_cat_${cat.id.toLowerCase()}`}
              className={`min-h-[32px] shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition ${
                isSelected
                  ? 'bg-[#F6F7F9] text-[#090A0D]'
                  : 'bg-[#12141A] text-[#B4BAC6] hover:bg-[#1A1D26] hover:text-[#F6F7F9]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Horizontal Filter Thumbnail Carousel */}
      <div
        className={`no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-1 ${
          compact ? 'mt-2' : ''
        }`}
      >
        {visibleFilters.map((filter) => {
          const isSelected = activeFilterId === filter.id;
          const isFav = favoriteFilterIds.includes(filter.id);
          const thumbSrc = thumbnails[filter.id];

          return (
            <div
              key={filter.id}
              className={`group relative flex w-[76px] shrink-0 flex-col overflow-hidden rounded-xl border transition ${
                isSelected
                  ? 'border-[#67E8F9] bg-[#1A1D26] ring-1 ring-[#67E8F9]/40'
                  : 'border-white/10 bg-[#12141A] hover:border-white/30'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                data-testid={`filter_option_${filter.id}`}
                className="relative h-[54px] w-full cursor-pointer overflow-hidden bg-[#090A0D]"
              >
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={filter.name}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#1f293d] via-[#183a2d] to-[#e89b6c]" />
                )}
              </button>

              {filter.id !== 'original' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavoriteFilter(filter.id);
                  }}
                  aria-label={isFav ? `Remove ${filter.name} from favorites` : `Favorite ${filter.name}`}
                  data-testid={`filter_fav_${filter.id}`}
                  className={`absolute top-1 right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#090A0D]/75 backdrop-blur-sm transition ${
                    isFav ? 'text-[#F59E0B]' : 'text-[#F6F7F9]/70 hover:text-[#F6F7F9]'
                  }`}
                >
                  <Heart className={`h-3 w-3 ${isFav ? 'fill-[#F59E0B]' : ''}`} />
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                className={`cursor-pointer truncate px-1 py-1 text-center text-[10px] font-medium ${
                  isSelected ? 'text-[#67E8F9]' : 'text-[#F6F7F9]'
                }`}
              >
                {filter.name}
              </button>
            </div>
          );
        })}
      </div>

      {/* Filter Intensity Slider (0 - 100%) */}
      {activeFilterId !== 'original' && (
        <div className={`flex flex-col gap-1 ${compact ? 'mt-2' : 'pt-1'}`}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[#B4BAC6]">Filter Intensity</span>
            <span className="font-mono-tech tabular-nums font-medium text-[#67E8F9]">
              {intensity}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            data-testid="filter_intensity_slider"
            onChange={(e) => onIntensityChange(parseInt(e.target.value, 10))}
            onPointerUp={() => onIntensityCommit?.()}
            onKeyUp={() => onIntensityCommit?.()}
            className="ultra-slider h-5 w-full bg-[#1A1D26]"
          />
        </div>
      )}

      {/* Optional Dual-Save Toggle (Preserve Unfiltered Original on Camera Capture) */}
      {showPreserveOriginalToggle && activeFilterId !== 'original' && intensity > 0 && onTogglePreserveOriginal && (
        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-[#B4BAC6]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#67E8F9]" />
            <span>Also save unfiltered original copy</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={preserveOriginalOnCapture}
            onClick={onTogglePreserveOriginal}
            data-testid="filter_preserve_original_toggle"
            className={`min-h-[28px] cursor-pointer rounded-full border px-2.5 text-[10px] font-medium transition ${
              preserveOriginalOnCapture
                ? 'border-[#67E8F9] bg-[#67E8F9]/20 text-[#67E8F9]'
                : 'border-white/15 bg-[#12141A] text-[#7D8594]'
            }`}
          >
            {preserveOriginalOnCapture ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
    </div>
  );
};
