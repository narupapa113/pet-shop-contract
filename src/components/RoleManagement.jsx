import React, { useState, useEffect, useCallback } from "react";
import { Plus, X, CreditCard as Edit2, ShieldCheck, ShieldOff } from "lucide-react";
import { supabaseAdmin } from "../lib/supabase";
import { PERMISSION_MATRIX } from "./UserManagement";

const initPermissions = () => {
  const perms = {};
  PERMISSION_MATRIX.forEach((f) => {
    perms[f.id] = {};
    f.perms.forEach((p) => { perms[f.id][p.key] = false; });
  });
  return perms;
};

const permsToState = (rows) => {
  const perms = initPermissions();
  rows.forEach(({ function_id, sub_id }) => {
    const feature = PERMISSION_MATRIX.find((f) => f.functionDbId === function_id);
    if (!feature) return;
    const perm = feature.perms.find((p) => p.subDbId === sub_id);
    if (perm) perms[feature.id][perm.key] = true;
  });
  return perms;
};

const can = (adminPermissions, functionId, subId) => {
  if (adminPermissions === null || adminPermissions === undefined) return true;
  return adminPermissions[functionId]?.has(subId) ?? false;
};

const PermissionMatrix = ({ permissions, onToggle, disabled = false }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-left px-3 py-2 font-semibold text-gray-600 border-b border-r border-gray-200 w-48">機能・画面</th>
          <th className="text-center px-2 py-2 font-semibold text-gray-600 border-b border-gray-200">権限</th>
        </tr>
      </thead>
      <tbody>
        {PERMISSION_MATRIX.map((f, fi) =>
          f.perms.map((p, pi) => (
            <tr key={`${f.id}-${p.key}`} className={fi % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              {pi === 0 ? (
                <td rowSpan={f.perms.length} className="px-3 py-2 font-medium text-gray-700 border-r border-gray-200 align-top pt-2.5">
                  {f.name}
                </td>
              ) : null}
              <td className="px-3 py-1.5">
                <label className={`flex items-center gap-2 select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={!!permissions[f.id]?.[p.key]}
                    disabled={disabled || (p.key !== "view" && !permissions[f.id]?.["view"])}
                    onChange={() => !disabled && onToggle(f.id, p.key)}
                    className={`w-4 h-4 rounded border-gray-300 ${
                      disabled || (p.key !== "view" && !permissions[f.id]?.["view"])
                        ? "opacity-30 cursor-not-allowed"
                        : "cursor-pointer accent-blue-600"
                    }`}
                  />
                  <span className={`${!disabled && p.key !== "view" && !permissions[f.id]?.["view"] ? "text-gray-300" : "text-gray-700"}`}>
                    {p.label}
                  </span>
                </label>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const RoleManagement = ({ adminPermissions }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 権限・名称変更モーダル
  const [editingRole, setEditingRole] = useState(null); // { id, auth_name, has_permission }
  const [editRoleName, setEditRoleName] = useState("");
  const [editPerms, setEditPerms] = useState(initPermissions());
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // 新規役割追加モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newHasPermission, setNewHasPermission] = useState("true");
  const [newPerms, setNewPerms] = useState(initPermissions());
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabaseAdmin
      .from("m_authority")
      .select("id, auth_name, has_permission, create_at")
      .order("has_permission", { ascending: false })
      .order("auth_name");
    if (data) setRoles(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openEditModal = async (role) => {
    if (role.has_permission) {
      const { data } = await supabaseAdmin
        .from("authority_contents")
        .select("function_id, sub_id")
        .eq("id", role.id);
      setEditPerms(permsToState(data || []));
    } else {
      setEditPerms(initPermissions());
    }
    setEditRoleName(role.auth_name);
    setEditingRole(role);
    setEditError("");
  };

  const toggleEditPerm = (funcId, permKey) => {
    setEditPerms((prev) => {
      const next = { ...prev, [funcId]: { ...prev[funcId] } };
      if (permKey === "view") {
        const newVal = !next[funcId]["view"];
        next[funcId]["view"] = newVal;
        if (!newVal) Object.keys(next[funcId]).forEach((k) => { if (k !== "view") next[funcId][k] = false; });
      } else {
        if (next[funcId]["view"]) next[funcId][permKey] = !next[funcId][permKey];
      }
      return next;
    });
  };

  const saveEditPerms = async () => {
    if (!editingRole) return;
    const trimmedName = editRoleName.trim();
    if (!trimmedName) { setEditError("役割名を入力してください"); return; }
    const duplicate = roles.find((r) => r.id !== editingRole.id && r.auth_name === trimmedName);
    if (duplicate) { setEditError("同じ名前の役割が既に存在します"); return; }

    setEditSaving(true);
    setEditError("");
    try {
      // 1. 役割名を更新
      const { error: nameErr } = await supabaseAdmin
        .from("m_authority")
        .update({ auth_name: trimmedName, update_at: new Date().toISOString() })
        .eq("id", editingRole.id);
      if (nameErr) throw new Error("役割名の更新に失敗しました: " + nameErr.message);

      // 2. 権限ありの場合のみ authority_contents を入れ替え
      if (editingRole.has_permission) {
        const rows = PERMISSION_MATRIX.flatMap((f) =>
          f.perms
            .filter((p) => editPerms[f.id]?.[p.key])
            .map((p) => ({ id: editingRole.id, function_id: f.functionDbId, sub_id: p.subDbId, create_at: new Date().toISOString() }))
        );
        const { error: delErr } = await supabaseAdmin.from("authority_contents").delete().eq("id", editingRole.id);
        if (delErr) throw new Error("権限削除に失敗しました: " + delErr.message);
        if (rows.length > 0) {
          const { error: insErr } = await supabaseAdmin.from("authority_contents").insert(rows);
          if (insErr) throw new Error("権限保存に失敗しました: " + insErr.message);
        }
      }

      await fetchRoles();
      setEditingRole(null);
    } catch (err) {
      setEditError(err.message);
      alert("保存に失敗しました: " + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const toggleNewPerm = (funcId, permKey) => {
    setNewPerms((prev) => {
      const next = { ...prev, [funcId]: { ...prev[funcId] } };
      if (permKey === "view") {
        const newVal = !next[funcId]["view"];
        next[funcId]["view"] = newVal;
        if (!newVal) Object.keys(next[funcId]).forEach((k) => { if (k !== "view") next[funcId][k] = false; });
      } else {
        if (next[funcId]["view"]) next[funcId][permKey] = !next[funcId][permKey];
      }
      return next;
    });
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) { setAddError("役割名を入力してください"); return; }
    setAddSaving(true);
    setAddError("");
    try {
      const hasPermission = newHasPermission === "true";
      const { data: newRole, error: roleErr } = await supabaseAdmin
        .from("m_authority")
        .insert({ auth_name: newRoleName.trim(), has_permission: hasPermission })
        .select("id")
        .maybeSingle();
      if (roleErr || !newRole) throw new Error("役割の作成に失敗しました: " + (roleErr?.message ?? ""));

      if (hasPermission) {
        const rows = PERMISSION_MATRIX.flatMap((f) =>
          f.perms
            .filter((p) => newPerms[f.id]?.[p.key])
            .map((p) => ({ id: newRole.id, function_id: f.functionDbId, sub_id: p.subDbId, create_at: new Date().toISOString() }))
        );
        if (rows.length > 0) {
          const { error: insErr } = await supabaseAdmin.from("authority_contents").insert(rows);
          if (insErr) throw new Error("権限保存に失敗しました: " + insErr.message);
        }
      }

      setShowAddModal(false);
      setNewRoleName("");
      setNewHasPermission("true");
      setNewPerms(initPermissions());
      await fetchRoles();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-lg font-bold text-gray-800">権限管理（役割）</h3>
        {can(adminPermissions, 12, 2) && (
          <button
            onClick={() => { setNewRoleName(""); setNewHasPermission("true"); setNewPerms(initPermissions()); setAddError(""); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors"
          >
            <Plus size={16} /> 新規役割追加
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">読み込み中...</div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
              <div className="flex items-center gap-3">
                {role.has_permission
                  ? <ShieldCheck size={18} className="text-blue-500 shrink-0" />
                  : <ShieldOff size={18} className="text-gray-400 shrink-0" />}
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{role.auth_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {role.has_permission ? "権限あり（管理者ロール）" : "権限なし（スタッフ相当）"}
                  </p>
                </div>
              </div>
              <div>
                {can(adminPermissions, 12, 3) && (
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    <Edit2 size={13} /> {role.has_permission ? "権限変更" : "名称変更"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {roles.length === 0 && (
            <p className="text-center py-12 text-gray-400 text-sm">役割が登録されていません</p>
          )}
        </div>
      )}

      {/* 権限・名称変更モーダル */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">権限変更</h3>
                <p className="text-sm text-gray-500 mt-0.5">役割：{editingRole.auth_name}</p>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{editError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役割名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="役割名を入力"
                />
              </div>

              {editingRole.has_permission && (
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    <span className="mt-0.5">&#9888;</span>
                    <span>閲覧にチェックが付いていない機能は、メニューにも表示されません。変更はこの役割を持つすべてのユーザーに即時反映されます。</span>
                  </div>
                  <PermissionMatrix permissions={editPerms} onToggle={toggleEditPerm} />
                </>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setEditingRole(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium text-sm">
                キャンセル
              </button>
              <button
                onClick={saveEditPerms}
                disabled={editSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold text-sm shadow-md transition-colors"
              >
                {editSaving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規役割追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-800">新規役割追加</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddRole} className="flex-1 overflow-y-auto p-6 space-y-5">
              {addError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{addError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">役割名 <span className="text-red-500">*</span></label>
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="例：店長、副店長"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">権限タイプ <span className="text-red-500">*</span></label>
                <select
                  value={newHasPermission}
                  onChange={(e) => setNewHasPermission(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="true">権限あり（管理者ダッシュボードにアクセス可）</option>
                  <option value="false">権限なし（スタッフ相当）</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">作成後は変更できません。</p>
              </div>

              {newHasPermission === "true" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    <span className="mt-0.5">&#9888;</span>
                    <span>閲覧にチェックが付いていない機能は、メニューにも表示されません</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">権限マトリクス</p>
                  <PermissionMatrix permissions={newPerms} onToggle={toggleNewPerm} />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm">
                  キャンセル
                </button>
                <button type="submit" disabled={addSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold text-sm shadow-md transition-colors">
                  {addSaving ? "作成中..." : "役割を作成する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
