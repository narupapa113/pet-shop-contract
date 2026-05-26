import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DEFAULT_TEMPLATES, DEFAULT_VIDEO_PLAYLIST, DEFAULT_DOCUMENTS, DEFAULT_FLOWS, MOCK_STAFF_USERS } from "./constants";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerServiceMode from "./pages/CustomerServiceMode";
import CustomerRemoteMode from "./pages/CustomerRemoteMode";

const App = () => {
  const [currentView, setCurrentView] = useState("login");
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

      const { data: flowsData } = await supabase
        .from("flow_header")
        .select("*")
        .order("create_at", { ascending: false });
      if (flowsData && flowsData.length > 0) {
        const parsed = flowsData.map((row) => {
          let steps = [];
          try { steps = JSON.parse(row.description || "[]"); } catch { steps = []; }
          return {
            id: row.id,
            name: row.name,
            description: "",
            templateId: row.contract_template_id || "",
            attachmentIds: row.files || [],
            steps,
          };
        });
        setFlows(parsed);
      } else {
        for (const flow of DEFAULT_FLOWS) {
          await supabase.from("flow_header").insert({
            name: flow.name,
            description: JSON.stringify(flow.steps),
            contract_template_id: null,
            files: [],
          });
        }
        const { data: seeded } = await supabase
          .from("flow_header")
          .select("*")
          .order("create_at", { ascending: false });
        if (seeded && seeded.length > 0) {
          const parsed = seeded.map((row) => {
            let steps = [];
            try { steps = JSON.parse(row.description || "[]"); } catch { steps = []; }
            return {
              id: row.id,
              name: row.name,
              description: "",
              templateId: "",
              attachmentIds: [],
              steps,
            };
          });
          setFlows(parsed);
        }
      }

      setDataReady(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sid");
    if (sid) {
      const session = sessions.find((s) => s.id === sid) || {
        id: sid,
        flowId: flows[0]?.id,
        status: "unstarted",
      };
      setRemoteSession(session);
      setCurrentView("remote_customer");
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

  if (!dataReady) {
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
    </>
  );
};

export default App;
