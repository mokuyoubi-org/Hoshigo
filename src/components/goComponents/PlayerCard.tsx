// import { useTheme } from "@/src/hooks/useTheme";
// import React from "react";
// import { StyleSheet, Text, View } from "react-native";
// import { Avatar } from "./Avatar";

// interface PlayerCardProps {
//   iconIndex: number;
//   username: string;
//   displayname: string;
//   color: "black" | "white";
//   time?: number;
//   points: number;
//   isActive?: boolean;
//   gumiIndex: number;
// }

// export const PlayerCard: React.FC<PlayerCardProps> = ({
//   iconIndex,
//   displayname,
//   color,
//   time,
//   isActive = false,
//   gumiIndex,
// }) => {
//   const { colors } = useTheme();
//   // const formatTime = (seconds: number) => {
//   //   const mins = Math.floor(seconds / 60);
//   //   const secs = seconds % 60;
//   //   return `${mins}:${secs.toString().padStart(2, "0")}`;
//   // };
//   return (
//     <View
//       style={[styles.container, isActive && { backgroundColor: colors.card }]}
//     >
//       <Avatar
//         gumiIndex={gumiIndex ?? 0}
//         iconIndex={iconIndex}
//         size={50}
//         color={color}
//       />

//       <View style={styles.textContainer}>
//         <Text style={[styles.displayname, { color: colors.text }]}>
//           {displayname}
//         </Text>
//       </View>
//       {/* <View>
//         {time !== undefined && (
//           <Text style={[styles.time, { color: colors.active }]}>
//             {formatTime(time)}
//           </Text>
//         )}
//       </View> */}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//     paddingVertical: 8,
//     borderRadius: 12,
//   },
//   textContainer: {
//     alignItems: "flex-start",
//   },
//   displayname: {
//     fontSize: 16,
//     fontWeight: "600",
//     letterSpacing: 0.3,
//   },
//   username: {
//     fontSize: 12,
//     fontWeight: "400",
//     letterSpacing: 0.3,
//   },
//   points: {
//     fontSize: 12,
//     fontWeight: "600",
//     letterSpacing: 0.3,
//     marginBottom: 2,
//   },
//   time: {
//     fontSize: 20,
//     fontWeight: "700",
//     letterSpacing: 0.5,
//   },
// });
