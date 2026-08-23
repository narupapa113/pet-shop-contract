import React, { useState } from "react";
import { Settings, Trash2, Plus, FileText, CircleAlert as AlertCircle } from "lucide-react";

const REMARKS_LABELS = ["備考1", "備考2", "備考3"];

const StaffInputStep = ({ fields, templateName, onFieldChange, onAdd, onRemove, onUpdateLabel, onNext, onPrev, remarksArr, onRemarksChange }) => {
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [requiredErrors, setRequiredErrors] = useState({});
  const arr = Array.isArray(remarksArr) ? remarksArr : ["", "", ""];

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-blue-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">店舗スタッフ入力画面</h2>
          {templateName && (
            <p className="text-sm text-blue-600 mt-1 font-medium">テンプレート: {templateName}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">販売するペットの詳細情報を入力してください。</p>
        </div>
        {fields.length > 0 && (
          <button
            onClick={() => setIsEditingFields(!isEditingFields)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isEditingFields ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
          >
            <Settings size={16} className="mr-2" />
            {isEditingFields ? "入力完了" : "一時的な項目編集"}
          </button>
        )}
      </div>

      {isEditingFields && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200 text-yellow-800 text-sm">
          <p className="font-bold mb-1">注意: ここでの編集はこの契約のみに適用されます</p>
          全ての契約に適用する項目変更は、管理画面の「契約書テンプレート」から行ってください。
        </div>
      )}

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <AlertCircle size={40} className="mb-3 text-gray-300" />
          <p className="text-base font-medium">入力項目がありません</p>
          <p className="text-sm mt-1">このフローには契約書テンプレートが設定されていないか、項目が登録されていません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.id} className="relative group">
              <div className="flex items-center justify-between mb-1">
                {isEditingFields ? (
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdateLabel(field.id, e.target.value)}
                    className="text-sm font-bold text-blue-700 bg-white border border-blue-300 rounded px-2 py-1 w-full mr-2"
                  />
                ) : (
                  <label className="block text-sm font-bold text-gray-700">{field.label}{field.isRequired && <span className="text-red-500 ml-1">*</span>}</label>
                )}
                {isEditingFields && (
                  <button onClick={() => onRemove(field.id)} className="text-red-500 p-1 flex-shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {field.type === "select" ? (
                <>
                <select
                  value={field.value}
                  onChange={(e) => { onFieldChange(field.id, e.target.value); if (requiredErrors[field.id]) setRequiredErrors((p) => { const n = { ...p }; delete n[field.id]; return n; }); }}
                  className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 ${requiredErrors[field.id] ? "border-red-400" : "border-gray-300"}`}
                >
                  <option value="">選択してください</option>
                  {field.options && field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {requiredErrors[field.id] && <p className="text-xs text-red-500 mt-1">必須入力の項目です</p>}
                </>
              ) : (
                <>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => { onFieldChange(field.id, e.target.value); if (requiredErrors[field.id]) setRequiredErrors((p) => { const n = { ...p }; delete n[field.id]; return n; }); }}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${requiredErrors[field.id] ? "border-red-400" : "border-gray-300"}`}
                  placeholder={field.placeholder || ""}
                />
                {requiredErrors[field.id] && <p className="text-xs text-red-500 mt-1">必須入力の項目です</p>}
                </>
              )}
            </div>
          ))}
          {isEditingFields && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center h-[74px] border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              項目を追加
            </button>
          )}
        </div>
      )}

      {/* 備考欄 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {REMARKS_LABELS.map((label, i) => (
          <div key={i}>
            <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
            <textarea
              value={arr[i] ?? ""}
              onChange={(e) => onRemarksChange && onRemarksChange(i, e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              placeholder={`${label}を入力してください`}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          戻る
        </button>
        <button
          onClick={() => {
            const missing = fields.filter((f) => f.isRequired && !String(f.value ?? "").trim());
            if (missing.length > 0) {
              const errs = {};
              missing.forEach((f) => { errs[f.id] = true; });
              setRequiredErrors(errs);
              return;
            }
            setRequiredErrors({});
            onNext();
          }}
          className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center shadow-lg transition-colors"
        >
          <FileText size={18} className="mr-2" />
          契約書を作成する
        </button>
      </div>
    </div>
  );
};

export default StaffInputStep;
