SET local check_function_bodies = off;

SELECT cron.unschedule('try_match_all(13)');

SELECT cron.unschedule('try_match_all(9)');

CREATE OR REPLACE FUNCTION private.archive_matches()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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

  -- 既存のポイント（盤サイズとは逆側も保持しておく）
  v_black_points_other smallint;
  v_white_points_other smallint;

  -- アイコン関連の変数
  v_black_old_icons smallint[];
  v_white_old_icons smallint[];
  v_black_updated_icons smallint[];
  v_white_updated_icons smallint[];
  v_black_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン
  v_white_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン

  v_icon_item smallint;
begin
  -- ─── 1. プロフィール情報の取得 ───────────────────────────
  select
    case when new.board_size = 13 then games_13 else games_9 end,
    case when new.board_size = 13 then points_13 else points_9 end,
    case when new.board_size = 13 then points_9 else points_13 end, -- 対局していない方のポイント
    case when new.board_size = 13 then giantkill_13 else giantkill_9 end,
    is_bot,
    coalesce(acquired_icons, '{0}'::smallint[])
  into
    v_black_games, v_black_points, v_black_points_other, v_black_giantkill, v_is_black_bot, v_black_old_icons
  from private.profiles pf
  where pf.uid = new.black_uid;

  select
    case when new.board_size = 13 then pf.games_13 else pf.games_9 end,
    case when new.board_size = 13 then pf.points_13 else pf.points_9 end,
    case when new.board_size = 13 then pf.points_9 else pf.points_13 end, -- 対局していない方のポイント
    case when new.board_size = 13 then pf.giantkill_13 else pf.giantkill_9 end,
    pf.is_bot,
    coalesce(pf.acquired_icons, '{0}'::smallint[])
  into
    v_white_games, v_white_points, v_white_points_other, v_white_giantkill, v_is_white_bot, v_white_old_icons
  from private.profiles pf
  where pf.uid = new.white_uid;

  -- ─── 2. ポイント計算 ─────────────────────────────────────
  -- ------------------
  -- ⚫️が勝った🎉
  -- ------------------
  if new.result like 'B+%' then  
    -- 勝った⚫️側の処理
    v_diff := v_white_points - v_black_points;
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
    -- 勝った⚪️側の処理
    v_diff := v_black_points - v_white_points;
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
  end if;

  -- ─── 3. 更新後のpoints事前計算 ─────────────────────────
  v_black_new_points := greatest(0, v_black_points + v_black_delta);
  v_white_new_points := greatest(0, v_white_points + v_white_delta);

  -- ─── 4. アイコンの計算と新規獲得（差分）の抽出 ──────────────────
  -- ⚫️の新しい全獲得可能アイコンを計算
  if new.board_size = 9 then
    v_black_updated_icons := private.calculate_icons(v_black_new_points, v_black_points_other);
  else
    v_black_updated_icons := private.calculate_icons(v_black_points_other, v_black_new_points);
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
    v_white_updated_icons := private.calculate_icons(v_white_new_points, v_white_points_other);
  else
    v_white_updated_icons := private.calculate_icons(v_white_points_other, v_white_new_points);
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

  -- ─── 5. profilesテーブルの更新 ────────────────────────────
  -- ⚫️のprofileを更新
  update private.profiles set
    games_9        = case when new.board_size = 9  then games_9  + 1 else games_9  end,
    games_13       = case when new.board_size = 13 then games_13 + 1 else games_13 end,
    points_9       = case when new.board_size = 9  then v_black_new_points else points_9  end,
    points_13      = case when new.board_size = 13 then v_black_new_points else points_13 end,
    giantkill_9    = case when new.board_size = 9  then v_black_giantkill else giantkill_9  end,
    giantkill_13   = case when new.board_size = 13 then v_black_giantkill else giantkill_13 end,
    acquired_icons = v_black_updated_icons
  where profiles.uid = new.black_uid
    and profiles.is_bot = false;

  -- ⚪️のprofileを更新
  update private.profiles set
    games_9        = case when new.board_size = 9  then games_9  + 1 else games_9  end,
    games_13       = case when new.board_size = 13 then games_13 + 1 else games_13 end,
    points_9       = case when new.board_size = 9  then v_white_new_points else points_9  end,
    points_13      = case when new.board_size = 13 then v_white_new_points else points_13 end,
    giantkill_9    = case when new.board_size = 9  then v_white_giantkill else giantkill_9  end,
    giantkill_13   = case when new.board_size = 13 then v_white_giantkill else giantkill_13 end,
    acquired_icons = v_white_updated_icons
  where profiles.uid = new.white_uid
    and profiles.is_bot = false;

  -- botのgames更新
  update private.profiles set
    games_9  = case when new.board_size = 9  then games_9  + 1 else games_9  end,
    games_13 = case when new.board_size = 13 then games_13 + 1 else games_13 end
  where profiles.uid in (new.black_uid, new.white_uid)
    and profiles.is_bot = true;

  -- ─── 6. recordsにinsert ─────────────────────────────────
  insert into private.records (
    id, 
    black_uid, white_uid,
    moves,
    result,
    black_points, white_points,
    match_type, board_size,
    dead_stones,
    created_at
  ) values (
    new.id, 
    new.black_uid, new.white_uid,
    new.moves,
    new.result,
    v_black_points, v_white_points,
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
        'new_points', v_black_new_points,
        'acquired_icons', v_black_new_icons
      ),
      'white', jsonb_build_object(
        'delta', v_white_delta,
        'new_points', v_white_new_points,
        'acquired_icons', v_white_new_icons
      )
    ),
    'points_updated', -- イベント名
    'game:' || new.id::text, -- 🐱 gameChannelにまとめる
    false
  );

  -- ─── 8. matchesからdelete ───────────────────────────────
  delete from private.matches m where m.id = new.id;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION private.try_match_all (
  p_board_size smallint
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_waiter         record;
  v_opponent       record;
  v_bot_uid        uuid;
  v_waiter_profile record;
  v_waiter_points  smallint;
  v_points_diff    smallint;
  v_match_id       smallint;
  v_match_type     smallint;
  v_human_is_black boolean;
begin
  -- 誰も並んでないなら何もせず終了
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

    -- ポイントを取得
    v_waiter_points := case
      when p_board_size = 13 then v_waiter_profile.points_13
      else v_waiter_profile.points_9
    end;

    -- 🤖🤖🤖 ボット戦分岐 🤖🤖🤖
    if v_waiter.try_count >= 3 and v_waiter_profile.allow_bot_match then
      -- 対戦ボットとmatch_typeを取得する
      select o_bot_uid, o_match_type
      into v_bot_uid, v_match_type
      from private.get_bot_match_info(v_waiter_points, p_board_size);

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
    v_points_diff := least(v_waiter.try_count::int * 300, 1000)::smallint; -- 1000は最大ポイント差。

    select wl.* into v_opponent
    from private.waitlist wl
    join private.profiles pf on pf.uid = wl.player_uid
    where wl.player_uid != v_waiter.player_uid
      and wl.board_size = p_board_size
      and abs(
        case when p_board_size = 13 then pf.points_13 else pf.points_9 end
        - v_waiter_points
      ) <= v_points_diff
    order by abs(
        case when p_board_size = 13 then pf.points_13 else pf.points_9 end
        - v_waiter_points
      ) asc
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
$function$;

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
        INSERT INTO private.profiles (uid, username) -- ▶️ここから
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

  -- 5. 🐱 メンテ情報とプロフィール（新しく作った場合はそのデータ）をまとめて返す
  RETURN json_build_object(
    'app_status', json_build_object(
      'maintenance', COALESCE(v_status.maintenance, false),
      'message', v_status.message,
      'version', v_status.version
    ),
    'profile', json_build_object(
      'uid', v_row.uid,
      'username', v_row.username,
      'points_9', v_row.points_9,
      'points_13', v_row.points_13,
      'icon_index', v_row.icon_index,
      'games_9', v_row.games_9,
      'games_13', v_row.games_13,
      'acquired_icons', v_row.acquired_icons,
      'allow_bot_match', v_row.allow_bot_match
    )
  );
END;
$function$;

SELECT cron.schedule_in_database('try_match_all(13)', '3 seconds', 'SELECT private.try_match_all(13::smallint)', 'postgres', NULL, true);

SELECT cron.schedule_in_database('try_match_all(9)', '3 seconds', 'SELECT private.try_match_all(9::smallint)', 'postgres', NULL, true);
