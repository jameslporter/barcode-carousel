import { toSVG } from "bwip-js/generic";

import { normalizeType } from "./barcodes";

/** expo-camera barcode type -> bwip-js symbology id. */
const BCID: Record<string, string> = {
  qr: "qrcode",
  ean13: "ean13",
  ean8: "ean8",
  upc_a: "upca",
  upc_e: "upce",
  code128: "code128",
  code39: "code39",
  code93: "code93",
  itf14: "itf14",
  codabar: "rationalizedCodabar",
  pdf417: "pdf417",
  aztec: "azteccode",
  datamatrix: "datamatrix",
};

const TWO_D = new Set(["qrcode", "azteccode", "datamatrix"]);

export type RenderedBarcode = {
  svg: string;
  /** Natural width / height of the SVG, for sizing it on screen. */
  aspectRatio: number;
  /** True if the original symbology couldn't be drawn and a fallback was used. */
  fallback: boolean;
};

function viewBoxAspect(svg: string): number {
  const m = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!m) return 1;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return w > 0 && h > 0 ? w / h : 1;
}

/**
 * Draws a barcode as an SVG string in its original symbology, so a store's
 * scanner can read it off the screen. If the data can't be encoded in that
 * symbology, falls back to Code 128, then QR.
 */
export function renderBarcode(data: string, type: string): RenderedBarcode {
  const primary = BCID[normalizeType(type)] ?? "code128";
  const candidates = [primary, "code128", "qrcode"].filter(
    (id, i, all) => all.indexOf(id) === i,
  );
  let lastError: unknown;
  for (const bcid of candidates) {
    try {
      const twoD = TWO_D.has(bcid) || bcid === "pdf417";
      // bwip-js rejects options that are present but undefined, so only add
      // linear-barcode options for linear symbologies.
      const svg = toSVG({
        bcid,
        text: data,
        scale: 3,
        paddingwidth: 8,
        paddingheight: 8,
        backgroundcolor: "FFFFFF",
        ...(twoD ? {} : { height: 18, includetext: true, textxalign: "center" }),
      });
      return { svg, aspectRatio: viewBoxAspect(svg), fallback: bcid !== primary };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
