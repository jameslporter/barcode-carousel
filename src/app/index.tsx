import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { BarcodeImage } from "@/components/barcode-image";
import {
  deleteBarcode,
  displayName,
  loadBarcodes,
  renameBarcode,
  type SavedBarcode,
  typeLabel,
} from "@/lib/barcodes";

export default function Home() {
  const { width, height } = useWindowDimensions();
  const [barcodes, setBarcodes] = useState<SavedBarcode[] | null>(null);
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  // Reload whenever the screen comes back into focus, e.g. after scanning.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadBarcodes().then((list) => {
        if (!active) return;
        setBarcodes(list);
        setIndex(0);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const startRename = (item: SavedBarcode) => {
    setDraftName(item.name ?? "");
    setEditingId(item.id);
  };

  const finishRename = async () => {
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    setBarcodes(await renameBarcode(id, draftName));
  };

  const remove = (item: SavedBarcode) => {
    const doDelete = async () => setBarcodes(await deleteBarcode(item.id));
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${displayName(item)}"?`)) doDelete();
      return;
    }
    Alert.alert(`Delete "${displayName(item)}"?`, `${typeLabel(item.type)}: ${item.data}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);
  };

  if (barcodes === null) return <View style={styles.empty} />;

  if (barcodes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>No barcodes yet</Text>
        <Text style={styles.subtitle}>
          Tap + to scan a loyalty card, ticket or anything with a barcode.
        </Text>
        <Link href="/scan" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Scan a barcode</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const cardWidth = Math.min(width - 48, 520);
  const cardMaxHeight = Math.min(height * 0.45, 360);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        data={barcodes}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width, height: listHeight }]}>
            <View style={[styles.card, { width: cardWidth }]}>
              <BarcodeImage
                data={item.data}
                type={item.type}
                maxWidth={cardWidth - 32}
                maxHeight={cardMaxHeight}
              />
              <Text style={styles.meta} numberOfLines={2} selectable>
                {typeLabel(item.type)} · {item.data}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => startRename(item)} hitSlop={8}>
                  <Text style={styles.action}>Rename</Text>
                </Pressable>
                <Pressable onPress={() => remove(item)} hitSlop={8}>
                  <Text style={[styles.action, styles.delete]}>Delete</Text>
                </Pressable>
              </View>
              <View style={styles.nameRow}>
                {editingId === item.id ? (
                  <TextInput
                    style={[styles.name, styles.nameInput]}
                    value={draftName}
                    onChangeText={setDraftName}
                    onSubmitEditing={finishRename}
                    onBlur={finishRename}
                    placeholder="Name this barcode"
                    autoFocus
                    maxLength={60}
                    returnKeyType="done"
                    accessibilityLabel="Barcode name"
                  />
                ) : (
                  <Pressable
                    onPress={() => startRename(item)}
                    accessibilityRole="button"
                    accessibilityHint="Rename this barcode"
                  >
                    <Text
                      style={[styles.name, !item.name && styles.nameMissing]}
                      numberOfLines={2}
                    >
                      {displayName(item)}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      />
      {barcodes.length > 1 && (
        <View style={styles.dots}>
          {barcodes.map((b, i) => (
            <View
              key={b.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
    color: "#5F6B7A",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 24,
  },
  action: {
    fontSize: 15,
    color: "#208AEF",
  },
  delete: {
    color: "#D93025",
  },
  nameRow: {
    alignSelf: "stretch",
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D5DAE0",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  nameMissing: {
    color: "#8A94A0",
    fontWeight: "600",
  },
  nameInput: {
    alignSelf: "stretch",
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: "#208AEF",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C4CBD3",
  },
  dotActive: {
    backgroundColor: "#208AEF",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
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
});
