import React, { useState } from "react";
import { User, ChevronRight, Lock } from "lucide-react";

const LoginPage = ({ onLoginAdmin, onLoginStaff, companyName }) => {
  const [demoUrl, setDemoUrl] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{companyName || "Doga de Sign"}</h1>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            <div>
              <button
                onClick={onLoginAdmin}
                className="w-full py-3 border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-bold rounded-lg transition-colors flex items-center justify-center"
              >
                <Lock size={18} className="mr-2" />
                管理画面へログイン
              </button>
            </div>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">または</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="text-blue-600" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">接客スタッフの方</h3>
              <p className="text-sm text-gray-500 mb-4">お客様への説明・契約作成を行います</p>
              <button
                onClick={onLoginStaff}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-md flex items-center justify-center"
              >
                接客を開始する <ChevronRight size={18} className="ml-1" />
              </button>
            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-xs text-gray-400 mb-2 text-center">デモ用: 発行されたURLを入力して移動</p>
              <div className="flex">
                <input
                  type="text"
                  placeholder="?sid=..."
                  className="flex-1 border border-gray-300 rounded-l p-2 text-xs"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
                <button
                  onClick={() => (window.location.search = demoUrl)}
                  className="bg-gray-200 px-3 rounded-r text-xs font-bold hover:bg-gray-300"
                >
                  GO
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400 border-t">
          © 2026 KAWACHIYA
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
