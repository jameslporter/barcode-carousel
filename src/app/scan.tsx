import {
  type BarcodeScanningResult,
  type BarcodeType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { saveBarcode, typeLabel } from "@/lib/barcodes";

const BARCODE_TYPES: BarcodeType[] = [
  "qr",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "itf14",
  "codabar",
  "pdf417",
  "aztec",
  "datamatrix",
];

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onBarcodeScanned({ data, type }: BarcodeScanningResult) {
    // The camera fires many times per second; only save the first hit.
    if (handled.current || !data) return;
    handled.current = true;
    try {
      const isNew = await saveBarcode(data, type);
      setStatus(
        isNew ? `Saved ${typeLabel(type)}` : `Already saved, moved to front`,
      );
      setTimeout(() => router.back(), 600);
    } catch {
      setStatus("Couldn't save that barcode. Try again.");
      handled.current = false;
    }
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Barcode Carousel needs your camera to scan barcodes.
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>
            Camera access is turned off. Enable it in Settings to scan.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={handled.current ? undefined : onBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.overlayText}>
          {status ?? "Point the camera at a barcode"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 17,
    textAlign: "center",
  },
  hint: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#208AEF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  frame: {
    width: "75%",
    aspectRatio: 1.6,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
  },
  overlayText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
});
