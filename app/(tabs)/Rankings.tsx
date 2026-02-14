// // app/Rankings.tsx
// import LoadingOverlay from "@/src/components/LoadingOverlay";
// import { GUMI_DATA } from "@/src/lib/gumiUtils";
// import { ICONS } from "@/src/lib/icons";
// import { supabase } from "@/src/lib/supabase";
// import { useTheme } from "@/src/lib/useTheme";
// import React, { useEffect, useState } from "react";
// import { FlatList, Image, StyleSheet, Text, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// type Profile = {
//   uid: string;
//   displayname: string;
//   points: number;
//   gumi_index: number;
//   icon_index: number;
// };

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

//   const rankStyle = styles.normalRank;
//   const rankTextStyle = styles.normalRankText;

//   return (
//     <View style={styles.itemContainer}>
//       <View style={[styles.card, { backgroundColor: colors.card }]}>
//         <View style={styles.cardContent}>
//           <View style={[rankStyle, { backgroundColor: colors.background }]}>
//             <Text style={[rankTextStyle, { color: colors.text }]}>{rank}</Text>
//           </View>

//           <View style={styles.avatarContainer}>
//             <View
//               style={[
//                 styles.avatarBorder,
//                 {
//                   borderColor: colors[gumiColor],
//                   backgroundColor: colors.background,
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

//           <View style={styles.infoContainer}>
//             <Text
//               style={[styles.name, { color: colors.text }]}
//               numberOfLines={1}
//             >
//               {item.displayname}
//             </Text>
//           </View>
//         </View>
//       </View>
//     </View>
//   );
// };

// export default function Rankings() {
//   const { colors } = useTheme();
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

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: colors.background }]}
//     >
//       <View style={[styles.container, { backgroundColor: colors.background }]}>
//         <FlatList
//           data={profiles}
//           keyExtractor={(item) => item.uid}
//           renderItem={({ item, index }) => (
//             <RankingItem item={item} index={index} colors={colors} />
//           )}
//           contentContainerStyle={styles.listContent}
//           showsVerticalScrollIndicator={false}
//         />

//         {loading && <LoadingOverlay text="よみこみ中..." />}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   listContent: {
//     paddingHorizontal: 16,
//     paddingBottom: 24,
//   },
//   itemContainer: {
//     marginBottom: 12,
//   },
//   card: {
//     borderRadius: 16,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   cardContent: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: 16,
//   },
//   normalRank: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 12,
//   },
//   normalRankText: {
//     fontSize: 16,
//     fontWeight: "700",
//   },
//   avatarContainer: {
//     marginRight: 12,
//   },
//   avatarBorder: {
//     width: 52,
//     height: 52,
//     borderRadius: 26,
//     borderWidth: 3,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   avatarIcon: {
//     width: 48,
//     height: 48,
//   },
//   infoContainer: {
//     flex: 1,
//     justifyContent: "center",
//   },
//   name: {
//     fontSize: 17,
//     fontWeight: "700",
//     marginBottom: 4,
//   },
// });



// app/Rankings.tsx
import LoadingOverlay from "@/src/components/LoadingOverlay";
import { GUMI_DATA } from "@/src/lib/gumiUtils";
import { ICONS } from "@/src/lib/icons";
import { supabase } from "@/src/lib/supabase";
import { useTheme } from "@/src/lib/useTheme";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Profile = {
  uid: string;
  displayname: string;
  points: number;
  gumi_index: number;
  icon_index: number;
};

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

  const rankStyle = styles.normalRank;
  const rankTextStyle = styles.normalRankText;

  return (
    <View style={styles.itemContainer}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardContent}>
          <View style={[rankStyle, { backgroundColor: colors.background }]}>
            <Text style={[rankTextStyle, { color: colors.text }]}>{rank}</Text>
          </View>

          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatarBorder,
                {
                  borderColor: gumiColor!=="shirogumi"?colors[gumiColor]:"white",
                  backgroundColor: "#f4f4f4",
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

          <View style={styles.infoContainer}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.displayname}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function Rankings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.uid}
          renderItem={({ item, index }) => (
            <RankingItem item={item} index={index} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {loading && <LoadingOverlay text={t("Rankings.loading")} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemContainer: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  normalRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  normalRankText: {
    fontSize: 16,
    fontWeight: "700",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarIcon: {
    width: 48,
    height: 48,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
});