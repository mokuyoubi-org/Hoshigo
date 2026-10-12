// packages/expo-katago/src/i18n/dictionary.ts

export const kataGoDictionary = {
  gate: {
    en: {
      connecting: "Connecting to AI",
      downloading: "Downloading AI for the first time",
      warming_up: "Starting AI",
      errorTitle: "Failed to prepare AI",
    },
    ja: {
      connecting: "AIに接続中",
      downloading: "AIの初回ダウンロード中",
      warming_up: "AIを起動中",
      errorTitle: "AIの準備に失敗しました",
    },
    zh: {
      connecting: "正在连接AI",
      downloading: "正在首次下载AI",
      warming_up: "正在启动AI",
      errorTitle: "AI准备失败",
    },
    ko: {
      connecting: "AI 연결 중",
      downloading: "AI 최초 다운로드 중",
      warming_up: "AI 시작 중",
      errorTitle: "AI 준비 실패",
    },
  },
} as const;
