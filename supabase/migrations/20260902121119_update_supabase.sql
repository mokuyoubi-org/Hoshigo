SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.assert_player (
  p_match_id         integer,
  p_allowed_statuses text[]                DEFAULT ARRAY['playing'::text],
  OUT                my_color text,
  OUT                match private.matches
)
  RETURNS record
  LANGUAGE plpgsql
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
