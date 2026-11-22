# Ultra Cam Pro

Web edition of **Ultra Cam Pro**, built with React 19, TypeScript, Vite, and Tailwind CSS v4.

## Features

- **Physical Camera & Virtual Optical Sensor**: Connects to device webcams via `navigator.mediaDevices.getUserMedia`, or runs a procedural **Virtual Optical Sensor** fallback when no camera hardware or permission is available.
- **Manual DSLR Sensor Controls**: Adjust ISO, shutter speed, exposure compensation (EV), white balance & manual Kelvin temperature, manual focus distance, stabilization, and persistent custom presets (`localStorage`).
- **Live Frame Telemetry**: Real-time RGB & luminance histogram, IRE zebra clipping overlay, Sobel edge focus peaking, rule-of-thirds grid, and orientation level gauge.
- **Computational & Multi-Shot Modes**: Standard, HDR, Night, Portrait, Macro, Hi-Res, 5-shot Burst mode, Panorama multi-slice sweep with feather stitching, Auto Scene detection, and Natural Color.
- **Cinema Video Recording**: Capture video via `MediaRecorder` with resolution/FPS/bitrate selectors, pause/resume recording, live audio meter, and session media inspector/gallery.

## Development

```bash
npm install
npm run dev
```

The development server runs on `http://localhost:3000`.

## Production Build

```bash
npm run build
```
