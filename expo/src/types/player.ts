import { Color } from "go-core";

export type PlayerType = {
  username: string;
  uid: string;
  rating: number;
  iconIndex: number;
};

// 🌟 PlayerCard 1枚分の描画にそのまま渡せる、完成済みの表示情報
export type PlayerCardView = {
  username: string;
  iconIndex: number;
  rating: number;
  color: Color;
  showPass: boolean;
  agehamaCount: number;
};
