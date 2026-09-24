import { COLORS } from "@/src/active/constants/colors";
import { Octicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type SettingsRowProps = {
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
};

export function SettingsRow({ label, onPress, rightElement }: SettingsRowProps) {
  const right =
    rightElement !== undefined ? (
      rightElement
    ) : onPress ? (
      <Octicons name="chevron-right" size={20} color={COLORS.primary} />
    ) : null;

  const content = (
    <>
      <Text className="text-lg font-semibold text-text tracking-wide">
        {label}
      </Text>
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="flex-row justify-between items-center px-[18px] py-4 min-h-[56px] w-full"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row justify-between items-center px-[18px] py-4 min-h-[56px] w-full">
      {content}
    </View>
  );
}