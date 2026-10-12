// useIconUpdate.ts

import { useProfile } from "@/src/contexts/ProfileContexts";
import { api } from "@/src/services/api/api";

export const useIconUpdate = () => {
  const { updateProfile } = useProfile();

  const updateIconIndex = async (selectedIconIndex: number) => {
    try {
      const { error } = await api.rpc("update_icon_index", {
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
};
