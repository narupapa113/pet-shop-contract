import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

const validatePhone = (phone) => {
  const digits = phone.replace(/[-\s]/g, "");
  if (!/^\d+$/.test(digits)) return "数字のみで入力してください";
  if (digits.length < 10 || digits.length > 11) return "電話番号は10〜11桁で入力してください";
  return null;
};

const CustomerFormStep = ({ data, onChange, onNext, onPrev }) => {
  const [errors, setErrors] = useState({});

  const handleNext = () => {
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
    onNext();
  };

  const fieldClass = (name) =>
    `w-full p-3 border rounded-lg ${errors[name] ? "border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border-gray-300"}`;

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
          次へ (署名)
        </button>
      </div>
    </div>
  );
};

export default CustomerFormStep;
