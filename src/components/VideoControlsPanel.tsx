import React from 'react';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  Lock,
  Mic,
  MicOff,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Video,
} from 'lucide-react';
import {
  AppCaptureDomain,
  CameraVideoCapabilities,
  SensorCapabilities,
  StabilizationSelection,
  VIDEO_BITRATE_META,
  VIDEO_FPS_OPTIONS,
  VIDEO_QUALITY_META,
  VideoBitrateOption,
  VideoFpsOption,
  VideoQualityOption,
  VideoRecordingState,
  VideoSettings,
} from '../types/camera';
import { formatDurationMs } from '../utils/cameraUtils';

export const CaptureDomainTogglePill: React.FC<{
  activeDomain: AppCaptureDomain;
  enabled: boolean;
  onSelectDomain: (domain: AppCaptureDomain) => void;
}> = ({ activeDomain, enabled, onSelectDomain }) => (
  <div className="flex items-center gap-1 rounded-full border border-white/15 bg-[#101218]/70 px-1 py-[3px] backdrop-blur-md">
    {(['PHOTO', 'VIDEO'] as AppCaptureDomain[]).map((domain) => {
      const selected = activeDomain === domain;
      return (
        <button
          key={domain}
          type="button"
          disabled={!enabled}
          onClick={() => enabled && onSelectDomain(domain)}
          data-testid={`capture_mode_${domain.toLowerCase()}`}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 transition disabled:cursor-not-allowed ${
            selected && domain === 'VIDEO'
              ? 'bg-[#FF3B30] font-bold text-[#F6F7F9]'
              : selected
                ? 'bg-[#F6F7F9] font-bold text-[#090A0D]'
                : enabled
                  ? 'text-[#F6F7F9] hover:bg-white/10'
                  : 'text-[#7D8594]'
          }`}
        >
          {domain === 'VIDEO' ? <Video className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
          <span className="font-mono-tech text-[11px]">{domain}</span>
        </button>
      );
    })}
  </div>
);

export const VideoRecordButton: React.FC<{
  isRecording: boolean;
  isPaused: boolean;
  isFinalizing: boolean;
  isCountingDown: boolean;
  enabled: boolean;
  onClick: () => void;
}> = ({ isRecording, isPaused, isFinalizing, isCountingDown, enabled, onClick }) => (
  <button
    type="button"
    disabled={!enabled || (isFinalizing && !isCountingDown)}
    onClick={onClick}
    aria-label={isRecording ? 'Stop video recording' : 'Start video recording'}
    data-testid="video_record_button"
    className="relative flex h-[82px] w-[82px] cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed"
  >
    <span
      className={`absolute inset-0 rounded-full border-[3px] transition-colors ${
        isCountingDown || isPaused
          ? 'border-[#F59E0B]'
          : isRecording
            ? 'border-[#FF3B30]'
            : 'border-[#F6F7F9]/92'
      }`}
    />
    {isFinalizing ? (
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#FF3B30] border-t-transparent" />
    ) : isCountingDown ? (
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F59E0B]">
        <span className="font-mono-tech text-[10px] font-bold text-[#090A0D]">STOP</span>
      </span>
    ) : (
      <span
        className={`transition-all duration-200 ${
          isRecording ? 'h-[30px] w-[30px] rounded-[8px]' : 'h-16 w-16 rounded-full'
        } ${enabled ? 'bg-[#FF3B30]' : 'bg-[#7D8594]'}`}
      />
    )}
  </button>
);

export const VideoPauseResumeButton: React.FC<{
  isPaused: boolean;
  enabled: boolean;
  onClick: () => void;
}> = ({ isPaused, enabled, onClick }) => (
  <button
    type="button"
    disabled={!enabled}
    onClick={onClick}
    aria-label={isPaused ? 'Resume video recording' : 'Pause video recording'}
    data-testid="video_pause_resume_button"
    className={`flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full border-[1.5px] transition ${
      isPaused
        ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
        : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
    }`}
  >
    {isPaused ? <Play className="h-6 w-6 fill-current" /> : <Pause className="h-6 w-6" />}
  </button>
);

export const VideoRecordingStatusHud: React.FC<{
  recordingState: VideoRecordingState;
  videoSettings: VideoSettings;
}> = ({ recordingState, videoSettings }) => {
  const durationText = formatDurationMs(recordingState.elapsedDurationMs);
  const mb = (recordingState.recordedBytes / (1024 * 1024)).toFixed(1);

  return (
    <div
      data-testid="video_recording_hud"
      className={`mt-2 flex items-center gap-2 rounded-full border bg-[#090A0D]/82 px-3.5 py-1.5 backdrop-blur-md ${
        recordingState.isPaused ? 'border-[#F59E0B]/70' : 'border-[#FF3B30]/75'
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          recordingState.isPaused ? 'bg-[#F59E0B]' : 'animate-pulse bg-[#FF3B30]'
        }`}
      />
      <span
        className={`font-mono-tech text-[10px] font-bold ${
          recordingState.isPaused ? 'text-[#F59E0B]' : 'text-[#FF3B30]'
        }`}
      >
        {recordingState.isPaused ? 'PAUSED' : 'REC'}
      </span>
      <span className="font-mono-tech text-[15px] font-semibold text-[#F6F7F9]">
        {durationText}
      </span>
      <span className="font-mono-tech text-[10px] text-[#B4BAC6]">· {mb} MB</span>
      {videoSettings.isAudioEnabled && recordingState.hasAudioTrack ? (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className={`w-[3px] rounded-[1px] ${
                recordingState.audioAmplitude >= bar * 0.18 ? 'bg-[#34D399]' : 'bg-white/15'
              }`}
              style={{ height: `${6 + bar * 2}px` }}
            />
          ))}
        </div>
      ) : (
        <span className="font-mono-tech text-[10px] text-[#7D8594]">SILENT</span>
      )}
    </div>
  );
};

export const VideoAudioToggleButton: React.FC<{
  isAudioEnabled: boolean;
  isRecording: boolean;
  onClick: () => void;
}> = ({ isAudioEnabled, isRecording, onClick }) => (
  <button
    type="button"
    disabled={isRecording}
    onClick={onClick}
    data-testid="video_audio_toggle_button"
    className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-2 backdrop-blur-md transition disabled:cursor-not-allowed ${
      isAudioEnabled
        ? 'border-[#34D399]/60 bg-[#101218]/70 text-[#F6F7F9]'
        : 'border-[#F59E0B]/55 bg-[#090A0D]/85 text-[#F59E0B]'
    }`}
  >
    {isAudioEnabled ? (
      <Mic className="h-[18px] w-[18px] text-[#34D399]" />
    ) : (
      <MicOff className="h-[18px] w-[18px] text-[#F59E0B]" />
    )}
    <span className="font-mono-tech text-[10px] font-medium">
      {isAudioEnabled ? 'MIC' : 'SILENT'}
    </span>
  </button>
);

export const VideoTorchButton: React.FC<{
  isTorchEnabled: boolean;
  onClick: () => void;
}> = ({ isTorchEnabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Toggle video torch"
    data-testid="video_torch_button"
    className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition ${
      isTorchEnabled
        ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
        : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
    }`}
  >
    {isTorchEnabled ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
  </button>
);

export const VideoQuickSpecPill: React.FC<{
  settings: VideoSettings;
  capabilities: CameraVideoCapabilities;
  isSettingsOpen: boolean;
  enabled: boolean;
  onClick: () => void;
}> = ({ settings, capabilities, isSettingsOpen, enabled, onClick }) => {
  const hdrTag = settings.isHdrEnabled ? ` · ${capabilities.hdrLabel}` : '';
  const bitrateTag =
    settings.bitrate !== 'AUTO' ? ` · ${VIDEO_BITRATE_META[settings.bitrate].label}` : '';
  const specText = `${VIDEO_QUALITY_META[settings.quality].shortLabel} · ${settings.fps}fps${hdrTag}${bitrateTag}`;

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      data-testid="video_spec_pill"
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-md transition disabled:cursor-not-allowed ${
        isSettingsOpen
          ? 'border-[#F59E0B] bg-[#F59E0B] text-[#090A0D]'
          : 'border-white/15 bg-[#101218]/70 text-[#F6F7F9] hover:bg-[#1A1D26]'
      }`}
    >
      <SlidersHorizontal
        className={`h-4 w-4 ${isSettingsOpen ? 'text-[#090A0D]' : 'text-[#67E8F9]'}`}
      />
      <span className="font-mono-tech text-[10px] font-semibold">{specText}</span>
    </button>
  );
};

export const VideoSettingsDeck: React.FC<{
  settings: VideoSettings;
  capabilities: CameraVideoCapabilities;
  sensorCapabilities: SensorCapabilities;
  onSelectQuality: (q: VideoQualityOption) => void;
  onSelectFps: (fps: VideoFpsOption) => void;
  onSelectBitrate: (br: VideoBitrateOption) => void;
  onToggleHdr: () => void;
  onSelectStabilization: (stab: StabilizationSelection) => void;
  onToggleAudio: () => void;
  onToggleSlowMoBaked: () => void;
  onExposureCompChange: (index: number) => void;
}> = ({
  settings,
  capabilities,
  sensorCapabilities,
  onSelectQuality,
  onSelectFps,
  onSelectBitrate,
  onToggleHdr,
  onSelectStabilization,
  onToggleAudio,
  onToggleSlowMoBaked,
  onExposureCompChange,
}) => {
  const maxMbps = Math.round(capabilities.maxEncoderBitrateBps / 1_000_000);
  const evRange = sensorCapabilities.exposureRange;
  const evValue = sensorCapabilities.currentExposureIndex * sensorCapabilities.exposureStep;
  const isHighSpeed = settings.fps >= 120;

  return (
    <div
      data-testid="video_settings_deck"
      className="mb-2.5 max-h-[300px] w-full overflow-y-auto rounded-[20px] border border-white/15 bg-[#12141A]/94 p-3.5 backdrop-blur-md"
    >
      <div className="flex flex-col gap-2.5">
        <VideoSectionHeader
          title="Video Resolution"
          detail={capabilities.qualities[settings.quality]?.reason ?? ''}
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {(Object.keys(VIDEO_QUALITY_META) as VideoQualityOption[]).map((q) => {
            const avail = capabilities.qualities[q];
            return (
              <VideoChip
                key={q}
                label={VIDEO_QUALITY_META[q].shortLabel}
                selected={settings.quality === q}
                supported={avail?.isSupported ?? false}
                onClick={() => onSelectQuality(q)}
              />
            );
          })}
        </div>

        <VideoSectionHeader
          title="Frame Rate (FPS)"
          detail={capabilities.fpsOptions[settings.fps]?.reason ?? ''}
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {VIDEO_FPS_OPTIONS.map((opt) => {
            const avail = capabilities.fpsOptions[opt.fps];
            return (
              <VideoChip
                key={opt.fps}
                label={`${opt.label}fps`}
                selected={settings.fps === opt.fps}
                supported={avail?.isSupported ?? false}
                onClick={() => onSelectFps(opt.fps)}
              />
            );
          })}
        </div>

        {isHighSpeed && (
          <button
            type="button"
            onClick={onToggleSlowMoBaked}
            className="flex w-full cursor-pointer items-center justify-between rounded-[12px] border border-white/15 bg-[#101218] px-3 py-2 text-left"
          >
            <span className="font-mono-tech text-[10px] text-[#F6F7F9]">
              {settings.isSlowMotionBakedIn
                ? 'Slow-Mo Playback (30fps output)'
                : `Native High-Frame-Rate (${settings.fps}fps file)`}
            </span>
            <span className="font-mono-tech text-[10px] font-bold text-[#F59E0B]">
              {settings.isSlowMotionBakedIn ? 'SLOW-MO' : 'HFR'}
            </span>
          </button>
        )}

        <VideoSectionHeader
          title="Target Bitrate"
          detail={
            settings.bitrate === 'AUTO'
              ? `Encoder Auto (max ${maxMbps}Mbps)`
              : `${VIDEO_BITRATE_META[settings.bitrate].label}bps target encoding`
          }
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {(Object.keys(VIDEO_BITRATE_META) as VideoBitrateOption[]).map((br) => {
            const bps = VIDEO_BITRATE_META[br].bitrateBps;
            const supported = bps === null || bps <= capabilities.maxEncoderBitrateBps;
            return (
              <VideoChip
                key={br}
                label={VIDEO_BITRATE_META[br].label}
                selected={settings.bitrate === br}
                supported={supported}
                onClick={() => onSelectBitrate(br)}
              />
            );
          })}
        </div>

        <VideoSectionHeader title="Stabilization, HDR & Audio" detail={capabilities.hdrReason} />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {(['AUTO', 'OIS', 'EIS', 'OFF'] as StabilizationSelection[]).map((stab) => {
            const supported =
              stab === 'AUTO' ||
              stab === 'OFF' ||
              (stab === 'OIS' && capabilities.isOisSupported) ||
              (stab === 'EIS' && capabilities.isEisSupported);
            return (
              <VideoChip
                key={stab}
                label={`STAB ${stab}`}
                selected={settings.stabilization === stab}
                supported={supported}
                onClick={() => supported && onSelectStabilization(stab)}
              />
            );
          })}
          <VideoChip
            label={capabilities.hdrSupported ? `HDR ${capabilities.hdrLabel}` : 'HDR'}
            selected={settings.isHdrEnabled}
            supported={capabilities.hdrSupported && !isHighSpeed}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={onToggleHdr}
          />
          <VideoChip
            label={settings.isAudioEnabled ? 'Audio ON' : 'Silent Video'}
            selected={!settings.isAudioEnabled}
            supported={true}
            icon={settings.isAudioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            onClick={onToggleAudio}
          />
        </div>

        {evRange[0] < evRange[1] && (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[11px] text-[#B4BAC6]">Exposure (EV)</span>
              <span
                className={`font-mono-tech text-[11px] font-medium ${
                  sensorCapabilities.currentExposureIndex === 0
                    ? 'text-[#F6F7F9]'
                    : 'text-[#F59E0B]'
                }`}
              >
                {evValue >= 0 ? `+${evValue.toFixed(1)}` : evValue.toFixed(1)} EV
              </span>
            </div>
            <input
              type="range"
              min={evRange[0]}
              max={evRange[1]}
              step={1}
              value={sensorCapabilities.currentExposureIndex}
              onChange={(e) => onExposureCompChange(parseInt(e.target.value, 10))}
              className="ultra-slider ultra-slider-amber mt-1.5 w-full bg-white/15"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const VideoSectionHeader: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="font-mono-tech shrink-0 text-[11px] font-medium text-[#F6F7F9]">{title}</span>
    <span className="font-mono-tech truncate text-[10px] text-[#B4BAC6]">{detail}</span>
  </div>
);

const VideoChip: React.FC<{
  label: string;
  selected: boolean;
  supported: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}> = ({ label, selected, supported, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 transition ${
      selected
        ? 'border-[#F59E0B] bg-[#F59E0B] font-bold text-[#090A0D]'
        : supported
          ? 'border-white/15 bg-[#101218] text-[#F6F7F9] hover:bg-[#1A1D26]'
          : 'border-white/10 bg-[#090A0D]/60 text-[#7D8594]'
    }`}
  >
    {!supported ? <Lock className="h-3 w-3 text-[#7D8594]" /> : icon}
    <span className="font-mono-tech text-[10px]">{label}</span>
  </button>
);
