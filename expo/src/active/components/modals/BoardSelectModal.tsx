import { COLORS } from "@/src/active/constants/colors";
import { BOARD_SIZE_OPTIONS, BoardSize } from "expo-goband";
import { ModalShell } from "modal-shell";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type BoardSelectModalProps = Props & {
  onSelect: (size: BoardSize) => void;
};

// 数字だけを抜き出す関数
const extractNumber = (text: string): string => {
  return text.match(/\d+/)?.[0] ?? text;
};

export function BoardSelectModal({
  visible,
  onClose,
  onSelect,
}: BoardSelectModalProps) {
  if (!visible) return null;

  return (
    <ModalShell onClose={onClose} size="md">
      <View className="w-full">
        {/* Header */}
        <View
          className="w-full pb-3 mb-4 border-b flex-row items-center justify-between"
          style={{ borderColor: `${COLORS.backgroundDark}40` }}
        >
          <Text
            className="text-lg font-bold"
            style={{ color: COLORS.text ?? "#333333" }}
          >
            Select Board Size
          </Text>
        </View>

        {/* Horizontal Option Buttons */}
        <View className="w-full flex-row gap-3">
          {BOARD_SIZE_OPTIONS.map((option) => {
            const sizeValue = option.value as BoardSize;

            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.7}
                className="flex-1 p-4 rounded-xl items-center justify-center border"
                style={{
                  backgroundColor: COLORS.foreground,
                  borderColor: COLORS.backgroundDark,
                }}
                onPress={() => {
                  onSelect(sizeValue);
                  onClose();
                }}
              >
                <Text
                  className="text-base font-bold"
                  style={{ color: COLORS.primary }}
                >
                  {/* option.label から数字だけを取り出して表示する */}
                  {extractNumber(option.label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ModalShell>
  );
}
