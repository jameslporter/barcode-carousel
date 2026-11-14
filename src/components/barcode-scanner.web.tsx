import Constants from "expo-constants";
import type { BarcodeType } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BarcodeScannerProps } from "./barcode-scanner";

export type { BarcodeScannerProps, ScannedBarcode } from "./barcode-scanner";

/**
 * Web barcode scanner.
 *
 * expo-camera's web camera asks the browser for no particular resolution, which
 * usually gives a 640x480 stream: too blurry to read most 1D barcodes. It also
 * leaves focus to the browser. This opens the back camera at up to 1080p, asks
 * for continuous autofocus, prefers the iPhone multi-lens "virtual" cameras that
 * switch to macro for close-up focus, and decodes a crop around the on-screen
 * frame at full resolution.
 */

// expo-camera type -> Barcode Detection API format.
const TO_WEB: Record<string, string> = {
  qr: "qr_code",
  ean13: "ean_13",
  ean8: "ean_8",
  upc_a: "upc_a",
  upc_e: "upc_e",
  code128: "code_128",
  code39: "code_39",
  code93: "code_93",
  itf14: "itf",
  codabar: "codabar",
  pdf417: "pdf417",
  aztec: "aztec",
  datamatrix: "data_matrix",
};
const FROM_WEB: Record<string, string> = Object.fromEntries(
  Object.entries(TO_WEB).map(([k, v]) => [v, k]),
);

type Detector = {
  detect(source: CanvasImageSource): Promise<{ rawValue: string; format: string }[]>;
};

async function createDetector(types: BarcodeType[]): Promise<Detector> {
  const wanted = types.map((t) => TO_WEB[t]).filter(Boolean);
  // Use the browser's own detector (Chrome on Android/macOS) when it supports
  // the formats we need; otherwise the ZXing WebAssembly ponyfill (Safari, Firefox).
  const Native = (globalThis as { BarcodeDetector?: any }).BarcodeDetector;
  if (Native) {
    try {
      const supported: string[] = await Native.getSupportedFormats();
      const formats = wanted.filter((f) => supported.includes(f));
      if (formats.includes("qr_code") && formats.includes("code_128")) {
        return new Native({ formats });
      }
    } catch {
      // fall through to the ponyfill
    }
  }
  const { BarcodeDetector, setZXingModuleOverrides } = await import(
    "barcode-detector/ponyfill"
  );
  // Serve the decoder from this site (copied into public/ on install) rather
  // than the package's default CDN.
  const baseUrl = (Constants.expoConfig?.experiments?.baseUrl ?? "").replace(/\/$/, "");
  setZXingModuleOverrides({
    locateFile: (file: string, prefix: string) =>
      file.endsWith(".wasm") ? `${baseUrl}/${file}` : prefix + file,
  });
  return new BarcodeDetector({ formats: wanted as any }) as unknown as Detector;
}

const RESOLUTION = { width: { ideal: 1920 }, height: { ideal: 1080 } };

async function openBackCamera(): Promise<MediaStream> {
  let stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: "environment" }, ...RESOLUTION },
  });

  // iPhone Pro models: the plain "Back Camera" can't focus closer than ~20 cm,
  // so barcodes held at a normal distance stay blurry. The virtual multi-lens
  // cameras switch to the ultra-wide macro lens automatically. Labels are only
  // readable after permission is granted, which it now is.
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    const preferred =
      cams.find((d) => /back triple camera/i.test(d.label)) ??
      cams.find((d) => /back dual wide camera/i.test(d.label));
    const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
    if (preferred && preferred.deviceId && preferred.deviceId !== current) {
      stream.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: preferred.deviceId }, ...RESOLUTION },
      });
    }
  } catch {
    // keep whatever stream we have
  }

  const track = stream.getVideoTracks()[0];
  const caps = (track?.getCapabilities?.() ?? {}) as { focusMode?: string[] };
  if (track && caps.focusMode?.includes("continuous")) {
    await track
      .applyConstraints({ advanced: [{ focusMode: "continuous" } as any] })
      .catch(() => {});
  }
  return stream;
}

/**
 * The region of the video frame under the on-screen scan frame (75% wide,
 * 1.6:1, centered), with some margin, given the video is drawn with
 * object-fit: cover.
 */
function frameCrop(video: HTMLVideoElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = video.clientWidth || vw;
  const ch = video.clientHeight || vh;
  const scale = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * scale) / 2;
  const oy = (ch - vh * scale) / 2;
  const fw = cw * 0.75 * 1.2;
  const fh = ((cw * 0.75) / 1.6) * 1.6;
  const fx = (cw - fw) / 2;
  const fy = (ch - fh) / 2;
  const x = Math.max(0, (fx - ox) / scale);
  const y = Math.max(0, (fy - oy) / scale);
  const w = Math.min(vw - x, fw / scale);
  const h = Math.min(vh - y, fh / scale);
  return { x, y, w, h };
}

export function BarcodeScanner({ barcodeTypes, onScanned, paused }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScannedRef = useRef(onScanned);
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState<string | null>(null);
  const [zoomSteps, setZoomSteps] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  onScannedRef.current = onScanned;
  pausedRef.current = paused;

  const typesKey = barcodeTypes.join(",");

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        const [s, detector] = await Promise.all([
          openBackCamera(),
          createDetector(typesKey.split(",") as BarcodeType[]),
        ]);
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const track = s.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        const settings = track?.getSettings();
        if (settings?.width && settings?.height) {
          setCameraInfo(
            `${track?.label ? `${track.label} · ` : ""}${settings.width}×${settings.height}`,
          );
        }
        // Zoom lets you hold the phone further back, where its lens can focus.
        const caps = (track?.getCapabilities?.() ?? {}) as {
          zoom?: { min: number; max: number };
        };
        if (caps.zoom && caps.zoom.max >= 2) {
          const min = Math.max(1, caps.zoom.min);
          setZoomSteps([min, 2, ...(caps.zoom.max >= 3 ? [3] : [])]);
          setZoom(min);
        }
        const video = videoRef.current;
        if (!video || !ctx) return;
        video.srcObject = s;
        await video.play().catch(() => {});

        let useCrop = true;
        const tick = async () => {
          if (stopped) return;
          try {
            if (!pausedRef.current && video.videoWidth > 0) {
              // Alternate between the area under the frame (more pixels per bar)
              // and the whole picture (in case the barcode is off-center).
              const r = useCrop
                ? frameCrop(video)
                : { x: 0, y: 0, w: video.videoWidth, h: video.videoHeight };
              useCrop = !useCrop;
              canvas.width = Math.round(r.w);
              canvas.height = Math.round(r.h);
              ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
              const found = await detector.detect(canvas);
              const hit = found.find((b) => b.rawValue);
              if (hit && !pausedRef.current) {
                onScannedRef.current({
                  data: hit.rawValue,
                  type: FROM_WEB[hit.format] ?? hit.format,
                });
              }
            }
          } catch {
            // a bad frame; try the next one
          }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (e) {
        setError(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in your browser settings to scan."
            : "Couldn't start the camera on this device.",
        );
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, [typesKey]);

  const cycleZoom = () => {
    const i = zoomSteps.indexOf(zoom);
    const next = zoomSteps[(i + 1) % zoomSteps.length];
    trackRef.current
      ?.applyConstraints({ advanced: [{ zoom: next } as any] })
      .then(() => setZoom(next))
      .catch(() => {});
  };

  if (error) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#000",
        }}
      />
      <View style={styles.bottomBar} pointerEvents="box-none">
        {zoomSteps.length > 1 && (
          <Pressable
            style={styles.zoom}
            onPress={cycleZoom}
            accessibilityRole="button"
            accessibilityLabel={`Zoom ${zoom}x. Tap to change`}
          >
            <Text style={styles.zoomText}>{`${Math.round(zoom * 10) / 10}×`}</Text>
          </Pressable>
        )}
        {cameraInfo && (
          <Text style={styles.info} numberOfLines={1}>
            {cameraInfo}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
    zIndex: 2,
  },
  zoom: {
    minWidth: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  zoomText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  errorText: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
  },
});
