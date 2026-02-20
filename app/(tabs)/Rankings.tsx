

// import LoadingOverlay from "@/src/components/LoadingOverlay";
// import { ICONS } from "@/src/constants/icons";
// import { useTheme } from "@/src/hooks/useTheme";
// import { GUMI_DATA } from "@/src/lib/gumiUtils";
// import { supabase } from "@/src/services/supabase";
// import React, { useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   FlatList,
//   Image,
//   StatusBar as RNStatusBar,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { StatusBar } from "expo-status-bar";

// // ─── 定数 ─────────────────────────────────────────────
// const GOLD   = "#c9a84c";
// const SILVER = "#a8a8b3";
// const BRONZE = "#cd7f32";
// const BG     = "#08080e";

// const RANK_COLORS: Record<number, { color: string; label: string }> = {
//   1: { color: GOLD,   label: "I"   },
//   2: { color: SILVER, label: "II"  },
//   3: { color: BRONZE, label: "III" },
// };

// // ─── 型定義（変更なし） ───────────────────────────────
// type Profile = {
//   uid: string;
//   displayname: string;
//   points: number;
//   gumi_index: number;
//   icon_index: number;
// };

// // ─── RankingItem（UIのみ変更） ────────────────────────
// const RankingItem = ({
//   item,
//   index,
//   colors,
// }: {
//   item: Profile;
//   index: number;
//   colors: any;
// }) => {
//   const rank = index + 1;
//   const gumiColor = GUMI_DATA[item.gumi_index].color;
//   const rankMeta = RANK_COLORS[rank];
//   const isTop3 = rank <= 3;

//   return (
//     <View style={[styles.itemContainer, isTop3 && styles.itemContainerTop3]}>
//       <View style={[styles.card, isTop3 && { borderColor: `${rankMeta.color}40` }]}>
//         {/* 上位3位はカード上部にカラーアクセントライン */}
//         {isTop3 && (
//           <View style={[styles.cardAccentLine, { backgroundColor: rankMeta.color }]} />
//         )}

//         <View style={styles.cardContent}>
//           {/* 順位 */}
//           {isTop3 ? (
//             <View style={[styles.topRankBadge, { borderColor: `${rankMeta.color}60`, backgroundColor: `${rankMeta.color}12` }]}>
//               <Text style={[styles.topRankText, { color: rankMeta.color }]}>
//                 {rankMeta.label}
//               </Text>
//             </View>
//           ) : (
//             <View style={styles.normalRank}>
//               <Text style={styles.normalRankText}>{rank}</Text>
//             </View>
//           )}

//           {/* アバター */}
//           <View style={styles.avatarContainer}>
//             <View
//               style={[
//                 styles.avatarBorder,
//                 {
//                   borderColor: isTop3
//                     ? rankMeta.color
//                     : gumiColor !== "shirogumi"
//                     ? colors[gumiColor]
//                     : null,
//                   // backgroundColor: "#f4f4f4",
//                   shadowColor: isTop3 ? rankMeta.color : "transparent",
//                   shadowOpacity: isTop3 ? 0.6 : 0,
//                   shadowRadius: isTop3 ? 8 : 0,
//                 },
//               ]}
//             >
//               <Image
//                 source={ICONS[item.icon_index]}
//                 style={styles.avatarIcon}
//                 resizeMode="contain"
//               />
//             </View>
//           </View>

//           {/* 名前 */}
//           <View style={styles.infoContainer}>
//             <Text
//               style={[styles.name, isTop3 && { color: "#f0ebe3" }]}
//               numberOfLines={1}
//             >
//               {item.displayname}
//             </Text>
//             <Text style={styles.pointsText}>{item.points.toLocaleString()} pt</Text>
//           </View>

//           {/* 右端の装飾ライン（上位3のみ） */}
//           {isTop3 && (
//             <View style={[styles.rankGlowLine, { backgroundColor: rankMeta.color }]} />
//           )}
//         </View>
//       </View>
//     </View>
//   );
// };

// // ─── メインコンポーネント ──────────────────────────────
// export default function Rankings() {
//   const { t } = useTranslation();
//   const { colors } = useTheme();

//   // ── ロジック（変更なし） ──
//   const [profiles, setProfiles] = useState<Profile[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchTopProfiles = async () => {
//       const { data, error } = await supabase
//         .from("profiles")
//         .select("uid, displayname, points, gumi_index, icon_index")
//         .order("points", { ascending: false })
//         .limit(100);

//       if (error) {
//         console.error(error);
//       } else {
//         setProfiles(data ?? []);
//       }
//       setLoading(false);
//     };

//     fetchTopProfiles();
//   }, []);

//   // ── UI ──
//   return (
//     <SafeAreaView style={styles.container}>
//       <RNStatusBar barStyle="light-content" backgroundColor={BG} />
//       <StatusBar style="light" />

//       {/* 背景グリッド */}
//       <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
//         {Array.from({ length: 5 }).map((_, i) => (
//           <View
//             key={`v${i}`}
//             style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
//           />
//         ))}
//         {Array.from({ length: 7 }).map((_, i) => (
//           <View
//             key={`h${i}`}
//             style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
//           />
//         ))}
//       </View>

//       {/* ページタイトル */}
//       <View style={styles.pageHeader}>
//         <View style={styles.pageTitleRow}>
//           <View style={styles.pageTitleAccent} />
//           <Text style={styles.pageTitle}>{t("Rankings.title")}</Text>
//         </View>
//         <Text style={styles.pageSubtitle}>{t("Rankings.subtitle")}</Text>
//       </View>

//       {/* リスト */}
//       <FlatList
//         data={profiles}
//         keyExtractor={(item) => item.uid}
//         renderItem={({ item, index }) => (
//           <RankingItem item={item} index={index} colors={colors} />
//         )}
//         contentContainerStyle={styles.listContent}
//         showsVerticalScrollIndicator={false}
//       />

//       {loading && <LoadingOverlay text={t("Rankings.loading")} />}
//     </SafeAreaView>
//   );
// }

// // ─── スタイル ──────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BG,
//   },

//   // 背景グリッド
//   bgLineV: {
//     position: "absolute",
//     top: 0,
//     width: 1,
//     height: "100%",
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },
//   bgLineH: {
//     position: "absolute",
//     left: 0,
//     width: "100%",
//     height: 1,
//     backgroundColor: "rgba(201,168,76,0.05)",
//   },

//   // ページヘッダー
//   pageHeader: {
//     paddingHorizontal: 24,
//     paddingTop: 8,
//     paddingBottom: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(201,168,76,0.1)",
//   },
//   pageTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     marginBottom: 3,
//   },
//   pageTitleAccent: {
//     width: 3,
//     height: 22,
//     borderRadius: 2,
//     backgroundColor: GOLD,
//     shadowColor: GOLD,
//     shadowOpacity: 0.8,
//     shadowRadius: 6,
//   },
//   pageTitle: {
//     fontSize: 22,
//     fontWeight: "800",
//     color: "#f0ebe3",
//     letterSpacing: 2,
//   },
//   pageSubtitle: {
//     fontSize: 11,
//     color: "rgba(201,168,76,0.5)",
//     letterSpacing: 2,
//     paddingLeft: 13,
//   },

//   // リスト
//   listContent: {
//     paddingHorizontal: 14,
//     paddingTop: 14,
//     paddingBottom: 32,
//     gap: 8,
//   },

//   // アイテムコンテナ
//   itemContainer: {
//     // 通常はそのまま
//   },
//   itemContainerTop3: {
//     // 上位3はほんの少し大きく見えるよう左右マージンを狭く
//     marginHorizontal: -2,
//   },

//   // カード
//   card: {
//     backgroundColor: "#0d0d16",
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(201,168,76,0.1)",
//     overflow: "hidden",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.35,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   cardAccentLine: {
//     height: 2,
//     opacity: 0.7,
//     shadowOpacity: 0.9,
//     shadowRadius: 4,
//   },
//   cardContent: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//   },

//   // 上位3バッジ
//   topRankBadge: {
//     width: 38,
//     height: 38,
//     borderRadius: 10,
//     borderWidth: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 12,
//   },
//   topRankText: {
//     fontSize: 13,
//     fontWeight: "800",
//     letterSpacing: 1,
//   },

//   // 通常順位
//   normalRank: {
//     width: 38,
//     height: 38,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 12,
//   },
//   normalRankText: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: "rgba(255,255,255,0.25)",
//     letterSpacing: 0.5,
//   },

//   // アバター
//   avatarContainer: {
//     marginRight: 12,
//   },
//   avatarBorder: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     borderWidth: 2,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   avatarIcon: {
//     width: 44,
//     height: 44,
//   },

//   // 名前・ポイント
//   infoContainer: {
//     flex: 1,
//     justifyContent: "center",
//     gap: 3,
//   },
//   name: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "rgba(240,235,227,0.75)",
//     letterSpacing: 0.3,
//   },
//   pointsText: {
//     fontSize: 11,
//     color: "rgba(201,168,76,0.5)",
//     letterSpacing: 0.5,
//   },

//   // 上位3の右端グロー
//   rankGlowLine: {
//     width: 3,
//     height: 32,
//     borderRadius: 2,
//     opacity: 0.5,
//     shadowOpacity: 0.8,
//     shadowRadius: 6,
//   },
// });


import LoadingOverlay from "@/src/components/LoadingOverlay";
import { ICONS } from "@/src/constants/icons";
import { useTheme } from "@/src/hooks/useTheme";
import { GUMI_DATA } from "@/src/lib/gumiUtils";
import { supabase } from "@/src/services/supabase";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  Image,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AntDesign } from "@expo/vector-icons";

// ─── Homeページに合わせたカラー ───────────────────────
const STRAWBERRY = "#c8d6e6";
const BACKGROUND = "#f9fafb";
const CHOCOLATE = "#5a3a4a";
const CHOCOLATE_SUB = "#c09aa8";

// ランクカラー（少し優しい色合いに）
const GOLD   = "#d4af37";
const SILVER = "#b8b8c0";
const BRONZE = "#cd7f32";

const RANK_COLORS: Record<number, { color: string; label: string }> = {
  1: { color: GOLD,   label: "I"   },
  2: { color: SILVER, label: "II"  },
  3: { color: BRONZE, label: "III" },
};

// ─── 型定義（変更なし） ───────────────────────────────
type Profile = {
  uid: string;
  displayname: string;
  points: number;
  gumi_index: number;
  icon_index: number;
};

// ─── RankingItem（UIを大幅変更） ──────────────────────
const RankingItem = ({
  item,
  index,
  colors,
}: {
  item: Profile;
  index: number;
  colors: any;
}) => {
  const rank = index + 1;
  const gumiColor = GUMI_DATA[item.gumi_index].color;
  const rankMeta = RANK_COLORS[rank];
  const isTop3 = rank <= 3;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      delay: index * 50, // 順番にフェードイン
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.itemContainer, { opacity: fadeIn }]}>
      <View style={[styles.card, isTop3 && { borderColor: `${rankMeta.color}50` }]}>
        {/* 上位3位はカード上部にカラーアクセントライン */}
        {isTop3 && (
          <View style={[styles.cardAccentLine, { backgroundColor: rankMeta.color }]} />
        )}

        <View style={styles.cardContent}>
          {/* 順位 */}
          {isTop3 ? (
            <View style={[
              styles.topRankBadge,
              {
                borderColor: `${rankMeta.color}60`,
                backgroundColor: `${rankMeta.color}15`,
                shadowColor: rankMeta.color,
              }
            ]}>
              {/* <Text style={[styles.topRankText, { color: rankMeta.color }]}>
                // 👑
              </Text> */}

<AntDesign name="crown" size={24} color={rankMeta.color} />
            </View>
          ) : (
            <View style={styles.normalRank}>
              <Text style={styles.normalRankText}>{rank}</Text>
            </View>
          )}

          {/* アバター */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatarBorder,
                {
                  borderColor: 
                  // isTop3
                  //   ? rankMeta.color
                  //   : 
                    gumiColor !== "shirogumi"
                    ? colors[gumiColor]
                    : CHOCOLATE_SUB,
                  backgroundColor: "#ffffff",
                  shadowColor: isTop3 ? rankMeta.color : STRAWBERRY,
                  shadowOpacity: isTop3 ? 0.4 : 0.15,
                  shadowRadius: isTop3 ? 10 : 6,
                },
              ]}
            >
              <Image
                source={ICONS[item.icon_index]}
                style={styles.avatarIcon}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* 名前 */}
          <View style={styles.infoContainer}>
            <Text
              style={[styles.name, isTop3 && { color: CHOCOLATE, fontWeight: "800" }]}
              numberOfLines={1}
            >
              {item.displayname}
            </Text>
            <Text style={styles.pointsText}>{item.points.toLocaleString()} pt</Text>
          </View>

          {/* 右端の装飾ライン（上位3のみ） */}
          {isTop3 && (
            <View style={[
              styles.rankGlowLine,
              {
                backgroundColor: rankMeta.color,
                shadowColor: rankMeta.color,
              }
            ]} />
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── メインコンポーネント ──────────────────────────────
export default function Rankings() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // ── ロジック（変更なし） ──
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const fetchTopProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("uid, displayname, points, gumi_index, icon_index")
        .order("points", { ascending: false })
        .limit(100);

      if (error) {
        console.error(error);
      } else {
        setProfiles(data ?? []);
      }
      setLoading(false);
    };

    fetchTopProfiles();
  }, []);

  // ── UI ──
  return (
    <SafeAreaView style={styles.container}>
      <RNStatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />
      <StatusBar style="dark" />

      {/* 背景グリッド（優しい色に） */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={[styles.bgLineV, { left: `${(i + 1) * (100 / 6)}%` as any }]}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={[styles.bgLineH, { top: `${(i + 1) * (100 / 8)}%` as any }]}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        {/* ページタイトル */}
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <View style={styles.pageTitleAccent} />
            <Text style={styles.pageTitle}>{t("Rankings.title")}</Text>
          </View>
          <Text style={styles.pageSubtitle}>{t("Rankings.subtitle")}</Text>
        </View>

        {/* リスト */}
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.uid}
          renderItem={({ item, index }) => (
            <RankingItem item={item} index={index} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {loading && <LoadingOverlay text={t("Rankings.loading")} />}
    </SafeAreaView>
  );
}

// ─── スタイル ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flex: 1,
  },

  // 背景グリッド（優しい色に）
  bgLineV: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "rgba(200,214,230,0.08)",
  },
  bgLineH: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 1,
    backgroundColor: "rgba(200,214,230,0.08)",
  },

  // ページヘッダー
  pageHeader: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.2)",
  },
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  pageTitleAccent: {
    width: 3,
    height: 24,
    borderRadius: 2,
    backgroundColor: STRAWBERRY,
    shadowColor: STRAWBERRY,
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: CHOCOLATE,
    letterSpacing: 1.5,
  },
  pageSubtitle: {
    fontSize: 11,
    color: CHOCOLATE_SUB,
    letterSpacing: 1.5,
    paddingLeft: 13,
  },

  // リスト
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },

  // アイテムコンテナ
  itemContainer: {
    // アニメーション用
  },

  // カード
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.25)",
    overflow: "hidden",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccentLine: {
    height: 2.5,
    opacity: 0.7,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  // 上位3バッジ
  topRankBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  topRankText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // 通常順位
  normalRank: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  normalRankText: {
    fontSize: 16,
    fontWeight: "700",
    color: CHOCOLATE_SUB,
    letterSpacing: 0.5,
    opacity: 0.6,
  },

  // アバター
  avatarContainer: {
    marginRight: 14,
  },
  avatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarIcon: {
    width: 48,
    height: 48,
  },

  // 名前・ポイント
  infoContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: CHOCOLATE,
    letterSpacing: 0.3,
  },
  pointsText: {
    fontSize: 12,
    color: CHOCOLATE_SUB,
    letterSpacing: 0.5,
    fontWeight: "600",
  },

  // 上位3の右端グロー
  rankGlowLine: {
    width: 3.5,
    height: 36,
    borderRadius: 2,
    opacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
});