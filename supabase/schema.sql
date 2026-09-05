


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
  v_base_delta smallint := 0; -- 基準となるdelta
  v_black_delta smallint := 0; -- ⚫️が上がるもしくは下がるpoint数
  v_white_delta smallint := 0; -- ⚪️が上がるもしくは下がるpoint数
  v_diff smallint; -- 二人のpoint差
  v_black_games smallint; -- ⚫️の対局数
  v_white_games smallint; -- ⚪️の対局数
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
  v_black_rating smallint; -- ⚫️のrating
  v_white_rating smallint; -- ⚪️のrating
  v_black_giantkill smallint := 0; -- ⚫️の格上連勝数
  v_white_giantkill smallint := 0; -- ⚪️の格上連勝数
  v_black_new_rating smallint; -- ⚫️の新しいrating
  v_white_new_rating smallint; -- ⚪️の新しいrating

  -- 勝敗・引き分けのインクリメント用変数
  v_black_win_inc smallint := 0;
  v_black_loss_inc smallint := 0;
  v_black_draw_inc smallint := 0;
  v_white_win_inc smallint := 0;
  v_white_loss_inc smallint := 0;
  v_white_draw_inc smallint := 0;

  -- 既存のポイント（盤サイズとは逆側も保持しておく）
  v_black_rating_other smallint := 0;
  v_white_rating_other smallint := 0;

  -- アイコン関連の変数
  v_black_old_icons smallint[];
  v_white_old_icons smallint[];
  v_black_updated_icons smallint[];
  v_white_updated_icons smallint[];
  v_black_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン
  v_white_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン

  v_icon_item smallint;
  v_other_board_size smallint;
begin
  -- 反対側の盤サイズを割り出すにゃ（アイコン計算用）
  v_other_board_size := case when new.board_size = 9 then 13 else 9 end;

  -- ─── 1. プロフィール情報 & 戦績情報の取得 ───────────────────────────
  -- ⚫️の情報を取得
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_black_bot, v_black_old_icons
  from private.profiles
  where uid = new.black_uid;

  -- wins + losses + draws の合計で総対局数を計算するにゃ！
  select 
    coalesce(wins + losses + draws, 0), 
    coalesce(rating, 0), 
    coalesce(giantkill, 0)
  into v_black_games, v_black_rating, v_black_giantkill
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_black_rating_other
  from private.user_stats
  where uid = new.black_uid and board_size = v_other_board_size;

  -- ⚪️の情報を取得
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_white_bot, v_white_old_icons
  from private.profiles
  where uid = new.white_uid;

  -- wins + losses + draws の合計で総対局数を計算するにゃ！
  select 
    coalesce(wins + losses + draws, 0), 
    coalesce(rating, 0), 
    coalesce(giantkill, 0)
  into v_white_games, v_white_rating, v_white_giantkill
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_white_rating_other
  from private.user_stats
  where uid = new.white_uid and board_size = v_other_board_size;

  -- ─── 2. ポイント計算 & 勝敗フラグの設定 ──────────────────────
  -- ------------------
  -- ⚫️が勝った🎉
  -- ------------------
  if new.result like 'B+%' then  
    v_black_win_inc := 1;
    v_white_loss_inc := 1;

    -- 勝った⚫️側の処理
    v_diff := v_white_rating - v_black_rating;
    v_base_delta := greatest(1, least(19,
      10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
    ));
    v_black_delta := v_base_delta;
    if v_diff > 0 then
      v_black_giantkill := v_black_giantkill + 1;
      v_black_delta := v_base_delta * v_black_giantkill;
    end if;

    -- 負けた⚪️側の処理
    v_white_giantkill := 0;
    if not v_is_black_bot and v_black_games <= 20 then
      v_white_delta := 0;
    else
      v_white_delta := -v_base_delta;
    end if;

  -- ------------------
  -- ⚪️が勝った🎉
  -- ------------------
  elsif new.result like 'W+%' then
    v_white_win_inc := 1;
    v_black_loss_inc := 1;

    -- 勝った⚪️側の処理
    v_diff := v_black_rating - v_white_rating;
    v_base_delta := greatest(1, least(19,
      10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
    ));
    v_white_delta := v_base_delta;
    if v_diff > 0 then
      v_white_giantkill := v_white_giantkill + 1;
      v_white_delta := v_base_delta * v_white_giantkill;
    end if;

    -- 負けた⚫️側の処理
    v_black_giantkill := 0;
    if not v_is_white_bot and v_white_games <= 20 then
      v_black_delta := 0;
    else
      v_black_delta := -v_base_delta;
    end if;

  -- ------------------
  -- 引き分け🤝
  -- ------------------
  else
    v_black_draw_inc := 1;
    v_white_draw_inc := 1;
    v_black_delta := 0;
    v_white_delta := 0;
  end if;

  -- ─── 3. 更新後のrating事前計算 ─────────────────────────
  v_black_new_rating := greatest(0, v_black_rating + v_black_delta);
  v_white_new_rating := greatest(0, v_white_rating + v_white_delta);

  -- ─── 4. アイコンの計算と新規獲得（差分）の抽出 ──────────────────
  -- ⚫️の新しい全獲得可能アイコンを計算
  if new.board_size = 9 then
    v_black_updated_icons := private.calculate_icons(v_black_new_rating, v_black_rating_other);
  else
    v_black_updated_icons := private.calculate_icons(v_black_rating_other, v_black_new_rating);
  end if;

  -- ⚫️の「今回新しく増えたアイコン」を特定（古い配列に含まれていないもの）
  foreach v_icon_item in array v_black_updated_icons loop
    if not (v_icon_item = any(v_black_old_icons)) then
      v_black_new_icons := array_append(v_black_new_icons, v_icon_item);
    end if;
  end loop;

  -- 重複を排除して結合した全所持アイコンリスト（念のため）
  select array_agg(distinct elem order by elem)
  into v_black_updated_icons
  from unnest(v_black_old_icons || v_black_updated_icons) as elem;


  -- ⚪️の新しい全獲得可能アイコンを計算
  if new.board_size = 9 then
    v_white_updated_icons := private.calculate_icons(v_white_new_rating, v_white_rating_other);
  else
    v_white_updated_icons := private.calculate_icons(v_white_rating_other, v_white_new_rating);
  end if;

  -- ⚪️の「今回新しく増えたアイコン」を特定
  foreach v_icon_item in array v_white_updated_icons loop
    if not (v_icon_item = any(v_white_old_icons)) then
      v_white_new_icons := array_append(v_white_new_icons, v_icon_item);
    end if;
  end loop;

  -- 重複を排除して結合した全所持アイコンリスト
  select array_agg(distinct elem order by elem)
  into v_white_updated_icons
  from unnest(v_white_old_icons || v_white_updated_icons) as elem;

  -- ─── 5. テーブルの更新 ────────────────────────────
  -- ⚫️の更新（人間の場合）
  if not v_is_black_bot then
    update private.user_stats set
      wins      = wins + v_black_win_inc,
      losses    = losses + v_black_loss_inc,
      draws     = draws + v_black_draw_inc,
      rating    = v_black_new_rating,
      giantkill = v_black_giantkill
    where uid = new.black_uid and board_size = new.board_size;

    update private.profiles set
      acquired_icons = v_black_updated_icons
    where uid = new.black_uid;
  else
    -- botの場合の勝敗数更新
    update private.user_stats set
      wins   = wins + v_black_win_inc,
      losses = losses + v_black_loss_inc,
      draws  = draws + v_black_draw_inc
    where uid = new.black_uid and board_size = new.board_size;
  end if;

  -- ⚪️の更新（人間の場合）
  if not v_is_white_bot then
    update private.user_stats set
      wins      = wins + v_white_win_inc,
      losses    = losses + v_white_loss_inc,
      draws     = draws + v_white_draw_inc,
      rating    = v_white_new_rating,
      giantkill = v_white_giantkill
    where uid = new.white_uid and board_size = new.board_size;

    update private.profiles set
      acquired_icons = v_white_updated_icons
    where uid = new.white_uid;
  else
    -- botの場合の勝敗数更新
    update private.user_stats set
      wins   = wins + v_white_win_inc,
      losses = losses + v_white_loss_inc,
      draws  = draws + v_white_draw_inc
    where uid = new.white_uid and board_size = new.board_size;
  end if;

  -- ─── 6. recordsにinsert ─────────────────────────────────
  insert into private.records (
    id, 
    black_uid, white_uid,
    moves,
    result,
    black_rating, white_rating,
    match_type, board_size,
    dead_stones,
    created_at
  ) values (
    new.id, 
    new.black_uid, new.white_uid,
    new.moves,
    new.result,
    v_black_rating, v_white_rating,
    new.match_type, new.board_size,
    new.dead_stones,
    now()
  ) on conflict (id) do nothing;

  -- ─── 7. broadcastで終局＆ポイント更新通知 ──────────────────────────────
  perform realtime.send(
    jsonb_build_object(
      'result', new.result,
      'black', jsonb_build_object(
        'delta', v_black_delta,
        'new_rating', v_black_new_rating,
        'acquired_icons', v_black_new_icons
      ),
      'white', jsonb_build_object(
        'delta', v_white_delta,
        'new_rating', v_white_new_rating,
        'acquired_icons', v_white_new_icons
      )
    ),
    'rating_updated', -- イベント名
    'game:' || new.id::text, -- gameChannelにまとめるにゃ
    false
  );

  -- ─── 8. matchesからdelete ───────────────────────────────
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


CREATE OR REPLACE FUNCTION "private"."calculate_icons"("p_rating9" smallint, "p_rating13" smallint) RETURNS smallint[]
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
  v_icons smallint[] := '{}';
  v_rank smallint;
begin
  -- 9路盤・13路盤の強い方のランクを採用する
  v_rank := greatest(
    private.rating_to_rank_index(p_rating9),
    private.rating_to_rank_index(p_rating13)
  );

  -- ランクに応じたアイコン (0 〜 5) を追加する
  for i in 0..5 loop
    if v_rank >= (i * 3) then
      v_icons := array_append(v_icons, i::smallint);
    end if;
  end loop;

  return v_icons;
end;
$$;


ALTER FUNCTION "private"."calculate_icons"("p_rating9" smallint, "p_rating13" smallint) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "private"."get_bot_match_info"("p_rating" smallint, "p_board_size" smallint, OUT "o_bot_uid" "uuid", OUT "o_match_type" smallint) RETURNS "record"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
  v_rank smallint;
  v_bot_username text;
begin
  -- ポイントからランク(0: 10k 〜 17: 8D)を計算する
  v_rank := private.rating_to_rank_index(p_rating);

  -- 1. ランクによって当たるボットを決める
  -- 10k(0) 〜 1D(9)  -> bot1
  -- 2D(10) 〜 4D(12) -> bot2
  -- 5D(13) 〜 8D(17) -> bot3
  if v_rank <= 9 then
    v_bot_username := 'bot1';
  elsif v_rank <= 12 then
    v_bot_username := 'bot2';
  else
    v_bot_username := 'bot3';
  end if;

  select pf.uid into o_bot_uid
  from private.profiles pf
  where pf.username = v_bot_username
  limit 1;

  -- 2. 盤の広さとランクに応じて match_type (置き石) を決める
  if p_board_size = 9 then
    o_match_type := case v_rank
      -- [対bot1]
      when 0 then 5 -- 10k
      when 1 then 5 -- 9k
      when 2 then 4 -- 8k
      when 3 then 4 -- 7k
      when 4 then 3 -- 6k
      when 5 then 3 -- 5k
      when 6 then 2 -- 4k
      when 7 then 2 -- 3k
      when 8 then 1 -- 2k
      when 9 then 1 -- 1k
      -- [対bot1] 1D
      -- [対bot2] 2,3,4D
      -- [対bot3] 5,6,7,8D
      else 0
    end;

  elsif p_board_size = 13 then
    o_match_type := case v_rank
      -- [対bot1]
      when 0 then 9 -- 10k
      when 1 then 8 -- 9k
      when 2 then 7 -- 8k
      when 3 then 6 -- 7k
      when 4 then 5 -- 6k
      when 5 then 4 -- 5k
      when 6 then 3 -- 4k
      when 7 then 2 -- 3k
      when 8 then 1 -- 2k
      when 9 then 1 -- 1k
      -- [対bot1] 1D
      -- [対bot2] 2,3,4D
      -- [対bot3] 5,6,7,8D
      else 0
    end;
  end if;
end;
$$;


ALTER FUNCTION "private"."get_bot_match_info"("p_rating" smallint, "p_board_size" smallint, OUT "o_bot_uid" "uuid", OUT "o_match_type" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- ① user_settings を自動作成（デフォルト値で作成される）
  insert into private.user_settings (uid)
  values (new.uid);

  -- ② user_stats を自動作成（9路盤と13路盤の初期データをあらかじめ作っておく）
  insert into private.user_stats (uid, board_size)
  values 
    (new.uid, 9),
    (new.uid, 13);

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
  new.black_seconds := case new.board_size when 13 then 305 else 185 end;
  new.white_seconds := case new.board_size when 13 then 305 else 185 end;

  -- profiles 取得（各1回のみ）
  select * into v_black
  from private.profiles
  where uid = new.black_uid;

  select * into v_white
  from private.profiles
  where uid = new.white_uid;

  -- ★ 新しい user_stats テーブルから、対象の盤サイズに応じたポイントを取得するにゃ
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
  -- 誰も届いていなければ引き分け(draw)。
  -- どちらの場合もarchive_playing側は新規のresultフォーマットに対応済み
  -- (B+/W+以外は自動的にdelta=0扱いになるので、drawは無条件で成立する)
  update private.matches
  set
    status = 'finished',
    result = coalesce(result, 'DRAW')
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

    -- 順番待ちの列に「本当にまだいるか」チェック
    if not exists (select 1 from private.waitlist wl where wl.player_uid = v_waiter.player_uid) then
      continue;
    end if;

    -- プロフィール情報をとってくる
    select * into v_waiter_profile from private.profiles pf where pf.uid = v_waiter.player_uid;

    -- ★ 新しい user_stats テーブルから対象盤サイズのポイントを取得するにゃ
    select coalesce(rating, 0)
      into v_waiter_rating
      from private.user_stats
     where uid = v_waiter.player_uid
       and board_size = p_board_size;

    -- ★ 新しい user_settings テーブルからボット対戦許可フラグを取得するにゃ
    select coalesce(allow_bot_match, true)
      into v_allow_bot_match
      from private.user_settings
     where uid = v_waiter.player_uid;

    -- 🤖🤖🤖 ボット戦分岐 🤖🤖🤖
    if v_waiter.try_count >= 3 and v_allow_bot_match then
      -- 対戦ボットとmatch_typeを取得する
      select o_bot_uid, o_match_type
      into v_bot_uid, v_match_type
      from private.get_bot_match_info(v_waiter_rating, p_board_size);

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

    -- 👦👦👦 人間戦分岐（match_typeは常に0＆白黒ランダム） 👦👦👦
    v_rating_diff := least(v_waiter.try_count::int * 300, 1000)::smallint; -- 1000は最大ポイント差。

    -- ★ user_stats と JOIN して相手のポイントを直接比較するように書き換えたにゃ
    select wl.* into v_opponent
    from private.waitlist wl
    join private.user_stats us on us.uid = wl.player_uid and us.board_size = p_board_size
    where wl.player_uid != v_waiter.player_uid
      and wl.board_size = p_board_size
      and abs(us.rating - v_waiter_rating) <= v_rating_diff
    order by abs(us.rating - v_waiter_rating) asc
    limit 1;

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
begin
  perform private.check_maintenance();
  
  -- 対局中かチェック
  select * into v_match
  from private.matches m
  where (m.black_uid = v_player_uid or m.white_uid = v_player_uid)
    and m.status = 'playing'
  limit 1;

  -- 既に対局が始まっていれば、その対局情報を返す
  if found then
    return private.build_match_json(v_match, v_player_uid);
  end if;

  -- どこにもいなければキャンセル処理（waitlistから削除）
  delete from private.waitlist wl
  where wl.player_uid = v_player_uid;

  return null;
end;
$$;


ALTER FUNCTION "public"."cancel_waitlist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  calling_uid uuid;
BEGIN
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


CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row private.profiles;
  v_status RECORD;
  v_username TEXT;
  v_retry_count INT := 0;

  -- ★ 新テーブルから取得する変数を用意した
  v_allow_bot_match BOOLEAN := true;
  -- 9
  v_rating_9 SMALLINT := 0;
  v_wins_9 SMALLINT := 0;
  v_losses_9 SMALLINT := 0;
  v_draws_9 SMALLINT := 0;
  -- 13
  v_rating_13 SMALLINT := 0;
  v_wins_13 SMALLINT := 0;
  v_losses_13 SMALLINT := 0;
  v_draws_13 SMALLINT := 0;
BEGIN
  -- 1. 🐱 アプリステータスを取得
  SELECT maintenance, message, version INTO v_status FROM private.app_status LIMIT 1;

  -- 2. 🐱 未認証なら即終了
  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'app_status', json_build_object(
        'maintenance', COALESCE(v_status.maintenance, false),
        'message', v_status.message,
        'version', v_status.version
      ),
      'profile', NULL
    );
  END IF;

  -- 3. 🐱 既存のプロフィールを取得＆最終ログイン更新
  UPDATE private.profiles
  SET lastseen = now()
  WHERE profiles.uid = v_uid
  RETURNING * INTO v_row;

  -- 4. 🐱 プロフィールが存在しない場合は、その場で自動生成（ゲスト初期化）！
  IF v_row.uid IS NULL THEN -- 「よし、プロフィールないね」
    LOOP
      v_retry_count := v_retry_count + 1;
      v_username := 'player_' || substr(md5(random()::text), 1, 5);

      BEGIN
        INSERT INTO private.profiles (uid, username) -- ▶️ここから（自動でトリガーが発動して user_settings / user_stats も作成される）
        VALUES (v_uid, v_username)
        ON CONFLICT (uid) DO NOTHING  -- 「あれ、プロフィールあるやんけ！ま、ええわ、何もせんとこ」
        RETURNING * INTO v_row; -- ▶️ここまでがひとセット。成功したら全部やるし、失敗したら全部やらない

        IF v_row.uid IS NOT NULL THEN
          EXIT; -- 一回目の方。v_rowに格納できたので4.のお仕事は終了
        END IF;

        -- 二回目の方。「さっきは何もせんかったけど、すでにあるやつをv_rowに入れとけばええわ」4.のお仕事は終了
        SELECT * INTO v_row FROM private.profiles WHERE profiles.uid = v_uid;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN -- 名前被った
          -- ここに来るのは純粋にusername側の重複の時だけ。次のusernameでリトライ
          NULL;
      END;

      EXIT WHEN v_retry_count >= 10;
    END LOOP;

    IF v_row.uid IS NULL THEN -- ほぼありえない。10回連続でミス
      RAISE EXCEPTION 'failed_to_generate_unique_username';
    END IF;
  END IF;

  -- ★ 5. 分離された設定（user_settings）を取得する
  SELECT COALESCE(allow_bot_match, true)
    INTO v_allow_bot_match
    FROM private.user_settings
   WHERE uid = v_uid;

  -- ★ 6. 分離された戦績（user_stats）を取得する（9路盤・13路盤）
  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_9, v_wins_9, v_losses_9, v_draws_9
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_13, v_wins_13, v_losses_13, v_draws_13
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 13;

  -- 7. 🐱 メンテ情報とプロフィール（新しく作った場合はそのデータ）をまとめて返す
  RETURN json_build_object(
    'app_status', json_build_object(
      'maintenance', COALESCE(v_status.maintenance, false),
      'message', v_status.message,
      'version', v_status.version
    ),
    'profile', json_build_object(
      'uid',             v_row.uid,
      'username',        v_row.username,
      'rating_9',        COALESCE(v_rating_9, 0),
      'rating_13',       COALESCE(v_rating_13, 0),
      'icon_index',      v_row.icon_index,
      'wins_9',         COALESCE(v_wins_9, 0),
      'losses_9',         COALESCE(v_losses_9, 0),
      'draws_9',         COALESCE(v_draws_9, 0),
      'wins_13',         COALESCE(v_wins_13, 0),
      'losses_13',         COALESCE(v_losses_13, 0),
      'draws_13',         COALESCE(v_draws_13, 0),
      'acquired_icons',  v_row.acquired_icons,
      'allow_bot_match', COALESCE(v_allow_bot_match, true)
    )
  );
END;
$$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_own_profile_preview"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_row private.profiles;
  v_uid uuid := auth.uid();
  v_rating_9 smallint := 0;
  v_rating_13 smallint := 0;
BEGIN
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

  -- ★ 新しい user_stats テーブルから 9路盤と 13路盤のポイントを取得する
  SELECT COALESCE(rating, 0) INTO v_rating_9
  FROM private.user_stats
  WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0) INTO v_rating_13
  FROM private.user_stats
  WHERE uid = v_uid AND board_size = 13;

  RETURN json_build_object(
    'username', v_row.username,
    'rating_9', COALESCE(v_rating_9, 0),
    'rating_13', COALESCE(v_rating_13, 0)
  );
END;
$$;


ALTER FUNCTION "public"."get_own_profile_preview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rankings"() RETURNS TABLE("username" "text", "rating" smallint, "icon_index" smallint, "board_size" integer, "is_authenticated" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
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
      AND us.board_size IN (9, 13)
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


CREATE OR REPLACE FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) RETURNS TABLE("id" integer, "created_at" "date", "result" "text", "match_type" smallint, "moves" smallint[], "dead_stones" smallint[], "black_rating" smallint, "white_rating" smallint, "board_size" smallint, "black_uid" "uuid", "black_username" "text", "black_icon_index" smallint, "black_rank_index" smallint, "white_uid" "uuid", "white_username" "text", "white_icon_index" smallint, "white_rank_index" smallint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_maintenance();
 
  RETURN QUERY
  SELECT
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
    AND r.id > p_after_id
  ORDER BY r.id ASC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer DEFAULT NULL::integer) RETURNS TABLE("id" integer, "created_at" "date", "result" "text", "match_type" smallint, "moves" smallint[], "dead_stones" smallint[], "black_rating" smallint, "white_rating" smallint, "board_size" smallint, "black_uid" "uuid", "black_username" "text", "black_icon_index" smallint, "black_rank_index" smallint, "white_uid" "uuid", "white_username" "text", "white_icon_index" smallint, "white_rank_index" smallint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM private.check_maintenance();
 
  RETURN QUERY
  SELECT
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


CREATE OR REPLACE FUNCTION "public"."join_waitlist"("p_board_size" smallint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_match      private.matches%rowtype;
  v_player_uid uuid := auth.uid();
begin
  perform private.check_maintenance();
  
  -- 対局中かチェック
  select * into v_match
  from private.matches m
  where (m.black_uid = v_player_uid or m.white_uid = v_player_uid)
    and m.status = 'playing'
  limit 1;

  -- 既に対局が始まっていれば、その対局情報を返す
  if found then
    return private.build_match_json(v_match, v_player_uid);
  end if;

  -- 待機列に追加（既に待機中なら何もしない）
  begin
    insert into private.waitlist (player_uid, board_size)
    values (v_player_uid, p_board_size);
  exception
    when unique_violation then null;
  end;

  return null;
end;
$$;


ALTER FUNCTION "public"."join_waitlist"("p_board_size" smallint) OWNER TO "postgres";


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
    icon_index = guest_profile.icon_index,
    acquired_icons = guest_profile.acquired_icons
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
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  -- ★ private.profiles ではなく private.user_settings を更新する
  UPDATE private.user_settings
  SET allow_bot_match = new_allow_bot_match
  WHERE uid = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_allow_bot_match"("new_allow_bot_match" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_icon_index"("new_icon_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  UPDATE private.profiles
  SET icon_index = new_icon_index
  WHERE profiles.uid = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_icon_index"("new_icon_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_seen"("p_match_id" integer) RETURNS TABLE("out_moves" smallint[], "out_turn" "text")
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
  return query
    select m.moves, m.turn
    from private.matches m
    where m.id = p_match_id;
end;
$$;


ALTER FUNCTION "public"."update_last_seen"("p_match_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_username"("new_username" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  current_user_id uuid;
begin
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
$_$;


ALTER FUNCTION "public"."update_username"("new_username" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."app_status" (
    "id" smallint NOT NULL,
    "maintenance" boolean DEFAULT false,
    "message" "text" DEFAULT ''::"text",
    "version" "text"
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
    "lastseen" "date",
    "is_bot" boolean DEFAULT false,
    "acquired_icons" smallint[] DEFAULT '{0}'::smallint[],
    CONSTRAINT "profiles_username_check" CHECK (("username" ~ '^[A-Za-z0-9_]{3,12}$'::"text"))
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
    "giantkill" smallint DEFAULT '0'::smallint,
    "wins" smallint DEFAULT '0'::smallint,
    "losses" smallint DEFAULT '0'::smallint,
    "draws" smallint DEFAULT '0'::smallint
);


ALTER TABLE "private"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."waitlist" (
    "player_uid" "uuid" NOT NULL,
    "try_count" smallint DEFAULT '0'::smallint,
    "board_size" smallint
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



REVOKE ALL ON FUNCTION "public"."delete_user_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_own_profile_preview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_own_profile_preview"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_rankings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rankings"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_records_newer"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_after_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_records_older"("p_uid" "uuid", "p_limit" smallint, "p_board_size" smallint, "p_before_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_waitlist"("p_board_size" smallint) TO "service_role";



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




