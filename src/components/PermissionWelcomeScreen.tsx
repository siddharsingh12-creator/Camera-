import React from 'react';
import { Camera, Layers, Sparkles, Image as ImageIcon, MonitorPlay } from 'lucide-react';
import { CameraPermissionStatus } from '../types/camera';

interface PermissionWelcomeScreenProps {
  permissionStatus: CameraPermissionStatus;
  errorMessage?: string | null;
  onOpenCameraClick: () => void;
  onUseVirtualSensorClick: () => void;
}

export const PermissionWelcomeScreen: React.FC<PermissionWelcomeScreenProps> = ({
  permissionStatus,
  errorMessage,
  onOpenCameraClick,
  onUseVirtualSensorClick,
}) => {
  const showDeniedNotice =
    permissionStatus === 'DENIED' ||
    permissionStatus === 'PERMANENTLY_DENIED' ||
    permissionStatus === 'NO_HARDWARE';

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-y-auto bg-[#090A0D] px-6 py-6">
      {/* Subtle radial cyan/amber optical backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 24%, rgba(103, 232, 249, 0.08), rgba(245, 158, 11, 0.03) 40%, transparent 72%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center pt-3">
        {/* Precision optical tagline chip */}
        <div className="rounded-full border border-white/15 bg-[#12141A] px-3.5 py-1.5">
          <span className="font-mono-tech text-[10px] font-medium tracking-[0.06em] text-[#67E8F9]">
            OPTICAL PRECISION · FULL SENSOR FIDELITY
          </span>
        </div>

        <div className="mt-7 mb-6">
          <OpticalLensEmblem />
        </div>

        <h1 className="font-display text-center text-[32px] leading-[38px] font-bold tracking-[-0.5px] text-[#F6F7F9]">
          Ultra Cam Pro
        </h1>
        <p className="font-display mt-2 text-center text-[16px] font-semibold text-[#B4BAC6]">
          Pure Sensor Photography
        </p>
        <p className="mt-3 px-2 text-center text-[15px] leading-[22px] text-[#7D8594]">
          Capture full-resolution, unscaled photographs directly from your device&apos;s physical
          camera hardware with zero compression loss.
        </p>

        {/* Hardware capability spec cards */}
        <div className="mt-7 flex w-full flex-col gap-2.5">
          <HardwareSpecRow
            icon={<Layers className="h-5 w-5 text-[#67E8F9]" />}
            title="Native Max Sensor"
            description="Queries hardware media stream sizes for highest native megapixels"
          />
          <HardwareSpecRow
            icon={<Sparkles className="h-5 w-5 text-[#F59E0B]" />}
            title="Maximize Quality Mode"
            description="Manual DSLR controls, live RGB histogram, zebra & focus peaking"
          />
          <HardwareSpecRow
            icon={<ImageIcon className="h-5 w-5 text-[#F6F7F9]" />}
            title="Direct Gallery & Export"
            description="Instant full-resolution inspection, sharing, and clean JPEG/MP4 export"
          />
        </div>
      </div>

      <div className="relative z-10 mt-6 flex w-full max-w-[520px] flex-col items-center gap-3 pb-2">
        {showDeniedNotice && (
          <div className="w-full rounded-[14px] border border-[#F87171]/35 bg-[#F87171]/12 px-4 py-3 text-center text-[13px] leading-[19px] text-[#F6F7F9]">
            {errorMessage ||
              (permissionStatus === 'PERMANENTLY_DENIED'
                ? 'Camera permission was blocked in browser settings. Allow camera access in your browser site settings or launch Virtual Sensor Preview below.'
                : permissionStatus === 'NO_HARDWARE'
                  ? 'No physical camera sensor was detected on this device. You can test the full camera pipeline in Virtual Optical Sensor mode.'
                  : 'Camera permission is required to access your physical camera sensor. Tap Open Camera to allow access.')}
          </div>
        )}

        <button
          type="button"
          onClick={onOpenCameraClick}
          data-testid="open_camera_button"
          className="font-display flex h-[58px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-[#F6F7F9] text-[14px] font-semibold tracking-[0.25px] text-[#090A0D] transition active:scale-[0.99] hover:bg-white"
        >
          <Camera className="h-[22px] w-[22px]" />
          <span>Open Camera</span>
        </button>

        {showDeniedNotice && (
          <button
            type="button"
            onClick={onUseVirtualSensorClick}
            data-testid="virtual_sensor_button"
            className="font-display flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-[#12141A] text-[13px] font-semibold text-[#67E8F9] transition hover:bg-[#1A1D26]"
          >
            <MonitorPlay className="h-[18px] w-[18px]" />
            <span>Launch Virtual Optical Sensor</span>
          </button>
        )}
      </div>
    </div>
  );
};

const HardwareSpecRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex w-full items-center rounded-[16px] border border-white/8 bg-[#12141A] px-4 py-3.5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#1A1D26]">
      {icon}
    </div>
    <div className="ml-3.5 min-w-0">
      <div className="font-display text-[16px] leading-[22px] font-semibold text-[#F6F7F9]">
        {title}
      </div>
      <div className="mt-0.5 text-[13px] leading-[19px] text-[#7D8594]">{description}</div>
    </div>
  </div>
);

const OpticalLensEmblem: React.FC = () => {
  const size = 124;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;
    const inner = radius * 0.84;
    const outer = radius * 0.91;
    return {
      x1: cx + inner * Math.cos(rad),
      y1: cy + inner * Math.sin(rad),
      x2: cx + outer * Math.cos(rad),
      y2: cy + outer * Math.sin(rad),
      major: i % 6 === 0,
    };
  });

  const blades = Array.from({ length: 6 }, (_, i) => {
    const startRad = ((i * 60 + 18) * Math.PI) / 180;
    const endRad = ((i * 60 + 78) * Math.PI) / 180;
    const innerR = radius * 0.25;
    const outerR = radius * 0.6;
    return {
      x1: cx + innerR * Math.cos(startRad),
      y1: cy + innerR * Math.sin(startRad),
      x2: cx + outerR * Math.cos(endRad),
      y2: cy + outerR * Math.sin(endRad),
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="opticalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.75" />
          <stop offset="35%" stopColor="#F6F7F9" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#67E8F9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F6F7F9" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={radius} fill="#1A1D26" />
      <circle cx={cx} cy={cy} r={radius - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      {ticks.map((t, idx) => (
        <line
          key={idx}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.major ? 'rgba(246,247,249,0.5)' : 'rgba(255,255,255,0.15)'}
          strokeWidth={t.major ? 1.5 : 1}
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.68} fill="none" stroke="url(#opticalRingGrad)" strokeWidth="2.5" />
      {blades.map((b, idx) => (
        <line
          key={idx}
          x1={b.x1}
          y1={b.y1}
          x2={b.x2}
          y2={b.y2}
          stroke="rgba(246,247,249,0.75)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.2} fill="#090A0D" />
      <circle cx={cx} cy={cy - radius * 0.77} r="3.5" fill="#F59E0B" />
    </svg>
  );
};
