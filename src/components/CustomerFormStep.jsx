import React, { useState } from "react";
import { ShieldCheck, TriangleAlert as AlertTriangle, UserCheck, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";

const validatePhone = (phone) => {
  if (phone.includes("-")) return "電話番号はハイフン（-）を含めずに入力してください";
  if (!/^\d+$/.test(phone)) return "数字のみで入力してください";
  if (phone.length < 10 || phone.length > 11) return "電話番号は10〜11桁で入力してください";
  return null;
};

const CustomerFormStep = ({ data, onChange, onNext, onPrev, submitLabel, isRemote, sessionCustomerId }) => {
  const [errors, setErrors] = useState({});
  // phase: null | "searching" | "duplicate_found" | "handed_to_staff" | "staff_confirm" | "show_existing"
  const [dupPhase, setDupPhase] = useState(null);
  const [existingCustomer, setExistingCustomer] = useState(null);

  const handleNext = async () => {
    const newErrors = {};
    if (!data.name.trim()) newErrors.name = "お名前を入力してください";
    if (!data.nameKana.trim()) newErrors.nameKana = "フリガナを入力してください";
    if (!data.address.trim()) newErrors.address = "ご住所を入力してください";
    if (!data.phone.trim()) {
      newErrors.phone = "電話番号を入力してください";
    } else {
      const phoneError = validatePhone(data.phone);
      if (phoneError) newErrors.phone = phoneError;
    }
    if (!data.email.trim()) {
      newErrors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "メールアドレスの形式が正しくありません";
    }
    if (!data.checkTerms) newErrors.checkTerms = "確認事項に同意してください";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // 同一セッション内で既に作成済みの自分のレコードがあれば重複チェック自体をスキップ
    if (sessionCustomerId) {
      onNext();
      return;
    }

    // 電話番号重複チェック
    setDupPhase("searching");
    try {
      const existing = await findCustomerByPhone(supabase, data.phone);
      if (existing) {
        if (isRemote) {
          // リモートモード: 重複が見つかってもお客様には一切警告を見せず、そのまま次へ進む
          // 重複情報は handleFinish で sign_history のステータス(要確認)として記録される
          setDupPhase(null);
          onNext({ mode: "new" });
          return;
        }
        setExistingCustomer(existing);
        setDupPhase("duplicate_found");
        return;
      }
    } catch (e) {
      console.error("電話番号重複チェックエラー:", e);
    }

    // 該当なし → 通常通り次へ
    setDupPhase(null);
    onNext();
  };

  const handleBackToEdit = () => setDupPhase(null);

  const handleProceedToStaff = () => {
    if (isRemote) {
      setDupPhase(null);
      onNext({ mode: "new" });
      return;
    }
    setDupPhase("handed_to_staff");
  };

  const handleStaffConfirm = () => setDupPhase("staff_confirm");

  const handleStaffShowExisting = () => setDupPhase("show_existing");

  const handleOverwriteYes = () => {
    setDupPhase(null);
    onNext({ mode: "overwrite", existingCustomerId: existingCustomer.id });
  };

  const handleOverwriteNo = () => {
    setDupPhase(null);
    onNext({ mode: "new" });
  };

  const fieldClass = (name) =>
    `w-full p-3 border rounded-lg ${errors[name] ? "border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border-gray-300"}`;

  // --- 電話番号重複モーダル ---
  if (dupPhase === "duplicate_found") {
    return (
      <>
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md opacity-50 pointer-events-none select-none">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">お客様情報の入力</h2>
        </div>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center text-amber-600 mb-4">
              <AlertTriangle size={28} className="mr-2" />
              <h3 className="text-lg font-bold">ご確認をお願いします</h3>
            </div>
            <p className="text-gray-700 font-semibold mb-2">すでに登録のある電話番号です</p>
            <p className="text-gray-600 text-sm mb-4">電話番号のご確認をお願いします</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6 text-center">
              <span className="text-xl font-bold tracking-wider text-gray-800">{data.phone}</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              電話番号にお間違いがないかご確認ください。<br />
              {isRemote ? "このまま進むと新規登録として続行します。" : "間違いがない場合は、このままスタッフにお渡しください。"}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleProceedToStaff}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                {isRemote ? "新規登録として進む" : "このまま進む"}
              </button>
              <button
                onClick={handleBackToEdit}
                className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
              >
                戻って修正する
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- 「スタッフにお渡しください」画面 ---
  if (dupPhase === "handed_to_staff") {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md text-center">
        <div className="py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">スタッフにお渡しください</h2>
          <p className="text-gray-600 mb-8">
            ご入力いただいた内容をスタッフが確認いたします。<br />
            端末を店舗スタッフにお渡しください。
          </p>
          <button
            onClick={handleStaffConfirm}
            className="px-8 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800"
          >
            スタッフ用確認ボタン
          </button>
        </div>
      </div>
    );
  }

  // --- スタッフ確認画面（重複情報を確認する） ---
  if (dupPhase === "staff_confirm") {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md text-center">
        <div className="py-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">スタッフ確認</h2>
          <p className="text-gray-600 mb-8">重複情報を確認してください。</p>
          <button
            onClick={handleStaffShowExisting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
          >
            重複情報を確認する
          </button>
        </div>
      </div>
    );
  }

  // --- 既存顧客情報表示モーダル（スタッフ向け: 左右比較） ---
  if (dupPhase === "show_existing" && existingCustomer) {
    const c = existingCustomer;
    const n = data;
    const CompareRow = ({ label, existing, newVal }) => {
      const isSame = (existing ?? "") === (newVal ?? "");
      return (
        <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm ${isSame ? "text-gray-600" : "text-gray-800 font-semibold"}`}>{existing || "―"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm ${isSame ? "text-gray-600" : "text-blue-700 font-semibold"}`}>{newVal || "―"}</p>
          </div>
        </div>
      );
    };
    return (
      <>
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md opacity-50 pointer-events-none select-none">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">スタッフ確認</h2>
        </div>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center text-blue-600 mb-4">
              <Search size={24} className="mr-2" />
              <h3 className="text-lg font-bold">顧客情報の比較</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-center">
                <p className="text-xs font-bold text-gray-500">既存顧客情報</p>
              </div>
              <div className="bg-blue-50 rounded-lg px-4 py-2 text-center">
                <p className="text-xs font-bold text-blue-600">今回の入力</p>
              </div>
            </div>
            <div className="border-t border-gray-200">
              <CompareRow label="お名前" existing={c.name} newVal={n.name} />
              <CompareRow label="フリガナ" existing={c.name_kana} newVal={n.nameKana} />
              <CompareRow label="電話番号" existing={c.tell} newVal={n.phone} />
              <CompareRow label="メール" existing={c.mail} newVal={n.email} />
              <CompareRow label="ご住所" existing={c.address} newVal={n.address} />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-4 text-center mt-4">
              入力された内容で上書きしてもよろしいですか？<br />
              <span className="text-xs text-gray-500 font-normal">未入力の項目は既存の値が保持されます</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleOverwriteNo}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
              >
                いいえ（新規登録）
              </button>
              <button
                onClick={handleOverwriteYes}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                はい（上書き）
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- 検索中 ---
  if (dupPhase === "searching") {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md text-center">
        <div className="py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">確認中...</p>
        </div>
      </div>
    );
  }

  // --- 通常の入力フォーム ---
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">お客様情報の入力</h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">お名前 (フルネーム)</label>
            <input type="text" name="name" value={data.name} onChange={onChange} className={fieldClass("name")} placeholder="山田 太郎" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フリガナ</label>
            <input type="text" name="nameKana" value={data.nameKana} onChange={onChange} className={fieldClass("nameKana")} placeholder="ヤマダ タロウ" />
            {errors.nameKana && <p className="text-red-500 text-xs mt-1">{errors.nameKana}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ご住所</label>
          <input type="text" name="address" value={data.address} onChange={onChange} className={fieldClass("address")} placeholder="東京都..." />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input type="tel" name="phone" value={data.phone} onChange={onChange} className={fieldClass("phone")} placeholder="09012345678" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input type="email" name="email" value={data.email} onChange={onChange} className={fieldClass("email")} placeholder="example@email.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mt-4">
          <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
            <ShieldCheck size={18} className="mr-2" /> 確認事項
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mb-3">
            <li>動物愛護管理法に基づき、対面での説明を受けました。</li>
            <li>ペットの飼育に必要な環境が整っています。</li>
          </ul>
          <label className="flex items-center space-x-3 cursor-pointer pt-2 border-t border-yellow-200">
            <input type="checkbox" name="checkTerms" checked={data.checkTerms} onChange={onChange} className="w-5 h-5 text-blue-600 rounded" />
            <span className="text-gray-800 font-medium text-sm">上記内容に同意します。</span>
          </label>
          {errors.checkTerms && <p className="text-red-500 text-xs mt-2">{errors.checkTerms}</p>}
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
          戻る
        </button>
        <button
          onClick={handleNext}
          disabled={!data.checkTerms}
          className={`px-8 py-3 rounded-lg font-bold text-white transition-colors ${data.checkTerms ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
        >
          {submitLabel ?? "次へ (署名)"}
        </button>
      </div>
    </div>
  );
};

export default CustomerFormStep;
