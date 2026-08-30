import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Mail, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

const AdminLoginPage = ({ companyName }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error("メールアドレスまたはパスワードが正しくありません");

      const userId = authData.user.id;
      const { data: adminRow } = await supabase.from("admins").select("id").eq("id", userId).maybeSingle();
      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error("管理者権限がありません");
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Settings size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">管理者ログイン</h1>
          <p className="text-blue-100 text-sm">{companyName || "Doga de Sign"}</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 px-8 py-4 border-t">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            ログイン選択に戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
