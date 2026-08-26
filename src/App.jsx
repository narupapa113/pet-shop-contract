import React, { useState, useEffect, useCallback } from "react";
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
import IncompleteListPage from "./pages/IncompleteListPage";

const INPUT_TYPE_TO_STR = { 1: "text", 2: "number", 3: "date", 4: "select" };
const STEP_TYPE_STR = { 1: "VIDEO", 2: "CUSTOMER_INFO", 3: "SIGNATURE", 4: "STAFF_INPUT", 5: "CONTRACT_PREVIEW" };

const useAppData = (storeId) => {
  const [staffTemplates, setStaffTemplates] = useState(DEFAULT_TEMPLATES);
  const [videoPlaylist, setVideoPlaylist] = useState(DEFAULT_VIDEO_PLAYLIST);
  const [documentsList, setDocumentsList] = useState(DEFAULT_DOCUMENTS);
  const [flows, setFlows] = useState(DEFAULT_FLOWS);
  const [companyInfo, setCompanyInfo] = useState({
    name: "",
    storeName: "",
    address: "",
    phone: "",
  });
  const [users, setUsers] = useState(MOCK_STAFF_USERS);
  const [sessions, setSessions] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  const loadData = useCallback(async () => {
    if (!storeId) return;

    // 会社・店舗情報を取得
    const { data: storeRow } = await supabase
      .from("stores")
      .select("id, name, company_id")
      .eq("id", storeId)
      .maybeSingle();

    let companyName = "";
    if (storeRow?.company_id) {
      const { data: companyRow } = await supabase
        .from("companys")
        .select("id, name")
        .eq("id", storeRow.company_id)
        .maybeSingle();
      companyName = companyRow?.name || "";
    }
    setCompanyInfo({
      name: companyName,
      storeName: storeRow?.name || "",
      address: "",
      phone: "",
    });

    const { data: videosData } = await supabase
      .from("videos")
      .select("*")
      .eq("is_deleted", false)
      .eq("store_id", storeId)
      .order("create_at", { ascending: false });
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
    } else {
      setVideoPlaylist([]);
    }

    const { data: filesData } = await supabase
      .from("files")
      .select("*")
      .eq("is_deleted", false)
      .eq("store_id", storeId)
      .order("create_at", { ascending: false });
    if (filesData) {
      setDocumentsList(filesData.map((f) => ({
        id: f.id,
        title: f.name,
        filename: f.path ? f.path.split("/").pop() : "",
        path: f.path,
        type: "PDF",
        pageCount: f.page_count || 1,
      })));
    }

    const { data: flowsData } = await supabase
      .from("flow_header")
      .select("*")
      .eq("store_id", storeId)
      .order("create_at", { ascending: false });
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
    } else {
      setFlows([]);
    }

    const { data: templatesData } = await supabase
      .from("contract_templates_header")
      .select("id, name")
      .eq("store_id", storeId)
      .order("create_at", { ascending: true });
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
            isRequired: !!item.is_requaier,
          }));
          return { id: tpl.id, name: tpl.name, fields };
        }),
      );
      setStaffTemplates(templatesWithFields);
    } else {
      setStaffTemplates([]);
    }

    setDataReady(true);
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      loadData();
    }
  }, [storeId, loadData]);

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

// ログインユーザーの store_id を取得するフック
const useCurrentUserStore = () => {
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;

      // まず admins テーブルを確認
      const { data: adminRow } = await supabase
        .from("admins")
        .select("store_id")
        .eq("id", uid)
        .maybeSingle();

      if (adminRow) {
        // admins.store_id は uuid[] 配列 — 最初の要素を使用
        const sid = Array.isArray(adminRow.store_id) && adminRow.store_id.length > 0
          ? adminRow.store_id[0]
          : null;
        setStoreId(sid);
        setLoading(false);
        return;
      }

      // 次に users テーブルを確認
      const { data: userRow } = await supabase
        .from("users")
        .select("store_id")
        .eq("id", uid)
        .maybeSingle();

      if (userRow) {
        setStoreId(userRow.store_id || null);
      }
      setLoading(false);
    };
    fetchStoreId();
  }, []);

  return { storeId, loading };
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
const AuthGuard = ({ role, children, onPermissionsLoaded, onStoreIdLoaded }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      const uid = session.user.id;
      if (role === "admin") {
        const { data: adminRow } = await supabase
          .from("admins")
          .select("id, auth_id, store_id")
          .eq("id", uid)
          .maybeSingle();
        if (!adminRow) { setChecking(false); return; }

        // store_id を上位に伝える
        const sid = Array.isArray(adminRow.store_id) && adminRow.store_id.length > 0
          ? adminRow.store_id[0]
          : null;
        onStoreIdLoaded?.(sid);

        if (adminRow.auth_id) {
          const { data: perms } = await supabase
            .from("authority_contents")
            .select("function_id, sub_id")
            .eq("id", adminRow.auth_id);
          const permMap = {};
          (perms || []).forEach(({ function_id, sub_id }) => {
            if (!permMap[function_id]) permMap[function_id] = new Set();
            permMap[function_id].add(sub_id);
          });
          onPermissionsLoaded?.(permMap);
        } else {
          onPermissionsLoaded?.(null);
        }

        setAllowed(true);
      } else {
        const { data: userRow } = await supabase
          .from("users")
          .select("id, store_id")
          .eq("id", uid)
          .maybeSingle();
        if (userRow) {
          onStoreIdLoaded?.(userRow.store_id || null);
          setAllowed(true);
        }
      }
      setChecking(false);
    };
    check();
  }, [role, onPermissionsLoaded, onStoreIdLoaded]);

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
  const [storeId, setStoreId] = useState(null);
  const appData = useAppData(storeId);
  const navigate = useNavigate();
  const location = useLocation();
  const [adminPermissions, setAdminPermissions] = useState(undefined);

  const params = new URLSearchParams(location.search);
  const onetimeId = params.get("onetime");
  const sid = params.get("sid");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStoreId(null);
    navigate("/", { replace: true });
  };

  const commonProps = {
    staffTemplates: appData.staffTemplates,
    videoPlaylist: appData.videoPlaylist,
    documentsList: appData.documentsList,
    flows: appData.flows,
    companyInfo: appData.companyInfo,
    storeId,
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
          <AuthGuard role="admin" onPermissionsLoaded={setAdminPermissions} onStoreIdLoaded={setStoreId}>
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
              adminPermissions={adminPermissions}
              storeId={storeId}
              {...commonProps}
            />
          </AuthGuard>
        }
      />
      <Route
        path="/service"
        element={
          <AuthGuard role="staff" onStoreIdLoaded={setStoreId}>
            <CustomerServiceMode onLogout={handleLogout} {...commonProps} />
          </AuthGuard>
        }
      />
      <Route
        path="/service/incomplete"
        element={
          <AuthGuard role="staff" onStoreIdLoaded={setStoreId}>
            <IncompleteListPage
              onBack={() => navigate("/service", { replace: true })}
              onResume={(item) => navigate("/service", { replace: true, state: { resumeItem: item } })}
              flows={appData.flows}
              staffTemplates={appData.staffTemplates}
              storeId={storeId}
            />
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
