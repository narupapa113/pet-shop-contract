import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  FileText,
  Plus,
  Trash2,
  Upload,
  LogOut,
  Users,
  ChartBar as BarChart3,
  Calendar,
  Save,
  CircleCheck as CheckCircle,
  CreditCard as Edit2,
  Film,
  X,
  ArrowUp,
  ArrowDown,
  MoveVertical as MoreVertical,
  History,
  User,
  Phone,
  Mail,
  Play,
  Link,
  Smartphone,
  List,
  LayoutDashboard,
  Briefcase,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { STEP_TYPES, DEFAULT_TEMPLATES } from "../constants";

const AdminDashboard = ({
  onLogout,
  staffTemplates,
  setStaffTemplates,
  videoPlaylist,
  setVideoPlaylist,
  documentsList,
  setDocumentsList,
  flows,
  setFlows,
  companyInfo,
  setCompanyInfo,
  users,
  setUsers,
  sessions,
  setSessions,
}) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTemplateId, setSelectedTemplateId] = useState(staffTemplates[0]?.id);
  const [isSaved, setIsSaved] = useState(false);

  // --- テンプレート管理 ---
  const activeTemplateIndex = staffTemplates.findIndex((t) => t.id === selectedTemplateId);
  const activeTemplate =
    activeTemplateIndex >= 0
      ? staffTemplates[activeTemplateIndex]
      : staffTemplates.length > 0
        ? staffTemplates[0]
        : null;

  const updateTemplateName = (name) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    newTemplates.find((t) => t.id === activeTemplate.id).name = name;
    setStaffTemplates(newTemplates);
  };

  const updateField = (fieldIndex, key, value) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex][key] = value;
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const addField = () => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    newTemplates.find((t) => t.id === activeTemplate.id).fields.push({
      id: `field_${Date.now()}`,
      label: "新しい項目",
      value: "",
      type: "text",
      placeholder: "",
    });
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const removeField = (fieldIndex) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    const tpl = newTemplates.find((t) => t.id === activeTemplate.id);
    tpl.fields = tpl.fields.filter((_, i) => i !== fieldIndex);
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const addNewTemplate = () => {
    const newId = `tpl_${Date.now()}`;
    const newTemplate = {
      id: newId,
      name: "新しいテンプレート",
      fields: [...DEFAULT_TEMPLATES[0].fields],
    };
    setStaffTemplates([...staffTemplates, newTemplate]);
    setSelectedTemplateId(newId);
  };

  const deleteTemplate = (id) => {
    if (staffTemplates.length <= 1) return alert("最後のテンプレートは削除できません");
    if (window.confirm("このテンプレートを削除してもよろしいですか？")) {
      setStaffTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateId === id) setSelectedTemplateId(staffTemplates[0].id);
    }
  };

  const saveTemplate = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // --- コンテンツ管理 ---
  const [contentTab, setContentTab] = useState("video");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState(null);
  const [newContentData, setNewContentData] = useState({ title: "", duration: "", description: "", filename: "", type: "PDF" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [thumbnails, setThumbnails] = useState({});

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase.from("videos").select("*").order("create_at", { ascending: false });
    if (data) {
      const videos = await Promise.all(
        data.map(async (v) => {
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
            createdAt: v.create_at
              ? new Date(v.create_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "/")
              : "",
          };
        }),
      );
      setVideoPlaylist(videos);
    }
  }, [setVideoPlaylist]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const generateThumbnail = useCallback((videoId, url) => {
    if (!url) return;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => { video.currentTime = 0.5; };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        setThumbnails((prev) => ({ ...prev, [videoId]: canvas.toDataURL("image/jpeg") }));
      } catch (_) {}
    };
    video.src = url;
  }, []);

  useEffect(() => {
    videoPlaylist.forEach((v) => {
      if (v.url && !thumbnails[v.id]) generateThumbnail(v.id, v.url);
    });
  }, [videoPlaylist, generateThumbnail]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setNewContentData((prev) => ({ ...prev, title: nameWithoutExt }));
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const secs = Math.round(videoEl.duration);
      const m = Math.floor(secs / 60);
      const s = String(secs % 60).padStart(2, "0");
      setNewContentData((prev) => ({ ...prev, duration: `${m}:${s}` }));
    };
    videoEl.src = objectUrl;
  };

  const openUploadModal = (content = null) => {
    setSelectedFile(null);
    if (content) {
      setEditingContentId(content.id);
      setNewContentData({ title: content.title, duration: content.duration || "", description: content.description || "", filename: content.filename || "", type: content.type || "PDF" });
    } else {
      setEditingContentId(null);
      setNewContentData({ title: "", duration: "", description: "", filename: "", type: "PDF" });
    }
    setUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    setUploadModalOpen(false);
    setIsUploading(false);
    setUploadProgress("");
    setUploadProgressPct(0);
    setSelectedFile(null);
  };

  const handleContentSave = async () => {
    if (!newContentData.title) return;
    if (contentTab === "video") {
      const duplicate = videoPlaylist.find((v) => v.title === newContentData.title && v.id !== editingContentId);
      if (duplicate) {
        alert(`「${newContentData.title}」という名前の動画は既に登録されています。別のタイトルを入力してください。`);
        return;
      }
    }
    setIsUploading(true);
    try {
      if (contentTab === "video") {
        if (editingContentId) {
          let updatePayload = {
            name: newContentData.title,
            description: newContentData.description,
            update_at: new Date().toISOString(),
          };
          const durationParts = newContentData.duration.split(":");
          updatePayload.video_time = durationParts.length === 2 ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]) : 0;
          if (selectedFile) {
            setUploadProgress("動画をアップロード中...");
            setUploadProgressPct(0);
            const ext = selectedFile.name.split(".").pop();
            const filePath = `${Date.now()}.${ext}`;
            const totalSize = selectedFile.size;
            let lastLoaded = 0;
            const fakeProgress = setInterval(() => {
              lastLoaded = Math.min(lastLoaded + totalSize * 0.05, totalSize * 0.9);
              setUploadProgressPct(Math.round((lastLoaded / totalSize) * 100));
            }, 200);
            const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, selectedFile);
            clearInterval(fakeProgress);
            setUploadProgressPct(100);
            if (uploadError) throw uploadError;
            const oldVideo = videoPlaylist.find((v) => v.id === editingContentId);
            if (oldVideo?.path) await supabase.storage.from("videos").remove([oldVideo.path]);
            updatePayload.path = filePath;
            setThumbnails((prev) => { const n = { ...prev }; delete n[editingContentId]; return n; });
          }
          setUploadProgress("情報を更新中...");
          const { error } = await supabase.from("videos").update(updatePayload).eq("id", editingContentId);
          if (error) throw error;
        } else {
          if (!selectedFile) {
            alert("動画ファイルを選択してください");
            setIsUploading(false);
            return;
          }
          setUploadProgress("動画をアップロード中...");
          setUploadProgressPct(0);
          const ext = selectedFile.name.split(".").pop();
          const filePath = `${Date.now()}.${ext}`;
          const totalSize = selectedFile.size;
          let lastLoaded = 0;
          const fakeProgress = setInterval(() => {
            lastLoaded = Math.min(lastLoaded + totalSize * 0.05, totalSize * 0.9);
            setUploadProgressPct(Math.round((lastLoaded / totalSize) * 100));
          }, 200);
          const { error: uploadError } = await supabase.storage.from("videos").upload(filePath, selectedFile);
          clearInterval(fakeProgress);
          setUploadProgressPct(100);
          if (uploadError) throw uploadError;
          setUploadProgress("情報を保存中...");
          const durationParts = newContentData.duration.split(":");
          const videoTimeSecs = durationParts.length === 2 ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]) : 0;
          const { error: dbError } = await supabase.from("videos").insert({
            name: newContentData.title,
            description: newContentData.description,
            path: filePath,
            video_time: videoTimeSecs,
          });
          if (dbError) throw dbError;
        }
        setUploadProgress("一覧を更新中...");
        await fetchVideos();
      } else {
        if (editingContentId) {
          setDocumentsList((prev) => prev.map((d) => d.id === editingContentId ? { ...d, ...newContentData } : d));
        } else {
          const newDoc = { id: `doc_${Date.now()}`, ...newContentData, filename: newContentData.filename || "uploaded_file.pdf" };
          setDocumentsList((prev) => [...prev, newDoc]);
        }
      }
      closeUploadModal();
    } catch (err) {
      console.error("保存エラー:", err);
      setUploadProgress("");
      setIsUploading(false);
      alert("保存に失敗しました: " + err.message);
    }
  };

  const deleteContent = async (id) => {
    if (contentTab === "video") {
      const video = videoPlaylist.find((v) => v.id === id);
      if (video?.path) await supabase.storage.from("videos").remove([video.path]);
      await supabase.from("videos").delete().eq("id", id);
      setThumbnails((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await fetchVideos();
    } else {
      setDocumentsList((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleteConfirmId(null);
  };

  // --- フロー管理 ---
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [newFlowData, setNewFlowData] = useState({ name: "", description: "", templateId: "", attachmentIds: [] });
  const [editingSteps, setEditingSteps] = useState([]);
  const [flowModalOpen, setFlowModalOpen] = useState(false);

  const fetchFlows = useCallback(async () => {
    const { data } = await supabase.from("flow_header").select("*").order("create_at", { ascending: false });
    if (data && data.length > 0) {
      const parsed = data.map((row) => {
        let steps = [];
        try { steps = JSON.parse(row.description || "[]"); } catch { steps = []; }
        return { id: row.id, name: row.name, description: "", templateId: row.contract_template_id || "", attachmentIds: row.files || [], steps };
      });
      setFlows(parsed);
    }
  }, [setFlows]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const openFlowModal = (flow = null) => {
    if (flow) {
      setEditingFlowId(flow.id);
      setNewFlowData({ name: flow.name, description: flow.description || "", templateId: flow.templateId || staffTemplates[0]?.id || "", attachmentIds: flow.attachmentIds || [] });
      setEditingSteps([...flow.steps]);
    } else {
      setEditingFlowId(null);
      setNewFlowData({ name: "", description: "", templateId: staffTemplates[0]?.id || "", attachmentIds: [] });
      setEditingSteps([{ id: `s_${Date.now()}`, type: "VIDEO", title: "動画ステップ", videoIds: [] }]);
    }
    setFlowModalOpen(true);
  };

  const addStep = () => {
    setEditingSteps([...editingSteps, { id: `s_${Date.now()}`, type: "VIDEO", title: "新しいステップ", videoIds: [] }]);
  };

  const removeStep = (index) => setEditingSteps(editingSteps.filter((_, i) => i !== index));

  const updateStep = (index, key, value) => {
    const newSteps = [...editingSteps];
    newSteps[index][key] = value;
    setEditingSteps(newSteps);
  };

  const moveStep = (index, direction) => {
    if (direction === "up" && index > 0) {
      const newSteps = [...editingSteps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setEditingSteps(newSteps);
    } else if (direction === "down" && index < editingSteps.length - 1) {
      const newSteps = [...editingSteps];
      [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
      setEditingSteps(newSteps);
    }
  };

  const handleVideoSelection = (stepIndex, videoId) => {
    const step = editingSteps[stepIndex];
    const currentIds = step.videoIds || [];
    const newIds = currentIds.includes(videoId) ? currentIds.filter((id) => id !== videoId) : [...currentIds, videoId];
    updateStep(stepIndex, "videoIds", newIds);
  };

  const handleAttachmentSelection = (docId) => {
    const currentIds = newFlowData.attachmentIds || [];
    const newIds = currentIds.includes(docId) ? currentIds.filter((id) => id !== docId) : [...currentIds, docId];
    setNewFlowData({ ...newFlowData, attachmentIds: newIds });
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const saveFlow = async () => {
    if (!newFlowData.name) return;
    const stepsJson = JSON.stringify(editingSteps);
    const validUuid = (v) => (v && uuidRegex.test(v) ? v : null);
    const payload = {
      name: newFlowData.name,
      description: stepsJson,
      contract_template_id: validUuid(newFlowData.templateId),
      files: (newFlowData.attachmentIds || []).filter((id) => uuidRegex.test(id)),
    };
    let error;
    if (editingFlowId) {
      ({ error } = await supabase.from("flow_header").update({ ...payload, update_at: new Date().toISOString() }).eq("id", editingFlowId));
    } else {
      ({ error } = await supabase.from("flow_header").insert(payload));
    }
    if (error) { alert(`保存に失敗しました: ${error.message}`); return; }
    await fetchFlows();
    setFlowModalOpen(false);
  };

  const deleteFlow = async (id) => {
    if (window.confirm("このフローを削除してもよろしいですか？")) {
      await supabase.from("flow_header").delete().eq("id", id);
      await fetchFlows();
    }
  };

  // --- 事前受付管理 ---
  const [selectedFlowForSession, setSelectedFlowForSession] = useState(flows[0]?.id);

  const createSession = () => {
    const newSession = {
      id: Math.random().toString(36).substr(2, 9),
      flowId: selectedFlowForSession,
      flowName: flows.find((f) => f.id === selectedFlowForSession)?.name,
      createdAt: new Date().toLocaleString(),
      status: "unstarted",
      data: null,
    };
    setSessions((prev) => [newSession, ...prev]);
  };

  // --- 顧客管理 ---
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    const { data } = await supabase.from("customers").select("*").order("create_at", { ascending: false });
    if (data) setCustomers(data);
    setCustomersLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
  }, [activeTab, fetchCustomers]);

  // --- 設定 ---
  const [settingsTab, setSettingsTab] = useState("company");
  const [tempCompanyInfo, setTempCompanyInfo] = useState(companyInfo);

  const handleSaveCompany = () => {
    setCompanyInfo(tempCompanyInfo);
    alert("会社情報を保存しました");
  };

  const MenuButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors ${activeTab === id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* サイドバー */}
      <div className="w-64 bg-white shadow-lg flex flex-col z-10">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Settings className="mr-2 text-blue-600" />
            管理画面
          </h2>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 mb-2 px-4">メインメニュー</p>
          <MenuButton id="dashboard" icon={LayoutDashboard} label="ダッシュボード" />
          <MenuButton id="remote" icon={Smartphone} label="事前受付URL発行" />
          <MenuButton id="history" icon={History} label="契約履歴" />
          <MenuButton id="customers" icon={Users} label="顧客管理" />
          <MenuButton id="template" icon={FileText} label="契約書テンプレート" />
          <MenuButton id="upload" icon={Upload} label="コンテンツ管理" />
          <MenuButton id="flow" icon={List} label="接客フロー作成" />
          <div className="my-4 border-t border-gray-100"></div>
          <p className="text-xs font-bold text-gray-400 mb-2 px-4">システム</p>
          <MenuButton id="settings" icon={Settings} label="設定" />
        </nav>
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onLogout} className="flex items-center text-red-600 hover:text-red-700 font-medium px-4 py-2 w-full">
            <LogOut size={18} className="mr-2" /> ログアウト
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 overflow-auto p-8 relative">
        {/* ダッシュボード */}
        {activeTab === "dashboard" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-blue-800 font-bold">今月の契約数</h3>
                  <FileText className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">24 <span className="text-sm font-normal text-gray-500">件</span></p>
              </div>
              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-green-800 font-bold">売上高</h3>
                  <BarChart3 className="text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">¥4,820,000</p>
              </div>
              <div className="bg-sky-50 p-6 rounded-xl border border-sky-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sky-800 font-bold">来店予約</h3>
                  <Calendar className="text-sky-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">8 <span className="text-sm font-normal text-gray-500">組</span></p>
              </div>
            </div>
          </div>
        )}

        {/* 事前受付URL発行 */}
        {activeTab === "remote" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">事前受付用URLの発行・管理</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
              <h3 className="font-bold text-lg mb-4">新規URL発行</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用する接客フロー</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={selectedFlowForSession}
                    onChange={(e) => setSelectedFlowForSession(e.target.value)}
                  >
                    {flows.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={createSession} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center">
                  <Link size={18} className="mr-2" /> URLを発行する
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg mb-4">発行済みURL一覧</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3">発行日時</th>
                      <th className="px-4 py-3">フロー名</th>
                      <th className="px-4 py-3">URL (クリックでコピー)</th>
                      <th className="px-4 py-3">ステータス</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{session.createdAt}</td>
                        <td className="px-4 py-3">{session.flowName}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { const url = `${window.location.origin}?sid=${session.id}`; navigator.clipboard.writeText(url); alert(`コピーしました: ${url}`); }}
                            className="text-blue-600 hover:underline flex items-center max-w-xs truncate"
                          >
                            <Link size={14} className="mr-1 flex-shrink-0" />
                            ?sid={session.id}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${session.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {session.status === "completed" ? "入力完了" : "未実施"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {session.status === "completed" && (
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 px-2 py-1 rounded">
                              内容確認・引継
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400">発行済みのURLはありません</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 契約書テンプレート */}
        {activeTab === "template" && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">契約書入力項目カスタマイズ</h3>
                  <p className="text-gray-500 text-sm mt-1">店舗スタッフが接客時に入力する項目のデフォルト設定を管理します。</p>
                </div>
                <div className="flex space-x-3">
                  <button onClick={addField} className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                    <Plus size={16} className="mr-2" /> 項目を追加
                  </button>
                  <button onClick={saveTemplate} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">
                    <Save size={18} className="mr-2" /> 設定を保存
                  </button>
                </div>
              </div>
              {isSaved && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200">
                  <CheckCircle size={18} className="mr-2" /> 設定を保存しました
                </div>
              )}
              <div className="flex gap-6 h-[600px]">
                <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                  <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
                    <span>テンプレート一覧</span>
                    <button onClick={addNewTemplate} className="text-blue-600 hover:bg-blue-100 p-1 rounded">
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {staffTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`w-full text-left px-4 py-3 border-b flex justify-between items-center ${selectedTemplateId === tpl.id ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-gray-50 text-gray-600"}`}
                      >
                        <span className="truncate">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                  {activeTemplate ? (
                    <>
                      <div className="flex justify-between items-start mb-6 border-b pb-4">
                        <div className="flex-1 mr-4">
                          <label className="block text-xs font-bold text-gray-500 mb-1">テンプレート名</label>
                          <input
                            type="text"
                            value={activeTemplate.name}
                            onChange={(e) => updateTemplateName(e.target.value)}
                            className="w-full text-xl font-bold text-gray-800 border-none focus:ring-0 p-0"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button onClick={() => deleteTemplate(activeTemplate.id)} className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-200">
                            <Trash2 size={16} className="mr-2" /> 削除
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 pr-2">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/4">項目名</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/5">入力タイプ</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/3">プレースホルダー</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">削除</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {activeTemplate.fields.map((field, index) => (
                              <tr key={field.id} className="hover:bg-gray-50">
                                <td className="p-2">
                                  <input type="text" value={field.label} onChange={(e) => updateField(index, "label", e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                                </td>
                                <td className="p-2">
                                  <select value={field.type} onChange={(e) => updateField(index, "type", e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white">
                                    <option value="text">テキスト</option>
                                    <option value="number">数値</option>
                                    <option value="date">日付</option>
                                    <option value="select">選択肢</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input type="text" value={field.placeholder || ""} onChange={(e) => updateField(index, "placeholder", e.target.value)} className="w-full p-2 border border-gray-300 rounded" disabled={field.type === "select" || field.type === "date"} />
                                </td>
                                <td className="p-2 text-center">
                                  <button onClick={() => removeField(index)} className="text-gray-400 hover:text-red-500">
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">テンプレートを選択してください</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* コンテンツ管理 */}
        {activeTab === "upload" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex space-x-1 mb-6 border-b">
              <button onClick={() => setContentTab("video")} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "video" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>動画コンテンツ</button>
              <button onClick={() => setContentTab("document")} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "document" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>ドキュメント (PDF等)</button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">{contentTab === "video" ? "接客時に再生する動画コンテンツを管理します。" : "契約書の裏面に印刷するPDF資料を管理します。"}</p>
              <button onClick={() => openUploadModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md">
                <Upload size={18} className="mr-2" /> 新規アップロード
              </button>
            </div>
            {contentTab === "video" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoPlaylist.map((video) => {
                  const thumb = thumbnails[video.id];
                  return (
                    <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-gray-800 relative flex items-center justify-center cursor-pointer" onClick={() => video.url && setPlayingVideo(video)}>
                        {thumb ? <img src={thumb} alt={video.title} className="absolute inset-0 w-full h-full object-cover" /> : null}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Play size={24} className="text-white ml-1" fill="white" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-mono">{video.duration}</span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 mb-1 truncate">{video.title}</h3>
                        <p className="text-sm text-gray-500 mb-2 h-10 overflow-hidden line-clamp-2">{video.description || "説明なし"}</p>
                        {video.createdAt && <p className="text-xs text-gray-400 mb-3">登録日時: {video.createdAt}</p>}
                        <div className="flex justify-between items-center border-t pt-3">
                          <button onClick={() => openUploadModal(video)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                            <Edit2 size={14} className="mr-1" /> 編集
                          </button>
                          <button onClick={() => setDeleteConfirmId(video.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                            <Trash2 size={14} className="mr-1" /> 削除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentsList.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-40 bg-gray-100 flex items-center justify-center border-b">
                      <FileText size={48} className="text-gray-400" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center mb-1">
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded mr-2 font-bold">{doc.type}</span>
                        <h3 className="font-bold text-gray-800 truncate flex-1">{doc.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{doc.filename}</p>
                      <div className="flex justify-between items-center border-t pt-3">
                        <button onClick={() => openUploadModal(doc)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          <Edit2 size={14} className="mr-1" /> 編集
                        </button>
                        <button onClick={() => deleteContent(doc.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                          <Trash2 size={14} className="mr-1" /> 削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* アップロードモーダル */}
            {uploadModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      {editingContentId ? "情報の編集" : "新規アップロード"} ({contentTab === "video" ? "動画" : "ドキュメント"})
                    </h3>
                    <button onClick={closeUploadModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    {(!editingContentId || contentTab === "video") && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={contentTab === "video" ? "video/*" : "application/pdf"} onChange={handleFileSelect} />
                        <div className="flex flex-col items-center justify-center">
                          {contentTab === "video" ? (
                            <Film size={32} className={selectedFile ? "text-blue-600 mb-2" : "text-blue-400 mb-2"} />
                          ) : (
                            <FileText size={32} className="text-red-500 mb-2" />
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {selectedFile ? selectedFile.name : editingContentId ? "新しい動画ファイルを選択（省略可）" : "ファイルを選択"}
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                      <input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={newContentData.title} onChange={(e) => setNewContentData({ ...newContentData, title: e.target.value })} placeholder={contentTab === "video" ? "例: 1. 飼育環境の準備" : "例: 共通条項（裏面）"} />
                    </div>
                    {contentTab === "video" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">再生時間 (分:秒)</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={newContentData.duration} onChange={(e) => setNewContentData({ ...newContentData, duration: e.target.value })} placeholder="例: 3:45" />
                      </div>
                    )}
                    {contentTab === "video" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">説明文</label>
                        <textarea className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none" rows={3} value={newContentData.description} onChange={(e) => setNewContentData({ ...newContentData, description: e.target.value })} placeholder="動画の内容について説明を入力してください" />
                      </div>
                    )}
                    {isUploading && uploadProgressPct > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{uploadProgress}</span>
                          <span>{uploadProgressPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-200" style={{ width: `${uploadProgressPct}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button onClick={closeUploadModal} disabled={isUploading} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium disabled:opacity-50">キャンセル</button>
                    <button onClick={handleContentSave} disabled={!newContentData.title || isUploading} className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center ${!newContentData.title || isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 shadow-md"}`}>
                      {isUploading ? uploadProgress || "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 削除確認モーダル */}
            {deleteConfirmId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">削除の確認</h3>
                  <p className="text-gray-600 mb-6">
                    この動画を削除してもよろしいですか？<br />
                    <span className="text-sm text-red-500">この操作は取り消せません。</span>
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">キャンセル</button>
                    <button onClick={() => deleteContent(deleteConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
                  </div>
                </div>
              </div>
            )}

            {/* 動画プレビューモーダル */}
            {playingVideo && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPlayingVideo(null)}>
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-900">
                    <div>
                      <p className="text-white font-bold">{playingVideo.title}</p>
                      {playingVideo.description && <p className="text-gray-400 text-sm">{playingVideo.description}</p>}
                    </div>
                    <button onClick={() => setPlayingVideo(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                  </div>
                  <video src={playingVideo.url} controls autoPlay className="w-full" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* フロー作成 */}
        {activeTab === "flow" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">接客時の画面遷移フローを作成・編集します。</p>
              <button onClick={() => openFlowModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md">
                <Plus size={18} className="mr-2" /> 新規フロー作成
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flows.map((flow) => (
                <div key={flow.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{flow.name}</h3>
                    <div className="flex space-x-2">
                      <button onClick={() => openFlowModal(flow)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18} /></button>
                      <button onClick={() => deleteFlow(flow.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 h-10">{flow.description}</p>
                  <div className="mb-2 text-xs bg-gray-100 p-2 rounded flex flex-col gap-1">
                    <div>
                      <span className="font-bold text-gray-500 mr-2">テンプレート:</span>
                      {staffTemplates.find((t) => t.id === flow.templateId)?.name || "未設定"}
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 mr-2">添付資料:</span>
                      {flow.attachmentIds?.length || 0} 件
                    </div>
                  </div>
                  <div className="space-y-2">
                    {flow.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">{idx + 1}</div>
                        {step.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* フローモーダル */}
            {flowModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{editingFlowId ? "フロー編集" : "新規フロー作成"}</h3>
                    <button onClick={() => setFlowModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">フロー名</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={newFlowData.name} onChange={(e) => setNewFlowData({ ...newFlowData, name: e.target.value })} placeholder="例: 里親募集用フロー" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">使用する契約書テンプレート</label>
                        <select className="w-full p-2 border border-gray-300 rounded bg-white" value={newFlowData.templateId} onChange={(e) => setNewFlowData({ ...newFlowData, templateId: e.target.value })}>
                          {staffTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={newFlowData.description} onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })} placeholder="用途などのメモ" />
                      </div>
                      <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">契約書の裏面・添付資料</label>
                        <div className="flex flex-wrap gap-2">
                          {documentsList.map((doc) => (
                            <label key={doc.id} className={`flex items-center px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${(newFlowData.attachmentIds || []).includes(doc.id) ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-300 hover:bg-gray-100"}`}>
                              <input type="checkbox" className="mr-2" checked={(newFlowData.attachmentIds || []).includes(doc.id)} onChange={() => handleAttachmentSelection(doc.id)} />
                              {doc.title}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">ステップ構成</h4>
                        <button onClick={addStep} className="text-sm text-blue-600 hover:underline flex items-center">
                          <Plus size={14} className="mr-1" /> ステップ追加
                        </button>
                      </div>
                      {editingSteps.map((step, index) => (
                        <div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4">
                          <div className="flex flex-col space-y-1 pt-2 text-gray-400">
                            <button onClick={() => moveStep(index, "up")} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                            <MoreVertical size={16} className="cursor-move" />
                            <button onClick={() => moveStep(index, "down")} disabled={index === editingSteps.length - 1} className="hover:text-blue-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">ステップ名</label>
                                <input type="text" value={step.title} onChange={(e) => updateStep(index, "title", e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm bg-white" />
                              </div>
                              <div className="w-1/3">
                                <label className="text-xs text-gray-500">タイプ</label>
                                <select value={step.type} onChange={(e) => updateStep(index, "type", e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm bg-white">
                                  {Object.entries(STEP_TYPES).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {step.type === "VIDEO" && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 mb-2">再生する動画を選択</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {videoPlaylist.map((video) => (
                                    <label key={video.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                      <input type="checkbox" checked={(step.videoIds || []).includes(video.id)} onChange={() => handleVideoSelection(index, video.id)} className="rounded text-blue-600" />
                                      <span>{video.title}</span>
                                      <span className="text-gray-400 text-xs">({video.duration})</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button onClick={() => removeStep(index)} className="text-gray-400 hover:text-red-500 pt-2"><Trash2 size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <button onClick={() => setFlowModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">キャンセル</button>
                    <button onClick={saveFlow} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">保存する</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 契約履歴 */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <h3 className="text-lg font-bold text-gray-800 mb-4">契約履歴一覧</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-medium">
                  <tr>
                    <th className="px-6 py-3">契約ID</th>
                    <th className="px-6 py-3">契約日</th>
                    <th className="px-6 py-3">お客様名</th>
                    <th className="px-6 py-3">ペット種類</th>
                    <th className="px-6 py-3">金額</th>
                    <th className="px-6 py-3">担当者</th>
                    <th className="px-6 py-3">ステータス</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { id: "C001", date: "2024/05/20", customer: "山田 太郎", type: "トイプードル", price: "¥480,000", staff: "佐藤 花子", status: "完了" },
                    { id: "C002", date: "2024/05/19", customer: "鈴木 一郎", type: "チワワ", price: "¥350,000", staff: "田中 次郎", status: "完了" },
                  ].map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{contract.id}</td>
                      <td className="px-6 py-3 text-gray-500">{contract.date}</td>
                      <td className="px-6 py-3">{contract.customer}</td>
                      <td className="px-6 py-3">{contract.type}</td>
                      <td className="px-6 py-3">{contract.price}</td>
                      <td className="px-6 py-3 text-gray-500">{contract.staff}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${contract.status === "完了" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{contract.status}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">詳細</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 顧客管理 */}
        {activeTab === "customers" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <h3 className="text-lg font-bold text-gray-800 mb-4">顧客情報管理</h3>
            {customersLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>
            ) : customers.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400">顧客データがありません</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <div key={customer.id} className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mr-3 flex-shrink-0">
                        <User size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-base leading-tight">{customer.name || "—"}</h4>
                        {customer.name_kana && <p className="text-xs text-gray-400 mt-0.5">{customer.name_kana}</p>}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {customer.tell && <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400 flex-shrink-0" /><span>{customer.tell}</span></div>}
                      {customer.mail && <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400 flex-shrink-0" /><span className="truncate text-gray-700">{customer.mail}</span></div>}
                      {customer.last_enter_store_at && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                          <span>最終来店: {new Date(customer.last_enter_store_at).toLocaleDateString("ja-JP")}</span>
                        </div>
                      )}
                    </div>
                    {customer.remarks && (
                      <div className="border-t border-gray-100 pt-3 mb-4 text-sm text-gray-600">
                        所有ペット: <span className="font-bold text-gray-800">{customer.remarks}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">編集</button>
                      <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium">詳細</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 設定 */}
        {activeTab === "settings" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-fit">
                <button onClick={() => setSettingsTab("company")} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "company" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Briefcase size={18} className="mr-3" /> 会社情報
                </button>
                <button onClick={() => setSettingsTab("users")} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "users" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Users size={18} className="mr-3" /> 権限・ユーザー管理
                </button>
                <button onClick={() => setSettingsTab("other")} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "other" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Settings size={18} className="mr-3" /> その他
                </button>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
                {settingsTab === "company" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4">会社基本情報</h3>
                    <div className="space-y-6 max-w-2xl">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">会社名 / 店舗名</label>
                        <input
                          type="text"
                          value={tempCompanyInfo.name}
                          onChange={(e) => setTempCompanyInfo({ ...tempCompanyInfo, name: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="pt-6">
                        <button onClick={handleSaveCompany} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center">
                          <Save size={18} className="mr-2" /> 保存する
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
