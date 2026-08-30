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
    // roleId: m_authority.id (UUID), storeId: stores.id (UUID)
    const { name, email, password, roleId, storeId } = await req.json();

    if (!name || !email || !password || !roleId) return json({ error: "必須項目が不足しています" }, 400);
    if (!storeId) return json({ error: "店舗が選択されていません" }, 400);
    if (password.length < 6) return json({ error: "パスワードは6文字以上で入力してください" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 役割情報を取得して has_permission を確認
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("m_authority")
      .select("id, has_permission")
      .eq("id", roleId)
      .maybeSingle();

    if (roleErr || !roleRow) return json({ error: "指定された役割が見つかりません" }, 400);

    // auth ユーザーを作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      const msg =
        authError.message.includes("already registered") || authError.message.includes("already been registered")
          ? "このメールアドレスは既に登録されています"
          : authError.message;
      return json({ error: msg }, 400);
    }

    const authUserId = authData.user.id;
    const now = new Date().toISOString();

    if (roleRow.has_permission) {
      // 権限あり役割 → admins テーブルに作成。auth_id = roleId（共有ロールを指す）
      const { error: adminErr } = await supabaseAdmin.from("admins").insert({
        id: authUserId,
        name,
        auth_id: roleId,
        store_id: [storeId],
        create_at: now,
      });

      if (adminErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error("adminsテーブルへの保存に失敗しました: " + adminErr.message);
      }
    } else {
      // 権限なし役割 → users テーブルに作成
      const { error: userErr } = await supabaseAdmin.from("users").insert({
        id: authUserId,
        name,
        store_id: storeId,
        create_at: now,
      });

      if (userErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        throw new Error("usersテーブルへの保存に失敗しました: " + userErr.message);
      }
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" }, 500);
  }
});
