import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import LoadingOverlay from "../src/components/LoadingOverlay";
import React from "react";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <LoadingOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
});
