import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  EyeOff,
  FlipHorizontal2,
  Grid3X3,
  Ruler,
  Settings,
  Sparkles,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import {
  ASPECT_RATIO_OPTIONS,
  CameraUserPreferences,
  FlashSetting,
  GridOverlayStyle,
  HdrPlusMode,
  PreviewAspectRatio,
  SHUTTER_TIMER_META,
  SaveImageQuality,
  ShutterTimer,
} from '../types/camera';

interface QuickSettingsPanelProps {
  preferences: CameraUserPreferences;
  aspectRatio: PreviewAspectRatio;
  flashSetting: FlashSetting;
  shutterTimer: ShutterTimer;
  isLevelEnabled: boolean;
  isHistogramEnabled: boolean;
  hasFlash: boolean;
  hasLevelSensor: boolean;
  onSelectAspectRatio: (ratio: PreviewAspectRatio) => void;
  onSelectFlash: (flash: FlashSetting) => void;
  onSelectTimer: (timer: ShutterTimer) => void;
  onSelectGridStyle: (style: GridOverlayStyle) => void;
  onSelectImageQuality: (quality: SaveImageQuality) => void;
  onSelectHdrPlusMode: (mode: HdrPlusMode) => void;
  onToggleSabreSuperRes: () => void;
  onTogglePixelAwb: () => void;
  onToggleLevel: () => void;
  onToggleHistogram: () => void;
  onToggleMirrorSelfie: () => void;
  onToggleCleanViewfinder: () => void;
  onOpenFullSettings: () => void;
  onClose: () => void;
}

const GRID_OPTIONS: { id: GridOverlayStyle; label: string }[] = [
  { id: 'OFF', label: 'Off' },
  { id: 'THIRDS', label: '3×3' },
  { id: 'GOLDEN_RATIO', label: 'Phi' },
  { id: 'DIAGONAL', label: 'Diag' },
  { id: 'SQUARE', label: '4×4' },
];

const QUALITY_OPTIONS: { id: SaveImageQuality; label: string }[] = [
  { id: 'MAXIMUM', label: '98% Max' },
  { id: 'HIGH', label: '92% High' },
  { id: 'STANDARD', label: '85% Std' },
  { id: 'PNG_LOSSLESS', label: 'PNG 100%' },
];

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({
  preferences,
  aspectRatio,
  flashSetting,
  shutterTimer,
  isLevelEnabled,
  isHistogramEnabled,
  hasFlash,
  hasLevelSensor,
  onSelectAspectRatio,
  onSelectFlash,
  onSelectTimer,
  onSelectGridStyle,
  onSelectImageQuality,
  onSelectHdrPlusMode,
  onToggleSabreSuperRes,
  onTogglePixelAwb,
  onToggleLevel,
  onToggleHistogram,
  onToggleMirrorSelfie,
  onToggleCleanViewfinder,
  onOpenFullSettings,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 440, damping: 34, mass: 0.72 }}
      style={{ transformOrigin: 'top center' }}
      data-testid="quick_settings_panel"
      className="mt-2 w-full max-w-[460px] rounded-2xl border border-white/15 bg-[#12141A]/95 p-4 text-[#F6F7F9] shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <span className="font-display text-[14px] font-semibold text-[#F6F7F9]">
          Quick Settings
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenFullSettings}
            data-testid="quick_open_full_settings"
            className="flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[#1A1D26] px-2.5 py-1 text-[11px] font-medium text-[#67E8F9] transition hover:bg-[#242834]"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>All Settings</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick settings"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#B4BAC6] transition hover:bg-white/10 hover:text-[#F6F7F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {/* Aspect Ratio */}
        <QuickRow label="Ratio">
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <QuickOptionButton
              key={opt.id}
              label={opt.label}
              selected={aspectRatio === opt.id}
              onClick={() => onSelectAspectRatio(opt.id)}
            />
          ))}
        </QuickRow>

        {/* Grid */}
        <QuickRow label="Grid" icon={<Grid3X3 className="h-3.5 w-3.5 text-[#7D8594]" />}>
          {GRID_OPTIONS.map((opt) => (
            <QuickOptionButton
              key={opt.id}
              label={opt.label}
              selected={preferences.gridStyle === opt.id}
              onClick={() => onSelectGridStyle(opt.id)}
            />
          ))}
        </QuickRow>

        {/* Timer */}
        <QuickRow label="Timer" icon={<Timer className="h-3.5 w-3.5 text-[#7D8594]" />}>
          {(['OFF', 'SEC_3', 'SEC_5', 'SEC_10'] as ShutterTimer[]).map((t) => (
            <QuickOptionButton
              key={t}
              label={SHUTTER_TIMER_META[t].label}
              selected={shutterTimer === t}
              onClick={() => onSelectTimer(t)}
            />
          ))}
        </QuickRow>

        {/* Flash */}
        {hasFlash && (
          <QuickRow label="Flash" icon={<Zap className="h-3.5 w-3.5 text-[#7D8594]" />}>
            {(['OFF', 'AUTO', 'ON'] as FlashSetting[]).map((f) => (
              <QuickOptionButton
                key={f}
                label={f}
                selected={flashSetting === f}
                accent="amber"
                onClick={() => onSelectFlash(f)}
              />
            ))}
          </QuickRow>
        )}

        {/* Save Quality */}
        <QuickRow label="Quality">
          {QUALITY_OPTIONS.map((q) => (
            <QuickOptionButton
              key={q.id}
              label={q.label}
              selected={preferences.saveImageQuality === q.id}
              onClick={() => onSelectImageQuality(q.id)}
            />
          ))}
        </QuickRow>

        {/* GCam Pro Max HDR+ */}
        <QuickRow label="HDR+" icon={<Sparkles className="h-3.5 w-3.5 text-[#67E8F9]" />}>
          {(
            [
              { id: 'OFF', label: 'Off' },
              { id: 'HDR_PLUS_ZSL', label: 'ZSL' },
              { id: 'HDR_PLUS_ENHANCED', label: 'Enhanced' },
            ] as { id: HdrPlusMode; label: string }[]
          ).map((opt) => (
            <QuickOptionButton
              key={opt.id}
              label={opt.label}
              selected={preferences.gcamEngine.hdrPlusMode === opt.id}
              onClick={() => onSelectHdrPlusMode(opt.id)}
            />
          ))}
        </QuickRow>

        {/* Quick Toggle Row */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-2.5">
          <QuickToggleButton
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Sabre"
            active={preferences.gcamEngine.sabreSuperRes}
            onClick={onToggleSabreSuperRes}
          />
          <QuickToggleButton
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Pixel AWB"
            active={preferences.gcamEngine.pixelAwbEnabled}
            onClick={onTogglePixelAwb}
          />
          <QuickToggleButton
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Level"
            active={isLevelEnabled}
            disabled={!hasLevelSensor}
            onClick={onToggleLevel}
          />
          <QuickToggleButton
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Histogram"
            active={isHistogramEnabled}
            onClick={onToggleHistogram}
          />
          <QuickToggleButton
            icon={<FlipHorizontal2 className="h-3.5 w-3.5" />}
            label="Mirror Selfie"
            active={preferences.mirrorSelfie}
            onClick={onToggleMirrorSelfie}
          />
          <QuickToggleButton
            icon={<EyeOff className="h-3.5 w-3.5" />}
            label="Clean HUD"
            active={preferences.uiCustomization.cleanViewfinderMode}
            onClick={onToggleCleanViewfinder}
          />
        </div>
      </div>
    </motion.div>
  );
};

const QuickRow: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex w-20 shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#B4BAC6]">
      {icon}
      <span>{label}</span>
    </div>
    <div className="no-scrollbar flex flex-1 items-center justify-end gap-1 overflow-x-auto">
      {children}
    </div>
  </div>
);

const QuickOptionButton: React.FC<{
  label: string;
  selected: boolean;
  accent?: 'cyan' | 'amber';
  onClick: () => void;
}> = ({ label, selected, accent = 'cyan', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`font-mono-tech min-h-[32px] shrink-0 cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition ${
      selected
        ? accent === 'amber'
          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
          : 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
        : 'border-white/12 bg-[#1A1D26] text-[#F6F7F9] hover:bg-[#242834]'
    }`}
  >
    {label}
  </button>
);

const QuickToggleButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, disabled = false, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? 'border-[#67E8F9] bg-[#67E8F9]/15 text-[#67E8F9]'
        : 'border-white/12 bg-[#1A1D26] text-[#B4BAC6] hover:bg-[#242834] hover:text-[#F6F7F9]'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
