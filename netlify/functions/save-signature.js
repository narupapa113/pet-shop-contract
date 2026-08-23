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

    const { completionToken, signatureDataUrl, contractId, contractName, customerId, videoIds, status, signHistoryId } =
      JSON.parse(event.body);

    if (!completionToken || !signatureDataUrl) {
      return {
        statusCode: 400,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "completionToken and signatureDataUrl are required" }),
      };
    }

    const { data: tokenRow, error: tokenError } = await supabase
      .from("completion_tokens")
      .select("id")
      .eq("token", completionToken)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return {
        statusCode: 403,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or expired completion token" }),
      };
    }

    await supabase.from("completion_tokens").update({ used: true }).eq("id", tokenRow.id);

    const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const binary = Buffer.from(base64, "base64");
    const filePath = `signatures/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, binary, { contentType: "image/png" });

    if (uploadError) {
      return {
        statusCode: 500,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({ error: uploadError.message }),
      };
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
        return {
          statusCode: 500,
          headers: { ...cors, "Content-Type": "application/json" },
          body: JSON.stringify({ error: updateError.message }),
        };
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
        return {
          statusCode: 500,
          headers: { ...cors, "Content-Type": "application/json" },
          body: JSON.stringify({ error: historyError.message }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, filePath }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
