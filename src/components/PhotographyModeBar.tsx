import React from 'react';
import {
  Camera,
  CheckCircle2,
  Compass,
  Focus,
  Info,
  Lock,
  Moon,
  Palette,
  Sparkles,
  Sun,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  CameraModeCapabilities,
  DetectedSceneType,
  PHOTOGRAPHY_MODE_LIST,
  PanoramaSessionState,
  PhotographyMode,
} from '../types/camera';

function modeIcon(mode: PhotographyMode, className = 'h-3.5 w-3.5') {
  switch (mode) {
    case 'STANDARD':
      return <Camera className={className} />;
    case 'HDR':
      return <Sun className={className} />;
    case 'NIGHT':
      return <Moon className={className} />;
    case 'PORTRAIT':
      return <User className={className} />;
    case 'MACRO':
      return <Focus className={className} />;
    case 'HIGH_RES':
      return <Zap className={className} />;
    case 'PANORAMA':
      return <Compass className={className} />;
    case 'LOW_LIGHT':
      return <Sparkles className={className} />;
    case 'AUTO_SCENE':
      return <Sparkles className={className} />;
    case 'NATURAL_COLOR':
      return <Palette className={className} />;
  }
}

export const PhotographyModeCarousel: React.FC<{
  activeMode: PhotographyMode;
  modeCapabilities: CameraModeCapabilities;
  detectedScene: DetectedSceneType;
  onSelectMode: (mode: PhotographyMode) => void;
  onOpenModesDetail: () => void;
}> = ({ activeMode, modeCapabilities, detectedScene, onSelectMode, onOpenModesDetail }) => (
  <div className="flex w-full flex-col items-center">
    {activeMode === 'AUTO_SCENE' && (
      <div
        data-testid="auto_scene_badge"
        className="mb-1.5 flex items-center gap-1.5 rounded-full border border-[#67E8F9]/45 bg-[#67E8F9]/16 px-2.5 py-1"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#67E8F9]" />
        <span className="font-mono-tech text-[10px] font-medium text-[#F6F7F9]">
          SCENE · {detectedScene.toUpperCase()}
        </span>
      </div>
    )}

    <div className="flex w-full items-center gap-1.5">
      <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
        {PHOTOGRAPHY_MODE_LIST.map((item) => {
          const avail = modeCapabilities.modes[item.mode];
          const selected = activeMode === item.mode;
          const supported = avail?.isSupported ?? true;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => onSelectMode(item.mode)}
              data-testid={`mode_chip_${item.mode.toLowerCase()}`}
              className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 transition ${
                selected
                  ? 'border-[#F59E0B] bg-[#F59E0B] font-bold text-[#090A0D]'
                  : supported
                    ? 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
                    : 'border-white/10 bg-[#101218]/45 text-[#7D8594]'
              }`}
            >
              {supported ? modeIcon(item.mode, 'h-3.5 w-3.5') : <Lock className="h-3.5 w-3.5" />}
              <span className="font-mono-tech text-[10px]">{item.shortTag}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenModesDetail}
        aria-label="Inspect photography mode hardware support"
        data-testid="modes_info_button"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#101218]/70 text-[#67E8F9] hover:bg-[#1A1D26]"
      >
        <Info className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export const PanoramaSweepHud: React.FC<{
  state: PanoramaSessionState;
  onCaptureNextSlice: () => void;
  onFinishStitch: () => void;
  onCancelSweep: () => void;
}> = ({ state, onCaptureNextSlice, onFinishStitch, onCancelSweep }) => {
  const tilt = Math.min(12, Math.max(-12, state.pitchTiltDeg));
  const isLevel = Math.abs(tilt) <= 2.5;

  return (
    <div
      data-testid="panorama_sweep_hud"
      className="mb-2.5 w-full rounded-[16px] border border-white/15 bg-[#090A0D]/80 px-3.5 py-2.5 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono-tech text-[12px] font-medium ${state.isActive ? 'text-[#F59E0B]' : 'text-[#67E8F9]'}`}>
          {state.isStitching
            ? 'Aligning & stitching panorama…'
            : state.isActive
              ? `SWEEP · ${state.capturedSlicesCount}/${state.maxSlices} FRAMES`
              : 'PANORAMA READY'}
        </span>
        <span className="font-mono-tech text-[12px] text-[#F6F7F9]">
          {state.currentYawDeg.toFixed(0)}°
        </span>
      </div>

      {/* Horizon guide bar */}
      <div className="relative my-2 flex h-4 w-full items-center justify-center">
        <div className="h-0.5 w-full rounded-full bg-white/25" />
        <div
          className={`absolute h-2.5 w-2.5 rounded-full transition-transform ${
            isLevel ? 'bg-[#34D399]' : 'bg-[#F59E0B]'
          }`}
          style={{ transform: `translateY(${(tilt / 12) * 6}px)` }}
        />
      </div>

      {/* Slice progress bars */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: state.maxSlices }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-6 rounded-full ${
              i < state.capturedSlicesCount ? 'bg-[#34D399]' : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-center text-[12px] text-[#B4BAC6]">{state.statusHint}</p>

      {state.isStitching ? (
        <div className="mt-2 flex justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
        </div>
      ) : state.isActive ? (
        <div className="mt-2.5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onCancelSweep}
            className="font-mono-tech cursor-pointer rounded-full border border-white/15 px-3 py-1.5 text-[10px] text-[#F6F7F9] hover:bg-white/10"
          >
            Cancel
          </button>
          {state.capturedSlicesCount < state.maxSlices && (
            <button
              type="button"
              onClick={onCaptureNextSlice}
              className="font-mono-tech cursor-pointer rounded-full border border-[#67E8F9]/60 bg-[#67E8F9]/15 px-3 py-1.5 text-[10px] font-semibold text-[#67E8F9]"
            >
              + Slice ({state.capturedSlicesCount}/{state.maxSlices})
            </button>
          )}
          {state.capturedSlicesCount >= 2 && (
            <button
              type="button"
              onClick={onFinishStitch}
              className="font-mono-tech cursor-pointer rounded-full bg-[#34D399] px-3.5 py-1.5 text-[10px] font-bold text-[#090A0D]"
            >
              Stitch ({state.capturedSlicesCount})
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const PhotographyModesDetailDialog: React.FC<{
  activeMode: PhotographyMode;
  capabilities: CameraModeCapabilities;
  onSelectMode: (mode: PhotographyMode) => void;
  onDismiss: () => void;
}> = ({ activeMode, capabilities, onSelectMode, onDismiss }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="flex max-h-[620px] w-full max-w-lg flex-col rounded-[22px] border border-white/15 bg-[#12141A] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-[16px] font-semibold text-[#F6F7F9]">
            Photography Modes
          </h2>
          <p className="text-[12px] text-[#B4BAC6]">
            Optical pipeline &amp; computational photography modes per active sensor
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer rounded-full p-1.5 text-[#F6F7F9] hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2 overflow-y-auto pr-1">
        {PHOTOGRAPHY_MODE_LIST.map((item) => {
          const avail = capabilities.modes[item.mode];
          const isSelected = activeMode === item.mode;
          const supported = avail?.isSupported ?? true;
          return (
            <button
              key={item.mode}
              type="button"
              onClick={() => {
                onSelectMode(item.mode);
                if (supported) onDismiss();
              }}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-[14px] border p-3 text-left transition ${
                isSelected
                  ? 'border-[#F59E0B] bg-[#F59E0B]/16'
                  : supported
                    ? 'border-white/15 bg-[#101218] hover:bg-[#1A1D26]'
                    : 'border-white/10 bg-[#090A0D]/65'
              }`}
            >
              <div className={isSelected ? 'text-[#F59E0B]' : supported ? 'text-[#67E8F9]' : 'text-[#7D8594]'}>
                {modeIcon(item.mode, 'h-5 w-5')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14px] font-semibold text-[#F6F7F9]">
                    {item.label}
                  </span>
                  <span className="font-mono-tech text-[10px] text-[#34D399]">
                    {avail?.backendLabel ?? 'Optical Pipeline'}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#B4BAC6]">{avail?.reason ?? item.description}</p>
              </div>
              {supported ? (
                <CheckCircle2
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isSelected ? 'text-[#F59E0B]' : 'text-[#34D399]'
                  }`}
                />
              ) : (
                <Lock className="h-[18px] w-[18px] shrink-0 text-[#7D8594]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
