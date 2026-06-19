import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { onetimeId, phone, code } = await req.json();

    if (!onetimeId || !phone || !code) {
      return new Response(
        JSON.stringify({ error: "onetimeId, phone and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: otpRow } = await supabase
      .from("otp_codes")
      .select("id, code, expires_at, used")
      .eq("onetime_id", onetimeId)
      .eq("phone", phone)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("create_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow || otpRow.code !== code) {
      return new Response(
        JSON.stringify({ error: "コードが正しくないか期限切れです" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("otp_codes").update({ used: true }).eq("id", otpRow.id);

    // ステータスを2（認証済）に更新
    await supabase
      .from("onetime_url_manage")
      .update({ status: 2, update_at: new Date().toISOString() })
      .eq("id", onetimeId);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
