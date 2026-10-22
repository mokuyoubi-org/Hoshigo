/**
 * TerritoryResultButton.tsx
 * 地計算ボタン
 * - 計算中 → くるくる（押せない）
 * - 結果あり・普段 → 電卓アイコンだけ（タップで、結果と盤面の地を表示）
 * - 結果あり・表示中 → 電卓アイコン + 結果テキスト（背景が濃くなる）
 *     表示中は、局面や編集モードを変えると普段の状態に戻る
 * - 結果なし → 何も表示しない
 */

import { useColors } from "@/src/hooks/common/useTheme";
import { FontAwesome5 } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  isCalculating: boolean;
  onPress: () => void;
};

export const TerritoryResultButton = ({
  isCalculating,
  onPress,
}: Props) => {
  const colors = useColors();

  if (isCalculating) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.foreground,
            borderColor: colors.backgroundStrong,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <FontAwesome5 name="calculator" size={24} color={colors.foreground} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    height: 54,
    minWidth: 80,
    borderRadius: 24,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 14,
  },
});
