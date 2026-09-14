export const winsToAcquiredIcons = (
  wins9: number,
  wins13: number,
  // wins19: number,
): number[] => {
  const winsTotal: number = wins9 + wins13;
  // + wins19
  const acquiredIcons: number[] = [];

  // デフォルト
  acquiredIcons.push(0);

  // ライトユーザ
  if (winsTotal >= 100) acquiredIcons.push(1);
  if (winsTotal >= 200) acquiredIcons.push(2);
  if (winsTotal >= 300) acquiredIcons.push(3);
  if (winsTotal >= 500) acquiredIcons.push(4);
  if (winsTotal >= 700) acquiredIcons.push(5);

  // ヘビーユーザ
  if (wins9 >= 1000) acquiredIcons.push(6);
  if (wins9 >= 2000) acquiredIcons.push(7);
  if (wins13 >= 1000) acquiredIcons.push(8);
  if (wins13 >= 2000) acquiredIcons.push(9);
  // if (wins19 >= 1000) acquiredIcons.push(10);
  // if (wins19 >= 2000) acquiredIcons.push(11);

  return acquiredIcons;
};

export const winsToNewlyAcquiredIconIndex = (
  wins9: number,
  wins13: number,
  // wins19: number,
): number | undefined => {
  const winsTotal: number = wins9 + wins13;
  // + wins19

  // ライトユーザ
  if (winsTotal === 100) return 1;
  if (winsTotal === 200) return 2;
  if (winsTotal === 300) return 3;
  if (winsTotal === 500) return 4;
  if (winsTotal === 700) return 5;

  // ヘビーユーザ
  if (wins9 === 1000) return 6;
  if (wins9 === 2000) return 7;
  if (wins13 === 1000) return 8;
  if (wins13 === 2000) return 9;
  // if (wins19 === 1000) return 10;
  // if (wins19 === 2000) return 11;

};
