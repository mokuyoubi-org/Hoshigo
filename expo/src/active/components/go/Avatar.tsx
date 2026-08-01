import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { BLACK, Color, WHITE } from "@/src/stable/types/goTypes";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { GROUPS } from "../../constants/groups";

type Props = {
  groupIndex: number;
  iconIndex: number;
  size: number;
  color?: Color;
};

export const Avatar = ({ groupIndex, iconIndex, size, color }: Props) => {
  const groupColor =
    groupIndex !== 0
      ? COLORS[GROUPS[groupIndex].color as keyof typeof COLORS]
      : "transparent";

  const starCount =
    groupIndex >= 6 && groupIndex <= 17 ? ((groupIndex - 6) % 3) + 1 : 0;

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
            borderColor: groupColor,
            backgroundColor: COLORS.foreground,
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
                  color === BLACK ? COLORS.darkObject : COLORS.lightObject,
                borderWidth: color === WHITE ? 1 : 0,
                borderColor: COLORS.primary,
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
                <AntDesign
                  name="star"
                  size={starOuterSize}
                  color={COLORS.foreground}
                />
                <AntDesign
                  name="star"
                  size={starInnerSize}
                  color={groupColor}
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

const styles = StyleSheet.create({
  avatarBorder: {
    borderWidth: 4,
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
