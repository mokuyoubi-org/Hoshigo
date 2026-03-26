import {
  BACKGROUND,
  CHOCOLATE,
  INACTIVE,
  STRAWBERRY,
  STRAWBERRY_DIM,
} from "@/src/constants/colors";
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { FontAwesome5, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

// カスタムタブアイコン（ふわふわアニメーション付き）
const TabIcon = ({
  icon,
  color,
  focused,
}: {
  icon: React.ReactNode;
  color: string;
  focused: boolean;
}) => {
  return (
    <View style={styles.iconWrapper}>
      {focused && (
        <>
          <View style={styles.iconGlow} />
          <View style={styles.iconDot} />
        </>
      )}
      <View style={[focused ? styles.iconActive : styles.iconInactive]}>
        {icon}
      </View>
    </View>
  );
};

export default function TabsLayout() {
  const { t } = useTranslation();
  useEffect(() => {
    async function setupNavBar() {
      if (Platform.OS === "android") {
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
      }
    }

    setupNavBar();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CHOCOLATE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: BACKGROUND,
          borderTopWidth: 1.5,
          borderTopColor: STRAWBERRY_DIM,
          height: Platform.OS === "ios" ? 88 : 80,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          paddingTop: 10,
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
        name="Home"
        options={{
          title: t("common.play"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<FontAwesome6 name="fire" color={color} size={20} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Watch"
        options={{
          title: t("common.watch"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<FontAwesome6 name="user-group" color={color} size={20} />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Rankings"
        options={{
          title: t("common.rankings"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<AntDesign name="crown" color={color} size={20} />}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="TsumegoList"
        options={{
          title: t("common.practice"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<FontAwesome5 name="school" size={24} color={color} />}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="PlayerPage"
        options={{
          title: t("common.myPage"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<MaterialIcons name="face" color={color} size={22} />}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 36,
  },
  // アクティブ時の淡いグロー
  iconGlow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(232,164,184,0.08)",
  },
  iconActive: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconInactive: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 32,
  },
  // アクティブタブの上部インジケーター
  iconDot: {
    position: "absolute",
    top: -10,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: STRAWBERRY,
  },
});
