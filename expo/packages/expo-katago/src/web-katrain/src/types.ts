// types.ts
// 2026/09/17: 不要な型は削除している。芋づる式でどんどんファイルが必要になってしまうのを防ぐため。
// 2026/10/10: BoardSizeに5を追加。
export type BoardSize = 5 | 9 | 13 | 19;
export const DEFAULT_BOARD_SIZE: BoardSize = 19;
export const KOMI = 6.5;

export type Player = 'black' | 'white';
export type Intersection = Player | null;
export type BoardState = Intersection[][];
export type GameRules =
  | 'japanese'
  | 'chinese'
  | 'korean'
  | 'aga'
  | 'new-zealand'
  | 'tromp-taylor'
  | 'stone-scoring';
export type KataGoBackendPreference = 'wasm' | 'webgpu' | 'cpu';
export type FloatArray = Float32Array | number[];

export interface Move {
    x: number;
    y: number;
    player: Player;
}

export interface CandidateMove {
  x: number;
  y: number;
  winRate: number; // 0-1
  winRateLost?: number; // positive = worse for side to play
  scoreLead: number;
  scoreSelfplay?: number;
  scoreStdev?: number;
  visits: number;
  edgeVisits?: number; // KataGo edgeVisits: what the root paid for this move
  noResultValue?: number; // KataGo noResultValue for this move's subtree
  weight?: number; // total weight behind the child
  edgeWeight?: number; // the share of it this edge bought
  pointsLost: number; // relative to root eval (KaTrain-like)
  relativePointsLost?: number; // relative to top move (KaTrain-like)
  order: number; // 0 for best move
  prior?: number; // policy prior probability (0..1)
  pv?: string[]; // principal variation, GTP coords (e.g. ["D4","Q16",...])
  pvVisits?: number[]; // visits behind each move of the pv (KataGo includePVVisits)
  pvEdgeVisits?: number[]; // visits this line paid for; never rises along the pv
  lcb?: number; // winrate-scale lower confidence bound, black perspective
  utilityLcb?: number; // utility-scale lower confidence bound, black perspective
  playSelectionValue?: number; // KataGo play selection weight, LCB adjusted
  utility?: number; // KataGo utilityAvg for this child, black perspective
  humanPrior?: number; // human SL policy for this move, when that net is loaded
  ownership?: FloatArray; // optional per-move ownership (KaTrain includeMovesOwnership)
}

export type RegionOfInterest = { xMin: number; xMax: number; yMin: number; yMax: number };
