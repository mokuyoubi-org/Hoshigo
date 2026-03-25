import { useTheme } from "@/src/hooks/useTheme";
import { Color } from "@/src/lib/goLogics";
import { GUMI_DATA } from "@/src/lib/gumiUtils";
import { ICONS } from "@/src/lib/icons";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

type Props = {
  gumiIndex: number;
  iconIndex: number;
  size: number; // 追加：デフォルト52
  color?: Color;
};

const AvatarComponent = ({ gumiIndex, iconIndex, size, color }: Props) => {
  const { colors } = useTheme();

  const gumiColor =
    gumiIndex !== 0
      ? colors[GUMI_DATA[gumiIndex].color as keyof typeof colors]
      : "transparent";

  const starCount =
    gumiIndex >= 6 && gumiIndex <= 17 ? ((gumiIndex - 6) % 3) + 1 : 0;

  const radius = (size / 2) * 1.05; // 円の半径
  const center = size / 2; // 中心座標
  const starOuterSize = size * 0.35;
  const starInnerSize = size * 0.3;
  const starOffset = starOuterSize / 2;

  // 9時方向（左）を中心に、上・中・下へ広がる角度
  const angles = [40, 0, -40]; // 度数法（9時方向 = 180°を基準）

  return (
    <View>
      <View
        style={[
          styles.avatarBorder,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderColor: gumiColor,
            backgroundColor: "#ffffff",
          },
        ]}
      >
        <Image
          source={ICONS[iconIndex]}
          style={{ width: size - 4, height: size - 4 }}
          resizeMode="contain"
        />

        {color && (
          <View
            style={[
              styles.stone,
              {
                backgroundColor:
                  color === "black" ? colors.blackStone : colors.whiteStone,
                borderWidth: color === "white" ? 1 : 0,
                borderColor: colors.borderColor,
              },
            ]}
          />
        )}

        {Array.from({ length: starCount }).map((_, i) => {
          const deg = 180 + angles[i]; // 9時方向を中心に展開
          const rad = (deg * Math.PI) / 180;

          const verticalOffset = size * 0.05; // ← この値で上下を調整（大きいほど上へ）

          const x = center + Math.cos(rad) * radius;
          const y = center + Math.sin(rad) * radius - verticalOffset; // ← ここに引くだけ

          return (
            <View
              key={i}
              style={[
                styles.starWrapper,
                {
                  left: x - starOffset,
                  top: y - starOffset,
                },
              ]}
            >
              <View style={styles.starStack}>
                <AntDesign name="star" size={starOuterSize} color="#ffffff" />
                <AntDesign
                  name="star"
                  size={starInnerSize}
                  color={gumiColor}
                  style={styles.starInner}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const Avatar = React.memo(AvatarComponent);

const styles = StyleSheet.create({
  avatarBorder: {
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  starWrapper: {
    position: "absolute",
  },
  starStack: {
    justifyContent: "center",
    alignItems: "center",
  },
  starInner: {
    position: "absolute",
  },
  stone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    bottom: -2,
    right: -2,
  },
});
