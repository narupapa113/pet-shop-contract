import React, { useState, useEffect, useCallback } from "react";
import { Settings, FileText, Plus, Trash2, Upload, LogOut, Users, ChartBar as BarChart3, Calendar, Save, CircleCheck as CheckCircle, CreditCard as Edit2, Film, X, ArrowUp, ArrowDown, MoveVertical as MoreVertical, History, User, Phone, Mail, Play, Link, Smartphone, List, LayoutDashboard, Briefcase, Shield, Search, ChevronRight, ChevronDown, RotateCcw, TriangleAlert as AlertTriangle } from "lucide-react";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { STEP_TYPES, DEFAULT_TEMPLATES } from "../constants";
import ContractPreviewStep from "../components/ContractPreviewStep";
import SignatureStep from "../components/SignatureStep";
import UserManagement from "../components/UserManagement";
import RoleManagement from "../components/RoleManagement";
import PdfCardThumbnail from "../components/PdfCardThumbnail";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function generatePdfThumbnailBlob(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = 400 / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: scaledViewport }).promise;
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function generateAllPageImageBlobs(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const blobs = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = 1500 / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: scaledViewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    blobs.push(blob);
  }
  return blobs;
}

// adminPermissions の形式:
//   null      = フル権限（auth_id なしの古いアカウント）
//   undefined = 未ロード
//   object    = { [function_id]: Set<sub_id> }
//
// can(permissions, functionId, subId): 指定の操作権限を持つか判定
const can = (adminPermissions, functionId, subId) => {
  if (adminPermissions === null || adminPermissions === undefined) return true;
  return adminPermissions[functionId]?.has(subId) ?? false;
};

// canView: いずれかの function_id に sub_id=1（閲覧）があればメニューを表示
const canView = (adminPermissions, functionIds) => {
  if (adminPermissions === null || adminPermissions === undefined) return true;
  return functionIds.some((id) => adminPermissions[id]?.has(1) ?? false);
};

function SelectOptionAddForm({ onAdd, disabled }) {
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <form onSubmit={submit} className="flex gap-1.5">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="選択肢を入力"
        disabled={disabled}
        className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 disabled:bg-gray-100"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:hover:bg-blue-600 flex items-center"
      >
        <Plus size={14} />
      </button>
    </form>
  );
}

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
  adminPermissions,
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
      isRequired: false,
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

  const addSelectOption = (fieldIndex, text) => {
    if (!activeTemplate || !text.trim()) return;
    const newTemplates = [...staffTemplates];
    const field = newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex];
    field.options = [...(field.options || []), text.trim()];
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const updateSelectOption = (fieldIndex, optIndex, text) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    const field = newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex];
    field.options = [...(field.options || [])];
    field.options[optIndex] = text;
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const removeSelectOption = (fieldIndex, optIndex) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    const field = newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex];
    field.options = (field.options || []).filter((_, i) => i !== optIndex);
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const moveSelectOption = (fieldIndex, optIndex, dir) => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    const field = newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex];
    const opts = [...(field.options || [])];
    const newIndex = optIndex + dir;
    if (newIndex < 0 || newIndex >= opts.length) return;
    [opts[optIndex], opts[newIndex]] = [opts[newIndex], opts[optIndex]];
    field.options = opts;
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };

  const addNewTemplate = async () => {
    if (!can(adminPermissions, 5, 2)) return;
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
      is_requaier: !!f.isRequired,
    }));
    const { error: itemError } = await supabaseAdmin.from("contract_templates_item").insert(itemRows);
    if (itemError) console.error("テンプレート項目追加エラー:", itemError);
    const newFields = defaultFields.map((f, i) => ({ ...f, id: `field_${i + 1}` }));
    setStaffTemplates([...staffTemplates, { id: newId, name: "新しいテンプレート", fields: newFields }]);
    setSelectedTemplateId(newId);
  };

  const deleteTemplate = async (id) => {
    if (!can(adminPermissions, 5, 4)) return;
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
    if (!can(adminPermissions, 5, 3)) return;
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
      is_requaier: !!f.isRequired,
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
    const { data } = await supabase.from("files").select("*").eq("is_deleted", false).order("create_at", { ascending: false });
    if (data) {
      setDocumentsList(data.map((f) => {
        const thumbPath = f.path
          ? `thumbnails/${f.path.replace(/\.[^.]+$/, "")}.jpg`
          : null;
        return {
          id: f.id,
          title: f.name,
          filename: f.path ? f.path.split("/").pop() : "",
          path: f.path,
          thumbnailPath: thumbPath,
          pageCount: f.page_count || 1,
          type: "PDF",
        };
      }));
    }
  }, [setDocumentsList]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase.from("videos").select("*").eq("is_deleted", false).order("create_at", { ascending: false });
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
    const contentFid = contentTab === "video" ? 6 : 7;
    const contentSubId = editingContentId ? 3 : 2;
    if (!can(adminPermissions, contentFid, contentSubId)) return;
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
          setUploadProgress("ページ画像を生成中...");
          const basename = filePath.replace(/\.[^.]+$/, "");
          let pageCount = 1;
          try {
            const pageBlobs = await generateAllPageImageBlobs(selectedFile);
            pageCount = pageBlobs.length;
            await Promise.all(
              pageBlobs.map((blob, idx) =>
                supabaseAdmin.storage.from("files").upload(
                  `thumbnails/${basename}_p${idx + 1}.jpg`,
                  blob,
                  { contentType: "image/jpeg", upsert: true }
                )
              )
            );
            // page 1 を card用サムネイルとして保存
            if (pageBlobs[0]) {
              await supabaseAdmin.storage.from("files").upload(
                `thumbnails/${basename}.jpg`,
                pageBlobs[0],
                { contentType: "image/jpeg", upsert: true }
              );
            }
          } catch { /* 画像生成失敗は無視 */ }
          setUploadProgress("情報を保存中...");
          const { error: dbError } = await supabaseAdmin.from("files").insert({
            id: crypto.randomUUID(),
            name: newContentData.title,
            path: filePath,
            page_count: pageCount,
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
    if (!can(adminPermissions, contentTab === "video" ? 6 : 7, 4)) return;
    const now = new Date().toISOString();
    if (contentTab === "video") {
      await supabase.from("videos").update({ is_deleted: true, deleted_at: now }).eq("id", id);
      setThumbnails((prev) => { const n = { ...prev }; delete n[id]; return n; });
      await fetchVideos();
    } else {
      await supabaseAdmin.from("files").update({ is_deleted: true, deleted_at: now }).eq("id", id);
      await fetchDocuments();
    }
    setDeleteConfirmId(null);
  };

  const restoreContent = async (id) => {
    if (!can(adminPermissions, contentTab === "video" ? 6 : 7, 3)) return;
    const table = contentTab === "video" ? "videos" : "files";
    const client = contentTab === "video" ? supabase : supabaseAdmin;
    const { error } = await client.from(table).update({ is_deleted: false, deleted_at: null }).eq("id", id);
    if (error) { alert("復元に失敗しました"); return; }
    if (contentTab === "video") { await fetchVideos(); } else { await fetchDocuments(); }
    await fetchDeletedContents();
  };

  const [deletedContents, setDeletedContents] = useState([]);
  const [deletedContentsLoading, setDeletedContentsLoading] = useState(false);
  const [showDeletedContentsModal, setShowDeletedContentsModal] = useState(false);

  const fetchDeletedContents = useCallback(async () => {
    setDeletedContentsLoading(true);
    if (contentTab === "video") {
      const { data } = await supabase.from("videos").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false });
      setDeletedContents(data || []);
    } else {
      const { data } = await supabaseAdmin.from("files").select("*").eq("is_deleted", true).order("deleted_at", { ascending: false });
      setDeletedContents(data || []);
    }
    setDeletedContentsLoading(false);
  }, [contentTab]);

  useEffect(() => { setDeletedContents([]); }, [contentTab]);

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
      // DBから削除済みの添付資料IDを除外し、残っているものだけ①から順に並べ直す
      const validAttachmentIds = (flow.attachmentIds || []).filter((id) =>
        documentsList.some((doc) => doc.id === id)
      );
      setNewFlowData({ name: flow.name, description: flow.description || "", templateId: flow.templateId || staffTemplates[0]?.id || "", attachmentIds: validAttachmentIds });
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
    if (!can(adminPermissions, 8, editingFlowId ? 3 : 2)) return;
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
    if (!can(adminPermissions, 8, 4)) return;
    if (window.confirm("このフローを削除してもよろしいですか？")) {
      await supabaseAdmin.from("flow_step").delete().eq("id", id);
      await supabaseAdmin.from("flow_header").delete().eq("id", id);
      await fetchFlows();
    }
  };

  // --- ダッシュボード集計 ---
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const fetchDashStats = useCallback(async () => {
    setDashLoading(true);
    const [
      { data: urlRows },
      { data: historyRows },
      { data: customerRows },
      { data: flowRows },
      { data: templateRows },
      { data: videoRows },
      { data: documentRows },
    ] = await Promise.all([
      supabaseAdmin.from("onetime_url_manage").select("status, issue_at"),
      supabaseAdmin.from("sign_history").select("create_at"),
      supabaseAdmin.from("customers").select("create_at").neq("is_delete", true),
      supabaseAdmin.from("flow_header").select("id, name, type, create_at"),
      supabaseAdmin.from("contract_templates_header").select("id, name, create_at"),
      supabaseAdmin.from("videos").select("id, name, create_at").eq("is_deleted", false),
      supabaseAdmin.from("files").select("id, name, create_at").eq("is_deleted", false),
    ]);

    // 事前受付URL ステータス別件数
    const urlStatusCount = {};
    (urlRows || []).forEach(({ status }) => {
      urlStatusCount[status] = (urlStatusCount[status] || 0) + 1;
    });

    // 今月の契約数（sign_history.create_at が今月）
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const contractsThisMonth = (historyRows || []).filter((r) =>
      r.create_at?.startsWith(thisMonth)
    ).length;

    // 今月の新規顧客数
    const newCustomersThisMonth = (customerRows || []).filter((r) =>
      r.create_at?.startsWith(thisMonth)
    ).length;

    // 接客フロー タイプ別件数 (type: 1=通常接客, 2=ワンタイム/事前受付)
    const flowTypeCount = {};
    (flowRows || []).forEach(({ type }) => {
      const t = type ?? 1;
      flowTypeCount[t] = (flowTypeCount[t] || 0) + 1;
    });

    setDashStats({
      urlStatusCount,
      urlTotal: (urlRows || []).length,
      contractsThisMonth,
      totalContracts: (historyRows || []).length,
      newCustomersThisMonth,
      totalCustomers: (customerRows || []).length,
      totalFlows: (flowRows || []).length,
      flowTypeCount,
      recentFlows: (flowRows || []).slice(-5).reverse(),
      totalTemplates: (templateRows || []).length,
      recentTemplates: (templateRows || []).slice(-3).reverse(),
      totalVideos: (videoRows || []).length,
      totalDocuments: (documentRows || []).length,
    });
    setDashLoading(false);
  }, []);

  // --- 事前受付URL管理 ---
  const onetimeFlows = flows;
  const [selectedFlowForSession, setSelectedFlowForSession] = useState(onetimeFlows[0]?.id ?? "");
  const [selectedCustomerForUrl, setSelectedCustomerForUrl] = useState("");
  const [issuedUrls, setIssuedUrls] = useState([]);
  const [issuedUrlsLoading, setIssuedUrlsLoading] = useState(false);
  const [deleteOnetimeConfirmId, setDeleteOnetimeConfirmId] = useState(null);
  const [copiedUrlMsg, setCopiedUrlMsg] = useState(null); // { url }
  const [showFlowPickerModal, setShowFlowPickerModal] = useState(false);
  const [flowPickerSearch, setFlowPickerSearch] = useState("");
  const [showCustomerPickerModal, setShowCustomerPickerModal] = useState(false);
  const [customerPickerSearch, setCustomerPickerSearch] = useState("");

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
    if (!can(adminPermissions, 2, 2)) return;
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
    if (!can(adminPermissions, 2, 4)) return;
    try {
      const resp = await fetch("/.netlify/functions/delete-onetime-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "削除に失敗しました");

      setDeleteOnetimeConfirmId(null);
      fetchIssuedUrls();
    } catch (err) {
      console.error("削除エラー:", err);
      alert("削除に失敗しました: " + (err.message || JSON.stringify(err)));
    }
  };

  // --- スタッフ入力モーダル ---
  // phase: "input" | "preview"
  const [staffInputModal, setStaffInputModal] = useState(null); // { row, flow, fields, phase, customerData, signatureImage }
  const [staffInputSaving, setStaffInputSaving] = useState(false);

  const openStaffInputModal = async (row) => {
    if (!can(adminPermissions, 2, 3)) return;
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

    // 署名フェーズから開始: sign_history を status=1（進行中）で作成
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
    let initialSignHistoryId = null;
    if (contractIdValue) {
      try {
        const { data: sh } = await supabaseAdmin
          .from("sign_history")
          .insert({
            contract_id: contractIdValue,
            contract_name: flow.name || null,
            sign_customer_id: row.customer_id || null,
            status: 1,
            status_updated_at: new Date().toISOString(),
            onetime_url_id: row.id || null,
          })
          .select("id")
          .maybeSingle();
        initialSignHistoryId = sh?.id ?? null;
      } catch (err) {
        console.error("sign_history 作成エラー:", err);
      }
    }

    setStaffInputModal({ row, flow, fields, phase: "signature", customerData, signatureDataUrl: null, signHistoryId: initialSignHistoryId, remarksArr: ["", "", ""] });
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

      // 署名をアップロードして sign_history を完了状態に UPDATE
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
                status: 3,
                status_updated_at: new Date().toISOString(),
              })
              .select("id")
              .maybeSingle();
            signHistoryId = signHistoryData?.id ?? null;
          }
        }
      } else if (signHistoryId && signatureDataUrl) {
        const blob = await (await fetch(signatureDataUrl)).blob();
        const filePath = `signatures/${Date.now()}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("signatures")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          await supabaseAdmin.from("sign_history").update({
            sign_path: filePath,
            status: 3,
            status_updated_at: new Date().toISOString(),
          }).eq("id", signHistoryId);
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
    const requiredSub = customerModal?.mode === "add" ? 2 : 3;
    if (!can(adminPermissions, 4, requiredSub)) return;
    if (!customerModal?.data?.name) return alert("名前を入力してください");
    if (!customerModal?.data?.tell) return alert("電話番号を入力してください");
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
  if (!can(adminPermissions, 4, 4)) return;
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
    if (activeTab === "dashboard") fetchDashStats();
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "remote") { fetchIssuedUrls(); fetchCustomers(); }
  }, [activeTab, fetchDashStats, fetchCustomers, fetchIssuedUrls]);

  // --- 契約履歴 ---
  const [signHistoryList, setSignHistoryList] = useState([]);
  const [signHistoryLoading, setSignHistoryLoading] = useState(false);
  const [signHistoryDetail, setSignHistoryDetail] = useState(null);
  const [signHistorySearch, setSignHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyPreviewLoading, setHistoryPreviewLoading] = useState(null); // row id
  const [historyPreviewData, setHistoryPreviewData] = useState(null); // ContractPreviewStep props

  const openHistoryPreview = async (h) => {
    setHistoryPreviewLoading(h.id);
    try {
      // sign_input (スタッフ入力値)
      const { data: inputs } = await supabaseAdmin
        .from("sign_input")
        .select("sign_item_no, sign_item_value")
        .eq("id", h.id)
        .order("sign_item_no", { ascending: true });

      // flow_header (テンプレートID + 添付ファイルID一覧)
      const { data: flowRow } = await supabaseAdmin
        .from("flow_header")
        .select("contract_template_id, files, name")
        .eq("id", h.contract_id)
        .maybeSingle();

      // テンプレート項目 (フィールドラベル)
      let templateItems = [];
      let templateName = flowRow?.name || h.contract_name || "";
      if (flowRow?.contract_template_id) {
        const { data: items } = await supabaseAdmin
          .from("contract_templates_item")
          .select("item_no, item_name")
          .eq("id", flowRow.contract_template_id)
          .order("item_no", { ascending: true });
        templateItems = items || [];

        const { data: tmplHeader } = await supabaseAdmin
          .from("contract_templates_header")
          .select("name")
          .eq("id", flowRow.contract_template_id)
          .maybeSingle();
        if (tmplHeader?.name) templateName = tmplHeader.name;
      }

      // staffFields: テンプレート項目とsign_inputを対応付け
      const staffFields = templateItems.map((item) => {
        const input = (inputs || []).find((i) => i.sign_item_no === item.item_no);
        return { id: `item_${item.item_no}`, label: item.item_name, value: input?.sign_item_value || "" };
      });

      // 顧客データ
      let customerData = { name: "", nameKana: "", address: "", phone: "", email: "" };
      if (h.sign_customer_id) {
        const { data: cust } = await supabaseAdmin
          .from("customers")
          .select("*")
          .eq("id", h.sign_customer_id)
          .maybeSingle();
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

      // 署名画像 (Storage signed URL)
      let signatureImage = null;
      if (h.sign_path) {
        const { data: urlData } = await supabaseAdmin.storage
          .from("signatures")
          .createSignedUrl(h.sign_path, 3600);
        signatureImage = urlData?.signedUrl || null;
      }

      setHistoryPreviewData({
        customerData,
        staffFields,
        signatureImage,
        templateName,
        attachmentIds: flowRow?.files || [],
      });
    } catch (e) {
      alert(`データの読み込みに失敗しました: ${e.message}`);
    } finally {
      setHistoryPreviewLoading(null);
    }
  };

  const fetchSignHistory = useCallback(async () => {
    setSignHistoryLoading(true);
    const { data } = await supabaseAdmin
      .from("sign_history")
      .select("*, customers(name, name_kana, is_delete), users(name)")
      .order("create_at", { ascending: false });
    setSignHistoryList(data || []);
    setSignHistoryLoading(false);
  }, []);

  const openSignHistoryDetail = useCallback(async (history) => {
    const { data: inputs } = await supabaseAdmin
      .from("sign_input")
      .select("sign_item_no, sign_item_value")
      .eq("id", history.id)
      .order("sign_item_no", { ascending: true });

    // contract_id = flow_header.id → contract_template_id → template items
    let templateItems = [];
    const { data: flowRow } = await supabaseAdmin
      .from("flow_header")
      .select("contract_template_id")
      .eq("id", history.contract_id)
      .maybeSingle();
    if (flowRow?.contract_template_id) {
      const { data: items } = await supabaseAdmin
        .from("contract_templates_item")
        .select("item_no, item_name")
        .eq("id", flowRow.contract_template_id)
        .order("item_no", { ascending: true });
      templateItems = items || [];
    }

    setSignHistoryDetail({ history, inputs: inputs || [], templateItems });
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchSignHistory();
  }, [activeTab, fetchSignHistory]);

  // --- 設定 ---
  // 表示可能な最初の設定サブタブを初期値にする
  const initialSettingsTab = () => {
    if (can(adminPermissions, 9, 1)) return "company";
    if (can(adminPermissions, 10, 1)) return "users";
    if (can(adminPermissions, 12, 1)) return "roles";
    if (can(adminPermissions, 11, 1)) return "other";
    return "company";
  };
  const [settingsTab, setSettingsTab] = useState(initialSettingsTab);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempCompanyInfo, setTempCompanyInfo] = useState(companyInfo);
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [deletedCustomersLoading, setDeletedCustomersLoading] = useState(false);

  const fetchDeletedCustomers = async () => {
    setDeletedCustomersLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, name_kana, tell, mail, create_at")
      .eq("is_delete", true)
      .order("create_at", { ascending: false });
    if (!error) setDeletedCustomers(data || []);
    setDeletedCustomersLoading(false);
  };

  const restoreCustomer = async (customerId) => {
    const { error } = await supabase
      .from("customers")
      .update({ is_delete: false })
      .eq("id", customerId);
    if (!error) {
      setDeletedCustomers((prev) => prev.filter((c) => c.id !== customerId));
    }
  };

  useEffect(() => {
    if (settingsTab === "other") {
      fetchDeletedCustomers();
    }
  }, [settingsTab]);

  const handleSaveCompany = () => {
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

  // 権限ロード完了前はローディング表示（チラ見え防止）
  if (adminPermissions === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  // 各メニューの閲覧可否
  const showDashboard = canView(adminPermissions, [1]);
  const showRemote    = canView(adminPermissions, [2]);
  const showHistory   = canView(adminPermissions, [3]);
  const showCustomers = canView(adminPermissions, [4]);
  const showTemplate  = canView(adminPermissions, [5]);
  const showUpload    = canView(adminPermissions, [6, 7]);
  const showFlow      = canView(adminPermissions, [8]);
  const showSettings  = canView(adminPermissions, [9, 10, 11, 12]);

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
          {showDashboard && <MenuButton id="dashboard" icon={LayoutDashboard} label="ダッシュボード" />}
          {showRemote    && <MenuButton id="remote" icon={Smartphone} label="ワンタイムURL発行" />}
          {showHistory   && <MenuButton id="history" icon={History} label="契約履歴" />}
          {showCustomers && <MenuButton id="customers" icon={Users} label="顧客管理" />}
          {showTemplate  && <MenuButton id="template" icon={FileText} label="契約書テンプレート" />}
          {showUpload    && <MenuButton id="upload" icon={Upload} label="コンテンツ管理" />}
          {showFlow      && <MenuButton id="flow" icon={List} label="接客フロー作成" />}
          <div className="my-4 border-t border-gray-100"></div>
          <p className="text-xs font-bold text-gray-400 mb-2 px-4">システム</p>
          {showSettings && (
            <div>
              <button
                onClick={() => {
                  setSettingsOpen((prev) => !prev);
                  if (!settingsOpen) {
                    setActiveTab("settings");
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-1 transition-colors ${activeTab === "settings" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <div className="flex items-center space-x-3">
                  <Settings size={20} />
                  <span className="text-sm font-medium">設定</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {settingsOpen && (
                <div className="ml-4 mb-1 space-y-0.5">
                  {can(adminPermissions, 9, 1) && (
                    <button
                      onClick={() => { setActiveTab("settings"); setSettingsTab("company"); }}
                      className={`w-full text-left flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "settings" && settingsTab === "company" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                    >
                      会社情報
                    </button>
                  )}
                  {can(adminPermissions, 10, 1) && (
                    <button
                      onClick={() => { setActiveTab("settings"); setSettingsTab("users"); }}
                      className={`w-full text-left flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "settings" && settingsTab === "users" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                    >
                      アカウント管理
                    </button>
                  )}
                  {can(adminPermissions, 12, 1) && (
                    <button
                      onClick={() => { setActiveTab("settings"); setSettingsTab("roles"); }}
                      className={`w-full text-left flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "settings" && settingsTab === "roles" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                    >
                      権限管理
                    </button>
                  )}
                  {can(adminPermissions, 11, 1) && (
                    <button
                      onClick={() => { setActiveTab("settings"); setSettingsTab("other"); }}
                      className={`w-full text-left flex items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "settings" && settingsTab === "other" ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                    >
                      その他
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
        {activeTab === "dashboard" && showDashboard && (
          <div className="space-y-6">
            {dashLoading || !dashStats ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400 text-sm">読み込み中...</div>
            ) : (
              <>
                {/* ── サマリーカード ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "今月の契約",   value: dashStats.contractsThisMonth, unit: "件",  sub: `累計 ${dashStats.totalContracts}件`,  icon: <FileText size={16} className="text-blue-400" />,    bg: "bg-blue-50" },
                    { label: "事前受付URL",  value: dashStats.urlTotal,           unit: "件",  sub: `完了 ${dashStats.urlStatusCount[7] || 0}件`,  icon: <Link size={16} className="text-teal-400" />,        bg: "bg-teal-50" },
                    { label: "今月の新規顧客", value: dashStats.newCustomersThisMonth, unit: "名", sub: `登録 ${dashStats.totalCustomers}名`, icon: <Users size={16} className="text-violet-400" />,  bg: "bg-violet-50" },
                    { label: "接客フロー",   value: dashStats.totalFlows,         unit: "件",  sub: null,                                          icon: <List size={16} className="text-orange-400" />,     bg: "bg-orange-50" },
                    { label: "契約書テンプレート", value: dashStats.totalTemplates, unit: "件", sub: null,                                         icon: <FileText size={16} className="text-green-400" />,  bg: "bg-green-50" },
                    { label: "コンテンツ",   value: dashStats.totalVideos + dashStats.totalDocuments, unit: "件", sub: `動画 ${dashStats.totalVideos} / 書類 ${dashStats.totalDocuments}`, icon: <Film size={16} className="text-sky-400" />, bg: "bg-sky-50" },
                  ].map(({ label, value, unit, sub, icon, bg }) => (
                    <div key={label} className={`${bg} rounded-xl border border-white shadow-sm p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-500 leading-tight">{label}</p>
                        {icon}
                      </div>
                      <p className="text-2xl font-bold text-gray-800">{value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span></p>
                      {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
                    </div>
                  ))}
                </div>

                {/* ── 2カラム: 事前受付URL棒グラフ ＋ コンテンツ内訳 ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 事前受付URL ステータス別棒グラフ */}
                  {(() => {
                    const STATUS_DEF = [
                      { key: 1, label: "未認証",        bar: "bg-gray-400",   text: "text-gray-600" },
                      { key: 2, label: "認証済",         bar: "bg-blue-400",   text: "text-blue-700" },
                      { key: 3, label: "視聴中",         bar: "bg-yellow-400", text: "text-yellow-700" },
                      { key: 4, label: "情報送信済",     bar: "bg-orange-400", text: "text-orange-700" },
                      { key: 5, label: "署名済",         bar: "bg-green-400",  text: "text-green-700" },
                      { key: 6, label: "スタッフ入力済", bar: "bg-teal-400",   text: "text-teal-700" },
                      { key: 7, label: "完了",           bar: "bg-blue-600",   text: "text-blue-800" },
                    ];
                    const maxCount = Math.max(1, ...STATUS_DEF.map((s) => dashStats.urlStatusCount[s.key] || 0));
                    return (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-5">事前受付URL — ステータス別件数</h3>
                        <div className="flex items-end gap-2 h-40">
                          {STATUS_DEF.map((s) => {
                            const count = dashStats.urlStatusCount[s.key] || 0;
                            const pct = Math.round((count / maxCount) * 100);
                            return (
                              <div key={s.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                <span className={`text-xs font-bold ${s.text}`}>{count > 0 ? count : ""}</span>
                                <div
                                  className={`w-full rounded-t-md transition-all duration-500 ${s.bar} ${count === 0 ? "opacity-20" : "opacity-90"}`}
                                  style={{ height: count === 0 ? "4px" : `${Math.max(6, pct)}%` }}
                                />
                                <span className="text-[9px] text-gray-500 text-center leading-tight w-full overflow-hidden text-ellipsis whitespace-nowrap">{s.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-gray-100">
                          {STATUS_DEF.map((s) => {
                            const count = dashStats.urlStatusCount[s.key] || 0;
                            return (
                              <div key={s.key} className="flex items-center gap-1">
                                <span className={`inline-block w-2 h-2 rounded-sm ${s.bar} ${count === 0 ? "opacity-30" : ""}`} />
                                <span className={`text-[10px] ${count === 0 ? "text-gray-300" : "text-gray-600"}`}>{s.label}</span>
                                <span className={`text-[10px] font-bold ${count === 0 ? "text-gray-300" : s.text}`}>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* コンテンツ管理 内訳ドーナツ風 + 件数 */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-5">コンテンツ管理 — 内訳</h3>
                    <div className="space-y-3">
                      {[
                        { label: "動画コンテンツ",   count: dashStats.totalVideos,     bar: "bg-sky-400",    text: "text-sky-700" },
                        { label: "書類・PDF",         count: dashStats.totalDocuments,  bar: "bg-indigo-400", text: "text-indigo-700" },
                        { label: "接客フロー",        count: dashStats.totalFlows,      bar: "bg-orange-400", text: "text-orange-700" },
                        { label: "契約書テンプレート", count: dashStats.totalTemplates,  bar: "bg-green-400",  text: "text-green-700" },
                      ].map(({ label, count, bar, text }) => {
                        const total = dashStats.totalVideos + dashStats.totalDocuments + dashStats.totalFlows + dashStats.totalTemplates;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">{label}</span>
                              <span className={`text-xs font-bold ${text}`}>{count}件</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${bar} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                      {dashStats.recentTemplates.map((t) => (
                        <div key={t.id} className="flex items-center gap-1.5 min-w-0">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-[10px] text-gray-500 truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── 事前受付URL 進捗ゲージ ── */}
                {dashStats.urlTotal > 0 && (() => {
                  const STATUS_DEF = [
                    { key: 1, label: "未認証",        color: "bg-gray-300" },
                    { key: 2, label: "認証済",         color: "bg-blue-300" },
                    { key: 3, label: "視聴中",         color: "bg-yellow-300" },
                    { key: 4, label: "情報送信済",     color: "bg-orange-300" },
                    { key: 5, label: "署名済",         color: "bg-green-300" },
                    { key: 6, label: "スタッフ入力済", color: "bg-teal-400" },
                    { key: 7, label: "完了",           color: "bg-blue-600" },
                  ];
                  return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-sm font-bold text-gray-700 mb-4">事前受付URL — 進捗内訳</h3>
                      <div className="flex rounded-full overflow-hidden h-5 w-full gap-px">
                        {STATUS_DEF.map((s) => {
                          const count = dashStats.urlStatusCount[s.key] || 0;
                          if (count === 0) return null;
                          const pct = (count / dashStats.urlTotal) * 100;
                          return (
                            <div
                              key={s.key}
                              title={`${s.label}: ${count}件 (${Math.round(pct)}%)`}
                              className={`${s.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                        {STATUS_DEF.map((s) => {
                          const count = dashStats.urlStatusCount[s.key] || 0;
                          if (count === 0) return null;
                          const pct = Math.round((count / dashStats.urlTotal) * 100);
                          return (
                            <div key={s.key} className="flex items-center gap-1.5">
                              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} />
                              <span className="text-xs text-gray-600">{s.label}</span>
                              <span className="text-xs font-bold text-gray-700">{count}件</span>
                              <span className="text-xs text-gray-400">({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── 接客フロー 一覧カード ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">接客フロー — 登録一覧</h3>
                  {dashStats.totalFlows === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">フローが登録されていません</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(() => {
                        const TYPE_DEF = {
                          1: { label: "通常接客",     dot: "bg-orange-400" },
                          2: { label: "事前受付",     dot: "bg-teal-400" },
                        };
                        return dashStats.recentFlows.map((f) => {
                          const t = TYPE_DEF[f.type ?? 1] ?? { label: "不明", dot: "bg-gray-300" };
                          return (
                            <div key={f.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${t.dot}`} />
                              <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                              <span className="text-[10px] text-gray-400 shrink-0">{t.label}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  {dashStats.totalFlows > 5 && (
                    <p className="text-[10px] text-gray-400 mt-3 text-right">最新 5 件を表示 / 合計 {dashStats.totalFlows} 件</p>
                  )}
                </div>

                {/* ── 契約書テンプレート 一覧カード ── */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">契約書テンプレート — 登録一覧</h3>
                  {dashStats.totalTemplates === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">テンプレートが登録されていません</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {dashStats.recentTemplates.map((t) => (
                        <div key={t.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
                          <FileText size={11} className="text-green-500 shrink-0" />
                          <span className="text-xs text-gray-700">{t.name}</span>
                        </div>
                      ))}
                      {dashStats.totalTemplates > 3 && (
                        <div className="flex items-center px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
                          <span className="text-xs text-gray-400">他 {dashStats.totalTemplates - 3} 件</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 事前受付URL発行 */}
        {activeTab === "remote" && showRemote && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">ワンタイムURLの発行・管理</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
              <h3 className="font-bold text-lg mb-4">新規URL発行</h3>
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">使用する接客フロー</label>
                  <button
                    type="button"
                    onClick={() => { setFlowPickerSearch(""); setShowFlowPickerModal(true); }}
                    className="w-full p-2 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className={selectedFlowForSession ? "text-gray-800" : "text-gray-400"}>
                      {selectedFlowForSession
                        ? (onetimeFlows.find((f) => f.id === selectedFlowForSession)?.name ?? "フローを選択")
                        : (onetimeFlows.length === 0 ? "ワンタイム用フローがありません" : "フローを選択してください")}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </button>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">顧客選択（任意）</label>
                  <button
                    type="button"
                    onClick={() => { setCustomerPickerSearch(""); setShowCustomerPickerModal(true); }}
                    className="w-full p-2 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className={selectedCustomerForUrl ? "text-gray-800" : "text-gray-400"}>
                      {selectedCustomerForUrl
                        ? (() => { const c = customers.find((c) => c.id === selectedCustomerForUrl); return c ? `${c.name}${c.tell ? `（${c.tell}）` : ""}` : "顧客を選択"; })()
                        : "顧客を選択してください（任意）"}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </button>
                </div>
                {can(adminPermissions, 2, 2) && (
                  <button onClick={createOnetimeUrl} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center whitespace-nowrap">
                    <Link size={18} className="mr-2" /> URLを発行する
                  </button>
                )}
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
                              {can(adminPermissions, 2, 3) && (
                                <button
                                  disabled={row.status < 4 || row.status >= 6}
                                  onClick={() => openStaffInputModal(row)}
                                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${row.status >= 4 && row.status < 6 ? "border-blue-500 text-blue-600 hover:bg-blue-50" : "border-gray-200 text-gray-300 cursor-not-allowed"}`}
                                >
                                  署名へ
                                </button>
                              )}
                              {can(adminPermissions, 2, 4) && (
                                <button
                                  onClick={() => setDeleteOnetimeConfirmId(row.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="削除"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
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
        {activeTab === "template" && showTemplate && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">契約書入力項目カスタマイズ</h3>
                  <p className="text-gray-500 text-sm mt-1">店舗スタッフが接客時に入力する項目のデフォルト設定を管理します。</p>
                </div>
                <div className="flex space-x-3">
                  {can(adminPermissions, 5, 2) && (
                    <button onClick={addField} className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                      <Plus size={16} className="mr-2" /> 項目を追加
                    </button>
                  )}
                  {can(adminPermissions, 5, 3) && (
                    <button onClick={saveTemplate} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md">
                      <Save size={18} className="mr-2" /> 設定を保存
                    </button>
                  )}
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
                    {can(adminPermissions, 5, 2) && (
                      <button onClick={addNewTemplate} className="text-blue-600 hover:bg-blue-100 p-1 rounded">
                        <Plus size={18} />
                      </button>
                    )}
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
                            disabled={!can(adminPermissions, 5, 3)}
                            className="w-full text-xl font-bold text-gray-800 border-none focus:ring-0 p-0 disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="flex space-x-3">
                          {can(adminPermissions, 5, 4) && (
                            <button onClick={() => deleteTemplate(activeTemplate.id)} className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-200">
                              <Trash2 size={16} className="mr-2" /> 削除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 pr-2">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/4">項目名</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/5">入力タイプ</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/3">プレースホルダー</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-20 text-center">必須</th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">削除</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {activeTemplate.fields.map((field, index) => (
                              <React.Fragment key={field.id}>
                                <tr className="hover:bg-gray-50">
                                  <td className="p-2">
                                    <input type="text" value={field.label} onChange={(e) => updateField(index, "label", e.target.value)} className="w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" disabled={!can(adminPermissions, 5, 3)} />
                                  </td>
                                  <td className="p-2">
                                    <select value={field.type} onChange={(e) => updateField(index, "type", e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white disabled:bg-gray-50 disabled:text-gray-500" disabled={!can(adminPermissions, 5, 3)}>
                                      <option value="text">テキスト</option>
                                      <option value="number">数値</option>
                                      <option value="date">日付</option>
                                      <option value="select">選択肢</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input type="text" value={field.placeholder || ""} onChange={(e) => updateField(index, "placeholder", e.target.value)} className="w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-500" disabled={!can(adminPermissions, 5, 3) || field.type === "select" || field.type === "date"} />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={!!field.isRequired}
                                      onChange={(e) => updateField(index, "isRequired", e.target.checked)}
                                      className="w-5 h-5 accent-blue-600 disabled:opacity-50 cursor-pointer"
                                      disabled={!can(adminPermissions, 5, 3)}
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    {/* DB未保存のローカル項目は削除権限なしでも削除可 */}
                                    {(can(adminPermissions, 5, 4) || !uuidRegex.test(field.id)) && (
                                      <button onClick={() => removeField(index)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                                {field.type === "select" && (
                                  <tr>
                                    <td colSpan={5} className="p-3 bg-gray-50 border-b border-gray-200">
                                      <div className="flex gap-4">
                                        <div className="w-1/2">
                                          <label className="block text-xs font-medium text-gray-500 mb-1">選択肢を追加</label>
                                          <SelectOptionAddForm onAdd={(text) => addSelectOption(index, text)} disabled={!can(adminPermissions, 5, 3)} />
                                        </div>
                                        <div className="w-1/2">
                                          <label className="block text-xs font-medium text-gray-500 mb-1">選択肢一覧（上から順に表示）</label>
                                          {(field.options || []).length === 0 ? (
                                            <p className="text-xs text-gray-400 py-2">まだ選択肢がありません。左から追加してください。</p>
                                          ) : (
                                            <div className="space-y-1.5">
                                              {(field.options || []).map((opt, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                                                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{optIndex + 1}</span>
                                                  <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => updateSelectOption(index, optIndex, e.target.value)}
                                                    disabled={!can(adminPermissions, 5, 3)}
                                                    className="flex-1 text-sm border border-transparent hover:border-gray-300 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                                                  />
                                                  <button onClick={() => moveSelectOption(index, optIndex, -1)} disabled={!can(adminPermissions, 5, 3) || optIndex === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"><ArrowUp size={14} /></button>
                                                  <button onClick={() => moveSelectOption(index, optIndex, 1)} disabled={!can(adminPermissions, 5, 3) || optIndex === (field.options || []).length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"><ArrowDown size={14} /></button>
                                                  <button onClick={() => removeSelectOption(index, optIndex)} disabled={!can(adminPermissions, 5, 3)} className="text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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
        {activeTab === "upload" && showUpload && (
          <div className="max-w-6xl mx-auto">
            <div className="flex space-x-1 mb-6 border-b">
              <button onClick={() => setContentTab("video")} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "video" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>動画コンテンツ</button>
              <button onClick={() => setContentTab("document")} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "document" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>ドキュメント (PDF等)</button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">{contentTab === "video" ? "接客時に再生する動画コンテンツを管理します。" : "契約書の裏面に印刷するPDF資料を管理します。"}</p>
              <div className="flex items-center gap-3">
                {can(adminPermissions, contentTab === "video" ? 6 : 7, 3) && (
                  <button
                    onClick={async () => { setShowDeletedContentsModal(true); await fetchDeletedContents(); }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 flex items-center"
                  >
                    <RotateCcw size={16} className="mr-1.5" /> 削除済み一覧
                  </button>
                )}
                {can(adminPermissions, contentTab === "video" ? 6 : 7, 2) && (
                  <button onClick={() => openUploadModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md">
                    <Upload size={18} className="mr-2" /> 新規アップロード
                  </button>
                )}
              </div>
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
                        <p className="text-sm text-gray-500 mb-2 h-10 overflow-hidden line-clamp-2 whitespace-pre-wrap">{video.description || "説明なし"}</p>
                        {video.createdAt && <p className="text-xs text-gray-400 mb-3">登録日時: {video.createdAt}</p>}
                        <div className="flex justify-between items-center border-t pt-3">
                          {can(adminPermissions, 6, 3) ? (
                            <button onClick={() => openUploadModal(video)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                              <Edit2 size={14} className="mr-1" /> 編集
                            </button>
                          ) : <span />}
                          {can(adminPermissions, 6, 4) && (
                            <button onClick={() => setDeleteConfirmId(video.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                              <Trash2 size={14} className="mr-1" /> 削除
                            </button>
                          )}
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
                      <PdfCardThumbnail path={doc.path} thumbnailPath={doc.thumbnailPath} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center mb-1">
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded mr-2 font-bold">{doc.type}</span>
                        <h3 className="font-bold text-gray-800 truncate flex-1">{doc.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{doc.filename}</p>
                      <div className="flex justify-between items-center border-t pt-3">
                        {can(adminPermissions, 7, 3) ? (
                          <button onClick={() => openUploadModal(doc)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                            <Edit2 size={14} className="mr-1" /> 編集
                          </button>
                        ) : <span />}
                        {can(adminPermissions, 7, 4) && (
                          <button onClick={() => setDeleteConfirmId(doc.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                            <Trash2 size={14} className="mr-1" /> 削除
                          </button>
                        )}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">説明文</label>
                        <textarea className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none" rows={3} value={newContentData.description} onChange={(e) => setNewContentData({ ...newContentData, description: e.target.value })} placeholder="動画の内容について説明を入力してください" />
                      </div>
                    )}
                    {contentTab === "video" && newContentData.duration && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Play size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-500">再生時間：</span>
                        <span className="text-sm font-semibold text-gray-800">{newContentData.duration}</span>
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
                    {can(adminPermissions, contentTab === "video" ? 6 : 7, editingContentId ? 3 : 2) && (
                      <button onClick={handleContentSave} disabled={!newContentData.title || isUploading} className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center ${!newContentData.title || isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 shadow-md"}`}>
                        {isUploading ? uploadProgress || "保存中..." : "保存する"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 削除確認モーダル */}
            {deleteConfirmId && (() => {
              const referencingFlows = flows.filter((flow) => {
                if (contentTab === "video") {
                  return (flow.steps || []).some((step) => (step.videoIds || []).includes(deleteConfirmId));
                }
                return (flow.attachmentIds || []).includes(deleteConfirmId);
              });
              return (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">削除の確認</h3>
                  <p className="text-gray-600 mb-4">
                    {contentTab === "video" ? "この動画を削除してもよろしいですか？" : "このドキュメントを削除してもよろしいですか？"}
                  </p>
                  {referencingFlows.length > 0 && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1.5 flex items-center">
                        <AlertTriangle size={16} className="mr-1.5 flex-shrink-0" />
                        以下のフローで使用されています
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1 pl-1">
                        {referencingFlows.map((f) => (
                          <li key={f.id} className="flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 flex-shrink-0" />
                            {f.name}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-amber-600 mt-2">
                        削除するとこれらのフローの選択肢から外れます。過去の契約履歴への影響はありません。
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mb-6">削除後は「削除済み一覧」から復元できます。</p>
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">キャンセル</button>
                    {can(adminPermissions, contentTab === "video" ? 6 : 7, 4) && (
                      <button onClick={() => deleteContent(deleteConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {/* 削除済みアイテム復元モーダル */}
            {showDeletedContentsModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">削除済み{contentTab === "video" ? "動画" : "ドキュメント"}一覧</h3>
                    <button onClick={() => setShowDeletedContentsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {deletedContentsLoading ? (
                      <p className="text-center text-gray-400 py-8">読み込み中...</p>
                    ) : deletedContents.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">削除済みの{contentTab === "video" ? "動画" : "ドキュメント"}はありません。</p>
                    ) : (
                      <div className="space-y-3">
                        {deletedContents.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{item.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">削除日時: {item.deleted_at ? new Date(item.deleted_at).toLocaleString("ja-JP") : "不明"}</p>
                            </div>
                            {can(adminPermissions, contentTab === "video" ? 6 : 7, 3) && (
                              <button
                                onClick={() => restoreContent(item.id)}
                                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 flex items-center flex-shrink-0"
                              >
                                <RotateCcw size={14} className="mr-1" /> 復元
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
                      {playingVideo.description && <p className="text-gray-400 text-sm whitespace-pre-wrap">{playingVideo.description}</p>}
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
        {activeTab === "flow" && showFlow && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">接客時の画面遷移フローを作成・編集します。</p>
              {can(adminPermissions, 8, 2) && (
                <button onClick={() => openFlowModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md">
                  <Plus size={18} className="mr-2" /> 新規フロー作成
                </button>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-gray-600 border-b border-gray-200">フロー名</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 border-b border-gray-200">契約書テンプレート</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 border-b border-gray-200 text-center">添付資料</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 border-b border-gray-200 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {flows.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-16 text-center text-gray-400">フローがありません</td></tr>
                  )}
                  {flows.map((flow) => (
                    <tr key={flow.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{flow.name}</td>
                      <td className="px-5 py-3 text-gray-500">{staffTemplates.find((t) => t.id === flow.templateId)?.name || "未設定"}</td>
                      <td className="px-5 py-3 text-center text-gray-600">{(flow.attachmentIds || []).filter((id) => documentsList.some((doc) => doc.id === id)).length}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {can(adminPermissions, 8, 3) && (
                            <button onClick={() => openFlowModal(flow)} className="text-gray-400 hover:text-blue-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
                          )}
                          {can(adminPermissions, 8, 4) && (
                            <button onClick={() => deleteFlow(flow.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    {can(adminPermissions, 8, editingFlowId ? 3 : 2) && (
                      <button onClick={saveFlow} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">保存する</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 契約履歴 */}
        {activeTab === "history" && showHistory && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-gray-800">契約履歴一覧</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={signHistorySearch}
                    onChange={(e) => setSignHistorySearch(e.target.value)}
                    placeholder="お客様名・契約名で検索"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
                  />
                  <button onClick={fetchSignHistory} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">更新</button>
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { key: "all", label: "一覧" },
                  { key: "incomplete", label: "未完了" },
                  { key: "completed", label: "完了" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setHistoryStatusFilter(tab.key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${historyStatusFilter === tab.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {signHistoryLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">読み込み中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-5 py-3 border-b border-gray-200">契約名</th>
                      <th className="px-5 py-3 border-b border-gray-200">お客様名</th>
                      <th className="px-5 py-3 border-b border-gray-200">担当スタッフ</th>
                      <th className="px-5 py-3 border-b border-gray-200">契約日時</th>
                      <th className="px-5 py-3 border-b border-gray-200">ステータス</th>
                      <th className="px-5 py-3 border-b border-gray-200 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {signHistoryList
                      .filter((h) => {
                        if (historyStatusFilter === "incomplete" && h.status === 3) return false;
                        if (historyStatusFilter === "completed" && h.status !== 3) return false;
                        if (!signHistorySearch) return true;
                        const q = signHistorySearch.toLowerCase();
                        return (
                          (h.contract_name || "").toLowerCase().includes(q) ||
                          (h.customers?.name || "").toLowerCase().includes(q) ||
                          (h.customers?.name_kana || "").toLowerCase().includes(q)
                        );
                      })
                      .map((h) => {
                        const statusInfo = h.status === 1
                          ? { label: "進行中", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" }
                          : h.status === 2
                          ? { label: "要確認", cls: "bg-orange-100 text-orange-700 border-orange-200", rowBg: "bg-orange-50" }
                          : h.status === 4
                          ? { label: "事前受付完了", cls: "bg-teal-100 text-teal-700 border-teal-200", rowBg: "bg-teal-50" }
                          : { label: "完了", cls: "bg-green-100 text-green-700 border-green-200" };
                        return (
                        <tr key={h.id} className={`${(h.status === 2 || h.status === 4) ? (h.status === 2 ? "bg-orange-50" : "bg-teal-50") : ""} hover:bg-gray-50 transition-colors`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{h.contract_name || "—"}</td>
                          <td className="px-5 py-3 text-gray-700">
                            <span className="inline-flex items-center gap-1.5">
                              {h.customers?.name || "—"}
                              {h.customers?.name_kana && <span className="text-xs text-gray-400">({h.customers.name_kana})</span>}
                              {h.customers?.is_delete && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600 border border-red-200">削除済</span>
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{h.users?.name || "—"}</td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {h.create_at ? new Date(h.create_at).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openHistoryPreview(h)}
                                disabled={historyPreviewLoading === h.id}
                                className="text-green-600 hover:text-green-800 text-xs font-bold px-3 py-1 border border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                              >
                                {historyPreviewLoading === h.id ? "読込中..." : "PDF出力"}
                              </button>
                              <button
                                onClick={() => openSignHistoryDetail(h)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-bold px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                詳細
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    {signHistoryList.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400">契約履歴がありません</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 顧客管理 */}
        {activeTab === "customers" && showCustomers && (
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
                {can(adminPermissions, 4, 2) && (
                  <button
                    onClick={() => setCustomerModal({ mode: "add", data: { ...EMPTY_CUSTOMER } })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-sm text-sm"
                  >
                    <Plus size={16} className="mr-1.5" /> 顧客を追加
                  </button>
                )}
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
                            {can(adminPermissions, 4, 3) && (
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
                            )}
                            {can(adminPermissions, 4, 4) && (
                              <button
                                onClick={() => setCustomerDeleteConfirmId(customer.id)}
                                className="px-2 py-1 text-xs border border-red-200 rounded text-red-500 hover:bg-red-50 font-medium"
                              >削除</button>
                            )}
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
        {activeTab === "settings" && showSettings && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
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
                          disabled={!can(adminPermissions, 9, 3)}
                          className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                      {can(adminPermissions, 9, 3) && (
                        <div className="pt-6">
                          <button onClick={handleSaveCompany} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center">
                            <Save size={18} className="mr-2" /> 保存する
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {settingsTab === "roles" && <RoleManagement adminPermissions={adminPermissions} />}
                {settingsTab === "users" && <UserManagement adminPermissions={adminPermissions} />}
                {settingsTab === "other" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4">削除済み顧客一覧</h3>
                    {deletedCustomersLoading ? (
                      <div className="flex items-center justify-center py-16 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                        読み込み中...
                      </div>
                    ) : deletedCustomers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <RotateCcw size={40} className="mb-3 opacity-30" />
                        <p className="text-sm">削除済みの顧客はいません</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">氏名</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">フリガナ</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">電話番号</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">メールアドレス</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-600">登録日</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {deletedCustomers.map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{c.name || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{c.name_kana || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{c.phone || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{c.email || "—"}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                  {c.created_at ? new Date(c.created_at).toLocaleDateString("ja-JP") : "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => restoreCustomer(c.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                                  >
                                    <RotateCcw size={13} /> 復活
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* 契約履歴 詳細モーダル */}
      {signHistoryDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{signHistoryDetail.history.contract_name || "契約詳細"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">
                    {signHistoryDetail.history.create_at
                      ? new Date(signHistoryDetail.history.create_at).toLocaleString("ja-JP")
                      : ""}
                  </p>
                  {(() => {
                    const s = signHistoryDetail.history.status;
                    const info = s === 1
                      ? { label: "進行中", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" }
                      : s === 2
                      ? { label: "要確認", cls: "bg-orange-100 text-orange-700 border-orange-200" }
                      : s === 4
                      ? { label: "事前受付完了", cls: "bg-teal-100 text-teal-700 border-teal-200" }
                      : { label: "完了", cls: "bg-green-100 text-green-700 border-green-200" };
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${info.cls}`}>
                        {info.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setSignHistoryDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">お客様名</p>
                  <p className="font-bold text-gray-800">{signHistoryDetail.history.customers?.name || "—"}</p>
                  {signHistoryDetail.history.customers?.name_kana && (
                    <p className="text-xs text-gray-400">{signHistoryDetail.history.customers.name_kana}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1">担当スタッフ</p>
                  <p className="font-bold text-gray-800">{signHistoryDetail.history.users?.name || "—"}</p>
                </div>
              </div>

              {/* 入力項目 */}
              {signHistoryDetail.inputs.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">入力内容</h4>
                  <div className="space-y-2">
                    {signHistoryDetail.inputs.map((inp) => {
                      const templateItem = signHistoryDetail.templateItems.find((t) => t.item_no === inp.sign_item_no);
                      return (
                        <div key={inp.sign_item_no} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                          <span className="text-xs font-semibold text-gray-500 w-32 shrink-0 pt-0.5">
                            {templateItem?.item_name || `項目 ${inp.sign_item_no}`}
                          </span>
                          <span className="text-sm text-gray-800 flex-1 break-all">{inp.sign_item_value || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {signHistoryDetail.inputs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">入力データがありません</p>
              )}
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setSignHistoryDetail(null)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 契約履歴 PDF プレビューモーダル */}
      {historyPreviewData && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="w-full max-w-4xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">契約書プレビュー</h2>
              <button
                onClick={() => setHistoryPreviewData(null)}
                className="text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1"
              >
                <X size={16} /> 閉じる
              </button>
            </div>
            <ContractPreviewStep
              customerData={historyPreviewData.customerData}
              staffFields={historyPreviewData.staffFields}
              signatureImage={historyPreviewData.signatureImage}
              onPrev={() => setHistoryPreviewData(null)}
              companyInfo={companyInfo}
              templateName={historyPreviewData.templateName}
              documentsList={documentsList}
              attachmentIds={historyPreviewData.attachmentIds}
              isRemote={false}
            />
          </div>
        </div>
      )}

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
              {can(adminPermissions, 2, 4) && (
                <button onClick={() => deleteOnetimeUrl(deleteOnetimeConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
              )}
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

      {/* 接客フロー選択モーダル */}
      {showFlowPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowFlowPickerModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">接客フローを選択</h3>
              <button onClick={() => setShowFlowPickerModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="フロー名で検索..."
                  value={flowPickerSearch}
                  onChange={(e) => setFlowPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              {onetimeFlows.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ワンタイム用フローがありません</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {onetimeFlows
                    .filter((f) => f.name.includes(flowPickerSearch) || (f.description || "").includes(flowPickerSearch))
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setSelectedFlowForSession(f.id); setShowFlowPickerModal(false); }}
                        className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                          selectedFlowForSession === f.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{f.name}</p>
                            {f.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{f.description}</p>}
                            <p className="text-xs text-gray-400 mt-2">{f.steps.length} ステップ</p>
                          </div>
                          {selectedFlowForSession === f.id && (
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
              {onetimeFlows.length > 0 && onetimeFlows.filter((f) => f.name.includes(flowPickerSearch) || (f.description || "").includes(flowPickerSearch)).length === 0 && (
                <p className="text-center text-gray-400 py-8">該当するフローがありません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 顧客選択モーダル */}
      {showCustomerPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomerPickerModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">顧客を選択</h3>
              <button onClick={() => setShowCustomerPickerModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="名前・電話番号・メールで検索..."
                  value={customerPickerSearch}
                  onChange={(e) => setCustomerPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerForUrl(""); setShowCustomerPickerModal(false); }}
                  className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    !selectedCustomerForUrl ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-gray-500 text-sm">選択しない（任意）</p>
                </button>
                {customers
                  .filter((c) => {
                    const q = customerPickerSearch.toLowerCase();
                    return !q ||
                      (c.name || "").toLowerCase().includes(q) ||
                      (c.tell || "").includes(q) ||
                      (c.email || "").toLowerCase().includes(q);
                  })
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedCustomerForUrl(c.id); setShowCustomerPickerModal(false); }}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedCustomerForUrl === c.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{c.name || "（名前なし）"}</p>
                          {c.tell && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={11} />{c.tell}</p>}
                          {c.email && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Mail size={11} />{c.email}</p>}
                        </div>
                        {selectedCustomerForUrl === c.id && (
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
              {customers.filter((c) => {
                const q = customerPickerSearch.toLowerCase();
                return !q || (c.name || "").toLowerCase().includes(q) || (c.tell || "").includes(q) || (c.email || "").toLowerCase().includes(q);
              }).length === 0 && customerPickerSearch && (
                <p className="text-center text-gray-400 py-8 col-span-2">該当する顧客がいません</p>
              )}
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
                { key: "tell", label: "電話番号", required: true, placeholder: "例：03-1234-5678" },
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
              {can(adminPermissions, 4, customerModal?.mode === "add" ? 2 : 3) && (
                <button onClick={saveCustomer} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">保存する</button>
              )}
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
              {can(adminPermissions, 4, 4) && (
                <button onClick={() => deleteCustomer(customerDeleteConfirmId)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">削除する</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
