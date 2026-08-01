import { COLORS } from "@/src/active/constants/colors";
import { useTranslation } from "@/src/active/hooks/useTranslation";
import { FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";

const TabIcon = ({
  icon,
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
        </>
      )}
      <View style={[focused ? styles.iconActive : styles.iconInactive]}>
        {icon}
      </View>
    </View>
  );
};

export default function TabsLayout() {
  const t = useTranslation();
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
        tabBarActiveTintColor: COLORS.primaryDark,
        tabBarInactiveTintColor: COLORS.primary,
        tabBarStyle: {
          backgroundColor: COLORS.foreground,
          borderTopWidth: 2,
          borderTopColor: COLORS.backgroundDark,
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
        name="Profile"
        options={{
          title: t("common.profile"),
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
    width: 48,
    height: 32,
    borderRadius: 48,
    backgroundColor: COLORS.backgroundDark,
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
});
