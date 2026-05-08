import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

    const { sessionKey, flowId, requiredVideoIds } = JSON.parse(event.body);

    if (!sessionKey || !Array.isArray(requiredVideoIds) || requiredVideoIds.length === 0) {
      return {
        statusCode: 400,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "sessionKey and requiredVideoIds are required" }),
      };
    }

    const { data: sessions, error: fetchError } = await supabase
      .from("video_watch_sessions")
      .select("video_id, completed")
      .eq("session_key", sessionKey)
      .eq("flow_id", flowId ?? "")
      .eq("completed", true);

    if (fetchError) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: fetchError.message }),
      };
    }

    const completedIds = (sessions ?? []).map((s) => s.video_id);
    const allCompleted = requiredVideoIds.every((id) => completedIds.includes(id));

    if (!allCompleted) {
      return {
        statusCode: 403,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Not all required videos completed on server" }),
      };
    }

    const token = randomUUID() + "-" + randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("completion_tokens").insert({
      token,
      session_key: sessionKey,
      flow_id: flowId ?? "",
      expires_at: expiresAt,
    });

    if (insertError) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: insertError.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ token, expiresAt }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
