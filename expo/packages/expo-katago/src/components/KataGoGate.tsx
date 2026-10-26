// KataGoGate.tsx

import { ReactNode } from "react";
import { ColorValue, Text, View } from "react-native";
import { DotAnimation, LoadingScreen } from "ui-atoms";
import { translate } from "../i18n";
import { getGateStatus } from "../logics/gateStatus";
import { KataGoEngineProvider, useKataGoEngine } from "./KataGoEngineContext";

type Props = {
  children: ReactNode;
  lang: string;
  backgroundColor: ColorValue;
  errorColor: ColorValue;
  textColor: ColorValue;
  trackColor: ColorValue;
  fillColor: ColorValue;
  fontFamily: string;
};

const KataGoGateView = ({
  children,
  lang,
  backgroundColor,
  errorColor,
  textColor,
  trackColor,
  fillColor,
  fontFamily,
}: Props) => {
  const { engineReady, setupError, loadProgress } = useKataGoEngine();
  const status = getGateStatus(engineReady, setupError, loadProgress);

  const fontStyle = fontFamily ? { fontFamily } : null;

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
          style={[
            {
              fontSize: 16,
              color: errorColor,
              marginBottom: 10,
            },
            fontStyle,
          ]}
        >
          {translate("gate.errorTitle", lang)}
        </Text>
        <Text style={[{ fontSize: 12, color: textColor }, fontStyle]}>
          {status.message}
        </Text>
      </View>
    );
  }

  if (status.status === "loading") {
    return (
      <LoadingScreen
        label={<DotAnimation text={translate(`gate.${status.phase}`, lang)} />}
        percent={status.percent}
        backgroundColor={backgroundColor}
        textColor={textColor}
        trackColor={trackColor}
        fillColor={fillColor}
        fontFamily={fontFamily}
      />
    );
  }
  // ここは<View>にしてはいけない
  return <>{children}</>;
};

export const KataGoGate = (props: Props) => {
  return (
    <KataGoEngineProvider>
      <KataGoGateView {...props} />
    </KataGoEngineProvider>
  );
};
