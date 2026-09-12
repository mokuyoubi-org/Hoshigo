SET local check_function_bodies = off;

DROP FUNCTION "public"."update_last_seen"(integer);

CREATE OR REPLACE FUNCTION public.update_last_seen (
  p_match_id integer
)
  RETURNS smallint[]
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."update_last_seen"(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."update_last_seen"(integer) TO "anon", "authenticated", "postgres", "service_role";
