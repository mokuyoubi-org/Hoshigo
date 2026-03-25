import { GoBoard } from "@/src/components/GoComponents/GoBoard";
import TsumegoLanguageNoticeModal from "@/src/components/Modals/TsumegoLanguageNoticeModal";
import { LangContext, useTranslation } from "@/src/contexts/LocaleContexts";
import { DisplaynameContext } from "@/src/contexts/UserContexts";
import { prepareBoard2d } from "@/src/lib/goUtils";
import { Tsumego, TSUMEGO_GROUPS, TsumegoGroup } from "@/src/lib/tsumegoData";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  Image,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 詰碁カード(子)
const TsumegoCard: React.FC<{
  tsumego: Tsumego;
  cardWidth: number;
  boardWidth: number;
  onPress: () => void;
}> = ({ tsumego, cardWidth, boardWidth, onPress }) => {
  const board = prepareBoard2d(tsumego.board, tsumego.board.length);
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tsumego.title}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.boardWrapper}>
          <GoBoard
            boardWidth={boardWidth}
            intersections={tsumego.board.length}
            territoryBoard={[]}
            disabled={true}
            moveHistory={[]}
            currentIndex={0}
            board={board}
            onPutStone={() => {}}
            agehamaHistory={[]}
            matchType={0}
            isGameEnded={false}
            boardHistory={[]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// セクション(親)
const TsumegoSection: React.FC<{
  groupIndex: number;

  group: TsumegoGroup;
  onSelect: (groupId: number, index: number) => void;
}> = ({ groupIndex, group, onSelect }) => {
  const { width } = useWindowDimensions(); // デバイスの横幅
  const columns = Math.max(2, Math.min(4, Math.floor(width / 240))); // 横幅が900でカード一枚が200なら、900/200=4余り100なのでカラム数は4。ただし最低のカラム数は2。
  const cardWidth = (width / columns) * (88 / 100); // カードのサイズ。
  const boardWidth = cardWidth * (72 / 100); // 盤面のサイズ。
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const visibleItems = expanded ? group.data : group.data.slice(0, columns);
  return (
    <View style={styles.section}>
      {/* ヘッダー＋カードを包む一体化コンテナ */}
      <View style={[styles.sectionContainer, { borderLeftColor: group.color }]}>
        {/* ヘッダー */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={toggle}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>
            {t(group.titleKey, { count: group.data.length })}
          </Text>
        </TouchableOpacity>

        {/* カードグリッド（ヘッダーの内側） */}
        <View style={styles.grid}>
          {visibleItems.map((item, tsumegoIndex) => (
            <View key={tsumegoIndex} style={{ width: cardWidth }}>
              <TsumegoCard
                cardWidth={cardWidth}
                tsumego={item}
                boardWidth={boardWidth}
                onPress={() => onSelect(groupIndex, tsumegoIndex)}
              />
            </View>
          ))}
        </View>

        {/* もっと見るボタン（コンテナの内側） */}
        {group.data.length > columns && (
          <TouchableOpacity
            style={[styles.expandButton, { borderColor: group.color }]}
            onPress={toggle}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandButtonText, { color: group.color }]}>
              {expanded
                ? `${t("common.close")} ▲`
                : t("TsumegoList.remaining", {
                    count: group.data.length - columns,
                  })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function TsumegoList() {
  const { lang, setLang } = useContext(LangContext)!;
  const router = useRouter();
  const { displayname, setDisplayname } = useContext(DisplaynameContext)!;
  const { t } = useTranslation();
  const handleSelectTsumego = (groupId: number, index: number) => {
    router.push({ pathname: "/Tsumego", params: { groupId, index } });
  };
  const [showLangNotice, setShowLangNotice] = useState(false);
  useEffect(() => {
    if (lang !== "ja") {
      setShowLangNotice(true);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* くまくんの説明 */}
          <View style={styles.kumakuSection}>
            <Image
              source={require("@/assets/images/udon_sleep.png")}
              style={styles.characterImage}
              resizeMode="contain"
            />

            <View style={styles.speechBubble}>
              <View style={styles.bubbleTriangle} />
              <Text style={styles.explanationText}>
                {t("TsumegoList.explanation1")}
                {"\n"}
                {t("TsumegoList.explanation2", {
                  name: displayname ?? t("common.guest"),
                })}
              </Text>
            </View>
          </View>

          {/* グループ一覧 */}
          {TSUMEGO_GROUPS.map((group, index) => (
            <TsumegoSection
              groupIndex={index}
              key={index}
              group={group}
              onSelect={handleSelectTsumego}
            />
          ))}
        </View>
      </ScrollView>
      <TsumegoLanguageNoticeModal
        visible={showLangNotice}
        onClose={() => setShowLangNotice(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  content: { padding: 8 },

  // くまくんセクション（変更なし）
  kumakuSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  characterImage: { width: 80, height: 80, borderRadius: 12 },
  speechBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e8f4f8",
    position: "relative",
  },
  bubbleTriangle: {
    position: "absolute",
    left: -10,
    top: 20,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderRightColor: "#e8f4f8",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  explanationText: {
    fontSize: 16,
    color: "#2c3e50",
    lineHeight: 24,
    fontWeight: "500",
  },

  section: {
    marginBottom: 20, // グループ間は余白だけ
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderLeftWidth: 5,
    padding: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  sectionTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#2c3e50" },

  card: {
    flex: 1,
    margin: 4,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 8,
  },
  // グリッド（FlatListの代わり）
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },

  // 展開ボタン
  expandButton: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  expandButtonText: { fontSize: 14, fontWeight: "600" },
  cardHeader: { marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e50" },
  cardContent: { justifyContent: "center", alignItems: "center", gap: 12 },
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
});
