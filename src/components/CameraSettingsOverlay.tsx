import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Cpu,
  FolderOutput,
  Info,
  RotateCcw,
  Shield,
  Sliders,
  Video,
} from 'lucide-react';
import {
  AudioRecordingPreference,
  CameraHardwareProfile,
  CameraUserPreferences,
  DefaultCameraModePreference,
  DefaultLensPreference,
  FlashSetting,
  GridOverlayStyle,
  HdrPlusMode,
  HudAccentTheme,
  SaveImageQuality,
  SaveLocationPreference,
  SHUTTER_TIMER_META,
  ShutterTimer,
  VIDEO_FPS_OPTIONS,
  VIDEO_QUALITY_META,
  VideoFpsOption,
  VideoQualityOption,
  VolumeShutterAction,
} from '../types/camera';
import { formatFileSize } from '../utils/cameraUtils';

type SettingsSectionId = 'CAPTURE' | 'VIDEO' | 'INTERFACE' | 'STORAGE' | 'PRIVACY' | 'ABOUT';

interface CameraSettingsOverlayProps {
  preferences: CameraUserPreferences;
  activeProfile: CameraHardwareProfile | null;
  storedMediaCount: number;
  storedMediaTotalBytes: number;
  onUpdatePreferences: (updater: (prev: CameraUserPreferences) => CameraUserPreferences) => void;
  onResetAllSettings: () => void;
  onOpenHardwareInspector: () => void;
  onClearGalleryCache: () => void;
  onClose: () => void;
}

const SECTIONS: { id: SettingsSectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'CAPTURE', label: 'Photo & Capture', icon: <Camera className="h-4 w-4" /> },
  { id: 'VIDEO', label: 'Video & Audio', icon: <Video className="h-4 w-4" /> },
  { id: 'INTERFACE', label: 'Interface & HUD', icon: <Sliders className="h-4 w-4" /> },
  { id: 'STORAGE', label: 'Save & Storage', icon: <FolderOutput className="h-4 w-4" /> },
  { id: 'PRIVACY', label: 'Privacy', icon: <Shield className="h-4 w-4" /> },
  { id: 'ABOUT', label: 'App Info & Reset', icon: <Info className="h-4 w-4" /> },
];

export const CameraSettingsOverlay: React.FC<CameraSettingsOverlayProps> = ({
  preferences,
  activeProfile,
  storedMediaCount,
  storedMediaTotalBytes,
  onUpdatePreferences,
  onResetAllSettings,
  onOpenHardwareInspector,
  onClearGalleryCache,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('CAPTURE');
  const [confirmAction, setConfirmAction] = useState<'RESET_SETTINGS' | 'CLEAR_GALLERY' | null>(
    null
  );

  const storageSummary = useMemo(
    () => `${storedMediaCount} items · ${formatFileSize(storedMediaTotalBytes)}`,
    [storedMediaCount, storedMediaTotalBytes]
  );

  const setPref = <K extends keyof CameraUserPreferences>(
    key: K,
    value: CameraUserPreferences[K]
  ) => {
    onUpdatePreferences((prev) => ({ ...prev, [key]: value }));
  };

  const setUi = <K extends keyof CameraUserPreferences['uiCustomization']>(
    key: K,
    value: CameraUserPreferences['uiCustomization'][K]
  ) => {
    onUpdatePreferences((prev) => ({
      ...prev,
      uiCustomization: { ...prev.uiCustomization, [key]: value },
    }));
  };

  const setGcam = <K extends keyof CameraUserPreferences['gcamEngine']>(
    key: K,
    value: CameraUserPreferences['gcamEngine'][K]
  ) => {
    onUpdatePreferences((prev) => ({
      ...prev,
      gcamEngine: { ...prev.gcamEngine, [key]: value },
    }));
  };

  const setPrivacy = <K extends keyof CameraUserPreferences['privacy']>(
    key: K,
    value: CameraUserPreferences['privacy'][K]
  ) => {
    onUpdatePreferences((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
  };

  return (
    <div
      data-testid="camera_settings_overlay"
      className="fixed inset-0 z-50 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Top Header */}
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#090A0D] px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="close_settings_button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#12141A] text-[#F6F7F9] transition hover:bg-[#1A1D26]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-[18px] font-semibold text-[#F6F7F9]">
              Camera Settings
            </h1>
            <p className="text-[12px] text-[#7D8594]">
              Preferences are saved automatically on this device
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmAction('RESET_SETTINGS')}
          data-testid="settings_header_reset_button"
          className="flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#12141A] px-3.5 py-2 text-[12px] font-medium whitespace-nowrap text-[#B4BAC6] transition hover:border-[#F87171]/50 hover:text-[#F87171]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Defaults</span>
        </button>
      </header>

      {/* Main Responsive Settings Layout */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Category Navigation Rail */}
        <nav
          aria-label="Settings categories"
          className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 bg-[#0D0F14] p-3 lg:w-[250px] lg:flex-col lg:border-r lg:border-b-0 lg:p-4"
        >
          {SECTIONS.map((sec) => {
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                data-testid={`settings_nav_${sec.id.toLowerCase()}`}
                className={`flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-[#F6F7F9] text-[#090A0D]'
                    : 'text-[#B4BAC6] hover:bg-white/5 hover:text-[#F6F7F9]'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Settings Scroll Pane */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-10">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {activeSection === 'CAPTURE' && (
              <>
                <SettingsGroup title="Image Quality & Format">
                  <SegmentedChoiceRow
                    title="Save Image Quality"
                    description="JPEG compression or lossless PNG applied to captured photos"
                    value={preferences.saveImageQuality}
                    options={[
                      { value: 'MAXIMUM' as SaveImageQuality, label: 'Max (98%)' },
                      { value: 'HIGH' as SaveImageQuality, label: 'High (92%)' },
                      { value: 'STANDARD' as SaveImageQuality, label: 'Std (85%)' },
                      { value: 'PNG_LOSSLESS' as SaveImageQuality, label: 'PNG Lossless' },
                    ]}
                    onChange={(v) => setPref('saveImageQuality', v)}
                  />
                </SettingsGroup>

                <SettingsGroup title="GCam Pro Max Computational Engine">
                  <SegmentedChoiceRow
                    title="HDR+ Pipeline Mode"
                    description="ZSL ring buffer instant merge or Sabre HDR+ Enhanced multi-frame dynamic range"
                    value={preferences.gcamEngine.hdrPlusMode}
                    options={[
                      { value: 'OFF' as HdrPlusMode, label: 'Off' },
                      { value: 'HDR_PLUS_ZSL' as HdrPlusMode, label: 'HDR+ ZSL' },
                      { value: 'HDR_PLUS_ENHANCED' as HdrPlusMode, label: 'HDR+ Enhanced' },
                    ]}
                    onChange={(v) => setGcam('hdrPlusMode', v)}
                  />
                  <ToggleRow
                    title="Top Shot Frame Selection"
                    description="Analyze burst candidates for lowest motion blur, open eyes, and optimal focus lock"
                    checked={preferences.gcamEngine.topShotSelection}
                    onChange={(v) => setGcam('topShotSelection', v)}
                  />
                  <ToggleRow
                    title="Sabre Multi-Frame Super-Res"
                    description="Aligned frame merging & halo-clamped micro-contrast preserving natural pores and hair"
                    checked={preferences.gcamEngine.sabreSuperRes}
                    onChange={(v) => setGcam('sabreSuperRes', v)}
                  />
                  <ToggleRow
                    title="Pixel AWB Color Science"
                    description="Balanced auto white balance preserving accurate skin undertones and natural foliage"
                    checked={preferences.gcamEngine.pixelAwbEnabled}
                    onChange={(v) => setGcam('pixelAwbEnabled', v)}
                  />
                  <ToggleRow
                    title="Chroma-Only Noise Reduction"
                    description="Suppresses color noise while leaving luminance detail untouched (zero plastic smoothing)"
                    checked={preferences.gcamEngine.chromaDenoiseEnabled}
                    onChange={(v) => setGcam('chromaDenoiseEnabled', v)}
                  />
                  <ToggleRow
                    title="f/1.7 Portrait Optical Depth"
                    description="Progressive subject-separated aperture bokeh in Portrait mode"
                    checked={preferences.gcamEngine.f17PortraitDepth}
                    onChange={(v) => setGcam('f17PortraitDepth', v)}
                  />
                </SettingsGroup>

                <SettingsGroup title="Default Lens & Mode">
                  <SegmentedChoiceRow
                    title="Default Camera Lens"
                    description="Lens selected when Ultra Cam Pro launches"
                    value={preferences.defaultCameraLens}
                    options={[
                      { value: 'BACK' as DefaultLensPreference, label: 'Rear Main' },
                      { value: 'FRONT' as DefaultLensPreference, label: 'Front Selfie' },
                      { value: 'LAST_USED' as DefaultLensPreference, label: 'Last Used' },
                    ]}
                    onChange={(v) => setPref('defaultCameraLens', v)}
                  />
                  <SegmentedChoiceRow
                    title="Default Camera Mode"
                    description="Initial mode when opening the camera"
                    value={preferences.defaultCameraMode}
                    options={[
                      { value: 'STANDARD' as DefaultCameraModePreference, label: 'Photo' },
                      { value: 'HDR' as DefaultCameraModePreference, label: 'HDR' },
                      { value: 'NIGHT' as DefaultCameraModePreference, label: 'Night' },
                      { value: 'PORTRAIT' as DefaultCameraModePreference, label: 'Portrait' },
                      { value: 'VIDEO' as DefaultCameraModePreference, label: 'Video' },
                      { value: 'PRO_MANUAL' as DefaultCameraModePreference, label: 'Pro' },
                      { value: 'LAST_USED' as DefaultCameraModePreference, label: 'Last Used' },
                    ]}
                    onChange={(v) => setPref('defaultCameraMode', v)}
                  />
                </SettingsGroup>

                <SettingsGroup title="Flash, Timer & Front Camera">
                  <SegmentedChoiceRow
                    title="Default Flash Setting"
                    description="Initial flash mode for rear camera shots"
                    value={preferences.defaultFlash}
                    options={[
                      { value: 'OFF' as FlashSetting, label: 'Off' },
                      { value: 'AUTO' as FlashSetting, label: 'Auto' },
                      { value: 'ON' as FlashSetting, label: 'On' },
                    ]}
                    onChange={(v) => setPref('defaultFlash', v)}
                  />
                  <ToggleRow
                    title="Front Screen Fill Flash"
                    description="Illuminate display bright white when front camera flash is active"
                    checked={preferences.frontScreenFlash}
                    onChange={(v) => setPref('frontScreenFlash', v)}
                  />
                  <SegmentedChoiceRow
                    title="Default Timer Setting"
                    description="Countdown delay before shutter capture"
                    value={preferences.defaultTimer}
                    options={(['OFF', 'SEC_3', 'SEC_5', 'SEC_10'] as ShutterTimer[]).map((t) => ({
                      value: t,
                      label: SHUTTER_TIMER_META[t].label,
                    }))}
                    onChange={(v) => setPref('defaultTimer', v)}
                  />
                  <ToggleRow
                    title="Countdown Audio Beep"
                    description="Play subtle audio tone on each timer countdown tick"
                    checked={preferences.timerAudioBeep}
                    onChange={(v) => setPref('timerAudioBeep', v)}
                  />
                  <ToggleRow
                    title="Mirror Selfie"
                    description="Flip front camera preview and saved selfie images horizontally"
                    checked={preferences.mirrorSelfie}
                    onChange={(v) => setPref('mirrorSelfie', v)}
                  />
                </SettingsGroup>

                <SettingsGroup title="Hardware Key & Shutter">
                  <SegmentedChoiceRow
                    title="Volume / Spacebar Shutter"
                    description="Action triggered by hardware volume keys or Spacebar"
                    value={preferences.volumeShutterAction}
                    options={[
                      { value: 'CAPTURE' as VolumeShutterAction, label: 'Shutter Capture' },
                      { value: 'ZOOM' as VolumeShutterAction, label: 'Zoom +/-' },
                      { value: 'OFF' as VolumeShutterAction, label: 'Disabled' },
                    ]}
                    onChange={(v) => setPref('volumeShutterAction', v)}
                  />
                </SettingsGroup>
              </>
            )}

            {activeSection === 'VIDEO' && (
              <>
                <SettingsGroup title="Video Capture Defaults">
                  <SegmentedChoiceRow
                    title="Video Resolution"
                    description="Default resolution target for Cinema Video mode"
                    value={preferences.defaultVideoQuality}
                    options={(Object.keys(VIDEO_QUALITY_META) as VideoQualityOption[]).map((q) => ({
                      value: q,
                      label: VIDEO_QUALITY_META[q].shortLabel,
                    }))}
                    onChange={(v) => setPref('defaultVideoQuality', v)}
                  />
                  <SegmentedChoiceRow
                    title="Video FPS"
                    description="Default frame rate for video recording"
                    value={String(preferences.defaultVideoFps)}
                    options={VIDEO_FPS_OPTIONS.filter((o) => o.fps <= 120).map((o) => ({
                      value: String(o.fps),
                      label: `${o.label} fps`,
                    }))}
                    onChange={(v) => setPref('defaultVideoFps', parseInt(v, 10) as VideoFpsOption)}
                  />
                </SettingsGroup>

                <SettingsGroup title="Audio Recording Preference">
                  <SegmentedChoiceRow
                    title="Audio Input Mode"
                    description="Choose microphone quality or record silent video tracks"
                    value={preferences.audioRecordingPref}
                    options={[
                      { value: 'MICROPHONE' as AudioRecordingPreference, label: 'Standard Mic' },
                      {
                        value: 'HIGH_QUALITY_STEREO' as AudioRecordingPreference,
                        label: 'Studio Unprocessed',
                      },
                      { value: 'MUTE' as AudioRecordingPreference, label: 'Silent (Mute)' },
                    ]}
                    onChange={(v) => setPref('audioRecordingPref', v)}
                  />
                </SettingsGroup>
              </>
            )}

            {activeSection === 'INTERFACE' && (
              <>
                <SettingsGroup title="Grid Settings">
                  <SegmentedChoiceRow
                    title="Grid Overlay Style"
                    description="Composition guide rendered on the live viewfinder"
                    value={preferences.gridStyle}
                    options={[
                      { value: 'OFF' as GridOverlayStyle, label: 'Off' },
                      { value: 'THIRDS' as GridOverlayStyle, label: 'Rule of Thirds' },
                      { value: 'GOLDEN_RATIO' as GridOverlayStyle, label: 'Golden Ratio' },
                      { value: 'DIAGONAL' as GridOverlayStyle, label: 'Diagonal' },
                      { value: 'SQUARE' as GridOverlayStyle, label: 'Square 4×4' },
                    ]}
                    onChange={(v) => setPref('gridStyle', v)}
                  />
                  <div className="flex flex-col gap-2 py-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-medium text-[#F6F7F9]">Grid Line Opacity</span>
                      <span className="font-mono-tech tabular-nums text-[#67E8F9]">
                        {preferences.gridOpacityPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={80}
                      step={5}
                      value={preferences.gridOpacityPercent}
                      onChange={(e) => setPref('gridOpacityPercent', parseInt(e.target.value, 10))}
                      className="ultra-slider h-5 w-full bg-[#1A1D26]"
                    />
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Customize Camera HUD Controls">
                  <ToggleRow
                    title="Clean Minimal Viewfinder"
                    description="Hide secondary overlays and keep only essential shutter, lens, and mode navigation"
                    checked={preferences.uiCustomization.cleanViewfinderMode}
                    onChange={(v) => setUi('cleanViewfinderMode', v)}
                  />
                  <ToggleRow
                    title="Show Live Exposure Metering Bar"
                    description="Display live ISO, shutter speed, aperture, EV, and WB strip on viewfinder"
                    checked={preferences.uiCustomization.showExposureMeterBar}
                    onChange={(v) => setUi('showExposureMeterBar', v)}
                  />
                  <ToggleRow
                    title="Show Smooth Zoom Slider"
                    description="Display continuous zoom slider bar above the lens selector"
                    checked={preferences.uiCustomization.showZoomSlider}
                    onChange={(v) => setUi('showZoomSlider', v)}
                  />
                  <ToggleRow
                    title="Show Aspect Ratio Selector"
                    description="Show 4:3 / 16:9 / 1:1 / FULL toggle in the top camera bar"
                    checked={preferences.uiCustomization.showAspectRatioBar}
                    onChange={(v) => setUi('showAspectRatioBar', v)}
                  />
                  <ToggleRow
                    title="Show Burst & Quick Capture Controls"
                    description="Display Burst Mode, Max/Quick Quality, and Pro DSLR buttons above the shutter"
                    checked={preferences.uiCustomization.showCaptureFeatureStrip}
                    onChange={(v) => setUi('showCaptureFeatureStrip', v)}
                  />
                  <ToggleRow
                    title="Show Sensor Telemetry Pill"
                    description="Display active lens facing and resolution readout in top-left corner"
                    checked={preferences.uiCustomization.showTelemetryPill}
                    onChange={(v) => setUi('showTelemetryPill', v)}
                  />
                  <SegmentedChoiceRow
                    title="Landscape Shutter Rail Position"
                    description="Choose left-handed or right-handed control placement in wide view"
                    value={preferences.uiCustomization.landscapeControlSide}
                    options={[
                      { value: 'RIGHT' as const, label: 'Right Rail' },
                      { value: 'LEFT' as const, label: 'Left Rail' },
                    ]}
                    onChange={(v) => setUi('landscapeControlSide', v)}
                  />
                  <SegmentedChoiceRow
                    title="HUD Accent Highlight"
                    description="Customize active indicator color across sliders and telemetry"
                    value={preferences.uiCustomization.hudAccentTheme}
                    options={[
                      { value: 'CYAN' as HudAccentTheme, label: 'Optical Cyan' },
                      { value: 'AMBER' as HudAccentTheme, label: 'Pro Amber' },
                      { value: 'TITANIUM' as HudAccentTheme, label: 'Titanium' },
                    ]}
                    onChange={(v) => setUi('hudAccentTheme', v)}
                  />
                </SettingsGroup>
              </>
            )}

            {activeSection === 'STORAGE' && (
              <>
                <SettingsGroup title="Save Location & File Naming">
                  <SegmentedChoiceRow
                    title="Save Location"
                    description="Where captured photos and recorded videos are saved"
                    value={preferences.saveLocation}
                    options={[
                      {
                        value: 'IN_APP_GALLERY' as SaveLocationPreference,
                        label: 'Ultra Cam Gallery',
                      },
                      {
                        value: 'GALLERY_AND_DOWNLOAD' as SaveLocationPreference,
                        label: 'Gallery + Auto-Download',
                      },
                    ]}
                    onChange={(v) => setPref('saveLocation', v)}
                  />

                  <div className="flex flex-col gap-2 py-2">
                    <label
                      htmlFor="file-prefix-input"
                      className="text-[13px] font-medium text-[#F6F7F9]"
                    >
                      Captured File Name Prefix
                    </label>
                    <input
                      id="file-prefix-input"
                      type="text"
                      maxLength={24}
                      value={preferences.fileNamePrefix}
                      onChange={(e) =>
                        setPref('fileNamePrefix', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                      }
                      placeholder="UltraCam"
                      className="w-full rounded-xl border border-white/15 bg-[#090A0D] px-3.5 py-2.5 text-[13px] text-[#F6F7F9] focus:border-[#67E8F9] focus:outline-none"
                    />
                    <span className="font-mono-tech text-[11px] text-[#7D8594]">
                      Preview: {preferences.fileNamePrefix || 'UltraCam'}_
                      {Date.now().toString().slice(-6)}.
                      {preferences.saveImageQuality === 'PNG_LOSSLESS' ? 'png' : 'jpg'}
                    </span>
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Gallery Storage Usage">
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div>
                      <div className="text-[13px] font-medium text-[#F6F7F9]">
                        IndexedDB Local Media Vault
                      </div>
                      <div className="font-mono-tech tabular-nums mt-0.5 text-[12px] text-[#7D8594]">
                        {storageSummary}
                      </div>
                    </div>
                    {storedMediaCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction('CLEAR_GALLERY')}
                        className="min-h-[40px] cursor-pointer rounded-xl border border-[#F87171]/40 bg-[#F87171]/10 px-3.5 py-2 text-[12px] font-medium text-[#F87171] hover:bg-[#F87171]/20"
                      >
                        Clear Stored Media
                      </button>
                    )}
                  </div>
                </SettingsGroup>
              </>
            )}

            {activeSection === 'PRIVACY' && (
              <SettingsGroup title="Privacy & Permissions">
                <ToggleRow
                  title="Strip Telemetry & Device Info on Save"
                  description="Omit camera model, exposure telemetry, and mode metadata when saving captures"
                  checked={preferences.privacy.stripMetadataOnSave}
                  onChange={(v) => setPrivacy('stripMetadataOnSave', v)}
                />
                <ToggleRow
                  title="Private Session Mode"
                  description="Keep captured photos and videos strictly in volatile memory — never write to browser storage"
                  checked={preferences.privacy.privateSessionMode}
                  onChange={(v) => setPrivacy('privateSessionMode', v)}
                />
                <ToggleRow
                  title="Scoped Photo Picker Only"
                  description="Use on-demand system file picker instead of requesting persistent directory read access"
                  checked={preferences.privacy.scopedPickerOnly}
                  onChange={(v) => setPrivacy('scopedPickerOnly', v)}
                />
              </SettingsGroup>
            )}

            {activeSection === 'ABOUT' && (
              <>
                <SettingsGroup title="App Information">
                  <dl className="flex flex-col gap-3 text-[13px]">
                    <AboutRow label="Application" value="Ultra Cam Pro" />
                    <AboutRow label="Version" value="2.4.0 (Optical Studio Edition)" />
                    <AboutRow
                      label="Imaging Pipeline"
                      value="WebRTC MediaStream · Canvas 2D · MediaRecorder"
                    />
                    <AboutRow
                      label="Active Sensor"
                      value={activeProfile?.label ?? 'Virtual Optical Sensor'}
                    />
                    <AboutRow label="Local Vault" value={storageSummary} />
                  </dl>
                  <div className="border-t border-white/8 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenHardwareInspector();
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#1A1D26] px-4 py-2 text-[13px] font-medium text-[#67E8F9] hover:bg-[#242834]"
                    >
                      <Cpu className="h-4 w-4" />
                      <span>Open Hardware Capabilities Inspector</span>
                    </button>
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Reset Camera Settings">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[14px] font-medium text-[#F6F7F9]">
                        Restore Factory Camera Settings
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#7D8594]">
                        Resets lens, mode, grid, flash, timer, video defaults, and HUD
                        customizations. Your Gallery photos and videos remain safe.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('RESET_SETTINGS')}
                      data-testid="reset_camera_settings_button"
                      className="min-h-[44px] shrink-0 cursor-pointer rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D] hover:opacity-90"
                    >
                      Reset Settings
                    </button>
                  </div>
                </SettingsGroup>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12141A] p-5">
            <h3 className="font-display text-[17px] font-semibold text-[#F6F7F9]">
              {confirmAction === 'RESET_SETTINGS'
                ? 'Reset all camera settings?'
                : 'Clear all saved gallery media?'}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B4BAC6]">
              {confirmAction === 'RESET_SETTINGS'
                ? 'All capture defaults, video preferences, privacy toggles, and HUD customizations will return to defaults. Your saved photos and videos will not be deleted.'
                : 'This permanently deletes all photos, edited copies, and recorded videos stored in the Ultra Cam Pro browser vault.'}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="min-h-[44px] cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-[#F6F7F9] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === 'RESET_SETTINGS') onResetAllSettings();
                  else onClearGalleryCache();
                  setConfirmAction(null);
                }}
                className="min-h-[44px] cursor-pointer rounded-xl bg-[#F87171] px-4 py-2 text-[13px] font-semibold text-[#090A0D]"
              >
                {confirmAction === 'RESET_SETTINGS' ? 'Reset' : 'Clear Media'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12141A] p-4 lg:p-5">
    <h2 className="font-display border-b border-white/8 pb-2.5 text-[15px] font-semibold text-[#F6F7F9]">
      {title}
    </h2>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

const SegmentedChoiceRow = <T extends string>({
  title,
  description,
  value,
  options,
  onChange,
}: {
  title: string;
  description: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) => (
  <div className="flex flex-col gap-2">
    <div>
      <div className="text-[13px] font-medium text-[#F6F7F9]">{title}</div>
      <div className="text-[12px] text-[#7D8594]">{description}</div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-h-[38px] cursor-pointer rounded-xl border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition ${
              selected
                ? 'border-[#67E8F9] bg-[#67E8F9] text-[#090A0D]'
                : 'border-white/12 bg-[#1A1D26] text-[#F6F7F9] hover:bg-[#242834]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl py-1 text-left transition hover:bg-white/[0.02]"
  >
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-medium text-[#F6F7F9]">{title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-[#7D8594]">{description}</div>
    </div>
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-[#67E8F9] bg-[#67E8F9]' : 'border-white/20 bg-[#1A1D26]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
          checked ? 'translate-x-6 bg-[#090A0D]' : 'translate-x-1 bg-[#B4BAC6]'
        }`}
      />
    </span>
  </button>
);

const AboutRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="shrink-0 text-[#7D8594]">{label}</dt>
    <dd className="font-mono-tech tabular-nums text-right text-[#F6F7F9]">{value}</dd>
  </div>
);
