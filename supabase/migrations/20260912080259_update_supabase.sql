SET local check_function_bodies = off;

ALTER TABLE "private"."profiles"
  DROP CONSTRAINT "profiles_username_check";

CREATE OR REPLACE FUNCTION public.get_my_profile()
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
      v_username := substr(md5(random()::text), 1, 5);

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
$function$;
