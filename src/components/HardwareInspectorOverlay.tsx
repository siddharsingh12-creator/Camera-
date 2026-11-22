import React from 'react';
import { ArrowLeft, Camera, CheckCircle2, X } from 'lucide-react';
import {
  CameraHardwareProfile,
  DeviceCameraInventory,
  LENS_ROLE_META,
} from '../types/camera';
import { formatResolutionLabel, formatShutterSpeed } from '../utils/cameraUtils';

interface HardwareInspectorOverlayProps {
  inventory: DeviceCameraInventory;
  selectedCameraId: string | null;
  activeCameraId: string | null;
  onSelectCamera: (id: string) => void;
  onUseCameraInViewfinder: (id: string) => void;
  onClose: () => void;
}

export const HardwareInspectorOverlay: React.FC<HardwareInspectorOverlayProps> = ({
  inventory,
  selectedCameraId,
  activeCameraId,
  onSelectCamera,
  onUseCameraInViewfinder,
  onClose,
}) => {
  const allInspectable: CameraHardwareProfile[] = [
    ...inventory.allLogicalAndStandaloneCameras,
    ...inventory.allPhysicalSensors,
  ].filter((p, i, arr) => arr.findIndex((o) => o.cameraId === p.cameraId) === i);

  const selectedProfile =
    allInspectable.find((p) => p.cameraId === selectedCameraId) ?? allInspectable[0] ?? null;

  return (
    <div
      data-testid="hardware_inspector_overlay"
      className="fixed inset-0 z-40 flex flex-col bg-[#090A0D] text-[#F6F7F9]"
    >
      {/* Top Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close hardware inspector"
          data-testid="close_inspector_button"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-[16px] font-semibold text-[#F6F7F9]">
            Hardware Capabilities
          </h1>
          <p className="font-mono-tech text-[10px] text-[#7D8594]">
            Live MediaDevices &amp; optical sensor inspection
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-8">
        {/* 1. Device Camera Array Summary Card */}
        <div className="rounded-[18px] border border-white/15 bg-[#12141A] p-4">
          <div className="font-mono-tech text-[10px] font-medium text-[#67E8F9]">
            DEVICE CAMERA INVENTORY
          </div>
          <div className="mt-2.5 flex justify-between gap-2">
            <InventoryMetric label="Logical / Main" value={String(inventory.allLogicalAndStandaloneCameras.length)} />
            <InventoryMetric label="Physical Sensors" value={String(inventory.allPhysicalSensors.length)} />
            <InventoryMetric label="Rear" value={String(inventory.backCameraCount)} />
            <InventoryMetric label="Front" value={String(inventory.frontCameraCount)} />
            {inventory.externalCameraCount > 0 && (
              <InventoryMetric label="External" value={String(inventory.externalCameraCount)} />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <PresenceChip label="Ultra-Wide" detected={inventory.hasUltraWide} />
            <PresenceChip label="Telephoto" detected={inventory.hasTelephoto} />
            <PresenceChip label="Macro" detected={inventory.hasMacro} />
          </div>
        </div>

        {/* 2. Selectable Camera IDs */}
        {allInspectable.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {allInspectable.map((profile) => {
              const isSelected = profile.cameraId === selectedProfile?.cameraId;
              const kindTag = profile.isVirtual
                ? 'VIRTUAL'
                : profile.isLogicalMultiCamera
                  ? 'LOGICAL'
                  : 'SENSOR';
              return (
                <button
                  key={profile.cameraId}
                  type="button"
                  onClick={() => onSelectCamera(profile.cameraId)}
                  className={`shrink-0 cursor-pointer rounded-[14px] border px-3.5 py-2.5 text-left transition ${
                    isSelected
                      ? 'border-[#F6F7F9] bg-[#F6F7F9] text-[#090A0D]'
                      : 'border-white/15 bg-[#12141A] text-[#F6F7F9] hover:bg-[#1A1D26]'
                  }`}
                >
                  <div className="font-mono-tech text-[12px] font-medium">
                    ID {profile.cameraId} · {profile.facingLabel} {LENS_ROLE_META[profile.role].displayName}
                  </div>
                  <div
                    className={`font-mono-tech text-[10px] ${
                      isSelected ? 'text-[#090A0D]/70' : 'text-[#7D8594]'
                    }`}
                  >
                    {kindTag} · {profile.hardwareLevel}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Selected Sensor Telemetry */}
        {selectedProfile && (
          <>
            {selectedProfile.isCameraXSelectable &&
              selectedProfile.isBackwardCompatible &&
              selectedProfile.cameraId !== activeCameraId && (
                <button
                  type="button"
                  onClick={() => onUseCameraInViewfinder(selectedProfile.cameraId)}
                  className="font-display flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#67E8F9] py-3 text-[14px] font-semibold text-[#090A0D]"
                >
                  <Camera className="h-[18px] w-[18px]" />
                  <span>
                    Activate Camera {selectedProfile.cameraId} (
                    {LENS_ROLE_META[selectedProfile.role].displayName}) in Viewfinder
                  </span>
                </button>
              )}

            <InspectorSectionCard title="OPTICS & SENSOR GEOMETRY">
              <KeyValueRow label="Camera ID" value={selectedProfile.cameraId} />
              <KeyValueRow label="Device Label" value={selectedProfile.label} />
              <KeyValueRow
                label="Facing & Role"
                value={`${selectedProfile.facingLabel} · ${LENS_ROLE_META[selectedProfile.role].displayName}`}
              />
              <KeyValueRow label="Hardware Level" value={selectedProfile.hardwareLevel} />
              <KeyValueRow
                label="Focal Lengths"
                value={
                  selectedProfile.focalLengthsMm.length
                    ? selectedProfile.focalLengthsMm.map((f) => `${f.toFixed(2)} mm`).join(', ')
                    : 'Unavailable'
                }
              />
              <KeyValueRow
                label="35mm Equiv / FOV"
                value={`${selectedProfile.equivalent35mmFocalLength ?? '—'} mm / ${
                  selectedProfile.horizontalFovDegrees
                    ? `${selectedProfile.horizontalFovDegrees.toFixed(1)}°`
                    : '—'
                }`}
              />
              <KeyValueRow
                label="Sensor Physical Size"
                value={selectedProfile.sensorPhysicalSizeMm ?? 'Unavailable'}
              />
              <KeyValueRow
                label="Aperture(s)"
                value={
                  selectedProfile.apertures.length
                    ? selectedProfile.apertures.map((a) => `f/${a}`).join(', ')
                    : 'Unavailable'
                }
              />
            </InspectorSectionCard>

            <InspectorSectionCard title="ZOOM & MULTI-LENS OPTICS">
              <KeyValueRow
                label="Optical Zoom"
                value={selectedProfile.hasOpticalZoom ? 'Supported' : 'Not available'}
              />
              <KeyValueRow label="Optical Config" value={selectedProfile.opticalZoomExplanation} />
              <KeyValueRow
                label="Max Digital Zoom"
                value={`${selectedProfile.maxDigitalZoom.toFixed(1)}×`}
              />
              <KeyValueRow
                label="Zoom Ratio Range"
                value={
                  selectedProfile.controlZoomRatioRange
                    ? `${selectedProfile.controlZoomRatioRange[0].toFixed(2)}× – ${selectedProfile.controlZoomRatioRange[1].toFixed(1)}×`
                    : `1.0× – ${selectedProfile.maxDigitalZoom.toFixed(1)}×`
                }
              />
            </InspectorSectionCard>

            <InspectorSectionCard title="FOCUS, FLASH & EXPOSURE">
              <KeyValueRow
                label="Autofocus"
                value={
                  selectedProfile.focusCapabilities.isAutoFocusSupported
                    ? selectedProfile.focusCapabilities.afModes.join(', ')
                    : 'Fixed focus'
                }
              />
              <KeyValueRow
                label="Manual Focus"
                value={
                  selectedProfile.focusCapabilities.isManualFocusSupported
                    ? `Supported (Min ${selectedProfile.focusCapabilities.minimumFocusDistanceCm?.toFixed(1) ?? '—'} cm · ${selectedProfile.focusCapabilities.focusCalibrationLabel})`
                    : selectedProfile.focusCapabilities.unsupportedManualReason ?? 'Unsupported'
                }
              />
              <KeyValueRow label="Flash Unit" value={selectedProfile.flashExplanation} />
              <KeyValueRow
                label="Manual ISO & Shutter"
                value={
                  selectedProfile.exposureAndRaw.isManualExposureSupported
                    ? 'Supported (Optical/Track Controls)'
                    : selectedProfile.exposureAndRaw.unsupportedManualReason ?? 'Unsupported'
                }
              />
              <KeyValueRow
                label="ISO Range"
                value={
                  selectedProfile.exposureAndRaw.isoRange
                    ? `ISO ${selectedProfile.exposureAndRaw.isoRange[0]} – ${selectedProfile.exposureAndRaw.isoRange[1]}`
                    : 'Auto only'
                }
              />
              <KeyValueRow
                label="Shutter Speed Range"
                value={
                  selectedProfile.exposureAndRaw.shutterRangeNs
                    ? `${formatShutterSpeed(selectedProfile.exposureAndRaw.shutterRangeNs[0])} – ${formatShutterSpeed(selectedProfile.exposureAndRaw.shutterRangeNs[1])}`
                    : 'Auto only'
                }
              />
              <KeyValueRow
                label="RAW (DNG) Capture"
                value={selectedProfile.exposureAndRaw.unsupportedRawReason ?? 'JPEG/PNG Stream'}
              />
            </InspectorSectionCard>

            <InspectorSectionCard
              title={`IMAGE RESOLUTIONS (${selectedProfile.supportedJpegResolutions.length})`}
            >
              <KeyValueRow
                label="Max Native JPEG"
                value={
                  selectedProfile.maxJpegResolution
                    ? formatResolutionLabel(selectedProfile.maxJpegResolution)
                    : 'None reported'
                }
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedProfile.supportedJpegResolutions.map((res, idx) => {
                  const isMax = idx === 0;
                  const mp = ((res.width * res.height) / 1_000_000).toFixed(1);
                  return (
                    <span
                      key={`${res.width}x${res.height}`}
                      className={`font-mono-tech rounded-[8px] border px-2 py-1 text-[10px] ${
                        isMax
                          ? 'border-[#67E8F9]/45 bg-[#67E8F9]/14 text-[#67E8F9]'
                          : 'border-white/8 bg-[#1A1D26] text-[#B4BAC6]'
                      }`}
                    >
                      {res.width}×{res.height} · {mp}MP
                    </span>
                  );
                })}
              </div>
            </InspectorSectionCard>

            <InspectorSectionCard title="FRAME RATES, VIDEO & STABILIZATION">
              <KeyValueRow
                label="AE FPS Ranges"
                value={selectedProfile.videoAndStabilization.supportedFpsRanges
                  .map(([a, b]) => `${a}–${b} fps`)
                  .join(', ')}
              />
              <KeyValueRow
                label="Optical Stab (OIS)"
                value={selectedProfile.videoAndStabilization.isOisSupported ? 'Supported' : 'Not supported'}
              />
              <KeyValueRow
                label="Electronic Stab (EIS)"
                value={selectedProfile.videoAndStabilization.isEisSupported ? 'Supported' : 'Not supported'}
              />
            </InspectorSectionCard>

            {selectedProfile.capabilityTags.length > 0 && (
              <InspectorSectionCard title="CAPABILITY FLAGS">
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.capabilityTags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono-tech rounded-[8px] border border-white/8 bg-[#1A1D26] px-2 py-1 text-[10px] text-[#B4BAC6]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </InspectorSectionCard>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const InventoryMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <span className="font-display text-[22px] font-semibold text-[#F6F7F9]">{value}</span>
    <span className="font-mono-tech text-[10px] text-[#7D8594]">{label}</span>
  </div>
);

const PresenceChip: React.FC<{ label: string; detected: boolean }> = ({ label, detected }) => (
  <div
    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${
      detected ? 'border-[#34D399]/45 bg-[#34D399]/14' : 'border-white/8 bg-[#090A0D]'
    }`}
  >
    {detected ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
    ) : (
      <X className="h-3.5 w-3.5 text-[#7D8594]" />
    )}
    <span className={`font-mono-tech text-[10px] ${detected ? 'text-[#F6F7F9]' : 'text-[#7D8594]'}`}>
      {detected ? `${label} Detected` : `No ${label}`}
    </span>
  </div>
);

const InspectorSectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-2 rounded-[18px] border border-white/8 bg-[#12141A] p-4">
    <div className="font-mono-tech text-[10px] font-medium text-[#F59E0B]">{title}</div>
    {children}
  </div>
);

const KeyValueRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2">
    <span className="w-[42%] text-[13px] text-[#7D8594]">{label}</span>
    <span className="font-mono-tech w-[58%] text-right text-[12px] text-[#F6F7F9]">{value}</span>
  </div>
);
