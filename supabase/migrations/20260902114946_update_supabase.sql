SET local check_function_bodies = off;

DROP FUNCTION "public"."get_rankings"();

CREATE OR REPLACE FUNCTION private.assert_player (
  p_match_id         integer,
  p_allowed_statuses text[]                DEFAULT ARRAY['playing'::text],
  OUT                my_color text,
  OUT                match private.matches
)
  RETURNS record
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.build_match_json (
  p_match      private.matches,
  p_player_uid uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
declare
  v_is_black       boolean := (p_match.black_uid = p_player_uid);
  v_black_profiles private.profiles%rowtype;
  v_white_profiles private.profiles%rowtype;
  
  -- 相手のプロフィールとポイントを入れる変数
  v_opp_profile    private.profiles%rowtype;
  v_opp_points     smallint;
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

  -- 碁盤のサイズ（board_size）によってポイントの列を切り替える
  v_opp_points := case p_match.board_size
    when 9  then v_opp_profile.points_9
    when 13 then v_opp_profile.points_13
    else 0 -- 万が一9や13以外が来たときの保険
  end;

  return jsonb_build_object(
    'match_id',       p_match.id,
    'board_size',     p_match.board_size,
    'match_type',     p_match.match_type,
    'moves',          coalesce(to_jsonb(p_match.moves), '[]'::jsonb),
    'my_color',       case when v_is_black then 'black' else 'white' end,
    'opp_points',     coalesce(v_opp_points, 0), -- ★盤サイズに応じたポイントが入る
    'opp_username',   v_opp_profile.username,
    'opp_icon_index', v_opp_profile.icon_index,
    'my_seconds',      case when v_is_black then p_match.black_seconds else p_match.white_seconds end,
    'opp_seconds',     case when v_is_black then p_match.white_seconds else p_match.black_seconds end,
    'bot_match',      (coalesce(v_black_profiles.is_bot, false) or coalesce(v_white_profiles.is_bot, false))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.check_maintenance()
  RETURNS void
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.cleanup_old_anonymous_profiles()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  -- lastseenが14日以上前、かつ 本物（認証済み）ユーザーではなく、ボットでもないアカウントを削除
  DELETE FROM private.profiles p
  WHERE p.lastseen < CURRENT_DATE - INTERVAL '14 days'
    AND p.is_bot = false
    AND NOT private.is_authenticated_user(p.uid);
END;
$function$;

CREATE OR REPLACE FUNCTION private.is_authenticated_user (
  user_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users au
    WHERE au.id = user_id
      AND (au.is_anonymous IS NOT TRUE OR au.email IS NOT NULL)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_rankings()
  RETURNS TABLE (
    username         text,
    points           smallint,
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
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  RETURN QUERY
  -- 9路盤の上位30件
  (
    SELECT 
      p.username, 
      p.points_9 AS points,
      p.icon_index,
      9 AS board_size,
      private.is_authenticated_user(p.uid) AS is_authenticated
    FROM private.profiles p
    WHERE p.is_bot = false
    ORDER BY p.points_9 DESC
    LIMIT 30
  )
  UNION ALL
  -- 13路盤の上位30件
  (
    SELECT 
      p.username, 
      p.points_13 AS points,
      p.icon_index,
      13 AS board_size,
      private.is_authenticated_user(p.uid) AS is_authenticated
    FROM private.profiles p
    WHERE p.is_bot = false
    ORDER BY p.points_13 DESC
    LIMIT 30
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "private"."is_authenticated_user"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_rankings"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_rankings"() TO "anon", "authenticated", "postgres", "service_role";
