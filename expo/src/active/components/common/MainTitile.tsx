// MainTitle.tsx

import { COLORS } from "@/src/active/constants/colors";
import { AntDesign } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import React from "react";
import { Text, View } from "react-native";

// 🌟 弧を描く5つの星の配置データ
const STARS_CONFIG = [
  { size: 24, x: -78, y: 18, rotate: "-24deg", opacity: 0.5 },
  { size: 30, x: -42, y: 4.5, rotate: "-12deg", opacity: 0.75 },
  { size: 36, x: 0, y: 0, rotate: "0deg", opacity: 1.0 },
  { size: 30, x: 42, y: 4.5, rotate: "12deg", opacity: 0.75 },
  { size: 24, x: 78, y: 18, rotate: "24deg", opacity: 0.5 },
];

export const MainTitle = () => {
  const [fontsLoaded] = useFonts({
    MPLUSRounded1c_800ExtraBold: require("@expo-google-fonts/m-plus-rounded-1c/800ExtraBold/MPLUSRounded1c_800ExtraBold.ttf"),
    MPLUSRounded1c_900Black: require("@expo-google-fonts/m-plus-rounded-1c/900Black/MPLUSRounded1c_900Black.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View className="items-center justify-center p-6 relative w-full">
      {/* ⚪️⚫️ 1. 背景の重なる黒石と白石 */}
      <View className="absolute -bottom-2 flex-row items-center justify-center w-full h-full">
        {/* 黒石 */}
        <View
          className="w-36 h-36 rounded-full absolute -translate-x-9 -translate-y-3 opacity-80"
          style={{
            backgroundColor: "#334155",
            shadowColor: "#64748b",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 9,
            elevation: 6,
          }}
        />
        {/* 白石 */}
        <View
          className="w-36 h-36 rounded-full absolute translate-x-9 translate-y-3 opacity-95 border border-slate-200"
          style={{
            backgroundColor: "#FFFFFF",
            shadowColor: "#94a3b8",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 9,
            elevation: 4,
          }}
        />
      </View>

      {/* 🏷️ 2. online go matches */}
      <View className="flex-row items-center justify-center mb-3 z-10 w-full">
        <Text
          className="text-[15px] text-slate-500 tracking-[4px] uppercase font-bold text-center"
          style={{ fontFamily: "MPLUSRounded1c_800ExtraBold" }}
        >
          ONLINE GO MATCHES
        </Text>
      </View>

      {/* 👑 3. メインエリア */}
      <View className="relative items-center justify-center pt-8 pb-9 z-10 w-full">
        {/* 🌠 5つの星 */}
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
                opacity: star.opacity,
              }}
            >
              <AntDesign name="star" size={star.size} color={COLORS.gold} />
            </View>
          ))}
        </View>

        {/* 🔤 「星碁」テキスト */}
        <View className="relative items-center justify-center w-full">
          {/* 1. 背景用の白いフチ */}
          <Text
            className="text-[120px] tracking-[12px] mb-0 leading-[144px] absolute text-center"
            style={{
              color: "#FFFFFF",
              fontFamily: "MPLUSRounded1c_900Black",
              textShadowColor: "rgba(255, 255, 255, 0.9)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 12,
            }}
          >
            星碁
          </Text>

          {/* 2. メインの文字 */}
          <Text
            className="text-[120px] tracking-[12px] mb-0 leading-[144px] text-center"
            style={{
              color: COLORS.primary,
              fontFamily: "MPLUSRounded1c_900Black",
              textShadowColor: "rgb(104, 114, 128)",
              textShadowOffset: { width: 1.5, height: 4.5 },
              textShadowRadius: 4.5,
            }}
          >
            星碁
          </Text>
        </View>

        {/* 📐 4. HOSHIGO */}
        <View className="absolute bottom-2 flex-row items-center justify-center z-30 w-full">
          <View className="h-[2px] w-8 bg-slate-300 rounded-full mr-3" />
          <Text
            className="text-[16.5px] text-textSub tracking-[8px] uppercase font-bold text-center"
            style={{ fontFamily: "MPLUSRounded1c_800ExtraBold" }}
          >
            HOSHIGO
          </Text>
          <View className="h-[2px] w-8 bg-slate-300 rounded-full ml-3" />
        </View>
      </View>
    </View>
  );
};