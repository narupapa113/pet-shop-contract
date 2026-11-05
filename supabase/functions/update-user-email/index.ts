import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { userId, newEmail, storeId } = await req.json();

    if (!userId || !newEmail || !storeId) {
      return json({ error: "必須項目が不足しています" }, 400);
    }
    if (!EMAIL_REGEX.test(newEmail)) {
      return json({ error: "メールアドレスの形式が正しくありません" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 呼び出し元ユーザーをJWTから取得
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !user) return json({ error: "認証情報が無効です" }, 401);

    // 呼び出し元が admins テーブルに存在し、かつ storeId に所属しているか確認
    const { data: callerAdmin, error: callerErr } = await supabaseAdmin
      .from("admins")
      .select("id, store_id")
      .eq("id", user.id)
      .maybeSingle();

    if (callerErr) throw new Error("呼び出し元ユーザー情報の取得に失敗しました: " + callerErr.message);
    if (!callerAdmin) return json({ error: "管理者アカウントではありません" }, 403);

    const callerStoreIds: string[] = Array.isArray(callerAdmin.store_id) ? callerAdmin.store_id : [];
    if (!callerStoreIds.includes(storeId)) {
      return json({ error: "この店舗にアクセスする権限がありません" }, 403);
    }

    // 対象ユーザーが同じ店舗に所属しているか確認
    const [{ data: adminRow }, { data: staffRow }] = await Promise.all([
      supabaseAdmin.from("admins").select("id").eq("id", userId).contains("store_id", [storeId]).maybeSingle(),
      supabaseAdmin.from("users").select("id").eq("id", userId).eq("store_id", storeId).maybeSingle(),
    ]);

    if (!adminRow && !staffRow) {
      return json({ error: "対象ユーザーがこの店舗に所属していません" }, 403);
    }

    // 新しいメールアドレスがすでに使われているか確認
    const { data: existingUser, error: existingErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    });

    if (existingErr) throw new Error("既存ユーザーの確認に失敗しました: " + existingErr.message);

    const emailTaken = (existingUser?.users || []).some(
      (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== userId,
    );
    if (emailTaken) {
      return json({ error: "このメールアドレスはすでに使われています" }, 400);
    }

    // Auth のメールアドレスを更新
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (updateErr) {
      const msg =
        updateErr.message.includes("already registered") || updateErr.message.includes("already been registered")
          ? "このメールアドレスはすでに使われています"
          : updateErr.message;
      return json({ error: msg }, 400);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" }, 500);
  }
});
