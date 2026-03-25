import { STRAWBERRY } from "@/src/constants/colors";
import React from "react";
import { StyleSheet, View } from "react-native";

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
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
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
