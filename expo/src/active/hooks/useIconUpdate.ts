import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { supabase } from "@/src/stable/services/supabase/supabase";

export function useIconUpdate() {
  const { updateProfile } = useProfile();

  const updateIconIndex = async (selectedIconIndex: number) => {
    try {
      const { error } = await supabase.rpc("update_icon_index", {
        new_icon_index: selectedIconIndex,
      });
      if (error) {
        console.error(error);
      } else {
        updateProfile({ iconIndex: selectedIconIndex });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return { updateIconIndex };
}
