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

    const { completionToken, signatureDataUrl, contractId, contractName, customerId, videoIds, status, signHistoryId } =
      await req.json();

    if (!completionToken || !signatureDataUrl) {
      return new Response(
        JSON.stringify({ error: "completionToken and signatureDataUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from("completion_tokens")
      .select("id")
      .eq("token", completionToken)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired completion token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("completion_tokens").update({ used: true }).eq("id", tokenRow.id);

    const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const filePath = `signatures/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, binary, { contentType: "image/png" });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nowIso = new Date().toISOString();
    const finalStatus = status ?? 3;

    if (signHistoryId) {
      const { error: updateError } = await supabase.from("sign_history").update({
        sign_customer_id: customerId ?? null,
        sign_path: filePath,
        video_id: Array.isArray(videoIds) ? videoIds : [],
        status: finalStatus,
        status_updated_at: nowIso,
      }).eq("id", signHistoryId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      const { error: historyError } = await supabase.from("sign_history").insert({
        contract_id: contractId ?? null,
        contract_name: contractName ?? null,
        sign_customer_id: customerId ?? null,
        sign_path: filePath,
        video_id: Array.isArray(videoIds) ? videoIds : [],
        status: finalStatus,
        status_updated_at: nowIso,
      });

      if (historyError) {
        return new Response(
          JSON.stringify({ error: historyError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, filePath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
