export  type Match = {
  id: string;
  black_uid: string;
  white_uid: string | null;
  black_username: string;
  white_username: string | null;
  black_displayname: string;
  white_displayname: string | null;
  status: "waiting" | "playing" | "ended";
  moves: number[];
  created_at: string;
  result: string | null;
  dead_stones: number[];
  black_last_seen: string | null;
  white_last_seen: string | null;
  turn: "black" | "white";
  turn_switched_at: string | null;
  black_remain_seconds: number;
  white_remain_seconds: number;
  black_points: number;
  white_points: number;
  black_gumi_index: number;
  white_gumi_index: number;
  black_icon_index: number;
  white_icon_index: number;
  match_type: number;
};


export type MatchArchive = {
  id: number;
  black_uid: string;
  white_uid: string;
  created_at: string;
  black_points: number;
  white_points: number;
  black_username: string;
  white_username: string ;
  black_displayname: string;
  white_displayname: string ;
  black_icon_index: number;
  white_icon_index: number;
  black_gumi_index: number;
  white_gumi_index: number;
  result: string | null;
  moves: number[];
  dead_stones: number[];
  match_type: number;
};


export type Agehama = {
  black: number;
  white: number;
};