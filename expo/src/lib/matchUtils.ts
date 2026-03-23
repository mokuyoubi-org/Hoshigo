// hooks/useStartMatching.ts
import {
  MaintenanceContext,
  MaintenanceMessageContext,
} from "@/src/contexts/AppContexts";
import { UidContext } from "@/src/contexts/UserContexts";
import { supabase } from "@/src/services/supabase";
import { router } from "expo-router";
import { useContext } from "react";

export const useStartMatching = () => {
  // ここでフックとしてまとめて取得
  const uid = useContext(UidContext);
  const { maintenance, setMaintenance } = useContext(MaintenanceContext)!;
  const { maintenanceMessage, setMaintenanceMessage } = useContext(
    MaintenanceMessageContext,
  )!;

  const startMatching = async (
    setLoading: (v: boolean) => void,
    setIsDailyLimitReached: (v: boolean) => void,
  ) => {
    if (!uid) {
      console.log("ログインしてない");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema("game")
        .rpc("check_can_play");
      setLoading(false);

      if (error) {
        console.error(error);
        return;
      }

      if (!data.can_play) {
        if (data.reason === "maintenance") {
          setMaintenance?.(true);
          setMaintenanceMessage?.(data.message ?? null);
          router.replace("/Home");
        } else if (data.reason === "daily_limit") {
          setIsDailyLimitReached(true);
        }
        return;
      }

      // 遊べる場合
      router.replace("/Matching");









      
    } catch (err) {
      setLoading(false);
      console.error(err);
    }
  };

  return startMatching; // ←コンポーネントから普通に呼べる関数
};
