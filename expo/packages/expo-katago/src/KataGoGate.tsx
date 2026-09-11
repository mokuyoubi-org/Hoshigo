import React, { ReactNode } from "react";
import { ColorValue, Text, View } from "react-native";
import { LoadingScreen } from "ui-atoms";
import { KataGoEngineProvider, useKataGoEngine } from "./KataGoEngineContext";
import { getGateStatus } from "./gateStatus";
import { LangProvider, useTranslation } from "./i18n";

// 1. 型定義は1つだけに集約！すべて必須（Required）にする
export type KataGoGateProps = {
  children: ReactNode;
  backgroundColor: ColorValue;
  errorColor: ColorValue;
  textColor: ColorValue;
  trackColor: ColorValue;
  fillColor: ColorValue;
};

function KataGoGateView({
  children,
  backgroundColor,
  errorColor,
  textColor,
  trackColor,
  fillColor,
}: KataGoGateProps) {
  const { engineReady, setupError, loadProgress } = useKataGoEngine();
  const t = useTranslation();
  const status = getGateStatus(engineReady, setupError, loadProgress);

  if (status.status === "error") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: backgroundColor,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: errorColor,
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          {t("gate.errorTitle")}
        </Text>
        <Text style={{ fontSize: 12, color: textColor }}>
          {status.message}
        </Text>
      </View>
    );
  }

  if (status.status === "loading") {
    return (
      <LoadingScreen
        label={t(`gate.${status.phase}`)}
        percent={status.percent}
        backgroundColor={backgroundColor}
        textColor={textColor}
        trackColor={trackColor}
        fillColor={fillColor}
      />
    );
  }

  return <>{children}</>;
}

// 2. スプレッド構文で丸ごと展開して渡す
export function KataGoGate(props: KataGoGateProps) {
  return (
    <LangProvider>
      <KataGoEngineProvider>
        <KataGoGateView {...props} />
      </KataGoEngineProvider>
    </LangProvider>
  );
}
