import { useLang, useTranslation } from "@/src/active/i18n/LangProvider";
import { useFonts } from "expo-font";
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "../AppText";
import { FONTS, TITLE_BOX_WIDTH } from "./constants";
import { resolveTitleConfig, toLangKey } from "./titleConfig";
import { TitleStars } from "./TitleStars";
import { TitleStones } from "./TitleStones";
import { useColors } from "@/src/active/hooks/useTheme";

export const MainTitle = () => {
  const t = useTranslation();
   const colors = useColors();
  const { lang } = useLang();
  const { width } = useWindowDimensions();

  const [fontsLoaded] = useFonts(FONTS);

  if (!fontsLoaded) {
    return null;
  }

  // 基本設定 + この端末・この言語のズレ量(titleTuning.ts)
  const config = resolveTitleConfig(toLangKey(lang), width);
  const lineHeight = Math.round(config.fontSize * 1.2);

  return (
    <View className="items-center justify-center p-6 relative w-full">
      {/* ⚪️⚫️ 1. 背景の重なる黒石と白石 */}
      <TitleStones />

      {/* 2. online go matches */}
      <View className="flex-row items-center justify-center mb-3 z-10 w-full">
        <AppText
          className="text-base text-textSub tracking-[4px] uppercase text-center"
          style={{ fontFamily: config.topFont }}
        >
          {t("mainTitle.onlineGoMatches")}
        </AppText>
      </View>

      {/* 👑 3. メインエリア */}
      <View className="relative items-center justify-center pt-8 pb-9 z-10 w-full">
        {/* 🌠 5つの星 */}
        <TitleStars />

        {/* テキスト */}
        <View className="relative items-center justify-center w-full z-30">
          {/* 親の幅に縛られない、固定幅の箱 */}
          <View style={{ width: TITLE_BOX_WIDTH, flexShrink: 0 }}>
            {/* メインの文字 */}
            <AppText
              className="mb-0 text-center"
              numberOfLines={1}
              allowFontScaling={false}
              style={{
                color: colors.primary,
                fontFamily: config.titleFont,
                fontSize: config.fontSize,
                lineHeight,
                letterSpacing: config.letterSpacing,
                textAlign: "center",
                paddingRight: 8,
                paddingBottom: 8,
                transform: [{ translateY: config.titleOffsetY }],
                textShadowColor: colors.primaryDark,
                textShadowOffset: { width: 4, height: 8 },
                textShadowRadius: 1,
                includeFontPadding: false,
              }}
            >
              {t("mainTitle.hoshigoMain")}
            </AppText>
          </View>
        </View>

        {/* 3. サブタイトル */}
        {config.showSubtitle && (
          <View
            className="absolute flex-row items-center justify-center z-30 w-full"
            style={{ bottom: 8 - config.subtitleOffsetY }}
          >
            <View className=
            // この2pxは必要
            "h-[2px] w-8 bg-textSub rounded-full mr-3" />
            <AppText
              className=
              // この8pxは必要
              "text-base text-textSub tracking-[8px] uppercase text-center"
              style={{ fontFamily: config.subFont }}
            >
              {t("mainTitle.hoshigoSub")}
            </AppText>
            <View className=
            // この2pxは必要
            "h-[2px] w-8 bg-textSub rounded-full ml-3" />
          </View>
        )}
      </View>
    </View>
  );
};
