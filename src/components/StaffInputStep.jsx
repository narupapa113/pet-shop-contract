import React, { useState } from "react";
import { Settings, Trash2, Plus, FileText } from "lucide-react";

const StaffInputStep = ({ fields, onFieldChange, onAdd, onRemove, onUpdateLabel, onNext, onPrev }) => {
  const [isEditingFields, setIsEditingFields] = useState(false);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-indigo-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">店舗スタッフ入力画面</h2>
          <p className="text-sm text-gray-500 mt-1">販売するペットの詳細情報を入力してください。</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditingFields(!isEditingFields)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isEditingFields ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
          >
            <Settings size={16} className="mr-2" />
            {isEditingFields ? "入力完了" : "一時的な項目編集"}
          </button>
        </div>
      </div>
      {isEditingFields && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-100 text-yellow-800 text-sm">
          <p className="font-bold mb-1">注意: ここでの編集はこの契約のみに適用されます</p>
          全ての契約に適用する項目変更は、管理画面の「契約書テンプレート」から行ってください。
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div key={field.id} className="relative group">
            <div className="flex items-center justify-between mb-1">
              {isEditingFields ? (
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => onUpdateLabel(field.id, e.target.value)}
                  className="text-sm font-bold text-indigo-700 bg-white border border-indigo-300 rounded px-2 py-1 w-full mr-2"
                />
              ) : (
                <label className="block text-sm font-bold text-gray-700">{field.label}</label>
              )}
              {isEditingFields && (
                <button onClick={() => onRemove(field.id)} className="text-red-500 p-1">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {field.type === "select" ? (
              <select
                value={field.value}
                onChange={(e) => onFieldChange(field.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">選択してください</option>
                {field.options && field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => onFieldChange(field.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder={field.placeholder || ""}
              />
            )}
          </div>
        ))}
        {isEditingFields && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center h-[74px] border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:bg-indigo-50"
          >
            <Plus size={20} className="mr-2" />
            項目を追加
          </button>
        )}
      </div>
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600">
          戻る
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center shadow-lg"
        >
          <FileText size={18} className="mr-2" />
          契約書を作成する
        </button>
      </div>
    </div>
  );
};

export default StaffInputStep;
