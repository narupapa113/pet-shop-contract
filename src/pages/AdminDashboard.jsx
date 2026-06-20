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
import { supabase, supabaseAdmin } from "../lib/supabase";
import { STEP_TYPES, DEFAULT_TEMPLATES } from "../constants";
import ContractPreviewStep from "../components/ContractPreviewStep";
import SignatureStep from "../components/SignatureStep";
import PdfCardThumbnail from "../components/PdfCardThumbnail";

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

  const INPUT_TYPE_NUM = { text: 1, number: 2, date: 3, select: 4 };

  const addNewTemplate = async () => {
    const defaultFields = DEFAULT_TEMPLATES[0].fields;
    const { data, error } = await supabaseAdmin
      .from("contract_templates_header")
      .insert({ name: "新しいテンプレート" })
      .select("id, name, create_at")
      .maybeSingle();
    if (error) { console.error("テンプレート追加エラー:", error); return; }
    const newId = data.id;
    const itemRows = defaultFields.map((f, i) => ({
      id: newId,
      item_no: i + 1,
      item_name: f.label,
      input_type: INPUT_TYPE_NUM[f.type] ?? 1,
      input_select: f.options || [],
      placeholder: f.placeholder || null,
    }));
    const { error: itemError } = await supabaseAdmin.from("contract_templates_item").insert(itemRows);
    if (itemError) console.error("テンプレート項目追加エラー:", itemError);
    const newFields = defaultFields.map((f, i) => ({ ...f, id: `field_${i + 1}` }));
    setStaffTemplates([...staffTemplates, { id: newId, name: "新しいテンプレート", fields: newFields }]);
    setSelectedTemplateId(newId);
  };

  const deleteTemplate = async (id) => {
    if (staffTemplates.length <= 1) return alert("最後のテンプレートは削除できません");
    if (window.confirm("このテンプレートを削除してもよろしいですか？")) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        await supabaseAdmin.from("contract_templates_item").delete().eq("id", id);
        await supabaseAdmin.from("contract_templates_header").delete().eq("id", id);
      }
      const remaining = staffTemplates.filter((t) => t.id !== id);
      setStaffTemplates(remaining);
      if (selectedTemplateId === id) setSelectedTemplateId(remaining[0].id);
    }
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(activeTemplate.id)) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      return;
    }
    const { error: headerError } = await supabaseAdmin
      .from("contract_templates_header")
      .update({ name: activeTemplate.name, update_at: new Date().toISOString() })
      .eq("id", activeTemplate.id);
    if (headerError) { console.error("テンプレート保存エラー:", headerError); return; }

    await supabaseAdmin.from("contract_templates_item").delete().eq("id", activeTemplate.id);

    const itemRows = activeTemplate.fields.map((f, i) => ({
      id: activeTemplate.id,
      item_no: i + 1,
      item_name: f.label,
      input_type: INPUT_TYPE_NUM[f.type] ?? 1,
      input_select: f.options || [],
      placeholder: f.placeholder || null,
    }));
    if (itemRows.length > 0) {
      const { error: itemError } = await supabaseAdmin.from("contract_templates_item").insert(itemRows);
      if (itemError) { console.error("テンプレート項目保存エラー:", itemError); return; }
    }

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
  const [previewingDoc, setPreviewingDoc] = useState(null); // { title, url }

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase.from("files").select("*").order("create_at", { ascending: false });
    if (data) {
      setDocumentsList(data.map((f) => ({
        id: f.id,
        title: f.name,
        filename: f.path ? f.path.split("/").pop() : "",
        path: f.path,
        type: "PDF",
      })));
    }
  }, [setDocumentsList]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
          const { error } = await supabaseAdmin.from("files").update({ name: newContentData.title, update_at: new Date().toISOString() }).eq("id", editingContentId);
          if (error) throw error;
          await fetchDocuments();
        } else {
          if (!selectedFile) {
            alert("PDFファイルを選択してください");
            setIsUploading(false);
            return;
          }
          setUploadProgress("PDFをアップロード中...");
          setUploadProgressPct(0);
          const ext = selectedFile.name.split(".").pop();
          const filePath = `${Date.now()}.${ext}`;
          const totalSize = selectedFile.size;
          let lastLoaded = 0;
          const fakeProgress = setInterval(() => {
            lastLoaded = Math.min(lastLoaded + totalSize * 0.05, totalSize * 0.9);
            setUploadProgressPct(Math.round((lastLoaded / totalSize) * 100));
          }, 200);
          const { error: uploadError } = await supabaseAdmin.storage.from("files").upload(filePath, selectedFile, { contentType: "application/pdf" });
          clearInterval(fakeProgress);
          setUploadProgressPct(100);
          if (uploadError) throw uploadError;
          setUploadProgress("情報を保存中...");
          const { error: dbError } = await supabaseAdmin.from("files").insert({
            id: crypto.randomUUID(),
            name: newContentData.title,
            path: filePath,
            create_at: new Date().toISOString(),
          });
          if (dbError) throw dbError;
          await fetchDocuments();
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
      const doc = documentsList.find((d) => d.id === id);
      if (doc?.path) await supabaseAdmin.storage.from("files").remove([doc.path]);
      await supabaseAdmin.from("files").delete().eq("id", id);
      await fetchDocuments();
    }
    setDeleteConfirmId(null);
  };

  // --- フロー管理 ---
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [newFlowData, setNewFlowData] = useState({ name: "", description: "", templateId: "", attachmentIds: [] });
  const [editingSteps, setEditingSteps] = useState([]);
  const [flowModalOpen, setFlowModalOpen] = useState(false);

  const STEP_TYPE_STR = { 1: "VIDEO", 2: "CUSTOMER_INFO", 3: "SIGNATURE", 4: "STAFF_INPUT", 5: "CONTRACT_PREVIEW" };

  const fetchFlows = useCallback(async () => {
    const { data } = await supabase.from("flow_header").select("*").order("create_at", { ascending: false });
    if (data && data.length > 0) {
      const parsed = await Promise.all(data.map(async (row) => {
        const { data: stepData } = await supabase.from("flow_step").select("*").eq("id", row.id).order("flow_step_no", { ascending: true });
        const steps = (stepData || []).map((s) => ({
          id: `s_${s.flow_step_no}`,
          title: s.name,
          type: STEP_TYPE_STR[s.type] || "VIDEO",
          videoIds: s.video_id || [],
        }));
        return { id: row.id, name: row.name, description: row.description || "", templateId: row.contract_template_id || "", attachmentIds: row.files || [], flowType: row.type ?? 1, steps };
      }));
      setFlows(parsed);
    }
  }, [setFlows]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const FIXED_STEPS = [
    { id: "fixed_1", type: "VIDEO", title: "動画視聴", fixed: false },
    { id: "fixed_2", type: "CUSTOMER_INFO", title: "お客様情報入力", fixed: true },
    { id: "fixed_3", type: "SIGNATURE", title: "署名", fixed: true },
    { id: "fixed_4", type: "STAFF_INPUT", title: "店舗入力", fixed: true },
    { id: "fixed_5", type: "CONTRACT_PREVIEW", title: "契約書", fixed: true },
  ];

  const openFlowModal = (flow = null) => {
    if (flow) {
      setEditingFlowId(flow.id);
      setNewFlowData({ name: flow.name, description: flow.description || "", templateId: flow.templateId || staffTemplates[0]?.id || "", attachmentIds: flow.attachmentIds || [] });
      const videoStep = flow.steps.find((s) => s.type === "VIDEO");
      const merged = FIXED_STEPS.map((fs) => {
        if (fs.type === "VIDEO") return { ...fs, videoIds: videoStep?.videoIds || [] };
        return { ...fs, videoIds: [] };
      });
      setEditingSteps(merged);
    } else {
      setEditingFlowId(null);
      setNewFlowData({ name: "", description: "", templateId: staffTemplates[0]?.id || "", attachmentIds: [] });
      setEditingSteps(FIXED_STEPS.map((s) => ({ ...s, videoIds: [] })));
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

  const STEP_TYPE_NUM = { VIDEO: 1, CUSTOMER_INFO: 2, SIGNATURE: 3, STAFF_INPUT: 4, CONTRACT_PREVIEW: 5 };

  const saveFlow = async () => {
    if (!newFlowData.name) return;
    const validUuid = (v) => (v && uuidRegex.test(v) ? v : null);
    const headerPayload = {
      name: newFlowData.name,
      description: newFlowData.description || null,
      type: 1,
      contract_template_id: validUuid(newFlowData.templateId),
      files: (newFlowData.attachmentIds || []).filter((id) => uuidRegex.test(id)),
    };

    let flowId = editingFlowId;
    if (editingFlowId) {
      const { data: updatedData, error } = await supabaseAdmin.from("flow_header").update({ ...headerPayload, update_at: new Date().toISOString() }).eq("id", editingFlowId).select("id").maybeSingle();
      if (error) { alert(`保存に失敗しました: ${error.message}`); return; }
      if (!updatedData) { alert("保存に失敗しました: レコードが見つかりません"); return; }
    } else {
      const { data, error } = await supabaseAdmin.from("flow_header").insert(headerPayload).select("id").maybeSingle();
      if (error) { alert(`保存に失敗しました: ${error.message}`); return; }
      flowId = data.id;
    }

    await supabaseAdmin.from("flow_step").delete().eq("id", flowId);

    const stepRows = editingSteps.map((step, i) => ({
      id: flowId,
      flow_step_no: i + 1,
      name: step.title,
      type: STEP_TYPE_NUM[step.type] ?? 1,
      video_id: (step.videoIds || []).filter((vid) => uuidRegex.test(vid)),
    }));
    if (stepRows.length > 0) {
      const { error: stepError } = await supabaseAdmin.from("flow_step").insert(stepRows);
      if (stepError) { alert(`ステップ保存に失敗しました: ${stepError.message}`); return; }
    }

    await fetchFlows();
    setFlowModalOpen(false);
  };

  const deleteFlow = async (id) => {
    if (window.confirm("このフローを削除してもよろしいですか？")) {
      await supabaseAdmin.from("flow_step").delete().eq("id", id);
      await supabaseAdmin.from("flow_header").delete().eq("id", id);
      await fetchFlows();
    }
  };

  // --- 事前受付URL管理 ---
  const onetimeFlows = flows;
  const [selectedFlowForSession, setSelectedFlowForSession] = useState(onetimeFlows[0]?.id ?? "");
  const [selectedCustomerForUrl, setSelectedCustomerForUrl] = useState("");
  const [issuedUrls, setIssuedUrls] = useState([]);
  const [issuedUrlsLoading, setIssuedUrlsLoading] = useState(false);
  const [deleteOnetimeConfirmId, setDeleteOnetimeConfirmId] = useState(null);
  const [copiedUrlMsg, setCopiedUrlMsg] = useState(null); // { url }

  const fetchIssuedUrls = useCallback(async () => {
    setIssuedUrlsLoading(true);
    const { data } = await supabaseAdmin
      .from("onetime_url_manage")
      .select("*")
      .order("issue_at", { ascending: false });
    if (data) setIssuedUrls(data);
    setIssuedUrlsLoading(false);
  }, []);

  const ONETIME_STATUS_LABEL = {
    1: { label: "未認証", color: "bg-gray-100 text-gray-600" },
    2: { label: "認証済", color: "bg-blue-100 text-blue-700" },
    3: { label: "視聴中", color: "bg-yellow-100 text-yellow-700" },
    4: { label: "情報送信済", color: "bg-orange-100 text-orange-700" },
    5: { label: "署名済", color: "bg-green-100 text-green-700" },
    6: { label: "スタッフ入力済", color: "bg-teal-100 text-teal-700" },
    7: { label: "完了", color: "bg-blue-100 text-blue-800" },
  };

  const createOnetimeUrl = async () => {
    if (!selectedFlowForSession) return alert("接客フローを選択してください");
    const id = crypto.randomUUID();
    const url = `${window.location.origin}?onetime=${id}`;
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerForUrl);
    const { error } = await supabaseAdmin.from("onetime_url_manage").insert({
      id,
      flow_id: selectedFlowForSession,
      onetime_url: url,
      status: 1,
      customer_id: selectedCustomer?.id ?? null,
    });
    if (error) { console.error(error); return alert("URLの発行に失敗しました"); }
    // メール送信（顧客が選択されてメールアドレスがある場合）
    if (selectedCustomer?.mail) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-url-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ to: selectedCustomer.mail, customerName: selectedCustomer.name, url }),
        });
        const result = await res.json();
        if (!result.ok) console.warn("メール送信:", result.error);
      } catch (e) {
        console.warn("メール送信エラー:", e);
      }
    }
    fetchIssuedUrls();
  };

  const deleteOnetimeUrl = async (id) => {
    await supabaseAdmin.from("otp_codes").delete().eq("onetime_id", id);
    await supabaseAdmin.from("onetime_url_manage").delete().eq("id", id);
    setDeleteOnetimeConfirmId(null);
    fetchIssuedUrls();
  };

  // --- スタッフ入力モーダル ---
  // phase: "input" | "preview"
  const [staffInputModal, setStaffInputModal] = useState(null); // { row, flow, fields, phase, customerData, signatureImage }
  const [staffInputSaving, setStaffInputSaving] = useState(false);

  const openStaffInputModal = async (row) => {
    const flow = flows.find((f) => f.id === row.flow_id);
    if (!flow) return;
    const template = staffTemplates.find((t) => t.id === flow.templateId);
    const fields = template ? JSON.parse(JSON.stringify(template.fields)) : [];

    // 顧客データを取得
    let customerData = { name: "", nameKana: "", address: "", phone: "", email: "" };
    if (row.customer_id) {
      const { data: cust } = await supabase.from("customers").select("*").eq("id", row.customer_id).maybeSingle();
      if (cust) {
        customerData = {
          name: cust.name || "",
          nameKana: cust.name_kana || "",
          address: cust.address || "",
          phone: cust.tell || "",
          email: cust.mail || "",
        };
      }
    }

    // 署名フェーズから開始
    setStaffInputModal({ row, flow, fields, phase: "signature", customerData, signatureDataUrl: null, signHistoryId: null, remarksArr: ["", "", ""] });
  };

  const handleStaffInputFieldChange = (id, value) => {
    setStaffInputModal((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, value } : f)),
    }));
  };

  const handleStaffInputRemarksChange = (index, value) => {
    setStaffInputModal((prev) => ({ ...prev, remarksArr: prev.remarksArr.map((r, i) => i === index ? value : r) }));
  };

  const proceedToPreview = async () => {
    if (!staffInputModal) return;
    setStaffInputSaving(true);
    try {
      const { row, flow, fields, signHistoryId: existingSignHistoryId, signatureDataUrl, remarksArr } = staffInputModal;

      let signHistoryId = existingSignHistoryId;

      // 署名をアップロードして sign_history を作成
      if (!signHistoryId && signatureDataUrl) {
        const blob = await (await fetch(signatureDataUrl)).blob();
        const filePath = `signatures/${Date.now()}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("signatures")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
          if (contractIdValue) {
            const { data: signHistoryData } = await supabaseAdmin
              .from("sign_history")
              .insert({
                contract_id: contractIdValue,
                contract_name: flow.name || null,
                sign_customer_id: row.customer_id || null,
                sign_path: filePath,
                video_id: [],
              })
              .select("id")
              .maybeSingle();
            signHistoryId = signHistoryData?.id ?? null;
          }
        }
      }

      if (signHistoryId) {
        const now = new Date().toISOString();
        const rows = fields.map((field, index) => ({
          id: signHistoryId,
          sign_item_no: index + 1,
          sign_item_value: field.value ?? "",
          create_at: now,
          update_at: now,
        }));
        await supabaseAdmin.from("sign_input").insert(rows);

        if (row.customer_id) {
          const updatePayload = {
            last_enter_store_at: now,
            remarks: (remarksArr && remarksArr[0]) ? remarksArr[0] : null,
            remarks2: (remarksArr && remarksArr[1]) ? remarksArr[1] : null,
            remarks3: (remarksArr && remarksArr[2]) ? remarksArr[2] : null,
          };
          await supabase.from("customers").update(updatePayload).eq("id", row.customer_id);
        }
      }

      // 署名済み画像URLを取得してプレビューに渡す
      let signatureImageUrl = null;
      if (signHistoryId) {
        const { data: sh } = await supabaseAdmin
          .from("sign_history")
          .select("sign_path")
          .eq("id", signHistoryId)
          .maybeSingle();
        if (sh?.sign_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("signatures")
            .createSignedUrl(sh.sign_path, 3600);
          signatureImageUrl = signed?.signedUrl || null;
        }
      }

      setStaffInputModal((prev) => ({ ...prev, phase: "preview", signHistoryId, signatureImage: signatureImageUrl }));
    } catch (err) {
      console.error("スタッフ入力保存エラー:", err);
      alert("保存に失敗しました: " + err.message);
    } finally {
      setStaffInputSaving(false);
    }
  };

  const finishStaffInputFlow = async () => {
    if (!staffInputModal) return;
    const { row } = staffInputModal;
    await supabaseAdmin
      .from("onetime_url_manage")
      .update({ status: 7, update_at: new Date().toISOString() })
      .eq("id", row.id);
    await fetchIssuedUrls();
    setStaffInputModal(null);
  };

  // --- 顧客管理 ---
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerModal, setCustomerModal] = useState(null); // { mode: "add"|"edit"|"detail", data }
  const [customerDeleteConfirmId, setCustomerDeleteConfirmId] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState(null); // null = show all

  const EMPTY_CUSTOMER = { name: "", name_kana: "", address: "", tell: "", mail: "", remarks1: "", remarks2: "", remarks3: "" };

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    const { data } = await supabase.from("customers").select("*").neq("is_delete", true).order("create_at", { ascending: false });
    if (data) setCustomers(data);
    setCustomersLoading(false);
  }, []);

  const parseRemarks = (remarks) => {
    if (!remarks) return ["", "", ""];
    try {
      const arr = JSON.parse(remarks);
      if (Array.isArray(arr)) return [String(arr[0] ?? ""), String(arr[1] ?? ""), String(arr[2] ?? "")];
    } catch {}
    return [String(remarks), "", ""];
  };

  const searchCustomers = async () => {
    if (!customerSearchQuery.trim()) return;
    const q = customerSearchQuery.trim();
    const { data } = await supabase
      .from("customers")
      .select("*")
      .or(`name.ilike.%${q}%,name_kana.ilike.%${q}%,address.ilike.%${q}%,tell.ilike.%${q}%,mail.ilike.%${q}%,remarks.ilike.%${q}%,remarks2.ilike.%${q}%,remarks3.ilike.%${q}%`)
      .neq("is_delete", true)
      .order("create_at", { ascending: false });
    setCustomerSearchResults(data ?? []);
  };

  const saveCustomer = async () => {
    if (!customerModal?.data?.name) return alert("名前を入力してください");
    const d = customerModal.data;
    const remarksPayload = {
      remarks: d.remarks1 || null,
      remarks2: d.remarks2 || null,
      remarks3: d.remarks3 || null,
    };
    if (customerModal.mode === "add") {
      const { error } = await supabaseAdmin.from("customers").insert({
        id: crypto.randomUUID(),
        name: d.name,
        name_kana: d.name_kana || null,
        address: d.address || null,
        tell: d.tell || null,
        mail: d.mail || null,
        ...remarksPayload,
      });
      if (error) return alert("保存に失敗しました: " + error.message);
    } else if (customerModal.mode === "edit") {
      const { error } = await supabaseAdmin.from("customers").update({
        name: d.name,
        name_kana: d.name_kana || null,
        address: d.address || null,
        tell: d.tell || null,
        mail: d.mail || null,
        ...remarksPayload,
        update_at: new Date().toISOString(),
      }).eq("id", d.id);
      if (error) return alert("保存に失敗しました: " + error.message);
    }
    setCustomerModal(null);
    fetchCustomers();
  };
const deleteCustomer = async (id) => {
  try {
    const { error } = await supabaseAdmin
      .from("customers")
      .update({ is_delete: true, update_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    setCustomerDeleteConfirmId(null);
    setCustomerModal(null);
    fetchCustomers();
  } catch (err) {
    console.error("顧客削除エラー:", err);
    alert("削除に失敗しました: " + (err.message || JSON.stringify(err)));
  }
};

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "remote") { fetchIssuedUrls(); fetchCustomers(); }
  }, [activeTab, fetchCustomers, fetchIssuedUrls]);

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
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用する接客フロー</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={selectedFlowForSession}
                    onChange={(e) => setSelectedFlowForSession(e.target.value)}
                  >
                    {onetimeFlows.length === 0 && <option value="">ワンタイム用フローがありません</option>}
                    {onetimeFlows.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">顧客選択（任意）</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={selectedCustomerForUrl}
                    onChange={(e) => setSelectedCustomerForUrl(e.target.value)}
                  >
                    <option value="">顧客を選択してください</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.tell ? `（${c.tell}）` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={createOnetimeUrl} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center whitespace-nowrap">
                  <Link size={18} className="mr-2" /> URLを発行する
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">発行済みURL一覧</h3>
                <button
                  onClick={fetchIssuedUrls}
                  disabled={issuedUrlsLoading}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowUp size={14} className="rotate-180" />
                  更新
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed">
                  <colgroup>
                    <col className="w-36" />
                    <col className="w-36" />
                    <col />
                    <col className="w-28" />
                    <col className="w-40" />
                  </colgroup>
                  <thead className="bg-gray-50 text-gray-700 font-medium">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">発行日時</th>
                      <th className="px-4 py-3 whitespace-nowrap">フロー名</th>
                      <th className="px-4 py-3 whitespace-nowrap">URL（クリックでコピー）</th>
                      <th className="px-4 py-3 whitespace-nowrap">ステータス</th>
                      <th className="px-4 py-3 whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {issuedUrls.map((row) => {
                      const flowName = flows.find((f) => f.id === row.flow_id)?.name ?? "-";
                      const statusInfo = ONETIME_STATUS_LABEL[row.status] ?? { label: "-", color: "bg-gray-100 text-gray-600" };
                      const urlStr = row.onetime_url ?? `${window.location.origin}?onetime=${row.id}`;
                      return (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                            {new Date(row.issue_at).toLocaleString("ja-JP")}
                          </td>
                          <td className="px-4 py-3 truncate">{flowName}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(urlStr);
                                setCopiedUrlMsg({ url: urlStr });
                              }}
                              className="text-blue-600 hover:underline flex items-center gap-1 w-full"
                            >
                              <Link size={13} className="flex-shrink-0" />
                              <span className="truncate text-xs">{urlStr}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={row.status < 4 || row.status >= 6}
                                onClick={() => openStaffInputModal(row)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${row.status >= 4 && row.status < 6 ? "border-blue-500 text-blue-600 hover:bg-blue-50" : "border-gray-200 text-gray-300 cursor-not-allowed"}`}
                              >
                                署名へ
                              </button>
                              <button
                                onClick={() => setDeleteOnetimeConfirmId(row.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="削除"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!issuedUrlsLoading && issuedUrls.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400">発行済みのURLはありません</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* スタッフ入力モーダル - 署名フェーズ */}
        {staffInputModal && staffInputModal.phase === "signature" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">署名の取得</h3>
                  <p className="text-sm text-gray-500 mt-1">{staffInputModal.flow.name} — {staffInputModal.customerData.name || "お客様"}</p>
                </div>
                <button onClick={() => setStaffInputModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <SignatureStep
                  signatureImage={staffInputModal.signatureDataUrl}
                  onSaveSignature={(dataUrl) => setStaffInputModal((prev) => ({ ...prev, signatureDataUrl: dataUrl }))}
                  onNext={async () => {
                    await supabaseAdmin
                      .from("onetime_url_manage")
                      .update({ status: 5, update_at: new Date().toISOString() })
                      .eq("id", staffInputModal.row.id);
                    await fetchIssuedUrls();
                    setStaffInputModal((prev) => ({ ...prev, phase: "input" }));
                  }}
                  onPrev={() => setStaffInputModal(null)}
                  submitLabel="次へ（スタッフ入力）"
                />
              </div>
            </div>
          </div>
        )}

        {/* スタッフ入力モーダル */}
        {staffInputModal && staffInputModal.phase === "input" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">スタッフ入力</h3>
                  <p className="text-sm text-gray-500 mt-1">{staffInputModal.flow.name}</p>
                </div>
                <button onClick={() => setStaffInputModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {staffInputModal.fields.length === 0 ? (
                  <p className="text-center text-gray-400 py-12">入力項目がありません</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {staffInputModal.fields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-bold text-gray-700 mb-1">{field.label}</label>
                        {field.type === "select" ? (
                          <select
                            value={field.value || ""}
                            onChange={(e) => handleStaffInputFieldChange(field.id, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                          >
                            <option value="">選択してください</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={field.value || ""}
                            onChange={(e) => handleStaffInputFieldChange(field.id, e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder={field.placeholder || ""}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* 備考欄 */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["備考1", "備考2", "備考3"].map((label, i) => (
                    <div key={i}>
                      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                      <textarea
                        value={(staffInputModal.remarksArr ?? ["", "", ""])[i] ?? ""}
                        onChange={(e) => handleStaffInputRemarksChange(i, e.target.value)}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        placeholder={`${label}を入力してください`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setStaffInputModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">キャンセル</button>
                <button
                  onClick={proceedToPreview}
                  disabled={staffInputSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <FileText size={16} />
                  {staffInputSaving ? "処理中..." : "契約書を作成する"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 契約書プレビューモーダル（スタッフ入力後） */}
        {staffInputModal && staffInputModal.phase === "preview" && (
          <div className="fixed inset-0 bg-white z-50 overflow-auto">
            <style>{`@media print { @page { margin: 15mm; size: A4; } body { -webkit-print-color-adjust: exact; } .print\\:break-before-page { break-before: page; } }`}</style>
            <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center print:hidden">
              <span className="text-sm font-medium opacity-70">契約書プレビュー: {staffInputModal.flow.name}</span>
              <div className="flex gap-3">
                <button onClick={() => setStaffInputModal((prev) => ({ ...prev, phase: "input" }))} className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700">
                  戻る
                </button>
              </div>
            </div>
            <div className="container mx-auto px-4 print:p-0 print:w-full print:max-w-none py-6">
              <ContractPreviewStep
                customerData={staffInputModal.customerData}
                staffFields={staffInputModal.fields}
                signatureImage={staffInputModal.signatureImage}
                onPrev={() => setStaffInputModal((prev) => ({ ...prev, phase: "input" }))}
                onPrint={() => window.print()}
                onFinish={finishStaffInputFlow}
                companyInfo={companyInfo}
                templateName={staffTemplates.find((t) => t.id === staffInputModal.flow.templateId)?.name}
                documentsList={documentsList}
                attachmentIds={staffInputModal.flow.attachmentIds}
              />
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
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                    <div
                      className="aspect-video bg-gray-100 border-b cursor-pointer transition-colors overflow-hidden relative"
                      onClick={async () => {
                        if (!doc.path) return;
                        const { data } = await supabaseAdmin.storage.from("files").createSignedUrl(doc.path, 3600);
                        if (data?.signedUrl) {
                          const res = await fetch(data.signedUrl);
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          setPreviewingDoc({ title: doc.title, url: blobUrl, signedUrl: data.signedUrl });
                        }
                      }}
                    >
                      <PdfCardThumbnail path={doc.path} />
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
                        <button onClick={() => setDeleteConfirmId(doc.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
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
                    {contentTab === "video" ? "この動画を削除してもよろしいですか？" : "このドキュメントを削除してもよろしいですか？"}<br />
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

            {/* PDFプレビューモーダル */}
            {previewingDoc && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { URL.revokeObjectURL(previewingDoc.url); setPreviewingDoc(null); }}>
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-900">
                    <p className="text-white font-bold">{previewingDoc.title}</p>
                    <div className="flex items-center gap-3">
                      <a href={previewingDoc.signedUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-300 hover:text-white underline">新しいタブで開く</a>
                      <button onClick={() => { URL.revokeObjectURL(previewingDoc.url); setPreviewingDoc(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <embed src={previewingDoc.url} type="application/pdf" className="flex-1 w-full border-0" />
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={newFlowData.description} onChange={(e) => setNewFlowData({ ...newFlowData, description: e.target.value })} placeholder="用途などのメモ" />
                      </div>
                      <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">契約書の裏面・添付資料</label>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap gap-2">
                              {documentsList.map((doc) => {
                                const selectedIdx = (newFlowData.attachmentIds || []).indexOf(doc.id);
                                const isSelected = selectedIdx !== -1;
                                return (
                                  <label key={doc.id} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors select-none ${isSelected ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-300 hover:bg-gray-100"}`}>
                                    <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => handleAttachmentSelection(doc.id)} />
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                        {selectedIdx + 1}
                                      </span>
                                    )}
                                    {doc.title}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {(newFlowData.attachmentIds || []).length > 0 && (
                            <div className="w-48 flex-shrink-0">
                              <p className="text-xs font-bold text-gray-500 mb-1">選択順</p>
                              <div className="space-y-1">
                                {(newFlowData.attachmentIds || []).map((docId, i) => {
                                  const d = documentsList.find((doc) => doc.id === docId);
                                  if (!d) return null;
                                  return (
                                    <button
                                      key={docId}
                                      onClick={() => handleAttachmentSelection(docId)}
                                      className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 group text-sm"
                                      title="クリックで解除"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-red-500">
                                        {i + 1}
                                      </span>
                                      <span className="truncate text-gray-700">{d.title}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">ステップ構成</h4>
                      </div>
                      {editingSteps.map((step, index) => (
                        <div key={step.id} className={`border rounded-lg p-4 ${step.fixed ? "bg-gray-50 border-gray-200" : "bg-white border-blue-200"}`}>
                          <div className="flex gap-3 mb-1">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500">ステップ名</label>
                              <div className={`w-full p-2 rounded text-sm ${step.fixed ? "text-gray-500 bg-gray-100 border border-gray-200" : "font-medium text-gray-800"}`}>
                                {step.title}
                              </div>
                            </div>
                            <div className="w-1/3">
                              <label className="text-xs text-gray-500">タイプ</label>
                              <div className="w-full p-2 rounded text-sm text-gray-500 bg-gray-100 border border-gray-200">
                                {STEP_TYPES[step.type]?.label ?? step.type}
                              </div>
                            </div>
                          </div>
                          {step.type === "VIDEO" && (
                            <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-500 mb-2">再生する動画を選択</p>
                                  <div className="flex flex-wrap gap-2">
                                    {videoPlaylist.map((video) => {
                                      const selectedIdx = (step.videoIds || []).indexOf(video.id);
                                      const isSelected = selectedIdx !== -1;
                                      return (
                                        <label key={video.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors select-none ${isSelected ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                                          <input type="checkbox" checked={isSelected} onChange={() => handleVideoSelection(index, video.id)} className="sr-only" />
                                          {isSelected && (
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                              {selectedIdx + 1}
                                            </span>
                                          )}
                                          <span>{video.title}</span>
                                          <span className="text-gray-400 text-xs">({video.duration})</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                {(step.videoIds || []).length > 0 && (
                                  <div className="w-48 flex-shrink-0">
                                    <p className="text-xs font-bold text-gray-500 mb-1">選択順</p>
                                    <div className="space-y-1">
                                      {(step.videoIds || []).map((vid, i) => {
                                        const v = videoPlaylist.find((vp) => vp.id === vid);
                                        if (!v) return null;
                                        return (
                                          <button
                                            key={vid}
                                            onClick={() => handleVideoSelection(index, vid)}
                                            className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 group text-sm"
                                            title="クリックで解除"
                                          >
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-red-500">
                                              {i + 1}
                                            </span>
                                            <span className="truncate text-gray-700">{v.title}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
            <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-lg font-bold text-gray-800">顧客情報管理</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCustomers()}
                  placeholder="名前・電話番号・メールなどで検索"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
                />
                <button
                  onClick={searchCustomers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >検索</button>
                <button
                  onClick={() => { setCustomerSearchQuery(""); setCustomerSearchResults(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >全表示</button>
                <button
                  onClick={() => setCustomerModal({ mode: "add", data: { ...EMPTY_CUSTOMER } })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-sm text-sm"
                >
                  <Plus size={16} className="mr-1.5" /> 顧客を追加
                </button>
              </div>
            </div>
            {customersLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>
            ) : (customerSearchResults !== null ? customerSearchResults : customers).length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                {customerSearchResults !== null ? "該当なし" : "顧客データがありません"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">名前</th>
                      <th className="px-6 py-3 whitespace-nowrap">電話番号</th>
                      <th className="px-6 py-3 whitespace-nowrap">メールアドレス</th>
                      <th className="px-6 py-3 whitespace-nowrap">最終署名</th>
                      <th className="px-6 py-3 whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(customerSearchResults !== null ? customerSearchResults : customers).map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-bold text-gray-800 whitespace-nowrap">{customer.name || "—"}</td>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{customer.tell || "—"}</td>
                        <td className="px-6 py-3 text-gray-500 max-w-[200px] truncate">{customer.mail || "—"}</td>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                          {customer.last_enter_store_at
                            ? new Date(customer.last_enter_store_at).toLocaleDateString("ja-JP")
                            : "—"}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCustomerModal({ mode: "detail", data: customer })}
                              className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 font-medium"
                            >詳細</button>
                            <button
                              onClick={() => {
                                setCustomerModal({ mode: "edit", data: {
                                  ...customer,
                                  remarks1: customer.remarks || "",
                                  remarks2: customer.remarks2 || "",
                                  remarks3: customer.remarks3 || "",
                                } });
                              }}
                              className="px-2 py-1 text-xs border border-blue-300 rounded text-blue-600 hover:bg-blue-50 font-medium"
                            >編集</button>
                            <button
                              onClick={() => setCustomerDeleteConfirmId(customer.id)}
                              className="px-2 py-1 text-xs border border-red-200 rounded text-red-500 hover:bg-red-50 font-medium"
                            >削除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* 事前受付URL削除確認モーダル */}
      {deleteOnetimeConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              この発行済URL情報を削除してもよろしいですか？<br />
              <span className="text-sm text-red-500">この操作は取り消せません。</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteOnetimeConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">キャンセル</button>
              <button onClick={() => deleteOnetimeUrl(deleteOnetimeConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* URLコピー完了モーダル */}
      {copiedUrlMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setCopiedUrlMsg(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-3">コピーしました</h3>
            <p className="text-xs text-gray-500 break-all mb-5 bg-gray-50 p-3 rounded border border-gray-200">{copiedUrlMsg.url}</p>
            <div className="flex justify-end">
              <button onClick={() => setCopiedUrlMsg(null)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 顧客追加・編集モーダル */}
      {customerModal && (customerModal.mode === "add" || customerModal.mode === "edit") && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">{customerModal.mode === "add" ? "顧客を追加" : "顧客情報を編集"}</h3>
              <button onClick={() => setCustomerModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name", label: "名前", required: true, placeholder: "例：山田 太郎" },
                { key: "name_kana", label: "フリガナ", placeholder: "例：ヤマダ タロウ" },
                { key: "address", label: "住所", placeholder: "例：東京都渋谷区XX-XX" },
                { key: "tell", label: "電話番号", placeholder: "例：03-1234-5678" },
                { key: "mail", label: "メールアドレス", placeholder: "例：example@mail.com" },
              ].map(({ key, label, required, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    value={customerModal.data[key] || ""}
                    onChange={(e) => setCustomerModal((prev) => ({ ...prev, data: { ...prev.data, [key]: e.target.value } }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {["備考1", "備考2", "備考3"].map((label, i) => {
                  const key = `remarks${i + 1}`;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <textarea
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                        value={customerModal.data[key] || ""}
                        onChange={(e) => setCustomerModal((prev) => ({ ...prev, data: { ...prev.data, [key]: e.target.value } }))}
                        placeholder={`${label}を入力`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setCustomerModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">キャンセル</button>
              <button onClick={saveCustomer} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* 顧客詳細モーダル */}
      {customerModal && customerModal.mode === "detail" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">顧客詳細</h3>
              <button onClick={() => setCustomerModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { key: "name", label: "名前" },
                { key: "name_kana", label: "フリガナ" },
                { key: "address", label: "住所" },
                { key: "tell", label: "電話番号" },
                { key: "mail", label: "メールアドレス" },
              ].map(({ key, label }) => (
                <div key={key} className="flex">
                  <span className="w-32 text-sm font-bold text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-sm text-gray-800">{customerModal.data[key] || "—"}</span>
                </div>
              ))}
              {[
                { key: "remarks", label: "備考1" },
                { key: "remarks2", label: "備考2" },
                { key: "remarks3", label: "備考3" },
              ].map(({ key, label }) => (
                <div key={key} className="flex">
                  <span className="w-32 text-sm font-bold text-gray-500 flex-shrink-0">{label}</span>
                  <span className="text-sm text-gray-800">{customerModal.data[key] || "—"}</span>
                </div>
              ))}
              {customerModal.data.last_enter_store_at && (
                <div className="flex">
                  <span className="w-32 text-sm font-bold text-gray-500 flex-shrink-0">最終署名日</span>
                  <span className="text-sm text-gray-800">{new Date(customerModal.data.last_enter_store_at).toLocaleDateString("ja-JP")}</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => setCustomerDeleteConfirmId(customerModal.data.id)}
                className="px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 font-medium"
              >削除</button>
              <div className="flex gap-3">
                <button onClick={() => setCustomerModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">閉じる</button>
                <button
                  onClick={() => {
                    setCustomerModal({ mode: "edit", data: {
                      ...customerModal.data,
                      remarks1: customerModal.data.remarks || "",
                      remarks2: customerModal.data.remarks2 || "",
                      remarks3: customerModal.data.remarks3 || "",
                    } });
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md"
                >編集</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 顧客削除確認モーダル */}
      {customerDeleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              この顧客情報を削除してもよろしいですか？
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setCustomerDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">キャンセル</button>
              <button onClick={() => deleteCustomer(customerDeleteConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
