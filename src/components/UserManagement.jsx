import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, User, Shield, ChevronDown } from "lucide-react";
import { supabase, supabaseAdmin } from "../lib/supabase";

const FUNCTIONS = [
  { id: 1, name: "ダッシュボード" },
  { id: 2, name: "事前受付URL発行" },
  { id: 3, name: "契約履歴" },
  { id: 4, name: "顧客管理" },
  { id: 5, name: "契約書テンプレート" },
  { id: 6, name: "コンテンツ管理" },
  { id: 7, name: "接客フロー作成" },
  { id: 8, name: "設定" },
];

const SUBS = [
  { id: 1, name: "表示" },
  { id: 2, name: "登録" },
  { id: 3, name: "更新" },
  { id: 4, name: "削除" },
];

const AUTH_TYPES = [
  { value: "full", label: "管理者（フル権限）" },
  { value: "partial", label: "管理者（一部権限）" },
  { value: "readonly", label: "管理者（閲覧のみ）" },
];

const initPermissions = (authType) => {
  const perms = {};
  FUNCTIONS.forEach((f) => {
    perms[f.id] = {};
    SUBS.forEach((s) => {
      if (authType === "full") perms[f.id][s.id] = true;
      else if (authType === "readonly") perms[f.id][s.id] = s.id === 1;
      else perms[f.id][s.id] = s.id === 1; // partial: 表示のみON
    });
  });
  return perms;
};

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace(".supabase.co", ".supabase.co/functions/v1") || "";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // フォーム状態
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [authType, setAuthType] = useState("full");
  const [permissions, setPermissions] = useState(initPermissions("full"));

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: adminsData }, { data: usersData }, { data: authList }] = await Promise.all([
        supabaseAdmin.from("admins").select("id, name, create_at"),
        supabaseAdmin.from("users").select("id, name, create_at"),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
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

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAuthTypeChange = (type) => {
    setAuthType(type);
    setPermissions(initPermissions(type));
  };

  const togglePerm = (funcId, subId) => {
    if (authType !== "partial") return;
    setPermissions((prev) => {
      const next = { ...prev, [funcId]: { ...prev[funcId] } };
      if (subId === 1) {
        // 表示トグル
        const newVal = !next[funcId][1];
        next[funcId][1] = newVal;
        if (!newVal) {
          // 表示OFFなら登録/更新/削除もOFF
          next[funcId][2] = false;
          next[funcId][3] = false;
          next[funcId][4] = false;
        }
      } else {
        // 表示がONの場合のみ変更可
        if (next[funcId][1]) next[funcId][subId] = !next[funcId][subId];
      }
      return next;
    });
  };

  const isDisabled = (funcId, subId) => {
    if (authType === "full" || authType === "readonly") return true;
    // partial: 表示がOFFなら登録/更新/削除は変更不可
    if (subId !== 1 && !permissions[funcId]?.[1]) return true;
    return false;
  };

  const openModal = () => {
    setName(""); setEmail(""); setPassword("");
    setRole("staff"); setAuthType("full");
    setPermissions(initPermissions("full"));
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("パスワードは6文字以上で入力してください"); return; }
    setError("");
    setSubmitting(true);

    const permsArray = role === "admin"
      ? FUNCTIONS.flatMap((f) =>
          SUBS.filter((s) => permissions[f.id]?.[s.id]).map((s) => ({ function_id: f.id, sub_id: s.id }))
        )
      : [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({
          name, email, password, role, permissions: permsArray,
          authTypeName: AUTH_TYPES.find((t) => t.value === authType)?.label ?? authType,
        }),
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-lg font-bold text-gray-800">権限・ユーザー管理</h3>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors"
        >
          <Plus size={16} /> 新規ユーザー発行
        </button>
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
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">ユーザーが登録されていません</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{u.name || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {u.role === "admin" ? <><Shield size={11} /> 管理者</> : <><User size={11} /> スタッフ</>}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(u.create_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新規ユーザー発行モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">新規ユーザー発行</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="relative">
                    <select value={role} onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm appearance-none">
                      <option value="staff">スタッフ</option>
                      <option value="admin">管理者</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {role === "admin" && (
                <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">権限タイプ</label>
                    <div className="relative">
                      <select value={authType} onChange={(e) => handleAuthTypeChange(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm appearance-none">
                        {AUTH_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-3">権限マトリクス</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-r border-gray-200 w-40">機能</th>
                            {SUBS.map((s) => (
                              <th key={s.id} className="text-center px-2 py-2 font-semibold text-gray-600 border-b border-gray-200 w-16">{s.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {FUNCTIONS.map((f, fi) => (
                            <tr key={f.id} className={fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                              <td className="px-3 py-2 font-medium text-gray-700 border-r border-gray-200">{f.name}</td>
                              {SUBS.map((s) => {
                                const checked = !!permissions[f.id]?.[s.id];
                                const disabled = isDisabled(f.id, s.id);
                                return (
                                  <td key={s.id} className="text-center px-2 py-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={disabled}
                                      onChange={() => togglePerm(f.id, s.id)}
                                      className={`w-4 h-4 rounded border-gray-300 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer accent-blue-600"}`}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

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
