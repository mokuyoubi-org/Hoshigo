import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { useTranslation } from "@/src/active/language/i18n";
import { supabase } from "@/src/stable/services/supabase/supabase";
import { Alert } from "react-native";

export function useIconUpdate() {
  const t = useTranslation();
  const { updateProfile } = useProfile();

  const updateIconIndex = async (selectedIconIndex: number) => {
    try {
      const { error } = await supabase.rpc("update_icon_index", {
        new_icon_index: selectedIconIndex,
      });
      if (error) {
        console.error(error);
        Alert.alert(t("Profile.iconUpdateFailed"));
      } else {
        updateProfile({ iconIndex: selectedIconIndex });
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t("Profile.iconUpdateFailed"));
    }
  };

  return { updateIconIndex };
}