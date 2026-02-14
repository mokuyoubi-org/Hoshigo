// type Tsumego = {
//   board: Board; // 盤面
//   nextMoveColor: Color; // 黒先の問題か白先の問題か
//   sequence: GoNode[]; // 手のバリエーション
// };

// type GoNode = {
//   move: string; // 手
//   next: GoNode[]; // 子供はいるかどうか。いなければ(終端ならば)空配列
//   status?: "correct" | "wrong"; // 終端なら正解か不正解か。終端でないならundefined
//   color: Color; // moveが"black"か"white"か。
// };

// const makeSingleGoNode = (move: string, color: Color) => {
//   return {
//     move, // 手
//     next: [], // 子供はいるかどうか。いなければ(終端ならば)空配列
//     status: undefined, // 終端なら正解か不正解か。終端でないならnull
//     color, // moveが"black"か"white"か。
//   };
// };

// const allGoNodes = (color: Color, size: number = 9): GoNode[] => {
//   const nodes: GoNode[] = [];

//   for (let y = 1; y <= size; y++) {
//     for (let x = 1; x <= size; x++) {
//       const node: GoNode = {
//         move: `${x},${y}`,
//         next: [],
//         status: undefined,
//         color: color,
//       };

//       nodes.push(node);
//     }
//   }

//   return nodes;
// };


import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';

// 型定義
type Color = 'black' | 'white';
type Position = { row: number; col: number };

type GoNode = {
  move: string; // "pass" or "A1", "B2" etc.
  next: GoNode[];
  status?: 'correct' | 'wrong';
  color: Color;
};

type Board = (Color | null)[][];

type Tsumego = {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  board: Board;
  nextMoveColor: Color;
  sequence: GoNode[];
  description?: string;
};

// サンプルデータ
const SAMPLE_TSUMEGOS: Tsumego[] = [
  {
    id: '1',
    title: '基本的な詰碁 #1',
    difficulty: 'easy',
    description: '白石を取ってください',
    nextMoveColor: 'black',
    board: [
      [null, null, null, null, null],
      [null, 'white', 'white', null, null],
      [null, 'black', null, 'white', null],
      [null, null, 'black', null, null],
      [null, null, null, null, null],
    ],
    sequence: [
      {
        move: 'C2',
        color: 'black',
        next: [
          {
            move: 'B3',
            color: 'white',
            next: [],
            status: 'wrong',
          },
        ],
        status: 'correct',
      },
      {
        move: 'B3',
        color: 'black',
        next: [],
        status: 'wrong',
      },
    ],
  },
  {
    id: '2',
    title: '中級詰碁 #1',
    difficulty: 'medium',
    description: '黒先で白を取る',
    nextMoveColor: 'black',
    board: [
      [null, null, null, null, null, null],
      [null, 'white', 'white', 'white', null, null],
      [null, 'black', null, null, 'white', null],
      [null, 'black', 'black', 'black', 'white', null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
    ],
    sequence: [
      {
        move: 'C2',
        color: 'black',
        next: [
          {
            move: 'D2',
            color: 'white',
            next: [],
            status: 'wrong',
          },
        ],
        status: 'correct',
      },
    ],
  },
  {
    id: '3',
    title: '難問詰碁 #1',
    difficulty: 'hard',
    description: '白先コウ',
    nextMoveColor: 'white',
    board: [
      [null, null, null, null, null, null, null],
      [null, 'black', 'black', 'black', null, null, null],
      [null, 'white', null, 'white', 'black', null, null],
      [null, 'white', 'white', 'white', 'black', null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
    ],
    sequence: [
      {
        move: 'B2',
        color: 'white',
        next: [],
        status: 'correct',
      },
    ],
  },
];

// 碁盤のコンポーネント
const GoBoard: React.FC<{
  board: Board;
  currentMove?: Position;
  onCellPress?: (row: number, col: number) => void;
  interactive?: boolean;
}> = ({ board, currentMove, onCellPress, interactive = false }) => {
  const cellSize = 40;
  const boardSize = board.length;

  return (
    <View style={styles.boardContainer}>
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => {
            const isLastMove =
              currentMove?.row === rowIndex && currentMove?.col === colIndex;
            return (
              <TouchableOpacity
                key={colIndex}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  rowIndex === 0 && styles.cellTopBorder,
                  rowIndex === boardSize - 1 && styles.cellBottomBorder,
                  colIndex === 0 && styles.cellLeftBorder,
                  colIndex === boardSize - 1 && styles.cellRightBorder,
                ]}
                onPress={() => interactive && onCellPress?.(rowIndex, colIndex)}
                disabled={!interactive}
              >
                {cell && (
                  <View
                    style={[
                      styles.stone,
                      cell === 'black' ? styles.blackStone : styles.whiteStone,
                      isLastMove && styles.lastMoveStone,
                    ]}
                  >
                    {isLastMove && (
                      <View style={styles.lastMoveMarker} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// 詰碁一覧ページ
const TsumegoListScreen: React.FC<{
  onSelectProblem: (tsumego: Tsumego) => void;
}> = ({ onSelectProblem }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'hard':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '初級';
      case 'medium':
        return '中級';
      case 'hard':
        return '上級';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>詰碁問題集</Text>
      </View>
      <ScrollView style={styles.listContainer}>
        {SAMPLE_TSUMEGOS.map((tsumego) => (
          <TouchableOpacity
            key={tsumego.id}
            style={styles.problemCard}
            onPress={() => onSelectProblem(tsumego)}
          >
            <View style={styles.problemPreview}>
              <GoBoard board={tsumego.board} />
            </View>
            <View style={styles.problemInfo}>
              <Text style={styles.problemTitle}>{tsumego.title}</Text>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(tsumego.difficulty) },
                ]}
              >
                <Text style={styles.difficultyText}>
                  {getDifficultyText(tsumego.difficulty)}
                </Text>
              </View>
              {tsumego.description && (
                <Text style={styles.problemDescription}>
                  {tsumego.description}
                </Text>
              )}
              <Text style={styles.problemMeta}>
                {tsumego.nextMoveColor === 'black' ? '黒先' : '白先'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// 詰碁問題ページ
const TsumegoProblemScreen: React.FC<{
  tsumego: Tsumego;
  onBack: () => void;
}> = ({ tsumego, onBack }) => {
  const [board, setBoard] = useState<Board>(
    tsumego.board.map((row) => [...row])
  );
  const [moveHistory, setMoveHistory] = useState<
    Array<{ position: Position; color: Color }>
  >([]);
  const [currentNode, setCurrentNode] = useState<GoNode[] | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const parseMove = (move: string): Position | null => {
    if (move === 'pass') return null;
    const col = move.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(move.slice(1)) - 1;
    if (row >= 0 && row < board.length && col >= 0 && col < board[0].length) {
      return { row, col };
    }
    return null;
  };

  const positionToMove = (row: number, col: number): string => {
    return `${String.fromCharCode('A'.charCodeAt(0) + col)}${row + 1}`;
  };

  const handleCellPress = (row: number, col: number) => {
    if (isComplete || board[row][col] !== null) return;

    const move = positionToMove(row, col);
    const currentColor = tsumego.nextMoveColor;
    const actualColor =
      moveHistory.length % 2 === 0 ? currentColor : currentColor === 'black' ? 'white' : 'black';

    // 現在の正解手順を取得
    const possibleNodes = currentNode || tsumego.sequence;
    const matchingNode = possibleNodes.find(
      (node) => node.move === move && node.color === actualColor
    );

    if (!matchingNode) {
      Alert.alert('不正解', 'その手は正解ではありません。もう一度考えてみましょう。');
      return;
    }

    // 盤面を更新
    const newBoard = board.map((row) => [...row]);
    newBoard[row][col] = actualColor;
    setBoard(newBoard);
    setMoveHistory([...moveHistory, { position: { row, col }, color: actualColor }]);

    // 終端チェック
    if (matchingNode.next.length === 0) {
      setIsComplete(true);
      setResult(matchingNode.status || null);
      if (matchingNode.status === 'correct') {
        Alert.alert('正解！', 'おめでとうございます！詰碁を解きました。');
      } else {
        Alert.alert('失敗', 'この変化は失敗です。最初からやり直してください。');
      }
    } else {
      setCurrentNode(matchingNode.next);
      
      // AIの応手（次の手が1つしかない場合は自動で打つ）
      if (matchingNode.next.length === 1) {
        setTimeout(() => {
          const aiNode = matchingNode.next[0];
          const aiPos = parseMove(aiNode.move);
          if (aiPos) {
            const newBoard2 = newBoard.map((row) => [...row]);
            newBoard2[aiPos.row][aiPos.col] = aiNode.color;
            setBoard(newBoard2);
            setMoveHistory((prev) => [
              ...prev,
              { position: aiPos, color: aiNode.color },
            ]);
            
            if (aiNode.next.length === 0) {
              setIsComplete(true);
              setResult(aiNode.status || null);
              if (aiNode.status === 'correct') {
                Alert.alert('正解！', 'おめでとうございます！詰碁を解きました。');
              }
            } else {
              setCurrentNode(aiNode.next);
            }
          }
        }, 500);
      }
    }
  };

  const handleReset = () => {
    setBoard(tsumego.board.map((row) => [...row]));
    setMoveHistory([]);
    setCurrentNode(null);
    setIsComplete(false);
    setResult(null);
  };

  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].position : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tsumego.title}</Text>
      </View>

      <ScrollView style={styles.problemContainer}>
        <View style={styles.problemHeader}>
          <Text style={styles.problemTitle}>
            {tsumego.nextMoveColor === 'black' ? '黒先' : '白先'}
          </Text>
          {tsumego.description && (
            <Text style={styles.problemDescription}>{tsumego.description}</Text>
          )}
        </View>

        <View style={styles.boardWrapper}>
          <GoBoard
            board={board}
            currentMove={lastMove}
            onCellPress={handleCellPress}
            interactive={!isComplete}
          />
        </View>

        {result && (
          <View
            style={[
              styles.resultBanner,
              result === 'correct' ? styles.correctBanner : styles.wrongBanner,
            ]}
          >
            <Text style={styles.resultText}>
              {result === 'correct' ? '✓ 正解！' : '✗ 失敗'}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>最初から</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.moveHistory}>
          <Text style={styles.moveHistoryTitle}>手順:</Text>
          {moveHistory.map((move, index) => (
            <Text key={index} style={styles.moveHistoryItem}>
              {index + 1}. {move.color === 'black' ? '●' : '○'}{' '}
              {positionToMove(move.position.row, move.position.col)}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// メインアプリ
export default function App() {
  const [selectedTsumego, setSelectedTsumego] = useState<Tsumego | null>(null);

  return selectedTsumego ? (
    <TsumegoProblemScreen
      tsumego={selectedTsumego}
      onBack={() => setSelectedTsumego(null)}
    />
  ) : (
    <TsumegoListScreen onSelectProblem={setSelectedTsumego} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  problemCard: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  problemPreview: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  problemInfo: {
    padding: 16,
  },
  problemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  problemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  problemMeta: {
    fontSize: 14,
    color: '#999',
  },
  problemContainer: {
    flex: 1,
  },
  problemHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  boardContainer: {
    backgroundColor: '#DEB887',
    padding: 10,
    borderRadius: 8,
  },
  boardWrapper: {
    alignItems: 'center',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#000',
  },
  cellTopBorder: {
    borderTopWidth: 1.5,
  },
  cellBottomBorder: {
    borderBottomWidth: 1.5,
  },
  cellLeftBorder: {
    borderLeftWidth: 1.5,
  },
  cellRightBorder: {
    borderRightWidth: 1.5,
  },
  stone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackStone: {
    backgroundColor: '#000',
  },
  whiteStone: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#999',
  },
  lastMoveStone: {
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  lastMoveMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
  },
  resultBanner: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  correctBanner: {
    backgroundColor: '#4CAF50',
  },
  wrongBanner: {
    backgroundColor: '#F44336',
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controls: {
    padding: 16,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moveHistory: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
  },
  moveHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  moveHistoryItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});