// Hoshigo
// TsumegoSettingsModal.tsx
// 詰碁の「出さない」設定。トグルをオンにした種類の問題は、出さない。
// (変えた設定は、次に詰碁の画面を開いたときから効く)

import { MyText } from "@/src/components/common/MyText";
import { useColors } from "@/src/hooks/common/useTheme";
import { useKVStorage } from "kv-store";
import { Fragment } from "react";
import { View } from "react-native";
import { Divider, ModalShell, ToggleSwitch } from "ui-atoms";

type Props = {
  onClose: () => void;
};

// 設定の保存キー・初期値・名前。useTsumegoFeed と同じキーを見ている
const ROWS = [
  {
    key: "TsumegoScreen.hideSolved",
    defaultValue: true,
    label: "解けた問題を出さない",
  },
  {
    key: "TsumegoScreen.hideFailed",
    defaultValue: false,
    label: "解けなかった問題を出さない",
  },
  {
    key: "TsumegoScreen.hideSkipped",
    defaultValue: false,
    label: "飛ばした問題を出さない",
  },
] as const;

const SettingRow = ({
  keyName,
  defaultValue,
  label,
}: {
  keyName: string;
  defaultValue: boolean;
  label: string;
}) => {
  const colors = useColors();
  const { value, setValue } = useKVStorage<boolean>(keyName, defaultValue);

  return (
    <View className="flex-row justify-between items-center p-4 min-h-12">
      <MyText className="text-xl text-text flex-1 pr-4">{label}</MyText>
      <ToggleSwitch
        value={value}
        onToggle={setValue}
        backgroundOnColor={colors.primary}
        backgroundOffColor={colors.backgroundStrong}
        toggleColor={colors.foreground}
      />
    </View>
  );
};

export const TsumegoSettingsModal = ({ onClose }: Props) => {
  const colors = useColors();

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      backgroundColor={colors.background}
      overlayColor={colors.overlay}
      borderColor={colors.backgroundStrong}
      contentPadding={16}
    >
      <MyText className="text-xl text-text text-center pb-4">
        詰碁の設定
      </MyText>

      <View className="w-full bg-foreground rounded-xl border-2 border-backgroundStrong overflow-hidden">
        {ROWS.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 && <Divider backgroundColor={colors.backgroundStrong} />}
            <SettingRow
              keyName={row.key}
              defaultValue={row.defaultValue}
              label={row.label}
            />
          </Fragment>
        ))}
      </View>
    </ModalShell>
  );
};