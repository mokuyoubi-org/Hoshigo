SET local check_function_bodies = off;

ALTER TABLE "private"."profiles"
  ALTER COLUMN "lastseen" SET DEFAULT CURRENT_DATE;

CREATE OR REPLACE FUNCTION private.calculate_draw_delta (
  p_black_rating smallint,
  p_white_rating smallint,
  p_is_bot_match boolean,
  OUT            o_black_delta smallint,
  OUT            o_white_delta smallint
)
  RETURNS record
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint;
begin
  -- Bot戦（どちらかがBot）の場合は変動なし（0pt）
  if p_is_bot_match then
    o_black_delta := 0;
    o_white_delta := 0;
  else
    -- 人間同士の場合: レート差100ごとに±1pt調整
    v_diff := p_white_rating - p_black_rating;

    o_black_delta := (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100;
    o_white_delta := -o_black_delta;
  end if;
end;
$function$;

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
  IMMUTABLE
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
  -- 勝者のレートが敗者より低く、勝者の対局数が30以下で、ボット戦ではないなら、
  -- それは対局数が少ないだけの偽の格下に負けたということなので、敗者のレートは下げない
  -- それ以外は基本変動量分マイナス
  if v_diff > 0 and p_winner_games <= 30 and not p_is_bot_match then
    o_loser_delta := 0;
  else
    o_loser_delta := -v_base_delta;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.fetch_newer_records (
  p_player_uid uuid,
  p_board_size smallint,
  p_after_id   integer,
  p_limit      smallint DEFAULT 10
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_records_json jsonb;
begin
  if p_after_id is null then
    return '[]'::jsonb;
  end if;

  -- サブクエリで ORDER BY と LIMIT を適用してから jsonb_agg でまとめる
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'created_at', t.created_at,
        'result', t.result,
        'match_type', t.match_type,
        'moves', t.moves,
        'dead_stones', t.dead_stones,
        'black_rating', t.black_rating,
        'white_rating', t.white_rating,
        'board_size', t.board_size,
        'black_uid', t.black_uid,
        'black_username', t.black_username,
        'black_icon_index', t.black_icon_index,
        'black_rank_index', t.black_rank_index,
        'white_uid', t.white_uid,
        'white_username', t.white_username,
        'white_icon_index', t.white_icon_index,
        'white_rank_index', t.white_rank_index
      )
    ),
    '[]'::jsonb
  )
  into v_records_json
  from (
    select
      r.id,
      r.created_at,
      r.result,
      r.match_type,
      r.moves,
      r.dead_stones,
      r.black_rating,
      r.white_rating,
      r.board_size,
      r.black_uid,
      bp.username as black_username,
      bp.icon_index as black_icon_index,
      private.rating_to_rank_index(r.black_rating) as black_rank_index,
      r.white_uid,
      wp.username as white_username,
      wp.icon_index as white_icon_index,
      private.rating_to_rank_index(r.white_rating) as white_rank_index
    from private.records r
    left join private.profiles bp on bp.uid = r.black_uid
    left join private.profiles wp on wp.uid = r.white_uid
    where (r.black_uid = p_player_uid or r.white_uid = p_player_uid)
      and r.board_size = p_board_size
      and r.id > p_after_id
    order by r.id asc
    limit p_limit
  ) t;

  return v_records_json;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_username (
  new_username text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  current_user_id uuid;
begin
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();
  
  -- 1. ログイン中のユーザーIDを取得する
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. バリデーション（3〜20文字の半角英数字・アンダースコア）
  if new_username !~ '^[A-Za-z0-9_]{3,12}$' then
    raise exception 'Invalid username format';
  end if;

  -- 3. ユーザー名の重複チェック（他の人が使っていないか確認）
  if exists (
    select 1 
    from private.profiles 
    where username = new_username 
      and uid <> current_user_id
  ) then
    raise exception 'Username already taken';
  end if;

  -- 4. ユーザー名を更新する
  update private.profiles
  set username = new_username
  where uid = current_user_id;

end;
$function$;
