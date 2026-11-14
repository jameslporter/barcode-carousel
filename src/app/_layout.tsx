import { Link, Stack } from "expo-router";
import { Pressable } from "react-native";

import { PlusIcon } from "@/components/plus-icon";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Barcodes",
          headerRight: () => (
            <Link href="/scan" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan a new barcode"
                hitSlop={12}
                style={{ paddingHorizontal: 4 }}
              >
                <PlusIcon size={26} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="scan"
        options={{ title: "Scan barcode", presentation: "modal" }}
      />
    </Stack>
  );
}
