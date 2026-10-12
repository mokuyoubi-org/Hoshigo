// @/src/app/(tabs)/_layout.tsx

import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useTranslation } from "@/src/i18n/LangProvider";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { NavigationBar } from "expo-navigation-bar";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, View } from "react-native";

const TabIcon = ({
  icon,
  focused,
}: {
  icon: React.ReactNode;
  focused: boolean;
}) => {
  return (
    <View className="items-center justify-center">
      {focused && (
        <View className="absolute w-12 h-12 rounded-full bg-backgroundStrong" />
      )}
      {icon}
    </View>
  );
};

export default function TabsLayout() {
  const t = useTranslation();
  const colors = useColors();
  // 🔤 いまの言語に合うフォント(タブの文字に使う)
  const fontFamily = useAppFont();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setHidden(true);
    }
  }, []);

  return (
    // 外枠のViewで全体の背景色を指定する！
    <View style={{ flex: 1, backgroundColor: colors.foreground }}>
      {Platform.OS === "android" && <NavigationBar hidden />}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryStrong,
          tabBarInactiveTintColor: colors.primary,
          // 💡 Webでは標準ボタン（undefined）にしてリロードを防止
          // ネイティブ（Android等）では Pressable を使ってリップルを非表示にする
          // 冗長なようだが、これは絶対に必要なので簡略化などは厳禁
          tabBarButton:
            Platform.OS === "web"
              ? undefined
              : (props) => {
                  const { ref, ...restProps } = props as any;
                  return <Pressable {...restProps} android_ripple={null} />;
                },
          tabBarStyle: {
            backgroundColor: colors.foreground,
            borderTopWidth: 0,
            borderTopColor: "transparent",
            height: Platform.OS === "ios" ? 88 : 80,
            paddingBottom: Platform.OS === "ios" ? 24 : 10,
            paddingTop: 10,
            maxWidth: 640,
            width: "100%",
            alignSelf: "center",
          },
          tabBarLabelStyle: {
            fontFamily,
            fontSize: 14,
            letterSpacing: 1.2,
            includeFontPadding: false, // ⚠️Android用。大事
          },
        }}
      >
        <Tabs.Screen
          name="HomeScreen"
          options={{
            title: t("common.play"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                focused={focused}
                icon={<FontAwesome6 name="fire" color={color} size={20} />}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="ProfileScreen"
          options={{
            title: t("common.profile"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                focused={focused}
                icon={<MaterialIcons name="face" color={color} size={22} />}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
