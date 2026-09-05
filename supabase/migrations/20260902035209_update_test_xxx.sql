SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.time_connection_check()
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  rec record; -- playing内にあるmatchが一つずつ入る。
  v_is_black_bot boolean; -- ⚫️がbotかどうか
  v_is_white_bot boolean; -- ⚪️がbotかどうか
begin
  -- playing内にあるmatchを一つずつ見ていく
  for rec in
    select *
    from private.matches m
    where m.status = 'playing'
  loop
  
    -- ⚫️がbotかどうか
    v_is_black_bot := private.is_bot_uid(rec.black_uid);
    -- ⚪️がbotかどうか
    v_is_white_bot := private.is_bot_uid(rec.white_uid);

    -- ------------------------------
    -- 時間切れ判定
    -- ------------------------------
    if (not v_is_black_bot) and -- ⚫️がボットではなく、
      rec.turn = 'black' and -- ⚫️の番で、
      rec.black_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚫️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update private.matches
      set status = 'finished',
          result = 'W+T'
      where matches.id = rec.id;

    elsif (not v_is_white_bot) and -- ⚪️がボットではなく、
      rec.turn = 'white' and -- ⚪️の番で、
      rec.white_seconds - extract(epoch from (now() - rec.turn_switched_at)) < 0 then -- ⚪️の残り時間 - (現在時刻-手番切替時刻) < 0なら
      update private.matches
      set status = 'finished',
          result = 'B+T'
      where matches.id = rec.id;

    -- ------------------------------
    -- 接続切れ判定
    -- ------------------------------
    elsif (not v_is_black_bot) -- ⚫️がボットではなく、
       and rec.black_last_seen is not null
       and extract(epoch from (now() - rec.black_last_seen)) > 30 then -- ⚫️の最後のハートビートから30秒以上経っているなら
      update private.matches
      set status = 'finished',
          result = 'W+C'
      where matches.id = rec.id;

    elsif (not v_is_white_bot) -- ⚪️がボットではなく、
       and rec.white_last_seen is not null
       and extract(epoch from (now() - rec.white_last_seen)) > 30 then -- ⚪️の最後のハートビートから30秒以上経っているなら
      update private.matches
      set status = 'finished',
          result = 'B+C'
      where matches.id = rec.id;
    end if;
  end loop;

  -- ------------------------------
  -- 放置されたpending状態の対局判定
  -- ------------------------------
  -- pending状態のまま一定時間動きがない対局を、強制的に確定させる。
  -- 片方だけ結果が届いていればその結果を採用(coalesce)、
  -- 誰も届いていなければ引き分け(draw)。
  -- どちらの場合もarchive_playing側は新規のresultフォーマットに対応済み
  -- (B+/W+以外は自動的にdelta=0扱いになるので、drawは無条件で成立する)
  update private.matches
  set
    status = 'finished',
    result = coalesce(result, 'DRAW')
  where status = 'pending'
    and turn_switched_at < now() - interval '30 seconds';

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
  if not exists (select 1 from private.waitlist where board_size = p_board_size) then
    return; -- 誰も並んでないなら何もせず秒で帰る
  end if;
  for v_waiter in
    select * from private.waitlist wl
    where wl.board_size = p_board_size
    order by wl.try_count desc
  loop
    if not exists (select 1 from private.waitlist wl where wl.player_uid = v_waiter.player_uid) then
      continue;
    end if;

    select * into v_waiter_profile from private.profiles pf where pf.uid = v_waiter.player_uid;

    v_waiter_points := case
      when p_board_size = 13 then v_waiter_profile.points_13
      else v_waiter_profile.points_9
    end;

    -- ⬜️ ボット戦分岐 ⬜️
    if v_waiter.try_count >= 10 and v_waiter_profile.allow_bot_match then --- v_waiter.try_count >= 10に戻す🔥🔥🔥🔥🔥🔥🔥🔥
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

    -- ⬜️ 人間戦分岐（match_typeは常に0＆白黒ランダム） ⬜️
    v_points_diff := least(v_waiter.try_count::int * 100, 32000)::smallint;

    select wl.* into v_opponent
    from private.waitlist wl
    join private.profiles pf on pf.uid = wl.player_uid
    where wl.player_uid != v_waiter.player_uid
      and wl.board_size = p_board_size
      and abs(
        case when p_board_size = 13 then pf.points_13 else pf.points_9 end
        - v_waiter_points
      ) <= v_points_diff
    order by wl.try_count asc
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
      set try_count = least(try_count + 1, 32000)
      where waitlist.player_uid = v_waiter.player_uid;
    end if;
  end loop;
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
  guest_row private.profiles;
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

  SELECT * INTO guest_row FROM private.profiles WHERE uid = p_guest_uid;
  IF guest_row.uid IS NULL THEN
    RAISE EXCEPTION 'guest_profile_not_found';
  END IF;

  -- 先にゲスト側を削除(usernameのユニーク制約に引っかからないようにするため)
  DELETE FROM private.profiles WHERE uid = p_guest_uid;

  -- 🌟 対局記録(records)のuid付け替え。
  -- 順番が重要: 先に「既存アカウント時代」の対局を退会者扱い(NULL)にし、
  -- その後で「ゲスト時代」の対局を生き残るcalling_uidに引き継がせる。
  -- 逆順にすると、引き継いだ直後の行まで巻き込んでNULLにしてしまう。

  -- ① 既存アカウント(calling_uid)時代の対局 → 退会者扱い(NULL)
  UPDATE private.records SET black_uid = NULL WHERE black_uid = calling_uid;
  UPDATE private.records SET white_uid = NULL WHERE white_uid = calling_uid;

  -- ② ゲスト(p_guest_uid)時代の対局 → 生き残るcalling_uidに引き継ぎ
  UPDATE private.records SET black_uid = calling_uid WHERE black_uid = p_guest_uid;
  UPDATE private.records SET white_uid = calling_uid WHERE white_uid = p_guest_uid;

  DELETE FROM auth.users WHERE id = p_guest_uid;

  -- 呼び出し元(古いアカウント)の中身を、ゲストの内容で上書きする
  UPDATE private.profiles
  SET
    username = guest_row.username,
    points_9 = guest_row.points_9,
    points_13 = guest_row.points_13,
    icon_index = guest_row.icon_index,
    games_9 = guest_row.games_9,
    games_13 = guest_row.games_13,
    giantkill_9 = guest_row.giantkill_9,
    giantkill_13 = guest_row.giantkill_13,
    allow_bot_match = guest_row.allow_bot_match
  WHERE uid = calling_uid;
END;
$function$;
