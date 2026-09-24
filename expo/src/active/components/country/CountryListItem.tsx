import { CountryItem } from "@/src/stable/logics/country";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { FlagImage } from "./FlagImage";

type Props = {
  item: CountryItem;
  isSelected: boolean;
  onPress: (code: string) => void;
};

export function CountryListItem({ item, isSelected, onPress }: Props) {
  return (
    <TouchableOpacity
      className="flex-row justify-between items-center px-4 py-3 min-h-[48px] active:opacity-70"
      onPress={() => onPress(item.code)}
    >
      <View className="flex-row items-center gap-3">
        <FlagImage
          countryCode={item.code}
          width={28}
          height={20}
          borderRadius={3}
        />
        <Text
          className={`text-lg font-semibold ${isSelected ? "text-text" : "text-textSub"}`}
        >
          {item.label}
        </Text>
      </View>
      {isSelected && (
        <FontAwesome name="check-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );
}
