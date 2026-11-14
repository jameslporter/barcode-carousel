import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Saved barcodes live in AsyncStorage under a single key as a JSON array.
 *
 * Backup: on iOS AsyncStorage writes to Application Support/<bundle id>/RCTAsyncLocalStorage_V1,
 * which the library excludes from iCloud backup unless Info.plist sets
 * RCTAsyncStorageExcludeFromBackup = false (done in app.json). On Android it is the SQLite
 * database `databases/RKStorage`, which Google Auto Backup includes while
 * android:allowBackup is true (also set in app.json).
 */
const STORAGE_KEY = "barcodes:v1";

export type SavedBarcode = {
  id: string;
  /** The decoded value, exactly as the scanner returned it. */
  data: string;
  /** Barcode type as reported by expo-camera, e.g. "qr", "ean13", "code128". */
  type: string;
  /** ISO timestamp of when it was saved. */
  createdAt: string;
};

export async function loadBarcodes(): Promise<SavedBarcode[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedBarcode[]) : [];
  } catch {
    return [];
  }
}

async function writeBarcodes(barcodes: SavedBarcode[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(barcodes));
}

/**
 * Saves a scanned barcode, newest first. Scanning a barcode that is already saved
 * moves it to the front instead of adding a duplicate.
 * Returns true if it was new.
 */
export async function saveBarcode(
  data: string,
  type: string,
): Promise<boolean> {
  const existing = await loadBarcodes();
  const normalizedType = normalizeType(type);
  const duplicate = existing.find(
    (b) => b.data === data && normalizeType(b.type) === normalizedType,
  );
  const rest = existing.filter((b) => b !== duplicate);
  const entry: SavedBarcode = duplicate ?? {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data,
    type: normalizedType,
    createdAt: new Date().toISOString(),
  };
  await writeBarcodes([entry, ...rest]);
  return !duplicate;
}

export async function deleteBarcode(id: string): Promise<SavedBarcode[]> {
  const next = (await loadBarcodes()).filter((b) => b.id !== id);
  await writeBarcodes(next);
  return next;
}

/**
 * Scanners don't all report types the same way (iOS has used names like
 * "org.iso.QRCode" or "org.gs1.EAN-13"). Map them onto expo-camera's names.
 */
export function normalizeType(type: string): string {
  const t = type.toLowerCase().replace(/^org\.[a-z0-9]+\./, "").replace(/[-_\s]/g, "");
  const map: Record<string, string> = {
    qr: "qr",
    qrcode: "qr",
    ean13: "ean13",
    ean8: "ean8",
    upca: "upc_a",
    upce: "upc_e",
    code128: "code128",
    code39: "code39",
    code39mod43: "code39",
    code93: "code93",
    itf14: "itf14",
    interleaved2of5: "itf14",
    codabar: "codabar",
    pdf417: "pdf417",
    aztec: "aztec",
    datamatrix: "datamatrix",
  };
  return map[t] ?? t;
}

export function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    qr: "QR code",
    ean13: "EAN-13",
    ean8: "EAN-8",
    upc_a: "UPC-A",
    upc_e: "UPC-E",
    code128: "Code 128",
    code39: "Code 39",
    code93: "Code 93",
    itf14: "ITF-14",
    codabar: "Codabar",
    pdf417: "PDF417",
    aztec: "Aztec",
    datamatrix: "Data Matrix",
  };
  return labels[normalizeType(type)] ?? type;
}
