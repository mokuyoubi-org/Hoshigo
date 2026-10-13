// SkeletonCard.tsx

import { MyImage } from "@/src/components/common/MyImage";
import { ICONS } from "@/src/constants/icons";
import { useThemeMode } from "@/src/hooks/common/useTheme";
import { View } from "react-native";

export const SkeletonCard = ({ height }: { height: number }) => {
  const { mode } = useThemeMode();
  return (
    <View
      className="items-center justify-center bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden"
      style={{ height }}
    >
      {/* overlayは絶対配置のまま背景として敷く */}
      <View className="absolute inset-0 bg-foreground" />

      {/* Flexフローに乗せるだけで中央に来る */}
      {mode === "light" && (
        <MyImage
          darkOpacity={0.4}
          source={ICONS[0]}
          className="rounded-xl z-10" // このopacityは許可
          style={{ width: 72, height: 72 }}
          contentFit="contain"
        />
      )}
    </View>
  );
};
