// useDoubleTapSetting.ts
import { sqliteKv } from "@/src/stable/services/storage/sqlite";
import { useEffect, useState } from "react";

const DOUBLE_TAP_KEY13 = "enableDoubleTap13";

export function useDoubleTapSetting() {
  const [enableDoubleTap13, setEnableDoubleTap13] = useState<boolean>(true);
  const [isLoaded13, setIsLoaded13] = useState<boolean>(false);

  useEffect(() => {
    // Web(同期) と Native(非同期) の両方に対応するために Promise.resolve で受ける
    Promise.resolve(sqliteKv.getItem(DOUBLE_TAP_KEY13))
      .then((val) => {
        if (val !== null && val !== undefined) {
          setEnableDoubleTap13(JSON.parse(val) as boolean);
        }
      })
      .catch((err: unknown) => {
        console.error("ダブルタップ設定の読み込み失敗:", err);
      })
      .finally(() => {
        setIsLoaded13(true);
      });
  }, []);

  const toggleDoubleTap13 = async (newValue: boolean) => {
    setEnableDoubleTap13(newValue);
    try {
      await sqliteKv.setItem(DOUBLE_TAP_KEY13, JSON.stringify(newValue));
    } catch (err: unknown) {
      console.error("ダブルタップ設定の保存失敗:", err);
    }
  };

  return { enableDoubleTap13, toggleDoubleTap13, isLoaded13 };
}
