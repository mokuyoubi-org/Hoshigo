// src/components/ResponsiveGrid.tsx
// 横幅に合わせて、何列並べるかを自動で決めるグリッド。
// 「カード1枚の最小の幅(minItemWidth)」と「並べるもの(data)」を渡すと、
// 列の数とカード1枚の大きさ(size)を計算して、renderItem に渡してくれる。
// 画面(ウィンドウ)の幅を基準にしているので、画面いっぱいに置く前提。

import { ReactElement } from "react";
import { FlatList, FlatListProps, useWindowDimensions } from "react-native";

type Props<T> = Omit<
  FlatListProps<T>,
  | "renderItem"
  | "numColumns"
  | "columnWrapperStyle"
  | "contentContainerStyle"
  | "contentContainerClassName"
> & {
  // カード1枚の「これより小さくしたくない」幅
  minItemWidth: number;
  // size = カード1枚の幅。この大きさでカードを作る
  renderItem: (item: T, size: number) => ReactElement;
  // カードとカードのすき間
  gap?: number;
  // 左右の余白
  padding?: number;
  // 最低でも何列にするか
  minColumns?: number;
};

// アロー関数でジェネリクス(T)を使うときは、<T,> と書く(tsxの決まり)
export const ResponsiveGrid = <T,>({
  minItemWidth,
  renderItem,
  gap = 8,
  padding = 16,
  minColumns = 2,
  ...rest
}: Props<T>) => {
  const { width } = useWindowDimensions();

  // 何列入るか数える
  const numColumns = Math.max(
    minColumns,
    Math.floor((width - padding * 2 + gap) / (minItemWidth + gap)),
  );
  // 余った幅を列で等分して、カード1枚の幅にする
  const size = Math.floor(
    (width - padding * 2 - gap * (numColumns - 1)) / numColumns,
  );

  return (
    <FlatList
      {...rest}
      // 列の数が変わるときは key を変えないとエラーになる
      key={numColumns}
      numColumns={numColumns}
      // 1列のときに columnWrapperStyle を付けるとエラーになるので分ける
      columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
      renderItem={({ item }) => renderItem(item, size)}
      contentContainerStyle={{
        gap,
        paddingHorizontal: padding,
        paddingBottom: 32,
      }}
    />
  );
};
/*
使い方:
<ResponsiveGrid
  minItemWidth={160}
  data={items}
  keyExtractor={(x) => x.id}
  renderItem={(item, size) => <好きなカード item={item} size={size} />}
/>
 */
