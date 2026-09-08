SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.archive_matches()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_black_delta smallint := 0;
  v_white_delta smallint := 0;
  v_black_games smallint;
  v_white_games smallint;
  v_is_black_bot boolean;
  v_is_white_bot boolean;
  v_black_rating smallint;
  v_white_rating smallint;
  v_black_giantkill smallint := 0;
  v_white_giantkill smallint := 0;
  v_black_new_rating smallint;
  v_white_new_rating smallint;

  -- 勝敗・引き分けインクリメント用
  v_black_win_inc smallint := 0;
  v_black_loss_inc smallint := 0;
  v_black_draw_inc smallint := 0;
  v_white_win_inc smallint := 0;
  v_white_loss_inc smallint := 0;
  v_white_draw_inc smallint := 0;

  -- 反対側盤サイズの保持
  v_black_rating_other smallint := 0;
  v_white_rating_other smallint := 0;

  -- アイコン関連
  v_black_old_icons smallint[];
  v_white_old_icons smallint[];
  v_black_updated_icons smallint[];
  v_white_updated_icons smallint[];
  v_black_new_icons smallint[] := '{}';
  v_white_new_icons smallint[] := '{}';

  v_other_board_size smallint;
  v_calc_res record;
begin
  v_other_board_size := case when new.board_size = 9 then 13 else 9 end;

  -- ─── 1. プロフィール＆戦績情報の取得 ─────────────────────────────
  -- 黒（⚫️）
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_black_bot, v_black_old_icons
  from private.profiles
  where uid = new.black_uid;

  select coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giantkill, 0)
  into v_black_games, v_black_rating, v_black_giantkill
  from private.user_stats
  where uid = new.black_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_black_rating_other
  from private.user_stats
  where uid = new.black_uid and board_size = v_other_board_size;

  -- 白（⚪️）
  select is_bot, coalesce(acquired_icons, '{0}'::smallint[])
  into v_is_white_bot, v_white_old_icons
  from private.profiles
  where uid = new.white_uid;

  select coalesce(wins + losses + draws, 0), coalesce(rating, 0), coalesce(giantkill, 0)
  into v_white_games, v_white_rating, v_white_giantkill
  from private.user_stats
  where uid = new.white_uid and board_size = new.board_size;

  select coalesce(rating, 0)
  into v_white_rating_other
  from private.user_stats
  where uid = new.white_uid and board_size = v_other_board_size;

-- ─── 2. 勝敗判定と計算処理 ─────────────────────────────────
  if new.result like 'B+%' then
    v_black_win_inc := 1;
    v_white_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      v_black_rating, v_white_rating, v_black_giantkill, v_black_games, 
      (v_is_black_bot or v_is_white_bot) -- 【ここ！】どちらかがBotなら true
    );
    v_black_delta      := v_calc_res.o_winner_delta;
    v_white_delta      := v_calc_res.o_loser_delta;
    v_black_giantkill  := v_calc_res.o_winner_giantkill;
    v_white_giantkill  := v_calc_res.o_loser_giantkill;

  elsif new.result like 'W+%' then
    v_white_win_inc := 1;
    v_black_loss_inc := 1;

    v_calc_res := private.calculate_match_delta(
      v_white_rating, v_black_rating, v_white_giantkill, v_white_games, 
      (v_is_black_bot or v_is_white_bot) -- 【ここ！】どちらかがBotなら true
    );
    v_white_delta      := v_calc_res.o_winner_delta;
    v_black_delta      := v_calc_res.o_loser_delta;
    v_white_giantkill  := v_calc_res.o_winner_giantkill;
    v_black_giantkill  := v_calc_res.o_loser_giantkill;

else
    v_black_draw_inc := 1;
    v_white_draw_inc := 1;

    v_calc_res := private.calculate_draw_delta(
      v_black_rating, 
      v_white_rating, 
      (v_is_black_bot or v_is_white_bot) -- 【ここ！】どちらかがBotなら true
    );
    v_black_delta := v_calc_res.o_black_delta;
    v_white_delta := v_calc_res.o_white_delta;
  end if;

  -- 新レート計算
  v_black_new_rating := greatest(0, v_black_rating + v_black_delta);
  v_white_new_rating := greatest(0, v_white_rating + v_white_delta);

  -- ─── 3. アイコン獲得計算 ─────────────────────────────────
  if new.board_size = 9 then
    v_calc_res := private.calculate_new_icons(v_black_old_icons, v_black_new_rating, v_black_rating_other);
  else
    v_calc_res := private.calculate_new_icons(v_black_old_icons, v_black_rating_other, v_black_new_rating);
  end if;
  v_black_updated_icons := v_calc_res.o_updated_icons;
  v_black_new_icons     := v_calc_res.o_new_icons;

  if new.board_size = 9 then
    v_calc_res := private.calculate_new_icons(v_white_old_icons, v_white_new_rating, v_white_rating_other);
  else
    v_calc_res := private.calculate_new_icons(v_white_old_icons, v_white_rating_other, v_white_new_rating);
  end if;
  v_white_updated_icons := v_calc_res.o_updated_icons;
  v_white_new_icons     := v_calc_res.o_new_icons;

  -- ─── 4. テーブル更新 ───────────────────────────────────
  -- 黒（⚫️）
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
    update private.user_stats set
      wins   = wins + v_black_win_inc,
      losses = losses + v_black_loss_inc,
      draws  = draws + v_black_draw_inc
    where uid = new.black_uid and board_size = new.board_size;
  end if;

  -- 白（⚪️）
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
    update private.user_stats set
      wins   = wins + v_white_win_inc,
      losses = losses + v_white_loss_inc,
      draws  = draws + v_white_draw_inc
    where uid = new.white_uid and board_size = new.board_size;
  end if;

  -- ─── 5. レコード挿入・リアルタイム通知・削除 ─────────────────
  insert into private.records (
    id, black_uid, white_uid, moves, result,
    black_rating, white_rating, match_type, board_size, dead_stones, created_at
  ) values (
    new.id, new.black_uid, new.white_uid, new.moves, new.result,
    v_black_rating, v_white_rating, new.match_type, new.board_size, new.dead_stones, now()
  ) on conflict (id) do nothing;

perform realtime.send(
    jsonb_build_object(
      'result', new.result,
      'black', jsonb_build_object(
        'delta', case when v_is_black_bot then 0 else v_black_delta end,
        'new_rating', case when v_is_black_bot then v_black_rating else v_black_new_rating end,
        'acquired_icons', case when v_is_black_bot then '{}'::smallint[] else v_black_new_icons end
      ),
      'white', jsonb_build_object(
        'delta', case when v_is_white_bot then 0 else v_white_delta end,
        'new_rating', case when v_is_white_bot then v_white_rating else v_white_new_rating end,
        'acquired_icons', case when v_is_white_bot then '{}'::smallint[] else v_white_new_icons end
      )
    ),
    'rating_updated',
    'game:' || new.id::text,
    false
  );

  delete from private.matches m where m.id = new.id;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_draw_delta (
  p_black_rating smallint,
  p_white_rating smallint,
  p_is_bot_match boolean,
  OUT            o_black_delta smallint,
  OUT            o_white_delta smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint;
begin
  -- Bot戦（どちらかがBot）の場合は変動なし（0pt）
  if p_is_bot_match then
    o_black_delta := 0;
    o_white_delta := 0;
  else
    -- 人間同士の場合: レート差100ごとに±1pt調整
    v_diff := p_white_rating - p_black_rating;

    o_black_delta := (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100;
    o_white_delta := -o_black_delta;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_draw_delta (
  p_black_rating smallint,
  p_white_rating smallint,
  p_is_black_bot boolean,
  p_is_white_bot boolean,
  OUT            o_black_delta smallint,
  OUT            o_white_delta smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint; -- (白のレート - 黒のレート)
begin
  -- Bot戦（どちらかがBot）の場合は変動なし（0pt）
  if p_is_black_bot or p_is_white_bot then
    o_black_delta := 0;
    o_white_delta := 0;
  else
    -- 人間同士の場合: レート差100ごとに±1pt調整
    -- ※ (+50/-50) は四捨五入処理
    v_diff := p_white_rating - p_black_rating;

    -- 黒視点: 相手（白）の方が高ければプラス、低ければマイナス
    o_black_delta := (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100;
    
    -- 白視点: 黒の逆符号（ゼロサム）
    o_white_delta := -o_black_delta;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_match_delta (
  p_winner_rating    smallint,
  p_loser_rating     smallint,
  p_winner_giantkill smallint,
  p_winner_games     smallint,
  p_is_bot_match     boolean,
  OUT                o_winner_delta smallint,
  OUT                o_loser_delta smallint,
  OUT                o_winner_giantkill smallint,
  OUT                o_loser_giantkill smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint;
  v_base_delta smallint;
begin
  v_diff := p_loser_rating - p_winner_rating;

  v_base_delta := greatest(0, least(20,
    10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
  ));

  -- 【変更】シンプルに p_is_bot_match を判定
  if p_is_bot_match then
    if v_diff < 0 then
      null; 
    else
      v_base_delta := 10 ;
    end if;
  end if;

  o_winner_giantkill := p_winner_giantkill + case when v_diff > 0 then 1 else 0 end;

  if v_diff > 0 then
    o_winner_delta := v_base_delta * o_winner_giantkill;
  else
    o_winner_delta := v_base_delta;
  end if;

  o_loser_giantkill := 0;

  if v_diff > 0 and p_winner_games <= 30 then
    o_loser_delta := 0;
  else
    o_loser_delta := -v_base_delta;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_match_delta (
  p_winner_rating    smallint,
  p_loser_rating     smallint,
  p_winner_giantkill smallint,
  p_winner_games     smallint,
  p_is_black_bot     boolean,
  p_is_white_bot     boolean,
  OUT                o_winner_delta smallint,
  OUT                o_loser_delta smallint,
  OUT                o_winner_giantkill smallint,
  OUT                o_loser_giantkill smallint
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_diff smallint;       -- 勝者と敗者のレーティング差（敗者 - 勝者）
  v_base_delta smallint; -- 基準となる計算変動量
begin

-- ─────────────────────────────────────────────────────────────
  -- 1. レーティング差分および基準変動量（v_base_delta）の計算
  -- ─────────────────────────────────────────────────────────────
  -- 敗者と勝者のレート差を算出（正の値であれば格上勝利、負の値であれば格下勝利）
  v_diff := p_loser_rating - p_winner_rating;

  -- 基準変動量を算出（基本値10とし、レート差100ごとに±1調整）
  v_base_delta := greatest(0, least(20,
    10 + (v_diff + case when v_diff >= 0 then 50 else -50 end) / 100
  ));

  -- Bot戦
  if p_is_black_bot or p_is_white_bot then
    if v_diff < 0 then -- ボットを超えるレベルになったら旨みは減るようになる
      null; 
    else
      -- それ以外なら+-10
      v_base_delta := 10 ;
    end if;
  end if;

  -- ─────────────────────────────────────────────────────────────
  -- 2. 勝者側の変動量・格上連勝数の計算
  -- ─────────────────────────────────────────────────────────────
  -- 格上（自分よりレートが高い相手）に勝利した場合、ジャイアントキリングカウントをインクリメント
  o_winner_giantkill := p_winner_giantkill + case when v_diff > 0 then 1 else 0 end;

  -- 格上勝利の場合は「基準変動量 × 格上連勝数」のボーナスを適用
  if v_diff > 0 then
    o_winner_delta := v_base_delta * o_winner_giantkill;
  else
    o_winner_delta := v_base_delta;
  end if;

  -- ─────────────────────────────────────────────────────────────
  -- 3. 敗者側の変動量・格上連勝数の計算
  -- ─────────────────────────────────────────────────────────────
  -- 敗者の格上連勝数はリセット（0に初期化）
  o_loser_giantkill := 0;

  -- 相手の対局数が30以下の場合、相手のレートが適正とは限らないので、負けてもレートは下がらない
  -- つまり、相手が「偽の格下」の場合の保護の仕組み。
  if v_diff > 0 and p_winner_games <= 30 then
    o_loser_delta := 0;
  else
    o_loser_delta := -v_base_delta;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.calculate_new_icons (
  p_old_icons smallint[],
  p_rating_9  smallint,
  p_rating_13 smallint,
  OUT         o_updated_icons smallint[],
  OUT         o_new_icons smallint[]
)
  RETURNS record
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_calculated_icons smallint[];
  v_icon_item smallint;
begin
  o_new_icons := '{}';

  -- レートに基づく獲得可能アイコンの計算
  v_calculated_icons := private.calculate_icons(p_rating_9, p_rating_13);

  -- 今回新しく増えたアイコンの抽出
  foreach v_icon_item in array v_calculated_icons loop
    if not (v_icon_item = any(p_old_icons)) then
      o_new_icons := array_append(o_new_icons, v_icon_item);
    end if;
  end loop;

  -- 既存アイコンと新規獲得アイコンを結合し重複排除
  select array_agg(distinct elem order by elem)
  into o_updated_icons
  from unnest(p_old_icons || v_calculated_icons) as elem;
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

GRANT EXECUTE ON FUNCTION "private"."calculate_draw_delta"(smallint, smallint, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_draw_delta"(smallint, smallint, boolean, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_match_delta"(smallint, smallint, smallint, smallint, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_match_delta"(smallint, smallint, smallint, smallint, boolean, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."calculate_new_icons"(smallint[], smallint, smallint) TO "postgres";
