# expo-goband

Go (Weiqi/Baduk) board rendering, game state management, replay controls, and territory/scoring engine for React Native & Expo.

## Features

- **Pure State Machine (`useGoBoardState`)**: Clean state management handling move histories, territory logic, prisoner counts (Agehama), and resync mechanics.
- **Interactive Board (`GoBoard`)**: Optimized React Native board rendering with move audio feedback and handicap (Okigo) support.
- **Replay Control (`ReplayControls`)**: Standard slider and navigation buttons for history browsing and SGF-like game inspection.
- **Scoring Engine (`goscorer`)**: Built-in territory evaluation and scoring capabilities.

## Installation

Install `expo-goband` along with its peer dependencies:

npm install expo-goband @react-native-community/slider expo-av

Make sure your `metro.config.js` includes `.mp3` as a supported asset extension:

const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("mp3");

module.exports = config;

## Basic Usage

Here is a simple example of integrating `GoBoard`, `useGoBoardState`, and `ReplayControls`:

import React from "react";
import { View, SafeAreaView, StyleSheet } from "react-native";
import { GoBoard, useGoBoardState, ReplayControls } from "expo-goband";

export default function GameScreen() {
  const goBoard = useGoBoardState({ boardSize: 19 });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.boardWrapper}>
        <GoBoard
          boardSize={goBoard.boardSize}
          boardState={goBoard.boardState}
          lastMove={goBoard.lastMove}
          onIntersectionPress={(x, y) => {
            goBoard.applyOwnMove(x, y);
          }}
        />
      </View>

      <View style={styles.controlsWrapper}>
        <ReplayControls
          currentIndex={goBoard.currentIndex}
          maxIndex={goBoard.history.length}
          onIndexChange={(index) => {
            goBoard.setCurrentIndex(index);
          }}
          onGoToLatest={goBoard.goToLatest}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  boardWrapper: {
    width: "100%",
    aspectRatio: 1,
    padding: 8,
  },
  controlsWrapper: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 20,
  },
});

## API Reference

### Hooks

#### `useGoBoardState(options)`

Manages board state, move history, prisoners, and time-machine replay indices.

- **Parameters**:
  - `boardSize` (`number`): Board size (default: `19`).
  - `handicap` (`number`): Handicap stones count (default: `0`).
- **Returns**:
  - `boardState`: Current 2D grid array representing stone positions.
  - `history`: Full array of moves played so far.
  - `currentIndex`: Currently displayed step index (for replay inspection).
  - `applyOwnMove(x, y)`: Applies a local user move.
  - `applyRemoteMove(x, y, color)`: Applies an incoming remote or bot move.
  - `resyncFromMoves(moves)`: Resynchronizes state from a full move array.
  - `setCurrentIndex(index)`: Moves replay display index without modifying active game state.
  - `goToLatest()`: Resets replay index to the latest move.

### Components

#### `<GoBoard />`

Interactive Go board UI component.

| Prop | Type | Description |
| --- | --- | --- |
| `boardSize` | `number` | Size of the board (e.g., 9, 13, 19) |
| `boardState` | `BoardState` | 2D board state array |
| `lastMove` | `Point \| null` | Coordinates of the last move for marker highlighting |
| `onIntersectionPress` | `(x: number, y: number) => void` | Callback when a user taps an intersection |
| `disabled` | `boolean` | Disables interaction when `true` |

#### `<ReplayControls />`

Standard navigation bar for reviewing move history.

| Prop | Type | Description |
| --- | --- | --- |
| `currentIndex` | `number` | Active step being inspected |
| `maxIndex` | `number` | Total number of moves |
| `onIndexChange` | `(index: number) => void` | Triggered when slider or step buttons are moved |
| `onGoToLatest` | `() => void` | Triggered when jumping to the latest move |

## License

MIT