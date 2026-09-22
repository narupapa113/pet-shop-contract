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

    const { onetimeId, status, deviceToken, customerId } = await req.json();

    if (!onetimeId || status === undefined || !deviceToken) {
      return new Response(
        JSON.stringify({ error: "onetimeId, status and deviceToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: urlRow, error: fetchError } = await supabase
      .from("onetime_url_manage")
      .select("id, device_token")
      .eq("id", onetimeId)
      .maybeSingle();

    if (fetchError || !urlRow) {
      return new Response(
        JSON.stringify({ error: "URLが見つかりません" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!urlRow.device_token || urlRow.device_token !== deviceToken) {
      return new Response(
        JSON.stringify({ error: "デバイス認証エラー: この端末では操作できません" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updateFields: Record<string, unknown> = {
      status,
      update_at: new Date().toISOString(),
    };
    if (customerId !== undefined) {
      updateFields.customer_id = customerId;
    }

    const { error: updateError } = await supabase
      .from("onetime_url_manage")
      .update(updateFields)
      .eq("id", onetimeId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
