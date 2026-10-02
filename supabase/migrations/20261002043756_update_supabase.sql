SET local check_function_bodies = off;

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
  v_black_giant_killing_streak smallint := 0;
  v_white_giant_killing_streak smallint := 0;
  v_black_old_giant_killing_streak smallint := 0;
  v_white_old_giant_killing_streak smallint := 0;
  v_black_giant_killing_bonus boolean := false;
  v_white_giant_killing_bonus boolean := false;
  v_black_new_rating smallint;
  v_white_new_rating smallint;
  v_black_wins smallint := 0;
  v_white_wins smallint := 0;

  v_black_win_inc smallint := 0;
  v_black_loss_inc smallint := 0;
  v_black_draw_inc smallint := 0;
  v_white_win_inc smallint := 0;
  v_white_loss_inc smallint := 0;
  v_white_draw_inc smallint := 0;

  v_is_bot_match boolean;
  v_calc_res record;
begin
-- ─── 1. profiles、user_statsテーブルからユーザ情報を取得 ─────────────────────────────
  select is_bot into v_is_black_bot
  from private.profiles
  where uid = new.black_uid;

  select coalesce(wins, 0), coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giant_killing_streak, 0)
  into v_black_wins, v_black_games, v_black_rating, v_black_giant_killing_streak
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select is_bot into v_is_white_bot
  from private.profiles
  where uid = new.white_uid;

  select coalesce(wins, 0), coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giant_killing_streak, 0)
  into v_white_wins, v_white_games, v_white_rating, v_white_giant_killing_streak
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  v_is_bot_match := (v_is_black_bot or v_is_white_bot);

  -- 更新前の連続数を退避（ボーナス判定用）
  v_black_old_giant_killing_streak := v_black_giant_killing_streak;
  v_white_old_giant_killing_streak := v_white_giant_killing_streak;

-- ─── 2. 勝敗判定と計算処理 ─────────
  if new.result like 'B+%' then
    v_black_win_inc := 1;
    v_white_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      p_winner          => 'black',
      p_black_rating    => v_black_rating,
      p_white_rating    => v_white_rating,
      p_black_giant_killing_streak => v_black_giant_killing_streak,
      p_white_giant_killing_streak => v_white_giant_killing_streak,
      p_black_games     => v_black_games,
      p_white_games     => v_white_games,
      p_is_bot_match    => v_is_bot_match
    );
    v_black_delta      := v_calc_res.o_winner_delta;
    v_white_delta      := v_calc_res.o_loser_delta;
    v_black_giant_killing_streak  := v_calc_res.o_winner_giant_killing_streak;
    v_white_giant_killing_streak  := v_calc_res.o_loser_giant_killing_streak;

  elsif new.result like 'W+%' then
    v_white_win_inc := 1;
    v_black_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      p_winner          => 'white',
      p_black_rating    => v_black_rating,
      p_white_rating    => v_white_rating,
      p_black_giant_killing_streak => v_black_giant_killing_streak,
      p_white_giant_killing_streak => v_white_giant_killing_streak,
      p_black_games     => v_black_games,
      p_white_games     => v_white_games,
      p_is_bot_match    => v_is_bot_match
    );
    v_white_delta      := v_calc_res.o_winner_delta;
    v_black_delta      := v_calc_res.o_loser_delta;
    v_white_giant_killing_streak  := v_calc_res.o_winner_giant_killing_streak;
    v_black_giant_killing_streak  := v_calc_res.o_loser_giant_killing_streak;

  elsif new.result = 'DRAW' then
    v_black_draw_inc := 1;
    v_white_draw_inc := 1;

    v_calc_res := private.calculate_draw_delta(
      p_is_bot_match => v_is_bot_match,
      p_black_rating => v_black_rating,
      p_white_rating => v_white_rating
    );
    v_black_delta := v_calc_res.o_black_delta;
    v_white_delta := v_calc_res.o_white_delta;
  end if;

  -- ジャイアントキリングのボーナス判定（連続数が上がった時のみ。ボットは対象外）
  if v_is_black_bot then
    v_black_giant_killing_streak := v_black_old_giant_killing_streak;
  else
    v_black_giant_killing_bonus :=
      v_black_giant_killing_streak > v_black_old_giant_killing_streak;
  end if;

  if v_is_white_bot then
    v_white_giant_killing_streak := v_white_old_giant_killing_streak;
  else
    v_white_giant_killing_bonus :=
      v_white_giant_killing_streak > v_white_old_giant_killing_streak;
  end if;

-- ─── 3. user_statsテーブル更新（rating加算をUPDATE内で完結） ───────────────────────────────────
  if not v_is_black_bot then
    update private.user_stats set
      wins           = wins + v_black_win_inc,
      losses         = losses + v_black_loss_inc,
      draws          = draws + v_black_draw_inc,
      rating         = greatest(0, rating + v_black_delta),
      highest_rating = greatest(highest_rating, greatest(0, rating + v_black_delta)),
      giant_killing_streak      = v_black_giant_killing_streak
    where uid = new.black_uid and board_size = new.board_size
    returning rating into v_black_new_rating;
  else
    update private.user_stats set
      wins   = wins + v_black_win_inc,
      losses = losses + v_black_loss_inc,
      draws  = draws + v_black_draw_inc
    where uid = new.black_uid and board_size = new.board_size;
    v_black_new_rating := v_black_rating;
  end if;

  if not v_is_white_bot then
    update private.user_stats set
      wins           = wins + v_white_win_inc,
      losses         = losses + v_white_loss_inc,
      draws          = draws + v_white_draw_inc,
      rating         = greatest(0, rating + v_white_delta),
      highest_rating = greatest(highest_rating, greatest(0, rating + v_white_delta)),
      giant_killing_streak      = v_white_giant_killing_streak
    where uid = new.white_uid and board_size = new.board_size
    returning rating into v_white_new_rating;
  else
    update private.user_stats set
      wins   = wins + v_white_win_inc,
      losses = losses + v_white_loss_inc,
      draws  = draws + v_white_draw_inc
    where uid = new.white_uid and board_size = new.board_size;
    v_white_new_rating := v_white_rating;
  end if;

-- ─── 4. recordsテーブル新規追加 ─────────────────
  insert into private.records (
    id, black_uid, white_uid, moves, result,
    black_rating, white_rating, match_type, board_size, dead_stones, created_at
  ) values (
    new.id, new.black_uid, new.white_uid, new.moves, new.result,
    v_black_rating, v_white_rating, new.match_type, new.board_size, new.dead_stones, now()
  ) on conflict (id) do nothing;

-- ─── 5. リアルタイム通知 ─────────────────
  perform realtime.send(
    jsonb_build_object(
      'result', new.result,
      'black', jsonb_build_object(
        'old_rating', v_black_rating,
        'new_rating', v_black_new_rating,
        'wins', v_black_wins + v_black_win_inc,
        'giant_killing_streak', v_black_giant_killing_streak,
        'giant_killing_bonus', v_black_giant_killing_bonus
      ),
      'white', jsonb_build_object(
        'old_rating', v_white_rating,
        'new_rating', v_white_new_rating,
        'wins', v_white_wins + v_white_win_inc,
        'giant_killing_streak', v_white_giant_killing_streak,
        'giant_killing_bonus', v_white_giant_killing_bonus
      )
    ),
    'rating_updated',
    'game:' || new.id::text,
    false
  );

-- ─── 6. matchesテーブルからの削除 ─────────────────
  delete from private.matches m where m.id = new.id;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_match_delta (
  p_winner                     text,
  p_black_rating               smallint,
  p_white_rating               smallint,
  p_black_giant_killing_streak smallint,
  p_white_giant_killing_streak smallint,
  p_black_games                smallint,
  p_white_games                smallint,
  p_is_bot_match               boolean,
  OUT                          o_winner_delta smallint,
  OUT                          o_loser_delta smallint,
  OUT                          o_winner_giant_killing_streak smallint,
  OUT                          o_loser_giant_killing_streak smallint
)
  RETURNS record
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_winner_rating smallint;
  v_loser_rating smallint;
  v_winner_giant_killing_streak smallint;
  v_loser_giant_killing_streak smallint;
  v_winner_games smallint;
  v_diff smallint;
  v_win_delta smallint;
  v_giant_killing_streak_cap constant smallint := 50; -- 格上勝利は最大50連勝まで
begin
  if p_winner = 'black' then
    v_winner_rating    := coalesce(p_black_rating, 0);
    v_loser_rating     := coalesce(p_white_rating, 0);
    v_winner_giant_killing_streak := coalesce(p_black_giant_killing_streak, 0);
    v_loser_giant_killing_streak := coalesce(p_white_giant_killing_streak, 0);
    v_winner_games     := coalesce(p_black_games, 0);
  else
    v_winner_rating    := coalesce(p_white_rating, 0);
    v_loser_rating     := coalesce(p_black_rating, 0);
    v_winner_giant_killing_streak := coalesce(p_white_giant_killing_streak, 0);
    v_loser_giant_killing_streak := coalesce(p_black_giant_killing_streak, 0);
    v_winner_games     := coalesce(p_white_games, 0);
  end if;

  v_diff := v_loser_rating - v_winner_rating;

  if p_is_bot_match then
    o_winner_delta     := 5;
    o_loser_delta      := -5;
    o_winner_giant_killing_streak := v_winner_giant_killing_streak; -- 触らず
    o_loser_giant_killing_streak  := v_loser_giant_killing_streak; -- 触らず
  else
    v_win_delta := greatest(0, least(20,
      10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
    ));

    o_winner_giant_killing_streak := least(
      v_giant_killing_streak_cap,
      v_winner_giant_killing_streak + case when v_diff > 0 then 1 else 0 end
    );

    if v_diff > 0 then
      o_winner_delta := v_win_delta * o_winner_giant_killing_streak;
    else
      o_winner_delta := v_win_delta;
    end if;

    o_loser_giant_killing_streak := 0;
    if v_diff > 0 and v_winner_games <= 30 then
      o_loser_delta := 0;
    else
      o_loser_delta := -v_win_delta;
    end if;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile (
  p_after_id_9  integer DEFAULT NULL::integer,
  p_after_id_13 integer DEFAULT NULL::integer,
  p_after_id_19 integer DEFAULT NULL::integer
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

  v_wins_9 SMALLINT := 0;
  v_losses_9 SMALLINT := 0;
  v_draws_9 SMALLINT := 0;
  v_rating_9 SMALLINT := 0;
  v_giant_killing_streak_9 SMALLINT := 0;

  v_wins_13 SMALLINT := 0;
  v_losses_13 SMALLINT := 0;
  v_draws_13 SMALLINT := 0;
  v_rating_13 SMALLINT := 0;
  v_giant_killing_streak_13 SMALLINT := 0;

  v_wins_19 SMALLINT := 0;
  v_losses_19 SMALLINT := 0;
  v_draws_19 SMALLINT := 0;
  v_rating_19 SMALLINT := 0;
  v_giant_killing_streak_19 SMALLINT := 0;

  -- 差分棋譜用
  v_records_9_json JSONB := '[]'::jsonb;
  v_records_13_json JSONB := '[]'::jsonb;
  v_records_19_json JSONB := '[]'::jsonb;
BEGIN
  -- 0. ガード
  PERFORM private.check_version();
  PERFORM private.check_maintenance();

  -- 2. 未認証なら即終了
  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'profile', NULL,
      'newer_records_9', '[]'::jsonb,
      'newer_records_13', '[]'::jsonb,
      'newer_records_19', '[]'::jsonb
    );
  END IF;

  -- 差分棋譜を取得（ヘルパー関数を呼び出す）
  v_records_9_json := private.fetch_newer_records(v_uid, 9::smallint, p_after_id_9);
  v_records_13_json := private.fetch_newer_records(v_uid, 13::smallint, p_after_id_13);
  v_records_19_json := private.fetch_newer_records(v_uid, 19::smallint, p_after_id_19);

  -- 3. プロフィールを取得＆最終ログイン更新
  UPDATE private.profiles
  SET lastseen = now()
  WHERE profiles.uid = v_uid
  RETURNING * INTO v_row;

  -- 4. 存在しない場合は自動生成
  IF v_row.uid IS NULL THEN
    LOOP
      v_retry_count := v_retry_count + 1;
      v_username := substr(md5(random()::text), 1, 6);

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

  -- 6. user_stats
  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_9, v_wins_9, v_losses_9, v_draws_9, v_giant_killing_streak_9
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_13, v_wins_13, v_losses_13, v_draws_13, v_giant_killing_streak_13
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 13;

  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_19, v_wins_19, v_losses_19, v_draws_19, v_giant_killing_streak_19
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 19;

  -- 7. まとめて返却
  RETURN json_build_object(
    'profile', json_build_object(
      'uid',             v_row.uid,
      'username',        v_row.username,
      'icon_index',      v_row.icon_index,
      'country',         v_row.country,
      -- 9
      'wins_9',          COALESCE(v_wins_9, 0),
      'losses_9',        COALESCE(v_losses_9, 0),
      'draws_9',         COALESCE(v_draws_9, 0),
      'rating_9',        COALESCE(v_rating_9, 0),
      'giant_killing_streak_9',        COALESCE(v_giant_killing_streak_9, 0),
      -- 13
      'wins_13',         COALESCE(v_wins_13, 0),
      'losses_13',        COALESCE(v_losses_13, 0),
      'draws_13',        COALESCE(v_draws_13, 0),
      'rating_13',       COALESCE(v_rating_13, 0),
      'giant_killing_streak_13',        COALESCE(v_giant_killing_streak_13, 0),
      -- 19
      'wins_19',         COALESCE(v_wins_19, 0),
      'losses_19',        COALESCE(v_losses_19, 0),
      'draws_19',        COALESCE(v_draws_19, 0),
      'rating_19',       COALESCE(v_rating_19, 0),
      'giant_killing_streak_19',        COALESCE(v_giant_killing_streak_19, 0),
      -- other
      'allow_bot_match', COALESCE(v_allow_bot_match, true)
    ),
    'newer_records_9',  v_records_9_json,
    'newer_records_13', v_records_13_json,
    'newer_records_19', v_records_19_json
  );
END;
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
  
  -- ① NFC正規化して揃える
  new_username := normalize(new_username, NFC);

  -- ② 見えない絵文字パーツ(FE0F=65039, ZWJ=8205)を取り除く(TS側 normalizeUsername と同じ掃除)
  new_username := translate(new_username, chr(65039) || chr(8205), '');

  if new_username is null or new_username = '' then
    raise exception 'Invalid username format';
  end if;

  -- 2. 長さチェック: 6文字まで
  --    (アプリ側は「幅6まで」で、どの文字も幅1以上なので、最大でも6文字になる)
  if char_length(new_username) > 6 then
    raise exception 'Username too long';
  end if;

  -- 3. 危険な文字(スペース・制御文字・見えない文字・向きを変える文字など)が入っていたら拒否
  if new_username ~ '[\u0001-\u0020\u007F-\u00A0\u00AD\u115F\u1160\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFE00-\uFE0E\uFEFF\uFFA0\uFFF0-\uFFFF\U000E0000-\U000E0FFF]' then
    raise exception 'Invalid username format';
  end if;

  -- 4. ユーザー名の重複チェック（他の人が使っていないか確認）
  if exists (
    select 1 
    from private.profiles 
    where username = new_username 
      and uid <> current_user_id
  ) then
    raise exception 'Username already taken';
  end if;

  -- 5. ユーザー名を更新する（掃除された綺麗な文字列を入れる）
  update private.profiles
  set username = new_username
  where uid = current_user_id;

end;
$function$;
