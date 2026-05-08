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

    const { sessionKey, flowId, requiredVideoIds } = await req.json();

    if (!sessionKey || !Array.isArray(requiredVideoIds) || requiredVideoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "sessionKey and requiredVideoIds are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: sessions, error: fetchError } = await supabase
      .from("video_watch_sessions")
      .select("video_id, completed")
      .eq("session_key", sessionKey)
      .eq("flow_id", flowId ?? "")
      .eq("completed", true);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const completedIds = (sessions ?? []).map((s: { video_id: string }) => s.video_id);
    const allCompleted = requiredVideoIds.every((id: string) => completedIds.includes(id));

    if (!allCompleted) {
      return new Response(
        JSON.stringify({ error: "Not all required videos completed on server" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("completion_tokens").insert({
      token,
      session_key: sessionKey,
      flow_id: flowId ?? "",
      expires_at: expiresAt,
    });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ token, expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
