import { GoBoard } from "@/src/components/GoBoard";
import { StarBackground } from "@/src/components/StarBackGround";
import { DisplayNameContext } from "@/src/components/UserContexts";
import { ICONS } from "@/src/constants/icons";
import { Agehama, prepareBoard2d } from "@/src/lib/goUtils";
import { TSUMEGO_GROUPS, Tsumego, TsumegoGroup } from "@/src/lib/tsumegoData";
import { useRouter } from "expo-router";
import React, { useContext, useRef, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Androidでアニメーション有効化
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PREVIEW_COUNT = 2; // 最初に見せる問題数

// 詰碁カード（変更なし）
const TsumegoCard: React.FC<{ tsumego: Tsumego; onPress: () => void }> = ({
  tsumego,
  onPress,
}) => {
  const { width } = useWindowDimensions();
  const boardWidth = width / 4;
  const board = prepareBoard2d(tsumego.board, tsumego.boardSize);
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  const teritoryBoardRef = useRef<number[][]>(
    Array.from({ length: tsumego.boardSize }, () =>
      Array.from({ length: tsumego.boardSize }, () => 0),
    ),
  );
  const movesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tsumego.title}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.boardWrapper}>
          <GoBoard
            boardPixelSize={boardWidth}
            topBar={false}
            boardSize={tsumego.boardSize}
            territoryBoard={teritoryBoardRef.current}
            showTerritory={true}
            disabled={true}
            moveHistory={movesRef.current}
            currentIndex={currentIndexRef.current}
            board={board}
            onPutStone={() => {}}
            agehamaHistory={agehamaHistory}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// アコーディオンセクション
const TsumegoSection: React.FC<{
  group: TsumegoGroup;
  onSelect: (groupId: string, index: number) => void;
}> = ({ group, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const visibleItems = expanded
    ? group.data
    : group.data.slice(0, PREVIEW_COUNT);
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
          {visibleItems.map((item, index) => (
            <View key={index} style={styles.gridItem}>
              <TsumegoCard
                tsumego={item}
                onPress={() => onSelect(group.id, index)}
              />
            </View>
          ))}
          {visibleItems.length % 2 !== 0 && <View style={styles.gridItem} />}
        </View>

        {/* もっと見るボタン（コンテナの内側） */}
        {group.data.length > PREVIEW_COUNT && (
          <TouchableOpacity
            style={[styles.expandButton, { borderColor: group.color }]}
            onPress={toggle}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandButtonText, { color: group.color }]}>
              {expanded
                ? "閉じる ▲"
                : `残り${group.data.length - PREVIEW_COUNT}問を見る ▼`}
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

  const handleSelectTsumego = (groupId: string, index: number) => {
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
                source={ICONS[100]}
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
          {TSUMEGO_GROUPS.map((group) => (
            <TsumegoSection
              key={group.id}
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
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%" },

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
