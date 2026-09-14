SET local check_function_bodies = off;

DROP FUNCTION "private"."calculate_icons"(smallint, smallint);

DROP FUNCTION "private"."calculate_new_icons"(smallint[], smallint, smallint);

ALTER TABLE "private"."profiles"
  DROP COLUMN "acquired_icons";

ALTER TABLE "private"."user_stats"
  ADD COLUMN "highest_rating" smallint DEFAULT '0'::smallint;

CREATE OR REPLACE FUNCTION private.archive_matches()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_black_delta smallint := 0;
  v_white_delta smallint := 0;
  v_black_games smallint;
  v_white_games smallint;
  v_is_black_bot boolean;
  v_is_white_bot boolean;
  v_black_rating smallint;
  v_white_rating smallint;
  v_black_giantkill smallint := 0;
  v_white_giantkill smallint := 0;
  v_black_new_rating smallint;
  v_white_new_rating smallint;
  v_black_wins smallint := 0;
  v_white_wins smallint := 0;

  -- 勝敗・引き分けインクリメント用
  v_black_win_inc smallint := 0;
  v_black_loss_inc smallint := 0;
  v_black_draw_inc smallint := 0;
  v_white_win_inc smallint := 0;
  v_white_loss_inc smallint := 0;
  v_white_draw_inc smallint := 0;

  -- 反対側盤サイズの保持
  v_black_rating_other smallint := 0;
  v_white_rating_other smallint := 0;

  v_other_board_size smallint;
  v_calc_res record;
begin
  v_other_board_size := case when new.board_size = 9 then 13 else 9 end;

  -- ─── 1. プロフィール＆戦績情報の取得 ─────────────────────────────
  -- 黒（⚫️）
  select is_bot
  into v_is_black_bot
  from private.profiles
  where uid = new.black_uid;

  select coalesce(wins, 0), coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giantkill, 0)
  into v_black_wins, v_black_games, v_black_rating, v_black_giantkill
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_black_rating_other
  from private.user_stats
  where uid = new.black_uid and board_size = v_other_board_size;

  -- 白（⚪️）
  select is_bot
  into v_is_white_bot
  from private.profiles
  where uid = new.white_uid;

  select coalesce(wins, 0), coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giantkill, 0)
  into v_white_wins, v_white_games, v_white_rating, v_white_giantkill
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_white_rating_other
  from private.user_stats
  where uid = new.white_uid and board_size = v_other_board_size;

-- ─── 2. 勝敗判定と計算処理 ─────────────────────────────────
  if new.result like 'B+%' then
    v_black_win_inc := 1;
    v_white_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      v_black_rating, v_white_rating, v_black_giantkill, v_black_games, 
      (v_is_black_bot or v_is_white_bot) 
    );
    v_black_delta      := v_calc_res.o_winner_delta;
    v_white_delta      := v_calc_res.o_loser_delta;
    v_black_giantkill  := v_calc_res.o_winner_giantkill;
    v_white_giantkill  := v_calc_res.o_loser_giantkill;

  elsif new.result like 'W+%' then
    v_white_win_inc := 1;
    v_black_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      v_white_rating, v_black_rating, v_white_giantkill, v_white_games, 
      (v_is_black_bot or v_is_white_bot) 
    );
    v_white_delta      := v_calc_res.o_winner_delta;
    v_black_delta      := v_calc_res.o_loser_delta;
    v_white_giantkill  := v_calc_res.o_winner_giantkill;
    v_black_giantkill  := v_calc_res.o_loser_giantkill;

  elsif new.result = 'DRAW' then
    v_black_draw_inc := 1;
    v_white_draw_inc := 1;

    v_calc_res := private.calculate_draw_delta(
      v_black_rating, 
      v_white_rating, 
      (v_is_black_bot or v_is_white_bot)
    );
    v_black_delta := v_calc_res.o_black_delta;
    v_white_delta := v_calc_res.o_white_delta;
  end if;

  -- 新レート計算
  v_black_new_rating := greatest(0, v_black_rating + v_black_delta);
  v_white_new_rating := greatest(0, v_white_rating + v_white_delta);

  -- ─── 4. テーブル更新 ───────────────────────────────────
  -- 黒（⚫️）
  if not v_is_black_bot then
    update private.user_stats set
      wins      = wins + v_black_win_inc,
      losses    = losses + v_black_loss_inc,
      draws     = draws + v_black_draw_inc,
      rating    = v_black_new_rating,
      giantkill = v_black_giantkill
    where uid = new.black_uid and board_size = new.board_size;
  else
    update private.user_stats set
      wins   = wins + v_black_win_inc,
      losses = losses + v_black_loss_inc,
      draws  = draws + v_black_draw_inc
    where uid = new.black_uid and board_size = new.board_size;
  end if;

  -- 白（⚪️）
  if not v_is_white_bot then
    update private.user_stats set
      wins      = wins + v_white_win_inc,
      losses    = losses + v_white_loss_inc,
      draws     = draws + v_white_draw_inc,
      rating    = v_white_new_rating,
      giantkill = v_white_giantkill
    where uid = new.white_uid and board_size = new.board_size;
  else
    update private.user_stats set
      wins   = wins + v_white_win_inc,
      losses = losses + v_white_loss_inc,
      draws  = draws + v_white_draw_inc
    where uid = new.white_uid and board_size = new.board_size;
  end if;

  -- ─── 5. レコード挿入・リアルタイム通知・削除 ─────────────────
  insert into private.records (
    id, black_uid, white_uid, moves, result,
    black_rating, white_rating, match_type, board_size, dead_stones, created_at
  ) values (
    new.id, new.black_uid, new.white_uid, new.moves, new.result,
    v_black_rating, v_white_rating, new.match_type, new.board_size, new.dead_stones, now()
  ) on conflict (id) do nothing;

perform realtime.send(
    jsonb_build_object(
      'result', new.result,
      'black', jsonb_build_object(
        'new_rating', case when v_is_black_bot then v_black_rating else v_black_new_rating end,
        'wins', v_black_wins + v_black_win_inc
      ),
      'white', jsonb_build_object(
        'new_rating', case when v_is_white_bot then v_white_rating else v_white_new_rating end,
        'wins', v_white_wins + v_white_win_inc
      )
    ),
    'rating_updated',
    'game:' || new.id::text,
    false
  );

  delete from private.matches m where m.id = new.id;
  return null;
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

CREATE OR REPLACE FUNCTION private.get_bot_match_info (
  p_rating     smallint,
  p_board_size smallint,
  OUT          o_bot_uid uuid,
  OUT          o_match_type smallint
)
  RETURNS record
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
declare
  v_rank smallint;
  v_bot_username text;
  v_rand double precision;
begin
  -- ポイントからランク(0: 10k 〜 17: 8D)を計算する
  v_rank := private.rating_to_rank_index(p_rating);

  -- ----------------------------------------------------
  -- 1. ランクの揺らぎ（確率計算）
  -- ----------------------------------------------------
  v_rand := random();

  if p_board_size = 9 then
    -- 9路盤：全ランク（10k〜8D）でランク上昇確率を適用
    if v_rank <= 15 then
      if v_rand < 0.50 then v_rank := v_rank;
      elsif v_rand < 0.80 then v_rank := v_rank + 1;
      else v_rank := v_rank + 2;
      end if;
    elsif v_rank = 16 then
      if v_rand >= 0.50 then v_rank := v_rank + 1; end if;
    end if;

  elsif p_board_size = 13 or p_board_size = 19 then
    -- 13路・19路盤：4k(ランク6)以上のみ、9路と同じランク上昇確率を適用
    if v_rank >= 6 then
      if v_rank <= 15 then
        if v_rand < 0.50 then v_rank := v_rank;
        elsif v_rand < 0.80 then v_rank := v_rank + 1;
        else v_rank := v_rank + 2;
        end if;
      elsif v_rank = 16 then
        if v_rand >= 0.50 then v_rank := v_rank + 1; end if;
      end if;
    end if;
  end if;

  -- ----------------------------------------------------
  -- 2. 盤サイズと確定後のランクに応じた bot・match_type の決定
  -- ----------------------------------------------------
  if p_board_size = 9 then
    case v_rank
      when 0 then v_bot_username := 'bot1'; o_match_type := 5; -- 10k
      when 1 then v_bot_username := 'bot2'; o_match_type := 5; -- 9k
      when 2 then v_bot_username := 'bot3'; o_match_type := 5; -- 8k
      when 3 then v_bot_username := 'bot1'; o_match_type := 4; -- 7k
      when 4 then v_bot_username := 'bot2'; o_match_type := 4; -- 6k
      when 5 then v_bot_username := 'bot3'; o_match_type := 4; -- 5k
      when 6 then v_bot_username := 'bot1'; o_match_type := 3; -- 4k
      when 7 then v_bot_username := 'bot2'; o_match_type := 3; -- 3k
      when 8 then v_bot_username := 'bot3'; o_match_type := 3; -- 2k
      when 9 then v_bot_username := 'bot1'; o_match_type := 2; -- 1k
      when 10 then v_bot_username := 'bot2'; o_match_type := 2; -- 1D
      when 11 then v_bot_username := 'bot3'; o_match_type := 2; -- 2D
      when 12 then v_bot_username := 'bot1'; o_match_type := 1; -- 3D
      when 13 then v_bot_username := 'bot2'; o_match_type := 1; -- 4D
      when 14 then v_bot_username := 'bot3'; o_match_type := 1; -- 5D
      when 15 then v_bot_username := 'bot1'; o_match_type := 0; -- 6D
      when 16 then v_bot_username := 'bot2'; o_match_type := 0; -- 7D
      when 17 then v_bot_username := 'bot3'; o_match_type := 0; -- 8D
      else null;
    end case;

  elsif p_board_size = 13 then
    if v_rank <= 5 then
      -- 10k〜5k: 50% bot1 / 30% bot2 / 20% bot3
      if v_rand < 0.50 then v_bot_username := 'bot1';
      elsif v_rand < 0.80 then v_bot_username := 'bot2';
      else v_bot_username := 'bot3';
      end if;
      o_match_type := 9 - v_rank;
    else
      -- 4k〜8D: 本来の13路の条件表
      case v_rank
        when 6 then v_bot_username := 'bot1'; o_match_type := 3; -- 4k
        when 7 then v_bot_username := 'bot2'; o_match_type := 3; -- 3k
        when 8 then v_bot_username := 'bot3'; o_match_type := 3; -- 2k
        when 9 then v_bot_username := 'bot1'; o_match_type := 2; -- 1k
        when 10 then v_bot_username := 'bot2'; o_match_type := 2; -- 1D
        when 11 then v_bot_username := 'bot3'; o_match_type := 2; -- 2D
        when 12 then v_bot_username := 'bot1'; o_match_type := 1; -- 3D
        when 13 then v_bot_username := 'bot1'; o_match_type := 0; -- 4D
        when 14 then v_bot_username := 'bot2'; o_match_type := 1; -- 5D
        when 15 then v_bot_username := 'bot2'; o_match_type := 0; -- 6D
        when 16 then v_bot_username := 'bot3'; o_match_type := 1; -- 7D
        when 17 then v_bot_username := 'bot3'; o_match_type := 0; -- 8D
        else null;
      end case;
    end if;

  elsif p_board_size = 19 then
    if v_rank <= 5 then
      -- 10k〜5k: 50% bot1 / 30% bot2 / 20% bot3
      if v_rand < 0.50 then v_bot_username := 'bot1';
      elsif v_rand < 0.80 then v_bot_username := 'bot2';
      else v_bot_username := 'bot3';
      end if;
      o_match_type := 9 - v_rank;
    else
      -- 4k〜8D: 本来の19路の条件表
      case v_rank
        when 6 then v_bot_username := 'bot1'; o_match_type := 3; -- 4k
        when 7 then v_bot_username := 'bot2'; o_match_type := 3; -- 3k
        when 8 then v_bot_username := 'bot3'; o_match_type := 3; -- 2k
        when 9 then v_bot_username := 'bot1'; o_match_type := 2; -- 1k
        when 10 then v_bot_username := 'bot1'; o_match_type := 1; -- 1D
        when 11 then v_bot_username := 'bot1'; o_match_type := 0; -- 2D
        when 12 then v_bot_username := 'bot2'; o_match_type := 2; -- 3D
        when 13 then v_bot_username := 'bot2'; o_match_type := 1; -- 4D
        when 14 then v_bot_username := 'bot2'; o_match_type := 0; -- 5D
        when 15 then v_bot_username := 'bot3'; o_match_type := 2; -- 6D
        when 16 then v_bot_username := 'bot3'; o_match_type := 1; -- 7D
        when 17 then v_bot_username := 'bot3'; o_match_type := 0; -- 8D
        else null;
      end case;
    end if;
  end if;

  -- ボット名からUIDを取得する
  if v_bot_username is not null then
    select pf.uid into o_bot_uid
    from private.profiles pf
    where pf.username = v_bot_username
    limit 1;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.time_connection_check()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  rec record; -- matches内にあるmatchが一つずつ入る。
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
begin

 -- 🛡️アーリーリターン: 対象となる試合（playing または pending）が1つもなければ即終了
  if not exists (
    select 1
    from private.matches
    where status in ('playing', 'pending')
  ) then
    return;
  end if;

  -- ここからが本処理: matches内にあるstatus=playingのmatchを一つずつ見ていく
  for rec in
    select *
    from private.matches m
    where m.status = 'playing'
  loop
  
    -- ⚫️がbotかどうか
    v_is_black_bot := private.is_bot_uid(rec.black_uid);
    -- ⚪️がbotかどうか
    v_is_white_bot := private.is_bot_uid(rec.white_uid);

    -- ------------------------------
    -- 時間切れ判定
    -- ------------------------------
    if (not v_is_black_bot) and -- ⚫️がボットではなく、
      rec.turn = 'black' and -- ⚫️の番で、
      rec.black_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚫️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update private.matches
      set status = 'finished',
          result = 'W+T'
      where matches.id = rec.id;

    elsif (not v_is_white_bot) and -- ⚪️がボットではなく、
      rec.turn = 'white' and -- ⚪️の番で、
      rec.white_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚪️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update private.matches
      set status = 'finished',
          result = 'B+T'
      where matches.id = rec.id;

    -- ------------------------------
    -- 接続切れ判定
    -- ------------------------------
    elsif (not v_is_black_bot) -- ⚫️がボットではなく、
       and rec.black_last_seen is not null
       and extract(epoch from (now() - rec.black_last_seen)) > 30 then -- ⚫️の最後のハートビートから30秒以上経っているなら
      update private.matches
      set status = 'finished',
          result = 'W+C'
      where matches.id = rec.id;

    elsif (not v_is_white_bot) -- ⚪️がボットではなく、
       and rec.white_last_seen is not null
       and extract(epoch from (now() - rec.white_last_seen)) > 30 then -- ⚪️の最後のハートビートから30秒以上経っているなら
      update private.matches
      set status = 'finished',
          result = 'B+C'
      where matches.id = rec.id;
    end if;
  end loop;

  -- ------------------------------
  -- 放置されたpending状態の対局判定
  -- ------------------------------
  -- pending状態のまま一定時間動きがない対局を、強制的に確定させる。
  -- 片方だけ結果が届いていればその結果を採用(coalesce)、
  -- 誰も届いていなければ無効(VOID)。
  update private.matches
  set
    status = 'finished',
    result = coalesce(result, 'VOID')
  where status = 'pending'
    and turn_switched_at < now() - interval '30 seconds';

end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile (
  p_after_id_9  integer DEFAULT NULL::integer,
  p_after_id_13 integer DEFAULT NULL::integer
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'private'
  AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_row private.profiles;
  v_status RECORD;
  v_username TEXT;
  v_retry_count INT := 0;

  -- 設定・戦績用
  v_allow_bot_match BOOLEAN := true;
  v_rating_9 SMALLINT := 0;
  v_wins_9 SMALLINT := 0;
  v_losses_9 SMALLINT := 0;
  v_draws_9 SMALLINT := 0;

  v_rating_13 SMALLINT := 0;
  v_wins_13 SMALLINT := 0;
  v_losses_13 SMALLINT := 0;
  v_draws_13 SMALLINT := 0;

  -- 差分棋譜用
  v_records_9_json JSONB := '[]'::jsonb;
  v_records_13_json JSONB := '[]'::jsonb;
BEGIN
  -- 0. ガード
  PERFORM private.check_version();
  PERFORM private.check_maintenance();

  -- 2. 未認証なら即終了
  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'profile', NULL,
      'newer_records_9', '[]'::jsonb,
      'newer_records_13', '[]'::jsonb
    );
  END IF;

  -- 差分棋譜を取得（ヘルパー関数を呼び出す）
  v_records_9_json := private.fetch_newer_records(v_uid, 9::smallint, p_after_id_9);
  v_records_13_json := private.fetch_newer_records(v_uid, 13::smallint, p_after_id_13);

  -- 3. プロフィールを取得＆最終ログイン更新
  UPDATE private.profiles
  SET lastseen = now()
  WHERE profiles.uid = v_uid
  RETURNING * INTO v_row;

  -- 4. 存在しない場合は自動生成
  IF v_row.uid IS NULL THEN
    LOOP
      v_retry_count := v_retry_count + 1;
      v_username := substr(md5(random()::text), 1, 5);

      BEGIN
        INSERT INTO private.profiles (uid, username)
        VALUES (v_uid, v_username)
        ON CONFLICT (uid) DO NOTHING
        RETURNING * INTO v_row;

        IF v_row.uid IS NOT NULL THEN
          EXIT;
        END IF;

        SELECT * INTO v_row FROM private.profiles WHERE profiles.uid = v_uid;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;

      EXIT WHEN v_retry_count >= 10;
    END LOOP;

    IF v_row.uid IS NULL THEN
      RAISE EXCEPTION 'failed_to_generate_unique_username';
    END IF;
  END IF;

  -- 5. user_settings
  SELECT COALESCE(allow_bot_match, true)
    INTO v_allow_bot_match
    FROM private.user_settings
   WHERE uid = v_uid;

  -- 6. user_stats (9路盤・13路盤)
  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_9, v_wins_9, v_losses_9, v_draws_9
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_13, v_wins_13, v_losses_13, v_draws_13
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 13;

  -- 7. まとめて返却
  RETURN json_build_object(
    'profile', json_build_object(
      'uid',             v_row.uid,
      'username',        v_row.username,
      'rating_9',        COALESCE(v_rating_9, 0),
      'rating_13',       COALESCE(v_rating_13, 0),
      'icon_index',      v_row.icon_index,
      'wins_9',          COALESCE(v_wins_9, 0),
      'losses_9',        COALESCE(v_losses_9, 0),
      'draws_9',         COALESCE(v_draws_9, 0),
      'wins_13',         COALESCE(v_wins_13, 0),
      'losses_13',        COALESCE(v_losses_13, 0),
      'draws_13',        COALESCE(v_draws_13, 0),
      'allow_bot_match', COALESCE(v_allow_bot_match, true)
    ),
    'newer_records_9',  v_records_9_json,
    'newer_records_13', v_records_13_json
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.overwrite_profile_from_guest (
  p_guest_uid uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  calling_uid uuid := auth.uid();
  guest_is_anonymous boolean;
  guest_profile private.profiles;
  guest_settings private.user_settings%rowtype;
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  IF calling_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF calling_uid = p_guest_uid THEN
    RAISE EXCEPTION 'invalid_guest_uid';
  END IF;

  -- 🌟 渡されたuidが「本物の匿名ユーザー」であることを必ず確認する。
  -- これが無いと、誰かが他人の本登録済みアカウントのuidを渡して
  -- 勝手に削除・上書きできてしまう(なりすまし・破壊行為の穴になる)
  SELECT is_anonymous INTO guest_is_anonymous
  FROM auth.users WHERE id = p_guest_uid;

  IF guest_is_anonymous IS NOT TRUE THEN
    RAISE EXCEPTION 'guest_uid_not_anonymous';
  END IF;

  -- 🌟ゲストのprofilesテーブルを避難
  SELECT * INTO guest_profile FROM private.profiles WHERE uid = p_guest_uid;
  IF guest_profile.uid IS NULL THEN
    RAISE EXCEPTION 'guest_profile_not_found';
  END IF;

  -- 🌟ゲストのuser_settingsテーブルを避難
  SELECT * INTO guest_settings FROM private.user_settings WHERE uid = p_guest_uid;

  -- 🌟ゲストのuser_statsテーブルを避難。ここだけテーブルなのは、これだけはデータが複数行にまたがるから。
  CREATE TEMP TABLE temp_guest_stats ON COMMIT DROP AS
  SELECT board_size, rating, giantkill, wins, losses, draws
  FROM private.user_stats
  WHERE uid = p_guest_uid;

  -- 🔥ここでゲストを削除。(usernameのユニーク制約に引っかからないようにするため)
  -- ※ なお、CASCADE により ゲスト側の user_settings や user_stats も自動削除される
  DELETE FROM private.profiles WHERE uid = p_guest_uid; -- 一応
  DELETE FROM auth.users WHERE id = p_guest_uid; -- 一応

  -- ✏️ 対局記録(records)のuid付け替え。
  -- 順番が重要: 先に「既存アカウント時代」の対局を退会者扱い(NULL)にし、
  -- その後で「ゲスト時代」の対局を生き残るcalling_uidに引き継がせる。
  -- 逆順にすると、引き継いだ直後の行まで巻き込んでNULLにしてしまう。

  -- ① 既存アカウント(calling_uid)時代の対局 → 退会者扱い(NULL)
  UPDATE private.records SET black_uid = NULL WHERE black_uid = calling_uid;
  UPDATE private.records SET white_uid = NULL WHERE white_uid = calling_uid;

  -- ② ゲスト(p_guest_uid)時代の対局 → 生き残るcalling_uidに引き継ぎ
  UPDATE private.records SET black_uid = calling_uid WHERE black_uid = p_guest_uid;
  UPDATE private.records SET white_uid = calling_uid WHERE white_uid = p_guest_uid;

  -- 呼び出し元(古いアカウント)の中身を、ゲストの内容で上書きする
  
  -- ✏️ private.profiles の上書き（基本情報のみ）
  UPDATE private.profiles
  SET
    username = guest_profile.username,
    icon_index = guest_profile.icon_index
  WHERE uid = calling_uid;

  -- ✏️ private.user_settings の上書き
  IF guest_settings.uid IS NOT NULL THEN
    UPDATE private.user_settings
    SET allow_bot_match = guest_settings.allow_bot_match
    WHERE uid = calling_uid;
  END IF;

  -- ✏️ private.user_stats の上書き（9路盤・13路盤など退避したデータから上書き）
  UPDATE private.user_stats us
  SET
    rating = t.rating,
    giantkill = t.giantkill,
    wins = t.wins,
    losses = t.losses,
    draws = t.draws
  FROM temp_guest_stats t
  WHERE us.uid = calling_uid
    AND us.board_size = t.board_size;

END;
$function$;
