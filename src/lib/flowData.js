import { supabase } from "./supabase";

const INPUT_TYPE_TO_STR = { 1: "text", 2: "number", 3: "date", 4: "select" };
const STEP_TYPE_STR = { 1: "VIDEO", 2: "CUSTOMER_INFO", 3: "SIGNATURE", 4: "STAFF_INPUT", 5: "CONTRACT_PREVIEW" };

export async function loadFlowById(flowId) {
  if (!flowId) return null;
  const { data: row } = await supabase
    .from("flow_header")
    .select("*")
    .eq("id", flowId)
    .maybeSingle();
  if (!row) return null;
  const { data: stepData } = await supabase
    .from("flow_step")
    .select("*")
    .eq("id", row.id)
    .order("flow_step_no", { ascending: true });
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
}

export async function loadTemplateById(templateId) {
  if (!templateId) return null;
  const { data: tpl } = await supabase
    .from("contract_templates_header")
    .select("id, name")
    .eq("id", templateId)
    .maybeSingle();
  if (!tpl) return null;
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
    isRequired: !!item.is_requaier,
  }));
  return { id: tpl.id, name: tpl.name, fields };
}

export async function loadVideosByIds(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];
  const { data: videosData } = await supabase
    .from("videos")
    .select("*")
    .eq("is_deleted", false)
    .in("id", videoIds)
    .order("create_at", { ascending: false });
  if (!videosData) return [];
  return Promise.all(
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
}

export async function loadFilesByIds(fileIds) {
  if (!fileIds || fileIds.length === 0) return [];
  const { data: filesData } = await supabase
    .from("files")
    .select("*")
    .eq("is_deleted", false)
    .in("id", fileIds)
    .order("create_at", { ascending: false });
  if (!filesData) return [];
  return filesData.map((f) => ({
    id: f.id,
    title: f.name,
    filename: f.path ? f.path.split("/").pop() : "",
    path: f.path,
    type: "PDF",
    pageCount: f.page_count || 1,
  }));
}
