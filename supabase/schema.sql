


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "private"."archive_matches"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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

  delete from private.matches m where m.id = new.id;
  return null;
end;
$$;


ALTER FUNCTION "private"."archive_matches"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."matches" (
    "black_uid" "uuid",
    "white_uid" "uuid",
    "status" "text" DEFAULT ''::"text",
    "moves" smallint[] DEFAULT '{}'::smallint[],
    "result" "text",
    "black_last_seen" timestamp with time zone DEFAULT "now"(),
    "white_last_seen" timestamp with time zone DEFAULT "now"(),
    "turn" "text" DEFAULT 'black'::"text",
    "black_seconds" smallint,
    "white_seconds" smallint,
    "turn_switched_at" timestamp with time zone,
    "match_type" smallint DEFAULT '0'::smallint,
    "id" integer NOT NULL,
    "board_size" smallint DEFAULT '9'::smallint,
    "dead_stones" smallint[] DEFAULT '{}'::smallint[]
);


ALTER TABLE "private"."matches" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."assert_player"("p_match_id" integer, "p_allowed_statuses" "text"[] DEFAULT ARRAY['playing'::"text"], OUT "my_color" "text", OUT "match" "private"."matches") RETURNS "record"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- 1. マッチ情報の取得（行ロック付き）
  select * into match
  from private.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'マッチが見つかりません';
  end if;

  -- 2. 本人チェック＆自分の色判定
  if match.black_uid = auth.uid() then
    my_color := 'black';
  elsif match.white_uid = auth.uid() then
    my_color := 'white';
  else
    raise exception '不正なアクセスです';
  end if;

  -- 3. ステータスチェック
  if not (match.status = any(p_allowed_statuses)) then
    raise exception '対局中ではありません（現在の状態: %）', match.status;
  end if;
end;
$$;


ALTER FUNCTION "private"."assert_player"("p_match_id" integer, "p_allowed_statuses" "text"[], OUT "my_color" "text", OUT "match" "private"."matches") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."bot_config"() RETURNS TABLE("board_size" smallint, "rank_idx" smallint, "bot_name" "text", "match_type" smallint)
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."bot_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."build_match_json"("p_match" "private"."matches", "p_player_uid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_is_black       boolean := (p_match.black_uid = p_player_uid);
  v_black_profiles private.profiles%rowtype;
  v_white_profiles private.profiles%rowtype;
  
  -- 相手のプロフィールとポイントを入れる変数
  v_opp_profile    private.profiles%rowtype;
  v_opp_rating     smallint := 0;
begin
  -- プロフィールを取得
  select * into v_black_profiles from private.profiles where uid = p_match.black_uid;
  select * into v_white_profiles from private.profiles where uid = p_match.white_uid;

  -- 自分が黒なら相手は白、自分が白なら相手は黒
  if v_is_black then
    v_opp_profile := v_white_profiles;
  else
    v_opp_profile := v_black_profiles;
  end if;

  -- ★新しい user_stats テーブルから、対象の盤サイズのポイントを取得する
  if v_opp_profile.uid is not null then
    select coalesce(rating, 0)
      into v_opp_rating
      from private.user_stats
     where uid = v_opp_profile.uid
       and board_size = p_match.board_size;
  end if;

  return jsonb_build_object(
    'match_id',       p_match.id,
    'board_size',     p_match.board_size,
    'match_type',     p_match.match_type,
    'moves',          coalesce(to_jsonb(p_match.moves), '[]'::jsonb),
    'my_color',       case when v_is_black then 'black' else 'white' end,
    'opp_uid',        v_opp_profile.uid,
    'opp_rating',     coalesce(v_opp_rating, 0),
    'opp_username',   v_opp_profile.username,
    'opp_icon_index', v_opp_profile.icon_index,
    'my_seconds',     case when v_is_black then p_match.black_seconds else p_match.white_seconds end,
    'opp_seconds',    case when v_is_black then p_match.white_seconds else p_match.black_seconds end,
    'bot_match',      (coalesce(v_black_profiles.is_bot, false) or coalesce(v_white_profiles.is_bot, false))
  );
end;
$$;


ALTER FUNCTION "private"."build_match_json"("p_match" "private"."matches", "p_player_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."calculate_draw_delta"("p_is_bot_match" boolean, "p_black_rating" smallint, "p_white_rating" smallint, OUT "o_black_delta" smallint, OUT "o_white_delta" smallint) RETURNS "record"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."calculate_draw_delta"("p_is_bot_match" boolean, "p_black_rating" smallint, "p_white_rating" smallint, OUT "o_black_delta" smallint, OUT "o_white_delta" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."calculate_match_delta"("p_winner" "text", "p_black_rating" smallint, "p_white_rating" smallint, "p_black_giant_killing_streak" smallint, "p_white_giant_killing_streak" smallint, "p_black_games" smallint, "p_white_games" smallint, "p_is_bot_match" boolean, OUT "o_winner_delta" smallint, OUT "o_loser_delta" smallint, OUT "o_winner_giant_killing_streak" smallint, OUT "o_loser_giant_killing_streak" smallint) RETURNS "record"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."calculate_match_delta"("p_winner" "text", "p_black_rating" smallint, "p_white_rating" smallint, "p_black_giant_killing_streak" smallint, "p_white_giant_killing_streak" smallint, "p_black_games" smallint, "p_white_games" smallint, "p_is_bot_match" boolean, OUT "o_winner_delta" smallint, OUT "o_loser_delta" smallint, OUT "o_winner_giant_killing_streak" smallint, OUT "o_loser_giant_killing_streak" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."check_maintenance"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- app_status テーブルからメンテナンス状態を取得
  SELECT maintenance, message INTO v_rec FROM private.app_status LIMIT 1;

  -- メンテ中（true）なら、例外（エラー）を発生させて処理をここで強制終了する
  IF v_rec.maintenance THEN
    RAISE EXCEPTION 'MAINTENANCE_MODE: %', COALESCE(v_rec.message, '現在メンテナンス中です');
  END IF;
END;
$$;


ALTER FUNCTION "private"."check_maintenance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."check_version"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rec RECORD;
  v_headers json := current_setting('request.headers', true)::json;
  v_client_app_version text := v_headers ->> 'x-app-version';
  v_client_ota_version text := v_headers ->> 'x-ota-version';
BEGIN
  SELECT app_version, ota_version INTO v_rec FROM private.app_status LIMIT 1;

  -- app_versionが設定されていて、完全一致していなければ強制アップデート対象
  IF v_rec.app_version IS NOT NULL
     AND v_client_app_version IS DISTINCT FROM v_rec.app_version THEN
    RAISE EXCEPTION 'VERSION_INSUFFICIENT_APP: %', v_rec.app_version;
  END IF;

  -- ota_versionが設定されていて、完全一致していなければ再起動対象
  IF v_rec.ota_version IS NOT NULL
     AND v_client_ota_version IS DISTINCT FROM v_rec.ota_version THEN
    RAISE EXCEPTION 'VERSION_INSUFFICIENT_OTA: %', v_rec.ota_version;
  END IF;
END;
$$;


ALTER FUNCTION "private"."check_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cleanup_cron_logs"() RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  TRUNCATE cron.job_run_details;
$$;


ALTER FUNCTION "private"."cleanup_cron_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cleanup_old_anonymous_profiles"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- lastseenが14日以上前、かつ 本物（認証済み）ユーザーではなく、ボットでもないアカウントを削除
  DELETE FROM private.profiles p
  WHERE p.lastseen < CURRENT_DATE - INTERVAL '14 days'
    AND p.is_bot = false
    AND NOT private.is_authenticated_user(p.uid);
END;
$$;


ALTER FUNCTION "private"."cleanup_old_anonymous_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."fetch_newer_records"("p_player_uid" "uuid", "p_board_size" smallint, "p_after_id" integer, "p_limit" smallint DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."fetch_newer_records"("p_player_uid" "uuid", "p_board_size" smallint, "p_after_id" integer, "p_limit" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."get_bot_match_info"("p_rating" smallint, "p_board_size" smallint, "p_has_b18" boolean DEFAULT true, OUT "o_bot_uid" "uuid", OUT "o_match_type" smallint) RETURNS "record"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."get_bot_match_info"("p_rating" smallint, "p_board_size" smallint, "p_has_b18" boolean, OUT "o_bot_uid" "uuid", OUT "o_match_type" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."handle_new_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_authenticated_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users au
    WHERE au.id = user_id
      AND (au.is_anonymous IS NOT TRUE OR au.email IS NOT NULL)
  );
$$;


ALTER FUNCTION "private"."is_authenticated_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_bot_uid"("p_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(p.is_bot, false)
  from private.profiles p
  where p.uid = p_uid
$$;


ALTER FUNCTION "private"."is_bot_uid"("p_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."notify_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."notify_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."on_move_added"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_len int;
begin
  v_len := array_length(NEW.moves, 1);

  -- 通常のmoveイベント
  begin
    perform realtime.send(
      jsonb_build_object(
        'move',          NEW.moves[v_len],
        'move_count',    v_len,
        'turn',          NEW.turn,
        'black_seconds', NEW.black_seconds,
        'white_seconds', NEW.white_seconds
      ),
      'move',
      'game:' || NEW.id::text,
      false
    );
  end;

  -- 2連続パスチェック
  if v_len >= 2
    and NEW.moves[v_len] = -1
    and NEW.moves[v_len - 1] = -1
  then
    -- status を pending に変更
    update private.matches
      set status = 'pending'
    where id = NEW.id;

    -- double_pass イベント送信
    perform realtime.send(
      jsonb_build_object(
        'double_pass', true
      ),
      'double_pass',
      'game:' || NEW.id::text,
      false
    );
  end if;

  return null;
end;
$$;


ALTER FUNCTION "private"."on_move_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."rating_to_rank_index"("p_rating" smallint) RETURNS smallint
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select cast(greatest(0, (
    select count(*) - 1
    from (values
      (0), (20), (60), (120), (200), (300), (420), (560), (720), -- 10k ~ 2k
       (900), (1100), (1300), (1500), (1700), (1900), (2100), (2300), (2500) -- 1k ~ 8D
    ) as t(threshold)
    where threshold <= p_rating
  )) as smallint);
$$;


ALTER FUNCTION "private"."rating_to_rank_index"("p_rating" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."time_connection_check"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."time_connection_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."try_match_all"("p_board_size" smallint) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "private"."try_match_all"("p_board_size" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_ctx           record;
    v_my_color      text;
    v_match         private.matches%rowtype;
    v_elapsed_sec   int;
    v_increment_sec int;

    v_is_bot_black        boolean;
    v_is_bot_white        boolean;
    v_current_turn_is_bot boolean;
    v_acting_color        text;
begin
    -- 1〜3. 本人チェック・存在チェック・ステータス（playing）チェック ＆ マッチ情報取得
    v_ctx := private.assert_player(p_match_id);
    v_my_color := v_ctx.my_color;
    v_match    := v_ctx.match;

    -- 4. ボット判定
    v_is_bot_black := private.is_bot_uid(v_match.black_uid);
    v_is_bot_white := private.is_bot_uid(v_match.white_uid);

    if v_match.turn = 'black' and v_is_bot_black then
        v_current_turn_is_bot := true;
    elsif v_match.turn = 'white' and v_is_bot_white then
        v_current_turn_is_bot := true;
    else
        v_current_turn_is_bot := false;
    end if;

    -- 5. 手番チェック（p_is_bot を先に見て、常に「本当にbotの手番か」を検証する）
    if p_is_bot then
        if v_current_turn_is_bot then
            v_acting_color := v_match.turn;
        else
            raise exception 'botの手番ではありません';
        end if;
    else
        if v_match.turn = v_my_color then
            v_acting_color := v_my_color;
        else
            raise exception '手番ではありません';
        end if;
    end if;

    -- 6. 手を打つたびに、自分のsecondsを更新する。経過時間の計算（自分の last_seen と今の時間との差を見る）
    v_elapsed_sec := extract(epoch from (now() - v_match.turn_switched_at))::int;

    v_increment_sec := case v_match.board_size
        when 9  then 2
        when 13 then 4
        when 19 then 6
        else 1
    end;

    -- 7. 盤面と時間の更新
    update private.matches set
        moves            = array_append(coalesce(moves, '{}'), p_move),
        black_last_seen  = case when v_acting_color = 'black' then now() else black_last_seen end,
        white_last_seen  = case when v_acting_color = 'white' then now() else white_last_seen end,
        turn             = case when v_acting_color = 'black' then 'white' else 'black' end,
        turn_switched_at = now(),
        black_seconds    = case
            when v_acting_color = 'black' then v_match.black_seconds - v_elapsed_sec + v_increment_sec
            else v_match.black_seconds
        end,
        white_seconds    = case
            when v_acting_color = 'white' then v_match.white_seconds - v_elapsed_sec + v_increment_sec
            else v_match.white_seconds
        end
    where id = p_match_id;
end;
$$;


ALTER FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_waitlist"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."cancel_waitlist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  calling_uid uuid := auth.uid();
  guest_is_anonymous boolean;
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

  -- 🌟 渡されたuidが「本物の匿名ユーザー」であることを必ず確認する
  SELECT is_anonymous INTO guest_is_anonymous
  FROM auth.users WHERE id = p_guest_uid;

  IF guest_is_anonymous IS NOT TRUE THEN
    RAISE EXCEPTION 'guest_uid_not_anonymous';
  END IF;

  -- ✏️ ゲスト時代の対局記録は退会者扱い(NULL)にする
  UPDATE private.records SET black_uid = NULL WHERE black_uid = p_guest_uid;
  UPDATE private.records SET white_uid = NULL WHERE white_uid = p_guest_uid;

  -- 🔥ゲストを削除。CASCADEでuser_settings/user_statsも消える
  DELETE FROM private.profiles WHERE uid = p_guest_uid;
  DELETE FROM auth.users WHERE id = p_guest_uid;
END;
$$;


ALTER FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  calling_uid uuid;
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();
  
  -- 呼び出し元のUIDを取得（認証済みユーザーのみ実行可能）
  calling_uid := auth.uid();

  IF calling_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- profiles削除 -- ⚠️一見不要そうに見えるが、匿名ログインの際はprofilesテーブルとauth.usersは繋がっていないため必要
  DELETE FROM private.profiles WHERE profiles.uid = calling_uid;

  -- auth.usersを削除
  DELETE FROM auth.users WHERE users.id = calling_uid;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile"("p_after_id_9" integer DEFAULT NULL::integer, "p_after_id_13" integer DEFAULT NULL::integer, "p_after_id_19" integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_my_profile"("p_after_id_9" integer, "p_after_id_13" integer, "p_after_id_19" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_own_profile_preview"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."get_own_profile_preview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rankings"() RETURNS TABLE("username" "text", "rating" smallint, "icon_index" smallint, "board_size" integer, "is_authenticated" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."get_rankings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer DEFAULT NULL::integer) RETURNS TABLE("id" integer, "created_at" "date", "result" "text", "match_type" smallint, "moves" smallint[], "dead_stones" smallint[], "black_points" smallint, "white_points" smallint, "board_size" smallint, "black_uid" "uuid", "black_username" "text", "black_icon_index" smallint, "black_rank_index" smallint, "white_uid" "uuid", "white_username" "text", "white_icon_index" smallint, "white_rank_index" smallint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_version();
  PERFORM private.check_maintenance();
 
  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.result,
    r.match_type,
    r.moves,
    r.dead_stones,
    r.black_rating, -- r.black_points から r.black_rating に修正！
    r.white_rating, -- r.white_points から r.white_rating に修正！
    r.board_size,
    r.black_uid,
    bp.username,
    bp.icon_index,
    private.rating_to_rank_index(r.black_rating), 
    r.white_uid,
    wp.username,
    wp.icon_index,
    private.rating_to_rank_index(r.white_rating)
  FROM private.records r
  LEFT JOIN private.profiles bp ON bp.uid = r.black_uid
  LEFT JOIN private.profiles wp ON wp.uid = r.white_uid
  WHERE (r.black_uid = p_uid OR r.white_uid = p_uid)
    AND r.board_size = p_board_size
    AND (p_before_id IS NULL OR r.id < p_before_id)
  ORDER BY r.id DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_waitlist"("p_board_size" smallint, "p_has_b18" boolean, "p_after_id" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."join_waitlist"("p_board_size" smallint, "p_has_b18" boolean, "p_after_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resign"("p_match_id" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ctx      record;
  v_my_color text;
begin
  -- 1. 本人確認＆色の取得（部外者ならこの時点で自動的にエラー終了する）
  v_ctx := private.assert_player(p_match_id);
  v_my_color := v_ctx.my_color;

  -- 2. 投了処理
  update private.matches set
    result = case when v_my_color = 'black' then 'W+R' else 'B+R' end,
    status = 'finished'
  where id = p_match_id
    and status = 'playing';
end;
$$;


ALTER FUNCTION "public"."resign"("p_match_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[] DEFAULT '{}'::smallint[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_black_uid uuid;
  v_white_uid uuid;
  v_current_result text;
  v_match record;
begin
  -- 1. 本人チェック＆statusがpendingかどうかのチェック（部外者・状態不正ならここで自動エラー終了）
  perform private.assert_player(p_match_id, array['pending']);

  -- 2. 排他ロック（for update）をかけながら対局情報を取得する
  select *
  into v_match
  from private.matches m
  where m.id = p_match_id
  for update;

  if not found then
    return;
  end if;

  v_black_uid := v_match.black_uid;
  v_white_uid := v_match.white_uid;
  v_current_result := v_match.result;

  -- 3. bot戦は無条件で確定する
  if private.is_bot_uid(v_black_uid) or private.is_bot_uid(v_white_uid) then
    update private.matches
    set result = p_result, status = 'finished', dead_stones = p_dead_stones
    where id = p_match_id;
    return;
  end if;

  -- 4. ① 一人目の結果送信
  if v_current_result is null then
    update private.matches
    set result = p_result, dead_stones = p_dead_stones
    where id = p_match_id;
    return;
  end if;

  -- 5. ② 二人目の結果送信 → 後着優先で確定する
  update private.matches
  set result = p_result, status = 'finished', dead_stones = p_dead_stones
  where id = p_match_id;
end;
$$;


ALTER FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  -- ★ private.profiles ではなく private.user_settings を更新する
  UPDATE private.user_settings
  SET allow_bot_match = new_allow_bot_match
  WHERE uid = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_country"("new_country" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  UPDATE private.profiles
  SET country = new_country
  WHERE profiles.uid = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_country"("new_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_icon_index"("new_icon_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_version();
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  UPDATE private.profiles
  SET icon_index = new_icon_index
  WHERE profiles.uid = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_icon_index"("new_icon_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_seen"("p_match_id" integer) RETURNS smallint[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ctx           record;
  v_my_color      text;
  v_match         private.matches%rowtype;
  v_last_time     timestamp with time zone;
  v_elapsed_sec   int;
  v_is_bot_black  boolean;
  v_is_bot_white  boolean;
begin
  -- 1. 本人チェック＆自分の色を取得（同時にplaying判定・行ロックも済ませる）
  v_ctx := private.assert_player(p_match_id);
  v_my_color := v_ctx.my_color;
  v_match    := v_ctx.match;

  -- 2. Bot判定
  v_is_bot_black := private.is_bot_uid(v_match.black_uid);
  v_is_bot_white := private.is_bot_uid(v_match.white_uid);

  -- 3. DB更新
  update private.matches
  set
    black_last_seen = case
      when v_my_color = 'black' or v_is_bot_black then now()
      else black_last_seen
    end,
    white_last_seen = case
      when v_my_color = 'white' or v_is_bot_white then now()
      else white_last_seen
    end
  where id = p_match_id;

  -- 4. 最新データを返す
  return (
    select m.moves
    from private.matches m
    where m.id = p_match_id
  );
end;
$$;


ALTER FUNCTION "public"."update_last_seen"("p_match_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_username"("new_username" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."update_username"("new_username" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."app_status" (
    "id" smallint NOT NULL,
    "maintenance" boolean DEFAULT false,
    "message" "text" DEFAULT ''::"text",
    "app_version" "text",
    "ota_version" "text"
);


ALTER TABLE "private"."app_status" OWNER TO "postgres";


ALTER TABLE "private"."app_status" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "private"."app_status_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "private"."records" (
    "result" "text",
    "created_at" "date" NOT NULL,
    "black_uid" "uuid",
    "white_uid" "uuid",
    "moves" smallint[],
    "match_type" smallint DEFAULT '0'::smallint,
    "id" integer NOT NULL,
    "black_rating" smallint,
    "white_rating" smallint,
    "board_size" smallint DEFAULT '9'::smallint NOT NULL,
    "dead_stones" smallint[] DEFAULT '{}'::smallint[]
);


ALTER TABLE "private"."records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "private"."matches_archive_new_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "private"."matches_archive_new_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "private"."matches_archive_new_id_seq" OWNED BY "private"."records"."id";



CREATE SEQUENCE IF NOT EXISTS "private"."matches_new_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "private"."matches_new_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "private"."matches_new_id_seq" OWNED BY "private"."matches"."id";



CREATE TABLE IF NOT EXISTS "private"."profiles" (
    "uid" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "created_at" "date" DEFAULT "now"(),
    "icon_index" smallint DEFAULT '0'::smallint,
    "lastseen" "date" DEFAULT CURRENT_DATE,
    "is_bot" boolean DEFAULT false,
    "country" "text"
);


ALTER TABLE "private"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."user_settings" (
    "uid" "uuid" NOT NULL,
    "allow_bot_match" boolean DEFAULT true
);


ALTER TABLE "private"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."user_stats" (
    "uid" "uuid" NOT NULL,
    "board_size" smallint NOT NULL,
    "rating" smallint DEFAULT '0'::smallint,
    "wins" smallint DEFAULT '0'::smallint,
    "losses" smallint DEFAULT '0'::smallint,
    "draws" smallint DEFAULT '0'::smallint,
    "highest_rating" smallint DEFAULT '0'::smallint,
    "giant_killing_streak" smallint DEFAULT '0'::smallint,
    "win_streak" smallint DEFAULT '0'::smallint
);


ALTER TABLE "private"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."waitlist" (
    "player_uid" "uuid" NOT NULL,
    "try_count" smallint DEFAULT '1'::smallint,
    "board_size" smallint,
    "has_b18" boolean
);


ALTER TABLE "private"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "private"."matches" ALTER COLUMN "id" SET DEFAULT "nextval"('"private"."matches_new_id_seq"'::"regclass");



ALTER TABLE ONLY "private"."app_status"
    ADD CONSTRAINT "app_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "private"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "private"."records"
    ADD CONSTRAINT "records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("uid");



ALTER TABLE ONLY "private"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("uid", "board_size");



ALTER TABLE ONLY "private"."waitlist"
    ADD CONSTRAINT "waiting_pkey" PRIMARY KEY ("player_uid");



CREATE INDEX "matches_black_uid_idx" ON "private"."matches" USING "btree" ("black_uid");



CREATE INDEX "matches_white_uid_idx" ON "private"."matches" USING "btree" ("white_uid");



CREATE OR REPLACE TRIGGER "on_profile_created" AFTER INSERT ON "private"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."handle_new_profile"();



CREATE OR REPLACE TRIGGER "trg_archive_matches" AFTER UPDATE ON "private"."matches" FOR EACH ROW WHEN ((("new"."status" = 'finished'::"text") AND ("old"."status" IS DISTINCT FROM 'finished'::"text"))) EXECUTE FUNCTION "private"."archive_matches"();



CREATE OR REPLACE TRIGGER "trg_notify_match" BEFORE INSERT ON "private"."matches" FOR EACH ROW EXECUTE FUNCTION "private"."notify_match"();



CREATE OR REPLACE TRIGGER "trg_on_move_added" AFTER UPDATE ON "private"."matches" FOR EACH ROW WHEN ((COALESCE("array_length"("new"."moves", 1), 0) > COALESCE("array_length"("old"."moves", 1), 0))) EXECUTE FUNCTION "private"."on_move_added"();



ALTER TABLE ONLY "private"."profiles"
    ADD CONSTRAINT "profiles_uid_fkey" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."user_settings"
    ADD CONSTRAINT "user_settings_uid_fkey" FOREIGN KEY ("uid") REFERENCES "private"."profiles"("uid") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."user_stats"
    ADD CONSTRAINT "user_stats_uid_fkey" FOREIGN KEY ("uid") REFERENCES "private"."profiles"("uid") ON DELETE CASCADE;



ALTER TABLE "private"."app_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete: 自分なら許可" ON "private"."matches" FOR DELETE USING ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid")));



CREATE POLICY "delete: 自分なら許可" ON "private"."profiles" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "delete: 自分なら許可" ON "private"."user_settings" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "delete: 自分なら許可" ON "private"."user_stats" FOR DELETE USING (("auth"."uid"() = "uid"));



CREATE POLICY "delete: 自分なら許可" ON "private"."waitlist" FOR DELETE USING (("auth"."uid"() = "player_uid"));



CREATE POLICY "insert: 自分なら許可" ON "private"."matches" FOR INSERT WITH CHECK ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid")));



CREATE POLICY "insert: 自分なら許可" ON "private"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "insert: 自分なら許可" ON "private"."records" FOR INSERT WITH CHECK ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid")));



CREATE POLICY "insert: 自分なら許可" ON "private"."user_settings" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "insert: 自分なら許可" ON "private"."user_stats" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "insert: 自分なら許可" ON "private"."waitlist" FOR INSERT WITH CHECK (("auth"."uid"() = "player_uid"));



ALTER TABLE "private"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select: ログイン済みなら許可" ON "private"."records" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "select: 全員許可" ON "private"."app_status" FOR SELECT USING (true);



CREATE POLICY "select: 全員許可" ON "private"."user_stats" FOR SELECT USING (true);



CREATE POLICY "select: 全員許可(ランキングなど)" ON "private"."profiles" FOR SELECT USING (true);



CREATE POLICY "select: 全員許可(観戦など)" ON "private"."matches" FOR SELECT USING (true);



CREATE POLICY "select: 自分なら許可" ON "private"."user_settings" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "select: 自分なら許可(deleteのために必須)" ON "private"."waitlist" FOR SELECT USING (("auth"."uid"() = "player_uid"));



CREATE POLICY "update: 自分なら許可" ON "private"."matches" FOR UPDATE USING ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid"))) WITH CHECK ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid")));



CREATE POLICY "update: 自分なら許可" ON "private"."profiles" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "update: 自分なら許可" ON "private"."user_settings" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



CREATE POLICY "update: 自分なら許可" ON "private"."user_stats" FOR UPDATE USING (("auth"."uid"() = "uid")) WITH CHECK (("auth"."uid"() = "uid"));



ALTER TABLE "private"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."waitlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "private" TO "anon";
GRANT USAGE ON SCHEMA "private" TO "authenticated";
GRANT USAGE ON SCHEMA "private" TO "service_role";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";



GRANT ALL ON TABLE "private"."matches" TO "anon";
GRANT ALL ON TABLE "private"."matches" TO "authenticated";
GRANT ALL ON TABLE "private"."matches" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_move"("p_match_id" integer, "p_move" smallint, "p_is_bot" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_waitlist"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_waitlist"() TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_waitlist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_waitlist"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_guest_after_existing_selected"("p_guest_uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_user_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_profile"("p_after_id_9" integer, "p_after_id_13" integer, "p_after_id_19" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile"("p_after_id_9" integer, "p_after_id_13" integer, "p_after_id_19" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile"("p_after_id_9" integer, "p_after_id_13" integer, "p_after_id_19" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"("p_after_id_9" integer, "p_after_id_13" integer, "p_after_id_19" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_own_profile_preview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_rankings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint, "p_has_b18" boolean, "p_after_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint, "p_has_b18" boolean, "p_after_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint, "p_has_b18" boolean, "p_after_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overwrite_profile_from_guest"("p_guest_uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resign"("p_match_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resign"("p_match_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."resign"("p_match_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resign"("p_match_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[]) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_match_result"("p_match_id" integer, "p_result" "text", "p_dead_stones" smallint[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_country"("new_country" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_country"("new_country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_country"("new_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_country"("new_country" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_last_seen"("p_match_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_last_seen"("p_match_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_seen"("p_match_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_seen"("p_match_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_username"("new_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_username"("new_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_username"("new_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_username"("new_username" "text") TO "service_role";



GRANT ALL ON TABLE "private"."app_status" TO "anon";
GRANT ALL ON TABLE "private"."app_status" TO "authenticated";
GRANT ALL ON TABLE "private"."app_status" TO "service_role";



GRANT ALL ON TABLE "private"."records" TO "anon";
GRANT ALL ON TABLE "private"."records" TO "authenticated";
GRANT ALL ON TABLE "private"."records" TO "service_role";



GRANT ALL ON SEQUENCE "private"."matches_archive_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "private"."matches_archive_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "private"."matches_archive_new_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "private"."matches_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "private"."matches_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "private"."matches_new_id_seq" TO "service_role";



GRANT ALL ON TABLE "private"."profiles" TO "anon";
GRANT ALL ON TABLE "private"."profiles" TO "authenticated";
GRANT ALL ON TABLE "private"."profiles" TO "service_role";



GRANT ALL ON TABLE "private"."waitlist" TO "anon";
GRANT ALL ON TABLE "private"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "private"."waitlist" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




