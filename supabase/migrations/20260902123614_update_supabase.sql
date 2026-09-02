SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.calculate_icons (
  p_points9  smallint,
  p_points13 smallint
)
  RETURNS smallint[]
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_icons smallint[] := '{}';
  v_rank smallint;
begin
  -- 9路盤・13路盤の強い方のランクを採用する
  v_rank := greatest(
    private.points_to_rank(p_points9),
    private.points_to_rank(p_points13)
  );

  -- ランクに応じたアイコン (0 〜 5) を追加する
  for i in 0..5 loop
    if v_rank >= (i * 3) then
      v_icons := array_append(v_icons, i::smallint);
    end if;
  end loop;

  return v_icons;
end;
$function$;

CREATE OR REPLACE FUNCTION private.get_bot_match_info (
  p_points     smallint,
  p_board_size smallint,
  OUT          o_bot_uid uuid,
  OUT          o_match_type smallint
)
  RETURNS record
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_rank smallint;
  v_bot_username text;
begin
  -- ポイントからランク(0: 10k 〜 17: 8D)を計算する
  v_rank := private.points_to_rank(p_points);

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
$function$;

CREATE OR REPLACE FUNCTION public.join_waitlist (
  p_board_size smallint
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_match_result (
  p_match_id    integer,
  p_result      text,
  p_dead_stones smallint[] DEFAULT '{}'::smallint[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_username (
  new_username text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;
