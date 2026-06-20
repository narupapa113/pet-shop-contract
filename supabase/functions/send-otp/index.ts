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

    const { onetimeId, phone } = await req.json();

    if (!onetimeId || !phone) {
      return new Response(
        JSON.stringify({ error: "onetimeId and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: urlRow } = await supabase
      .from("onetime_url_manage")
      .select("id, send_to")
      .eq("id", onetimeId)
      .maybeSingle();

    if (!urlRow) {
      return new Response(
        JSON.stringify({ error: "Invalid onetime URL" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6桁コード生成
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").insert({
      onetime_id: onetimeId,
      phone,
      code,
      expires_at: expiresAt,
    });

    // 実際のSMS送信はここで行う（Twilio等）
    console.log(`OTP for ${phone}: ${code}`);

    return new Response(
      JSON.stringify({ ok: true, message: "OTPを送信しました", devCode: code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
