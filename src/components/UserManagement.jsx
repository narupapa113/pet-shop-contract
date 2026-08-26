import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, User, Shield, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

// PERMISSION_MATRIX は RoleManagement.jsx でも共用するためエクスポート
export const PERMISSION_MATRIX = [
  {
    id: "dashboard",
    functionDbId: 1,
    name: "ダッシュボード",
    perms: [{ key: "view", label: "閲覧", subDbId: 1 }],
  },
  {
    id: "onetime_url",
    functionDbId: 2,
    name: "事前受付URL発行",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "issue", label: "発行", subDbId: 2 },
      { key: "sign", label: "署名", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "contract_history",
    functionDbId: 3,
    name: "契約履歴",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "download", label: "契約書類取得", subDbId: 3 },
    ],
  },
  {
    id: "customer",
    functionDbId: 4,
    name: "顧客管理",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "編集", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "contract_template",
    functionDbId: 5,
    name: "契約書テンプレート",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "編集", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "content_video",
    functionDbId: 6,
    name: "コンテンツ管理（動画）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "編集", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "content_document",
    functionDbId: 7,
    name: "コンテンツ管理（ドキュメント）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "編集", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "flow",
    functionDbId: 8,
    name: "接客フロー作成",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "編集", subDbId: 3 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "setting_company",
    functionDbId: 9,
    name: "設定（会社情報）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "edit", label: "編集", subDbId: 3 },
    ],
  },
  {
    id: "setting_user",
    functionDbId: 10,
    name: "設定（ユーザー管理）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "delete", label: "削除", subDbId: 4 },
    ],
  },
  {
    id: "setting_role",
    functionDbId: 12,
    name: "設定（権限管理）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "create", label: "新規追加", subDbId: 2 },
      { key: "edit", label: "権限変更", subDbId: 3 },
    ],
  },
  {
    id: "setting_other",
    functionDbId: 11,
    name: "設定（その他）",
    perms: [
      { key: "view", label: "閲覧", subDbId: 1 },
      { key: "edit", label: "編集", subDbId: 3 },
    ],
  },
];

const SUPABASE_FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_URL?.replace(".supabase.co", ".supabase.co/functions/v1") || "";

const can = (adminPermissions, functionId, subId) => {
  if (adminPermissions === null || adminPermissions === undefined) return true;
  return adminPermissions[functionId]?.has(subId) ?? false;
};

const UserManagement = ({ adminPermissions, storeId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 役割一覧（m_authority から動的取得）
  const [roles, setRoles] = useState([]);

  // 削除確認モーダル用 state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from("m_authority")
      .select("id, auth_name, has_permission")
      .order("has_permission", { ascending: false })
      .order("auth_name");
    if (data) setRoles(data);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: adminsData }, { data: usersData }, { data: authList }] = await Promise.all([
        supabase.from("admins").select("id, name, create_at, auth_id"),
        supabase.from("users").select("id, name, create_at"),
        supabase.auth.admin.listUsers({ perPage: 1000 }),
      ]);

      const authMap = {};
      (authList?.users || []).forEach((u) => { authMap[u.id] = u.email; });

      const combined = [
        ...(adminsData || []).map((a) => ({ ...a, role: "admin", email: authMap[a.id] || "" })),
        ...(usersData || []).map((u) => ({ ...u, role: "staff", email: authMap[u.id] || "" })),
      ].sort((a, b) => new Date(b.create_at) - new Date(a.create_at));

      setUsers(combined);
    } catch (e) {
      console.error("ユーザー取得エラー:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (!can(adminPermissions, 10, 4)) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ userId: deleteTarget.id, role: deleteTarget.role }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "削除に失敗しました");
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openModal = () => {
    setName(""); setEmail(""); setPassword("");
    setSelectedRoleId(roles[0]?.id || "");
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!can(adminPermissions, 10, 2)) return;
    if (!selectedRoleId) { setError("役割を選択してください"); return; }
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    setError("");
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ name, email, password, roleId: selectedRoleId, storeId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "発行に失敗しました");
      setShowModal(false);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getRoleName = (u) => {
    if (u.role === "admin" && u.auth_id) {
      const found = roles.find((r) => r.id === u.auth_id);
      if (found) return found.auth_name;
    }
    return u.role === "admin" ? "管理者" : "スタッフ";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-lg font-bold text-gray-800">アカウント管理</h3>
        {can(adminPermissions, 10, 2) && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors"
          >
            <Plus size={16} /> 新規アカウント発行
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">名前</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">メールアドレス</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">役割</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">登録日</th>
                <th className="py-3 px-4 font-semibold text-gray-600 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">ユーザーが登録されていません</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{u.name || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {u.role === "admin" ? <Shield size={11} /> : <User size={11} />}
                        {getRoleName(u)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(u.create_at)}</td>
                    <td className="py-3 px-4 text-center">
                      {u.id !== currentUserId && can(adminPermissions, 10, 4) && (
                        <button
                          onClick={() => { setDeleteTarget(u); setDeleteError(""); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">ユーザーの削除</h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600" disabled={deleting}>
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <Trash2 size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold mb-1">{deleteTarget.name || deleteTarget.email} を削除しようとしています。</p>
                  <p>この操作は取り消せません。このユーザーのアカウントおよびすべての権限情報が削除されます。</p>
                </div>
              </div>
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{deleteError}</div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              {can(adminPermissions, 10, 4) && (
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-bold text-sm shadow-md transition-colors"
                >
                  {deleting ? "削除中..." : "削除する"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新規ユーザー発行モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">新規ユーザー発行</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前 <span className="text-red-500">*</span></label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="例：山田 太郎" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="example@mail.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード <span className="text-red-500">*</span></label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="6文字以上" minLength={6} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役割 <span className="text-red-500">*</span></label>
                <select
                  required
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">役割を選択してください</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.auth_name}（{r.has_permission ? "権限あり" : "権限なし"}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm">
                  キャンセル
                </button>
                <button type="submit" disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold text-sm shadow-md transition-colors">
                  {submitting ? "発行中..." : "発行する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
