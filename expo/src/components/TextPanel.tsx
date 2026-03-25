// TextPanel.tsx

import React from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Props = {
  text: string;
  fadeAnim: Animated.Value;
};

const TextPanelComponent = ({ text, fadeAnim }: Props) => {
  const { width, height } = useWindowDimensions();

  return (
    // ← ここはアニメなしの普通のView
    <View style={styles.explanationContainer}>
      <View
        style={[styles.characterContainer, { height: (height * 12) / 100 }]}
      >
        <Image
          source={require("@/assets/images/20.png")} // うどん
          style={styles.characterImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.speechBubble}>
        <View style={styles.bubbleTriangle} />
        {/* テキストだけフェードアニメ */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.explanationText}>{text}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

export const TextPanel = React.memo(TextPanelComponent);

const styles = StyleSheet.create({
  explanationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
    paddingHorizontal: 8,
  },
  characterContainer: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "#e8f4f8",
    position: "relative",
  },
  bubbleTriangle: {
    position: "absolute",
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderRightColor: "#e8f4f8",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  explanationText: {
    fontSize: 16,
    color: "#2c3e50",
    lineHeight: 24,
    fontWeight: "500",
  },
});
