// import { router } from "expo-router";
// import React from "react";
// import {
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useTheme } from "../../src/lib/useTheme";

// interface PracticePageProps {
//   navigation: any; // React Navigationを使用する場合
// }

// const PracticePage: React.FC<PracticePageProps> = () => {
//   const { colors } = useTheme();

//   const menuItems = [
//     {
//       id: 1,
//       title: "囲碁講座",
//       description: "基礎から学ぶ囲碁のルール",
//       // icon: "📚",
//       route: "Tutorial",
//       color: "#3498db",
//     },
//     {
//       id: 2,
//       title: "詰碁",
//       description: "9路盤で石を取る練習",
//       // icon: "🧩",
//       route: "Tsumego",
//       color: "#e74c3c",
//     },
//     {
//       id: 3,
//       title: "対局練習",
//       description: "コンピューターと対局",
//       icon: "⚔️",
//       route: "Game",
//       color: "#2ecc71",
//       disabled: true, // 未実装
//     },
//     {
//       id: 4,
//       title: "定石学習",
//       description: "基本定石を覚える",
//       icon: "📖",
//       route: "Joseki",
//       color: "#f39c12",
//       disabled: true, // 未実装
//     },
//   ];

//   const handleNavigate = (route: string) => {
//     // React Navigationを使用する場合
//     if (route === "Tsumego") {
//       router.push("/Tsumego");
//     } else if (route === "Tutorial") {
//       router.push("/TutorialList");
//     }
//   };

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: colors.background }]}
//     >
//       <View style={styles.container}>
//         {/* <View style={styles.header}>
//           <Text style={styles.headerTitle}>囲碁練習</Text>
//           <Text style={styles.headerSubtitle}>
//             あなたの囲碁スキルを向上させましょう
//           </Text>
//         </View> */}

//         <ScrollView
//           style={styles.content}
//           contentContainerStyle={styles.contentContainer}
//         >
//           <View style={styles.grid}>
//             {menuItems.map((item) => (
//               <TouchableOpacity
//                 key={item.id}
//                 style={[styles.card]}
//                 onPress={() => handleNavigate(item.route)}
//               >
//                 <View
//                   style={[
//                     styles.iconContainer,
//                     { backgroundColor: item.color },
//                   ]}
//                 >
//                   {/* <Text style={styles.icon}>{item.icon}</Text> */}
//                 </View>
//                 <View style={styles.cardContent}>
//                   <Text style={styles.cardTitle}>{item.title}</Text>
//                   <Text style={styles.cardDescription}>{item.description}</Text>
//                 </View>
//                 {<Text style={styles.arrow}>→</Text>}
//               </TouchableOpacity>
//             ))}
//           </View>

//           {/* <View style={styles.statsSection}>
//             <Text style={styles.statsSectionTitle}>あなたの進捗</Text>
//             <View style={styles.statsGrid}>
//               <View style={styles.statCard}>
//                 <Text style={styles.statNumber}>3</Text>
//                 <Text style={styles.statLabel}>完了した講座</Text>
//               </View>
//               <View style={styles.statCard}>
//                 <Text style={styles.statNumber}>12</Text>
//                 <Text style={styles.statLabel}>解いた詰碁</Text>
//               </View>
//               <View style={styles.statCard}>
//                 <Text style={styles.statNumber}>5</Text>
//                 <Text style={styles.statLabel}>連続正解</Text>
//               </View>
//             </View>
//           </View> */}
//         </ScrollView>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8f9fa",
//   },
//   header: {
//     backgroundColor: "#2c3e50",
//     padding: 20,
//     paddingTop: 20,
//     paddingBottom: 30,
//   },
//   headerTitle: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 8,
//   },
//   headerSubtitle: {
//     fontSize: 16,
//     color: "#ecf0f1",
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     padding: 20,
//   },
//   grid: {
//     gap: 15,
//   },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//     marginBottom: 15,
//   },
//   cardDisabled: {
//     opacity: 0.6,
//   },
//   iconContainer: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 15,
//   },
//   icon: {
//     fontSize: 30,
//   },
//   cardContent: {
//     flex: 1,
//   },
//   cardTitle: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#2c3e50",
//     marginBottom: 4,
//   },
//   cardDescription: {
//     fontSize: 14,
//     color: "#7f8c8d",
//   },
//   comingSoonBadge: {
//     backgroundColor: "#95a5a6",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     alignSelf: "flex-start",
//     marginTop: 6,
//   },
//   comingSoonText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   arrow: {
//     fontSize: 24,
//     color: "#bdc3c7",
//     marginLeft: 10,
//   },
//   statsSection: {
//     marginTop: 30,
//     marginBottom: 20,
//   },
//   statsSectionTitle: {
//     fontSize: 22,
//     fontWeight: "bold",
//     color: "#2c3e50",
//     marginBottom: 15,
//   },
//   statsGrid: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     gap: 10,
//   },
//   statCard: {
//     flex: 1,
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 20,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   statNumber: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: "#3498db",
//     marginBottom: 5,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: "#7f8c8d",
//     textAlign: "center",
//   },
//   tipSection: {
//     backgroundColor: "#fff3cd",
//     borderRadius: 12,
//     padding: 20,
//     borderLeftWidth: 4,
//     borderLeftColor: "#f39c12",
//     marginTop: 10,
//   },
//   tipTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#856404",
//     marginBottom: 10,
//   },
//   tipText: {
//     fontSize: 15,
//     color: "#856404",
//     lineHeight: 22,
//   },
// });

// export default PracticePage;
