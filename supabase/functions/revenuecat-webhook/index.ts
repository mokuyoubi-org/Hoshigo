// supabase/functions/revenuecat-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// このイベントの時にis_premium = true
const PREMIUM_EVENTS = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "TRANSFER",
  "NON_SUBSCRIPTION_PURCHASE",
  "SUBSCRIPTION_EXTENDED"
];
// このイベントの時にis_premium = false
const FREE_EVENTS = [
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE"
];
serve(async (req)=>{
  try {
    // 1. POST以外は拒否
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405
      });
    }
    // 2. Authorization headerを検証（セキュリティ）
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error("❌ Unauthorized webhook request");
      return new Response("Unauthorized", {
        status: 401
      });
    }
    // 3. Webhookペイロードを取得
    const payload = await req.json();
    const { event } = payload;
    console.log("📨 RevenueCat Webhook received:", {
      type: event.type,
      app_user_id: event.app_user_id
    });
    // 
    if (event.app_user_id.startsWith("$RCAnonymousID")) {
      console.log("⏭️ Ignoring anonymous user:", event.app_user_id);
      return new Response(JSON.stringify({
        success: true,
        message: "Anonymous user ignored"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // 4. Supabaseクライアントを作成（管理者権限）
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // 5. is_premiumの値を決定
    let is_premium = null;
    if (PREMIUM_EVENTS.includes(event.type)) {
      is_premium = true;
      console.log("✅ Setting is_premium = true");
    } else if (FREE_EVENTS.includes(event.type)) {
      is_premium = false;
      console.log("✅ Setting is_premium = false");
    } else {
      // 関係ないイベントは無視
      console.log("⏭️ Ignoring event type:", event.type);
      return new Response(JSON.stringify({
        success: true,
        message: "Event ignored"
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // 6. app_user_id（= SupabaseのUID）でprofilesを更新
    const { error } = await supabase.schema("users").from("profiles").update({
      is_premium
    }).eq("uid", event.app_user_id);
    if (error) {
      console.error("❌ Supabase update failed:", error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        headers: {
          "Content-Type": "application/json"
        },
        status: 500
      });
    }
    console.log(`✅ Updated is_premium = ${is_premium} for user ${event.app_user_id}`);
    // 7. 成功レスポンス
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
