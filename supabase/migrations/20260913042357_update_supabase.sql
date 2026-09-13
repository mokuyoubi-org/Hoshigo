SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.fetch_newer_records (
  p_player_uid uuid,
  p_board_size smallint,
  p_after_id   integer,
  p_limit      smallint DEFAULT 10
)
  RETURNS jsonb
  LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.join_waitlist (
  p_board_size smallint,
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
      insert into private.waitlist (player_uid, board_size)
      values (v_player_uid, p_board_size);
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

GRANT EXECUTE ON FUNCTION "private"."fetch_newer_records"(uuid, smallint, integer, smallint) TO "postgres";

REVOKE ALL ON FUNCTION "public"."join_waitlist"(smallint, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."join_waitlist"(smallint, integer) TO "anon", "authenticated", "postgres", "service_role";
