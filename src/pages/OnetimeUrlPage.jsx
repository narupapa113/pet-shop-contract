import React, { useState, useEffect } from "react";
import { Smartphone, ShieldCheck, Loader } from "lucide-react";
import { supabase } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";
import { loadFlowById, loadVideosByIds } from "../lib/flowData";
import ProgressBar from "../components/ProgressBar";
import VideoStep from "../components/VideoStep";
import CustomerFormStep from "../components/CustomerFormStep";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const callEdge = async (fn, body) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "エラーが発生しました");
  return json;
};

const updateOnetimeStatus = async (id, status) => {
  await supabase
    .from("onetime_url_manage")
    .update({ status, update_at: new Date().toISOString() })
    .eq("id", id);
};

// ---- OTP認証画面 ----
const OtpAuthScreen = ({ onetimeId, sendTo, onVerified }) => {
  const [phase, setPhase] = useState("input_phone"); // input_phone | input_code
  const [phone, setPhone] = useState(sendTo ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  const handleSendOtp = async () => {
    if (!phone) return setError("電話番号を入力してください");
    setError("");
    setLoading(true);
    try {
      const res = await callEdge("send-otp", { onetimeId, phone });
      if (res.devCode) {
        setDevCode(res.devCode);
        setCode(res.devCode);
      }
      setPhase("input_code");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return setError("6桁のコードを入力してください");
    setError("");
    setLoading(true);
    try {
      await callEdge("verify-otp", { onetimeId, phone, code });
      onVerified(phone);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck size={28} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">本人確認</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            電話番号に6桁の確認コードを送信します
          </p>
        </div>

        {phase === "input_phone" && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="090-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              確認コードを送信
            </button>
          </>
        )}

        {phase === "input_code" && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{phone}</span> に送信した6桁のコードを入力してください
            </p>
            {devCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
                開発用コード: <span className="font-bold tracking-widest">{devCode}</span>
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 text-2xl tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              認証する
            </button>
            <button
              onClick={() => { setPhase("input_phone"); setCode(""); setError(""); }}
              className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              電話番号を変更する
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---- メインページ ----
const OnetimeUrlPage = ({ onetimeId }) => {
  const [phase, setPhase] = useState("loading"); // loading | auth | flow | done | error
  const [urlRecord, setUrlRecord] = useState(null);
  const [flow, setFlow] = useState(null);
  const [videoPlaylist, setVideoPlaylist] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [customerData, setCustomerData] = useState({
    name: "", nameKana: "", address: "", phone: "", email: "",
    checkVideo: false, checkTerms: false,
  });
  const [watchedVideosByStep, setWatchedVideosByStep] = useState({});
  const watchedVideoIds = watchedVideosByStep[currentStepIndex] || [];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("onetime_url_manage")
        .select("*")
        .eq("id", onetimeId)
        .maybeSingle();
      if (!data) { setPhase("error"); return; }
      setUrlRecord(data);
      const foundFlow = await loadFlowById(data.flow_id);
      if (!foundFlow) { setPhase("error"); return; }
      setFlow(foundFlow);
      // フロー内の全動画IDを収集して個別に取得
      const allVideoIds = foundFlow.steps.flatMap((s) => s.videoIds || []);
      const videos = await loadVideosByIds(allVideoIds);
      setVideoPlaylist(videos);
      if (data.status >= 2) {
        setPhase("flow");
      } else {
        setPhase("auth");
      }
    })();
  }, [onetimeId]);

  const handleVerified = async (phone) => {
    setCustomerData((prev) => ({ ...prev, phone }));
    setPhase("flow");
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-gray-700 font-bold text-lg mb-2">URLが無効です</p>
          <p className="text-gray-500 text-sm">このURLは存在しないか、有効期限が切れています。</p>
        </div>
      </div>
    );
  }

  if (phase === "auth") {
    return (
      <OtpAuthScreen
        onetimeId={onetimeId}
        sendTo={urlRecord?.send_to ?? ""}
        onVerified={handleVerified}
      />
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-green-600" />
          </div>
          <p className="text-gray-800 font-bold text-lg mb-2">送信が完了しました</p>
          <p className="text-gray-500 text-sm mb-6">店舗スタッフにお知らせください。</p>
          <button
            onClick={() => window.close()}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors"
          >
            画面を閉じる
          </button>
        </div>
      </div>
    );
  }

  if (!flow) return null;

  // 顧客側は SIGNATURE / STAFF_INPUT / CONTRACT_PREVIEW を除外
  const remoteSteps = flow.steps.filter(
    (s) => !["SIGNATURE", "STAFF_INPUT", "CONTRACT_PREVIEW"].includes(s.type),
  );
  const currentStep = remoteSteps[currentStepIndex];

  const nextStep = async () => {
    const isLastStep = currentStepIndex >= remoteSteps.length - 1;

    if (currentStep.type === "VIDEO") {
      setCustomerData((prev) => ({ ...prev, checkVideo: false }));
      await updateOnetimeStatus(onetimeId, 3);
    }

    if (currentStep.type === "CUSTOMER_INFO") {
      // customers INSERT + customer_id 紐付け + status 4（お客様情報送信済）
      const { data } = await supabase
        .from("customers")
        .insert({
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: customerData.phone || null,
          mail: customerData.email || null,
          address: customerData.address || null,
          store_id: urlRecord?.store_id || null,
        })
        .select("id")
        .maybeSingle();
      if (data?.id) {
        await supabase
          .from("onetime_url_manage")
          .update({ customer_id: data.id, update_at: new Date().toISOString() })
          .eq("id", onetimeId);

        // 電話番号重複チェック → status 決定
        let finalStatus = 4;
        const phone = customerData.phone?.trim() || null;
        if (phone) {
          try {
            const existing = await findCustomerByPhone(supabase, phone);
            if (existing) finalStatus = 2;
          } catch (e) {
            console.error("電話番号重複チェックエラー:", e);
          }
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
        if (contractIdValue) {
          try {
            await supabase.from("sign_history").insert({
              contract_id: contractIdValue,
              contract_name: flow.name || null,
              sign_customer_id: data.id,
              status: finalStatus,
              status_updated_at: new Date().toISOString(),
              onetime_url_id: onetimeId,
              store_id: urlRecord?.store_id || null,
            });
          } catch (err) {
            console.error("sign_history 作成エラー:", err);
          }
        }
      }
      await updateOnetimeStatus(onetimeId, 4);
      setPhase("done");
      return;
    }

    if (isLastStep) return;
    setCurrentStepIndex(currentStepIndex + 1);
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((prev) => prev - 1);
  };

  const handleCustomerChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
            onVideoComplete={(updater) => {
              setWatchedVideosByStep((prev) => {
                const current = prev[currentStepIndex] || [];
                const next = typeof updater === "function" ? updater(current) : updater;
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
            submitLabel="送信する"
            isRemote={true}
          />
        );
      default:
        return null;
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

export default OnetimeUrlPage;
