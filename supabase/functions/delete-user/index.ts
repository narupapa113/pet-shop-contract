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
    const { userId, role } = await req.json();

    if (!userId || !role) return json({ error: "必須項目が不足しています" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (role === "admin") {
      // admins.auth_id を取得（authority_contents と m_authority の削除に必要）
      const { data: adminRow, error: adminFetchErr } = await supabaseAdmin
        .from("admins")
        .select("auth_id")
        .eq("id", userId)
        .maybeSingle();

      if (adminFetchErr) throw new Error("管理者情報の取得に失敗しました: " + adminFetchErr.message);

      const authId = adminRow?.auth_id ?? null;

      // 1. authority_contents を削除（id = auth_id）
      if (authId) {
        const { error: acErr } = await supabaseAdmin
          .from("authority_contents")
          .delete()
          .eq("id", authId);
        if (acErr) throw new Error("権限情報の削除に失敗しました: " + acErr.message);
      }

      // 2. admins テーブルから削除
      const { error: adminDelErr } = await supabaseAdmin
        .from("admins")
        .delete()
        .eq("id", userId);
      if (adminDelErr) throw new Error("管理者レコードの削除に失敗しました: " + adminDelErr.message);

      // 3. m_authority を削除（admins が参照しているため admins 削除後に実行）
      if (authId) {
        const { error: maErr } = await supabaseAdmin
          .from("m_authority")
          .delete()
          .eq("id", authId);
        if (maErr) throw new Error("権限マスタの削除に失敗しました: " + maErr.message);
      }
    } else {
      // staff: users テーブルから削除
      const { error: userDelErr } = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId);
      if (userDelErr) throw new Error("スタッフレコードの削除に失敗しました: " + userDelErr.message);
    }

    // 4. auth.users から削除（最後に実行）
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDelErr) throw new Error("認証ユーザーの削除に失敗しました: " + authDelErr.message);

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" }, 500);
  }
});
