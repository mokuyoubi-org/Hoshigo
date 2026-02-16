// import { FontAwesome5, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
// import AntDesign from "@expo/vector-icons/AntDesign";
// import { Tabs } from "expo-router";
// import React, { useContext } from "react";
// import { ThemeContext } from "../../src/components/UserContexts";
// import { THEME_COLORS } from "../../src/lib/colors";

// export default function TabsLayout() {
//   const theme = useContext(ThemeContext);
//   const colors = THEME_COLORS[theme || "light"];

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: colors.active,
//         tabBarInactiveTintColor: colors.inactive,
//         tabBarStyle: {
//           backgroundColor: colors.tab,
//           height: 80,
//           paddingBottom: 8,
//           paddingTop: 8,
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: "600",
//           letterSpacing: 0.3,
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="Home"
//         options={{
//           title: "対局",
//           tabBarIcon: ({ color, size }) => (
//             <FontAwesome6 name="fire" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="Watch"
//         options={{
//           title: "観戦",
//           tabBarIcon: ({ color, size }) => (
//             <FontAwesome6 name="user-group" color={color} size={size} />
//           ),
//         }}
//       />
//       <Tabs.Screen
//         name="Rankings"
//         options={{
//           title: "ランキング",
//           tabBarIcon: ({ color, size }) => (
//             <AntDesign name="crown" color={color} size={size} />
//           ),
//         }}
//       />
// {/*
//       <Tabs.Screen
//         name="Practice"
//         options={{
//           title: "練習",
//           tabBarIcon: ({ color, size }) => (
//             <FontAwesome5 name="school" color={color} size={size} />
//           ),
//         }}
//       /> */}
//       {/* <Tabs.Screen
//         name="Tsumego"
//         options={{
//           title: "詰碁",
//           tabBarIcon: ({ color, size }) => (
//             <FontAwesome6 name="bolt-lightning" color={color} size={size} />
//           ),
//         }}
//       /> */}

//       <Tabs.Screen
//         name="MyPage"
//         options={{
//           title: "マイページ",
//           tabBarIcon: ({ color, size }) => (
//             <MaterialIcons name="face" color={color} size={size} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }

import { FontAwesome5, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Tabs } from "expo-router";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "../../src/components/UserContexts";
import { THEME_COLORS } from "../../src/constants/colors";

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useContext(ThemeContext);
  const colors = THEME_COLORS[theme || "light"];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.tab,
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: t("Tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="fire" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Watch"
        options={{
          title: t("Tabs.watch"),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="user-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Rankings"
        options={{
          title: t("Tabs.rankings"),
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="crown" color={color} size={size} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="Practice"
        options={{
          title: "練習",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="school" color={color} size={size} />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="Tsumego"
        options={{
          title: "詰碁",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="bolt-lightning" color={color} size={size} />
          ),
        }}
      /> */}

      <Tabs.Screen
        name="MyPage"
        options={{
          title: t("Tabs.myPage"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="face" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
