// email.ts

// OTPメールの文面を、言語別に用意する。

export type Locale = "ja" | "en" | "ko" | "zh";

type Template = { subject: string; intro: string };

const templates: Record<Locale, Template> = {
  en: {
    subject: "Your verification code",
    intro: "Enter this code in the app to confirm your email:",
  },
  ja: {
    subject: "認証コード",
    intro: "アプリに次のコードを入力して、メールアドレスを確認してください。",
  },
  ko: {
    subject: "인증 코드",
    intro: "앱에 아래 코드를 입력하여 이메일을 확인해 주세요.",
  },
  zh: {
    subject: "验证码",
    intro: "请在应用中输入以下验证码，以确认您的邮箱：",
  },
};

// ヘッダーの言語(例: "ja-JP", "zh-Hant-TW")から、対応している言語を選ぶ。
// 知らない言語は、英語にする。
export function pickLocale(header: string | null | undefined): Locale {
  const tag = (header ?? "").split(",")[0].split(";")[0].trim().toLowerCase();

  if (tag.startsWith("ja")) return "ja";
  if (tag.startsWith("ko")) return "ko";
  if (tag.startsWith("zh")) return "zh";
  return "en";
}

// 言語とOTPから、メールの件名と本文を作る。
export function buildOtpEmail(locale: Locale, otp: string) {
  const t = templates[locale];
  return {
    subject: t.subject,
    html: `<p>${t.intro}</p><h1>${otp}</h1>`,
  };
}
