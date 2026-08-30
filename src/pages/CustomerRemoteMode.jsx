import React, { useState, useEffect } from "react";
import { Smartphone, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";
import { loadFlowById, loadTemplateById, loadVideosByIds, loadFilesByIds } from "../lib/flowData";
import ProgressBar from "../components/ProgressBar";
import VideoStep from "../components/VideoStep";
import CustomerFormStep from "../components/CustomerFormStep";
import SignatureStep from "../components/SignatureStep";
import ContractPreviewStep from "../components/ContractPreviewStep";

const CustomerRemoteMode = ({ remoteSessionId, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flow, setFlow] = useState(null);
  const [videoPlaylist, setVideoPlaylist] = useState([]);
  const [staffTemplates, setStaffTemplates] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({ name: "", storeName: "", address: "", phone: "" });
  const [storeId, setStoreId] = useState(null);

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
  const [watchedVideoIds, setWatchedVideoIds] = useState([]);
  const [signHistoryId, setSignHistoryId] = useState(null);
  const [sessionKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    (async () => {
      try {
        const { data: urlRecord } = await supabase
          .from("onetime_url_manage")
          .select("*")
          .eq("id", remoteSessionId)
          .maybeSingle();
        if (!urlRecord) { setError("URLが無効です"); setLoading(false); return; }

        const sid = urlRecord.store_id || null;
        setStoreId(sid);

        // 会社・店舗情報
        if (sid) {
          const { data: storeRow } = await supabase
            .from("stores")
            .select("id, name, company_id")
            .eq("id", sid)
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
          setCompanyInfo({ name: companyName, storeName: storeRow?.name || "", address: "", phone: "" });
        }

        // フロー読み込み
        const foundFlow = await loadFlowById(urlRecord.flow_id);
        if (!foundFlow) { setError("フローが見つかりません"); setLoading(false); return; }
        setFlow(foundFlow);

        // 動画読み込み
        const allVideoIds = foundFlow.steps.flatMap((s) => s.videoIds || []);
        const videos = await loadVideosByIds(allVideoIds);
        setVideoPlaylist(videos);

        // テンプレート読み込み
        if (foundFlow.templateId) {
          const tpl = await loadTemplateById(foundFlow.templateId);
          if (tpl) {
            setStaffTemplates([tpl]);
            setStaffFields(JSON.parse(JSON.stringify(tpl.fields)));
          }
        }

        // 添付ファイル読み込み
        if (foundFlow.attachmentIds && foundFlow.attachmentIds.length > 0) {
          const files = await loadFilesByIds(foundFlow.attachmentIds);
          setDocumentsList(files);
        }

        setLoading(false);
      } catch (err) {
        console.error("CustomerRemoteMode 初期化エラー:", err);
        setError("データの読み込みに失敗しました");
        setLoading(false);
      }
    })();
  }, [remoteSessionId]);

  const remoteSteps = flow ? flow.steps.filter((s) => s.type !== "STAFF_INPUT") : [];
  const currentStep = remoteSteps[currentStepIndex];
  const templateName = staffTemplates.find((t) => t.id === flow?.templateId)?.name;

  useEffect(() => {
    if (!flow || loading) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
    if (!contractIdValue) return;
    supabase
      .from("sign_history")
      .insert({
        contract_id: contractIdValue,
        contract_name: flow.name || null,
        status: 1,
        status_updated_at: new Date().toISOString(),
        onetime_url_id: remoteSessionId || null,
        store_id: storeId || null,
      })
      .select("id")
      .maybeSingle()
      .then(({ data }) => { if (data?.id) setSignHistoryId(data.id); })
      .catch((err) => console.error("sign_history 作成エラー:", err));
  }, [flow, loading, remoteSessionId, storeId]);

  useEffect(() => {
    setWatchedVideoIds([]);
  }, [currentStepIndex]);

  
  const handleCustomerChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const nextStep = () => {
    if (currentStepIndex < remoteSteps.length - 1) {
      if (currentStep.type === "VIDEO") {
        setCustomerData((prev) => ({ ...prev, checkVideo: false }));
      }
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
  };

  const callEdgeFn = async (fnName, body) => {
    const headers = {
      "Content-Type": "application/json",
      "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers,
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
      await supabase.from("video_watch_sessions").upsert(
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

  const handleCustomerChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 「送信する」押下時に一括INSERT
  const handleFinish = async () => {
    try {
      const phone = customerData.phone?.trim() || null;

      let isPhoneDuplicate = false;
      if (phone) {
        try {
          const existing = await findCustomerByPhone(supabase, phone);
          isPhoneDuplicate = !!existing;
        } catch (e) {
          console.error("電話番号重複チェックエラー:", e);
        }
      }

      const { data: custData } = await supabase
        .from("customers")
        .insert({
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: phone,
          mail: customerData.email || null,
          address: customerData.address || null,
          store_id: storeId || null,
        })
        .select("id")
        .maybeSingle();
      const newCustomerId = custData?.id ?? null;

      if (signatureImage) {
        const blob = await (await fetch(signatureImage)).blob();
        const filePath = `signatures/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("signatures")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          const finalStatus = isPhoneDuplicate ? 2 : 3;
          const nowIso = new Date().toISOString();
          if (signHistoryId) {
            await supabase.from("sign_history").update({
              sign_customer_id: newCustomerId,
              sign_path: filePath,
              status: finalStatus,
              status_updated_at: nowIso,
            }).eq("id", signHistoryId);
          } else {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
            if (contractIdValue) {
              const { error: historyError } = await supabase.from("sign_history").insert({
                contract_id: contractIdValue,
                contract_name: flow.name || null,
                sign_customer_id: newCustomerId,
                sign_path: filePath,
                status: finalStatus,
                status_updated_at: nowIso,
                onetime_url_id: remoteSessionId || null,
                store_id: storeId || null,
              });
              if (historyError) console.error("sign_history 挿入エラー:", historyError);
            }
          }
        }
      }
    } catch (err) {
      console.error("送信処理エラー:", err);
    }
    onComplete();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-gray-700 font-bold text-lg mb-2">エラー</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!flow || !currentStep) return null;

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
            onWatchProgress={({ videoId, watchedSec, requiredSec }) => {
            recordWatchProgress(videoId, watchedSec, requiredSec, flow.id);
          }}
          onVideoComplete={setWatchedVideoIds}
          />
        );
      case "CUSTOMER_INFO":
        return (
          <CustomerFormStep
            data={customerData}
            onChange={handleCustomerChange}
            onNext={nextStep}
            onPrev={prevStep}
            isRemote={true}
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
      case "CONTRACT_PREVIEW":
        return (
          <ContractPreviewStep
            customerData={customerData}
            staffFields={staffFields}
            signatureImage={signatureImage}
            onPrev={prevStep}
            onFinish={handleFinish}
            companyInfo={companyInfo}
            templateName={templateName}
            documentsList={documentsList}
            attachmentIds={flow.attachmentIds}
            isRemote={true}
          />
        );
      default:
        return <div>Unknown Step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-blue-600 text-white px-6 py-4 shadow-md mb-6">
        <h1 className="text-xl font-bold flex items-center">
          <Smartphone className="mr-2" /> 事前受付・入力
        </h1>
        <p className="text-blue-100 text-xs mt-1">
          ご自宅で事前に入力を済ませることで、当日の手続きがスムーズになります。
        </p>
      </div>
      <ProgressBar steps={remoteSteps} currentStepIndex={currentStepIndex} />
      <div className="container mx-auto px-4 pb-20">{renderStepContent()}</div>
    </div>
  );
};

export default CustomerRemoteMode;
