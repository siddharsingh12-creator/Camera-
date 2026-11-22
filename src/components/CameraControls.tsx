import React from 'react';
import {
  Cpu,
  Flashlight,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  Play,
  RefreshCw,
  Timer,
  Zap,
  ZapOff,
  Gauge,
} from 'lucide-react';
import {
  ASPECT_RATIO_OPTIONS,
  CameraHardwareProfile,
  CaptureSpeedMode,
  CapturedPhotoInfo,
  FlashSetting,
  FocusPointState,
  LENS_ROLE_META,
  PreviewAspectRatio,
  SHUTTER_TIMER_META,
  ShutterTimer,
} from '../types/camera';
import { formatDurationMs } from '../utils/cameraUtils';

export const ShutterButton: React.FC<{
  isCapturing: boolean;
  isCountingDown: boolean;
  burstProgressCount: number | null;
  isBurstMode: boolean;
  enabled: boolean;
  onClick: () => void;
}> = ({ isCapturing, isCountingDown, burstProgressCount, isBurstMode, enabled, onClick }) => (
  <button
    type="button"
    disabled={!enabled || (isCapturing && !isCountingDown)}
    onClick={onClick}
    aria-label="Take photo"
    data-testid="shutter_button"
    className="relative flex h-[82px] w-[82px] cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed"
  >
    <span
      className={`absolute inset-0 rounded-full border-[3px] transition-colors ${
        isBurstMode ? 'border-[#F59E0B]' : 'border-[#F6F7F9]/92'
      }`}
    />
    <span
      className={`flex h-[66px] w-[66px] items-center justify-center rounded-full transition-transform duration-150 ${
        isCapturing || isCountingDown ? 'scale-[0.86]' : 'active:scale-[0.88]'
      } ${
        !enabled ? 'bg-[#7D8594]' : isCountingDown ? 'bg-[#F59E0B]' : 'bg-[#F6F7F9]'
      }`}
    >
      {isCountingDown ? (
        <span className="font-mono-tech text-[10px] font-bold text-[#090A0D]">STOP</span>
      ) : burstProgressCount !== null ? (
        <span className="font-display text-[16px] font-semibold text-[#090A0D]">
          {burstProgressCount}
        </span>
      ) : isCapturing ? (
        <span className="h-6 w-6 animate-spin rounded-full border-[2.5px] border-[#090A0D] border-t-transparent" />
      ) : null}
    </span>
  </button>
);

export const LastPhotoThumbnailButton: React.FC<{
  lastPhoto: CapturedPhotoInfo | null;
  onClick: () => void;
}> = ({ lastPhoto, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={lastPhoto ? 'View last captured media' : 'Open gallery'}
    data-testid="last_photo_thumbnail"
    className={`relative flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[14px] border-[1.5px] bg-[#101218]/70 transition hover:opacity-90 ${
      lastPhoto ? 'border-[#F6F7F9]/75' : 'border-white/15'
    }`}
  >
    {lastPhoto ? (
      <>
        {lastPhoto.isVideo ? (
          <video
            src={lastPhoto.url}
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={lastPhoto.url}
            alt={lastPhoto.displayName}
            className="h-full w-full object-cover"
          />
        )}
        {lastPhoto.isVideo && (
          <>
            <span className="absolute flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#090A0D]/70">
              <Play className="h-3.5 w-3.5 fill-white text-white" />
            </span>
            <span className="font-mono-tech absolute bottom-0.5 rounded bg-[#090A0D]/80 px-1 py-px text-[9px] text-[#F6F7F9]">
              {formatDurationMs(lastPhoto.durationMs)}
            </span>
          </>
        )}
      </>
    ) : (
      <ImageIcon className="h-[22px] w-[22px] text-[#F6F7F9]" />
    )}
  </button>
);

export const GalleryIconButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open gallery"
    data-testid="gallery_button"
    className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/70 text-[#F6F7F9] transition hover:bg-[#1A1D26]"
  >
    <ImageIcon className="h-5 w-5" />
  </button>
);

export const SwitchCameraButton: React.FC<{
  enabled: boolean;
  onClick: () => void;
}> = ({ enabled, onClick }) => (
  <button
    type="button"
    disabled={!enabled}
    onClick={onClick}
    aria-label="Switch camera"
    data-testid="switch_camera_button"
    className={`flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/70 transition ${
      enabled ? 'text-[#F6F7F9] hover:bg-[#1A1D26]' : 'cursor-not-allowed text-[#7D8594]'
    }`}
  >
    <RefreshCw className="h-6 w-6" />
  </button>
);

export const AspectRatioSelectorPill: React.FC<{
  selected: PreviewAspectRatio;
  onSelect: (ratio: PreviewAspectRatio) => void;
}> = ({ selected, onSelect }) => (
  <div className="flex items-center gap-0.5 rounded-full border border-white/15 bg-[#101218]/70 p-[3px] backdrop-blur-md">
    {ASPECT_RATIO_OPTIONS.map((opt) => {
      const isSelected = opt.id === selected;
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          data-testid={`aspect_ratio_${opt.id.toLowerCase()}`}
          className={`font-mono-tech cursor-pointer rounded-full px-2.5 py-1.5 text-[10px] font-medium transition ${
            isSelected ? 'bg-[#F6F7F9] text-[#090A0D]' : 'text-[#F6F7F9] hover:bg-white/10'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export const FlashToggleButton: React.FC<{
  flashSetting: FlashSetting;
  onClick: () => void;
}> = ({ flashSetting, onClick }) => {
  const tint =
    flashSetting === 'ON'
      ? 'text-[#F59E0B]'
      : flashSetting === 'AUTO'
        ? 'text-[#67E8F9]'
        : 'text-[#F6F7F9]';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Flash mode: ${flashSetting}`}
      data-testid="flash_toggle_button"
      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/70 backdrop-blur-md transition hover:bg-[#1A1D26] ${tint}`}
    >
      {flashSetting === 'OFF' ? (
        <ZapOff className="h-[18px] w-[18px]" />
      ) : flashSetting === 'AUTO' ? (
        <span className="flex items-center gap-0.5">
          <Zap className="h-[16px] w-[16px]" />
          <span className="font-mono-tech text-[8px] font-bold">A</span>
        </span>
      ) : (
        <Zap className="h-[18px] w-[18px]" />
      )}
    </button>
  );
};

export const TimerToggleButton: React.FC<{
  shutterTimer: ShutterTimer;
  onClick: () => void;
}> = ({ shutterTimer, onClick }) => {
  const isActive = shutterTimer !== 'OFF';
  const meta = SHUTTER_TIMER_META[shutterTimer];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Camera shutter timer"
      data-testid="timer_toggle_button"
      className={`flex cursor-pointer items-center gap-1 rounded-full border bg-[#101218]/70 px-2.5 py-2 backdrop-blur-md transition hover:bg-[#1A1D26] ${
        isActive ? 'border-[#F59E0B]/65 text-[#F59E0B]' : 'border-white/15 text-[#F6F7F9]'
      }`}
    >
      <Timer className="h-[18px] w-[18px]" />
      {isActive && <span className="font-mono-tech text-[10px] font-medium">{meta.label}</span>}
    </button>
  );
};

export const BurstModePill: React.FC<{
  isEnabled: boolean;
  onClick: () => void;
}> = ({ isEnabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid="burst_mode_button"
    className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 transition ${
      isEnabled
        ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
        : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
    }`}
  >
    <Layers className="h-3.5 w-3.5" />
    <span className="font-mono-tech text-[10px] font-medium">BURST</span>
  </button>
);

export const QuickCapturePill: React.FC<{
  mode: CaptureSpeedMode;
  onClick: () => void;
}> = ({ mode, onClick }) => {
  const isQuick = mode === 'QUICK';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="quick_capture_button"
      className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 transition ${
        isQuick
          ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
          : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
      }`}
    >
      <Gauge className="h-3.5 w-3.5" />
      <span className="font-mono-tech text-[10px] font-medium">{isQuick ? 'QUICK' : 'MAX'}</span>
    </button>
  );
};

export const ProToggleButton: React.FC<{
  isOpen: boolean;
  hasAnyManualActive: boolean;
  onClick: () => void;
}> = ({ isOpen, hasAnyManualActive, onClick }) => {
  const highlighted = isOpen || hasAnyManualActive;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="pro_controls_button"
      className={`font-mono-tech shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
        highlighted
          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
          : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
      }`}
    >
      PRO
    </button>
  );
};

export const HardwareInspectorButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Inspect camera hardware capabilities"
    data-testid="hardware_inspector_button"
    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/70 text-[#67E8F9] transition hover:bg-[#1A1D26]"
  >
    <Cpu className="h-[18px] w-[18px]" />
  </button>
);

export const SensorTelemetryPill: React.FC<{
  resolutionText: string;
  lensLabel: string;
  onClick: () => void;
}> = ({ resolutionText, lensLabel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid="sensor_telemetry_pill"
    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-[#101218]/70 px-2.5 py-1.5 backdrop-blur-md transition hover:bg-[#1A1D26]"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-[#67E8F9]" />
    <span className="font-mono-tech text-[10px] font-medium text-[#F6F7F9]">
      {lensLabel} · {resolutionText}
    </span>
  </button>
);

export const ZoomSliderBar: React.FC<{
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
}> = ({ currentZoom, minZoom, maxZoom, onZoomChange }) => (
  <div
    data-testid="zoom_slider_bar"
    className="flex w-full max-w-[360px] items-center gap-2.5 rounded-full border border-white/15 bg-[#101218]/70 px-3.5 py-1 backdrop-blur-md"
  >
    <span className="font-mono-tech w-10 text-[10px] font-medium text-[#67E8F9]">
      {currentZoom.toFixed(1)}×
    </span>
    <input
      type="range"
      min={minZoom}
      max={maxZoom}
      step={0.1}
      value={Math.min(maxZoom, Math.max(minZoom, currentZoom))}
      onChange={(e) => onZoomChange(parseFloat(e.target.value))}
      data-testid="zoom_slider"
      className="ultra-slider h-5 flex-1 accent-[#67E8F9]"
      style={{
        background: `linear-gradient(to right, #67E8F9 0%, #67E8F9 ${((currentZoom - minZoom) / Math.max(0.01, maxZoom - minZoom)) * 100}%, rgba(255,255,255,0.15) ${((currentZoom - minZoom) / Math.max(0.01, maxZoom - minZoom)) * 100}%, rgba(255,255,255,0.15) 100%)`,
        height: '4px',
        borderRadius: '9999px',
      }}
    />
    <span className="font-mono-tech text-[10px] font-medium text-[#B4BAC6]">
      {maxZoom.toFixed(0)}×
    </span>
  </div>
);

export const DynamicLensSelectorBar: React.FC<{
  activeProfile: CameraHardwareProfile | null;
  sameFacingSelectableCameras: CameraHardwareProfile[];
  currentZoomRatio: number;
  maxZoomRatio: number;
  onSelectCameraId: (id: string) => void;
  onSelectZoomRatio: (ratio: number) => void;
}> = ({
  activeProfile,
  sameFacingSelectableCameras,
  currentZoomRatio,
  maxZoomRatio,
  onSelectCameraId,
  onSelectZoomRatio,
}) => {
  const opticalStops = activeProfile?.opticalZoomStops ?? [];
  const hasMultipleBindable = sameFacingSelectableCameras.length >= 2;
  const hasVerifiedStops = opticalStops.length >= 2;

  return (
    <div
      data-testid="dynamic_lens_bar"
      className="flex items-center gap-1 rounded-full border border-white/15 bg-[#101218]/70 px-1.5 py-1 backdrop-blur-md"
    >
      {hasMultipleBindable ? (
        sameFacingSelectableCameras.map((cam) => {
          const selected = cam.cameraId === activeProfile?.cameraId;
          const focal = cam.focalLengthsMm[0] ? `${cam.focalLengthsMm[0].toFixed(1)}mm` : '';
          const roleTag = LENS_ROLE_META[cam.role].shortTag;
          return (
            <button
              key={cam.cameraId}
              type="button"
              onClick={() => onSelectCameraId(cam.cameraId)}
              className={`font-mono-tech cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                selected ? 'bg-[#F6F7F9] text-[#090A0D]' : 'text-[#F6F7F9] hover:bg-white/10'
              }`}
            >
              {focal ? `${roleTag} ${focal}` : roleTag}
            </button>
          );
        })
      ) : hasVerifiedStops ? (
        opticalStops.map((stop) => {
          const target = stop.zoomRatio ?? 1;
          const closest = opticalStops.reduce((best, cur) =>
            Math.abs((cur.zoomRatio ?? 1) - currentZoomRatio) <
            Math.abs((best.zoomRatio ?? 1) - currentZoomRatio)
              ? cur
              : best
          );
          const isSelected = closest.label === stop.label;
          return (
            <button
              key={stop.label}
              type="button"
              onClick={() => onSelectZoomRatio(target)}
              className={`font-mono-tech cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                isSelected ? 'bg-[#F6F7F9] text-[#090A0D]' : 'text-[#F6F7F9] hover:bg-white/10'
              }`}
            >
              {stop.label}
            </button>
          );
        })
      ) : (
        <span className="font-mono-tech px-3 py-1 text-[11px] font-medium text-[#F6F7F9]">
          {maxZoomRatio > 1.05 ? `${currentZoomRatio.toFixed(1)}×` : '1.0×'}
          {activeProfile?.focalLengthsMm[0] ? ` · ${activeProfile.focalLengthsMm[0].toFixed(1)}mm` : ''}
        </span>
      )}
    </div>
  );
};

export const RuleOfThirdsGrid: React.FC = () => (
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/25" />
    <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/25" />
    <div className="absolute right-0 left-0 top-1/3 h-px bg-white/25" />
    <div className="absolute right-0 left-0 top-2/3 h-px bg-white/25" />
  </div>
);

export const CameraLevelOverlay: React.FC<{ rollDegrees: number }> = ({ rollDegrees }) => {
  let nearest = 0;
  if (Math.abs(rollDegrees) <= 45) nearest = 0;
  else if (rollDegrees > 45 && rollDegrees <= 135) nearest = 90;
  else if (rollDegrees < -45 && rollDegrees >= -135) nearest = -90;
  else nearest = rollDegrees > 0 ? 180 : -180;

  const delta = rollDegrees - nearest;
  const isLevel = Math.abs(delta) <= 1.5;
  const accent = isLevel ? '#34D399' : 'rgba(246, 247, 249, 0.78)';

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <line x1="16" y1="70" x2="25" y2="70" stroke="rgba(246,247,249,0.35)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="115" y1="70" x2="124" y2="70" stroke="rgba(246,247,249,0.35)" strokeWidth="1.5" strokeLinecap="round" />
        <g transform={`rotate(${-delta} 70 70)`}>
          <line x1="28" y1="70" x2="60" y2="70" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <line x1="80" y1="70" x2="112" y2="70" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <circle cx="70" cy="70" r="3" fill={accent} />
        </g>
      </svg>
    </div>
  );
};

export const TimerCountdownOverlay: React.FC<{ remainingSeconds: number | null }> = ({
  remainingSeconds,
}) => {
  if (remainingSeconds === null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full border-2 border-[#F59E0B] bg-[#090A0D]/60 backdrop-blur-sm">
        <span className="font-display text-[36px] font-bold text-[#F6F7F9]">
          {remainingSeconds}
        </span>
      </div>
    </div>
  );
};

export const FocusReticleOverlay: React.FC<{ focusPoint: FocusPointState | null }> = ({
  focusPoint,
}) => {
  if (!focusPoint) return null;
  const ringColor =
    focusPoint.isLockedSuccess === true
      ? '#67E8F9'
      : focusPoint.isLockedSuccess === false
        ? '#F59E0B'
        : '#F6F7F9';

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: focusPoint.x, top: focusPoint.y }}
    >
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="31" fill="none" stroke={ringColor} strokeOpacity="0.9" strokeWidth="1.5" />
        <circle cx="34" cy="34" r="3" fill={ringColor} />
      </svg>
    </div>
  );
};

export { Flashlight, Grid3X3 };
