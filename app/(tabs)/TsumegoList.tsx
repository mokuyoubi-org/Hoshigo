import { StarBackground } from "@/src/components/backGrounds/StarBackGround";
import { GoBoard } from "@/src/components/goComponents/GoBoard";
import { ICONS } from "@/src/constants/icons";
import { DisplayNameContext } from "@/src/contexts/UserContexts";
import { prepareBoard2d } from "@/src/lib/goUtils";
import { Tsumego, TSUMEGO_GROUPS, TsumegoGroup } from "@/src/lib/tsumegoData";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
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
            topBar={false}
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
            onCurrentIndexChange={function (newIndex: number): void {
              throw new Error("Function not implemented.");
            }}
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
          <Text style={styles.sectionTitle}>{group.title}</Text>
        </TouchableOpacity>

        {/* カードグリッド（ヘッダーの内側） */}
        <View style={styles.grid}>
          {visibleItems.map((item, tsumegoIndex) => (
            <View key={tsumegoIndex}>
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
                ? "閉じる ▲"
                : `残り${group.data.length - columns}問を見る ▼`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function TsumegoList() {
  const router = useRouter();
  const displayName = useContext(DisplayNameContext);

  const handleSelectTsumego = (groupId: number, index: number) => {
    router.push({ pathname: "/Tsumego", params: { groupId, index } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StarBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* くまくんの説明 */}
          <View style={styles.kumakuSection}>
            <View style={styles.characterContainer}>
              <Image
                source={ICONS[90]}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.speechBubble}>
              <View style={styles.bubbleTriangle} />
              <Text style={styles.explanationText}>
                詰碁で読みの力を鍛えよう！{"\n"}
                全部{`${displayName ?? "ゲスト"}`}が ● だよ
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
  characterContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  characterImage: { width: 80, height: 80, borderRadius: 12 },
  speechBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  sectionTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#2c3e50" },

  // カードのshadowは親コンテナに任せるので少し軽くしてもOK
  card: {
    flex: 1,
    margin: 4,
    backgroundColor: "#f8f9fa", // 親の白と差をつけて少し沈んで見える
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
