// SkeletonCard.tsx
import { RecordType } from "@/src/constants/goConstants";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

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
export const SkeletonCard = ({ height }: { height: number }) => {
  return (
    <View style={[styles.card, { height }]}>
      {/* overlayは絶対配置のまま背景として敷く */}
      <View style={styles.overlay} />

      {/* Flexフローに乗せるだけで中央に来る */}
      <Image
        source={require("@/assets/images/21.png")}
        style={styles.characterImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center", // これだけで中央
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    overflow: "hidden",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(240, 247, 255, 1)",
  },

  characterImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    opacity: 0.5,
    zIndex: 1, // overlayより前面に出すだけ
  },
});
