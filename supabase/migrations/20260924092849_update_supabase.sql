SET local check_function_bodies = off;

DROP EVENT TRIGGER "ensure_rls";

DROP FUNCTION "private"."calculate_draw_delta"(smallint, smallint, boolean);

DROP FUNCTION "private"."calculate_match_delta"(smallint, smallint, smallint, smallint, boolean);

DROP FUNCTION "private"."get_bot_match_info"(smallint, smallint);

DROP FUNCTION "public"."get_my_profile"(integer, integer);

DROP FUNCTION "public"."join_waitlist"(smallint, integer);

DROP FUNCTION "public"."rls_auto_enable"();

ALTER TABLE "private"."user_stats"
  DROP COLUMN "giantkill";

ALTER TABLE "private"."profiles"
  ADD COLUMN "country" text;

ALTER TABLE "private"."user_stats"
  ADD COLUMN "giant_killing_streak" smallint DEFAULT '0'::smallint;

ALTER TABLE "private"."user_stats"
  ADD COLUMN "win_streak" smallint DEFAULT '0'::smallint;

ALTER TABLE "private"."waitlist"
  ADD COLUMN "has_b18" boolean;

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
        'new_rating', v_black_new_rating,
        'wins', v_black_wins + v_black_win_inc
      ),
      'white', jsonb_build_object(
        'new_rating', v_white_new_rating,
        'wins', v_white_wins + v_white_win_inc
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

CREATE OR REPLACE FUNCTION private.bot_config()
  RETURNS TABLE (
    board_size smallint,
    rank_idx   smallint,
    bot_name   text,
    match_type smallint
  )
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select * from (values
    -- 9路盤
    (9::smallint,  0::smallint,'bot1',5::smallint),(9,  0,'bot2',5),(9,  0,'bot3',5),
    (9,  1,'bot1',4),(9,  1,'bot2',5),(9,  1,'bot3',5),
    (9,  2,'bot1',4),(9,  2,'bot2',4),(9,  2,'bot3',5),
    (9,  3,'bot1',4),(9,  3,'bot2',4),(9,  3,'bot3',4),
    (9,  4,'bot1',3),(9,  4,'bot2',4),(9,  4,'bot3',4),
    (9,  5,'bot1',3),(9,  5,'bot2',3),(9,  5,'bot3',4),
    (9,  6,'bot1',3),(9,  6,'bot2',3),(9,  6,'bot3',3),
    (9,  7,'bot1',2),(9,  7,'bot2',3),(9,  7,'bot3',3),
    (9,  8,'bot1',2),(9,  8,'bot2',2),(9,  8,'bot3',3),
    (9,  9,'bot1',2),(9,  9,'bot2',2),(9,  9,'bot3',2),
    (9, 10,'bot1',1),(9, 10,'bot2',2),(9, 10,'bot3',2),
    (9, 11,'bot1',1),(9, 11,'bot2',1),(9, 11,'bot3',2),
    (9, 12,'bot1',1),(9, 12,'bot2',1),(9, 12,'bot3',1),
    (9, 13,'bot1',0),(9, 13,'bot2',1),(9, 13,'bot3',1),
    (9, 14,'bot1',0),(9, 14,'bot2',0),(9, 14,'bot3',1),
    (9, 15,'bot1',0),(9, 15,'bot2',0),(9, 15,'bot3',0),
                      (9, 16,'bot2',0),(9, 16,'bot3',0),
                                       (9, 17,'bot3',0),

    -- 13路盤
    (13, 0,'bot1',9),(13, 0,'bot2',9),(13, 0,'bot3',9),
    (13, 1,'bot1',8),(13, 1,'bot2',9),(13, 1,'bot3',9),
    (13, 2,'bot1',8),(13, 2,'bot2',8),(13, 2,'bot3',9),
    (13, 3,'bot1',7),(13, 3,'bot2',8),(13, 3,'bot3',8),
    (13, 4,'bot1',7),(13, 4,'bot2',7),(13, 4,'bot3',8),
    (13, 5,'bot1',6),(13, 5,'bot2',7),(13, 5,'bot3',7),
    (13, 6,'bot1',6),(13, 6,'bot2',6),(13, 6,'bot3',7),
    (13, 7,'bot1',5),(13, 7,'bot2',6),(13, 7,'bot3',6),
    (13, 8,'bot1',5),(13, 8,'bot2',5),(13, 8,'bot3',6),
    (13, 9,'bot1',4),(13, 9,'bot2',5),(13, 9,'bot3',5),
    (13,10,'bot1',4),(13,10,'bot2',4),(13,10,'bot3',5),
    (13,11,'bot1',3),(13,11,'bot2',4),(13,11,'bot3',4),
    (13,12,'bot1',3),(13,12,'bot2',3),(13,12,'bot3',4),
    (13,13,'bot1',2),(13,13,'bot2',3),(13,13,'bot3',3),
    (13,14,'bot1',1),(13,14,'bot2',2),(13,14,'bot3',3),
    (13,15,'bot1',0),(13,15,'bot2',1),(13,15,'bot3',2),
                      (13,16,'bot2',0),(13,16,'bot3',1),
                                       (13,17,'bot3',0),

    -- 19路盤
    (19, 0,'bot1',25),(19, 0,'bot2',25),(19, 0,'bot3',25),
    (19, 1,'bot1',16),(19, 1,'bot2',25),(19, 1,'bot3',25),
    (19, 2,'bot1',13),(19, 2,'bot2',16),(19, 2,'bot3',25),
    (19, 3,'bot1', 9),(19, 3,'bot2',16),(19, 3,'bot3',16),
    (19, 4,'bot1', 8),(19, 4,'bot2',13),(19, 4,'bot3',16),
    (19, 5,'bot1', 7),(19, 5,'bot2', 9),(19, 5,'bot3',13),
    (19, 6,'bot1', 6),(19, 6,'bot2', 8),(19, 6,'bot3',13),
    (19, 7,'bot1', 5),(19, 7,'bot2', 7),(19, 7,'bot3', 9),
    (19, 8,'bot1', 4),(19, 8,'bot2', 6),(19, 8,'bot3', 9),
    (19, 9,'bot1', 3),(19, 9,'bot2', 5),(19, 9,'bot3', 8),
    (19,10,'bot1', 2),(19,10,'bot2', 4),(19,10,'bot3', 7),
    (19,11,'bot1', 1),(19,11,'bot2', 3),(19,11,'bot3', 6),
    (19,12,'bot1', 0),(19,12,'bot2', 2),(19,12,'bot3', 5),
                       (19,13,'bot2', 1),(19,13,'bot3', 4),
                       (19,14,'bot2', 0),(19,14,'bot3', 3),
                                         (19,15,'bot3', 2),
                                         (19,16,'bot3', 1),
                                         (19,17,'bot3', 0)
  ) as t(board_size, rank_idx, bot_name, match_type);
$function$;

CREATE OR REPLACE FUNCTION private.calculate_draw_delta (
  p_is_bot_match boolean,
  p_black_rating smallint,
  p_white_rating smallint,
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
  if p_is_bot_match then
    o_black_delta := 0;
    o_white_delta := 0;
  else
    v_diff := coalesce(p_white_rating, 0) - coalesce(p_black_rating, 0);
    o_black_delta := (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100;
    o_white_delta := -o_black_delta;
  end if;
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
  v_winner_games smallint;
  v_diff smallint;
  v_win_delta smallint;
  v_giant_killing_streak_cap constant smallint := 1000;
begin
  if p_winner = 'black' then
    v_winner_rating    := coalesce(p_black_rating, 0);
    v_loser_rating     := coalesce(p_white_rating, 0);
    v_winner_giant_killing_streak := coalesce(p_black_giant_killing_streak, 0);
    v_winner_games     := coalesce(p_black_games, 0);
  else
    v_winner_rating    := coalesce(p_white_rating, 0);
    v_loser_rating     := coalesce(p_black_rating, 0);
    v_winner_giant_killing_streak := coalesce(p_white_giant_killing_streak, 0);
    v_winner_games     := coalesce(p_white_games, 0);
  end if;

  v_diff := v_loser_rating - v_winner_rating;

  if p_is_bot_match then
    o_winner_delta     := 5;
    o_loser_delta      := -5;
    o_winner_giant_killing_streak := v_winner_giant_killing_streak;
    o_loser_giant_killing_streak  := 0;
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

CREATE OR REPLACE FUNCTION private.get_bot_match_info (
  p_rating     smallint,
  p_board_size smallint,
  p_has_b18    boolean               DEFAULT true,
  OUT          o_bot_uid uuid,
  OUT          o_match_type smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_rank smallint;
  v_bot_name text;
  v_match_type smallint;
begin
  v_rank := private.rating_to_rank_index(p_rating);

  select bot_name, match_type
  into v_bot_name, v_match_type
  from private.bot_config()
  where board_size = p_board_size
    and rank_idx = v_rank
    and (p_has_b18 or bot_name <> 'bot3')
  order by random()
  limit 1;

  if v_bot_name is null then
    o_bot_uid := null;
    o_match_type := null;
    return;
  end if;

  o_match_type := v_match_type;

  select uid into o_bot_uid
  from private.profiles
  where username = v_bot_name
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_profile()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- ① user_settings を自動作成（デフォルト値で作成される）
  insert into private.user_settings (uid)
  values (new.uid);

  -- ② user_stats を自動作成（各盤面サイズの初期データをあらかじめ作っておく）
  insert into private.user_stats (uid, board_size)
  values 
    (new.uid, 9),
    (new.uid, 13),
    (new.uid, 19);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_match()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_black private.profiles%rowtype;
  v_white private.profiles%rowtype;

  v_black_rating smallint := 0;
  v_white_rating smallint := 0;

  v_bot_match boolean;

  v_black_payload jsonb;
  v_white_payload jsonb;
begin
  -- 盤サイズに応じて持ち時間を補正
  new.black_seconds := case new.board_size when 19 then 605 when 13 then 305 else 185 end;
  new.white_seconds := case new.board_size when 19 then 605 when 13 then 305 else 185 end;

  -- profiles 取得（各1回のみ）
  select * into v_black
  from private.profiles
  where uid = new.black_uid;

  select * into v_white
  from private.profiles
  where uid = new.white_uid;

  -- ★ 新しい user_stats テーブルから、対象の盤サイズに応じたポイントを取得する
  select coalesce(rating, 0) into v_black_rating
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0) into v_white_rating
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  -- bot 判定（追加SELECTなし）
  v_bot_match := (coalesce(v_black.is_bot, false) or coalesce(v_white.is_bot, false));

  -- サブスク通知
  v_black_payload := jsonb_build_object(
    'match_id',        new.id,
    'board_size',      new.board_size,
    'match_type',      new.match_type,
    'moves',           coalesce(to_jsonb(new.moves), '[]'::jsonb),
    'my_color',        'black',
    'opp_uid',         new.white_uid,
    'opp_rating',      coalesce(v_white_rating, 0),
    'opp_icon_index',  v_white.icon_index,
    'opp_username',    v_white.username,
    'my_seconds',      new.black_seconds,
    'opp_seconds',     new.white_seconds,
    'bot_match',       v_bot_match
  );

  v_white_payload := jsonb_build_object(
    'match_id',        new.id,
    'board_size',      new.board_size,
    'match_type',      new.match_type,
    'moves',           coalesce(to_jsonb(new.moves), '[]'::jsonb),
    'my_color',        'white',
    'opp_uid',         new.black_uid,
    'opp_rating',      coalesce(v_black_rating, 0),
    'opp_icon_index',  v_black.icon_index,
    'opp_username',    v_black.username,
    'my_seconds',      new.white_seconds,
    'opp_seconds',     new.black_seconds,
    'bot_match',       v_bot_match
  );

  perform realtime.send(v_black_payload, 'matched', 'user:' || new.black_uid::text, false);
  perform realtime.send(v_white_payload, 'matched', 'user:' || new.white_uid::text, false);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.try_match_all (
  p_board_size smallint
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_waiter           record;
  v_opponent         record;
  v_bot_uid          uuid;
  v_waiter_profile   record;
  v_waiter_rating    smallint := 0;
  v_allow_bot_match  boolean := true;
  v_rating_diff      smallint;
  v_match_id         smallint;
  v_match_type       smallint;
  v_human_is_black   boolean;
begin
  -- 🛡️アーリーリターン: 誰も並んでないなら何もせず終了
  if not exists (select 1 from private.waitlist where board_size = p_board_size) then
    return;
  end if;

  -- waitlistにいる人を、try_countの多い人順に並べる
  for v_waiter in
    select * from private.waitlist wl
    where wl.board_size = p_board_size
    order by wl.try_count desc
  -- loop ~ end loopの中で、上で並べた一つ一つの要素に対して処理していく
  loop

    -- 🔒 ここでこのプレイヤーの行をロックする。
    -- cancel_waitlist側のDELETEも同じ行に対する暗黙のロックなので、
    -- これで「チェックしてから使う」の間の隙間（TOCTOUレース）が消える。
    -- ロックはこの関数呼び出し(1トランザクション)が終わるまで保持される。
    perform 1
    from private.waitlist wl
    where wl.player_uid = v_waiter.player_uid
    for update;

    if not found then
      -- ロックを取ろうとした時点で既にいなかった
      -- （cancel_waitlistなど他の処理に先を越された）
      continue;
    end if;

    -- プロフィール情報をとってくる
    select * into v_waiter_profile from private.profiles pf where pf.uid = v_waiter.player_uid;

    -- ★ 新しい user_stats テーブルから対象盤サイズのポイントを取得する
    select coalesce(rating, 0)
      into v_waiter_rating
      from private.user_stats
     where uid = v_waiter.player_uid
       and board_size = p_board_size;

    -- ★ 新しい user_settings テーブルからボット対戦許可フラグを取得する
    select coalesce(allow_bot_match, true)
      into v_allow_bot_match
      from private.user_settings
     where uid = v_waiter.player_uid;

    -- 🤖🤖🤖 ボット戦分岐 🤖🤖🤖
    if v_waiter.try_count >= 4 and v_allow_bot_match then
      -- 対戦ボットとmatch_typeを取得する（waitlistから取得したhas_b18を渡す）
      select o_bot_uid, o_match_type
      into v_bot_uid, v_match_type
      from private.get_bot_match_info(v_waiter_rating, p_board_size, v_waiter.has_b18);

      -- 🌟 ボットが見つからなかった（null）場合は、ボット戦を行わずにスキップする
      if v_bot_uid is null then
        continue;
      end if;

      -- 🌟 match_typeが1〜9なら常に人間が黒、0なら50%の確率でランダムに判定する
      if v_match_type >= 1 then
        v_human_is_black := true;
      else
        v_human_is_black := random() < 0.5;
      end if;

      insert into private.matches (
        black_uid, white_uid, status, match_type,
        turn, turn_switched_at,
        board_size
      ) values (
        case when v_human_is_black then v_waiter.player_uid else v_bot_uid end,
        case when v_human_is_black then v_bot_uid else v_waiter.player_uid end,
        'playing', v_match_type,
        -- 🌟 置き石(2以上)があるなら白番スタート、互先・コミ落ち(0または1)なら黒番スタート
        case when v_match_type > 1 then 'white' else 'black' end,
        now(),
        p_board_size
      )
      returning matches.id into v_match_id;

      delete from private.waitlist wl where wl.player_uid = v_waiter.player_uid;
      continue;
    end if;

    -- 👦👦👦 人間戦分岐（match_typeは常に0＆白黒ランダム） 👦👦👦 なお、try_countのデフォルト値は0から1に変更した。
    -- よく考えたら、0 * 300 = 0 の計算をしていて、これだと丸々3秒が無駄になってるだけだったからだ。
    -- 1回目: +-300差 2回目: +-600差 3回目: +- 900差。これでマッチングしないとボットとマッチになる
    v_rating_diff := least(v_waiter.try_count::int * 300, 1000)::smallint; -- 1000は最大ポイント差。

    -- ★ user_stats と JOIN して相手のポイントを直接比較する
    -- 🔒 相手候補の行も for update of wl でロックする。
    -- こうしておくと、この相手が別の理由（自分でキャンセルするなど）で
    -- 消えかけていた場合、その瞬間はここで確実に検知できる。
    select wl.* into v_opponent
    from private.waitlist wl
    join private.user_stats us on us.uid = wl.player_uid and us.board_size = p_board_size
    where wl.player_uid != v_waiter.player_uid
      and wl.board_size = p_board_size
      and abs(us.rating - v_waiter_rating) <= v_rating_diff
    order by abs(us.rating - v_waiter_rating) asc
    limit 1
    for update of wl;

    if found then
      declare
        v_opponent_profile record;
        v_human_first_is_black boolean;
      begin
        select * into v_opponent_profile from private.profiles pf where pf.uid = v_opponent.player_uid;

        -- 人間同士は常にランダム(50%)
        v_human_first_is_black := random() < 0.5;

        insert into private.matches (
          black_uid, white_uid, status, match_type,
          turn, turn_switched_at, board_size
        ) values (
          case when v_human_first_is_black then v_waiter.player_uid else v_opponent.player_uid end,
          case when v_human_first_is_black then v_opponent.player_uid else v_waiter.player_uid end,
          'playing', 0,
          'black',
          now(),
          p_board_size
        )
        returning matches.id into v_match_id;

        delete from private.waitlist wl
        where wl.player_uid in (v_waiter.player_uid, v_opponent.player_uid);
      end;
    else
      update private.waitlist
      set try_count = try_count + 1 -- try_countを1増やす
      where waitlist.player_uid = v_waiter.player_uid;
    end if;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_waitlist()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_match      private.matches%rowtype;
  v_player_uid uuid := auth.uid();
  v_deleted_uid uuid;
begin
  PERFORM private.check_version();
  perform private.check_maintenance();

  -- 🎯 まず削除を試みる。これが実質的なロックとして働き、
  -- マッチング処理側の削除と同じ行を取り合う形になるので、
  -- 「チェックしてから削除」の間の隙間が無くなる。
  delete from private.waitlist wl
  where wl.player_uid = v_player_uid
  returning wl.player_uid into v_deleted_uid;

  -- 削除できた = マッチング処理より先にキャンセルが確定した
  if v_deleted_uid is not null then
    return null;
  end if;

  -- 削除できなかった = 既にwaitlistにいない
  -- → マッチング処理に先を越された可能性が高いので、対局情報を確認する
  select * into v_match
  from private.matches m
  where (m.black_uid = v_player_uid or m.white_uid = v_player_uid)
    and m.status = 'playing'
  limit 1;

  if found then
    return private.build_match_json(v_match, v_player_uid);
  end if;

  -- waitlistにもmatchesにもいない場合（何もしていなかった等） → null
  return null;
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

CREATE OR REPLACE FUNCTION public.get_own_profile_preview()
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_row private.profiles;
  v_uid uuid := auth.uid();
  v_rating_9 smallint := 0;
  v_rating_13 smallint := 0;
  v_rating_19 smallint := 0;
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.* INTO v_row
  FROM private.profiles p
  WHERE p.uid = v_uid;

  IF v_row.uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- ★ 新しい user_stats テーブルから書く盤面サイズのratingを取得する
  SELECT COALESCE(rating, 0) INTO v_rating_9
  FROM private.user_stats
  WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0) INTO v_rating_13
  FROM private.user_stats
  WHERE uid = v_uid AND board_size = 13;

  SELECT COALESCE(rating, 0) INTO v_rating_19
  FROM private.user_stats
  WHERE uid = v_uid AND board_size = 19;

  RETURN json_build_object(
    'username', v_row.username,
    'rating_9', COALESCE(v_rating_9, 0),
    'rating_13', COALESCE(v_rating_13, 0),
    'rating_19', COALESCE(v_rating_19, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_rankings()
  RETURNS TABLE (
    username         text,
    rating           smallint,
    icon_index       smallint,
    board_size       integer,
    is_authenticated boolean
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  RETURN QUERY
  WITH ranked_stats AS (
    SELECT 
      p.username, 
      us.rating,
      p.icon_index,
      us.board_size::int AS board_size,
      private.is_authenticated_user(p.uid) AS is_authenticated,
      -- ★ 盤サイズごとにポイントが高い順でランク（順番）をつける
      ROW_NUMBER() OVER (
        PARTITION BY us.board_size 
        ORDER BY us.rating DESC
      ) AS rank_num
    FROM private.user_stats us
    JOIN private.profiles p ON p.uid = us.uid
    WHERE p.is_bot = false
      AND us.board_size IN (9, 13, 19)
  )
  SELECT 
    r.username,
    r.rating,
    r.icon_index,
    r.board_size,
    r.is_authenticated
  FROM ranked_stats r
  WHERE r.rank_num <= 30
  ORDER BY r.board_size ASC, r.rating DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_waitlist (
  p_board_size smallint,
  p_has_b18    boolean,
  p_after_id   integer  DEFAULT NULL::integer
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_match        private.matches%rowtype;
  v_player_uid   uuid := auth.uid();
  v_match_json   jsonb := null;
  v_records_json jsonb := '[]'::jsonb;
begin
  PERFORM private.check_version();
  perform private.check_maintenance();

  -- 1. 差分棋譜の取得（ヘルパー関数を呼ぶだけ！）
  v_records_json := private.fetch_newer_records(v_player_uid, p_board_size, p_after_id);

  -- 2. 対局中かチェック
  select * into v_match
  from private.matches m
  where (m.black_uid = v_player_uid or m.white_uid = v_player_uid)
    and m.status = 'playing'
  limit 1;

  if found then
    v_match_json := private.build_match_json(v_match, v_player_uid);
  else
    -- 待機列に追加（既に待機中なら何もしない）
    begin
      insert into private.waitlist (player_uid, board_size, has_b18)
      values (v_player_uid, p_board_size, p_has_b18);
    exception
      when unique_violation then null;
    end;
  end if;

  -- 3. 対局情報がない、かつ棋譜もない場合は null を返す（互換性維持）
  if v_match_json is null and jsonb_array_length(v_records_json) = 0 then
    return null;
  end if;

  -- レスポンスの構築
  return jsonb_build_object(
    'match', v_match_json,
    'newer_records', v_records_json
  );
end;
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
  SELECT board_size, rating, giant_killing_streak, wins, losses, draws
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

  -- ✏️ private.user_stats の上書き
  UPDATE private.user_stats us
  SET
    rating = t.rating,
    giant_killing_streak = t.giant_killing_streak,
    wins = t.wins,
    losses = t.losses,
    draws = t.draws
  FROM temp_guest_stats t
  WHERE us.uid = calling_uid
    AND us.board_size = t.board_size;

END;
$function$;

CREATE OR REPLACE FUNCTION public.update_country (
  new_country text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  UPDATE private.profiles
  SET country = new_country
  WHERE profiles.uid = auth.uid();
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

  -- 2. バリデーション（1〜8文字の半角英数字・アンダースコア）
  if new_username !~ '^[A-Za-z0-9_]{1,8}$' then
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

GRANT EXECUTE ON FUNCTION "private"."bot_config"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_draw_delta"(boolean, smallint, smallint) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_match_delta"(text, smallint, smallint, smallint, smallint, smallint, smallint, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."get_bot_match_info"(smallint, smallint, boolean) TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_my_profile"(integer, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_my_profile"(integer, integer, integer) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."join_waitlist"(smallint, boolean, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."update_country"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."update_country"(text) TO "anon", "authenticated", "postgres", "service_role";

SELECT cron.schedule_in_database('try_match_all(19)', '3 seconds', 'SELECT private.try_match_all(19::smallint)', 'postgres', NULL, true);
