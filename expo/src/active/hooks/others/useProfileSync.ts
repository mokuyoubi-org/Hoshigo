// ✅acive
// useProfileSync.ts

import { fetchProfileRPC } from "@/src/stable/logics/profileRPC";
import { useApp } from "../../contexts/AppContexts";
import { useProfile } from "../../contexts/ProfileContexts";
// 要は、データベースと通信してプロフィール(メンテナンス情報もついでに)を取ってくる。そしてそれをcontextにしまっておく。
export const useProfileSync = () => {
  const { updateProfile } = useProfile();
  const { setMaintenance, setMaintenanceMessage } = useApp();

  const syncProfile = async (): Promise<boolean> => {
    const result = await fetchProfileRPC();
    if (!result) return false; // 失敗したら false を返す

    // 1. セッション反映
    if (result.sessionUser) {
      updateProfile({
        uid: result.sessionUser.id,
        email: result.sessionUser.email,
        isAnonymous: result.sessionUser.isAnonymous,
      });
    }

    // 2. メンテ情報反映
    if (result.appStatus) {
      setMaintenance(result.appStatus.maintenance);
      setMaintenanceMessage(result.appStatus.message);
    }

    // 3. プロフィール反映
    if (result.profile) {
      updateProfile(result.profile);
    }

    return true; // 成功したら true を返す
  };

  return { syncProfile };
};
