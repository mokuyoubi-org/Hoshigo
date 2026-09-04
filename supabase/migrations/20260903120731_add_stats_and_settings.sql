SET local check_function_bodies = off;

ALTER TABLE "private"."profiles"
  DROP CONSTRAINT "profiles_uid_fkey";

DROP FUNCTION "private"."calculate_icons"(smallint, smallint);

DROP FUNCTION "private"."get_bot_match_info"(smallint, smallint);

DROP FUNCTION "private"."points_to_rank"(smallint);

DROP FUNCTION "public"."get_rankings"();

DROP FUNCTION "public"."get_records_newer"(uuid, smallint, smallint, integer);

DROP FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer);

-- 🌟
-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "allow_bot_match";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "games_13";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "games_9";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "giantkill_13";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "giantkill_9";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "points_13";

-- ALTER TABLE "private"."profiles"
--   DROP COLUMN "points_9";


-- 🌟
-- ALTER TABLE "private"."records"
--   DROP COLUMN "black_points";

-- ALTER TABLE "private"."records"
--   DROP COLUMN "white_points";



-- 🌟
ALTER TABLE private.records RENAME COLUMN black_points TO black_rating;
ALTER TABLE private.records RENAME COLUMN white_points TO white_rating;




CREATE TABLE "private"."user_settings" (
  "uid"             uuid    NOT NULL,
  "allow_bot_match" boolean DEFAULT true,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY (uid)
);

ALTER TABLE "private"."user_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "private"."user_stats" (
  "uid"        uuid     NOT NULL,
  "board_size" smallint NOT NULL,
  "rating"     smallint DEFAULT '0'::smallint,
  "giantkill"  smallint DEFAULT '0'::smallint,
  "wins"       smallint DEFAULT '0'::smallint,
  "losses"     smallint DEFAULT '0'::smallint,
  "draws"      smallint DEFAULT '0'::smallint,
  CONSTRAINT "user_stats_pkey" PRIMARY KEY (uid, board_size)
);

ALTER TABLE "private"."user_stats"
  ENABLE ROW LEVEL SECURITY;

-- 🌟
-- ALTER TABLE "private"."records"
--   ADD COLUMN "black_rating" smallint;

-- ALTER TABLE "private"."records"
--   ADD COLUMN "white_rating" smallint;

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
  v_black_games smallint; -- ⚫️の対局数
  v_white_games smallint; -- ⚪️の対局数
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
  v_black_rating smallint; -- ⚫️のrating
  v_white_rating smallint; -- ⚪️のrating
  v_black_giantkill smallint := 0; -- ⚫️の格上連勝数
  v_white_giantkill smallint := 0; -- ⚪️の格上連勝数
  v_black_new_rating smallint; -- ⚫️の新しいrating
  v_white_new_rating smallint; -- ⚪️の新しいrating

  -- 勝敗・引き分けのインクリメント用変数
  v_black_win_inc smallint := 0;
  v_black_loss_inc smallint := 0;
  v_black_draw_inc smallint := 0;
  v_white_win_inc smallint := 0;
  v_white_loss_inc smallint := 0;
  v_white_draw_inc smallint := 0;

  -- 既存のポイント（盤サイズとは逆側も保持しておく）
  v_black_rating_other smallint := 0;
  v_white_rating_other smallint := 0;

  -- アイコン関連の変数
  v_black_old_icons smallint[];
  v_white_old_icons smallint[];
  v_black_updated_icons smallint[];
  v_white_updated_icons smallint[];
  v_black_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン
  v_white_new_icons smallint[] := '{}'; -- 今回新しく解放されたアイコン

  v_icon_item smallint;
  v_other_board_size smallint;
begin
  -- 反対側の盤サイズを割り出すにゃ（アイコン計算用）
  v_other_board_size := case when new.board_size = 9 then 13 else 9 end;

  -- ─── 1. プロフィール情報 & 戦績情報の取得 ───────────────────────────
  -- ⚫️の情報を取得
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_black_bot, v_black_old_icons
  from private.profiles
  where uid = new.black_uid;

  -- wins + losses + draws の合計で総対局数を計算するにゃ！
  select 
    coalesce(wins + losses + draws, 0), 
    coalesce(rating, 0), 
    coalesce(giantkill, 0)
  into v_black_games, v_black_rating, v_black_giantkill
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_black_rating_other
  from private.user_stats
  where uid = new.black_uid and board_size = v_other_board_size;

  -- ⚪️の情報を取得
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_white_bot, v_white_old_icons
  from private.profiles
  where uid = new.white_uid;

  -- wins + losses + draws の合計で総対局数を計算するにゃ！
  select 
    coalesce(wins + losses + draws, 0), 
    coalesce(rating, 0), 
    coalesce(giantkill, 0)
  into v_white_games, v_white_rating, v_white_giantkill
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_white_rating_other
  from private.user_stats
  where uid = new.white_uid and board_size = v_other_board_size;

  -- ─── 2. ポイント計算 & 勝敗フラグの設定 ──────────────────────
  -- ------------------
  -- ⚫️が勝った🎉
  -- ------------------
  if new.result like 'B+%' then  
    v_black_win_inc := 1;
    v_white_loss_inc := 1;

    -- 勝った⚫️側の処理
    v_diff := v_white_rating - v_black_rating;
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
    v_white_win_inc := 1;
    v_black_loss_inc := 1;

    -- 勝った⚪️側の処理
    v_diff := v_black_rating - v_white_rating;
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

  -- ------------------
  -- 引き分け🤝
  -- ------------------
  else
    v_black_draw_inc := 1;
    v_white_draw_inc := 1;
    v_black_delta := 0;
    v_white_delta := 0;
  end if;

  -- ─── 3. 更新後のrating事前計算 ─────────────────────────
  v_black_new_rating := greatest(0, v_black_rating + v_black_delta);
  v_white_new_rating := greatest(0, v_white_rating + v_white_delta);

  -- ─── 4. アイコンの計算と新規獲得（差分）の抽出 ──────────────────
  -- ⚫️の新しい全獲得可能アイコンを計算
  if new.board_size = 9 then
    v_black_updated_icons := private.calculate_icons(v_black_new_rating, v_black_rating_other);
  else
    v_black_updated_icons := private.calculate_icons(v_black_rating_other, v_black_new_rating);
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
    v_white_updated_icons := private.calculate_icons(v_white_new_rating, v_white_rating_other);
  else
    v_white_updated_icons := private.calculate_icons(v_white_rating_other, v_white_new_rating);
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

  -- ─── 5. テーブルの更新 ────────────────────────────
  -- ⚫️の更新（人間の場合）
  if not v_is_black_bot then
    update private.user_stats set
      wins      = wins + v_black_win_inc,
      losses    = losses + v_black_loss_inc,
      draws     = draws + v_black_draw_inc,
      rating    = v_black_new_rating,
      giantkill = v_black_giantkill
    where uid = new.black_uid and board_size = new.board_size;

    update private.profiles set
      acquired_icons = v_black_updated_icons
    where uid = new.black_uid;
  else
    -- botの場合の勝敗数更新
    update private.user_stats set
      wins   = wins + v_black_win_inc,
      losses = losses + v_black_loss_inc,
      draws  = draws + v_black_draw_inc
    where uid = new.black_uid and board_size = new.board_size;
  end if;

  -- ⚪️の更新（人間の場合）
  if not v_is_white_bot then
    update private.user_stats set
      wins      = wins + v_white_win_inc,
      losses    = losses + v_white_loss_inc,
      draws     = draws + v_white_draw_inc,
      rating    = v_white_new_rating,
      giantkill = v_white_giantkill
    where uid = new.white_uid and board_size = new.board_size;

    update private.profiles set
      acquired_icons = v_white_updated_icons
    where uid = new.white_uid;
  else
    -- botの場合の勝敗数更新
    update private.user_stats set
      wins   = wins + v_white_win_inc,
      losses = losses + v_white_loss_inc,
      draws  = draws + v_white_draw_inc
    where uid = new.white_uid and board_size = new.board_size;
  end if;

  -- ─── 6. recordsにinsert ─────────────────────────────────
  insert into private.records (
    id, 
    black_uid, white_uid,
    moves,
    result,
    black_rating, white_rating,
    match_type, board_size,
    dead_stones,
    created_at
  ) values (
    new.id, 
    new.black_uid, new.white_uid,
    new.moves,
    new.result,
    v_black_rating, v_white_rating,
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
        'new_rating', v_black_new_rating,
        'acquired_icons', v_black_new_icons
      ),
      'white', jsonb_build_object(
        'delta', v_white_delta,
        'new_rating', v_white_new_rating,
        'acquired_icons', v_white_new_icons
      )
    ),
    'rating_updated', -- イベント名
    'game:' || new.id::text, -- gameChannelにまとめるにゃ
    false
  );

  -- ─── 8. matchesからdelete ───────────────────────────────
  delete from private.matches m where m.id = new.id;
  return null;
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
  v_opp_rating     smallint := 0;
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

  -- ★新しい user_stats テーブルから、対象の盤サイズのポイントを取得する
  if v_opp_profile.uid is not null then
    select coalesce(rating, 0)
      into v_opp_rating
      from private.user_stats
     where uid = v_opp_profile.uid
       and board_size = p_match.board_size;
  end if;

  return jsonb_build_object(
    'match_id',       p_match.id,
    'board_size',     p_match.board_size,
    'match_type',     p_match.match_type,
    'moves',          coalesce(to_jsonb(p_match.moves), '[]'::jsonb),
    'my_color',       case when v_is_black then 'black' else 'white' end,
    'opp_rating',     coalesce(v_opp_rating, 0),
    'opp_username',   v_opp_profile.username,
    'opp_icon_index', v_opp_profile.icon_index,
    'my_seconds',     case when v_is_black then p_match.black_seconds else p_match.white_seconds end,
    'opp_seconds',    case when v_is_black then p_match.white_seconds else p_match.black_seconds end,
    'bot_match',      (coalesce(v_black_profiles.is_bot, false) or coalesce(v_white_profiles.is_bot, false))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_icons (
  p_rating9  smallint,
  p_rating13 smallint
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
    private.rating_to_rank_index(p_rating9),
    private.rating_to_rank_index(p_rating13)
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
  p_rating     smallint,
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
  v_rank := private.rating_to_rank_index(p_rating);

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

CREATE OR REPLACE FUNCTION private.handle_new_profile()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- ① user_settings を自動作成（デフォルト値で作成される）
  insert into private.user_settings (uid)
  values (new.uid);

  -- ② user_stats を自動作成（9路盤と13路盤の初期データをあらかじめ作っておく）
  insert into private.user_stats (uid, board_size)
  values 
    (new.uid, 9),
    (new.uid, 13);

  return new;
end;
$function$;

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
  new.black_seconds := case new.board_size when 13 then 305 else 185 end;
  new.white_seconds := case new.board_size when 13 then 305 else 185 end;

  -- profiles 取得（各1回のみ）
  select * into v_black
  from private.profiles
  where uid = new.black_uid;

  select * into v_white
  from private.profiles
  where uid = new.white_uid;

  -- ★ 新しい user_stats テーブルから、対象の盤サイズに応じたポイントを取得するにゃ
  select coalesce(rating, 0) into v_black_rating
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0) into v_white_rating
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  -- bot 判定（追加SELECTなし）
  v_bot_match := (coalesce(v_black.is_bot, false) or coalesce(v_white.is_bot, false));

  -- サブスク通知
  v_black_payload := jsonb_build_object(
    'match_id',        new.id,
    'board_size',      new.board_size,
    'match_type',      new.match_type,
    'moves',           coalesce(to_jsonb(new.moves), '[]'::jsonb),
    'my_color',        'black',
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

CREATE OR REPLACE FUNCTION private.rating_to_rank_index (
  p_rating smallint
)
  RETURNS smallint
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select cast(greatest(0, (
    select count(*) - 1
    from (values
      (0), (20), (60), (120), (200), (300), (420), (560), (720), -- 10k ~ 2k
       (900), (1100), (1300), (1500), (1700), (1900), (2100), (2300), (2500) -- 1k ~ 8D
    ) as t(threshold)
    where threshold <= p_rating
  )) as smallint);
$function$;

CREATE OR REPLACE FUNCTION private.try_match_all (
  p_board_size smallint
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_waiter           record;
  v_opponent         record;
  v_bot_uid          uuid;
  v_waiter_profile   record;
  v_waiter_rating    smallint := 0;
  v_allow_bot_match  boolean := true;
  v_rating_diff      smallint;
  v_match_id         smallint;
  v_match_type       smallint;
  v_human_is_black   boolean;
begin
  -- 🛡️アーリーリターン: 誰も並んでないなら何もせず終了
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

    -- ★ 新しい user_stats テーブルから対象盤サイズのポイントを取得するにゃ
    select coalesce(rating, 0)
      into v_waiter_rating
      from private.user_stats
     where uid = v_waiter.player_uid
       and board_size = p_board_size;

    -- ★ 新しい user_settings テーブルからボット対戦許可フラグを取得するにゃ
    select coalesce(allow_bot_match, true)
      into v_allow_bot_match
      from private.user_settings
     where uid = v_waiter.player_uid;

    -- 🤖🤖🤖 ボット戦分岐 🤖🤖🤖
    if v_waiter.try_count >= 3 and v_allow_bot_match then
      -- 対戦ボットとmatch_typeを取得する
      select o_bot_uid, o_match_type
      into v_bot_uid, v_match_type
      from private.get_bot_match_info(v_waiter_rating, p_board_size);

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
    v_rating_diff := least(v_waiter.try_count::int * 300, 1000)::smallint; -- 1000は最大ポイント差。

    -- ★ user_stats と JOIN して相手のポイントを直接比較するように書き換えたにゃ
    select wl.* into v_opponent
    from private.waitlist wl
    join private.user_stats us on us.uid = wl.player_uid and us.board_size = p_board_size
    where wl.player_uid != v_waiter.player_uid
      and wl.board_size = p_board_size
      and abs(us.rating - v_waiter_rating) <= v_rating_diff
    order by abs(us.rating - v_waiter_rating) asc
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

CREATE OR REPLACE FUNCTION public.delete_user_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  calling_uid uuid;
BEGIN
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
      v_username := 'player_' || substr(md5(random()::text), 1, 5);

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
    AND (p_before_id IS NULL OR r.id < p_before_id)
  ORDER BY r.id DESC
  LIMIT p_limit;
END;
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
  -- 🐱 メンテチェック
  PERFORM private.check_maintenance();

  -- ★ private.profiles ではなく private.user_settings を更新する
  UPDATE private.user_settings
  SET allow_bot_match = new_allow_bot_match
  WHERE uid = auth.uid();
END;
$function$;

ALTER TABLE "private"."profiles"
  ADD CONSTRAINT "profiles_uid_fkey" FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "private"."user_settings"
  ADD CONSTRAINT "user_settings_uid_fkey" FOREIGN KEY (uid) REFERENCES private.profiles(uid) ON DELETE CASCADE;

ALTER TABLE "private"."user_stats"
  ADD CONSTRAINT "user_stats_uid_fkey" FOREIGN KEY (uid) REFERENCES private.profiles(uid) ON DELETE CASCADE;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON private.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_profile();

CREATE POLICY "delete: 自分なら許可" ON "private"."user_settings"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = uid));

CREATE POLICY "insert: 自分なら許可" ON "private"."user_settings"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = uid));

CREATE POLICY "select: 自分なら許可" ON "private"."user_settings"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = uid));

CREATE POLICY "update: 自分なら許可" ON "private"."user_settings"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = uid))
  WITH CHECK ((auth.uid() = uid));

CREATE POLICY "delete: 自分なら許可" ON "private"."user_stats"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = uid));

CREATE POLICY "insert: 自分なら許可" ON "private"."user_stats"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = uid));

CREATE POLICY "select: 全員許可" ON "private"."user_stats"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "update: 自分なら許可" ON "private"."user_stats"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = uid))
  WITH CHECK ((auth.uid() = uid));

GRANT EXECUTE ON FUNCTION "private"."calculate_icons"(smallint, smallint) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."get_bot_match_info"(smallint, smallint) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."handle_new_profile"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."rating_to_rank_index"(smallint) TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_rankings"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_rankings"() TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."get_records_newer"(uuid, smallint, smallint, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_records_newer"(uuid, smallint, smallint, integer) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_records_older"(uuid, smallint, smallint, integer) TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."user_settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."user_stats" TO "postgres";
