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
    const { storeId } = await req.json();

    if (!storeId) return json({ error: "店舗が選択されていません" }, 400);

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
    if (!callerStoreIds.includes(storeId)) return json({ error: "この店舗にアクセスする権限がありません" }, 403);

    // 管理者とスタッフを店舗フィルタで取得
    const [
      { data: adminsData, error: adminsErr },
      { data: usersData, error: usersErr },
    ] = await Promise.all([
      supabaseAdmin.from("admins").select("id, name, create_at, auth_id").contains("store_id", [storeId]),
      supabaseAdmin.from("users").select("id, name, create_at").eq("store_id", storeId),
    ]);

    if (adminsErr) throw new Error("管理者情報の取得に失敗しました: " + adminsErr.message);
    if (usersErr) throw new Error("スタッフ情報の取得に失敗しました: " + usersErr.message);

    // auth.users からメールアドレスを一括取得（ページネーションで全件取得）
    const userIds = [
      ...(adminsData || []).map((a) => a.id),
      ...(usersData || []).map((u) => u.id),
    ];

    const emailMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const idSet = new Set(userIds);
      let page = 1;
      const perPage = 1000;

      while (true) {
        const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
          perPage,
          page,
        });

        if (authErr) throw new Error("認証ユーザー情報の取得に失敗しました: " + authErr.message);

        const users = authList?.users || [];
        users.forEach((u) => {
          if (idSet.has(u.id)) emailMap[u.id] = u.email || "";
        });

        if (users.length < perPage) break;
        page++;
      }
    }

    const admins = (adminsData || []).map((a) => ({
      id: a.id,
      name: a.name,
      create_at: a.create_at,
      auth_id: a.auth_id,
      role: "admin" as const,
      email: emailMap[a.id] || "",
    }));

    const staff = (usersData || []).map((u) => ({
      id: u.id,
      name: u.name,
      create_at: u.create_at,
      auth_id: null,
      role: "staff" as const,
      email: emailMap[u.id] || "",
    }));

    const combined = [...admins, ...staff].sort(
      (a, b) => new Date(b.create_at).getTime() - new Date(a.create_at).getTime(),
    );

    return json({ users: combined });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "不明なエラーが発生しました" }, 500);
  }
});
