SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.calculate_match_delta (
  p_winner_rating    smallint,
  p_loser_rating     smallint,
  p_winner_giantkill smallint,
  p_winner_games     smallint,
  p_is_bot_match     boolean,
  OUT                o_winner_delta smallint,
  OUT                o_loser_delta smallint,
  OUT                o_winner_giantkill smallint,
  OUT                o_loser_giantkill smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint;         -- レーティング差（敗者 - 勝者）
  v_base_delta smallint;   -- 基本変動量
begin
  -- 1. レーティング差の計算（正の数なら勝者が格上を倒した「ジャイアントキリング」）
  v_diff := p_loser_rating - p_winner_rating;

  -- 2. 基本変動量の計算（0〜20の範囲に収める）
  -- 同レート(v_diff=0)なら10、格上勝利で最大20、格下勝利で最小0
  v_base_delta := greatest(0, least(20,
    10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
  ));

  -- 3. Bot戦の判定・補正
  if p_is_bot_match then
    v_base_delta := 10 ;
  end if;

  -- 🎉勝った方への処理 --

  -- 4. 勝者の格上連勝数を更新（格上勝利なら+1、格下勝利なら維持）
  o_winner_giantkill := p_winner_giantkill + case when v_diff > 0 then 1 else 0 end;

  -- 5. 勝者のレーティング変動量を決定
  -- 格上勝利なら連勝数倍のボーナスを適用、格下勝利なら基本変動量のまま
  if v_diff > 0 then
    o_winner_delta := v_base_delta * o_winner_giantkill;
  else
    o_winner_delta := v_base_delta;
  end if;

  -- 😢負けた方への処理 --

  -- 6. 敗者の格上連勝数をリセット
  o_loser_giantkill := 0;

  -- 7. 敗者のレーティング変動量を決定
  -- 勝者が格上 かつ 対局数が30以下（初心者）の場合はペナルティなし(0)
  -- それ以外は基本変動量分マイナス
  if v_diff > 0 and p_winner_games <= 30 then
    o_loser_delta := 0;
  else
    o_loser_delta := -v_base_delta;
  end if;
end;
$function$;
