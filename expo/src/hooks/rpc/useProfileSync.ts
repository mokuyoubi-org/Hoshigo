// useProfileSync.ts

import { fetchProfileRPC } from "@/src/logics/rpc/profileRPC";
import { useProfile } from "@/src/contexts/ProfileContexts";

export const useProfileSync = () => {
  const { updateProfile } = useProfile();

  const syncProfile = async (): Promise<boolean> => {
    const result = await fetchProfileRPC();
    if (!result) return false;

    if (result.sessionUser) {
      updateProfile({
        uid: result.sessionUser.id,
        email: result.sessionUser.email,
        isAnonymous: result.sessionUser.isAnonymous,
      });
    }

    if (result.profile) {
      updateProfile(result.profile);
    }

    return true;
  };

  return { syncProfile };
};
