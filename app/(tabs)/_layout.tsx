import { FontAwesome5, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Platform, StyleSheet, View } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

// Homeページに合わせたカラー
const STRAWBERRY = "#c8d6e6";
const STRAWBERRY_DIM = "rgba(200,214,230,0.15)";
const BG = "#f9fafb";
const INACTIVE = "rgba(90,58,74,0.35)";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

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
  const floating = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;

  useEffect(() => {
    if (focused) {
      // ふわふわアニメーション
      Animated.loop(
        Animated.sequence([
          Animated.timing(floating, {
            toValue: -2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floating, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // スケールアニメーション
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scale, {
        toValue: 0.9,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  return (
    <View style={styles.iconWrapper}>
      {focused && (
        <>
          <View style={styles.iconGlow} />
          <View style={styles.iconDot} />
        </>
      )}
      <Animated.View
        style={[
          focused ? styles.iconActive : styles.iconInactive,
          {
            transform: [
              { translateY: focused ? floating : 0 },
              { scale },
            ],
          },
        ]}
      >
        {icon}
      </Animated.View>
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
          backgroundColor: BG,
          borderTopWidth: 1.5,
          borderTopColor: STRAWBERRY_DIM,
          height: Platform.OS === "ios" ? 88 : 72,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          paddingTop: 10,
          // 柔らかい影
          shadowColor: STRAWBERRY,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
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
          title: t("Tabs.home"),
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
          title: t("Tabs.watch"),
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
          title: t("Tabs.rankings"),
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
          title: t("Tabs.practice"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={<FontAwesome5 name="school" size={24} color={color}  />}
            />
          ),
        }}
      />

      
      <Tabs.Screen
        name="MyPage"
        options={{
          title: t("Tabs.myPage"),
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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
});