// src/components/layout/RoutedContent.tsx

import { SearchingButton } from "@/src/components/buttons/SearchingButton";
import { FullScreenLayer } from "@/src/components/layout/FullScreenLayer";
import { MaintenanceModal } from "@/src/components/modals/common/MaintenanceModal";
import { UpdateModal } from "@/src/components/modals/common/UpdateModal";
import { preloadAssets } from "@/src/constants/preload";
import { useApp } from "@/src/contexts/AppContexts";
import { OverlayOutlet } from "@/src/contexts/OverlayContext";
import { useAppFont } from "@/src/hooks/common/useAppFont";
import { useColors } from "@/src/hooks/common/useTheme";
import { useUpdateModalKind } from "@/src/hooks/layout/useUpdateModalKind";
import { useTranslation } from "@/src/i18n/LangProvider";
import { configureAudioMode } from "assets-kit";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { DotAnimation, LoadingScreen } from "ui-atoms";

export const RoutedContent = () => {
  const fontFamily = useAppFont();
  const colors = useColors();

  const t = useTranslation();
  const { isInitializing, maintenance, maintenanceMessage } = useApp();
  const modalKind = useUpdateModalKind();

  useEffect(() => {
    // 効果音がBGMを中断しないようにする設定。
    configureAudioMode();

    // 起動直後にバックグラウンドで画像/音声を先読みしておく。
    // 失敗しても致命的ではないので、エラーは握りつぶして良い。
    preloadAssets().catch((error) => {
      console.warn("Failed to preload assets:", error);
    });
  }, []);

  return (
    // ここでStackを使うことによって、router.back()が機能する。つまりStackがないということは履歴がないということ
    // ここは<View>にしてはいけない
    <>
      {/* 今表示中のオーバーレイ(モーダル)をここで実際に描画する。
          MatchingProviderの内側にあるので、GameResultModal等はuseMatching()を使える */}
      <OverlayOutlet />

      {/* ToastはModalより手前に出したいので、Outletより後ろに置く(nativeは兄弟の描画順も効く) */}
      <SearchingButton />

      <Stack screenOptions={{ headerShown: false }}>
        {/* (tabs) グループ自体を1つの画面として登録 */}
        <Stack.Screen name="(tabs)" />
        {/* RecordsScreen / AnalyzeScreen が app/ 直下にあるならここにも明示してOK（省略しても自動登録される） */}
      </Stack>

      {/* ローディング */}
      {isInitializing && (
        <FullScreenLayer zIndex={300}>
          {/* AuthGate.tsx の initialize() が待ち先。セッション確認〜匿名ログイン
        〜プロフィール同期までを一括してこの1状態で表現している(子段階なし) */}
          <LoadingScreen
            label={<DotAnimation text={t("auth.checkingAuthentication")} />}
            percent={null}
            backgroundColor={colors.background}
            textColor={colors.textSub}
            trackColor={colors.backgroundStrong}
            fillColor={colors.primary}
            fontFamily={fontFamily}
          />
        </FullScreenLayer>
      )}

      {/* 🐱 メンテナンス画面 */}
      {maintenance && !modalKind && (
        <FullScreenLayer zIndex={301}>
          <MaintenanceModal message={maintenanceMessage} />
        </FullScreenLayer>
      )}

      {/* 🐱 強制アップデート画面(メンテより優先度を高くする) */}
      {modalKind && !isInitializing && (
        <FullScreenLayer zIndex={302}>
          <UpdateModal kind={modalKind} />
        </FullScreenLayer>
      )}
    </>
  );
};