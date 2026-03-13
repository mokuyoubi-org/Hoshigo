export const THEME_COLORS = {
  standard: {
    background: "#f0f5f9",
    tab: "#ffffff",
    card: "#ffffff",
    text: "#505355",
    button: "#555a5d",
    subtext: "#95999e",
    active: "#565b5f",
    inactive: "#b5bdc2",
    gridLine: "#daeeff",
    gridBackground: "#90afc8",
    borderColor: "#f0f5f9",
    blackStone: "#323436",
    whiteStone: "#eff1f4",
    blackStoneCurrent: "#62696e",
    whiteStoneCurrent: "#acb0ba",
    danger: "#e53e3e",
    dangerBorder: "#fed7d7",
    warning: "#dd6b20",
    warningBorder: "#feebc8",
    shirogumi: "#d7d7d7",
    momogumi: "#e7bae3",
    orangegumi: "#d99b75",
    kiirogumi: "#dad85c",
    midorigumi: "#75d98f",
    aogumi: "#7591d9",
    soragumi: "#75cfd9",
    nijigumi: "#b388c9",
    tsukigumi: "#8d8d8d",
    hoshigumi: "#786200",
    gauge: "#a8bfd1",
  },
} as const;

export type ThemeType = keyof typeof THEME_COLORS;


export const STRAWBERRY = "#c8d6e6";
export const BACKGROUND = "#f9fafb";
export const CHOCOLATE = "#5a3a4a";
export const CHOCOLATE_SUB = "#c09aa8";
export const DANGER = "#e05c5c";
export const GOLD = "#d4af37"; // プレミアム用
export const SILVER = "#b8b8c0";
export const BRONZE = "#cd7f32";
export const STRAWBERRY_DIM = "rgba(200,214,230,0.15)";
export const INACTIVE = "rgba(90,58,74,0.35)";