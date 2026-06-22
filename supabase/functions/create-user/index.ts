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
    const { name, email, password, role, permissions, authTypeName } = await req.json();

    if (!name || !email || !password || !role) return json({ error: "必須項目が不足しています" }, 400);
    if (password.length < 6) return json({ error: "パスワードは6文字以上で入力してください" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. auth ユーザーを作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      const msg = authError.message.includes("already registered") || authError.message.includes("already been registered")
        ? "このメールアドレスは既に登録されています"
        : authError.message;
      return json({ error: msg }, 400);
    }

    const authUserId = authData.user.id;
    const now = new Date().toISOString();

    if (role === "staff") {
      // users テーブルに追加
      const { error: userErr } = await supabaseAdmin.from("users").insert({ id: authUserId, name, create_at: now });
      if (userErr) {
        // ロールバック: auth ユーザーを削除
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error("usersテーブルへの保存に失敗しました: " + userErr.message);
      }
    } else {
      // admin の場合: m_authority → admins → authority_contents の順で作成

      // 3. m_authority に新規レコードを作成（外部キーの参照先として必要）
      const { data: authorityData, error: authorityErr } = await supabaseAdmin
        .from("m_authority")
        .insert({ auth_name: authTypeName || "管理者", create_at: now })
        .select("id")
        .maybeSingle();

      if (authorityErr || !authorityData) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error("m_authorityへの保存に失敗しました: " + (authorityErr?.message ?? "不明なエラー"));
      }

      const authId = authorityData.id;

      // 4. admins に作成（auth_id = authId で外部キー制約を満たす）
      const { error: adminErr } = await supabaseAdmin.from("admins").insert({
        id: authUserId,
        name,
        auth_id: authId,
        create_at: now,
      });

      if (adminErr) {
        // ロールバック: m_authority と auth ユーザーを削除
        await supabaseAdmin.from("m_authority").delete().eq("id", authId);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error("adminsテーブルへの保存に失敗しました: " + adminErr.message);
      }

      // 5. authority_contents に権限を1行ずつ insert
      if (permissions && permissions.length > 0) {
        const rows = permissions.map((p: { function_id: number; sub_id: number }) => ({
          id: authId,
          function_id: p.function_id,
          sub_id: p.sub_id,
          create_at: now,
        }));

        const { error: permErr } = await supabaseAdmin.from("authority_contents").insert(rows);
        if (permErr) {
          // ロールバック: admins、m_authority、auth ユーザーを削除
          await supabaseAdmin.from("admins").delete().eq("id", authUserId);
          await supabaseAdmin.from("m_authority").delete().eq("id", authId);
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          throw new Error("authority_contentsへの保存に失敗しました: " + permErr.message);
        }
      }
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" }, 500);
  }
});
