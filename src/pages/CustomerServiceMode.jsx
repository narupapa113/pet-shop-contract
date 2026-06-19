import React, { useState } from "react";
import { List } from "lucide-react";
import { supabase, supabaseAdmin } from "../lib/supabase";
import ProgressBar from "../components/ProgressBar";
import VideoStep from "../components/VideoStep";
import CustomerFormStep from "../components/CustomerFormStep";
import SignatureStep from "../components/SignatureStep";
import StaffInputStep from "../components/StaffInputStep";
import ContractPreviewStep from "../components/ContractPreviewStep";

const CustomerServiceMode = ({
  onLogout,
  staffTemplates,
  videoPlaylist,
  documentsList,
  flows,
  companyInfo,
}) => {
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [customerData, setCustomerData] = useState({
    name: "",
    nameKana: "",
    address: "",
    phone: "",
    email: "",
    checkVideo: false,
    checkTerms: false,
  });
  const [signatureImage, setSignatureImage] = useState(null);
  const [staffFields, setStaffFields] = useState([]);
  const [staffRemarks, setStaffRemarks] = useState(["", "", ""]);
  const [watchedVideosByStep, setWatchedVideosByStep] = useState({});
  const watchedVideoIds = watchedVideosByStep[currentStepIndex] || [];
  const [sessionKey] = useState(() => crypto.randomUUID());
  const [completionToken, setCompletionToken] = useState(null);

  const callEdgeFn = async (fnName, body) => {
    const res = await fetch(`/.netlify/functions/${fnName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const recordWatchProgress = async (videoId, watchedSec, requiredSec, flowId) => {
    try {
      await callEdgeFn("record-watch-progress", {
        sessionKey, flowId: flowId ?? "", videoId, watchedSec, requiredSec,
      });
    } catch {
      await supabaseAdmin.from("video_watch_sessions").upsert(
        {
          session_key: sessionKey,
          flow_id: flowId ?? "",
          video_id: videoId,
          watched_sec: watchedSec,
          required_sec: requiredSec,
          completed: requiredSec > 0 && watchedSec >= requiredSec,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_key,video_id" },
      );
    }
  };

  const requestCompletionToken = async (flowId, requiredVideoIds) => {
    try {
      const data = await callEdgeFn("issue-completion-token", {
        sessionKey, flowId: flowId ?? "", requiredVideoIds,
      });
      setCompletionToken(data.token);
      return data.token;
    } catch {
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await supabaseAdmin.from("completion_tokens").insert({
        token, session_key: sessionKey, flow_id: flowId ?? "", expires_at: expiresAt,
      }).catch(() => {});
      setCompletionToken(token);
      return token;
    }
  };

  const handleFlowSelect = (flow) => {
    setSelectedFlow(flow);
    const template = staffTemplates.find((t) => t.id === flow.templateId);
    setStaffFields(template ? JSON.parse(JSON.stringify(template.fields)) : []);
  };

  if (!selectedFlow) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">接客メニュー選択</h1>
            <button
              onClick={onLogout}
              className="text-sm border border-gray-400 px-4 py-2 rounded-lg hover:bg-gray-200 text-gray-600"
            >
              ログアウト
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flows.map((flow) => (
              <button
                key={flow.id}
                onClick={() => handleFlowSelect(flow)}
                className="bg-white p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all text-left group"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <List size={28} className="text-blue-600 group-hover:text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{flow.name}</h2>
                <p className="text-gray-500 text-sm mb-4">{flow.description}</p>
                <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                  {flow.steps.map((step, i) => (
                    <span key={i} className="bg-gray-100 px-2 py-1 rounded">{step.title}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStep = selectedFlow.steps[currentStepIndex];

  const nextStep = () => {
    if (currentStepIndex < selectedFlow.steps.length - 1) {
      if (currentStep.type === "VIDEO") {
        setCustomerData((prev) => ({ ...prev, checkVideo: false }));
      }
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStepDef = selectedFlow.steps[prevIndex];
      if (prevStepDef?.type === "VIDEO") {
        const prevVideoIds = watchedVideosByStep[prevIndex] || [];
        const prevTargetIds = prevStepDef.videoIds || [];
        const prevPlaylist =
          prevTargetIds.length > 0
            ? videoPlaylist.filter((v) => prevTargetIds.includes(v.id))
            : videoPlaylist;
        const allDone =
          prevPlaylist.length > 0 &&
          prevPlaylist.every((v) => prevVideoIds.includes(v.id));
        if (allDone) {
          setCustomerData((prev) => ({ ...prev, checkVideo: true }));
        }
      }
      setCurrentStepIndex(prevIndex);
    } else {
      if (window.confirm("メニュー選択に戻りますか？入力内容は破棄されます。")) {
        setSelectedFlow(null);
        setCustomerData({
          name: "",
          nameKana: "",
          address: "",
          phone: "",
          email: "",
          checkVideo: false,
          checkTerms: false,
        });
        setSignatureImage(null);
      }
    }
  };

  const handleCustomerChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setCustomerData((prev) => ({ ...prev, [name]: newValue }));
    if (name === "checkVideo" && newValue === true && currentStep?.type === "VIDEO") {
      const targetIds = currentStep.videoIds || [];
      const playlist =
        targetIds.length > 0
          ? videoPlaylist.filter((v) => targetIds.includes(v.id))
          : videoPlaylist;
      requestCompletionToken(selectedFlow.id, playlist.map((v) => v.id));
    }
  };

  const handleStaffFieldChange = (id, value) => {
    setStaffFields((prev) => prev.map((field) => (field.id === id ? { ...field, value } : field)));
  };

  const addStaffField = () => {
    const newId = `custom_${Date.now()}`;
    setStaffFields([...staffFields, { id: newId, label: "新しい項目", value: "", type: "text", isCustom: true }]);
  };

  const removeStaffField = (id) => setStaffFields((prev) => prev.filter((f) => f.id !== id));

  const updateFieldLabel = (id, newLabel) => {
    setStaffFields((prev) => prev.map((field) => (field.id === id ? { ...field, label: newLabel } : field)));
  };

  const handlePrint = () => window.print();

  // 「接客終了」時に一括INSERT
  const handleFinish = async () => {
    try {
      // 1. customers INSERT
      const { data: custData } = await supabase
        .from("customers")
        .insert({
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: customerData.phone || null,
          mail: customerData.email || null,
          address: customerData.address || null,
          last_enter_store_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      const newCustomerId = custData?.id ?? null;

      // 2. 署名画像を Storage にアップロード → sign_history INSERT
      let newSignHistoryId = null;
      if (signatureImage) {
        const allWatchedVideoIds = [...new Set(Object.values(watchedVideosByStep).flat())];
        let saved = false;
        if (completionToken) {
          try {
            await callEdgeFn("save-signature", {
              completionToken,
              signatureDataUrl: signatureImage,
              contractId: selectedFlow.id,
              contractName: selectedFlow.name || null,
              customerId: newCustomerId,
              videoIds: allWatchedVideoIds,
            });
            saved = true;
          } catch { /* fall through */ }
        }
        if (!saved) {
          const blob = await (await fetch(signatureImage)).blob();
          const filePath = `signatures/${Date.now()}.png`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("signatures")
            .upload(filePath, blob, { contentType: "image/png" });
          if (!uploadError) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const contractIdValue = uuidRegex.test(selectedFlow.id) ? selectedFlow.id : null;
            if (contractIdValue) {
              const { data: signHistoryData } = await supabaseAdmin
                .from("sign_history")
                .insert({
                  contract_id: contractIdValue,
                  contract_name: selectedFlow.name || null,
                  sign_customer_id: newCustomerId,
                  sign_path: filePath,
                  video_id: allWatchedVideoIds,
                })
                .select("id")
                .maybeSingle();
              newSignHistoryId = signHistoryData?.id ?? null;
            }
          }
        }
      }

      // 3. sign_input INSERT（スタッフ入力）
      if (newSignHistoryId && staffFields.length > 0) {
        const now = new Date().toISOString();
        const rows = staffFields.map((field, index) => ({
          id: newSignHistoryId,
          sign_item_no: index + 1,
          sign_item_value: field.value ?? "",
          create_at: now,
          update_at: now,
        }));
        await supabaseAdmin.from("sign_input").insert(rows);
      }

      // 4. customers.remarks に備考を保存
      if (newCustomerId) {
        await supabase.from("customers").update({
          remarks: staffRemarks[0] || null,
          remarks2: staffRemarks[1] || null,
          remarks3: staffRemarks[2] || null,
        }).eq("id", newCustomerId);
      }
    } catch (err) {
      console.error("接客終了処理エラー:", err);
    }
    setSelectedFlow(null);
  };

  const templateName = staffTemplates.find((t) => t.id === selectedFlow.templateId)?.name;

  const renderStepContent = () => {
    switch (currentStep.type) {
      case "VIDEO":
        return (
          <VideoStep
            key={currentStep.id}
            checkVideo={customerData.checkVideo}
            onCheckChange={handleCustomerChange}
            onNext={nextStep}
            videoPlaylist={videoPlaylist}
            stepConfig={currentStep}
            completedVideoIds={watchedVideoIds}
            onVideoComplete={(updater) => {
              setWatchedVideosByStep((prev) => {
                const current = prev[currentStepIndex] || [];
                const next = typeof updater === "function" ? updater(current) : updater;
                if (typeof updater === "function") {
                  const added = next.filter((id) => !current.includes(id));
                  added.forEach((videoId) => {
                    const vid = videoPlaylist.find((v) => v.id === videoId);
                    const requiredSec = vid?.duration
                      ? vid.duration.split(":").reduce((a, b) => a * 60 + Number(b), 0)
                      : 0;
                    recordWatchProgress(videoId, requiredSec, requiredSec, selectedFlow.id);
                  });
                }
                return { ...prev, [currentStepIndex]: next };
              });
            }}
          />
        );
      case "CUSTOMER_INFO":
        return (
          <CustomerFormStep
            data={customerData}
            onChange={handleCustomerChange}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "SIGNATURE":
        return (
          <SignatureStep
            signatureImage={signatureImage}
            onSaveSignature={setSignatureImage}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case "STAFF_INPUT": {
        const tplName = staffTemplates.find((t) => t.id === selectedFlow.templateId)?.name || null;
        return (
          <StaffInputStep
            fields={staffFields}
            templateName={tplName}
            onFieldChange={handleStaffFieldChange}
            onAdd={addStaffField}
            onRemove={removeStaffField}
            onUpdateLabel={updateFieldLabel}
            onNext={nextStep}
            onPrev={prevStep}
            remarksArr={staffRemarks}
            onRemarksChange={(index, value) => setStaffRemarks((prev) => prev.map((r, i) => i === index ? value : r))}
          />
        );
      }
      case "CONTRACT_PREVIEW":
        return (
          <ContractPreviewStep
            customerData={customerData}
            staffFields={staffFields}
            signatureImage={signatureImage}
            onPrev={prevStep}
            onPrint={handlePrint}
            onFinish={handleFinish}
            companyInfo={companyInfo}
            templateName={templateName}
            documentsList={documentsList}
            attachmentIds={selectedFlow.attachmentIds}
          />
        );
      default:
        return <div>Unknown Step Type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10 print:bg-white print:pb-0 relative">
      <style>{`@media print { @page { margin: 15mm; size: A4; } body { -webkit-print-color-adjust: exact; } .print\\:break-before-page { break-before: page; } }`}</style>
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center print:hidden">
        <span className="text-sm font-medium opacity-70">接客中: {selectedFlow.name}</span>
        <button onClick={onLogout} className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700">
          接客を終了してログアウト
        </button>
      </div>
      <ProgressBar steps={selectedFlow.steps} currentStepIndex={currentStepIndex} />
      <div className="container mx-auto px-4 print:p-0 print:w-full print:max-w-none">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default CustomerServiceMode;
