import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { renderBarcode } from "@/lib/render-barcode";

type Props = {
  data: string;
  type: string;
  /** Maximum width and height the barcode may take up. */
  maxWidth: number;
  maxHeight: number;
};

/** Renders a saved barcode as a scannable image (black on white). */
export function BarcodeImage({ data, type, maxWidth, maxHeight }: Props) {
  const rendered = useMemo(() => {
    try {
      return renderBarcode(data, type);
    } catch {
      return null;
    }
  }, [data, type]);

  if (!rendered) {
    return (
      <View style={[styles.error, { width: maxWidth }]}>
        <Text style={styles.errorText}>Can't draw this barcode</Text>
      </View>
    );
  }

  let width = maxWidth;
  let height = width / rendered.aspectRatio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * rendered.aspectRatio;
  }

  return (
    <View style={styles.paper}>
      <SvgXml xml={rendered.svg} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
  },
  error: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  errorText: {
    color: "#B00020",
  },
});
