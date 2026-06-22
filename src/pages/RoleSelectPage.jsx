import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings, User } from "lucide-react";

const RoleSelectPage = ({ companyName }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{companyName || "Pet Shop System"}</h1>
          <p className="text-blue-100">販売管理・接客支援アプリ</p>
        </div>
        <div className="p-8 space-y-4">
          <button
            onClick={() => navigate("/admin-login")}
            className="w-full py-4 bg-white border-2 border-blue-600 hover:bg-blue-50 text-blue-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-3 shadow-sm"
          >
            <Settings size={22} />
            管理者ログイン
          </button>
          <button
            onClick={() => navigate("/stuff-login")}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-3 shadow-md"
          >
            <User size={22} />
            スタッフログイン
          </button>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400 border-t">
          © 2024 {companyName || "Pet Shop Contract System"}
        </div>
      </div>
    </div>
  );
};

export default RoleSelectPage;
