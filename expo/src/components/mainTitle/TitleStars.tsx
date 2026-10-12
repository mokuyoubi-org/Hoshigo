import { useColors } from "@/src/hooks/common/useTheme";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { STARS_CONFIG } from "./constants";

// 🌠 5つの星
export const TitleStars = () => {
  const colors = useColors();
  return (
    <View className="absolute -top-3 flex-row items-center justify-center w-full h-12 z-20">
      {STARS_CONFIG.map((star, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            transform: [
              { translateX: star.x },
              { translateY: star.y },
              { rotate: star.rotate },
            ],
          }}
        >
          <AntDesign name="star" size={star.size} color={colors.gold} />
        </View>
      ))}
    </View>
  );
};
