import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";
import { ArrowLeft, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, FileText, X } from "lucide-react";

const STATUS_DEF = {
  1: { label: "進行中", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock, iconColor: "text-yellow-600" },
  2: { label: "要確認", cls: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle, iconColor: "text-orange-600" },
  4: { label: "事前受付完了", cls: "bg-teal-100 text-teal-700 border-teal-200", icon: FileText, iconColor: "text-teal-600" },
};

const fmtDate = (iso) => {
  if (!iso) return "―";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const IncompleteListPage = ({ onBack, onResume, flows, staffTemplates, storeId }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeDone, setMergeDone] = useState(null);
  const [resumeItem, setResumeItem] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("sign_history")
      .select("*, customers(name, name_kana, tell, mail, address, is_delete)")
      .in("status", [1, 2, 4]);
    if (storeId) q = q.eq("store_id", storeId);
    const { data } = await q.order("create_at", { ascending: false });
    setList(data || []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSelect = (item) => {
    if (item.status === 2) {
      setMergeTarget(item);
      setMergeDone(null);
      setExistingCustomer(null);
      return;
    }
    onResume(item);
  };

  // --- 要確認: 顧客統合フロー ---
  const handleSearchExisting = async () => {
    setMergeLoading(true);
    const phone = mergeTarget?.customers?.tell;
    if (phone) {
      const existing = await findCustomerByPhone(supabase, phone);
      setExistingCustomer(existing);
    }
    setMergeLoading(false);
  };

  const callEdgeFn = async (fnName, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      "Content-Type": "application/json",
      "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const handleMergeOverwrite = async () => {
    if (!mergeTarget || !existingCustomer) return;
    const c = mergeTarget.customers;
    const now = new Date().toISOString();
    const updateFields = { update_at: now };
    if (c?.name) updateFields.name = c.name;
    if (c?.name_kana) updateFields.name_kana = c.name_kana;
    if (c?.mail) updateFields.mail = c.mail;
    if (c?.address) updateFields.address = c.address;
    try { await callEdgeFn("save-customer-history", { customerId: existingCustomer.id }); } catch (e) { console.error("履歴保存エラー:", e); }
    await supabase.from("customers").update(updateFields).eq("id", existingCustomer.id);
    // sign_history の顧客IDを既存顧客に切り替え、重複フラグを解消
    await supabase.from("sign_history").update({
      sign_customer_id: existingCustomer.id,
      status: 4,
      status_updated_at: now,
    }).eq("id", mergeTarget.id);
    // 重複した新規顧客レコードを論理削除
    if (mergeTarget.sign_customer_id && mergeTarget.sign_customer_id !== existingCustomer.id) {
      await supabase.from("customers").update({ is_delete: true, update_at: now }).eq("id", mergeTarget.sign_customer_id);
    }
    setResumeItem({ ...mergeTarget, status: 4, sign_customer_id: existingCustomer.id });
    setMergeDone("merged");
  };

  const handleMergeNew = async () => {
    if (!mergeTarget) return;
    const now = new Date().toISOString();
    await supabase.from("sign_history").update({
      status: 4,
      status_updated_at: now,
    }).eq("id", mergeTarget.id);
    setResumeItem({ ...mergeTarget, status: 4 });
    setMergeDone("new");
  };

  const closeMergeModal = () => {
    setMergeTarget(null);
    setExistingCustomer(null);
    setMergeDone(null);
  };

  const handleProceedToStaff = () => {
    if (resumeItem) {
      onResume(resumeItem);
    } else {
      closeMergeModal();
      fetchList();
    }
  };

  const c = mergeTarget?.customers;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 text-gray-600"
            >
              <ArrowLeft size={16} /> 接客メニューへ戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-800">未完了一覧</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">読み込み中...</div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
              <CheckCircle size={40} className="text-green-400" />
              <p>未完了の案件はありません</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">ステータス</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">契約名</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">顧客名</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">電話番号</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">受付日時</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((h) => {
                  const s = STATUS_DEF[h.status] || STATUS_DEF[1];
                  const Icon = s.icon;
                  const cust = h.customers;
                  return (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
                          <Icon size={12} className={s.iconColor} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{h.contract_name || "―"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cust?.name || "―"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cust?.tell || "―"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(h.create_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSelect(h)}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {h.status === 1 ? "続きから再開" : h.status === 4 ? "対応を開始" : "確認する"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 要確認: 顧客統合モーダル */}
      {mergeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            {mergeDone ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {mergeDone === "merged" ? "既存顧客に統合しました" : "新規顧客として確定しました"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">お客様情報を確定し、事前受付完了に更新しました</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => { closeMergeModal(); fetchList(); }} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">
                    一覧に戻る
                  </button>
                  <button onClick={handleProceedToStaff} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                    スタッフ入力・署名へ進む
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-orange-600">
                    <AlertTriangle size={24} className="mr-2" />
                    <h3 className="text-lg font-bold">要確認 — 顧客情報の統合</h3>
                  </div>
                  <button
                    onClick={closeMergeModal}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                    aria-label="閉じる"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 新規入力された顧客情報 */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 mb-2">今回入力されたお客様</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                    <Row label="お名前" value={c?.name} />
                    <Row label="フリガナ" value={c?.name_kana} />
                    <Row label="電話番号" value={c?.tell} />
                    <Row label="メール" value={c?.mail} />
                    <Row label="ご住所" value={c?.address} />
                  </div>
                </div>

                {!existingCustomer && !mergeLoading && (
                  <button
                    onClick={handleSearchExisting}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 mb-4"
                  >
                    同一電話番号の既存顧客を検索
                  </button>
                )}

                {mergeLoading && (
                  <div className="text-center py-4 text-sm text-gray-500">検索中...</div>
                )}

                {existingCustomer && (
                  <>
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-400 mb-2">既存顧客情報</p>
                      <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                        <Row label="お名前" value={existingCustomer.name} />
                        <Row label="フリガナ" value={existingCustomer.name_kana} />
                        <Row label="電話番号" value={existingCustomer.tell} />
                        <Row label="メール" value={existingCustomer.mail} />
                        <Row label="ご住所" value={existingCustomer.address} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      同一人物の場合は入力内容で上書き統合し、別人物の場合は新規顧客として確定します。
                    </p>
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={handleMergeNew}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                      >
                        別人物（新規確定）
                      </button>
                      <button
                        onClick={handleMergeOverwrite}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                      >
                        同一人物（上書き統合）
                      </button>
                    </div>
                    <button
                      onClick={closeMergeModal}
                      className="w-full px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                  </>
                )}

                {!existingCustomer && !mergeLoading && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleMergeNew}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                    >
                      新規顧客として確定
                    </button>
                    <button
                      onClick={() => { setMergeTarget(null); setExistingCustomer(null); }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 font-medium"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex">
    <span className="w-20 text-xs text-gray-500 flex-shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-800">{value || "―"}</span>
  </div>
);

export default IncompleteListPage;
