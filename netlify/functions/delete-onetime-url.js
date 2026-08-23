import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "id is required" }),
      };
    }

    // 子レコード(otp_codes)を先に削除 — サービスロールキーでRLSをバイパス
    const { error: otpError } = await supabase
      .from("otp_codes")
      .delete()
      .eq("onetime_id", id);

    if (otpError) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OTPコードの削除に失敗しました: " + otpError.message }),
      };
    }

    // 親レコード(onetime_url_manage)を削除
    const { error: urlError } = await supabase
      .from("onetime_url_manage")
      .delete()
      .eq("id", id);

    if (urlError) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "URLの削除に失敗しました: " + urlError.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
