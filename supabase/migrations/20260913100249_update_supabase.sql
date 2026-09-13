SET local check_function_bodies = off;

DROP FUNCTION "private"."calculate_draw_delta"(smallint, smallint, boolean, boolean);

DROP FUNCTION "private"."calculate_match_delta"(smallint, smallint, smallint, smallint, boolean, boolean);

DROP FUNCTION "public"."get_my_profile"();

DROP FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer);

DROP FUNCTION "public"."join_waitlist"(smallint);

ALTER TABLE "private"."app_status"
  DROP COLUMN "version";

ALTER TABLE "private"."app_status"
  ADD COLUMN "app_version" text;

ALTER TABLE "private"."app_status"
  ADD COLUMN "ota_version" text;

CREATE OR REPLACE FUNCTION private.check_version()
  RETURNS void
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
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
  PERFORM private.check_version();
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

CREATE OR REPLACE FUNCTION public.delete_guest_after_existing_selected (
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
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile (
  p_after_id_9  integer DEFAULT NULL::integer,
  p_after_id_13 integer DEFAULT NULL::integer
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
  v_rating_9 SMALLINT := 0;
  v_wins_9 SMALLINT := 0;
  v_losses_9 SMALLINT := 0;
  v_draws_9 SMALLINT := 0;

  v_rating_13 SMALLINT := 0;
  v_wins_13 SMALLINT := 0;
  v_losses_13 SMALLINT := 0;
  v_draws_13 SMALLINT := 0;

  -- 差分棋譜用
  v_records_9_json JSONB := '[]'::jsonb;
  v_records_13_json JSONB := '[]'::jsonb;
BEGIN
  -- 0. ガード
  PERFORM private.check_version();
  PERFORM private.check_maintenance();

  -- 2. 未認証なら即終了
  IF v_uid IS NULL THEN
    RETURN json_build_object(
      'profile', NULL,
      'newer_records_9', '[]'::jsonb,
      'newer_records_13', '[]'::jsonb
    );
  END IF;

  -- 差分棋譜を取得（ヘルパー関数を呼び出す）
  v_records_9_json := private.fetch_newer_records(v_uid, 9::smallint, p_after_id_9);
  v_records_13_json := private.fetch_newer_records(v_uid, 13::smallint, p_after_id_13);

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

  -- 6. user_stats (9路盤・13路盤)
  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_9, v_wins_9, v_losses_9, v_draws_9
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 9;

  SELECT COALESCE(rating, 0), COALESCE(wins, 0), COALESCE(losses, 0), COALESCE(draws, 0)
    INTO v_rating_13, v_wins_13, v_losses_13, v_draws_13
    FROM private.user_stats
   WHERE uid = v_uid AND board_size = 13;

  -- 7. まとめて返却
  RETURN json_build_object(
    'profile', json_build_object(
      'uid',             v_row.uid,
      'username',        v_row.username,
      'rating_9',        COALESCE(v_rating_9, 0),
      'rating_13',       COALESCE(v_rating_13, 0),
      'icon_index',      v_row.icon_index,
      'wins_9',          COALESCE(v_wins_9, 0),
      'losses_9',        COALESCE(v_losses_9, 0),
      'draws_9',         COALESCE(v_draws_9, 0),
      'wins_13',         COALESCE(v_wins_13, 0),
      'losses_13',        COALESCE(v_losses_13, 0),
      'draws_13',        COALESCE(v_draws_13, 0),
      'acquired_icons',  v_row.acquired_icons,
      'allow_bot_match', COALESCE(v_allow_bot_match, true)
    ),
    'newer_records_9',  v_records_9_json,
    'newer_records_13', v_records_13_json
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
$function$;

CREATE OR REPLACE FUNCTION public.get_records_newer (
  p_uid        uuid,
  p_limit      smallint,
  p_board_size smallint,
  p_after_id   integer
)
  RETURNS TABLE (
    id               integer,
    created_at       date,
    result           text,
    match_type       smallint,
    moves            smallint[],
    dead_stones      smallint[],
    black_rating     smallint,
    white_rating     smallint,
    board_size       smallint,
    black_uid        uuid,
    black_username   text,
    black_icon_index smallint,
    black_rank_index smallint,
    white_uid        uuid,
    white_username   text,
    white_icon_index smallint,
    white_rank_index smallint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_records_older (
  p_uid        uuid,
  p_limit      smallint,
  p_board_size smallint,
  p_before_id  integer  DEFAULT NULL::integer
)
  RETURNS TABLE (
    id               integer,
    created_at       date,
    result           text,
    match_type       smallint,
    moves            smallint[],
    dead_stones      smallint[],
    black_points     smallint,
    white_points     smallint,
    board_size       smallint,
    black_uid        uuid,
    black_username   text,
    black_icon_index smallint,
    black_rank_index smallint,
    white_uid        uuid,
    white_username   text,
    white_icon_index smallint,
    white_rank_index smallint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_allow_bot_match (
  new_allow_bot_match boolean
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

  -- ★ private.profiles ではなく private.user_settings を更新する
  UPDATE private.user_settings
  SET allow_bot_match = new_allow_bot_match
  WHERE uid = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_icon_index (
  new_icon_index integer
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
  SET icon_index = new_icon_index
  WHERE profiles.uid = auth.uid();
END;
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
  PERFORM private.check_version();
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

GRANT EXECUTE ON FUNCTION "private"."check_version"() TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_my_profile"(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_my_profile"(integer, integer) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer) TO "anon", "authenticated", "postgres", "service_role";
