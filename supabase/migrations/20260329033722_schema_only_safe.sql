


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


CREATE SCHEMA IF NOT EXISTS "game";


ALTER SCHEMA "game" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "system";


ALTER SCHEMA "system" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "users";


ALTER SCHEMA "users" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."add_move"("p_match_id" integer, "p_move" smallint, "p_color" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_match game.playing%rowtype;
  v_bot_uid uuid;
  v_is_bot boolean;
  v_bot_color text;
  v_bot_points smallint;
  v_engine text;
  v_fly_url text;
  v_fly_secret text;
  v_is_second_pass boolean;
begin
  -- マッチ取得
  select * into v_match
  from game.playing
  where id = p_match_id;
 
  if not found then
    raise exception 'マッチが見つかりません';
  end if;
 
  -- 手番チェック
  if v_match.turn != p_color then
    raise exception '手番ではありません';
  end if;
 
  -- 本人チェック
  if p_color = 'black' then
    if v_match.black_uid != auth.uid() then
      raise exception '不正なアクセス';
    end if;
  else
    if v_match.white_uid != auth.uid() then
      raise exception '不正なアクセス';
    end if;
  end if;
 
  -- 2連続パスチェック
  v_is_second_pass := (
    p_move = -1 and
    array_length(v_match.moves, 1) > 0 and
    v_match.moves[array_length(v_match.moves, 1)] = -1
  );
 
  -- movesを更新（turn / turn_switched_at / secondsはトリガーに委譲）
  update game.playing set
    moves            = array_append(coalesce(moves, '{}'), p_move),
    black_last_seen  = case when p_color = 'black' then now() else black_last_seen end,
    white_last_seen  = case when p_color = 'white' then now() else white_last_seen end
  where id = p_match_id;
 
  -- Vaultから取得
  select decrypted_secret into v_fly_url
  from vault.decrypted_secrets where name = 'supabase_to_fly_url';
 
  select decrypted_secret into v_fly_secret
  from vault.decrypted_secrets where name = 'supabase_to_fly_secret';
 
  -- 2連続パス → flyの/scoreを呼ぶ
  if v_is_second_pass then
    perform net.http_post(
      url := v_fly_url || '/score',
      body := jsonb_build_object(
        'match_id', p_match_id,
        'moves', array_append(coalesce(v_match.moves, '{}'), p_move),
        'match_type', v_match.match_type
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_fly_secret
      )
    );
    return;
  end if;
 
  -- 相手がbotかチェック
  v_bot_color := case when p_color = 'black' then 'white' else 'black' end;
  v_bot_uid := case
    when v_bot_color = 'white' then v_match.white_uid
    else v_match.black_uid
  end;
  v_bot_points := case
    when v_bot_color = 'white' then v_match.white_points
    else v_match.black_points
  end;
 
  select is_bot into v_is_bot
  from users.profiles
  where uid = v_bot_uid;
 
  -- 相手が人間なら終了
  if not v_is_bot then
    return;
  end if;
 
  -- engineをpointsで選択
  v_engine := case
    when v_bot_points = 420 then 'gnugo' -- うどん
    when v_bot_points = 560 then 'pachi' -- おせんべい
    when v_bot_points = 720 then 'katago-b6c96' -- せな
    when v_bot_points = 900 then 'leela' -- るな
    else 'katago-b10c128' -- うさぎ先生
  end;
 
  -- flyにリクエスト
  perform net.http_post(
    url := v_fly_url || '/play/' || v_engine,
    body := jsonb_build_object(
      'match_id', p_match_id,
      'moves', array_append(coalesce(v_match.moves, '{}'), p_move),
      'color', v_bot_color,
      'match_type', v_match.match_type
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_fly_secret
    )
  );
end;
$$;


ALTER FUNCTION "game"."add_move"("p_match_id" integer, "p_move" smallint, "p_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."archive_playing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_base_delta smallint := 0; -- 基準となるdelta
  v_black_delta smallint := 0; -- ⚫️が上がるもしくは下がるpoint数
  v_white_delta smallint := 0; -- ⚪️が上がるもしくは下がるpoint数
  v_diff smallint; -- 二人のpoint差
  v_black_games int; -- ⚫️の対局数
  v_white_games int; -- ⚪️の対局数
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
  v_black_points smallint; -- ⚫️のpoints
  v_white_points smallint; -- ⚪️のpoints
  v_black_giantkill int; -- ⚫️の格上連勝数
  v_white_giantkill int; -- ⚪️の格上連勝数
  v_black_new_points smallint; -- ⚫️の新しいpoints
  v_white_new_points smallint; -- ⚪️の新しいpoints
  v_black_old_gumi smallint; -- ⚫️の元々のgumi
  v_white_old_gumi smallint; -- ⚪️の元々のgumi
  v_black_new_gumi smallint; -- ⚫️の新しいgumi
  v_white_new_gumi smallint; -- ⚪️の新しいgumi
  v_black_new_icons smallint[]; -- ⚫️の新しく獲得したiconたち
  v_white_new_icons smallint[]; -- ⚪️の新しく獲得したiconたち
begin
  -- まず、プロフィールから情報を取ってきて、変数に格納しておく
  select
    games, points, giantkill_stroke, is_bot
  into
    v_black_games, v_black_points, v_black_giantkill, v_is_black_bot
  from users.profiles
  where uid = new.black_uid;

  select
    games, points, giantkill_stroke, is_bot
  into
    v_white_games, v_white_points, v_white_giantkill, v_is_white_bot
  from users.profiles
  where uid = new.white_uid;

  -- ─── ポイント計算 ────────────────────────────────
  -- ------------------
  -- ⚫️が勝った🎉
  -- ------------------
  if new.result like 'B+%' then  

  -- 勝った⚫️側の処理
  v_diff := new.white_points - new.black_points; -- 二人のpointsの差
  v_base_delta := greatest(1, least(19,
    10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
  )); -- それぞれ増減するpoint
  v_black_delta := v_base_delta;
  if v_diff > 0 then -- 格上の⚪️に勝った!相手がボットでも関係ない
    v_black_giantkill := v_black_giantkill + 1; -- 格上連勝++
    v_black_delta := v_base_delta * v_black_giantkill; -- 格上連勝ボーナス
  elsif v_is_white_bot then -- ⚪️がボットだった場合
    v_black_delta := v_base_delta / 2; -- 獲得pointは半分
    if new.black_points < 420 then -- ボットとのハンデ戦では勝っても+5
      v_black_delta := 5;
    end if;
  end if;

  -- 負けた⚪️側の処理
  v_white_giantkill := 0; -- まず連勝はこれでストップ
  if v_black_games <= 20 then -- 相手の⚫️が対局数の少ない強い人だったら
    v_white_delta := 0; -- 減るpointは0
  else
    v_white_delta := -v_base_delta; -- そうでなければ、普通に減らされる
    if v_is_black_bot then -- ⚫️がボットだった場合は減るpointは半分 -- なお、ハンデ戦で⚫️のボットと当たることはない
      v_white_delta := v_white_delta / 2;
    end if;
  end if;
  
  -- ------------------
  -- ⚪️が勝った🎉
  -- ------------------
  elsif new.result like 'W+%' then

    -- 勝った⚪️側の処理
    v_diff := new.black_points - new.white_points; -- 二人のpointの差
    -- それぞれ増減するpoint
    v_base_delta := greatest(1, least(19,
      10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
    ));
    v_white_delta := v_base_delta;
    if v_diff > 0 then -- 格上の⚫️に勝った!相手がボットでも関係ない
      v_white_giantkill := v_white_giantkill + 1; -- 格上連勝++
      v_white_delta := v_base_delta * v_white_giantkill; -- 格上連勝ボーナス
    elsif v_is_black_bot then -- ⚫️がボットだった場合は獲得pointは半分 -- なお、ハンデ戦で⚫️のボットと当たることはない
      v_white_delta := v_base_delta / 2;
    end if;

    -- 負けた⚫️側の処理
    v_black_giantkill := 0; -- まず連勝はこれでストップ
    if v_white_games <= 20 then -- 相手の⚪️が対局数の少ない強い人だったら
      v_black_delta := 0; -- 減るpointは0
    else -- そうでなければ、普通に減らされる
      v_black_delta := -v_base_delta;
      if v_is_white_bot then -- ⚪️がボットだった場合は減るpointは半分
        v_black_delta := v_black_delta / 2;
        if new.black_points < 420 then -- 420以下のボットハンデ戦の場合は負けても-5
          v_black_delta := -5;
        end if;
      end if;
    end if;
  end if;

  -- ─── 更新後のpoints/gumiを事前計算 ──────────────
  -- 自分のポイントが0を下回ることはない
  -- 更新後のpointsを一旦取得
  v_black_new_points := greatest(0, v_black_points + v_black_delta);
  v_white_new_points := greatest(0, v_white_points + v_white_delta);

  -- 更新前のgumi
  v_black_old_gumi := users.points_to_gumi(v_black_points);
  v_white_old_gumi := users.points_to_gumi(v_white_points);
  -- 更新後のgumi
  v_black_new_gumi := users.points_to_gumi(v_black_new_points);
  v_white_new_gumi := users.points_to_gumi(v_white_new_points);

  -- もしgumiが上がれば、pointsは中央に移動!
  -- ほし☆☆☆(gumi=17)に到達した場合は適用なし
  if (v_black_new_gumi > v_black_old_gumi) AND (v_black_new_gumi <> 17) then
    v_black_new_points := users.gumi_to_center_points(v_black_new_gumi);
  end if;

  if (v_white_new_gumi > v_white_old_gumi) AND (v_white_new_gumi <> 17) then
    v_white_new_points := users.gumi_to_center_points(v_white_new_gumi);
  end if;

  -- もしgumiが下がった場合
  -- 色組(gumi=0~5)に下がる場合は適用なし
  if (v_black_new_gumi < v_black_old_gumi) AND (v_black_new_gumi NOT IN (0,1,2,3,4,5)) then
    v_black_new_points := users.gumi_to_center_points(v_black_new_gumi);
  end if;

  if (v_white_new_gumi < v_white_old_gumi) AND (v_white_new_gumi NOT IN (0,1,2,3,4,5)) then
    v_white_new_points := users.gumi_to_center_points(v_white_new_gumi);
  end if;


  -- ─── profiles更新 ────────────────────────────────
  -- ⚫️のprofileを更新
  update users.profiles set
    games = games + 1, -- 対局数+1
    daily_play_count = daily_play_count + 
  case when plan_id = 0 then 1 else 0 end, -- 無料会員には対局制限+1
    points = v_black_new_points, -- point更新
    giantkill_stroke = v_black_giantkill, -- 格上連勝数の更新
    gumi_index = v_black_new_gumi -- gumi更新
  where uid = new.black_uid
    and is_bot = false; -- botではない

  -- ⚪️のprofileを更新
  update users.profiles set
    games = games + 1, -- 対局数+1
    daily_play_count = daily_play_count + 
  case when plan_id = 0 then 1 else 0 end, -- 無料会員には対局制限+1
    points = v_white_new_points, -- point更新
    giantkill_stroke = v_white_giantkill, -- 格上連勝数の更新
    gumi_index = v_white_new_gumi -- gumi更新
  where uid = new.white_uid
    and is_bot = false; -- botではない

  -- botのgames更新
  update users.profiles set
    games = games + 1
  where uid in (new.black_uid, new.white_uid)
    and is_bot = true;

  -- ─── game.recordsにinsert ─────────────────────────
  insert into game.records (
    id, 
    black_uid, white_uid,
    moves, dead_stones, 
    result,
    black_points, white_points,
    match_type, board_size,
    created_at
  ) values (
    new.id, 
    new.black_uid, new.white_uid,
    new.moves, new.dead_stones, 
    new.result,
    new.black_points, new.white_points,
    new.match_type, new.board_size,
    now()
  ) on conflict (id) do nothing; -- idが被ってたらrecordsへの移動は無し

  -- ─── 獲得アイコンリストの更新 ──────────────────────────
  if not v_is_black_bot then  -- botではない場合、黒が新しくアイコンをゲットしたか調べる
  v_black_new_icons := users.add_icons(new.black_uid, v_black_new_gumi, v_black_games+1);
  end if;
  if not v_is_white_bot then  -- botではない場合、白が新しくアイコンをゲットしたか調べる
  v_white_new_icons := users.add_icons(new.white_uid, v_white_new_gumi, v_white_games+1);
  end if;

  -- ─── broadcastで終局通知 ──────────────────────────
  perform realtime.send(
    jsonb_build_object(
      'result',           new.result,
      'dead_stones',      new.dead_stones
    ),
    'finished', -- イベント名
    'game:' || new.id::text, -- チャンネル名
    false
  );

  perform realtime.send(
    jsonb_build_object(
      'delta',      v_black_delta,
      'new_points',     v_black_new_points,
      'new_gumi_index', v_black_new_gumi,
      'new_acquired_icons', v_black_new_icons
    ),
    'finished', -- イベント名
    'user:' || new.black_uid::text, -- チャンネル名
    false
  );

  perform realtime.send(
    jsonb_build_object(
      'delta',      v_white_delta,
      'new_points',     v_white_new_points,
      'new_gumi_index', v_white_new_gumi,
      'new_acquired_icons', v_white_new_icons
    ),
    'finished', -- イベント名
    'user:' || new.white_uid::text, -- チャンネル名
    false
  );

  -- ─── game.playingからdelete ───────────────────────
  delete from game.playing where id = new.id;

  return null;
end;
$$;


ALTER FUNCTION "game"."archive_playing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."cancel_waiting"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_player_uid uuid := auth.uid();
  v_match      game.playing%rowtype;
  v_is_black   boolean;
begin
  -- ① まず playing を確認
  select *
  into v_match
  from game.playing
  where (black_uid = v_player_uid or white_uid = v_player_uid)
    and status = 'playing'
  limit 1;

  if found then
    -- playing にいたら、すでに対局は始まっているので対局情報を返す
    v_is_black := v_match.black_uid = v_player_uid;

    return jsonb_build_object(
      'match_id',        v_match.id,
      'match_type',      v_match.match_type,
      'moves',           coalesce(to_jsonb(v_match.moves), '[]'::jsonb),
      'my_color',        case when v_is_black then 'black' else 'white' end,
      'opp_displayname', case when v_is_black then v_match.white_displayname else v_match.black_displayname end,
      'opp_gumi_index',  CASE WHEN v_is_black THEN users.points_to_gumi(v_match.white_points)  ELSE users.points_to_gumi(v_match.black_points)  END,
      'opp_icon_index',  case when v_is_black then v_match.white_icon_index  else v_match.black_icon_index  end,
      'my_seconds',      case when v_is_black then v_match.black_seconds     else v_match.white_seconds     end,
      'opp_seconds',     case when v_is_black then v_match.white_seconds     else v_match.black_seconds     end
    );
  end if;

  -- ② playing にいない場合、waiting を削除する
  delete from game.waiting
  where player_uid = v_player_uid;

  -- ③ playing にも waiting にもいなくても、とりあえず正常終了
  return null;

end;
$$;


ALTER FUNCTION "game"."cancel_waiting"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."check_can_play"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_profile record;
  v_app_status record;
begin

  -- パターン1. メンテナンス中だった
  select maintenance, message
  into v_app_status
  from system.get_app_status();
  if v_app_status.maintenance then
    return jsonb_build_object(
      'can_play', false,
      'reason', 'maintenance',
      'message', v_app_status.message
    );
  end if;

  -- パターン2. 対局数上限に達してた
  select plan_id, daily_play_count
  into v_profile
  from users.profiles
  where uid = auth.uid();
  if v_profile.plan_id = 0 and v_profile.daily_play_count >= 10 then
    return jsonb_build_object('can_play', false, 'reason', 'daily_limit');
  end if;

  -- パターン3. 遊べる！
  return jsonb_build_object('can_play', true);
end;
$$;


ALTER FUNCTION "game"."check_can_play"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."get_records_with_profiles"("p_uid" "uuid", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" integer, "created_at" "date", "result" "text", "match_type" smallint, "moves" integer[], "dead_stones" integer[], "black_points" smallint, "white_points" smallint, "black_uid" "uuid", "black_username" "text", "black_displayname" "text", "black_icon_index" smallint, "black_gumi_index" smallint, "white_uid" "uuid", "white_username" "text", "white_displayname" "text", "white_icon_index" smallint, "white_gumi_index" smallint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'game', 'users'
    AS $$
  SELECT
    r.id,
    r.created_at,
    r.result,
    r.match_type,
    r.moves,
    r.dead_stones,
    r.black_points,
    r.white_points,
    r.black_uid,
    bp.username,
    bp.displayname,
    bp.icon_index,
    users.points_to_gumi(r.black_points),
    r.white_uid,
    wp.username,
    wp.displayname,
    wp.icon_index,
    users.points_to_gumi(r.white_points)
  FROM game.records r
  LEFT JOIN users.profiles bp ON bp.uid = r.black_uid
  LEFT JOIN users.profiles wp ON wp.uid = r.white_uid
  WHERE r.black_uid = p_uid OR r.white_uid = p_uid
  ORDER BY r.id DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


ALTER FUNCTION "game"."get_records_with_profiles"("p_uid" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."get_watch_match"("p_match_id" integer) RETURNS TABLE("id" integer, "status" "text", "moves" smallint[], "result" "text", "turn" "text", "black_seconds" smallint, "white_seconds" smallint, "black_points" smallint, "white_points" smallint, "dead_stones" smallint[], "black_icon_index" smallint, "white_icon_index" smallint, "match_type" smallint, "black_displayname" "text", "white_displayname" "text", "black_gumi_index" smallint, "white_gumi_index" smallint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    id,
    status,
    moves,
    result,
    turn,
    black_seconds,
    white_seconds,
    black_points,
    white_points,
    dead_stones,
    black_icon_index,
    white_icon_index,
    match_type,
    black_displayname,
    white_displayname,
    users.points_to_gumi(black_points) as black_gumi_index,
    users.points_to_gumi(white_points) as white_gumi_index
  from game.playing
  where id = p_match_id;
$$;


ALTER FUNCTION "game"."get_watch_match"("p_match_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."get_watch_match_id_at"("p_index" integer) RETURNS TABLE("actual_index" integer, "id" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with ranked as (
    select
      id,
      (row_number() over (
        order by (coalesce(black_points,0) + coalesce(white_points,0)) desc
      ) - 1)::int as idx,
      count(*) over () as total
    from game.playing
    where status = 'playing'
  )
  select
    least(p_index, greatest(0, total - 1))::int as actual_index,
    id
  from ranked
  where idx = least(p_index, greatest(0, total - 1))
  limit 1;
$$;


ALTER FUNCTION "game"."get_watch_match_id_at"("p_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."get_watch_match_ids"("p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select id
  from game.playing
  where status = 'playing'
  order by (coalesce(black_points, 0) + coalesce(white_points, 0)) desc
  limit p_limit offset p_offset;
$$;


ALTER FUNCTION "game"."get_watch_match_ids"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."join_waiting"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_match game.playing%rowtype;
  v_player_uid uuid := auth.uid();
  v_is_black boolean;
begin
  -- 既に対局中かチェック
  select * into v_match
  from game.playing
  where (black_uid = v_player_uid or white_uid = v_player_uid)
    and status = 'playing'
  limit 1;

  if found then
    v_is_black := v_match.black_uid = v_player_uid;

    -- 復帰通知：movesごと全データを送る
    perform realtime.send(
      jsonb_build_object(
        'match_id',        v_match.id,
        'match_type',      v_match.match_type,
        'moves',           coalesce(to_jsonb(v_match.moves), '[]'::jsonb),
        'my_color',        case when v_is_black then 'black' else 'white' end,
        'opp_displayname', CASE WHEN v_is_black THEN v_match.white_displayname ELSE v_match.black_displayname END,
        'opp_gumi_index',  CASE WHEN v_is_black THEN users.points_to_gumi(v_match.white_points)  ELSE users.points_to_gumi(v_match.black_points)  END,
        'opp_icon_index',  CASE WHEN v_is_black THEN v_match.white_icon_index  ELSE v_match.black_icon_index  END,
        'my_seconds',      CASE WHEN v_is_black THEN v_match.black_seconds     ELSE v_match.white_seconds     END,
        'opp_seconds',     CASE WHEN v_is_black THEN v_match.white_seconds     ELSE v_match.black_seconds     END
      ),
      'matched',
      'user:' || v_player_uid::text,
      false
    );
    -- waitingに入れない
    return;
  end if;

  -- 通常のwaiting登録
  insert into game.waiting (player_uid, points)
  select v_player_uid, points
  from users.profiles
  where uid = v_player_uid
  on conflict (player_uid) do nothing;
end;
$$;


ALTER FUNCTION "game"."join_waiting"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."notify_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_black_payload jsonb;
  v_white_payload jsonb;
begin
  v_black_payload := jsonb_build_object(
    'match_id',        new.id,
    'match_type',      new.match_type,
    'moves',           coalesce(to_jsonb(new.moves), '[]'::jsonb),
    'my_color',        'black',
    'opp_displayname', new.white_displayname,
    'opp_gumi_index',  users.points_to_gumi(new.white_points),
    'opp_icon_index',  new.white_icon_index,
    'my_seconds',      new.black_seconds,
    'opp_seconds',     new.white_seconds
  );

  v_white_payload := jsonb_build_object(
    'match_id',        new.id,
    'match_type',      new.match_type,
    'moves',           coalesce(to_jsonb(new.moves), '[]'::jsonb),
    'my_color',        'white',
    'opp_displayname', new.black_displayname,
    'opp_gumi_index',  users.points_to_gumi(new.black_points),
    'opp_icon_index',  new.black_icon_index,
    'my_seconds',      new.white_seconds,
    'opp_seconds',     new.black_seconds
  );

  perform realtime.send(v_black_payload, 'matched', 'user:' || new.black_uid::text, false);
  perform realtime.send(v_white_payload, 'matched', 'user:' || new.white_uid::text, false);

  return new;
end;
$$;


ALTER FUNCTION "game"."notify_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."on_move_added"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_updated game.playing%rowtype;
begin
  update game.playing set
    turn             = case when OLD.turn = 'black' then 'white' else 'black' end,
    turn_switched_at = now(),
    black_seconds    = case
      when OLD.turn = 'black'
      then OLD.black_seconds - extract(epoch from (now() - OLD.turn_switched_at))::int + 1
      else OLD.black_seconds
    end,
    white_seconds    = case
      when OLD.turn = 'white'
      then OLD.white_seconds - extract(epoch from (now() - OLD.turn_switched_at))::int + 1
      else OLD.white_seconds
    end
  where id = NEW.id
  returning * into v_updated;

  perform realtime.send(
    jsonb_build_object(
      'move',          NEW.moves[array_length(NEW.moves, 1)],
      'move_count',    array_length(NEW.moves, 1),
      'turn',          v_updated.turn,
      'black_seconds', v_updated.black_seconds,
      'white_seconds', v_updated.white_seconds
    ),
    'move', -- イベント名
    'game:' || NEW.id::text, -- チャンネル名
    false
  );

  return null;
end;
$$;


ALTER FUNCTION "game"."on_move_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."resign"("p_match_id" integer, "p_color" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- 本人チェック
  if p_color = 'black' then
    if (select black_uid from game.playing where id = p_match_id) != auth.uid() then
      raise exception '不正なアクセス';
    end if;
  else
    if (select white_uid from game.playing where id = p_match_id) != auth.uid() then
      raise exception '不正なアクセス';
    end if;
  end if;

  update game.playing set
    result = case when p_color = 'black' then 'W+R' else 'B+R' end,
    status = 'finished'
  where id = p_match_id
    and status = 'playing';
end;
$$;


ALTER FUNCTION "game"."resign"("p_match_id" integer, "p_color" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."server_callback"("p_match_id" integer DEFAULT NULL::integer, "p_move" smallint DEFAULT NULL::smallint, "p_dead_stones" smallint[] DEFAULT NULL::smallint[], "p_result" "text" DEFAULT NULL::"text", "p_analysis_id" integer DEFAULT NULL::integer, "p_analysis_result" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- ボットの着手（turn / turn_switched_at / secondsはトリガーに委譲）
  if p_match_id is not null and p_move is not null and p_result is null then
    update game.playing set
      moves = array_append(coalesce(moves, '{}'), p_move)
    where id = p_match_id;
    return;
  end if;
 
  -- 対局終了
  if p_match_id is not null and p_result is not null then
    update game.playing set
      moves       = case when p_move is not null then array_append(coalesce(moves, '{}'), p_move) else moves end,
      dead_stones = p_dead_stones,
      result      = p_result,
      status      = 'finished'
    where id = p_match_id;
    return;
  end if;
 
  -- 詰碁解析結果
  if p_analysis_id is not null then
    update server.queue set
      result = p_analysis_result::text,
      status = 'done'
    where id = p_analysis_id;
    return;
  end if;
end;
$$;


ALTER FUNCTION "game"."server_callback"("p_match_id" integer, "p_move" smallint, "p_dead_stones" smallint[], "p_result" "text", "p_analysis_id" integer, "p_analysis_result" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."time_connection_check"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  rec record; -- playing内にあるmatchが一つずつ入る。
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
begin
  -- playing内にあるmatchを一つずつ見ていく
  for rec in
    select *
    from game.playing
    where status = 'playing'
  loop

    -- ------------------------------
    -- bot判定
    -- ------------------------------
    select is_bot into v_is_black_bot -- ⚫️がbotかどうか
    from users.profiles
    where uid = rec.black_uid;

    select is_bot into v_is_white_bot -- ⚪️がbotかどうか
    from users.profiles
    where uid = rec.white_uid;

    -- ------------------------------
    -- 時間切れ判定
    -- ------------------------------
    if (not v_is_black_bot) and -- ⚫️がボットではなく、
      rec.turn = 'black' and -- ⚫️の番で、
      rec.black_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚫️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update game.playing
      set status = 'finished',
          result = 'W+T'
      where id = rec.id;

    elsif (not v_is_white_bot) and -- ⚪️がボットではなく、
      rec.turn = 'white' and -- ⚪️の番で、
      rec.white_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚪️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update game.playing
      set status = 'finished',
          result = 'B+T'
      where id = rec.id;

    -- ------------------------------
    -- 接続切れ判定
    -- ------------------------------
    elsif (not v_is_black_bot) -- ⚫️がボットではなく、
       and rec.black_last_seen is not null
       and extract(epoch from (now() - rec.black_last_seen)) > 30 then -- ⚫️の最後のハートビートから30秒以上経っているなら
      update game.playing
      set status = 'finished',
          result = 'W+C'
      where id = rec.id;

    elsif (not v_is_white_bot) -- ⚪️がボットではなく、
       and rec.white_last_seen is not null
       and extract(epoch from (now() - rec.white_last_seen)) > 30 then -- ⚪️の最後のハートビートから30秒以上経っているなら
      update game.playing
      set status = 'finished',
          result = 'B+C'
      where id = rec.id;

    end if;
  end loop;
end;
$$;


ALTER FUNCTION "game"."time_connection_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."try_match_all"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_waiter         record;
  v_opponent       record;
  v_bot            record;
  v_waiter_profile record;
  v_points_diff    int;
  v_match_id       int;
  v_match_type     smallint;
  v_human_is_black boolean;
  v_moves          int[];
begin
  for v_waiter in
    select * from game.waiting order by try_count asc
  loop
    if not exists (select 1 from game.waiting where player_uid = v_waiter.player_uid) then
      continue;
    end if;

    select * into v_waiter_profile from users.profiles where uid = v_waiter.player_uid;

    -- 🐾 bot戦
    if v_waiter.try_count >= 10 then
      select * into v_bot
      from users.profiles
      where is_bot = true
      order by abs(points - v_waiter.points) asc
      limit 1;

      v_match_type :=
        case
          when v_waiter.points < 60  then 5
          when v_waiter.points < 120 then 4
          when v_waiter.points < 200 then 3
          when v_waiter.points < 300 then 2
          when v_waiter.points < 420 then 1
          else 0
        end;

      v_human_is_black := v_waiter.points < 420 or random() < 0.5;

      v_moves :=
        case
          when v_match_type = 5 then array[(array[22,38,42,58])[floor(random()*4+1)]]
          when v_match_type = 4 then array[(array[22,38,42,58])[floor(random()*4+1)]]
          when v_match_type = 3 then array[(array[60,59,51,50])[floor(random()*4+1)]]
          when v_match_type = 2 then array[(array[60,59,51,50,20,21,29,30])[floor(random()*8+1)]]
          when not v_human_is_black then array[(array[20,21,22,23,24,29,30,31,32,33,38,39,40,41,42,47,48,49,50,51,56,57,58,59,60])[floor(random()*25+1)]]
          else '{}'::int[]
        end;

      insert into game.playing (
        black_uid, white_uid, status, match_type,
        black_displayname, white_displayname,
        black_icon_index, white_icon_index,
        black_points, white_points,
        moves, turn, turn_switched_at
      ) values (
        case when v_human_is_black then v_waiter.player_uid else v_bot.uid end,
        case when v_human_is_black then v_bot.uid else v_waiter.player_uid end,
        'playing', v_match_type,
        case when v_human_is_black then v_waiter_profile.displayname else v_bot.displayname end,
        case when v_human_is_black then v_bot.displayname else v_waiter_profile.displayname end,
        case when v_human_is_black then v_waiter_profile.icon_index else v_bot.icon_index end,
        case when v_human_is_black then v_bot.icon_index else v_waiter_profile.icon_index end,
        case when v_human_is_black then v_waiter_profile.points else v_bot.points end,
        case when v_human_is_black then v_bot.points else v_waiter_profile.points end,
        v_moves,
        case when v_human_is_black then 'black' else 'white' end,
        now()
      )
      returning id into v_match_id;

      delete from game.waiting where player_uid = v_waiter.player_uid;
      continue;
    end if;

    -- 🐾 人間戦
    v_points_diff := v_waiter.try_count * 100;

    select * into v_opponent
    from game.waiting
    where player_uid != v_waiter.player_uid
      and abs(points - v_waiter.points) <= v_points_diff
    order by try_count asc
    limit 1;

    if found then
      declare v_opponent_profile record;
      begin
        select * into v_opponent_profile from users.profiles where uid = v_opponent.player_uid;

        insert into game.playing (
          black_uid, white_uid, status, match_type,
          black_displayname, white_displayname,
          black_icon_index, white_icon_index,
          black_points, white_points, turn_switched_at
        ) values (
          v_waiter.player_uid, v_opponent.player_uid,
          'playing', 0,
          v_waiter_profile.displayname, v_opponent_profile.displayname,
          v_waiter_profile.icon_index, v_opponent_profile.icon_index,
          v_waiter_profile.points, v_opponent_profile.points, now()
        )
        returning id into v_match_id;

        delete from game.waiting
        where player_uid in (v_waiter.player_uid, v_opponent.player_uid);
      end;
    else
      update game.waiting
      set try_count = try_count + 1
      where player_uid = v_waiter.player_uid;
    end if;

  end loop;
end;
$$;


ALTER FUNCTION "game"."try_match_all"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "game"."update_last_seen"("p_color" "text", "p_match_id" integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  update game.playing
  set
    black_last_seen = case when p_color = 'black' then now() else black_last_seen end,
    white_last_seen = case when p_color = 'white' then now() else white_last_seen end
  where id = p_match_id;
$$;


ALTER FUNCTION "game"."update_last_seen"("p_color" "text", "p_match_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_cron_logs"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  TRUNCATE cron.job_run_details;
$$;


ALTER FUNCTION "public"."cleanup_cron_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  calling_uid uuid;
BEGIN
  -- 呼び出し元のUIDを取得（認証済みユーザーのみ実行可能）
  calling_uid := auth.uid();

  IF calling_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- profiles削除（RLSがあっても SECURITY DEFINERなので通る）
  DELETE FROM users.profiles WHERE uid = calling_uid;

  -- auth.usersを削除
  DELETE FROM auth.users WHERE id = calling_uid;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hello_test"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
begin
  return 'Hello from RPC test!';
end;
$$;


ALTER FUNCTION "public"."hello_test"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_profile"("p_username" "text", "p_displayname" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM users.profiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'username_taken: %', p_username;
  END IF;

  INSERT INTO users.profiles (uid, username, displayname)
  VALUES (v_uid, p_username, p_displayname);
END;
$$;


ALTER FUNCTION "public"."register_profile"("p_username" "text", "p_displayname" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_daily_play_count"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update users.profiles
  set daily_play_count = 0;
$$;


ALTER FUNCTION "public"."reset_daily_play_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_username"("p_username" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  candidate TEXT;
  counter   INT := 1;
  exists    BOOLEAN;
BEGIN
  -- まずそのままのusernameを試す
  candidate := p_username;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM users.profiles WHERE username = candidate
    ) INTO exists;

    IF NOT exists THEN
      RETURN candidate;  -- 空きが見つかった
    END IF;

    -- 被っていたら連番を増やす
    counter   := counter + 1;
    candidate := p_username || counter::TEXT;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."resolve_username"("p_username" "text") OWNER TO "postgres";


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
    WHERE command_tag IN ('CREATE TABLE IF NOT EXISTS', 'CREATE TABLE IF NOT EXISTS AS', 'SELECT INTO')
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


CREATE OR REPLACE FUNCTION "public"."server_callback"("match_id" "uuid" DEFAULT NULL::"uuid", "analysis_id" "uuid" DEFAULT NULL::"uuid", "move" smallint DEFAULT NULL::smallint, "dead_stones" "text"[] DEFAULT NULL::"text"[], "result" "text" DEFAULT NULL::"text", "analysis_result" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin

  -- /playからの呼び出し（通常の手）
  if match_id is not null and move is not null and result is null then
    update matches set
      moves = array_append(moves, move), 
      turn = case when turn = 'black' then 'white' else 'black' end,
      turn_switched_at = now()
    where id = match_id;
  end if;

  -- /playまたは/scoreからの呼び出し（地計算あり）
  if match_id is not null and result is not null then
    update matches set
      moves = case when move is not null 
              then array_append(moves, move)  
              else moves end,
      dead_stones = server_callback.dead_stones::smallint[],
      result = server_callback.result,
      status = 'finished'
    where id = match_id;
  end if;

  -- /analyzeからの呼び出し
  if analysis_id is not null then
    update analyses set
      result = analysis_result,
      status = 'done'
    where id = analysis_id;
  end if;

end;
$$;


ALTER FUNCTION "public"."server_callback"("match_id" "uuid", "analysis_id" "uuid", "move" smallint, "dead_stones" "text"[], "result" "text", "analysis_result" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."time_connection_check"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  rec record; -- playing内にあるmatchが一つずつ入る。
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
begin
  -- playing内にあるmatchを一つずつ見ていく
  for rec in
    select *
    from game.playing
    where status = 'playing'
  loop

    -- ------------------------------
    -- bot判定
    -- ------------------------------
    select is_bot into v_is_black_bot -- ⚫️がbotかどうか
    from users.profiles
    where uid = rec.black_uid;

    select is_bot into v_is_white_bot -- ⚪️がbotかどうか
    from users.profiles
    where uid = rec.white_uid;

    -- ------------------------------
    -- 時間切れ判定
    -- ------------------------------
    if (not v_is_black_bot) and -- ⚫️がボットではなく、
      rec.turn = 'black' and -- ⚫️の番で、
      rec.black_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚫️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update game.playing
      set status = 'finished',
          result = 'W+T'
      where id = rec.id;

    elsif (not v_is_white_bot) and -- ⚪️がボットではなく、
      rec.turn = 'white' and -- ⚪️の番で、
      rec.white_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚪️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update game.playing
      set status = 'finished',
          result = 'B+T'
      where id = rec.id;

    -- ------------------------------
    -- 接続切れ判定
    -- ------------------------------
    elsif (not v_is_black_bot) -- ⚫️がボットではなく、
       and rec.black_last_seen is not null
       and extract(epoch from (now() - rec.black_last_seen)) > 30 then -- ⚫️の最後のハートビートから30秒以上経っているなら
      update game.playing
      set status = 'finished',
          result = 'W+C'
      where id = rec.id;

    elsif (not v_is_white_bot) -- ⚪️がボットではなく、
       and rec.white_last_seen is not null
       and extract(epoch from (now() - rec.white_last_seen)) > 30 then -- ⚪️の最後のハートビートから30秒以上経っているなら
      update game.playing
      set status = 'finished',
          result = 'B+C'
      where id = rec.id;

    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."time_connection_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_icon_index"("new_icon_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update users.profiles -- profilesをupdateする
  set icon_index = new_icon_index -- iconのindexを更新
  where uid = auth.uid(); 
end;
$$;


ALTER FUNCTION "public"."update_icon_index"("new_icon_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "system"."get_app_status"() RETURNS TABLE("maintenance" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'system'
    AS $$
begin
  return query
  select
    a.maintenance,
    a.message
  from system.app_status a
  limit 1;
end;
$$;


ALTER FUNCTION "system"."get_app_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."add_icons"("p_uid" "uuid", "p_new_gumi" smallint, "p_games" integer) RETURNS smallint[]
    LANGUAGE "plpgsql"
    AS $$
declare
  v_added int2[] := '{}';
  v_current int2[];
begin
  -- 現在のicons取得
  select acquired_icons
    into v_current
  from users.profiles
  where uid = p_uid;

  if v_current is null then
    v_current := '{}';
  end if;

  -- ここまでで配列の準備完了

  -- アイコン0~11まで。しろぐみ~にじぐみ3まで。
  for i in 0..11 loop
    -- 例：gumi条件つきで追加したい場合
    if p_new_gumi >= i and not (i = any(v_current)) then
      v_current := array_append(v_current, i);
      v_added := array_append(v_added, i);
    end if;
  end loop;

  -- 500戦で icon 12(くろまる)
  if p_games >= 500 and not (12 = any(v_current)) then
    v_current := array_append(v_current, 12);
    v_added := array_append(v_added, 12);
  end if;

  -- 1000戦で icon 13(しろまる)
  if p_games >= 1000 and not (13 = any(v_current)) then
    v_current := array_append(v_current, 13);
    v_added := array_append(v_added, 13);
  end if;

  -- 2000戦で icon 14(恐竜)
  if p_games >= 2000 and not (14 = any(v_current)) then
    v_current := array_append(v_current, 14);
    v_added := array_append(v_added, 14);
  end if;

  -- 5000戦で icon 15(恐竜ドリンク)
  if p_games >= 5000 and not (15 = any(v_current)) then
    v_current := array_append(v_current, 15);
    v_added := array_append(v_added, 15);
  end if;

  -- 10000戦で icon 16(オバケかんむり)
  if p_games >= 10000 and not (16 = any(v_current)) then
    v_current := array_append(v_current, 16);
    v_added := array_append(v_added, 16);
  end if;

  -- 更新
  update users.profiles
  set acquired_icons = v_current
  where uid = p_uid;

  -- 新規分だけ返す（broadcast用）
  return v_added;
end;
$$;


ALTER FUNCTION "users"."add_icons"("p_uid" "uuid", "p_new_gumi" smallint, "p_games" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."get_my_profile"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'users'
    AS $$
declare
  v_row users.profiles;
begin
  update users.profiles
  set lastseen = now()
  where uid = auth.uid()
  returning * into v_row;

  if v_row.uid is null then
    return null;
  end if;

  return row_to_json(v_row);
end;
$$;


ALTER FUNCTION "users"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."get_top_profiles"("p_limit" integer DEFAULT 100) RETURNS TABLE("uid" "uuid", "displayname" "text", "points" smallint, "icon_index" smallint, "gumi_index" smallint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'users'
    AS $$
  SELECT uid, displayname, points, icon_index, gumi_index
  FROM users.profiles
  WHERE is_bot = false
  ORDER BY points DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "users"."get_top_profiles"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."gumi_to_center_points"("p_gumi" smallint) RETURNS smallint
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case p_gumi
    when 17 then 2510 -- ほし3だけは特に美味しいことなし
    when 16 then 2400
    when 15 then 2200
    when 14 then 2000
    when 13 then 1800
    when 12 then 1600
    when 11 then 1400
    when 10 then 1200
    when 9 then 1000
    when 8 then 810
    when 7 then 640
    when 6 then 490
    when 5 then 350
    when 4 then 250
    when 3 then 160
    when 2 then 90
    when 1 then 40
    else 10
  end;
$$;


ALTER FUNCTION "users"."gumi_to_center_points"("p_gumi" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."points_to_gumi"("p_points" smallint) RETURNS smallint
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select cast(greatest(0, (
    select count(*) - 1
    from (values
      (0), (20), (60), (120), (200), (300),
      (420), (560), (720), (900), (1100), (1300),
      (1500), (1700), (1900), (2100), (2300), (2500)
    ) as t(threshold)
    where threshold <= p_points
  )) as smallint);
$$;


ALTER FUNCTION "users"."points_to_gumi"("p_points" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "users"."sync_revenuecat_premium"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_api_key text;
  v_user record;
  v_response extensions.http_response;
  v_subscriber jsonb;
  v_entitlements jsonb;
  v_is_premium boolean;
  v_entitlement_key text;
  v_expires_date timestamptz;
begin
  -- VaultからSecret API keyを取得
  select decrypted_secret
  into v_api_key
  from vault.decrypted_secrets
  where name = 'supabase_to_revenuecat_secret';

  if v_api_key is null then
    raise exception 'revenuecat_secret_key not found in vault';
  end if;

  for v_user in
    select uid from users.profiles
  loop
    begin
      select *
      into v_response
      from extensions.http((
        'GET',
        'https://api.revenuecat.com/v1/subscribers/' || v_user.uid::text,
        array[
          extensions.http_header('Authorization', 'Bearer ' || v_api_key),
          extensions.http_header('Content-Type', 'application/json')
        ],
        null,
        null
      )::extensions.http_request);

      -- 201はユーザーが存在しなかった（新規作成されてしまった）ケース
      if v_response.status = 201 then
        raise warning 'RC user did not exist, created by API call: uid=%', v_user.uid;
        continue;
      end if;

      if v_response.status != 200 then
        raise warning 'RevenueCat API error for uid=%: status=%', v_user.uid, v_response.status;
        continue;
      end if;

      v_subscriber := (v_response.content::jsonb) -> 'subscriber';
      v_entitlements := v_subscriber -> 'entitlements';

      -- entitlementsをループしてexpires_dateが未来のものがあればpremium
      v_is_premium := false;
      for v_entitlement_key in
        select jsonb_object_keys(v_entitlements)
      loop
        v_expires_date := (v_entitlements -> v_entitlement_key ->> 'expires_date')::timestamptz;
        if v_expires_date is not null and v_expires_date > now() then
          v_is_premium := true;
          exit;
        end if;
      end loop;

      update users.profiles
      set is_premium = v_is_premium
      where uid = v_user.uid;

    exception when others then
      raise warning 'Failed to sync uid=%: %', v_user.uid, sqlerrm;
      continue;
    end;
  end loop;
end;
$$;


ALTER FUNCTION "users"."sync_revenuecat_premium"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "game"."records" (
    "dead_stones" smallint[],
    "result" "text",
    "created_at" "date" NOT NULL,
    "black_uid" "uuid",
    "white_uid" "uuid",
    "moves" smallint[],
    "match_type" smallint DEFAULT '0'::smallint,
    "id" integer NOT NULL,
    "black_points" smallint,
    "white_points" smallint,
    "board_size" smallint DEFAULT '9'::smallint NOT NULL
);


ALTER TABLE "game"."records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "game"."matches_archive_new_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "game"."matches_archive_new_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "game"."matches_archive_new_id_seq" OWNED BY "game"."records"."id";



CREATE TABLE IF NOT EXISTS "game"."playing" (
    "black_uid" "uuid",
    "white_uid" "uuid",
    "status" "text" DEFAULT 'waiting'::"text",
    "moves" smallint[],
    "white_displayname" "text",
    "result" "text",
    "black_last_seen" timestamp with time zone DEFAULT "now"(),
    "white_last_seen" timestamp with time zone DEFAULT "now"(),
    "turn" "text" DEFAULT 'black'::"text",
    "black_seconds" smallint DEFAULT '185'::smallint,
    "white_seconds" smallint DEFAULT '185'::smallint,
    "turn_switched_at" timestamp with time zone,
    "black_points" smallint,
    "white_points" smallint,
    "dead_stones" smallint[],
    "black_icon_index" smallint,
    "white_icon_index" smallint,
    "match_type" smallint DEFAULT '0'::smallint,
    "black_displayname" "text",
    "id" integer NOT NULL,
    "board_size" smallint DEFAULT '9'::smallint
);


ALTER TABLE "game"."playing" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "game"."matches_new_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "game"."matches_new_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "game"."matches_new_id_seq" OWNED BY "game"."playing"."id";



CREATE TABLE IF NOT EXISTS "game"."waiting" (
    "player_uid" "uuid" NOT NULL,
    "points" smallint,
    "try_count" smallint DEFAULT '0'::smallint
);


ALTER TABLE "game"."waiting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "system"."app_status" (
    "id" smallint NOT NULL,
    "maintenance" boolean DEFAULT false,
    "version" "text" DEFAULT ''::"text",
    "message" "text" DEFAULT ''::"text"
);


ALTER TABLE "system"."app_status" OWNER TO "postgres";DO $identity_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'system' AND sequencename = 'app_status_id_seq'
  ) THEN
    ALTER TABLE "system"."app_status" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "system"."app_status_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
  END IF;
END $identity_guard$;




CREATE TABLE IF NOT EXISTS "system"."rate_limit" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "system"."rate_limit" OWNER TO "postgres";DO $identity_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'system' AND sequencename = 'rate_limit_id_seq'
  ) THEN
    ALTER TABLE "system"."rate_limit" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "system"."rate_limit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
  END IF;
END $identity_guard$;




CREATE TABLE IF NOT EXISTS "users"."profiles" (
    "uid" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "created_at" "date" DEFAULT "now"(),
    "points" smallint DEFAULT '10'::smallint,
    "displayname" "text",
    "icon_index" smallint DEFAULT '0'::smallint,
    "country" "text" DEFAULT 'JP'::"text",
    "daily_play_count" smallint DEFAULT '0'::smallint,
    "tutorial_progress" smallint,
    "games" integer DEFAULT 0,
    "tsumego_progress" smallint[],
    "giantkill_stroke" smallint DEFAULT '0'::smallint,
    "lastseen" "date",
    "gumi_index" smallint DEFAULT '0'::smallint,
    "is_bot" boolean DEFAULT false,
    "acquired_icons" smallint[],
    "plan_id" smallint DEFAULT '0'::smallint
);


ALTER TABLE "users"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "game"."playing" ALTER COLUMN "id" SET DEFAULT "nextval"('"game"."matches_new_id_seq"'::"regclass");DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'game' AND c.conname = 'matches_pkey'
  ) THEN
    ALTER TABLE ONLY "game"."playing"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");
  END IF;
END $constraint_guard$;
DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'game' AND c.conname = 'records_pkey'
  ) THEN
    ALTER TABLE ONLY "game"."records"
    ADD CONSTRAINT "records_pkey" PRIMARY KEY ("id");
  END IF;
END $constraint_guard$;
DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'game' AND c.conname = 'waiting_pkey'
  ) THEN
    ALTER TABLE ONLY "game"."waiting"
    ADD CONSTRAINT "waiting_pkey" PRIMARY KEY ("player_uid");
  END IF;
END $constraint_guard$;
DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'system' AND c.conname = 'app_status_pkey'
  ) THEN
    ALTER TABLE ONLY "system"."app_status"
    ADD CONSTRAINT "app_status_pkey" PRIMARY KEY ("id");
  END IF;
END $constraint_guard$;
DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'system' AND c.conname = 'rate_limit_pkey'
  ) THEN
    ALTER TABLE ONLY "system"."rate_limit"
    ADD CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id");
  END IF;
END $constraint_guard$;
DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'users' AND c.conname = 'profiles_pkey'
  ) THEN
    ALTER TABLE ONLY "users"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("uid");
  END IF;
END $constraint_guard$;




CREATE INDEX IF NOT EXISTS "matches_black_uid_idx" ON "game"."playing" USING "btree" ("black_uid");



CREATE INDEX IF NOT EXISTS "matches_white_uid_idx" ON "game"."playing" USING "btree" ("white_uid");



CREATE INDEX IF NOT EXISTS "matches_white_username_idx" ON "game"."playing" USING "btree" ("white_displayname");



CREATE OR REPLACE TRIGGER "on_match_created" AFTER INSERT ON "game"."playing" FOR EACH ROW EXECUTE FUNCTION "game"."notify_match"();



CREATE OR REPLACE TRIGGER "on_move_added" AFTER UPDATE OF "moves" ON "game"."playing" FOR EACH ROW WHEN (("old"."moves" IS DISTINCT FROM "new"."moves")) EXECUTE FUNCTION "game"."on_move_added"();



CREATE OR REPLACE TRIGGER "playing_archive" AFTER UPDATE ON "game"."playing" FOR EACH ROW WHEN ((("new"."status" = 'finished'::"text") AND ("old"."status" IS DISTINCT FROM 'finished'::"text"))) EXECUTE FUNCTION "game"."archive_playing"();DO $constraint_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'users' AND c.conname = 'profiles_uid_fkey'
  ) THEN
    ALTER TABLE ONLY "users"."profiles"
    ADD CONSTRAINT "profiles_uid_fkey" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id");
  END IF;
END $constraint_guard$;DROP POLICY IF EXISTS "insert_own_matches_archive" ON "game"."records";
CREATE POLICY "insert_own_matches_archive" ON "game"."records" FOR INSERT WITH CHECK ((("auth"."uid"() = "black_uid") OR ("auth"."uid"() = "white_uid")));




ALTER TABLE "game"."playing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "game"."records" ENABLE ROW LEVEL SECURITY;DROP POLICY IF EXISTS "select_everyones_matches_archive" ON "game"."records";
CREATE POLICY "select_everyones_matches_archive" ON "game"."records" FOR SELECT USING (true);




ALTER TABLE "game"."waiting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "system"."app_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "system"."rate_limit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "users"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "game" TO "anon";
GRANT USAGE ON SCHEMA "game" TO "authenticated";
GRANT USAGE ON SCHEMA "game" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "system" TO "anon";
GRANT USAGE ON SCHEMA "system" TO "authenticated";



GRANT USAGE ON SCHEMA "users" TO "anon";
GRANT USAGE ON SCHEMA "users" TO "authenticated";
GRANT USAGE ON SCHEMA "users" TO "service_role";



GRANT ALL ON FUNCTION "game"."add_move"("p_match_id" integer, "p_move" smallint, "p_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "game"."archive_playing"() TO "service_role";



GRANT ALL ON FUNCTION "game"."cancel_waiting"() TO "service_role";



GRANT ALL ON FUNCTION "game"."check_can_play"() TO "service_role";



GRANT ALL ON FUNCTION "game"."get_records_with_profiles"("p_uid" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";
GRANT ALL ON FUNCTION "game"."get_records_with_profiles"("p_uid" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";



GRANT ALL ON FUNCTION "game"."join_waiting"() TO "service_role";



GRANT ALL ON FUNCTION "game"."resign"("p_match_id" integer, "p_color" "text") TO "service_role";



GRANT ALL ON FUNCTION "game"."server_callback"("p_match_id" integer, "p_move" smallint, "p_dead_stones" smallint[], "p_result" "text", "p_analysis_id" integer, "p_analysis_result" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "game"."try_match_all"() TO "service_role";



GRANT ALL ON FUNCTION "game"."update_last_seen"("p_color" "text", "p_match_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_cron_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_cron_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_cron_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hello_test"() TO "anon";
GRANT ALL ON FUNCTION "public"."hello_test"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hello_test"() TO "service_role";



GRANT ALL ON FUNCTION "public"."register_profile"("p_username" "text", "p_displayname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_profile"("p_username" "text", "p_displayname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_profile"("p_username" "text", "p_displayname" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_daily_play_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_daily_play_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_daily_play_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."server_callback"("match_id" "uuid", "analysis_id" "uuid", "move" smallint, "dead_stones" "text"[], "result" "text", "analysis_result" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."server_callback"("match_id" "uuid", "analysis_id" "uuid", "move" smallint, "dead_stones" "text"[], "result" "text", "analysis_result" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."server_callback"("match_id" "uuid", "analysis_id" "uuid", "move" smallint, "dead_stones" "text"[], "result" "text", "analysis_result" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."time_connection_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."time_connection_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_connection_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_icon_index"("new_icon_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "system"."get_app_status"() TO "anon";
GRANT ALL ON FUNCTION "system"."get_app_status"() TO "authenticated";



GRANT ALL ON FUNCTION "users"."get_top_profiles"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "users"."get_top_profiles"("p_limit" integer) TO "authenticated";



GRANT ALL ON TABLE "game"."records" TO "anon";
GRANT ALL ON TABLE "game"."records" TO "authenticated";
GRANT ALL ON TABLE "game"."records" TO "service_role";



GRANT ALL ON SEQUENCE "game"."matches_archive_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "game"."matches_archive_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "game"."matches_archive_new_id_seq" TO "service_role";



GRANT ALL ON TABLE "game"."playing" TO "anon";
GRANT ALL ON TABLE "game"."playing" TO "authenticated";
GRANT ALL ON TABLE "game"."playing" TO "service_role";



GRANT ALL ON SEQUENCE "game"."matches_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "game"."matches_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "game"."matches_new_id_seq" TO "service_role";



GRANT ALL ON TABLE "game"."waiting" TO "anon";
GRANT ALL ON TABLE "game"."waiting" TO "authenticated";
GRANT ALL ON TABLE "game"."waiting" TO "service_role";



GRANT ALL ON TABLE "system"."app_status" TO "anon";
GRANT ALL ON TABLE "system"."app_status" TO "authenticated";
GRANT ALL ON TABLE "system"."app_status" TO "service_role";



GRANT ALL ON SEQUENCE "system"."app_status_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "system"."app_status_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "system"."app_status_id_seq" TO "service_role";



GRANT ALL ON TABLE "system"."rate_limit" TO "anon";
GRANT ALL ON TABLE "system"."rate_limit" TO "authenticated";
GRANT ALL ON TABLE "system"."rate_limit" TO "service_role";



GRANT ALL ON SEQUENCE "system"."rate_limit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "system"."rate_limit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "system"."rate_limit_id_seq" TO "service_role";



GRANT ALL ON TABLE "users"."profiles" TO "anon";
GRANT ALL ON TABLE "users"."profiles" TO "authenticated";
GRANT ALL ON TABLE "users"."profiles" TO "service_role";



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







