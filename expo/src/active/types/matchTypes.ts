// @/src/active/types/go.ts

// Recordすなわち過去の対局で必要なデータ
export type RecordType = {
  id: number;
  black_uid: string;
  white_uid: string;
  created_at: string;
  black_username: string;
  white_username: string;
  black_icon_index: number;
  white_icon_index: number;
  black_group_index: number;
  white_group_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: number;
};

export type Agehama = {
  black: number;
  white: number;
};
