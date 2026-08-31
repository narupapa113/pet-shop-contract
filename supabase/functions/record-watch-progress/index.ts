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

    const { sessionKey, flowId, videoId, watchedSec } = await req.json();

    if (!sessionKey || !videoId) {
      return new Response(
        JSON.stringify({ error: "sessionKey and videoId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // required_sec はクライアントから受け取らず、DBの videos.video_time から取得する
    const { data: videoRow } = await supabase
      .from("videos")
      .select("video_time")
      .eq("id", videoId)
      .maybeSingle();

    const requiredSec = videoRow?.video_time ?? 0;

    const completed = requiredSec > 0 && watchedSec >= requiredSec;

    const { error } = await supabase
      .from("video_watch_sessions")
      .upsert(
        {
          session_key: sessionKey,
          flow_id: flowId ?? "",
          video_id: videoId,
          watched_sec: watchedSec,
          required_sec: requiredSec,
          completed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_key,video_id" },
      );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, completed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
