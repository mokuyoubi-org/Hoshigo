SET local check_function_bodies = off;

ALTER TABLE "private"."user_stats"
  ADD COLUMN "daily_play_count" smallint DEFAULT '0'::smallint;

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

  -- ★ 二人の「今日の対局数」を+1（行がまだ無い人は、0から作って1にする）
  insert into private.user_stats as us (uid, board_size, daily_play_count)
  select u, new.board_size, 1
  from unnest(array[new.black_uid, new.white_uid]) as u
  on conflict (uid, board_size)
  do update set daily_play_count = coalesce(us.daily_play_count, 0) + 1;

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

CREATE OR REPLACE FUNCTION private.reset_daily_play_count()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  UPDATE private.user_stats
  SET daily_play_count = 0
  WHERE daily_play_count > 0;
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
  c_daily_limit  constant integer := 10;  -- 匿名ユーザの1日の対局数上限（盤面ごと）

  v_match        private.matches%rowtype;
  v_player_uid   uuid := auth.uid();
  v_match_json   jsonb := null;
  v_records_json jsonb := '[]'::jsonb;
  v_play_count   smallint := 0;
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
    -- ★ 匿名ユーザは、その盤面の今日の対局数が上限に達していたら待機列に入れない
    if not private.is_authenticated_user(v_player_uid) then
      select coalesce(us.daily_play_count, 0) into v_play_count
      from private.user_stats us
      where us.uid = v_player_uid
        and us.board_size = p_board_size;

      if coalesce(v_play_count, 0) >= c_daily_limit then
        raise exception 'daily_play_limit_reached';
      end if;
    end if;

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

GRANT EXECUTE ON FUNCTION "private"."reset_daily_play_count"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."join_waitlist"(smallint, boolean, integer) FROM PUBLIC;

SELECT cron.schedule_in_database('reset_daily_play_count', '0 5 * * *', 'SELECT private.reset_daily_play_count()', 'postgres', NULL, true);
