import { useProfile } from "@/src/active/contexts/ProfileContexts";
import { fetchProfileRPC } from "@/src/stable/logics/profileRPC";
import { recordsRepo } from "@/src/stable/logics/records-repo";

export const useProfileSync = () => {
  const { updateProfile } = useProfile();

  const syncProfile = async (): Promise<boolean> => {
    // 🐱 1. 9路盤と13路盤の最新IDをローカルDBから取ってくる！
    const [afterId9, afterId13] = await Promise.all([
      recordsRepo.getNewestId(9),
      recordsRepo.getNewestId(13),
    ]);

    // 🐱 2. IDを渡してプロフィールを取得
    const result = await fetchProfileRPC(afterId9, afterId13);
    if (!result) return false;

    // 🐱 3. 差分棋譜があれば裏でひっそり保存（awaitせずにスルー！）
    const allNewerRecords = [...result.newerRecords9, ...result.newerRecords13];
    if (allNewerRecords.length > 0) {
      console.log(
        `🐱 プロフィール取得時に ${allNewerRecords.length} 件の新着棋譜を見つけたので裏で保存する`,
      );
      recordsRepo.insertMany(allNewerRecords).catch((e) => {
        console.error("🐱 棋譜のローカル保存に失敗…", e);
      });
    } else {
      console.log("取りこぼし棋譜なし");
    }

    // 🐱 4. Contextの更新
    if (result.sessionUser) {
      updateProfile({
        uid: result.sessionUser.id,
        email: result.sessionUser.email,
        isAnonymous: result.sessionUser.isAnonymous,
      });
    }

    if (result.profile) {
      updateProfile(result.profile);
    }

    return true;
  };

  return { syncProfile };
};
