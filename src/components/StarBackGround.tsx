// // src/components/StarBackground.tsx
// import { Octicons } from "@expo/vector-icons";
// import { BlurView } from "expo-blur";
// import React, { useRef } from "react";
// import { Animated, Dimensions, StyleSheet, View } from "react-native";

// const { width, height } = Dimensions.get("window");

// const STRAWBERRY = "#c8d6e6";
// const STAR_COLS = width / 80;
// const STAR_ROWS = height / 80;
// const STAR_SIZE = Math.floor((width / STAR_COLS) * 0.2);
// // const ANIM_DURATION = 2800;

// function pseudoRandom(seed: number): number {
//   const x = Math.sin(seed + 1) * 43758.5453;
//   return x - Math.floor(x);
// }

// type StarData = {
//   col: number;
//   row: number;
//   color: "dark" | "light";
//   rotation: number;
// };

// const STARS: StarData[] = [];
// for (let r = 0; r < STAR_ROWS; r++) {
//   for (let c = 0; c < STAR_COLS; c++) {
//     const seed = r * 100 + c;
//     STARS.push({
//       col: c,
//       row: r,
//       color: (r + c) % 2 === 0 ? "dark" : "light",
//       rotation: (pseudoRandom(seed * 7) - 0.5) * 18,
//     });
//   }
// }

// type Props = {
//   blurIntensity?: number;
//   blurTint?: "light" | "dark" | "default";
// };

// export const StarBackground = ({
//   blurIntensity = 8,
//   blurTint = "light",
// }: Props) => {
//   const cellW = width / STAR_COLS;
//   const cellH = height / STAR_ROWS;
//   const anim = useRef(new Animated.Value(0)).current;

//   // useEffect(() => {
//   //   Animated.loop(
//   //     Animated.sequence([
//   //       Animated.timing(anim, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
//   //       Animated.timing(anim, { toValue: 0, duration: ANIM_DURATION, useNativeDriver: true }),
//   //     ]),
//   //   ).start();
//   // }, []);

//   const darkScale = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.88, 1.08],
//   });
//   const darkOpacity = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.14, 0.07],
//   });
//   const lightScale = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [1.08, 0.88],
//   });
//   const lightOpacity = anim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0.42, 0.58],
//   });

//   return (
//     <>
//       <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
//         {STARS.map(({ col, row, color, rotation }, i) => {
//           const scale = color === "dark" ? darkScale : lightScale;
//           const opacity = color === "dark" ? darkOpacity : lightOpacity;
//           return (
//             <Animated.View
//               key={i}
//               style={{
//                 position: "absolute",
//                 width: STAR_SIZE,
//                 height: STAR_SIZE,
//                 left: col * cellW + cellW / 2 - STAR_SIZE / 2,
//                 top: row * cellH + cellH / 2 - STAR_SIZE / 2,
//                 opacity,
//                 transform: [{ scale }, { rotate: `${rotation}deg` }],
//               }}
//             >
//               <Octicons
//                 name="star-fill"
//                 size={color === "dark" ? STAR_SIZE * 1.6 : STAR_SIZE}
//                 color={color === "dark" ? "#8a6a75" : STRAWBERRY}
//               />
//             </Animated.View>
//           );
//         })}
//       </View>

//       <BlurView
//         intensity={blurIntensity}
//         tint={blurTint}
//         style={StyleSheet.absoluteFillObject}
//       />
//     </>
//   );
// };



// src/components/StarBackground.tsx
import { BlurView } from "expo-blur";
import React, { useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

const STRAWBERRY = "#c8d6e6";
const STAR_COLS = width / 80;
const STAR_ROWS = height / 80;
const STAR_SIZE = Math.floor((width / STAR_COLS) * 0.2);

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

type StarData = {
  col: number;
  row: number;
  color: "dark" | "light";
  rotation: number;
};

const STARS: StarData[] = [];
for (let r = 0; r < STAR_ROWS; r++) {
  for (let c = 0; c < STAR_COLS; c++) {
    const seed = r * 100 + c;
    STARS.push({
      col: c,
      row: r,
      color: (r + c) % 2 === 0 ? "dark" : "light",
      rotation: (pseudoRandom(seed * 7) - 0.5) * 18,
    });
  }
}

type Props = {
  blurIntensity?: number;
  blurTint?: "light" | "dark" | "default";
};

export const StarBackground = ({
  blurIntensity = 8,
  blurTint = "light",
}: Props) => {
  const cellW = width / STAR_COLS;
  const cellH = height / STAR_ROWS;
  const anim = useRef(new Animated.Value(0)).current;

  const darkScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1.08],
  });
  const darkOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, 0.07],
  });
  const lightScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 0.88],
  });
  const lightOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.58],
  });

  return (
    <>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {STARS.map(({ col, row, color, rotation }, i) => {
          const scale = color === "dark" ? darkScale : lightScale;
          const opacity = color === "dark" ? darkOpacity : lightOpacity;
          const size = color === "dark" ? STAR_SIZE * 1.6 : STAR_SIZE;
          const starColor = color === "dark" ? "#8a6a75" : STRAWBERRY;
          return (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                width: STAR_SIZE,
                height: STAR_SIZE,
                left: col * cellW + cellW / 2 - STAR_SIZE / 2,
                top: row * cellH + cellH / 2 - STAR_SIZE / 2,
                opacity,
                transform: [{ scale }, { rotate: `${rotation}deg` }],
              }}
            >
              <Text style={{ fontFamily: "Octicons", fontSize: size, color: starColor }}>
                {"\uF00A"}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={StyleSheet.absoluteFillObject}
      />
    </>
  );
};