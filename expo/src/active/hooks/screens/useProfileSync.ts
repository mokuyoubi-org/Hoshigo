// useProfileSync.ts

import { compareVersions } from "@/src/stable/logics/compareVersions";
import { fetchProfileRPC } from "@/src/stable/logics/profileRPC";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { useApp } from "../../contexts/AppContexts";
import { useProfile } from "../../contexts/ProfileContexts";

// 要は、データベースと通信してプロフィール(メンテナンス情報もついでに)を取ってくる。そしてそれをcontextにしまっておく。
export const useProfileSync = () => {
  const { updateProfile } = useProfile();
  const { setMaintenance, setMaintenanceMessage, setNeedsUpdate } = useApp();

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

      // 2.5 バージョンチェック。サーバーが要求する最低バージョンより
      // 自分の今のバージョンが古ければ、強制アップデートフラグを立てる。
      // webにはネイティブバイナリという概念が無く、常に最新のはずなのでスキップする。
      if (Platform.OS !== "web") {
        const requiredVersion = result.appStatus.version;
        const currentVersion = Application.nativeApplicationVersion ?? "0.0.0";
        if (
          requiredVersion &&
          compareVersions(currentVersion, requiredVersion) < 0
        ) {
          setNeedsUpdate(true);
        }
      }
    }

    // 3. プロフィール反映
    if (result.profile) {
      updateProfile(result.profile);
    }

    return true; // 成功したら true を返す
  };

  return { syncProfile };
};
