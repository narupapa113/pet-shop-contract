import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { findCustomerByPhone } from "../lib/customer";
import { Inbox, ChevronRight, ArrowLeft, Pause } from "lucide-react";
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
  const [sessionKey, setSessionKey] = useState(() => crypto.randomUUID());
  const [completionToken, setCompletionToken] = useState(null);
  const [customerResolution, setCustomerResolution] = useState(null);
  const [signHistoryId, setSignHistoryId] = useState(null);
  const [resumeItem, setResumeItem] = useState(null);
  const [sessionCreatedByThisSession, setSessionCreatedByThisSession] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [incompleteCount, setIncompleteCount] = useState(0);

  const fetchIncompleteCount = useCallback(async () => {
    const { count } = await supabaseAdmin
      .from("sign_history")
      .select("*", { count: "exact", head: true })
      .in("status", [1, 2, 4]);
    setIncompleteCount(count || 0);
  }, []);

  useEffect(() => { fetchIncompleteCount(); }, [fetchIncompleteCount]);

  // セッション状態をDBに保存（中断時）
  const saveSessionState = useCallback(async () => {
    if (!signHistoryId || !selectedFlow) return;
    const stateData = {
      sign_history_id: signHistoryId,
      contract_id: selectedFlow.id,
      current_step_index: currentStepIndex,
      customer_data: customerData,
      signature_image: null,
      staff_fields: staffFields,
      staff_remarks: staffRemarks,
      watched_videos_by_step: watchedVideosByStep,
      session_key: sessionKey,
      completion_token: completionToken,
      updated_at: new Date().toISOString(),
    };
    try {
      const { data: existing } = await supabaseAdmin
        .from("flow_session_state")
        .select("id")
        .eq("sign_history_id", signHistoryId)
        .maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from("flow_session_state").update(stateData).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("flow_session_state").insert({ ...stateData, created_at: new Date().toISOString() });
      }
    } catch (err) {
      console.error("セッション状態の保存に失敗:", err);
    }
  }, [signHistoryId, selectedFlow, currentStepIndex, customerData, signatureImage, staffFields, staffRemarks, watchedVideosByStep, sessionKey, completionToken]);

  // resumeItem が渡されたら sign_history のデータを復元してフローを再開
  const handleResume = useCallback(async (item) => {
    setResumeItem(item);
    const flow = flows.find((f) => f.id === item.contract_id);
    if (!flow) {
      alert("対応する接客フローが見つかりません");
      setResumeItem(null);
      return;
    }
    const template = staffTemplates.find((t) => t.id === flow.templateId);

    setSignHistoryId(item.id);
    setSessionCreatedByThisSession(false);
    setSelectedFlow(flow);
    setStaffFields(template ? JSON.parse(JSON.stringify(template.fields)) : []);
    setSignatureImage(null);
    setStaffRemarks(["", "", ""]);
    setWatchedVideosByStep({});
    setCompletionToken(null);
    setCustomerResolution(null);
    setCurrentStepIndex(0);
    setCustomerId(item.sign_customer_id || null);

    // 保存されたセッション状態を復元（status=1 進行中の場合）
    if (item.status === 1) {
      try {
        const { data: savedState } = await supabaseAdmin
          .from("flow_session_state")
          .select("*")
          .eq("sign_history_id", item.id)
          .maybeSingle();
        if (savedState) {
          // sessionKey を復元して video_watch_sessions と紐付け直す
          if (savedState.session_key) setSessionKey(savedState.session_key);
          if (savedState.completion_token) setCompletionToken(savedState.completion_token);
          if (typeof savedState.current_step_index === "number") setCurrentStepIndex(savedState.current_step_index);
          if (savedState.customer_data) setCustomerData(savedState.customer_data);
          if (savedState.staff_fields) setStaffFields(savedState.staff_fields);
          if (savedState.staff_remarks) setStaffRemarks(savedState.staff_remarks);
          if (savedState.watched_videos_by_step) setWatchedVideosByStep(savedState.watched_videos_by_step);
          return; // 保存状態があれば顧客情報のDB再取得は不要
        }
      } catch (err) {
        console.error("セッション状態の復元に失敗:", err);
      }
    }

    // ステップ位置を決定（保存状態がなかった場合）
    if (item.status === 4) {
      const signIdx = flow.steps.findIndex((s) => s.type === "SIGNATURE");
      const staffIdx = flow.steps.findIndex((s) => s.type === "STAFF_INPUT");
      if (signIdx >= 0) setCurrentStepIndex(signIdx);
      else if (staffIdx >= 0) setCurrentStepIndex(staffIdx);
      else setCurrentStepIndex(0);
    }

    // 顧客情報を復元（非同期・バックグラウンド）
    if (item.sign_customer_id) {
      const { data: cust } = await supabaseAdmin
        .from("customers")
        .select("name, name_kana, tell, mail, address")
        .eq("id", item.sign_customer_id)
        .maybeSingle();
      if (cust) {
        setCustomerData({
          name: cust.name || "",
          nameKana: cust.name_kana || "",
          address: cust.address || "",
          phone: cust.tell || "",
          email: cust.mail || "",
          checkVideo: true,
          checkTerms: true,
        });
      }
    }
  }, [flows, staffTemplates]);

  // 他画面から resume データを受け取る（location state 経由）
  useEffect(() => {
    const navState = location.state?.resumeItem;
    if (navState) {
      handleResume(navState);
      // 使い捨て: state をクリア
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, handleResume, navigate, location.pathname]);

  const callEdgeFn = async (fnName, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      "Content-Type": "application/json",
      "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
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
      const { error: insertError } = await supabaseAdmin.from("completion_tokens").insert({
        token, session_key: sessionKey, flow_id: flowId ?? "", expires_at: expiresAt,
      });
      if (insertError) console.error("completion_tokens insert エラー:", insertError);
      setCompletionToken(token);
      return token;
    }
  };

  const handleFlowSelect = async (flow) => {
    setInitializing(true);
    setCurrentStepIndex(0);
    setCustomerData({ name: "", nameKana: "", address: "", phone: "", email: "", checkVideo: false, checkTerms: false });
    setSignatureImage(null);
    setStaffRemarks(["", "", ""]);
    setWatchedVideosByStep({});
    setCompletionToken(null);
    setCustomerResolution(null);
    setSignHistoryId(null);
    setResumeItem(null);
    setSessionCreatedByThisSession(false);
    setCustomerId(null);
    const template = staffTemplates.find((t) => t.id === flow.templateId);
    setStaffFields(template ? JSON.parse(JSON.stringify(template.fields)) : []);
    setSelectedFlow(flow);

    // フロー開始時: 常に新しい sign_history レコードを作成する
    // （未完了一覧からの再開は handleResume で既存レコードを再利用）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const contractIdValue = uuidRegex.test(flow.id) ? flow.id : null;
    if (contractIdValue) {
      try {
        const { data: sh } = await supabaseAdmin
          .from("sign_history")
          .insert({
            contract_id: contractIdValue,
            contract_name: flow.name || null,
            status: 1,
            status_updated_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();
        if (sh?.id) {
          setSignHistoryId(sh.id);
          setSessionCreatedByThisSession(true);
          fetchIncompleteCount();
        }
      } catch (err) {
        console.error("sign_history 作成エラー:", err);
      }
    }
    setInitializing(false);
  };

  if (!selectedFlow) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">接客メニュー選択</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/service/incomplete")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${incompleteCount > 0 ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" : "border-gray-300 text-gray-400 hover:bg-gray-100"}`}
              >
                <Inbox size={18} />
                未完了一覧
                {incompleteCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                    {incompleteCount}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="text-sm border border-gray-400 px-4 py-2 rounded-lg hover:bg-gray-200 text-gray-600"
              >
                ログアウト
              </button>
            </div>
          </div>
          {incompleteCount > 0 && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-orange-700">
              <Inbox size={16} />
              未完了の案件が {incompleteCount} 件あります。一覧から対応を開始できます。
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flows.map((flow) => (
              <button
                key={flow.id}
                onClick={() => handleFlowSelect(flow)}
                className="bg-white p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{flow.name}</h2>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">{flow.description}</p>
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

  const prevStep = async () => {
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
        if (sessionCreatedByThisSession && signHistoryId) {
          try {
            await supabaseAdmin.from("flow_session_state").delete().eq("sign_history_id", signHistoryId);
            await supabaseAdmin.from("sign_history").delete().eq("id", signHistoryId);
            fetchIncompleteCount();
          } catch (err) {
            console.error("sign_history 削除エラー:", err);
          }
        }
        setSelectedFlow(null);
        setSignHistoryId(null);
        setResumeItem(null);
        setSessionCreatedByThisSession(false);
        setCustomerId(null);
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

  const handleCustomerNext = async (resolution) => {
    if (resolution && resolution.mode) {
      setCustomerResolution(resolution);
    }

    // お客様情報をDBに保存し、sign_historyに紐付ける（未完了一覧に顧客名を表示するため）
    if (signHistoryId && customerData.name?.trim()) {
      try {
        const phone = customerData.phone?.trim() || null;
        const now = new Date().toISOString();
        const customerBase = {
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: phone,
          mail: customerData.email || null,
          address: customerData.address || null,
          last_enter_store_at: now,
        };

        let savedCustomerId = customerId;

        if (resolution?.mode === "overwrite" && resolution.existingCustomerId) {
          const updateFields = {};
          if (customerData.name?.trim()) updateFields.name = customerData.name;
          if (customerData.nameKana?.trim()) updateFields.name_kana = customerData.nameKana;
          if (phone) updateFields.tell = phone;
          if (customerData.email?.trim()) updateFields.mail = customerData.email;
          if (customerData.address?.trim()) updateFields.address = customerData.address;
          updateFields.last_enter_store_at = now;
          updateFields.update_at = now;
          const { error: updErr } = await supabase.from("customers").update(updateFields).eq("id", resolution.existingCustomerId);
          if (updErr) console.error("customers UPDATE エラー:", updErr);
          savedCustomerId = resolution.existingCustomerId;
        } else if (savedCustomerId) {
          const { error: updErr } = await supabase.from("customers").update({ ...customerBase, update_at: now }).eq("id", savedCustomerId);
          if (updErr) console.error("customers UPDATE エラー:", updErr);
        } else {
          if (phone && resolution?.mode !== "new") {
            const existing = await findCustomerByPhone(supabase, phone);
            if (existing?.id) {
              const { error: updErr } = await supabase.from("customers").update({ ...customerBase, update_at: now }).eq("id", existing.id);
              if (updErr) console.error("customers UPDATE エラー:", updErr);
              savedCustomerId = existing.id;
            }
          }
          if (!savedCustomerId) {
            const { data: custData, error: insErr } = await supabase
              .from("customers")
              .insert({ ...customerBase, create_at: now })
              .select("id")
              .maybeSingle();
            if (insErr) console.error("customers INSERT エラー:", insErr);
            savedCustomerId = custData?.id ?? null;
          }
        }

        if (savedCustomerId) {
          setCustomerId(savedCustomerId);
          const { error: shErr } = await supabase.from("sign_history").update({
            sign_customer_id: savedCustomerId,
          }).eq("id", signHistoryId);
          if (shErr) console.error("sign_history UPDATE エラー:", shErr);
        } else {
          console.error("お客様情報の保存に失敗: savedCustomerId が null です");
        }
      } catch (err) {
        console.error("お客様情報の保存に失敗:", err);
      }
    } else {
      console.warn("handleCustomerNext: ガード条件不合格", { signHistoryId, hasName: !!customerData.name?.trim() });
    }

    nextStep();
  };

  // 「接客終了」時に一括INSERT（電話番号一致で既存顧客UPDATE）
  const handleFinish = async () => {
    try {
      // 1. 顧客情報は入力ステップで保存済み。customerId がなければフォールバックで作成
      let newCustomerId = customerId;
      if (!newCustomerId) {
        newCustomerId = customerResolution?.mode === "overwrite" ? customerResolution.existingCustomerId : null;
        const skipPhoneSearch = customerResolution?.mode === "new";
        const phone = customerData.phone?.trim() || null;
        const now = new Date().toISOString();
        const customerBase = {
          name: customerData.name,
          name_kana: customerData.nameKana || null,
          tell: phone,
          mail: customerData.email || null,
          address: customerData.address || null,
          last_enter_store_at: now,
        };

        if (newCustomerId) {
          const updateFields = {};
          if (customerData.name?.trim()) updateFields.name = customerData.name;
          if (customerData.nameKana?.trim()) updateFields.name_kana = customerData.nameKana;
          if (phone) updateFields.tell = phone;
          if (customerData.email?.trim()) updateFields.mail = customerData.email;
          if (customerData.address?.trim()) updateFields.address = customerData.address;
          updateFields.last_enter_store_at = now;
          updateFields.update_at = now;
          await supabase.from("customers").update(updateFields).eq("id", newCustomerId);
        } else if (phone && !skipPhoneSearch) {
          const existing = await findCustomerByPhone(supabase, phone);
          if (existing?.id) {
            await supabase
              .from("customers")
              .update({ ...customerBase, update_at: now })
              .eq("id", existing.id);
            newCustomerId = existing.id;
          }
        }

        if (!newCustomerId) {
          const { data: custData } = await supabase
            .from("customers")
            .insert({ ...customerBase, create_at: now })
            .select("id")
            .maybeSingle();
          newCustomerId = custData?.id ?? null;
        }
      }

      // 2. 署名画像を Storage にアップロード → sign_history を完了状態に UPDATE
      let newSignHistoryId = signHistoryId;
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
              signHistoryId: newSignHistoryId,
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
            if (newSignHistoryId) {
              await supabaseAdmin.from("sign_history").update({
                sign_customer_id: newCustomerId,
                sign_path: filePath,
                video_id: allWatchedVideoIds,
                status: 3,
                status_updated_at: new Date().toISOString(),
              }).eq("id", newSignHistoryId);
            } else {
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
                    status: 3,
                    status_updated_at: new Date().toISOString(),
                  })
                  .select("id")
                  .maybeSingle();
                newSignHistoryId = signHistoryData?.id ?? null;
              }
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
    // 完了時はセッション状態をクリーンアップ
    if (signHistoryId) {
      const { error: cleanErr } = await supabaseAdmin.from("flow_session_state").delete().eq("sign_history_id", signHistoryId);
      if (cleanErr) console.error("flow_session_state クリーンアップエラー:", cleanErr);
    }
    setSelectedFlow(null);
    fetchIncompleteCount();
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
            onWatchProgress={({ videoId, watchedSec, requiredSec }) => {
              recordWatchProgress(videoId, watchedSec, requiredSec, selectedFlow.id);
            }}
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
            onNext={handleCustomerNext}
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
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (initializing) return;
              if (window.confirm("接客を中断しますか？\nここまでの入力内容はすべて保存され、後で未完了一覧から再開できます。（署名は保存されず、再開時に白紙から書き直していただきます）")) {
                await saveSessionState();
                setSelectedFlow(null);
                fetchIncompleteCount();
              }
            }}
            disabled={initializing}
            className="text-xs border border-amber-500 text-amber-400 px-3 py-1.5 rounded hover:bg-amber-900/40 flex items-center gap-1 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pause size={14} /> 中断する
          </button>
          <button
            onClick={async () => {
              if (initializing) return;
              if (!window.confirm("トップに戻りますか？入力中の内容は破棄されます。")) return;
              try {
                if (sessionCreatedByThisSession && signHistoryId) {
                  const { error: e1 } = await supabaseAdmin.from("flow_session_state").delete().eq("sign_history_id", signHistoryId);
                  if (e1) console.error("flow_session_state 削除エラー:", e1);
                  const { error: e2 } = await supabaseAdmin.from("sign_history").delete().eq("id", signHistoryId);
                  if (e2) console.error("sign_history 削除エラー:", e2);
                }
              } catch (err) {
                console.error("トップ戻る処理エラー:", err);
              } finally {
                setSelectedFlow(null);
                setSignHistoryId(null);
                setResumeItem(null);
                setSessionCreatedByThisSession(false);
                setCustomerId(null);
                fetchIncompleteCount();
              }
            }}
            className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={initializing}
          >
            <ArrowLeft size={12} /> トップに戻る
          </button>
          <button
            onClick={async () => {
              if (initializing) return;
              if (signHistoryId && selectedFlow) {
                await saveSessionState();
              }
              onLogout();
            }}
            disabled={initializing}
            className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            接客を終了してログアウト
          </button>
        </div>
      </div>
      <ProgressBar steps={selectedFlow.steps} currentStepIndex={currentStepIndex} />
      <div className="container mx-auto px-4 print:p-0 print:w-full print:max-w-none relative">
        {initializing && (
          <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center rounded">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
              <p className="text-gray-600 text-sm">準備中...</p>
            </div>
          </div>
        )}
        {renderStepContent()}
      </div>
    </div>
  );
};

export default CustomerServiceMode;
