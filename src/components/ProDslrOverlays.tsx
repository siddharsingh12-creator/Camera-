import React from 'react';
import {
  CameraHardwareProfile,
  FocusPeakingColor,
  FrameAnalysisData,
  LiveExposureTelemetry,
  ManualProSettings,
  ProControlTab,
  SensorCapabilities,
  CAPTURE_FORMAT_META,
  WHITE_BALANCE_META,
} from '../types/camera';
import { formatShutterSpeed } from '../utils/cameraUtils';

export const ProExposureInfoBar: React.FC<{
  profile: CameraHardwareProfile | null;
  sensorCapabilities: SensorCapabilities;
  manualSettings: ManualProSettings;
  liveTelemetry: LiveExposureTelemetry;
  onSelectProTab: (tab: ProControlTab) => void;
}> = ({ profile, sensorCapabilities, manualSettings, liveTelemetry, onSelectProTab }) => {
  const isManualAe = manualSettings.isManualIsoEnabled || manualSettings.isManualShutterEnabled;

  const isoValue =
    manualSettings.isManualIsoEnabled && manualSettings.manualIso !== null
      ? `ISO ${manualSettings.manualIso}`
      : liveTelemetry.iso !== null
        ? `ISO ${liveTelemetry.iso}`
        : 'ISO AUTO';

  const shutterNs =
    manualSettings.isManualShutterEnabled && manualSettings.manualShutterNs !== null
      ? manualSettings.manualShutterNs
      : liveTelemetry.shutterNs;
  const shutterValue = shutterNs ? formatShutterSpeed(shutterNs) : 'SS AUTO';

  const apertureVal = liveTelemetry.aperture ?? profile?.apertures[0];
  const apertureText = apertureVal ? `f/${apertureVal.toFixed(1)}` : null;

  const evStep = sensorCapabilities.exposureStep > 0 ? sensorCapabilities.exposureStep : 1 / 3;
  const evText = isManualAe
    ? 'EV M'
    : sensorCapabilities.exposureRange[0] >= sensorCapabilities.exposureRange[1]
      ? 'EV —'
      : sensorCapabilities.currentExposureIndex === 0
        ? '0.0 EV'
        : `${(sensorCapabilities.currentExposureIndex * evStep) >= 0 ? '+' : ''}${(sensorCapabilities.currentExposureIndex * evStep).toFixed(1)} EV`;

  const wbText =
    manualSettings.whiteBalanceMode === 'MANUAL_KELVIN'
      ? `${manualSettings.manualKelvin}K`
      : WHITE_BALANCE_META[manualSettings.whiteBalanceMode].shortTag;

  const formatDiopters = (d: number, prefix: string) => {
    if (d <= 0.05) return `${prefix} ∞`;
    const cm = 100 / d;
    return cm >= 100 ? `${prefix} ${(cm / 100).toFixed(1)}m` : `${prefix} ${cm.toFixed(0)}cm`;
  };

  const focusText = manualSettings.isManualFocusEnabled
    ? formatDiopters(manualSettings.manualFocusDiopters, 'MF')
    : liveTelemetry.focusDistanceDiopters && liveTelemetry.focusDistanceDiopters > 0.05
      ? formatDiopters(liveTelemetry.focusDistanceDiopters, 'AF')
      : 'AF';

  return (
    <div
      data-testid="pro_exposure_info_bar"
      className="no-scrollbar mt-2 flex w-full items-center gap-2 overflow-x-auto rounded-[14px] border border-white/15 bg-[#090A0D]/78 px-2.5 py-1.5 backdrop-blur-md"
    >
      <MeterCell
        text={isoValue}
        color={
          manualSettings.isManualIsoEnabled
            ? 'text-[#F59E0B]'
            : liveTelemetry.iso !== null
              ? 'text-[#F6F7F9]'
              : 'text-[#B4BAC6]'
        }
        onClick={() => onSelectProTab('ISO')}
      />
      <MeterDivider />
      <MeterCell
        text={shutterValue}
        color={
          manualSettings.isManualShutterEnabled
            ? 'text-[#F59E0B]'
            : liveTelemetry.shutterNs !== null
              ? 'text-[#F6F7F9]'
              : 'text-[#B4BAC6]'
        }
        onClick={() => onSelectProTab('SHUTTER')}
      />
      {apertureText && (
        <>
          <MeterDivider />
          <span className="font-mono-tech shrink-0 px-0.5 text-[11px] font-medium text-[#B4BAC6]">
            {apertureText}
          </span>
        </>
      )}
      <MeterDivider />
      <MeterCell
        text={evText}
        color={!isManualAe && sensorCapabilities.currentExposureIndex !== 0 ? 'text-[#67E8F9]' : 'text-[#F6F7F9]'}
        onClick={() => onSelectProTab('EV')}
      />
      <MeterDivider />
      <MeterCell
        text={wbText}
        color={manualSettings.whiteBalanceMode !== 'AUTO' ? 'text-[#F59E0B]' : 'text-[#F6F7F9]'}
        onClick={() => onSelectProTab('WB')}
      />
      <MeterDivider />
      <MeterCell
        text={focusText}
        color={manualSettings.isManualFocusEnabled ? 'text-[#67E8F9]' : 'text-[#F6F7F9]'}
        onClick={() => onSelectProTab('FOCUS')}
      />
      <MeterDivider />
      <MeterCell
        text={CAPTURE_FORMAT_META[manualSettings.captureOutputFormat].shortTag}
        color={manualSettings.isRawCaptureEnabled ? 'text-[#F59E0B]' : 'text-[#34D399]'}
        onClick={() => onSelectProTab('FORMAT')}
      />
      {manualSettings.isExposureLockEnabled && (
        <span className="font-mono-tech shrink-0 rounded-full border border-[#F59E0B] bg-[#F59E0B]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#F59E0B]">
          AE-L
        </span>
      )}
    </div>
  );
};

const MeterCell: React.FC<{ text: string; color: string; onClick: () => void }> = ({
  text,
  color,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`font-mono-tech shrink-0 cursor-pointer rounded px-1 py-0.5 text-[11px] font-medium transition hover:bg-white/10 ${color}`}
  >
    {text}
  </button>
);

const MeterDivider: React.FC = () => (
  <span className="font-mono-tech text-[10px] text-[#7D8594]">·</span>
);

export const FocusPeakingOverlay: React.FC<{
  points: number[];
  peakingColor: FocusPeakingColor;
}> = ({ points, peakingColor }) => {
  const stroke =
    peakingColor === 'CYAN' ? '#67E8F9' : peakingColor === 'RED' ? '#F87171' : '#F59E0B';

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
    >
      {Array.from({ length: Math.floor(points.length / 2) }, (_, idx) => {
        const px = points[idx * 2] * 1000;
        const py = points[idx * 2 + 1] * 1000;
        return (
          <g key={idx} stroke={stroke} strokeOpacity="0.88" strokeWidth="2.4" strokeLinecap="round">
            <line x1={px - 4} y1={py} x2={px + 4} y2={py} />
            <line x1={px} y1={py - 4} x2={px} y2={py + 4} />
          </g>
        );
      })}
    </svg>
  );
};

export const ZebraExposureOverlay: React.FC<{
  highlightPoints: number[];
  shadowPoints: number[];
}> = ({ highlightPoints, shadowPoints }) => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 1000 1000"
    preserveAspectRatio="none"
  >
    {Array.from({ length: Math.floor(highlightPoints.length / 2) }, (_, idx) => {
      const px = highlightPoints[idx * 2] * 1000;
      const py = highlightPoints[idx * 2 + 1] * 1000;
      return (
        <line
          key={`h-${idx}`}
          x1={px - 5}
          y1={py + 5}
          x2={px + 5}
          y2={py - 5}
          stroke="#F87171"
          strokeOpacity="0.78"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    })}
    {Array.from({ length: Math.floor(shadowPoints.length / 2) }, (_, idx) => {
      const px = shadowPoints[idx * 2] * 1000;
      const py = shadowPoints[idx * 2 + 1] * 1000;
      return (
        <line
          key={`s-${idx}`}
          x1={px - 5}
          y1={py - 5}
          x2={px + 5}
          y2={py + 5}
          stroke="#67E8F9"
          strokeOpacity="0.55"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

export const LiveHistogramCard: React.FC<{
  analysis: FrameAnalysisData | null;
  zebraThresholdPercent: number;
}> = ({ analysis, zebraThresholdPercent }) => {
  const shPct = analysis?.shadowClippedPercent ?? 0;
  const hiPct = analysis?.highlightClippedPercent ?? 0;
  const w = 140;
  const h = 54;

  const buildPath = (bins: number[], closeArea: boolean) => {
    if (!bins.length) return '';
    const n = bins.length;
    const pts = bins.map((v, i) => {
      const x = (i / Math.max(1, n - 1)) * w;
      const y = h - v * h * 0.92;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    if (closeArea) {
      return `M0,${h} ${pts.map((p) => p.replace('M', 'L')).join(' ')} L${w},${h} Z`;
    }
    return pts.join(' ');
  };

  const thresholdX = (Math.min(100, Math.max(75, zebraThresholdPercent)) / 100) * w;

  return (
    <div
      data-testid="live_histogram_card"
      className="w-[156px] rounded-[12px] border border-white/15 bg-[#101218]/75 px-2 py-1.5 backdrop-blur-md"
    >
      <div className="font-mono-tech mb-1 flex items-center justify-between text-[10px]">
        <span className={shPct >= 5 ? 'text-[#67E8F9]' : 'text-[#7D8594]'}>
          SH {shPct.toFixed(0)}%
        </span>
        <span className="text-[#B4BAC6]">RGB</span>
        <span className={hiPct >= 2 ? 'text-[#F87171]' : 'text-[#7D8594]'}>
          HI {hiPct.toFixed(0)}%
        </span>
      </div>

      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {[0.25, 0.5, 0.75].map((q) => (
          <line
            key={q}
            x1={w * q}
            y1={0}
            x2={w * q}
            y2={h}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.8"
          />
        ))}
        <line
          x1={thresholdX}
          y1={0}
          x2={thresholdX}
          y2={h}
          stroke="rgba(245,158,11,0.45)"
          strokeWidth="1"
        />
        {analysis && analysis.lumaBins.length > 0 && (
          <>
            <path d={buildPath(analysis.lumaBins, true)} fill="rgba(246,247,249,0.24)" />
            <path d={buildPath(analysis.redBins, false)} fill="none" stroke="rgba(239,68,68,0.85)" strokeWidth="1.25" />
            <path d={buildPath(analysis.greenBins, false)} fill="none" stroke="rgba(34,197,94,0.85)" strokeWidth="1.25" />
            <path d={buildPath(analysis.blueBins, false)} fill="none" stroke="rgba(59,130,246,0.85)" strokeWidth="1.25" />
          </>
        )}
      </svg>
    </div>
  );
};
