import { type BarcodeType, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { BarcodeImage } from "@/components/barcode-image";
import {
  BarcodeScanner,
  type ScannedBarcode,
} from "@/components/barcode-scanner";
import { findBarcode, saveBarcode, typeLabel } from "@/lib/barcodes";

type Pending = {
  data: string;
  type: string;
  /** True if this barcode was already saved; saving updates its name. */
  existing: boolean;
};

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
  const [pending, setPending] = useState<Pending | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { width } = useWindowDimensions();

  async function onBarcodeScanned({ data, type }: ScannedBarcode) {
    // The camera fires many times per second; only take the first hit.
    if (handled.current || !data) return;
    handled.current = true;
    const existing = await findBarcode(data, type).catch(() => undefined);
    setName(existing?.name ?? "");
    setError(null);
    setPending({ data, type, existing: !!existing });
  }

  function scanAgain() {
    setPending(null);
    setName("");
    setError(null);
    handled.current = false;
  }

  async function save() {
    if (!pending || saving) return;
    if (!name.trim()) {
      setError("Give it a name so you can find it later.");
      return;
    }
    setSaving(true);
    try {
      await saveBarcode(pending.data, pending.type, name);
      router.back();
    } catch {
      setError("Couldn't save that barcode. Try again.");
      setSaving(false);
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

  if (pending) {
    const previewWidth = Math.min(width - 48, 420);
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <BarcodeImage
            data={pending.data}
            type={pending.type}
            maxWidth={previewWidth}
            maxHeight={180}
          />
          <Text style={styles.hint}>
            {typeLabel(pending.type)} · {pending.data}
          </Text>
          {pending.existing && (
            <Text style={styles.hint}>
              You've already saved this one. Saving updates its name.
            </Text>
          )}
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, { width: previewWidth }]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError(null);
            }}
            placeholder="e.g. Library card"
            autoFocus
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="Barcode name"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[styles.button, { width: previewWidth }, saving && styles.disabled]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Save</Text>
          </Pressable>
          <Pressable onPress={scanAgain} hitSlop={8}>
            <Text style={styles.secondary}>Scan a different barcode</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <BarcodeScanner
        barcodeTypes={BARCODE_TYPES}
        onScanned={onBarcodeScanned}
        paused={!!pending}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.overlayText}>
          Point the camera at a barcode
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  form: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  label: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C4CBD3",
    backgroundColor: "#FFFFFF",
    color: "#111",
    textAlign: "center",
  },
  error: {
    color: "#D93025",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  secondary: {
    marginTop: 4,
    fontSize: 15,
    color: "#208AEF",
  },
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
    alignItems: "center",
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
