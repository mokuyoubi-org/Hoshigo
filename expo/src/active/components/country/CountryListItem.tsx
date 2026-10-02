import { CountryItem } from "@/src/stable/logics/country";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

import { useColors } from "../../hooks/useTheme";
import { AppText } from "../common/AppText";
import { FlagImage } from "./FlagImage";

type Props = {
  item: CountryItem;
  isSelected: boolean;
  onPress: (code: string) => void;
};

export function CountryListItem({ item, isSelected, onPress }: Props) {
  const colors = useColors();
  return (
    <TouchableOpacity
      className="flex-row justify-between items-center px-4 py-3 min-h-12"
      onPress={() => onPress(item.code)}
    >
      <View className="flex-row items-center gap-3">
        <FlagImage
          countryCode={item.code}
          width={28}
          height={20}
          borderRadius={3}
        />
        <AppText
          className={`text-lg ${isSelected ? "text-text" : "text-textSub"}`}
        >
          {item.label}
        </AppText>
      </View>
      {isSelected && (
        <FontAwesome name="check-circle" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}
