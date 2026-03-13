import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface RemainingTimeProps {
  time: number;
}

export const RemainingTime: React.FC<RemainingTimeProps> = ({ time }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  return (
    <View>
      {time !== undefined && (
        <Text style={[styles.time]}>
          {formatTime(time)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  time: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
