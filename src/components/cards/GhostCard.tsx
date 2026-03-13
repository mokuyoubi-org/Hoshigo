import { SkeletonCard } from "@/src/components/cards/SkeletonCard";
import { PaywallModal } from "@/src/components/modals/MyRecordsPaywallModal";
import React from "react";
import { StyleSheet, View } from "react-native";

type GhostCardProps = {
  cardHeight: number;
  t: any;
  setShowPaywall: (v: boolean) => void;
};

export const GhostCard = ({
  cardHeight,
  t,
  setShowPaywall,
}: GhostCardProps) => (
  <View style={{ height: cardHeight, marginHorizontal: 16 }}>
    <SkeletonCard height={cardHeight} />
    <View style={StyleSheet.absoluteFillObject}>
      <View style={{ flex: 1, backgroundColor: "rgba(252,249,244,0.85)" }} />
      <PaywallModal t={t} setShowPaywall={setShowPaywall} />
    </View>
  </View>
);
