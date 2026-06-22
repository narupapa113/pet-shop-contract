import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { DEFAULT_TEMPLATES, DEFAULT_VIDEO_PLAYLIST, DEFAULT_DOCUMENTS, DEFAULT_FLOWS, MOCK_STAFF_USERS } from "./constants";
import RoleSelectPage from "./pages/RoleSelectPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerServiceMode from "./pages/CustomerServiceMode";
import CustomerRemoteMode from "./pages/CustomerRemoteMode";
import OnetimeUrlPage from "./pages/OnetimeUrlPage";

const INPUT_TYPE_TO_STR = { 1: "text", 2: "number", 3: "date", 4: "select" };
const STEP_TYPE_STR = { 1: "VIDEO", 2: "CUSTOMER_INFO", 3: "SIGNATURE", 4: "STAFF_INPUT", 5: "CONTRACT_PREVIEW" };

const useAppData = () => {
  const [staffTemplates, setStaffTemplates] = useState(DEFAULT_TEMPLATES);
  const [videoPlaylist, setVideoPlaylist] = useState(DEFAULT_VIDEO_PLAYLIST);
  const [documentsList, setDocumentsList] = useState(DEFAULT_DOCUMENTS);
  const [flows, setFlows] = useState(DEFAULT_FLOWS);
  const [companyInfo, setCompanyInfo] = useState({
    name: "株式会社ペットショップ見本",
    address: "東京都渋谷区XX-XX",
    phone: "03-XXXX-XXXX",
  });
  const [users, setUsers] = useState(MOCK_STAFF_USERS);
  const [sessions, setSessions] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const { data: videosData } = await supabase.from("videos").select("*").order("create_at", { ascending: false });
      if (videosData && videosData.length > 0) {
        const videos = await Promise.all(
          videosData.map(async (v) => {
            let url = null;
            if (v.path) {
              const { data: signed } = await supabase.storage.from("videos").createSignedUrl(v.path, 3600);
              url = signed?.signedUrl || null;
            }
            return {
              id: v.id,
              title: v.name,
              duration: v.video_time
                ? `${Math.floor(v.video_time / 60)}:${String(v.video_time % 60).padStart(2, "0")}`
                : "0:00",
              description: v.description || "",
              path: v.path,
              url,
            };
          }),
        );
        setVideoPlaylist(videos);
      }

      const { data: filesData } = await supabase.from("files").select("*").order("create_at", { ascending: false });
      if (filesData) {
        setDocumentsList(filesData.map((f) => ({
          id: f.id,
          title: f.name,
          filename: f.path ? f.path.split("/").pop() : "",
          path: f.path,
          type: "PDF",
        })));
      }

      const { data: flowsData } = await supabase.from("flow_header").select("*").order("create_at", { ascending: false });
      if (flowsData && flowsData.length > 0) {
        const parsed = await Promise.all(flowsData.map(async (row) => {
          const { data: stepData } = await supabase.from("flow_step").select("*").eq("id", row.id).order("flow_step_no", { ascending: true });
          const steps = (stepData || []).map((s) => ({
            id: `s_${s.flow_step_no}`,
            title: s.name,
            type: STEP_TYPE_STR[s.type] || "VIDEO",
            videoIds: s.video_id || [],
          }));
          return {
            id: row.id,
            name: row.name,
            description: row.description || "",
            templateId: row.contract_template_id || "",
            attachmentIds: row.files || [],
            flowType: row.type ?? 1,
            steps,
          };
        }));
        setFlows(parsed);
      }

      const { data: templatesData } = await supabase.from("contract_templates_header").select("id, name").order("create_at", { ascending: true });
      if (templatesData && templatesData.length > 0) {
        const templatesWithFields = await Promise.all(
          templatesData.map(async (tpl) => {
            const { data: items } = await supabase.from("contract_templates_item").select("*").eq("id", tpl.id).order("item_no", { ascending: true });
            const fields = (items || []).map((item) => ({
              id: `field_${item.item_no}`,
              label: item.item_name,
              value: "",
              type: INPUT_TYPE_TO_STR[item.input_type] || "text",
              placeholder: item.placeholder || "",
              options: item.input_select || [],
            }));
            return { id: tpl.id, name: tpl.name, fields };
          }),
        );
        setStaffTemplates(templatesWithFields);
      }

      setDataReady(true);
    };
    loadData();
  }, []);

  return {
    staffTemplates, setStaffTemplates,
    videoPlaylist, setVideoPlaylist,
    documentsList, setDocumentsList,
    flows, setFlows,
    companyInfo, setCompanyInfo,
    users, setUsers,
    sessions, setSessions,
    dataReady,
  };
};

// ログイン選択画面: セッション済みなら役割に応じてリダイレクト
const RoleSelectGuard = ({ companyName }) => {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      const uid = session.user.id;
      const { data: adminRow } = await supabase.from("admins").select("id").eq("id", uid).maybeSingle();
      if (adminRow) { navigate("/admin", { replace: true }); return; }
      const { data: userRow } = await supabase.from("users").select("id").eq("id", uid).maybeSingle();
      if (userRow) { navigate("/service", { replace: true }); return; }
      setChecking(false);
    };
    check();
  }, [navigate]);

  if (checking) return <Loading />;
  return <RoleSelectPage companyName={companyName} />;
};

// 保護ルート: 未認証またはロール不一致はログイン画面へ
const AuthGuard = ({ role, children }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      const uid = session.user.id;
      if (role === "admin") {
        const { data } = await supabase.from("admins").select("id").eq("id", uid).maybeSingle();
        setAllowed(!!data);
      } else {
        const { data } = await supabase.from("users").select("id").eq("id", uid).maybeSingle();
        setAllowed(!!data);
      }
      setChecking(false);
    };
    check();
  }, [role]);

  if (checking) return <Loading />;
  if (!allowed) return <Navigate to={role === "admin" ? "/admin-login" : "/stuff-login"} replace />;
  return children;
};

const Loading = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-gray-500 text-sm">読み込み中...</div>
  </div>
);

const AppRoutes = () => {
  const appData = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const onetimeId = params.get("onetime");
  const sid = params.get("sid");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const commonProps = {
    staffTemplates: appData.staffTemplates,
    videoPlaylist: appData.videoPlaylist,
    documentsList: appData.documentsList,
    flows: appData.flows,
    companyInfo: appData.companyInfo,
  };

  // ?onetime= または ?sid= クエリは認証不要でそのまま表示
  if (onetimeId) {
    return <OnetimeUrlPage onetimeId={onetimeId} {...commonProps} />;
  }
  if (sid) {
    const remoteSession = { id: sid, flowId: appData.flows[0]?.id, status: "unstarted" };
    return (
      <CustomerRemoteMode
        remoteSession={remoteSession}
        onComplete={() => {
          alert("送信が完了しました。店舗スタッフにお知らせください。");
          navigate("/");
        }}
        {...commonProps}
      />
    );
  }

  if (!appData.dataReady) return <Loading />;

  return (
    <Routes>
      <Route path="/" element={<RoleSelectGuard companyName={appData.companyInfo.name} />} />
      <Route path="/admin-login" element={<AdminLoginPage companyName={appData.companyInfo.name} />} />
      <Route path="/stuff-login" element={<StaffLoginPage companyName={appData.companyInfo.name} />} />
      <Route
        path="/admin"
        element={
          <AuthGuard role="admin">
            <AdminDashboard
              onLogout={handleLogout}
              setStaffTemplates={appData.setStaffTemplates}
              setVideoPlaylist={appData.setVideoPlaylist}
              setDocumentsList={appData.setDocumentsList}
              setFlows={appData.setFlows}
              setCompanyInfo={appData.setCompanyInfo}
              users={appData.users}
              setUsers={appData.setUsers}
              sessions={appData.sessions}
              setSessions={appData.setSessions}
              {...commonProps}
            />
          </AuthGuard>
        }
      />
      <Route
        path="/service"
        element={
          <AuthGuard role="staff">
            <CustomerServiceMode onLogout={handleLogout} {...commonProps} />
          </AuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
