// import { router } from "expo-router";
// import React, { useContext } from "react";
// import {
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { TutorialCompletedIndexContext } from "../src/components/UserContexts";
// import { useTheme } from "../src/lib/useTheme";

// interface LessonItem {
//   title: string;
// }

// export default function LessonListPage() {
//   const { colors } = useTheme();
//   const tutorialCompletedIndex = useContext(TutorialCompletedIndexContext);

//   const lessons: LessonItem[] = [
//     {
//       title: "囲碁は陣地取りゲーム！",
//     },
//     {
//       title: "石は囲んだら取れる！？",
//     },
//     {
//       title: "打てない場所がある？",
//     },
//     {
//       title: "コウってなあに？",
//     },
//   ];

//   const handleLessonPress = (lessonId: number) => {
//     console.log("lessonId: ", lessonId);

//     // 講座ページに遷移（lessonIdを渡す）
//     router.push({
//       pathname: "/Tutorial",
//       params: { lessonId },
//     });
//   };

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: colors.background }]}
//     >
//       <View style={styles.container}>
//         <ScrollView
//           style={styles.content}
//           contentContainerStyle={styles.contentContainer}
//           showsVerticalScrollIndicator={false}
//         >
//           {/* ヘッダー */}
//           <View style={styles.header}>
//             <TouchableOpacity
//               style={styles.backButton}
//               onPress={() => router.push("/(tabs)/Practice")}
//             >
//               <Text style={[styles.backButtonText, { color: colors.active }]}>
//                 ‹ 戻る
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* 進捗サマリー */}
//           <View style={styles.progressCard}>
//             <View style={styles.progressHeader}>
//               <Text style={styles.progressTitle}>学習の進捗</Text>
//               <Text style={styles.progressPercentage}>
//                 {Math.round(
//                   (((tutorialCompletedIndex ?? -1) + 1) / lessons.length) * 100,
//                 )}
//                 %
//               </Text>
//             </View>
//             <View style={styles.progressBarContainer}>
//               <View
//                 style={[
//                   styles.progressBar,
//                   {
//                     width: `${
//                       (((tutorialCompletedIndex ?? -1) + 1) / lessons.length) *
//                       100
//                     }%`,
//                   },
//                 ]}
//               />
//             </View>
//             <Text style={styles.progressText}>
//               {(tutorialCompletedIndex ?? -1) + 1} / {lessons.length} 講座完了
//             </Text>
//           </View>

//           {/* 講座リスト */}
//           <View style={styles.lessonList}>
//             {lessons.map((lesson, index) => (
//               <TouchableOpacity
//                 key={index}
//                 style={styles.lessonCard}
//                 onPress={() => handleLessonPress(index)}
//                 activeOpacity={0.7}
//               >
//                 <View style={styles.lessonNumber}>
//                   <Text style={styles.lessonNumberText}>{index + 1}</Text>
//                 </View>

//                 <View style={styles.lessonContent}>
//                   <View style={styles.lessonHeader}>
//                     <Text style={styles.lessonTitle}>{lesson.title}</Text>
//                     {/* {lesson.completed && (
//                       <View style={styles.completedBadge}>
//                         <Text style={styles.completedText}>✓</Text>
//                       </View>
//                     )} */}
//                   </View>
//                 </View>

//                 <View style={styles.arrowContainer}>
//                   <Text style={styles.arrow}>›</Text>
//                 </View>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8f9fa",
//   },
//   header: {
//     marginBottom: 32,
//   },
//   backButton: {
//     marginBottom: 16,
//   },
//   backButtonText: {
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     padding: 20,
//     paddingBottom: 40,
//   },
//   // 進捗カード
//   progressCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 20,
//     marginBottom: 24,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   progressHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   progressTitle: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#2c3e50",
//   },
//   progressPercentage: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#3498db",
//   },
//   progressBarContainer: {
//     height: 8,
//     backgroundColor: "#ecf0f1",
//     borderRadius: 4,
//     overflow: "hidden",
//     marginBottom: 8,
//   },
//   progressBar: {
//     height: "100%",
//     backgroundColor: "#3498db",
//     borderRadius: 4,
//   },
//   progressText: {
//     fontSize: 14,
//     color: "#7f8c8d",
//   },
//   // 講座リスト
//   lessonList: {
//     gap: 12,
//   },
//   lessonCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 12,
//   },
//   lessonNumber: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: "#3498db",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 16,
//   },
//   lessonNumberText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   lessonContent: {
//     flex: 1,
//   },
//   lessonHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 6,
//   },
//   lessonTitle: {
//     fontSize: 17,
//     fontWeight: "bold",
//     color: "#2c3e50",
//     flex: 1,
//   },
//   completedBadge: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: "#2ecc71",
//     justifyContent: "center",
//     alignItems: "center",
//     marginLeft: 8,
//   },
//   completedText: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "bold",
//   },
//   lessonDescription: {
//     fontSize: 14,
//     color: "#7f8c8d",
//     marginBottom: 10,
//     lineHeight: 20,
//   },
//   lessonMeta: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   difficultyBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginRight: 12,
//   },
//   difficultyText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   durationText: {
//     fontSize: 13,
//     color: "#95a5a6",
//   },
//   arrowContainer: {
//     marginLeft: 12,
//   },
//   arrow: {
//     fontSize: 28,
//     color: "#bdc3c7",
//   },
//   // フッター
//   footer: {
//     marginTop: 24,
//     padding: 16,
//     backgroundColor: "#e8f4f8",
//     borderRadius: 12,
//     borderLeftWidth: 4,
//     borderLeftColor: "#3498db",
//   },
//   footerText: {
//     fontSize: 14,
//     color: "#2c3e50",
//     lineHeight: 20,
//   },
// });

import { router } from "expo-router";
import React, { useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TutorialCompletedIndexContext } from "../src/components/UserContexts";
import { useTheme } from "../src/lib/useTheme";

interface LessonItem {
  title: string;
}

export default function LessonListPage() {
  const { colors } = useTheme();
  const tutorialCompletedIndex = useContext(TutorialCompletedIndexContext);

  const lessons: LessonItem[] = [
    {
      title: "囲碁は陣地取りゲーム！",
    },
    {
      title: "石は囲んだら取れる！？",
    },
    {
      title: "打てない場所がある？",
    },
    {
      title: "コウってなあに？",
    },
  ];

  const handleLessonPress = (lessonId: number) => {
    console.log("lessonId: ", lessonId);

    // ロックされている講座はタップできない
    const isLocked = lessonId > (tutorialCompletedIndex ?? -1) + 1;
    if (isLocked) {
      return;
    }

    // 講座ページに遷移（lessonIdを渡す）
    router.push({
      pathname: "/Tutorial",
      params: { lessonId },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/Practice")}
            >
              <Text style={[styles.backButtonText, { color: colors.active }]}>
                ‹ 戻る
              </Text>
            </TouchableOpacity>
          </View>

          {/* 進捗サマリー */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>学習の進捗</Text>
              <Text style={styles.progressPercentage}>
                {Math.round(
                  (((tutorialCompletedIndex ?? -1) + 1) / lessons.length) * 100,
                )}
                %
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${
                      (((tutorialCompletedIndex ?? -1) + 1) / lessons.length) *
                      100
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {(tutorialCompletedIndex ?? -1) + 1} / {lessons.length} 講座完了
            </Text>
          </View>

          {/* 講座リスト */}
          <View style={styles.lessonList}>
            {lessons.map((lesson, index) => {
              const isCompleted = index <= (tutorialCompletedIndex ?? -1);
              const isLocked = index > (tutorialCompletedIndex ?? -1) + 1;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.lessonCard,
                    isLocked && styles.lessonCardLocked,
                  ]}
                  onPress={() => handleLessonPress(index)}
                  activeOpacity={isLocked ? 1 : 0.7}
                  disabled={isLocked}
                >
                  <View
                    style={[
                      styles.lessonNumber,
                      isCompleted && styles.lessonNumberCompleted,
                      isLocked && styles.lessonNumberLocked,
                    ]}
                  >
                    {isLocked ? (
                      <Text style={styles.lockIcon}>🔒</Text>
                    ) : isCompleted ? (
                      <Text style={styles.checkIcon}>✓</Text>
                    ) : (
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.lessonContent}>
                    <View style={styles.lessonHeader}>
                      <Text
                        style={[
                          styles.lessonTitle,
                          isLocked && styles.lessonTitleLocked,
                        ]}
                      >
                        {lesson.title}
                      </Text>
                      {isCompleted && (
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>完了</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.arrowContainer}>
                    <Text
                      style={[styles.arrow, isLocked && styles.arrowLocked]}
                    >
                      ›
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  // 進捗カード
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3498db",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#ecf0f1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  // 講座リスト
  lessonList: {
    gap: 12,
  },
  lessonCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  lessonCardLocked: {
    backgroundColor: "#f5f5f5",
    opacity: 0.6,
  },
  lessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lessonNumberCompleted: {
    backgroundColor: "#2ecc71",
  },
  lessonNumberLocked: {
    backgroundColor: "#bdc3c7",
  },
  lessonNumberText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  lockIcon: {
    fontSize: 20,
  },
  checkIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  lessonContent: {
    flex: 1,
  },
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
  },
  lessonTitleLocked: {
    color: "#95a5a6",
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#2ecc71",
    marginLeft: 8,
  },
  completedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  lessonDescription: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 10,
    lineHeight: 20,
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  difficultyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  durationText: {
    fontSize: 13,
    color: "#95a5a6",
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 28,
    color: "#bdc3c7",
  },
  arrowLocked: {
    color: "#d0d0d0",
  },
  // フッター
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#e8f4f8",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  footerText: {
    fontSize: 14,
    color: "#2c3e50",
    lineHeight: 20,
  },
});
