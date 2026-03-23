import { STRAWBERRY } from "@/src/constants/colors";
import React from "react";
import { StyleSheet, View } from "react-native";

export const SkeletonCard = ({ height: h }: { height: number }) => (
  <View style={[styles.card, { overflow: "hidden" }]}>
    <View style={[styles.accentLine, { backgroundColor: "rgba(200,214,230,0.4)" }]} />
    <View style={styles.recordHeader}>
      {[72, 56, 72].map((w, i) => (
        <View key={i} style={{ width: w, height: 48, borderRadius: 10, backgroundColor: "rgba(200,214,230,0.3)" }} />
      ))}
    </View>
    <View style={{ height: h, alignItems: "center", justifyContent: "center", backgroundColor: "#fafbfc" }}>
      <View style={{ width: 200, height: 200, borderRadius: 6, backgroundColor: "rgba(200,214,230,0.3)" }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,214,230,0.3)",
    shadowColor: STRAWBERRY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  accentLine: {
    height: 2.5,
    width: "100%",
    opacity: 0.6,
  },
  recordHeader: {
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
});