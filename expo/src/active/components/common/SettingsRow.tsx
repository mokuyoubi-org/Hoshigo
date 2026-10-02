import { Feather } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useColors } from "../../hooks/useTheme";
import { AppText } from "./AppText";

type SettingsRowProps = {
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
};

export function SettingsRow({
  label,
  onPress,
  rightElement,
}: SettingsRowProps) {
  const colors = useColors();
  // onPressがあるときは、rightElementがあってもなくても右矢印を表示するにゃ！
  const right = (
    <View className="flex-row items-center gap-2">
      {rightElement}
      {onPress && (
        <Feather name="chevron-right" size={22} color={colors.textSub} />
      )}
    </View>
  );

  const content = (
    // ここは<View>にしてはいけない
    <>
      <AppText className="text-lg text-text tracking-wide">{label}</AppText>
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="flex-row justify-between items-center px-4 py-4 min-h-14 w-full"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row justify-between items-center px-4 py-4 min-h-14 w-full">
      {content}
    </View>
  );
}
