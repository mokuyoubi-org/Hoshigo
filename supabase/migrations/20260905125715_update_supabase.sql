SET local check_function_bodies = off;

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
    'opp_uid',        v_opp_profile.uid,
    'opp_rating',     coalesce(v_opp_rating, 0),
    'opp_username',   v_opp_profile.username,
    'opp_icon_index', v_opp_profile.icon_index,
    'my_seconds',     case when v_is_black then p_match.black_seconds else p_match.white_seconds end,
    'opp_seconds',    case when v_is_black then p_match.white_seconds else p_match.black_seconds end,
    'bot_match',      (coalesce(v_black_profiles.is_bot, false) or coalesce(v_white_profiles.is_bot, false))
  );
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
