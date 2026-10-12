// BetterAuthTestScreen.tsx

import { useColors } from "@/src/hooks/common/useTheme";
import { useLang } from "@/src/i18n/LangProvider";
import { authClient } from "@/src/services/auth/auth-client";
import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { TurnstileHandle, TurnstileWidget } from "turnstile-widget";

export default function BetterAuthTestScreen() {
    const gameWsRef = useRef<WebSocket | null>(null);
  const matchRef = useRef<{ match_id: string; my_color: string } | null>(null);
  const moveNoRef = useRef(0);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const pushLog = (line: string) =>
    setGameLog((prev) => [...prev.slice(-14), line]);
  const wsRef = useRef<WebSocket | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const { lang } = useLang();
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState("まだ何もしていません");
  const [rpcName, setRpcName] = useState("get_my_profile");
  const [rpcArgs, setRpcArgs] = useState("{}");
  // 合格証を取って、サーバーに渡すヘッダーを作る
  const buildHeaders = async () => {
    const token = await turnstileRef.current?.getToken();
    if (!token) {
      throw new Error("Turnstileトークンを取得できませんでした");
    }
    return { "x-captcha-response": token, "x-app-language": lang };
  };

  const show = (label: string, value: unknown) => {
    setResult(`${label}\n${JSON.stringify(value, null, 2)}`);
  };

  const onGuest = async () => {
    try {
      const headers = await buildHeaders();
      const res = await authClient.signIn.anonymous({
        fetchOptions: { headers },
      });
      show("ゲストログイン", res);
    } catch (e) {
      show("ゲストログイン(例外)", String(e));
    }
  };

  const onSendOtp = async () => {
    try {
      const headers = await buildHeaders();
      const res = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
        fetchOptions: { headers },
      });
      show("OTP送信", res);
    } catch (e) {
      show("OTP送信(例外)", String(e));
    }
  };

  const onVerifyOtp = async () => {
    try {
      const res = await authClient.signIn.emailOtp({ email, otp });
      show("OTP確認", res);
    } catch (e) {
      show("OTP確認(例外)", String(e));
    }
  };

  const onSession = async () => {
    try {
      const res = await authClient.getSession();
      show("いまのセッション", res);
    } catch (e) {
      show("セッション取得(例外)", String(e));
    }
  };

  const onRpc = async () => {
    try {
      // スマホ(金庫あり)のときだけ、cookieを手で取り出す。
      // Webでは、ブラウザが自動で持ち歩く(credentials: "include")ので、不要。
      const cookie = Platform.OS === "web" ? "" : await authClient.getCookie();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rpc/${rpcName}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-app-version": "1.0.5",
            "x-ota-version": "261003.1",
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: rpcArgs,
        },
      );
      show(`RPC: ${rpcName}`, { status: res.status, body: await res.json() });
    } catch (e) {
      show(`RPC: ${rpcName}(例外)`, String(e));
    }
  };

  // 待機列(9路)につなぐ
  const onQueueJoin = async () => {
    try {
      wsRef.current?.close();
      const base = process.env.EXPO_PUBLIC_API_URL!.replace(/^http/, "ws");
      const cookie = Platform.OS === "web" ? "" : await authClient.getCookie();

      // スマホ用のWebSocketは、3つめの引数(ヘッダー)を受け取れるが、
      // 型の定義には書かれていないので、ここで型を教える。
      const WS = WebSocket as unknown as new (
        url: string,
        protocols?: string | string[] | null,
        options?: { headers?: Record<string, string> },
      ) => WebSocket;

      // Webではヘッダーが付けられないので、バージョンは URL に付ける。
      // スマホでは、cookieを、ヘッダーで渡す。
      const ws = new WS(
        `${base}/ws/queue/9?v=1.0.5&ota=261003.1`,
        undefined,
        cookie ? { headers: { Cookie: cookie } } : undefined,
      );
      wsRef.current = ws;
      ws.onopen = () => show("待機列", "つながったよ");
            ws.onmessage = (e) => {
        show("待機列(受信)", String(e.data));
        // マッチしたら、対局の情報を覚えておく(次の「対局の部屋につなぐ」で使う)
        try {
          const data = JSON.parse(String(e.data));
          if (data.type === "matched") matchRef.current = data.match;
        } catch {
          // 読めないメッセージは、無視する
        }
      };
      ws.onclose = (e) =>
        show("待機列(切断)", { code: e.code, reason: e.reason });
      ws.onerror = () => show("待機列(エラー)", "つながらなかったよ");
    } catch (e) {
      show("待機列(例外)", String(e));
    }
  };

  // 待機をやめる
  const onQueueCancel = () => {
    wsRef.current?.send(JSON.stringify({ type: "cancel" }));
  };

    // 対局の部屋につなぐ(待機列で、マッチしたあと)
  const onGameJoin = async () => {
    const match = matchRef.current;
    if (!match) {
      pushLog("先に、⑥でマッチしてください");
      return;
    }
    try {
      gameWsRef.current?.close();
      const base = process.env.EXPO_PUBLIC_API_URL!.replace(/^http/, "ws");
      const cookie =
        Platform.OS === "web" ? "" : await authClient.getCookie();
      const WS = WebSocket as unknown as new (
        url: string,
        protocols?: string | string[] | null,
        options?: { headers?: Record<string, string> },
      ) => WebSocket;
      const ws = new WS(
        `${base}/ws/game/${match.match_id}?v=1.0.5&ota=261003.1`,
        undefined,
        cookie ? { headers: { Cookie: cookie } } : undefined,
      );
      gameWsRef.current = ws;
      ws.onopen = () => pushLog(`つながったよ(自分は ${match.my_color})`);
      ws.onmessage = (e) => pushLog(String(e.data));
      ws.onclose = (e) => pushLog(`切断 code=${e.code} reason=${e.reason}`);
      ws.onerror = () => pushLog("エラー");
    } catch (e) {
      pushLog(`例外 ${String(e)}`);
    }
  };

  const sendGame = (payload: object) =>
    gameWsRef.current?.send(JSON.stringify(payload));
  // 手の番号は、押すたびに増える(盤面のルールは、サーバーは見ないので、何でもよい)
  const onMove = () => sendGame({ type: "move", move: moveNoRef.current++ });
  const onBotMove = () =>
    sendGame({ type: "move", move: moveNoRef.current++, bot: true });
  const onPass = () => sendGame({ type: "move", move: -1 });
  const onBotPass = () => sendGame({ type: "move", move: -1, bot: true });
  const onResign = () => sendGame({ type: "resign" });
  const onSubmitResult = () =>
    sendGame({ type: "submit_result", result: "B+3.5" });

  return (
    <>
      <TurnstileWidget
        ref={turnstileRef}
        sitekey={process.env.EXPO_PUBLIC_TURNSTILE_SITEKEY!}
        bgColor={colors.background}
        textColor={colors.text}
        spinnerColor={colors.primary}
        spinnerTrackColor={colors.backgroundStrong}
        lang={lang}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingTop: 80, gap: 12 }}
      >
        <Pressable onPress={onGuest}>
          <Text style={{ color: colors.text }}>① ゲストログイン</Text>
        </Pressable>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ color: colors.text, borderWidth: 1, padding: 8 }}
        />
        <Pressable onPress={onSendOtp}>
          <Text style={{ color: colors.text }}>② OTPを送る</Text>
        </Pressable>

        <TextInput
          value={otp}
          onChangeText={setOtp}
          placeholder="OTP(6桁)"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          style={{ color: colors.text, borderWidth: 1, padding: 8 }}
        />
        <Pressable onPress={onVerifyOtp}>
          <Text style={{ color: colors.text }}>③ OTPで確認する</Text>
        </Pressable>

        <Pressable onPress={onSession}>
          <Text style={{ color: colors.text }}>④ いまのセッションを見る</Text>
        </Pressable>

        <TextInput
          value={rpcName}
          onChangeText={setRpcName}
          placeholder="RPCの名前"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ color: colors.text, borderWidth: 1, padding: 8 }}
        />
        <TextInput
          value={rpcArgs}
          onChangeText={setRpcArgs}
          placeholder='引数(JSON) 例: {"new_username":"abc"}'
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ color: colors.text, borderWidth: 1, padding: 8 }}
        />
        <Pressable onPress={onRpc}>
          <Text style={{ color: colors.text }}>⑤ RPCを呼ぶ</Text>
        </Pressable>

        <Pressable onPress={onQueueJoin}>
          <Text style={{ color: colors.text }}>⑥ 待機列につなぐ(9路)</Text>
        </Pressable>
        <Pressable onPress={onQueueCancel}>
          <Text style={{ color: colors.text }}>⑦ 待機をやめる</Text>
        </Pressable>



                <Pressable onPress={onGameJoin}>
          <Text style={{ color: colors.text }}>⑧ 対局の部屋につなぐ</Text>
        </Pressable>
        <Pressable onPress={onMove}>
          <Text style={{ color: colors.text }}>⑨ 自分が打つ</Text>
        </Pressable>
        <Pressable onPress={onBotMove}>
          <Text style={{ color: colors.text }}>⑩ ボットとして打つ</Text>
        </Pressable>
        <Pressable onPress={onPass}>
          <Text style={{ color: colors.text }}>⑪ 自分がパス</Text>
        </Pressable>
        <Pressable onPress={onBotPass}>
          <Text style={{ color: colors.text }}>⑫ ボットとしてパス</Text>
        </Pressable>
        <Pressable onPress={onResign}>
          <Text style={{ color: colors.text }}>⑬ 投了</Text>
        </Pressable>
        <Pressable onPress={onSubmitResult}>
          <Text style={{ color: colors.text }}>⑭ 結果を送る(B+3.5)</Text>
        </Pressable>
        <Text style={{ color: colors.text }}>{gameLog.join("\n")}</Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text }}>{result}</Text>
        </View>
      </ScrollView>
    </>
  );
}
