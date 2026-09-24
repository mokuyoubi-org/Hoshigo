import React from "react";
import { Text, View } from "react-native";

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const items = React.Children.toArray(children);

  return (
    <View className="mb-6">
      <Text className="text-sm font-bold uppercase tracking-widest text-textSub mb-2.5 ml-1">
        {title}
      </Text>
      <View className="bg-foreground rounded-xl border-2 border-backgroundDark w-full overflow-hidden">
        {items.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < items.length - 1 && (
              <View className="h-[1px] bg-backgroundDark w-full" />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}