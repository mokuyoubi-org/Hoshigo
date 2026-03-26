// SkeletonCard.tsx
import { RecordType } from "@/src/constants/goConstants";
import React from "react";
import { StyleSheet, View } from "react-native";

// makePlaceholdersは、例えばmakePlaceholders(10)なら
// [{id: -1}, {id: -2}, ... {id: -10}]
// っていう配列を作る。「なんちゃってRecordCardType配列」を生成するわけだ。
export const makeSkeletonCard = (fetchCount: number): RecordType[] => {
  // 超大事: fromメソッドは、要はオブジェクトのlengthプロパティを参照するのだ。
  // なので、当然、配列風の、つまりlengthを実際に持つオブジェクトなら第一引数に配置できる。
  // そして、ここではそのfromメソッドの性質を利用して、配列でもなんでもないけど、lengthプロパティを持たせたオブジェクトを配置することで、
  // あたかも長さを持つオブジェクトであるかのようにfromメソッドを錯覚させているのだ。
  return Array.from(
    { length: fetchCount }, // ここで配列の要素の個数を指定。第一引数は配列でも、今回みたいなのでも、配列っぽいものならok
    (_, i) => ({ id: -1 - i }) as RecordType, // (配列の要素、そのindex)。
  );
};

// idが負の数ならSkeletonCard。
export const isSkeletonCard = (r: RecordType) => (r.id as number) < 0;

// SkeletonCardコンポーネント
export const SkeletonCard = ({ height }: { height: number }) => {
  return (
    <View style={[styles.card, { height }]}>
      <View style={styles.overlay} />

      <View style={styles.header}>
        <View style={styles.headerBoxLarge} />
        <View style={styles.headerBoxSmall} />
        <View style={styles.headerBoxLarge} />
      </View>

      <View style={[styles.body, { height }]}>
        <View style={styles.bodyInner} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
  },

  overlay: {
    backgroundColor: "rgba(200,214,230,0.4)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,214,230,0.15)",
    backgroundColor: "rgba(249,250,251,0.8)",
    width: "100%",
  },

  headerBoxLarge: {
    width: 72,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(200,214,230,0.3)",
  },

  headerBoxSmall: {
    width: 56,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(200,214,230,0.3)",
  },

  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafbfc",
  },

  bodyInner: {
    borderRadius: 6,
    backgroundColor: "rgba(200,214,230,0.3)",
  },
});
