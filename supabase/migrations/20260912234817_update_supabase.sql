SET local check_function_bodies = off;

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

REVOKE ALL ON FUNCTION "public"."delete_guest_after_existing_selected"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."delete_guest_after_existing_selected"(uuid) TO "anon", "authenticated", "postgres", "service_role";
