// Recordすなわち過去の対局で必要なデータ
export type RecordType = {
  id: number;
  black_uid: string;
  white_uid: string;
  created_at: string;
  black_displayname: string;
  white_displayname: string;
  black_icon_index: number;
  white_icon_index: number;
  black_gumi_index: number;
  white_gumi_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: number;
};

export type PlayingType = {
  id: number;
  black_uid: string;
  white_uid: string;
  created_at: string;
  black_displayname: string;
  white_displayname: string;
  black_icon_index: number;
  white_icon_index: number;
  black_gumi_index: number;
  white_gumi_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: number;
  black_seconds: number; // 
  white_seconds: number; // 
  status: string; // "playing" か "finished" か
  
};

export type Agehama = {
  black: number;
  white: number;
};
