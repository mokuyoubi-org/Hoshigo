import { COLORS } from "@/src/active/constants/colors";
import { ICONS } from "@/src/active/constants/icons";
import { AntDesign } from "@expo/vector-icons";
import { BLACK, Color, WHITE } from "expo-goband";
import React from "react";
import { Image, View } from "react-native";
import { RANKS } from "../../constants/ranks";

type Props = {
  rankIndex: number;
  iconIndex: number;
  size: number;
  playerColor?: Color;
};

export const Avatar = ({ rankIndex, iconIndex, size, playerColor }: Props) => {
  // RANKS[rankIndex] が無かったら、whiteを使う
  const rankColor =
    COLORS[RANKS[rankIndex]?.color as keyof typeof COLORS] ?? COLORS.white;

  const starCount = rankIndex >= 0 && rankIndex <= 17 ? (rankIndex % 3) + 1 : 0;

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
        className="border-[4px] justify-center items-center relative"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: rankColor,
          backgroundColor: COLORS.foreground,
        }}
      >
        <Image
          source={ICONS[iconIndex]}
          style={{ width: size - 4, height: size - 4 }}
          resizeMode="contain"
        />

        {playerColor && (
          <View
            className={`w-[20px] h-[20px] rounded-full absolute -bottom-[2px] -right-[2px] ${
              playerColor === WHITE ? "border-[1px] border-primary" : ""
            }`}
            style={{
              backgroundColor:
                playerColor === BLACK ? COLORS.darkObject : COLORS.lightObject,
            }}
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
              className="absolute"
              style={{
                left: x - starOffset,
                top: y - starOffset,
              }}
            >
              <View className="justify-center items-center">
                <AntDesign
                  name="star"
                  size={starOuterSize}
                  color={COLORS.foreground}
                />
                <AntDesign
                  name="star"
                  size={starInnerSize}
                  color={rankColor}
                  className="absolute"
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
