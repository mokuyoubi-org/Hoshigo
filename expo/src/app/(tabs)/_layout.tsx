// @/src/app/(tabs)/_layout.tsx

import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/language/i18n";
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
    <View className="w-11 h-9 items-center justify-center">
      {focused && (
        <View className="absolute w-12 h-8 rounded-full bg-backgroundDark" />
      )}
      <View
        className={
          focused
            ? "items-center justify-center"
            : "items-center justify-center w-10 h-8"
        }
      >
        {icon}
      </View>
    </View>
  );
};

export default function TabsLayout() {
  const t = useTranslation();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setHidden(true);
    }
  }, []);

  return (
    <>
      {Platform.OS === "android" && <NavigationBar hidden />}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primaryDark,
          tabBarInactiveTintColor: COLORS.primary,
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
            backgroundColor: COLORS.foreground,
            borderTopWidth: 0,
            borderTopColor: "transparent",
            height: Platform.OS === "ios" ? 88 : 80,
            paddingBottom: Platform.OS === "ios" ? 24 : 10,
            paddingTop: 10,
            maxWidth: 680,
            width: "100%",
            alignSelf: "center",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 1.2,
            marginTop: 3,
          },
          tabBarItemStyle: {
            gap: 2,
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
    </>
  );
}
