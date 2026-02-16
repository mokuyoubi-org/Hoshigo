// TsumegoList.tsx
import { GoBoard } from "@/src/components/GoBoard";
import { DisplayNameContext } from "@/src/components/UserContexts";
import { ICONS } from "@/src/constants/icons"; // アイコン画像のインポート
import { BOARD_SIZE_COUNT } from "@/src/lib/goLogics";
import { Agehama, prepareBoard2d } from "@/src/lib/goUtils";
import { SHIROGUMI_TSUMEGO, Tsumego } from "@/src/lib/TsumegoData";
import { useRouter } from "expo-router";
import React, { useContext, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 詰碁カード
const TsumegoCard: React.FC<{
  tsumego: Tsumego;
  onPress: () => void;
}> = ({ tsumego, onPress }) => {
  const difficultyConfig = {
    easy: { label: "初級", color: "#27ae60" },
    medium: { label: "中級", color: "#f39c12" },
    hard: { label: "上級", color: "#e74c3c" },
  };

  const config = difficultyConfig[tsumego.difficulty];

  const board = prepareBoard2d(tsumego.board, tsumego.boardSize);
  const [agehamaHistory, setAgehamaHistory] = useState<Agehama[]>([
    { black: 0, white: 0 },
  ]);
  // const agehamaHistoryRef = useRef<Agehama[]>([{ black: 0, white: 0 }]);
  const teritoryBoardRef = useRef<number[][]>( // 黒の陣地(1), 白の陣地(2), 死んでる石(3)。そのほかは(0)
    Array.from({ length: BOARD_SIZE_COUNT }, () =>
      Array.from({ length: BOARD_SIZE_COUNT }, () => 0),
    ),
  );
  // Move state
  const movesRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{tsumego.title}</Text>
          <View
            style={[styles.difficultyBadge, { backgroundColor: config.color }]}
          >
            <Text style={styles.difficultyText}>{config.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        {/* <MiniGoBoard board={tsumego.board} /> */}
        <GoBoard
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
        {/* {tsumego.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.cardDescription}>
              {tsumego.description.split("\n")[0]}
            </Text>
          </View>
        )} */}
      </View>
    </TouchableOpacity>
  );
};

export default function TsumegoList() {
  const router = useRouter();
  const displayName = useContext(DisplayNameContext);

  const handleSelectTsumego = (tsumegoId: number) => {
    router.push({
      pathname: "/Tsumego",
      params: {
        id: tsumegoId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>‹ 戻る</Text>
          </TouchableOpacity>
        </View>

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
              全部{`${displayName}`}が ● だよ
            </Text>
          </View>
        </View>

        {/* 詰碁リスト */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SHIROGUMI_TSUMEGO.map((tsumego) => (
            <TsumegoCard
              key={tsumego.id}
              tsumego={tsumego}
              onPress={() => handleSelectTsumego(tsumego.id)}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    padding: 8,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3498db",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2c3e50",
    marginLeft: 4,
  },
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
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  speechBubble: {
    width: "100%",
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  cardContent: {
    alignItems: "center",
    gap: 12,
  },
  descriptionContainer: {
    width: "100%",
    paddingTop: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: "#7f8c8d",
    textAlign: "center",
    fontWeight: "500",
  },
  miniBoardContainer: {
    backgroundColor: "#daa520",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  miniBoardRow: {
    flexDirection: "row",
  },
  miniBoardCell: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  miniBoardLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#8b6914",
    top: 0,
    bottom: 0,
  },
  miniBoardLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "#8b6914",
    left: 0,
    right: 0,
  },
  miniStone: {
    borderRadius: 100,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  miniStoneHighlight: {
    width: "35%",
    height: "35%",
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    position: "absolute",
    top: "12%",
    left: "12%",
  },
});
