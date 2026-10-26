// src/services/auth/ensureSession.ts

import { authClient } from "@/src/services/auth/auth-client";

// ログインしている(セッションがある)なら true、ビジター(ログインなし)なら false を返す。
// ゲストは作らない。オンライン対局は、ログインが必須。
export const ensureSession = async (): Promise<boolean> => {
  // 🛟 一瞬だけ null に見えることがあるので、サーバーに「本当にセッションが無いか」を聞く
  const { data: current, error } = await authClient.getSession({
    query: { disableCookieCache: true },
  });
  if (error) {
    console.error("セッションの確認に失敗:", error);
    return false;
  }
  return !!current?.user;
};
