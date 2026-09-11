import React from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingToastProps } from "./shared";

export function FloatingToast({
  visible,
  label,
  busy = false,
  onAction,
  actionLabel = "×",
  bottomOffset = 90,
  fadeAnim,
  slideAnim,
  backgroundColor,
  borderColor,
  textColor,
  textSubColor,
  accentColor,
  foregroundColor,
}: FloatingToastProps) {
  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: 20,
        right: 20,
        alignItems: "center",
        zIndex: 100,
        pointerEvents: "box-none",
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: foregroundColor,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 25,
          borderWidth: 4,
          borderColor: borderColor,
        }}
      >
        {!busy && (
          <ActivityIndicator
            size="small"
            color={accentColor}
            style={{ marginRight: 10 }}
          />
        )}

        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: textColor,
            marginRight: 14,
          }}
        >
          {label}
        </Text>

        <TouchableOpacity
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: backgroundColor,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={onAction}
          activeOpacity={0.7}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: textSubColor }}
            >
              {actionLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
