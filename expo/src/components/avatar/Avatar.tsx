// Avatar.tsx

import { Agehama } from "@/packages/go-components/src";
import { MyImage } from "@/src/components/common/MyImage";
import { ICONS } from "@/src/constants/icons";
import { RANKS } from "@/src/constants/ranks";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { AntDesign } from "@expo/vector-icons";
import { BLACK, Color } from "go-core";
import { View } from "react-native";

type Props = {
  rankIndex: number;
  iconIndex: number;
  size: number;
  playerColor?: Color;
  agehama?: number;
};

export const Avatar = ({
  rankIndex,
  iconIndex,
  size,
  playerColor,
  agehama,
}: Props) => {
  const colors = useColors();
  const fontFamily = useAppFont();
  // RANKS[rankIndex] が無かったら、whiteを使う
  const rankColor = colors[RANKS[rankIndex]?.color as keyof typeof colors];

  const starCount = rankIndex >= 0 && rankIndex <= 17 ? (rankIndex % 3) + 1 : 0;

  const radius = size * 0.54; // 円の半径
  const center = size * 0.5; // 中心座標
  const starOuterSize = size * 0.36;
  const starInnerSize = size * 0.3;
  const starOffset = size * 0.2;

  // 数字を入れるので石を少し大きめにする（元は 0.45）
  const stoneSize = size * 0.4;
  const stoneRadius = size * 0.2;

  // 9時方向（左）を中心に、上・中・下へ広がる角度
  const angles = [40, 0, -40]; // 度数法（9時方向 = 180°を基準）

  return (
    <View>
      <View
        className="justify-center items-center relative"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          borderColor: rankColor,
          borderWidth: Math.max(size * 0.08, 4),
          backgroundColor:
            playerColor === BLACK ? colors.blackStone : colors.whiteStone, // うさぎか否か
        }}
      >
        <MyImage
          source={ICONS[iconIndex]}
          style={{ width: size * 0.8, height: size * 0.8 }}
          contentFit="contain"
        />

        {playerColor && agehama !== undefined && agehama !== 0 && (
          <View
            className={`absolute -bottom-1 -right-1 justify-center items-center border-2`}
            style={{
              width: stoneSize,
              height: stoneSize,
              borderRadius: stoneRadius,
              borderColor: colors.blackStone + "aa",
              backgroundColor:
                playerColor === BLACK ? colors.whiteStone : colors.blackStone,
            }}
          >
            {agehama !== undefined && agehama !== 0 && (
              <Agehama
                count={agehama}
                color={
                  (playerColor === BLACK
                    ? colors.blackStone
                    : colors.whiteStone) + "aa"
                }
                size={stoneSize}
                fontFamily={fontFamily}
              />
            )}
          </View>
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
                  color={colors.foreground}
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
