import { type BarcodeType, CameraView } from "expo-camera";
import { StyleSheet } from "react-native";

export type ScannedBarcode = { data: string; type: string };

export type BarcodeScannerProps = {
  barcodeTypes: BarcodeType[];
  /** Called for each barcode seen while not paused. */
  onScanned: (result: ScannedBarcode) => void;
  paused?: boolean;
};

/** Native camera scanner (iOS/Android). The web version is barcode-scanner.web.tsx. */
export function BarcodeScanner({
  barcodeTypes,
  onScanned,
  paused,
}: BarcodeScannerProps) {
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes }}
      onBarcodeScanned={
        paused ? undefined : ({ data, type }) => onScanned({ data, type })
      }
    />
  );
}
