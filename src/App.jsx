import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DEFAULT_TEMPLATES, DEFAULT_VIDEO_PLAYLIST, DEFAULT_DOCUMENTS, DEFAULT_FLOWS, MOCK_STAFF_USERS } from "./constants";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerServiceMode from "./pages/CustomerServiceMode";
import CustomerRemoteMode from "./pages/CustomerRemoteMode";
import OnetimeUrlPage from "./pages/OnetimeUrlPage";

const App = () => {
  const params = new URLSearchParams(window.location.search);
  const [onetimeId] = useState(() => params.get("onetime"));
  const [initialView] = useState(() => params.get("onetime") ? "onetime" : params.get("sid") ? "remote_customer" : "login");

  const [currentView, setCurrentView] = useState(initialView);
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
  const [dataReady, setDataReady] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [remoteSession, setRemoteSession] = useState(null);

  const INPUT_TYPE_TO_STR = { 1: "text", 2: "number", 3: "date", 4: "select" };

  useEffect(() => {
    const loadData = async () => {
      const { data: videosData } = await supabase
        .from("videos")
        .select("*")
        .order("create_at", { ascending: false });
      if (videosData && videosData.length > 0) {
        const videos = await Promise.all(
          videosData.map(async (v) => {
            let url = null;
            if (v.path) {
              const { data: signed } = await supabase.storage
                .from("videos")
                .createSignedUrl(v.path, 3600);
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

      const STEP_TYPE_STR = { 1: "VIDEO", 2: "CUSTOMER_INFO", 3: "SIGNATURE", 4: "STAFF_INPUT", 5: "CONTRACT_PREVIEW" };

      const { data: flowsData } = await supabase
        .from("flow_header")
        .select("*")
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
      }

      const { data: templatesData } = await supabase
        .from("contract_templates_header")
        .select("id, name")
        .order("create_at", { ascending: true });
      if (templatesData && templatesData.length > 0) {
        const templatesWithFields = await Promise.all(
          templatesData.map(async (tpl) => {
            const { data: items } = await supabase
              .from("contract_templates_item")
              .select("*")
              .eq("id", tpl.id)
              .order("item_no", { ascending: true });
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

  useEffect(() => {
    const sid = params.get("sid");
    if (sid && dataReady) {
      const session = sessions.find((s) => s.id === sid) || {
        id: sid,
        flowId: flows[0]?.id,
        status: "unstarted",
      };
      setRemoteSession(session);
    }
  }, [dataReady]);

  const handleLoginAdmin = () => setCurrentView("admin");
  const handleLoginStaff = () => setCurrentView("service");
  const handleLogout = () => {
    setCurrentView("login");
    setRemoteSession(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  const handleRemoteComplete = (sessionId, data) => {
    setSessions((prev) =>
      prev.map((s) => s.id === sessionId ? { ...s, status: "completed", data } : s),
    );
    alert("送信が完了しました。店舗スタッフにお知らせください。");
    handleLogout();
  };

  if (!dataReady && currentView !== "onetime") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <>
      {currentView === "login" && (
        <LoginPage
          onLoginAdmin={handleLoginAdmin}
          onLoginStaff={handleLoginStaff}
          companyName={companyInfo.name}
        />
      )}
      {currentView === "admin" && (
        <AdminDashboard
          onLogout={handleLogout}
          staffTemplates={staffTemplates}
          setStaffTemplates={setStaffTemplates}
          videoPlaylist={videoPlaylist}
          setVideoPlaylist={setVideoPlaylist}
          documentsList={documentsList}
          setDocumentsList={setDocumentsList}
          flows={flows}
          setFlows={setFlows}
          companyInfo={companyInfo}
          setCompanyInfo={setCompanyInfo}
          users={users}
          setUsers={setUsers}
          sessions={sessions}
          setSessions={setSessions}
        />
      )}
      {currentView === "service" && (
        <CustomerServiceMode
          onLogout={handleLogout}
          staffTemplates={staffTemplates}
          videoPlaylist={videoPlaylist}
          documentsList={documentsList}
          flows={flows}
          companyInfo={companyInfo}
        />
      )}
      {currentView === "remote_customer" && remoteSession && (
        <CustomerRemoteMode
          remoteSession={remoteSession}
          onComplete={handleRemoteComplete}
          videoPlaylist={videoPlaylist}
          staffTemplates={staffTemplates}
          documentsList={documentsList}
          flows={flows}
          companyInfo={companyInfo}
        />
      )}
      {currentView === "onetime" && onetimeId && (
        <OnetimeUrlPage
          onetimeId={onetimeId}
          videoPlaylist={videoPlaylist}
          staffTemplates={staffTemplates}
          documentsList={documentsList}
          flows={flows}
        />
      )}
    </>
  );
};

export default App;
