import { SkeletonCard } from "@/src/components/Cards/SkeletonCard";
import { STRAWBERRY } from "@/src/constants/colors";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  cardHeight: number;
  t: any;
};

export const GhostCard = ({ cardHeight, t }: Props) => (
  <View style={[styles.wrapper, { height: cardHeight }]}>
    {/* 背景のスケルトン */}
    <SkeletonCard height={cardHeight} />

    {/* 半透明オーバーレイ＋CTA */}
    <View style={StyleSheet.absoluteFillObject}>
      <View style={styles.overlay} />
      <View style={styles.cta}>
        <Text style={styles.title}>{t("GhostCard.title")}</Text>
        <Text style={styles.subtitle}>{t("GhostCard.subtitle")}</Text>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => router.push("/Subscription")}
        >
          <Text style={styles.buttonText}>{t("GhostCard.button")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(229, 248, 255, 0.64)",
    borderRadius: 20,
  },
  cta: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: STRAWBERRY,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  button: {
    marginTop: 8,
    backgroundColor: STRAWBERRY,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
});