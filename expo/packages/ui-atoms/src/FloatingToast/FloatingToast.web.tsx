import React from "react";
import ReactDOM from "react-dom";
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from "react-native";
import { useIsHydrated } from "./useIsHydrated";
import {  FloatingToastProps } from "./shared";

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
  foregroundColor
}: FloatingToastProps) {
  const isHydrated = useIsHydrated();

  if (!isHydrated || typeof document === "undefined" || !visible) {
    return null;
  }

  return ReactDOM.createPortal(
    <Animated.View
      style={
        {
          position: "fixed",
          bottom: bottomOffset,
          left: 20,
          right: 20,
          zIndex: 100,
          alignItems: "center",
          pointerEvents: "box-none",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        } as any
      }
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
          <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 10 }} />
        )}

        <Text style={{ fontSize: 14, fontWeight: "600", color: textColor, marginRight: 14 }}>
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
            <Text style={{ fontSize: 16, fontWeight: "bold", color: textSubColor }}>
              {actionLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>,
    document.body,
  );
}