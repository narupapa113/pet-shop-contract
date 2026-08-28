import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { id } = await req.json();

    if (!id) return json({ error: "id is required" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 子レコード(otp_codes)を先に削除 — サービスロールキーでRLSをバイパス
    const { error: otpError } = await supabaseAdmin
      .from("otp_codes")
      .delete()
      .eq("onetime_id", id);

    if (otpError) return json({ error: "OTPコードの削除に失敗しました: " + otpError.message }, 500);

    // 親レコード(onetime_url_manage)を削除
    const { error: urlError } = await supabaseAdmin
      .from("onetime_url_manage")
      .delete()
      .eq("id", id);

    if (urlError) return json({ error: "URLの削除に失敗しました: " + urlError.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
