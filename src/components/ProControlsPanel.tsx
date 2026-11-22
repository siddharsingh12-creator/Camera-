import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  Crosshair,
  FlipHorizontal2,
  Grid3X3,
  Lock,
  LockOpen,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CAPTURE_FORMAT_META,
  CameraHardwareProfile,
  CaptureOutputFormat,
  LiveExposureTelemetry,
  ManualProSettings,
  ProControlTab,
  ProPreset,
  SensorCapabilities,
  StabilizationSelection,
  WHITE_BALANCE_META,
  WhiteBalanceOption,
} from '../types/camera';
import { formatResolutionLabel, formatShutterSpeed } from '../utils/cameraUtils';

interface ProControlsPanelProps {
  profile: CameraHardwareProfile | null;
  sensorCapabilities: SensorCapabilities;
  settings: ManualProSettings;
  liveTelemetry: LiveExposureTelemetry;
  customPresets: ProPreset[];
  hasLevelSensor: boolean;
  isFrontCamera: boolean;
  isGridEnabled: boolean;
  isLevelEnabled: boolean;
  isFrontMirrorEnabled: boolean;
  isVolumeShutterEnabled: boolean;
  onSelectProTab: (tab: ProControlTab) => void;
  onSetManualIso: (enabled: boolean, iso: number | null) => void;
  onSetManualShutter: (enabled: boolean, ns: number | null) => void;
  onSetWhiteBalance: (wb: WhiteBalanceOption) => void;
  onSetManualKelvin: (kelvin: number) => void;
  onSetManualFocus: (enabled: boolean, diopters: number | null) => void;
  onExposureCompChange: (index: number) => void;
  onSelectCaptureFormat: (fmt: CaptureOutputFormat) => void;
  onToggleExposureLock: () => void;
  onSelectStabilization: (stab: StabilizationSelection) => void;
  onToggleFocusPeaking: () => void;
  onCycleFocusPeakingColor: () => void;
  onToggleHistogram: () => void;
  onToggleZebra: () => void;
  onSetZebraThreshold: (pct: number) => void;
  onToggleGrid: () => void;
  onToggleLevel: () => void;
  onToggleFrontMirror: () => void;
  onToggleVolumeShutter: () => void;
  onSavePreset: (name: string) => void;
  onApplyPreset: (preset: ProPreset) => void;
  onDeletePreset: (id: string) => void;
  onResetAllToAuto: () => void;
}

export const ProControlsPanel: React.FC<ProControlsPanelProps> = ({
  profile,
  sensorCapabilities,
  settings,
  liveTelemetry,
  customPresets,
  hasLevelSensor,
  isFrontCamera,
  isGridEnabled,
  isLevelEnabled,
  isFrontMirrorEnabled,
  isVolumeShutterEnabled,
  onSelectProTab,
  onSetManualIso,
  onSetManualShutter,
  onSetWhiteBalance,
  onSetManualKelvin,
  onSetManualFocus,
  onExposureCompChange,
  onSelectCaptureFormat,
  onToggleExposureLock,
  onSelectStabilization,
  onToggleFocusPeaking,
  onCycleFocusPeakingColor,
  onToggleHistogram,
  onToggleZebra,
  onSetZebraThreshold,
  onToggleGrid,
  onToggleLevel,
  onToggleFrontMirror,
  onToggleVolumeShutter,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  onResetAllToAuto,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetDraftName, setPresetDraftName] = useState('');

  const exp = profile?.exposureAndRaw;
  const focus = profile?.focusCapabilities;
  const stab = profile?.videoAndStabilization;
  const evRange = sensorCapabilities.exposureRange;

  const isoRange = exp?.isoRange ?? [50, 6400];
  const fallbackIso = Math.min(isoRange[1], Math.max(isoRange[0], liveTelemetry.iso ?? 100));
  const activeIso = Math.min(isoRange[1], Math.max(isoRange[0], settings.manualIso ?? fallbackIso));

  const shutterRange = exp?.shutterRangeNs ?? [125_000, 1_000_000_000];
  const minLog = Math.log(Math.max(1, shutterRange[0]));
  const maxLog = Math.log(Math.max(shutterRange[0] + 1, shutterRange[1]));
  const fallbackNs = Math.min(shutterRange[1], Math.max(shutterRange[0], liveTelemetry.shutterNs ?? 16_666_666));
  const activeNs = Math.min(shutterRange[1], Math.max(shutterRange[0], settings.manualShutterNs ?? fallbackNs));
  const currentLog = Math.min(maxLog, Math.max(minLog, Math.log(Math.max(1, activeNs))));

  const evStep = sensorCapabilities.exposureStep > 0 ? sensorCapabilities.exposureStep : 1 / 3;
  const currentEvIdx = Math.min(evRange[1], Math.max(evRange[0], sensorCapabilities.currentExposureIndex));

  const maxD = focus?.minimumFocusDistanceDiopters ?? 10;
  const currentD = Math.min(maxD, Math.max(0, settings.manualFocusDiopters));

  const activeToolsCount = [
    settings.isFocusPeakingEnabled,
    settings.isHistogramEnabled,
    settings.isZebraEnabled,
    settings.isExposureLockEnabled,
    isGridEnabled,
    isLevelEnabled,
  ].filter(Boolean).length;

  return (
    <div
      data-testid="pro_controls_panel"
      className="max-h-[310px] w-full overflow-y-auto rounded-[20px] border border-white/15 bg-[#12141A]/95 px-3.5 py-3 backdrop-blur-md"
    >
      {/* Save Preset Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-[20px] border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[16px] font-semibold text-[#F6F7F9]">Save Preset</h3>
            <input
              type="text"
              value={presetDraftName}
              onChange={(e) => setPresetDraftName(e.target.value)}
              placeholder="Preset name (e.g. Night ISO 400)"
              autoFocus
              className="mt-3 w-full rounded-[12px] border border-white/15 bg-[#090A0D] px-3 py-2 text-[14px] text-[#F6F7F9] placeholder-[#7D8594] focus:border-[#F59E0B] focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="cursor-pointer rounded-full px-4 py-1.5 text-[13px] text-[#B4BAC6] hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = presetDraftName.trim() || `Custom ${customPresets.length + 1}`;
                  onSavePreset(chosen);
                  setPresetDraftName('');
                  setShowSaveDialog(false);
                }}
                className="font-display cursor-pointer rounded-full bg-[#F59E0B] px-4 py-1.5 text-[13px] font-semibold text-[#090A0D]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold text-[#F6F7F9]">
            Manual Sensor Controls
          </div>
          {profile && (
            <div className="font-mono-tech truncate text-[10px] text-[#67E8F9]">
              CAM {profile.cameraId} · {profile.hardwareLevel} ·{' '}
              {exp?.isManualExposureSupported ? 'MANUAL_SENSOR' : 'AUTO SENSOR'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onResetAllToAuto}
          data-testid="pro_reset_auto_button"
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-white/15 bg-[#1A1D26] px-2.5 py-1.5 text-[10px] text-[#F6F7F9] hover:bg-[#232733]"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#B4BAC6]" />
          <span className="font-mono-tech">Reset Auto</span>
        </button>
      </div>

      {/* DSLR Tab Selector Strip */}
      <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
        <DslrParamTile
          label="ISO"
          value={
            exp?.isManualExposureSupported
              ? settings.isManualIsoEnabled && settings.manualIso
                ? `${settings.manualIso}`
                : liveTelemetry.iso
                  ? `A·${liveTelemetry.iso}`
                  : 'AUTO'
              : 'N/A'
          }
          selected={settings.activeProTab === 'ISO'}
          isManual={settings.isManualIsoEnabled}
          isUnavailable={!exp?.isManualExposureSupported}
          onClick={() => onSelectProTab('ISO')}
        />
        <DslrParamTile
          label="SHUTTER"
          value={
            exp?.isManualExposureSupported
              ? settings.isManualShutterEnabled && settings.manualShutterNs
                ? formatShutterSpeed(settings.manualShutterNs)
                : liveTelemetry.shutterNs
                  ? formatShutterSpeed(liveTelemetry.shutterNs)
                  : 'AUTO'
              : 'N/A'
          }
          selected={settings.activeProTab === 'SHUTTER'}
          isManual={settings.isManualShutterEnabled}
          isUnavailable={!exp?.isManualExposureSupported}
          onClick={() => onSelectProTab('SHUTTER')}
        />
        <DslrParamTile
          label="EV"
          value={
            evRange[0] >= evRange[1]
              ? 'N/A'
              : settings.isManualIsoEnabled || settings.isManualShutterEnabled
                ? 'M'
                : currentEvIdx === 0
                  ? '0.0'
                  : `${currentEvIdx * evStep >= 0 ? '+' : ''}${(currentEvIdx * evStep).toFixed(1)}`
          }
          selected={settings.activeProTab === 'EV'}
          isManual={!settings.isManualIsoEnabled && !settings.isManualShutterEnabled && currentEvIdx !== 0}
          isUnavailable={evRange[0] >= evRange[1]}
          onClick={() => onSelectProTab('EV')}
        />
        <DslrParamTile
          label="WB"
          value={
            settings.whiteBalanceMode === 'MANUAL_KELVIN'
              ? `${settings.manualKelvin}K`
              : WHITE_BALANCE_META[settings.whiteBalanceMode].shortTag
          }
          selected={settings.activeProTab === 'WB'}
          isManual={settings.whiteBalanceMode !== 'AUTO'}
          isUnavailable={false}
          onClick={() => onSelectProTab('WB')}
        />
        <DslrParamTile
          label="FOCUS"
          value={
            !focus?.isManualFocusSupported
              ? 'N/A'
              : settings.isManualFocusEnabled
                ? currentD <= 0.05
                  ? '∞'
                  : `${currentD.toFixed(1)}d`
                : 'AF'
          }
          selected={settings.activeProTab === 'FOCUS'}
          isManual={settings.isManualFocusEnabled}
          isUnavailable={!focus?.isManualFocusSupported}
          onClick={() => onSelectProTab('FOCUS')}
        />
        <DslrParamTile
          label="FORMAT"
          value={CAPTURE_FORMAT_META[settings.captureOutputFormat].shortTag}
          selected={settings.activeProTab === 'FORMAT'}
          isManual={settings.isRawCaptureEnabled}
          isUnavailable={false}
          onClick={() => onSelectProTab('FORMAT')}
        />
        <DslrParamTile
          label="TOOLS"
          value={activeToolsCount > 0 ? `${activeToolsCount} ON` : 'HUD'}
          selected={settings.activeProTab === 'TOOLS'}
          isManual={activeToolsCount > 0}
          isUnavailable={false}
          onClick={() => onSelectProTab('TOOLS')}
        />
        <DslrParamTile
          label="PRESETS"
          value={`C(${customPresets.length})`}
          selected={settings.activeProTab === 'PRESETS'}
          isManual={customPresets.length > 0}
          isUnavailable={false}
          onClick={() => onSelectProTab('PRESETS')}
        />
      </div>

      {/* Active Control Stage */}
      <div className="mt-2.5">
        {settings.activeProTab === 'ISO' && (
          <DslrSliderDeck
            title="ISO Sensitivity"
            valueLabel={
              settings.isManualIsoEnabled ? `ISO ${activeIso}` : `AUTO (ISO ${fallbackIso})`
            }
            isManualActive={settings.isManualIsoEnabled}
            toggleBadgeText={settings.isManualIsoEnabled ? 'SWITCH AUTO' : 'AUTO'}
            onToggleAuto={() => onSetManualIso(!settings.isManualIsoEnabled, activeIso)}
            sliderValue={activeIso}
            min={isoRange[0]}
            max={isoRange[1]}
            step={25}
            onChange={(val) => onSetManualIso(true, Math.round(val))}
            rangeSummary={`Hardware ISO range ${isoRange[0]} – ${isoRange[1]}`}
          >
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-1">
              <QuickChip
                label="AUTO"
                selected={!settings.isManualIsoEnabled}
                accent="cyan"
                onClick={() => onSetManualIso(false, null)}
              />
              {[50, 100, 200, 400, 800, 1600, 3200, 6400]
                .filter((s) => s >= isoRange[0] && s <= isoRange[1])
                .map((stop) => (
                  <QuickChip
                    key={stop}
                    label={`${stop}`}
                    selected={settings.isManualIsoEnabled && activeIso === stop}
                    accent="amber"
                    onClick={() => onSetManualIso(true, stop)}
                  />
                ))}
            </div>
          </DslrSliderDeck>
        )}

        {settings.activeProTab === 'SHUTTER' && (
          <DslrSliderDeck
            title="Shutter Speed"
            valueLabel={
              settings.isManualShutterEnabled
                ? formatShutterSpeed(activeNs)
                : `AUTO (${formatShutterSpeed(fallbackNs)})`
            }
            isManualActive={settings.isManualShutterEnabled}
            toggleBadgeText={settings.isManualShutterEnabled ? 'SWITCH AUTO' : 'AUTO'}
            onToggleAuto={() => onSetManualShutter(!settings.isManualShutterEnabled, activeNs)}
            sliderValue={currentLog}
            min={minLog}
            max={maxLog}
            step={0.02}
            onChange={(logVal) =>
              onSetManualShutter(
                true,
                Math.min(shutterRange[1], Math.max(shutterRange[0], Math.round(Math.exp(logVal))))
              )
            }
            rangeSummary={`Hardware exposure ${formatShutterSpeed(shutterRange[0])} – ${formatShutterSpeed(shutterRange[1])}`}
          >
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-1">
              <QuickChip
                label="AUTO"
                selected={!settings.isManualShutterEnabled}
                accent="cyan"
                onClick={() => onSetManualShutter(false, null)}
              />
              {[250_000, 1_000_000, 4_000_000, 8_333_333, 16_666_666, 33_333_333, 125_000_000, 250_000_000, 1_000_000_000]
                .filter((ns) => ns >= shutterRange[0] && ns <= shutterRange[1])
                .map((stopNs) => (
                  <QuickChip
                    key={stopNs}
                    label={formatShutterSpeed(stopNs)}
                    selected={
                      settings.isManualShutterEnabled &&
                      Math.abs(activeNs - stopNs) <= stopNs / 8
                    }
                    accent="amber"
                    onClick={() => onSetManualShutter(true, stopNs)}
                  />
                ))}
            </div>
          </DslrSliderDeck>
        )}

        {settings.activeProTab === 'EV' && (
          <DslrSliderDeck
            title="Exposure (EV)"
            valueLabel={
              currentEvIdx === 0
                ? '0.0 EV'
                : `${currentEvIdx * evStep >= 0 ? '+' : ''}${(currentEvIdx * evStep).toFixed(1)} EV`
            }
            isManualActive={currentEvIdx !== 0}
            toggleBadgeText="ZERO"
            onToggleAuto={() => onExposureCompChange(0)}
            sliderValue={currentEvIdx}
            min={evRange[0]}
            max={evRange[1]}
            step={1}
            onChange={(val) => {
              if (settings.isManualIsoEnabled) onSetManualIso(false, null);
              if (settings.isManualShutterEnabled) onSetManualShutter(false, null);
              onExposureCompChange(Math.round(val));
            }}
            rangeSummary={
              settings.isManualIsoEnabled || settings.isManualShutterEnabled
                ? 'Manual ISO/Shutter overrides AE · Drag EV to re-enable Auto AE + EV'
                : `Hardware EV range ${(evRange[0] * evStep).toFixed(1)} to +${(evRange[1] * evStep).toFixed(1)} EV`
            }
          />
        )}

        {settings.activeProTab === 'WB' && (
          <div className="rounded-[14px] border border-white/8 bg-[#1A1D26] p-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold text-[#F6F7F9]">
                White Balance
              </span>
              <span
                className={`font-mono-tech text-[12px] font-medium ${
                  settings.whiteBalanceMode !== 'AUTO' ? 'text-[#F59E0B]' : 'text-[#67E8F9]'
                }`}
              >
                {settings.whiteBalanceMode === 'MANUAL_KELVIN'
                  ? `${settings.manualKelvin}K`
                  : WHITE_BALANCE_META[settings.whiteBalanceMode].label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(exp?.supportedAwbModes ?? ['AUTO', 'DAYLIGHT', 'CLOUDY_DAYLIGHT', 'INCANDESCENT', 'MANUAL_KELVIN']).map(
                (mode) => (
                  <QuickChip
                    key={mode}
                    label={
                      mode === 'MANUAL_KELVIN'
                        ? `${settings.manualKelvin}K`
                        : WHITE_BALANCE_META[mode].label
                    }
                    selected={settings.whiteBalanceMode === mode}
                    accent={mode === 'AUTO' ? 'cyan' : 'amber'}
                    onClick={() => onSetWhiteBalance(mode)}
                  />
                )
              )}
            </div>
            <div className="mt-2.5">
              <div className="font-mono-tech flex justify-between text-[10px] text-[#B4BAC6]">
                <span>Color Temp (K)</span>
                <span className="text-[#7D8594]">2200K (Cool) – 8000K (Warm)</span>
              </div>
              <input
                type="range"
                min={2200}
                max={8000}
                step={100}
                value={settings.manualKelvin}
                onChange={(e) => onSetManualKelvin(parseInt(e.target.value, 10))}
                className="ultra-slider ultra-slider-amber mt-1.5 w-full bg-[#090A0D]"
              />
            </div>
          </div>
        )}

        {settings.activeProTab === 'FOCUS' && (
          <DslrSliderDeck
            title="Manual Focus"
            valueLabel={
              !settings.isManualFocusEnabled
                ? `AF (${focus?.afModes[0] ?? 'CONTINUOUS'})`
                : currentD <= 0.05
                  ? 'MF ∞ Infinity'
                  : 100 / currentD >= 100
                    ? `MF ${(100 / currentD / 100).toFixed(2)}m`
                    : `MF ${(100 / currentD).toFixed(1)}cm`
            }
            isManualActive={settings.isManualFocusEnabled}
            toggleBadgeText={settings.isManualFocusEnabled ? 'SWITCH AF' : 'AF'}
            onToggleAuto={() => onSetManualFocus(!settings.isManualFocusEnabled, currentD)}
            sliderValue={currentD}
            min={0}
            max={maxD}
            step={0.1}
            onChange={(val) => onSetManualFocus(true, val)}
            rangeSummary={`Min focus: ${focus?.minimumFocusDistanceCm?.toFixed(1) ?? '10.0'} cm (${focus?.focusCalibrationLabel ?? 'Calibrated'})`}
          >
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-1">
              <QuickChip
                label="AF"
                selected={!settings.isManualFocusEnabled}
                accent="cyan"
                onClick={() => onSetManualFocus(false, currentD)}
              />
              <QuickChip
                label="∞ INF"
                selected={settings.isManualFocusEnabled && currentD <= 0.05}
                accent="amber"
                onClick={() => onSetManualFocus(true, 0)}
              />
              {maxD >= 1 && (
                <QuickChip
                  label="1.0m"
                  selected={settings.isManualFocusEnabled && Math.abs(currentD - 1) < 0.25}
                  accent="amber"
                  onClick={() => onSetManualFocus(true, 1)}
                />
              )}
              {maxD >= 3.3 && (
                <QuickChip
                  label="0.3m"
                  selected={settings.isManualFocusEnabled && Math.abs(currentD - 3.3) < 0.4}
                  accent="amber"
                  onClick={() => onSetManualFocus(true, 3.33)}
                />
              )}
              <QuickChip
                label="MACRO"
                selected={settings.isManualFocusEnabled && currentD >= maxD * 0.9}
                accent="amber"
                onClick={() => onSetManualFocus(true, maxD)}
              />
              <ControlIconChip
                icon={<Crosshair className="h-3.5 w-3.5" />}
                label="PEAK"
                selected={settings.isFocusPeakingEnabled}
                accent="cyan"
                onClick={onToggleFocusPeaking}
              />
            </div>
          </DslrSliderDeck>
        )}

        {settings.activeProTab === 'FORMAT' && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-white/8 bg-[#1A1D26] p-3">
            <div className="font-display text-[15px] font-semibold text-[#F6F7F9]">
              Capture Format
            </div>
            <FormatOptionRow
              title="JPEG"
              subtitle={
                profile?.maxJpegResolution
                  ? formatResolutionLabel(profile.maxJpegResolution)
                  : 'Full Native Sensor JPEG'
              }
              selected={settings.captureOutputFormat === 'JPEG'}
              supported={true}
              onClick={() => onSelectCaptureFormat('JPEG')}
            />
            <FormatOptionRow
              title="RAW (DNG)"
              subtitle="16-bit uncompressed DNG"
              selected={settings.captureOutputFormat === 'RAW_DNG'}
              supported={Boolean(exp?.isRawSupported && exp.isCameraXRawOnlySupported)}
              unavailableReason={exp?.unsupportedRawReason ?? 'Requires native Camera2 RAW_SENSOR stream'}
              onClick={() => onSelectCaptureFormat('RAW_DNG')}
            />
            <FormatOptionRow
              title="RAW + JPEG"
              subtitle="Simultaneous DNG + Native JPEG"
              selected={settings.captureOutputFormat === 'RAW_PLUS_JPEG'}
              supported={Boolean(exp?.isRawSupported && exp.isCameraXRawJpegSupported)}
              unavailableReason={exp?.unsupportedRawReason ?? 'Requires native Camera2 RAW_SENSOR stream'}
              onClick={() => onSelectCaptureFormat('RAW_PLUS_JPEG')}
            />
          </div>
        )}

        {settings.activeProTab === 'TOOLS' && (
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-white/8 bg-[#1A1D26] p-3">
            <div className="font-display text-[15px] font-semibold text-[#F6F7F9]">
              DSLR Monitoring & Camera Tools
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ControlIconChip
                icon={<Crosshair className="h-3.5 w-3.5" />}
                label="Focus Peaking"
                selected={settings.isFocusPeakingEnabled}
                accent="cyan"
                onClick={onToggleFocusPeaking}
              />
              {settings.isFocusPeakingEnabled && (
                <QuickChip
                  label={`Color: ${settings.focusPeakingColor}`}
                  selected={true}
                  accent="amber"
                  onClick={onCycleFocusPeakingColor}
                />
              )}
              <ControlIconChip
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                label="Live Histogram"
                selected={settings.isHistogramEnabled}
                accent="cyan"
                onClick={onToggleHistogram}
              />
              <ControlIconChip
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label={settings.isZebraEnabled ? `Zebra ${settings.zebraThresholdPercent}%` : 'Zebra Warning'}
                selected={settings.isZebraEnabled}
                accent="coral"
                onClick={onToggleZebra}
              />
              <ControlIconChip
                icon={settings.isExposureLockEnabled ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                label="AE Lock"
                selected={settings.isExposureLockEnabled}
                accent="amber"
                onClick={onToggleExposureLock}
              />
              <ControlIconChip
                icon={<Grid3X3 className="h-3.5 w-3.5" />}
                label="Grid"
                selected={isGridEnabled}
                accent="cyan"
                onClick={onToggleGrid}
              />
              <ControlIconChip
                icon={<Ruler className="h-3.5 w-3.5" />}
                label={hasLevelSensor ? 'Level' : 'Level (N/A)'}
                selected={isLevelEnabled}
                enabled={hasLevelSensor}
                accent="cyan"
                onClick={onToggleLevel}
              />
              {isFrontCamera && (
                <ControlIconChip
                  icon={<FlipHorizontal2 className="h-3.5 w-3.5" />}
                  label="Mirror"
                  selected={isFrontMirrorEnabled}
                  accent="cyan"
                  onClick={onToggleFrontMirror}
                />
              )}
              <ControlIconChip
                icon={isVolumeShutterEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                label="Space Shutter"
                selected={isVolumeShutterEnabled}
                accent="cyan"
                onClick={onToggleVolumeShutter}
              />
            </div>

            {settings.isZebraEnabled && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono-tech text-[10px] text-[#B4BAC6]">Zebra IRE:</span>
                {[85, 90, 95, 98].map((pct) => (
                  <QuickChip
                    key={pct}
                    label={`${pct}%`}
                    selected={settings.zebraThresholdPercent === pct}
                    accent="coral"
                    onClick={() => onSetZebraThreshold(pct)}
                  />
                ))}
              </div>
            )}

            <div>
              <div className="font-mono-tech mb-1.5 text-[11px] text-[#B4BAC6]">Stabilization</div>
              <div className="flex flex-wrap gap-1.5">
                {(['AUTO', 'OIS', 'EIS', 'OFF'] as StabilizationSelection[]).map((opt) => {
                  const supported =
                    opt === 'AUTO' ||
                    opt === 'OFF' ||
                    (opt === 'OIS' && Boolean(stab?.isOisSupported)) ||
                    (opt === 'EIS' && Boolean(stab?.isEisSupported || stab?.isPreviewStabilizationSupported));
                  return (
                    <QuickChip
                      key={opt}
                      label={supported ? opt : `${opt} (N/A)`}
                      selected={settings.stabilizationSelection === opt}
                      enabled={supported}
                      accent="cyan"
                      onClick={() => supported && onSelectStabilization(opt)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {settings.activeProTab === 'PRESETS' && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-white/8 bg-[#1A1D26] p-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-semibold text-[#F6F7F9]">
                Custom Pro Presets
              </span>
              <button
                type="button"
                onClick={() => setShowSaveDialog(true)}
                data-testid="save_preset_button"
                className="flex cursor-pointer items-center gap-1 rounded-full bg-[#F59E0B] px-2.5 py-1 text-[10px] font-semibold text-[#090A0D]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Preset</span>
              </button>
            </div>
            {customPresets.length === 0 ? (
              <div className="flex items-center gap-2 py-2 text-[12px] text-[#7D8594]">
                <Bookmark className="h-4 w-4 shrink-0" />
                <span>
                  Save your manual ISO, shutter, EV, WB, focus, and monitoring settings as reusable
                  DSLR presets.
                </span>
              </div>
            ) : (
              customPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between rounded-[12px] border border-white/15 bg-[#090A0D] px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <div className="font-display text-[13px] font-semibold text-[#F6F7F9]">
                      {preset.name}
                    </div>
                    <div className="font-mono-tech text-[10px] text-[#67E8F9]">
                      {preset.isManualIsoEnabled && preset.manualIso ? `ISO ${preset.manualIso}` : 'ISO Auto'} ·{' '}
                      {preset.isManualShutterEnabled && preset.manualShutterNs
                        ? formatShutterSpeed(preset.manualShutterNs)
                        : 'SS Auto'}{' '}
                      ·{' '}
                      {preset.whiteBalanceMode === 'MANUAL_KELVIN'
                        ? `${preset.manualKelvin}K`
                        : WHITE_BALANCE_META[preset.whiteBalanceMode].shortTag}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePreset(preset.id)}
                    aria-label={`Delete preset ${preset.name}`}
                    className="cursor-pointer p-1.5 text-[#7D8594] hover:text-[#F87171]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DslrParamTile: React.FC<{
  label: string;
  value: string;
  selected: boolean;
  isManual: boolean;
  isUnavailable: boolean;
  onClick: () => void;
}> = ({ label, value, selected, isManual, isUnavailable, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 cursor-pointer rounded-[10px] border px-2.5 py-1.5 text-center transition ${
      selected
        ? 'border-[#F59E0B] bg-[#F59E0B]/16'
        : isManual
          ? 'border-[#67E8F9]/65 bg-[#1A1D26]'
          : 'border-white/15 bg-[#1A1D26] hover:bg-[#232733]'
    }`}
  >
    <div className={`font-mono-tech text-[9px] ${selected ? 'text-[#F59E0B]' : 'text-[#7D8594]'}`}>
      {label}
    </div>
    <div
      className={`font-mono-tech text-[11px] font-medium ${
        isUnavailable
          ? 'text-[#7D8594]/70'
          : isManual && !selected
            ? 'text-[#67E8F9]'
            : 'text-[#F6F7F9]'
      }`}
    >
      {value}
    </div>
  </button>
);

const DslrSliderDeck: React.FC<{
  title: string;
  valueLabel: string;
  isManualActive: boolean;
  toggleBadgeText: string;
  onToggleAuto: () => void;
  sliderValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  rangeSummary: string;
  children?: React.ReactNode;
}> = ({
  title,
  valueLabel,
  isManualActive,
  toggleBadgeText,
  onToggleAuto,
  sliderValue,
  min,
  max,
  step,
  onChange,
  rangeSummary,
  children,
}) => (
  <div
    className={`rounded-[14px] border bg-[#1A1D26] px-3 py-2.5 ${
      isManualActive ? 'border-[#F59E0B]/55' : 'border-white/8'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="font-display text-[14px] font-semibold text-[#F6F7F9]">{title}</div>
        <div
          className={`font-display text-[13px] font-semibold ${
            isManualActive ? 'text-[#F59E0B]' : 'text-[#67E8F9]'
          }`}
        >
          {valueLabel}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleAuto}
        className={`font-mono-tech cursor-pointer rounded-full border px-2.5 py-1 text-[10px] font-medium ${
          isManualActive
            ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
            : 'border-white/15 bg-[#090A0D] text-[#F6F7F9]'
        }`}
      >
        {toggleBadgeText}
      </button>
    </div>

    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={Math.min(max, Math.max(min, sliderValue))}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="ultra-slider ultra-slider-amber mt-2 w-full bg-[#090A0D]"
    />

    <div className="font-mono-tech mt-1 text-[10px] text-[#7D8594]">{rangeSummary}</div>
    {children}
  </div>
);

const FormatOptionRow: React.FC<{
  title: string;
  subtitle: string;
  selected: boolean;
  supported: boolean;
  unavailableReason?: string;
  onClick: () => void;
}> = ({ title, subtitle, selected, supported, unavailableReason, onClick }) => (
  <button
    type="button"
    disabled={!supported}
    onClick={() => supported && onClick()}
    className={`flex w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left transition ${
      selected
        ? 'border-[#F59E0B] bg-[#F59E0B]/16'
        : supported
          ? 'cursor-pointer border-white/15 bg-[#090A0D] hover:bg-[#12141A]'
          : 'cursor-not-allowed border-white/8 bg-[#090A0D]/45'
    }`}
  >
    <div className="min-w-0 pr-2">
      <div className={`font-display text-[13px] font-semibold ${supported ? 'text-[#F6F7F9]' : 'text-[#7D8594]'}`}>
        {supported ? title : `${title} (Unavailable)`}
      </div>
      <div className={`font-mono-tech text-[10px] ${supported ? 'text-[#B4BAC6]' : 'text-[#7D8594]/75'}`}>
        {supported ? subtitle : unavailableReason}
      </div>
    </div>
    {selected ? (
      <span className="font-mono-tech rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold text-[#090A0D]">
        ACTIVE
      </span>
    ) : !supported ? (
      <Lock className="h-4 w-4 shrink-0 text-[#7D8594]" />
    ) : null}
  </button>
);

const QuickChip: React.FC<{
  label: string;
  selected: boolean;
  accent: 'cyan' | 'amber' | 'coral';
  enabled?: boolean;
  onClick: () => void;
}> = ({ label, selected, accent, enabled = true, onClick }) => {
  const activeColors =
    accent === 'cyan'
      ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
      : accent === 'coral'
        ? 'border-[#F87171] bg-[#F87171] text-[#090A0D]'
        : 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]';
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`font-mono-tech shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
        selected
          ? activeColors
          : enabled
            ? 'cursor-pointer border-white/15 bg-[#090A0D] text-[#F6F7F9] hover:bg-white/10'
            : 'cursor-not-allowed border-white/8 bg-[#090A0D]/45 text-[#7D8594]/60'
      }`}
    >
      {label}
    </button>
  );
};

const ControlIconChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  accent: 'cyan' | 'amber' | 'coral';
  enabled?: boolean;
  onClick: () => void;
}> = ({ icon, label, selected, accent, enabled = true, onClick }) => {
  const activeColors =
    accent === 'cyan'
      ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
      : accent === 'coral'
        ? 'border-[#F87171] bg-[#F87171] text-[#090A0D]'
        : 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]';
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] transition ${
        selected
          ? activeColors
          : enabled
            ? 'cursor-pointer border-white/15 bg-[#090A0D] text-[#F6F7F9] hover:bg-white/10'
            : 'cursor-not-allowed border-white/8 bg-[#090A0D]/45 text-[#7D8594]/60'
      }`}
    >
      {icon}
      <span className="font-mono-tech font-medium">{label}</span>
    </button>
  );
};
