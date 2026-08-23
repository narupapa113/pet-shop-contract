import React, { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";
import { supabase } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";
import ProgressBar from "../components/ProgressBar";
import VideoStep from "../components/VideoStep";
import CustomerFormStep from "../components/CustomerFormStep";
import SignatureStep from "../components/SignatureStep";
import ContractPreviewStep from "../components/ContractPreviewStep";

const CustomerRemoteMode = ({
  remoteSession,
  onComplete,
  videoPlaylist,
  staffTemplates,
  documentsList,
  flows,
  companyInfo,
}) => {
  const flow = flows.find((f) => f.id === remoteSession.flowId) || flows[0];
  const remoteSteps = flow.steps.filter((s) => s.type !== "STAFF_INPUT");

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
  const [staffFields] = useState(
    JSON.parse(
      JSON.stringify(
        staffTemplates.find((t) => t.id === flow.templateId)?.fields || [],
      ),
    ),
  );
  const [watchedVideoIds, setWatchedVideoIds] = useState([]);
  const [signHistoryId, setSignHistoryId] = useState(null);

  useEffect(() => {
    if (!remoteSession) return;
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
        onetime_url_id: remoteSession.id || null,
      })
      .select("id")
      .maybeSingle()
      .then(({ data }) => { if (data?.id) setSignHistoryId(data.id); })
      .catch((err) => console.error("sign_history 作成エラー:", err));
  }, []);

  useEffect(() => {
    setWatchedVideoIds([]);
  }, [currentStepIndex]);

  const currentStep = remoteSteps[currentStepIndex];
  const templateName = staffTemplates.find((t) => t.id === flow.templateId)?.name;

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

      // 1. 電話番号重複チェック → 既存顧客があれば要確認ステータス
      let isPhoneDuplicate = false;
      if (phone) {
        try {
          const existing = await findCustomerByPhone(supabase, phone);
          isPhoneDuplicate = !!existing;
        } catch (e) {
          console.error("電話番号重複チェックエラー:", e);
        }
      }

      // 2. customers INSERT
      const { data: custData } = await supabase
        .from("customers")
        .insert({
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: phone,
          mail: customerData.email || null,
          address: customerData.address || null,
        })
        .select("id")
        .maybeSingle();
      const newCustomerId = custData?.id ?? null;

      // 3. 署名画像を Storage にアップロード → sign_history を完了状態に UPDATE
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
                onetime_url_id: remoteSession.id || null,
              });
              if (historyError) console.error("sign_history 挿入エラー:", historyError);
            }
          }
        }
      }
    } catch (err) {
      console.error("送信処理エラー:", err);
    }
    onComplete(remoteSession.id, { ...customerData, signatureImage });
  };

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
