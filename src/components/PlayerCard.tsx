import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getGumiByIndex } from "../../src/lib/gumiUtils";
import { ICONS } from "../constants/icons";
import { useTheme } from "../hooks/useTheme";

interface PlayerCardProps {
  iconIndex: number;
  username: string;
  displayname: string;
  color: "black" | "white";
  time?: number;
  points: number;
  isActive?: boolean;
  gumiIndex: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  iconIndex,
  username,
  displayname,
  color,
  time,
  points,
  isActive = false,
  gumiIndex,
}) => {
  //  const playersGumiIndex = useContext(GumiIndexContext);
  const { colors } = useTheme();
  const gumi = getGumiByIndex(gumiIndex || 0);
  const gumiColor = colors[gumi.color as keyof typeof colors] || colors.text;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // console.log("PlayerCard");
  // console.log("displayname: ", displayname);
  // console.log("gumiIndex: ", gumiIndex);
  // console.log("gumi:", gumi);
  // console.log("gumi.color:", gumi.color);
  // console.log("theme colors keys:", Object.keys(colors));

  return (
    <View
      style={[styles.container, isActive && { backgroundColor: colors.card }]}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.card, borderColor: gumiColor },
        ]}
      >
        <Image
          source={ICONS[iconIndex]}
          style={styles.iconImage}
          resizeMode="contain"
        />
        <View
          style={[
            styles.stone,
            {
              backgroundColor:
                color === "black" ? colors.blackStone : colors.whiteStone,
              borderWidth: color === "white" ? 1 : 0,
              borderColor: colors.borderColor,
            },
          ]}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.displayname, { color: colors.text }]}>
          {displayname}
        </Text>
        {/* <Text style={[styles.username, { color: colors.subtext }]}>
          {username}
        </Text> */}
      </View>
      <View>
        {time !== undefined && (
          <Text style={[styles.time, { color: colors.active }]}>
            {formatTime(time)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    position: "relative",
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  stone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    bottom: -2,
    right: -2,
  },
  textContainer: {
    alignItems: "flex-start",
  },
  displayname: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  username: {
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  points: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  time: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
