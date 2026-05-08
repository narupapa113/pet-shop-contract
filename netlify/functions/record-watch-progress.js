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

    const { sessionKey, flowId, videoId, watchedSec, requiredSec } = JSON.parse(event.body);

    if (!sessionKey || !videoId) {
      return {
        statusCode: 400,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "sessionKey and videoId are required" }),
      };
    }

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
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, completed }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
