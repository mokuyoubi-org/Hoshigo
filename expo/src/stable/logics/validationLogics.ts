// validationLogics.ts
// ====================================================================================
// 【ファイル全体の責務】
// 「入力データの正しさチェック（バリデーション）」の機能を提供する
// ====================================================================================

/**
 * 🟩🟦 使い方:
 * メールアドレスが正しい形式（「xxx@yyy.zzz」など）になっているかをチェックする関数。
 * 正しければ true、間違っていれば false を返す
 */
export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 🟨🟦 使い方:
 * ユーザー名が正しい形式（半角英数字・アンダースコアで3〜12文字）かチェックする関数。
 */
export type UsernameValidationError =
  | "required"
  | "length"
  | "invalidFormat"
  | null;

export const validateUsername = (text: string): UsernameValidationError => {
  const regex = /^[A-Za-z0-9_]{3,12}$/;
  if (!text) {
    return "required";
  }
  if (text.length < 3 || text.length > 12) {
    return "length";
  }
  if (!regex.test(text)) {
    return "invalidFormat";
  }
  return null;
};
