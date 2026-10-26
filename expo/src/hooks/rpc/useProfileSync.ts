// useProfileSync.ts

import { useProfile } from "@/src/contexts/ProfileContexts";
import { fetchProfileRPC } from "@/src/logics/rpc/profileRPC";

export const useProfileSync = () => {
  const { updateProfile } = useProfile();
  const syncProfile = async (): Promise<boolean> => {
    const result = await fetchProfileRPC();
    if (!result) return false;
    if (result.sessionUser) {
      updateProfile({
        uid: result.sessionUser.id,
        email: result.sessionUser.email,
      });
    }
    if (result.profile) {
      updateProfile(result.profile);
    }
    return true;
  };
  return { syncProfile };
};
