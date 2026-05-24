import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  Play,
  Pause,
  CheckCircle,
  FileText,
  PenTool,
  Printer,
  Plus,
  Trash2,
  Settings,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Upload,
  LogOut,
  Lock,
  Users,
  BarChart3,
  Calendar,
  RotateCcw,
  SkipForward,
  List,
  Save,
  AlertCircle,
  Edit2,
  Film,
  X,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  History,
  Search,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Bell,
  Database,
  Download,
  UserPlus,
  Key,
  Link,
  Smartphone,
  Send,
  ExternalLink,
  QrCode,
} from "lucide-react";

// --- 定数・初期値 ---

const STEP_TYPES = {
  VIDEO: { label: "動画説明", icon: Play },
  CUSTOMER_INFO: { label: "お客様情報", icon: User },
  SIGNATURE: { label: "署名", icon: PenTool },
  STAFF_INPUT: { label: "店舗入力", icon: Settings },
  CONTRACT_PREVIEW: { label: "契約書発行", icon: FileText },
};

const DEFAULT_TEMPLATES = [
  {
    id: "tpl_standard",
    name: "標準売買契約書",
    fields: [
      {
        id: "pet_type",
        label: "ペットの種類",
        value: "",
        type: "text",
        placeholder: "例：トイプードル",
      },
      {
        id: "pet_color",
        label: "毛色",
        value: "",
        type: "text",
        placeholder: "例:レッド",
      },
      {
        id: "pet_gender",
        label: "性別",
        value: "",
        type: "select",
        options: ["オス", "メス", "不明"],
      },
      { id: "pet_birthday", label: "生年月日", value: "", type: "date" },
      { id: "pet_price", label: "生体価格 (円)", value: "", type: "number" },
      { id: "microchip", label: "マイクロチップ番号", value: "", type: "text" },
    ],
  },
  {
    id: "tpl_adoption",
    name: "譲渡誓約書（里親用）",
    fields: [
      {
        id: "pet_type",
        label: "種類",
        value: "",
        type: "text",
        placeholder: "例:雑種（犬）",
      },
      {
        id: "pet_name",
        label: "仮名",
        value: "",
        type: "text",
        placeholder: "保護時の名前",
      },
      {
        id: "pet_gender",
        label: "性別",
        value: "",
        type: "select",
        options: ["オス", "メス", "不明"],
      },
      {
        id: "pet_age",
        label: "推定年齢",
        value: "",
        type: "text",
        placeholder: "例:3歳くらい",
      },
      {
        id: "health_condition",
        label: "健康状態",
        value: "",
        type: "text",
        placeholder: "特記事項なし",
      },
      {
        id: "transfer_fee",
        label: "譲渡費用 (円)",
        value: "",
        type: "number",
        placeholder: "ワクチン代等実費",
      },
    ],
  },
];

const DEFAULT_VIDEO_PLAYLIST = [];

const DEFAULT_DOCUMENTS = [
  {
    id: "doc_1",
    title: "販売契約 共通条項（裏面）",
    filename: "terms_common.pdf",
    type: "PDF",
  },
  {
    id: "doc_2",
    title: "飼育の注意点・マナー",
    filename: "guide_manner.pdf",
    type: "PDF",
  },
  {
    id: "doc_3",
    title: "店舗連絡先・アフターケア",
    filename: "shop_contact.pdf",
    type: "PDF",
  },
  {
    id: "doc_4",
    title: "里親譲渡規約",
    filename: "adoption_rules.pdf",
    type: "PDF",
  },
];

const DEFAULT_FLOWS = [
  {
    id: "flow_standard",
    name: "生体販売（標準）",
    description: "一般的なペット販売時の重要事項説明フロー",
    templateId: "tpl_standard",
    attachmentIds: ["doc_1", "doc_3"],
    steps: [
      { id: "s1", type: "VIDEO", title: "重要事項説明動画", videoIds: [] },
      { id: "s2", type: "CUSTOMER_INFO", title: "お客様情報入力" },
      { id: "s3", type: "SIGNATURE", title: "電子署名" },
      { id: "s4", type: "STAFF_INPUT", title: "スタッフ確認・入力" },
      { id: "s5", type: "CONTRACT_PREVIEW", title: "契約書発行" },
    ],
  },
  {
    id: "flow_adoption",
    name: "里親募集・譲渡",
    description: "保護犬・保護猫の譲渡契約用フロー",
    templateId: "tpl_adoption",
    attachmentIds: ["doc_4", "doc_2", "doc_3"],
    steps: [
      { id: "s1", type: "VIDEO", title: "里親制度・心構え", videoIds: [] },
      { id: "s2", type: "VIDEO", title: "飼育環境・健康管理", videoIds: [] },
      { id: "s3", type: "CUSTOMER_INFO", title: "里親希望者情報" },
      { id: "s4", type: "SIGNATURE", title: "譲渡誓約書署名" },
      { id: "s5", type: "STAFF_INPUT", title: "個体情報入力" },
      { id: "s6", type: "CONTRACT_PREVIEW", title: "譲渡契約書発行" },
    ],
  },
];

const MOCK_CONTRACTS = [
  {
    id: "C001",
    date: "2024/05/20",
    customer: "山田 太郎",
    type: "トイプードル",
    price: "¥480,000",
    staff: "佐藤 花子",
    status: "完了",
  },
  {
    id: "C002",
    date: "2024/05/19",
    customer: "鈴木 一郎",
    type: "チワワ",
    price: "¥350,000",
    staff: "田中 次郎",
    status: "完了",
  },
];
const MOCK_CUSTOMERS = [
  {
    id: "U001",
    name: "山田 太郎",
    nameKana: "ヤマダ タロウ",
    phone: "090-1234-5678",
    email: "yamada@example.com",
    lastVisit: "2024/05/20",
    pet: "トイプードル",
  },
  {
    id: "U002",
    name: "鈴木 一郎",
    nameKana: "スズキ イチロウ",
    phone: "080-9876-5432",
    email: "suzuki@example.com",
    lastVisit: "2024/05/19",
    pet: "チワワ",
  },
];
const MOCK_STAFF_USERS = [
  {
    id: 1,
    name: "本部 太郎",
    email: "admin@petshop.co.jp",
    role: "管理者",
    lastLogin: "2024/05/21 09:00",
  },
  {
    id: 2,
    name: "佐藤 花子",
    email: "sato@petshop.co.jp",
    role: "店長",
    lastLogin: "2024/05/21 08:45",
  },
];

// --- 接客フロー用サブコンポーネント ---

const ProgressBar = ({ steps, currentStepIndex }) => (
  <div className="w-full bg-white shadow-sm py-4 px-6 mb-6 print:hidden overflow-x-auto">
    <div className="max-w-5xl mx-auto min-w-[600px]">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const stepTypeInfo = STEP_TYPES[step.type] || { icon: FileText };
          const Icon = stepTypeInfo.icon;
          const isActive = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex flex-col items-center min-w-[80px] ${isActive ? "text-blue-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${isActive ? "bg-blue-100" : "bg-gray-100"} ${isCurrent ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
                >
                  <Icon size={16} />
                </div>
                <span className="text-xs font-bold hidden sm:block truncate max-w-[100px]">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[20px]">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                    style={{ width: index < currentStepIndex ? "100%" : "0%" }}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
);

// === [feat/video-playback] HTML5 video化 & 視聴時間チェック対応 ===
const VideoStep = ({
  checkVideo,
  onCheckChange,
  onNext,
  videoPlaylist,
  stepConfig,
  completedVideoIds,
  onVideoComplete,
}) => {
  const targetVideoIds = stepConfig.videoIds || [];
  const activePlaylist =
    targetVideoIds.length > 0
      ? videoPlaylist.filter((v) => targetVideoIds.includes(v.id))
      : videoPlaylist;

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [insufficientModal, setInsufficientModal] = useState(null);
  const videoRef = useRef(null);
  const videoStartTimesRef = useRef({});

  const currentVideo = activePlaylist[currentVideoIndex] || {};
  const isAllCompleted = activePlaylist.every((v) =>
    completedVideoIds.includes(v.id),
  );
  const isCurrentCompleted = progress >= 100;
  const overallProgress =
    activePlaylist.length > 0
      ? (completedVideoIds.length / activePlaylist.length) * 100
      : 0;

  const parseDurationSec = (dur) => {
    if (!dur) return 0;
    const parts = String(dur).split(":").map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
  };

  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current._watchedSec = 0;
      videoRef.current._lastTime = 0;
    }
  }, [currentVideoIndex]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);
    const now = v.currentTime;
    const prev = v._lastTime ?? now;
    const delta = now - prev;
    if (delta > 0 && delta < 2) v._watchedSec = (v._watchedSec || 0) + delta;
    v._lastTime = now;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (!completedVideoIds.includes(currentVideo.id)) {
      const v = videoRef.current;
      const actualDuration = v ? v.duration : 0;
      const requiredSec = parseDurationSec(currentVideo.duration);
      const watchedSec = v ? v._watchedSec || 0 : 0;
      const threshold = actualDuration > 0 ? actualDuration : requiredSec;
      if (watchedSec < threshold * 0.99) {
        const fmt = (s) => `${Math.floor(s / 60)}分${Math.round(s % 60)}秒`;
        if (v) {
          v._watchedSec = 0;
          v.currentTime = 0;
        }
        delete videoStartTimesRef.current[currentVideo.id];
        localStorage.removeItem(`videoStartTime_${currentVideo.id}`);
        localStorage.removeItem(`videoEndTime_${currentVideo.id}`);
        setProgress(0);
        setInsufficientModal({
          title: currentVideo.title,
          required: fmt(threshold),
        });
        return;
      }
      if (v) v._watchedSec = 0;
      setProgress(100);
      onVideoComplete((prev) => [...prev, currentVideo.id]);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isCurrentCompleted) {
      v.currentTime = 0;
      setProgress(0);
      v.play();
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      if (!videoStartTimesRef.current[currentVideo.id]) {
        const startTime = Date.now();
        videoStartTimesRef.current[currentVideo.id] = startTime;
        localStorage.setItem(
          `videoStartTime_${currentVideo.id}`,
          String(startTime),
        );
      }
      v.play();
      setIsPlaying(true);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < activePlaylist.length - 1)
      setCurrentVideoIndex((prev) => prev + 1);
  };

  const selectVideo = (index) => {
    if (
      index === 0 ||
      completedVideoIds.includes(activePlaylist[index - 1]?.id)
    )
      setCurrentVideoIndex(index);
  };

  if (activePlaylist.length === 0)
    return (
      <div className="text-center p-10 text-gray-500">
        再生する動画が設定されていません。
      </div>
    );

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
      {insufficientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-50 px-6 pt-6 pb-4 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                視聴時間が不足しています
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 text-sm mb-1">
                「{insufficientModal.title}」の視聴時間が不足しています。
              </p>
              <p className="text-gray-700 text-sm mb-1">
                必要な視聴時間:{" "}
                <span className="font-bold text-red-600">
                  {insufficientModal.required}以上
                </span>
              </p>
              <p className="text-gray-700 text-sm">
                もう一度最初から視聴してください。
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setInsufficientModal(null)}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        {stepConfig.title || "動画視聴"}
      </h2>
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>視聴の進捗状況</span>
          <span className="font-bold text-blue-600">
            {completedVideoIds.length} / {activePlaylist.length} 本完了
          </span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div
            className="h-full bg-green-500 transition-all duration-500 ease-out flex items-center justify-end pr-1"
            style={{ width: `${overallProgress}%` }}
          >
            {overallProgress > 5 && (
              <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full gap-6 mb-6">
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg flex flex-col">
          <div
            className="aspect-video relative flex items-center justify-center bg-gray-800 cursor-pointer flex-grow"
            onClick={togglePlay}
          >
            {currentVideo.url ? (
              <video
                ref={videoRef}
                src={currentVideo.url}
                className="absolute inset-0 w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <span className="text-gray-400 text-sm z-10">
                動画を読み込めませんでした
              </span>
            )}
            {!isPlaying && !isCurrentCompleted && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            )}
            {isPlaying && (
              <div className="opacity-0 hover:opacity-100 absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Pause size={32} className="text-white" />
                </div>
              </div>
            )}
            {isCurrentCompleted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                <CheckCircle size={48} className="text-green-400 mb-2" />
                <span className="text-white font-bold mb-4">
                  この動画は視聴完了しました
                </span>
                {currentVideoIndex < activePlaylist.length - 1 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextVideo();
                    }}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    次の動画へ <SkipForward size={16} className="ml-2" />
                  </button>
                ) : (
                  <div className="text-blue-200 text-sm">
                    全て完了しました。
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="mt-4 flex items-center text-xs text-gray-400 hover:text-white"
                >
                  <RotateCcw size={12} className="mr-1" /> もう一度見る
                </button>
              </div>
            )}
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/20">
                再生中: {currentVideo.title}
              </span>
            </div>
          </div>
          <div className="bg-gray-800 p-3">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex-1 h-3 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-none"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-gray-400 text-xs">
              <span>{isPlaying ? "再生中" : "一時停止"}</span>
              <span>{currentVideo.duration}</span>
            </div>
          </div>
        </div>
        <div className="w-full md:w-64 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center">
            <List size={16} className="text-gray-500 mr-2" />
            <span className="font-bold text-sm text-gray-700">再生リスト</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activePlaylist.map((video, index) => {
              const isCompleted = completedVideoIds.includes(video.id);
              const isActive = index === currentVideoIndex;
              const isUnlocked =
                index === 0 ||
                completedVideoIds.includes(activePlaylist[index - 1]?.id);
              return (
                <button
                  key={video.id}
                  onClick={() => selectVideo(index)}
                  disabled={!isUnlocked}
                  className={`w-full text-left p-3 border-b border-gray-100 transition-colors flex items-start ${isActive ? "bg-blue-50" : isUnlocked ? "hover:bg-white" : "opacity-50 cursor-not-allowed bg-gray-50"}`}
                >
                  <div className="mr-3 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : isUnlocked ? (
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? "border-blue-500" : "border-gray-300"}`}
                      >
                        {isActive && (
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    ) : (
                      <Lock size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${isActive ? "text-blue-700" : isUnlocked ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {video.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isUnlocked
                        ? video.duration
                        : "前の動画を視聴してください"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div
        className={`w-full p-4 rounded-lg border transition-all duration-300 mb-6 ${isAllCompleted ? "bg-blue-50 border-blue-100" : "bg-gray-100 border-gray-200 opacity-70"}`}
      >
        <div className="flex flex-col">
          {!isAllCompleted && (
            <p className="text-xs text-red-500 font-bold mb-2 flex items-center">
              <Lock size={12} className="mr-1" />
              全ての動画を最後まで視聴するとチェックが可能になります
            </p>
          )}
          <label
            className={`flex items-center space-x-3 ${isAllCompleted ? "cursor-pointer" : "cursor-not-allowed"}`}
          >
            <input
              type="checkbox"
              name="checkVideo"
              checked={checkVideo}
              onChange={onCheckChange}
              disabled={!isAllCompleted}
              className={`w-6 h-6 rounded focus:ring-blue-500 ${isAllCompleted ? "text-blue-600" : "text-gray-400 bg-gray-200 border-gray-300"}`}
            />
            <span
              className={`font-medium ${isAllCompleted ? "text-gray-800" : "text-gray-500"}`}
            >
              全ての動画を視聴し、内容を理解しました。
            </span>
          </label>
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!checkVideo}
        className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${checkVideo ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
      >
        次へ進む <ChevronRight className="ml-2" />
      </button>
    </div>
  );
};
const validatePhone = (phone) => {
  const digits = phone.replace(/[-\s]/g, "");
  if (!/^\d+$/.test(digits)) return "数字のみで入力してください";
  if (digits.length < 10 || digits.length > 11)
    return "電話番号は10〜11桁で入力してください";
  return null;
};
const CustomerFormStep = ({ data, onChange, onNext, onPrev }) => {
  const [errors, setErrors] = useState({});

  const handleNext = () => {
    const newErrors = {};
    if (!data.name.trim()) newErrors.name = "お名前を入力してください";
    if (!data.nameKana.trim())
      newErrors.nameKana = "フリガナを入力してください";
    if (!data.address.trim()) newErrors.address = "ご住所を入力してください";
    if (!data.phone.trim()) {
      newErrors.phone = "電話番号を入力してください";
    } else {
      const phoneError = validatePhone(data.phone);
      if (phoneError) newErrors.phone = phoneError;
    }
    if (!data.email.trim()) {
      newErrors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "メールアドレスの形式が正しくありません";
    }
    if (!data.checkTerms) newErrors.checkTerms = "確認事項に同意してください";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onNext();
  };

  const fieldClass = (name) =>
    `w-full p-3 border rounded-lg ${errors[name] ? "border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border-gray-300"}`;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        お客様情報の入力
      </h2>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              お名前 (フルネーム)
            </label>
            <input
              type="text"
              name="name"
              value={data.name}
              onChange={onChange}
              className={fieldClass("name")}
              placeholder="山田 太郎"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              フリガナ
            </label>
            <input
              type="text"
              name="nameKana"
              value={data.nameKana}
              onChange={onChange}
              className={fieldClass("nameKana")}
              placeholder="ヤマダ タロウ"
            />
            {errors.nameKana && (
              <p className="text-red-500 text-xs mt-1">{errors.nameKana}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ご住所
          </label>
          <input
            type="text"
            name="address"
            value={data.address}
            onChange={onChange}
            className={fieldClass("address")}
            placeholder="東京都..."
          />
          {errors.address && (
            <p className="text-red-500 text-xs mt-1">{errors.address}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              name="phone"
              value={data.phone}
              onChange={onChange}
              className={fieldClass("phone")}
              placeholder="09012345678"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              value={data.email}
              onChange={onChange}
              className={fieldClass("email")}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mt-4">
          <h3 className="font-bold text-yellow-800 mb-2 flex items-center">
            <ShieldCheck size={18} className="mr-2" /> 確認事項
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mb-3">
            <li>動物愛護管理法に基づき、対面での説明を受けました。</li>
            <li>ペットの飼育に必要な環境が整っています。</li>
          </ul>
          <label className="flex items-center space-x-3 cursor-pointer pt-2 border-t border-yellow-200">
            <input
              type="checkbox"
              name="checkTerms"
              checked={data.checkTerms}
              onChange={onChange}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="text-gray-800 font-medium text-sm">
              上記内容に同意します。
            </span>
          </label>
          {errors.checkTerms && (
            <p className="text-red-500 text-xs mt-2">{errors.checkTerms}</p>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          戻る
        </button>
        <button
          onClick={handleNext}
          disabled={!data.checkTerms}
          className={`px-8 py-3 rounded-lg font-bold text-white transition-colors ${data.checkTerms ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}`}
        >
          次へ (署名)
        </button>
      </div>
    </div>
  );
};

const SignatureStep = ({ signatureImage, onSaveSignature, onNext, onPrev }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
      if (signatureImage) {
        const img = new Image();
        img.src = signatureImage;
        img.onload = () => ctx.drawImage(img, 0, 0);
      }
    }
  }, []);
  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) onSaveSignature(canvasRef.current.toDataURL());
  };
  const clearSignature = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onSaveSignature(null);
  };
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">ご署名</h2>
      <div
        className="border-2 border-dashed border-gray-400 rounded-lg mb-4 bg-gray-50 overflow-hidden touch-none relative"
        style={{ height: "304px" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
          署名欄
        </div>
      </div>
      <div className="flex justify-end mb-6">
        <button
          onClick={clearSignature}
          className="text-sm text-red-600 flex items-center font-medium px-3 py-1 border border-red-200 rounded bg-red-50"
        >
          <Trash2 size={14} className="mr-1" /> 書き直す
        </button>
      </div>
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          戻る
        </button>
        <button
          onClick={onNext}
          disabled={!signatureImage}
          className={`px-8 py-3 rounded-lg font-bold text-white ${!signatureImage ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          スタッフへ渡す
        </button>
      </div>
    </div>
  );
};

const StaffInputStep = ({
  fields,
  onFieldChange,
  onAdd,
  onRemove,
  onUpdateLabel,
  onNext,
  onPrev,
}) => {
  const [isEditingFields, setIsEditingFields] = useState(false);
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-indigo-500">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            店舗スタッフ入力画面
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            販売するペットの詳細情報を入力してください。
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditingFields(!isEditingFields)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isEditingFields ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
          >
            <Settings size={16} className="mr-2" />
            {isEditingFields ? "入力完了" : "一時的な項目編集"}
          </button>
        </div>
      </div>
      {isEditingFields && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-100 text-yellow-800 text-sm">
          <p className="font-bold mb-1">
            注意: ここでの編集はこの契約のみに適用されます
          </p>
          全ての契約に適用する項目変更は、管理画面の「契約書テンプレート」から行ってください。
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div key={field.id} className="relative group">
            <div className="flex items-center justify-between mb-1">
              {isEditingFields ? (
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => onUpdateLabel(field.id, e.target.value)}
                  className="text-sm font-bold text-indigo-700 bg-white border border-indigo-300 rounded px-2 py-1 w-full mr-2"
                />
              ) : (
                <label className="block text-sm font-bold text-gray-700">
                  {field.label}
                </label>
              )}
              {isEditingFields && (
                <button
                  onClick={() => onRemove(field.id)}
                  className="text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {field.type === "select" ? (
              <select
                value={field.value}
                onChange={(e) => onFieldChange(field.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">選択してください</option>
                {field.options &&
                  field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => onFieldChange(field.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder={field.placeholder || ""}
              />
            )}
          </div>
        ))}
        {isEditingFields && (
          <button
            onClick={onAdd}
            className="flex items-center justify-center h-[74px] border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:bg-indigo-50"
          >
            <Plus size={20} className="mr-2" />
            項目を追加
          </button>
        )}
      </div>
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600"
        >
          戻る
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center shadow-lg"
        >
          <FileText size={18} className="mr-2" />
          契約書を作成する
        </button>
      </div>
    </div>
  );
};

const ContractPreviewStep = ({
  customerData,
  staffFields,
  signatureImage,
  onPrev,
  onPrint,
  onFinish,
  companyInfo,
  templateName,
  documentsList,
  attachmentIds,
  isRemote = false,
}) => {
  const currentDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const attachedDocuments = documentsList.filter((doc) =>
    attachmentIds.includes(doc.id),
  );
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold text-gray-800">契約内容の確認</h2>
        <div className="flex space-x-4">
          <button
            onClick={onPrev}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white bg-white"
          >
            修正する
          </button>
          {!isRemote && (
            <button
              onClick={onPrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"
            >
              <Printer size={18} className="mr-2" /> 印刷 / 保存
            </button>
          )}
          {onFinish && (
            <button
              onClick={onFinish}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md"
            >
              {isRemote ? "送信する" : "接客終了"}
            </button>
          )}
        </div>
      </div>
      <div
        id="contract-preview"
        className="bg-white p-12 shadow-2xl w-[210mm] min-h-[297mm] text-gray-900 leading-relaxed mx-auto print:shadow-none print:w-full print:m-0 print:p-0"
      >
        <div className="text-center mb-10 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-serif font-bold tracking-widest mb-2">
            {templateName || "ペット生体売買契約書"}
          </h1>
          <p className="text-sm text-right">作成日: {currentDate}</p>
        </div>
        <div className="mb-8">
          <p className="mb-4">
            売主（以下「甲」という）と買主（以下「乙」という）は、以下の通りペット生体の売買契約を締結する。甲は乙に対し、動物愛護管理法に基づく現物確認および対面説明を行ったことを確認する。
          </p>
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-bold border-l-4 border-gray-800 pl-3 mb-4 bg-gray-100 py-1 print:bg-gray-100">
            1. 生体情報
          </h3>
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              {staffFields.map((field) => (
                <tr key={field.id}>
                  <th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">
                    {field.label}
                  </th>
                  <td className="border border-gray-400 p-2">
                    {field.value ||
                      (isRemote ? (
                        <span className="text-gray-400 italic">
                          （店舗にて記入）
                        </span>
                      ) : (
                        "ー"
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-bold border-l-4 border-gray-800 pl-3 mb-4 bg-gray-100 py-1 print:bg-gray-100">
            2. 買主（乙）情報
          </h3>
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">
                  氏名
                </th>
                <td className="border border-gray-400 p-2">
                  {customerData.name}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">
                  住所
                </th>
                <td className="border border-gray-400 p-2">
                  {customerData.address}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">
                  電話番号
                </th>
                <td className="border border-gray-400 p-2">
                  {customerData.phone}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-12 flex justify-end">
          <div className="w-1/2">
            <p className="mb-2 font-bold">署名（乙）:</p>
            <div className="border-b border-gray-800 h-24 flex items-end justify-center relative">
              {signatureImage && (
                <img
                  src={signatureImage}
                  alt="Signature"
                  className="max-h-20 object-contain absolute bottom-1"
                />
              )}
              <span className="text-xs text-gray-400 absolute bottom-0 right-0">
                電子署名
              </span>
            </div>
            <p className="text-right mt-1 text-sm">{currentDate}</p>
          </div>
        </div>
        <div className="mt-16 text-center text-sm text-gray-500 border-t pt-4">
          <p className="font-bold">
            {companyInfo?.name || "株式会社ペットショップ見本"}
          </p>
          <p>{companyInfo?.address || "東京都渋谷区XX-XX"}</p>
          <p>TEL: {companyInfo?.phone || "03-XXXX-XXXX"}</p>
        </div>
      </div>
      {attachedDocuments.length > 0 && (
        <div className="mt-8 w-full max-w-4xl print:mt-0">
          <p className="text-center text-gray-500 mb-2 print:hidden">
            --- 印刷時に以下の裏面/添付資料が含まれます ---
          </p>
          {attachedDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-12 shadow-2xl w-[210mm] min-h-[297mm] mx-auto mb-8 print:shadow-none print:w-full print:m-0 print:p-0 print:break-before-page flex flex-col items-center justify-center border-2 border-dashed border-gray-200 print:border-none"
            >
              <div className="text-center p-10 border-4 border-gray-100 rounded-xl w-full h-full flex flex-col items-center justify-center">
                <FileText size={64} className="text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-700 mb-2">
                  {doc.title}
                </h2>
                <p className="text-gray-500">{doc.filename}</p>
                <p className="text-sm text-gray-400 mt-4">
                  （実際の印刷時にはここにPDFの内容が印字されます）
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const [customerId, setCustomerId] = useState(null);
  // === [feat/video-playback] 視聴済み動画の保持 ===
  const [watchedVideoIds, setWatchedVideoIds] = useState([]);
  useEffect(() => {
    setWatchedVideoIds([]);
  }, [currentStepIndex]);

  const currentStep = remoteSteps[currentStepIndex];
  const templateName = staffTemplates.find(
    (t) => t.id === flow.templateId,
  )?.name;

  // === [feat/signature-storage] ===
  // SIGNATURE ステップ通過時に署名画像を Supabase Storage にアップロードし、
  // sign_history テーブルへ履歴を保存する。
  const nextStep = async () => {
    if (currentStepIndex < remoteSteps.length - 1) {
      if (currentStep.type === "SIGNATURE" && signatureImage) {
        const blob = await (await fetch(signatureImage)).blob();
        const filePath = `signatures/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("signatures")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          await supabase.from("sign_history").insert({
            contract_id: flow.id,
            contract_name: flow.name || null,
            sign_customer_id: customerId || null,
            sign_path: filePath,
          });
        }
      }
      // === [feat/customer-db-save] ===
      // お客様情報入力ステップを通過したら customers テーブルに保存
      if (currentStep.type === "CUSTOMER_INFO") {
        const { data } = await supabase
          .from("customers")
          .insert({
            name: customerData.name,
            name_kana: customerData.nameKana || null,
            tell: customerData.phone || null,
            mail: customerData.email || null,
            address: customerData.address || null,
          })
          .select("id")
          .maybeSingle();
        if (data?.id) setCustomerId(data.id);
      }

      // === [feat/save-staff-input-to-db] ===
      // スタッフ入力ステップを通過したら、
      // 1) 入力内容全体を sign_input テーブルに JSON で保存
      // 2) ペットの種類を customers.remarks カラムに保存
      if (currentStep.type === "STAFF_INPUT") {
        const signItemValue = JSON.stringify(
          staffFields.reduce((acc, field) => {
            acc[field.label] = field.value;
            return acc;
          }, {}),
        );
        await supabase.from("sign_input").insert({
          sign_item_no: currentStepIndex,
          sign_item_value: signItemValue,
        });

        // ペットの種類を customers.remarks に保存
        const petTypeField = staffFields.find(
          (f) =>
            f.id === "pet_type" ||
            f.label === "ペットの種類" ||
            f.label === "種類",
        );
        if (petTypeField?.value && customerId) {
          const { error: remarksError } = await supabase
            .from("customers")
            .update({ remarks: petTypeField.value })
            .eq("id", customerId);
          if (remarksError) console.error("remarks 更新エラー:", remarksError);
        }
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
            onFinish={() =>
              onComplete(remoteSession.id, { ...customerData, signatureImage })
            }
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

const LoginPage = ({ onLoginAdmin, onLoginStaff, companyName }) => {
  const [demoUrl, setDemoUrl] = useState("");
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            {companyName || "Pet Shop System"}
          </h1>
          <p className="text-blue-100">販売管理・接客支援アプリ</p>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="text-blue-600" size={24} />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">接客スタッフの方</h3>
              <p className="text-sm text-gray-500 mb-4">
                お客様への説明・契約作成を行います
              </p>
              <button
                onClick={onLoginStaff}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-md flex items-center justify-center"
              >
                接客を開始する <ChevronRight size={18} className="ml-1" />
              </button>
            </div>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">
                または
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <div>
              <button
                onClick={onLoginAdmin}
                className="w-full py-3 border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-bold rounded-lg transition-colors flex items-center justify-center"
              >
                <Lock size={18} className="mr-2" />
                管理画面へログイン
              </button>
            </div>
            <div className="pt-4 border-t mt-4">
              <p className="text-xs text-gray-400 mb-2 text-center">
                デモ用: 発行されたURLを入力して移動
              </p>
              <div className="flex">
                <input
                  type="text"
                  placeholder="?sid=..."
                  className="flex-1 border border-gray-300 rounded-l p-2 text-xs"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
                <button
                  onClick={() => (window.location.search = demoUrl)}
                  className="bg-gray-200 px-3 rounded-r text-xs font-bold hover:bg-gray-300"
                >
                  GO
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400 border-t">
          © 2024 {companyName || "Pet Shop Contract System"}
        </div>
      </div>
    </div>
  );
};

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
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    staffTemplates[0]?.id,
  );
  const [isSaved, setIsSaved] = useState(false);

  // --- 契約書テンプレート編集用 ---
  const activeTemplateIndex = staffTemplates.findIndex(
    (t) => t.id === selectedTemplateId,
  );
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
    newTemplates.find((t) => t.id === activeTemplate.id).fields[fieldIndex][
      key
    ] = value;
    setStaffTemplates(newTemplates);
    setIsSaved(false);
  };
  const addField = () => {
    if (!activeTemplate) return;
    const newTemplates = [...staffTemplates];
    newTemplates
      .find((t) => t.id === activeTemplate.id)
      .fields.push({
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
    setStaffTemplates([
      ...staffTemplates,
      {
        id: newId,
        name: "新しいテンプレート",
        fields: [...DEFAULT_TEMPLATES[0].fields],
      },
    ]);
    setSelectedTemplateId(newId);
  };
  const deleteTemplate = (id) => {
    if (staffTemplates.length <= 1)
      return alert("最後のテンプレートは削除できません");
    if (window.confirm("このテンプレートを削除してもよろしいですか？")) {
      setStaffTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateId === id)
        setSelectedTemplateId(staffTemplates[0].id);
    }
  };
  const saveTemplate = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // --- コンテンツ管理用（動画アップロード機能） ---
  const [contentTab, setContentTab] = useState("video");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState(null);
  const [newContentData, setNewContentData] = useState({
    title: "",
    duration: "",
    description: "",
    filename: "",
    type: "PDF",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [thumbnails, setThumbnails] = useState({});

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("create_at", { ascending: false });
    if (data) {
      const videos = await Promise.all(
        data.map(async (v) => {
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
            createdAt: v.create_at
              ? new Date(v.create_at)
                  .toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })
                  .replace(/\//g, "/")
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
    video.onloadedmetadata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        setThumbnails((prev) => ({
          ...prev,
          [videoId]: canvas.toDataURL("image/jpeg"),
        }));
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
      setNewContentData({
        title: content.title,
        duration: content.duration || "",
        description: content.description || "",
        filename: content.filename || "",
        type: content.type || "PDF",
      });
    } else {
      setEditingContentId(null);
      setNewContentData({
        title: "",
        duration: "",
        description: "",
        filename: "",
        type: "PDF",
      });
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
      const duplicate = videoPlaylist.find(
        (v) => v.title === newContentData.title && v.id !== editingContentId,
      );
      if (duplicate) {
        alert(
          `「${newContentData.title}」という名前の動画は既に登録されています。別のタイトルを入力してください。`,
        );
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
          updatePayload.video_time =
            durationParts.length === 2
              ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
              : 0;
          if (selectedFile) {
            setUploadProgress("動画をアップロード中...");
            setUploadProgressPct(0);
            const ext = selectedFile.name.split(".").pop();
            const filePath = `${Date.now()}.${ext}`;
            const totalSize = selectedFile.size;
            let lastLoaded = 0;
            const fakeProgress = setInterval(() => {
              lastLoaded = Math.min(
                lastLoaded + totalSize * 0.05,
                totalSize * 0.9,
              );
              setUploadProgressPct(Math.round((lastLoaded / totalSize) * 100));
            }, 200);
            const { error: uploadError } = await supabase.storage
              .from("videos")
              .upload(filePath, selectedFile);
            clearInterval(fakeProgress);
            setUploadProgressPct(100);
            if (uploadError) throw uploadError;
            const oldVideo = videoPlaylist.find(
              (v) => v.id === editingContentId,
            );
            if (oldVideo?.path)
              await supabase.storage.from("videos").remove([oldVideo.path]);
            updatePayload.path = filePath;
            setThumbnails((prev) => {
              const n = { ...prev };
              delete n[editingContentId];
              return n;
            });
          }
          setUploadProgress("情報を更新中...");
          const { error } = await supabase
            .from("videos")
            .update(updatePayload)
            .eq("id", editingContentId);
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
            lastLoaded = Math.min(
              lastLoaded + totalSize * 0.05,
              totalSize * 0.9,
            );
            setUploadProgressPct(Math.round((lastLoaded / totalSize) * 100));
          }, 200);
          const { error: uploadError } = await supabase.storage
            .from("videos")
            .upload(filePath, selectedFile);
          clearInterval(fakeProgress);
          setUploadProgressPct(100);
          if (uploadError) throw uploadError;
          setUploadProgress("情報を保存中...");
          const durationParts = newContentData.duration.split(":");
          const videoTimeSecs =
            durationParts.length === 2
              ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
              : 0;
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
          setDocumentsList((prev) =>
            prev.map((d) =>
              d.id === editingContentId ? { ...d, ...newContentData } : d,
            ),
          );
        } else {
          setDocumentsList((prev) => [
            ...prev,
            {
              id: `doc_${Date.now()}`,
              ...newContentData,
              filename: newContentData.filename || "uploaded_file.pdf",
            },
          ]);
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
      if (video?.path)
        await supabase.storage.from("videos").remove([video.path]);
      await supabase.from("videos").delete().eq("id", id);
      setThumbnails((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      await fetchVideos();
    } else {
      setDocumentsList((prev) => prev.filter((d) => d.id !== id));
    }
    setDeleteConfirmId(null);
  };

  // --- フロー作成用 ---
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [newFlowData, setNewFlowData] = useState({
    name: "",
    description: "",
    templateId: "",
    attachmentIds: [],
  });
  const [editingSteps, setEditingSteps] = useState([]);
  const [flowModalOpen, setFlowModalOpen] = useState(false);

  // === [feat/flow-db-storage] ===
  // flow_header テーブルからフロー一覧を取得する。
  // ステップ構成は description カラムに JSON 文字列として保存している。
  const fetchFlows = useCallback(async () => {
    const { data } = await supabase
      .from("flow_header")
      .select("*")
      .order("create_at", { ascending: false });
    if (data && data.length > 0) {
      const parsed = data.map((row) => {
        let steps = [];
        try {
          steps = JSON.parse(row.description || "[]");
        } catch {
          steps = [];
        }
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
    }
  }, [setFlows]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const openFlowModal = (flow = null) => {
    if (flow) {
      setEditingFlowId(flow.id);
      setNewFlowData({
        name: flow.name,
        description: flow.description || "",
        templateId: flow.templateId || staffTemplates[0]?.id || "",
        attachmentIds: flow.attachmentIds || [],
      });
      setEditingSteps([...flow.steps]);
    } else {
      setEditingFlowId(null);
      setNewFlowData({
        name: "",
        description: "",
        templateId: staffTemplates[0]?.id || "",
        attachmentIds: [],
      });
      setEditingSteps([
        {
          id: `s_${Date.now()}`,
          type: "VIDEO",
          title: "動画ステップ",
          videoIds: [],
        },
      ]);
    }
    setFlowModalOpen(true);
  };
  const addStep = () => {
    setEditingSteps([
      ...editingSteps,
      {
        id: `s_${Date.now()}`,
        type: "VIDEO",
        title: "新しいステップ",
        videoIds: [],
      },
    ]);
  };
  const removeStep = (index) => {
    setEditingSteps(editingSteps.filter((_, i) => i !== index));
  };
  const updateStep = (index, key, value) => {
    const newSteps = [...editingSteps];
    newSteps[index][key] = value;
    setEditingSteps(newSteps);
  };
  const moveStep = (index, direction) => {
    if (direction === "up" && index > 0) {
      const newSteps = [...editingSteps];
      [newSteps[index - 1], newSteps[index]] = [
        newSteps[index],
        newSteps[index - 1],
      ];
      setEditingSteps(newSteps);
    } else if (direction === "down" && index < editingSteps.length - 1) {
      const newSteps = [...editingSteps];
      [newSteps[index + 1], newSteps[index]] = [
        newSteps[index],
        newSteps[index + 1],
      ];
      setEditingSteps(newSteps);
    }
  };
  const handleVideoSelection = (stepIndex, videoId) => {
    const step = editingSteps[stepIndex];
    const currentIds = step.videoIds || [];
    const newIds = currentIds.includes(videoId)
      ? currentIds.filter((id) => id !== videoId)
      : [...currentIds, videoId];
    updateStep(stepIndex, "videoIds", newIds);
  };
  const handleAttachmentSelection = (docId) => {
    const currentIds = newFlowData.attachmentIds || [];
    const newIds = currentIds.includes(docId)
      ? currentIds.filter((id) => id !== docId)
      : [...currentIds, docId];
    setNewFlowData({ ...newFlowData, attachmentIds: newIds });
  };

  // === [feat/flow-db-storage] ===
  // UUID形式のみDBに渡す（DEFAULT_TEMPLATES等の独自IDは contract_template_id (UUID型) に入れられないため）
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // === [feat/flow-db-storage] ===
  // フローを flow_header テーブルへ insert/update する。
  const saveFlow = async () => {
    if (!newFlowData.name) return;
    const stepsJson = JSON.stringify(editingSteps);
    const validUuid = (v) => (v && uuidRegex.test(v) ? v : null);
    const payload = {
      name: newFlowData.name,
      description: stepsJson,
      contract_template_id: validUuid(newFlowData.templateId),
      files: (newFlowData.attachmentIds || []).filter((id) =>
        uuidRegex.test(id),
      ),
    };
    let error;
    if (editingFlowId) {
      ({ error } = await supabase
        .from("flow_header")
        .update({ ...payload, update_at: new Date().toISOString() })
        .eq("id", editingFlowId));
    } else {
      ({ error } = await supabase.from("flow_header").insert(payload));
    }
    if (error) {
      alert(`保存に失敗しました: ${error.message}`);
      return;
    }
    await fetchFlows();
    setFlowModalOpen(false);
  };

  // === [feat/flow-db-storage] ===
  // フローを flow_header テーブルから delete する。
  const deleteFlow = async (id) => {
    if (window.confirm("このフローを削除してもよろしいですか？")) {
      await supabase.from("flow_header").delete().eq("id", id);
      await fetchFlows();
    }
  };

  // --- 事前受付（リモートURL発行）管理 ---
  const [selectedFlowForSession, setSelectedFlowForSession] = useState(
    flows[0]?.id,
  );
  const createSession = () => {
    setSessions((prev) => [
      {
        id: Math.random().toString(36).substr(2, 9),
        flowId: selectedFlowForSession,
        flowName: flows.find((f) => f.id === selectedFlowForSession)?.name,
        createdAt: new Date().toLocaleString(),
        status: "unstarted",
        data: null,
      },
      ...prev,
    ]);
  };
  // --- 顧客管理 ---
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [editCustomerData, setEditCustomerData] = useState({
    name: "",
    name_kana: "",
    tell: "",
    mail: "",
    address: "",
    remarks: "",
    last_enter_store_at: "",
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("create_at", { ascending: false });
    if (data) setCustomers(data);
    setCustomersLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
  }, [activeTab, fetchCustomers]);

  const openEditCustomerModal = (customer) => {
    setEditingCustomer(customer);
    setEditCustomerData({
      name: customer.name || "",
      name_kana: customer.name_kana || "",
      tell: customer.tell || "",
      mail: customer.mail || "",
      address: customer.address || "",
      remarks: customer.remarks || "",
      last_enter_store_at: customer.last_enter_store_at
        ? new Date(customer.last_enter_store_at).toISOString().split("T")[0]
        : "",
    });
  };

  const closeEditCustomerModal = () => {
    setEditingCustomer(null);
    setEditCustomerData({
      name: "",
      name_kana: "",
      tell: "",
      mail: "",
      address: "",
      remarks: "",
      last_enter_store_at: "",
    });
  };

  const handleCustomerFieldChange = (key, value) => {
    setEditCustomerData((prev) => ({ ...prev, [key]: value }));
  };

  const saveCustomer = async () => {
    if (!editingCustomer) return;
    if (!editCustomerData.name.trim()) {
      alert("お名前を入力してください");
      return;
    }
    setIsSavingCustomer(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: editCustomerData.name,
        name_kana: editCustomerData.name_kana || null,
        tell: editCustomerData.tell || null,
        mail: editCustomerData.mail || null,
        address: editCustomerData.address || null,
        remarks: editCustomerData.remarks || null,
        last_enter_store_at: editCustomerData.last_enter_store_at
          ? new Date(editCustomerData.last_enter_store_at).toISOString()
          : null,
        update_at: new Date().toISOString(),
      })
      .eq("id", editingCustomer.id);
    setIsSavingCustomer(false);
    if (error) {
      alert(`保存に失敗しました: ${error.message}`);
      return;
    }
    await fetchCustomers();
    closeEditCustomerModal();
  };

  const openDetailCustomerModal = (customer) => {
    setViewingCustomer(customer);
  };

  const closeDetailCustomerModal = () => {
    setViewingCustomer(null);
  };

  const switchToEditFromDetail = () => {
    if (viewingCustomer) {
      openEditCustomerModal(viewingCustomer);
      setViewingCustomer(null);
    }
  };
  // --- 設定画面用 ---
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
      <div className="w-64 bg-white shadow-lg flex flex-col z-10">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Settings className="mr-2 text-blue-600" />
            管理画面
          </h2>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 mb-2 px-4">
            メインメニュー
          </p>
          <MenuButton
            id="dashboard"
            icon={LayoutDashboard}
            label="ダッシュボード"
          />
          <MenuButton id="remote" icon={Smartphone} label="事前受付URL発行" />
          <MenuButton id="history" icon={History} label="契約履歴" />
          <MenuButton id="customers" icon={Users} label="顧客管理" />
          <MenuButton
            id="template"
            icon={FileText}
            label="契約書テンプレート"
          />
          <MenuButton id="upload" icon={Upload} label="コンテンツ管理" />
          <MenuButton id="flow" icon={List} label="接客フロー作成" />
          <div className="my-4 border-t border-gray-100"></div>
          <p className="text-xs font-bold text-gray-400 mb-2 px-4">システム</p>
          <MenuButton id="settings" icon={Settings} label="設定" />
        </nav>
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onLogout}
            className="flex items-center text-red-600 hover:text-red-700 font-medium px-4 py-2 w-full"
          >
            <LogOut size={18} className="mr-2" /> ログアウト
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 relative">
        {activeTab === "remote" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              事前受付用URLの発行・管理
            </h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
              <h3 className="font-bold text-lg mb-4">新規URL発行</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    使用する接客フロー
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    value={selectedFlowForSession}
                    onChange={(e) => setSelectedFlowForSession(e.target.value)}
                  >
                    {flows.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createSession}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center"
                >
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
                            onClick={() => {
                              const url = `${window.location.origin}?sid=${session.id}`;
                              navigator.clipboard.writeText(url);
                              alert(`コピーしました: ${url}`);
                            }}
                            className="text-blue-600 hover:underline flex items-center max-w-xs truncate"
                          >
                            <Link size={14} className="mr-1 flex-shrink-0" />
                            ?sid={session.id}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${session.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                          >
                            {session.status === "completed"
                              ? "入力完了"
                              : "未実施"}
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
                        <td
                          colSpan="5"
                          className="p-8 text-center text-gray-400"
                        >
                          発行済みのURLはありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-blue-800 font-bold">今月の契約数</h3>
                  <FileText className="text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  24{" "}
                  <span className="text-sm font-normal text-gray-500">件</span>
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-green-800 font-bold">売上高</h3>
                  <BarChart3 className="text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">¥4,820,000</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-purple-800 font-bold">来店予約</h3>
                  <Calendar className="text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-gray-800">
                  8{" "}
                  <span className="text-sm font-normal text-gray-500">組</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "template" && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    契約書入力項目カスタマイズ
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    店舗スタッフが接客時に入力する項目のデフォルト設定を管理します。
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={addField}
                    className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                  >
                    <Plus size={16} className="mr-2" /> 項目を追加
                  </button>
                  <button
                    onClick={saveTemplate}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md"
                  >
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
                    <button
                      onClick={addNewTemplate}
                      className="text-blue-600 hover:bg-blue-100 p-1 rounded"
                    >
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
                          <label className="block text-xs font-bold text-gray-500 mb-1">
                            テンプレート名
                          </label>
                          <input
                            type="text"
                            value={activeTemplate.name}
                            onChange={(e) => updateTemplateName(e.target.value)}
                            className="w-full text-xl font-bold text-gray-800 border-none focus:ring-0 p-0"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => deleteTemplate(activeTemplate.id)}
                            className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-200"
                          >
                            <Trash2 size={16} className="mr-2" /> 削除
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 pr-2">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/4">
                                項目名
                              </th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/5">
                                入力タイプ
                              </th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-1/3">
                                プレースホルダー
                              </th>
                              <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">
                                削除
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {activeTemplate.fields.map((field, index) => (
                              <tr key={field.id} className="hover:bg-gray-50">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) =>
                                      updateField(
                                        index,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full p-2 border border-gray-300 rounded"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={field.type}
                                    onChange={(e) =>
                                      updateField(index, "type", e.target.value)
                                    }
                                    className="w-full p-2 border border-gray-300 rounded bg-white"
                                  >
                                    <option value="text">テキスト</option>
                                    <option value="number">数値</option>
                                    <option value="date">日付</option>
                                    <option value="select">選択肢</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={field.placeholder || ""}
                                    onChange={(e) =>
                                      updateField(
                                        index,
                                        "placeholder",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full p-2 border border-gray-300 rounded"
                                    disabled={
                                      field.type === "select" ||
                                      field.type === "date"
                                    }
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => removeField(index)}
                                    className="text-gray-400 hover:text-red-500"
                                  >
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
                    <div className="flex items-center justify-center h-full text-gray-400">
                      テンプレートを選択してください
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex space-x-1 mb-6 border-b">
              <button
                onClick={() => setContentTab("video")}
                className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "video" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                動画コンテンツ
              </button>
              <button
                onClick={() => setContentTab("document")}
                className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === "document" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                ドキュメント (PDF等)
              </button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {contentTab === "video"
                  ? "接客時に再生する動画コンテンツを管理します。"
                  : "契約書の裏面に印刷するPDF資料を管理します。"}
              </p>
              <button
                onClick={() => openUploadModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"
              >
                <Upload size={18} className="mr-2" /> 新規アップロード
              </button>
            </div>
            {contentTab === "video" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoPlaylist.map((video) => {
                  const thumb = thumbnails[video.id];
                  return (
                    <div
                      key={video.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow"
                    >
                      <div
                        className="aspect-video bg-gray-800 relative flex items-center justify-center cursor-pointer"
                        onClick={() => video.url && setPlayingVideo(video)}
                      >
                        {thumb && (
                          <img
                            src={thumb}
                            alt={video.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Play
                              size={24}
                              className="text-white ml-1"
                              fill="white"
                            />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-mono">
                          {video.duration}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 mb-1 truncate">
                          {video.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2 h-10 overflow-hidden line-clamp-2">
                          {video.description || "説明なし"}
                        </p>
                        {video.createdAt && (
                          <p className="text-xs text-gray-400 mb-3">
                            登録日時: {video.createdAt}
                          </p>
                        )}
                        <div className="flex justify-between items-center border-t pt-3">
                          <button
                            onClick={() => openUploadModal(video)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                          >
                            <Edit2 size={14} className="mr-1" /> 編集
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(video.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"
                          >
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
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-40 bg-gray-100 flex items-center justify-center border-b">
                      <FileText size={48} className="text-gray-400" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center mb-1">
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded mr-2 font-bold">
                          {doc.type}
                        </span>
                        <h3 className="font-bold text-gray-800 truncate flex-1">
                          {doc.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        {doc.filename}
                      </p>
                      <div className="flex justify-between items-center border-t pt-3">
                        <button
                          onClick={() => openUploadModal(doc)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          <Edit2 size={14} className="mr-1" /> 編集
                        </button>
                        <button
                          onClick={() => deleteContent(doc.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"
                        >
                          <Trash2 size={14} className="mr-1" /> 削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {uploadModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      {editingContentId ? "情報の編集" : "新規アップロード"} (
                      {contentTab === "video" ? "動画" : "ドキュメント"})
                    </h3>
                    <button
                      onClick={closeUploadModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {(!editingContentId || contentTab === "video") && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors relative">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept={
                            contentTab === "video"
                              ? "video/*"
                              : "application/pdf"
                          }
                          onChange={handleFileSelect}
                        />
                        <div className="flex flex-col items-center justify-center">
                          {contentTab === "video" ? (
                            <Film
                              size={32}
                              className={
                                selectedFile
                                  ? "text-blue-600 mb-2"
                                  : "text-blue-400 mb-2"
                              }
                            />
                          ) : (
                            <FileText size={32} className="text-red-500 mb-2" />
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {selectedFile
                              ? selectedFile.name
                              : editingContentId
                                ? "新しい動画ファイルを選択（省略可）"
                                : "ファイルを選択"}
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        タイトル
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={newContentData.title}
                        onChange={(e) =>
                          setNewContentData({
                            ...newContentData,
                            title: e.target.value,
                          })
                        }
                        placeholder={
                          contentTab === "video"
                            ? "例: 1. 飼育環境の準備"
                            : "例: 共通条項（裏面）"
                        }
                      />
                    </div>
                    {contentTab === "video" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          再生時間 (分:秒)
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          value={newContentData.duration}
                          onChange={(e) =>
                            setNewContentData({
                              ...newContentData,
                              duration: e.target.value,
                            })
                          }
                          placeholder="例: 3:45"
                        />
                      </div>
                    )}
                    {contentTab === "video" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          説明文
                        </label>
                        <textarea
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                          value={newContentData.description}
                          onChange={(e) =>
                            setNewContentData({
                              ...newContentData,
                              description: e.target.value,
                            })
                          }
                          placeholder="動画の内容について説明を入力してください"
                        />
                      </div>
                    )}
                    {isUploading && uploadProgressPct > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{uploadProgress}</span>
                          <span>{uploadProgressPct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={closeUploadModal}
                      disabled={isUploading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleContentSave}
                      disabled={!newContentData.title || isUploading}
                      className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center ${!newContentData.title || isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 shadow-md"}`}
                    >
                      {isUploading ? uploadProgress || "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {deleteConfirmId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    削除の確認
                  </h3>
                  <p className="text-gray-600 mb-6">
                    この動画を削除してもよろしいですか？
                    <br />
                    <span className="text-sm text-red-500">
                      この操作は取り消せません。
                    </span>
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => deleteContent(deleteConfirmId)}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              </div>
            )}
            {playingVideo && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setPlayingVideo(null)}
              >
                <div
                  className="bg-black rounded-xl overflow-hidden shadow-2xl w-full max-w-3xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-900">
                    <div>
                      <p className="text-white font-bold">
                        {playingVideo.title}
                      </p>
                      {playingVideo.description && (
                        <p className="text-gray-400 text-sm">
                          {playingVideo.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setPlayingVideo(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <video
                    src={playingVideo.url}
                    controls
                    autoPlay
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "flow" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                接客時の画面遷移フローを作成・編集します。
              </p>
              <button
                onClick={() => openFlowModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"
              >
                <Plus size={18} className="mr-2" /> 新規フロー作成
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      {flow.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openFlowModal(flow)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteFlow(flow.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 h-10">
                    {flow.description}
                  </p>
                  <div className="mb-2 text-xs bg-gray-100 p-2 rounded flex flex-col gap-1">
                    <div>
                      <span className="font-bold text-gray-500 mr-2">
                        テンプレート:
                      </span>
                      {staffTemplates.find((t) => t.id === flow.templateId)
                        ?.name || "未設定"}
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 mr-2">
                        添付資料:
                      </span>
                      {flow.attachmentIds?.length || 0} 件
                    </div>
                  </div>
                  <div className="space-y-2">
                    {flow.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded"
                      >
                        <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                          {idx + 1}
                        </div>
                        {step.title}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {flowModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      {editingFlowId ? "フロー編集" : "新規フロー作成"}
                    </h3>
                    <button
                      onClick={() => setFlowModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          フロー名
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded"
                          value={newFlowData.name}
                          onChange={(e) =>
                            setNewFlowData({
                              ...newFlowData,
                              name: e.target.value,
                            })
                          }
                          placeholder="例: 里親募集用フロー"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          使用する契約書テンプレート
                        </label>
                        <select
                          className="w-full p-2 border border-gray-300 rounded bg-white"
                          value={newFlowData.templateId}
                          onChange={(e) =>
                            setNewFlowData({
                              ...newFlowData,
                              templateId: e.target.value,
                            })
                          }
                        >
                          {staffTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          説明
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded"
                          value={newFlowData.description}
                          onChange={(e) =>
                            setNewFlowData({
                              ...newFlowData,
                              description: e.target.value,
                            })
                          }
                          placeholder="用途などのメモ"
                        />
                      </div>
                      <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          契約書の裏面・添付資料
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {documentsList.map((doc) => (
                            <label
                              key={doc.id}
                              className={`flex items-center px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${(newFlowData.attachmentIds || []).includes(doc.id) ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-gray-300 hover:bg-gray-100"}`}
                            >
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={(
                                  newFlowData.attachmentIds || []
                                ).includes(doc.id)}
                                onChange={() =>
                                  handleAttachmentSelection(doc.id)
                                }
                              />
                              {doc.title}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">
                          ステップ構成
                        </h4>
                        <button
                          onClick={addStep}
                          className="text-sm text-blue-600 hover:underline flex items-center"
                        >
                          <Plus size={14} className="mr-1" /> ステップ追加
                        </button>
                      </div>
                      {editingSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4"
                        >
                          <div className="flex flex-col space-y-1 pt-2 text-gray-400">
                            <button
                              onClick={() => moveStep(index, "up")}
                              disabled={index === 0}
                              className="hover:text-blue-600 disabled:opacity-30"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <MoreVertical size={16} className="cursor-move" />
                            <button
                              onClick={() => moveStep(index, "down")}
                              disabled={index === editingSteps.length - 1}
                              className="hover:text-blue-600 disabled:opacity-30"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="text-xs text-gray-500">
                                  ステップ名
                                </label>
                                <input
                                  type="text"
                                  value={step.title}
                                  onChange={(e) =>
                                    updateStep(index, "title", e.target.value)
                                  }
                                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                />
                              </div>
                              <div className="w-1/3">
                                <label className="text-xs text-gray-500">
                                  タイプ
                                </label>
                                <select
                                  value={step.type}
                                  onChange={(e) =>
                                    updateStep(index, "type", e.target.value)
                                  }
                                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                >
                                  {Object.entries(STEP_TYPES).map(
                                    ([key, val]) => (
                                      <option key={key} value={key}>
                                        {val.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                            </div>
                            {step.type === "VIDEO" && (
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 mb-2">
                                  再生する動画を選択
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {videoPlaylist.map((video) => (
                                    <label
                                      key={video.id}
                                      className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(step.videoIds || []).includes(
                                          video.id,
                                        )}
                                        onChange={() =>
                                          handleVideoSelection(index, video.id)
                                        }
                                        className="rounded text-blue-600"
                                      />
                                      <span>{video.title}</span>
                                      <span className="text-gray-400 text-xs">
                                        ({video.duration})
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeStep(index)}
                            className="text-gray-400 hover:text-red-500 pt-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={() => setFlowModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveFlow}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md"
                    >
                      保存する
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              契約履歴一覧
            </h3>
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
                  {MOCK_CONTRACTS.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{contract.id}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {contract.date}
                      </td>
                      <td className="px-6 py-3">{contract.customer}</td>
                      <td className="px-6 py-3">{contract.type}</td>
                      <td className="px-6 py-3">{contract.price}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {contract.staff}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${contract.status === "完了" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === "customers" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              顧客情報管理
            </h3>
            {customersLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                読み込み中...
              </div>
            ) : customers.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                顧客データがありません
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mr-3 flex-shrink-0">
                        <User size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-base leading-tight">
                          {customer.name || "—"}
                        </h4>
                        {customer.name_kana && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {customer.name_kana}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {customer.tell && (
                        <div className="flex items-center gap-2">
                          <Phone
                            size={14}
                            className="text-gray-400 flex-shrink-0"
                          />
                          <span>{customer.tell}</span>
                        </div>
                      )}
                      {customer.mail && (
                        <div className="flex items-center gap-2">
                          <Mail
                            size={14}
                            className="text-gray-400 flex-shrink-0"
                          />
                          <span className="truncate text-gray-700">
                            {customer.mail}
                          </span>
                        </div>
                      )}
                      {customer.last_enter_store_at && (
                        <div className="flex items-center gap-2">
                          <Calendar
                            size={14}
                            className="text-gray-400 flex-shrink-0"
                          />
                          <span>
                            最終来店:{" "}
                            {new Date(
                              customer.last_enter_store_at,
                            ).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      )}
                    </div>
                    {customer.remarks && (
                      <div className="border-t border-gray-100 pt-3 mb-4 text-sm text-gray-600">
                        所有ペット:{" "}
                        <span className="font-bold text-gray-800">
                          {customer.remarks}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditCustomerModal(customer)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => openDetailCustomerModal(customer)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium"
                      >
                        詳細
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {editingCustomer && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">
                      顧客情報の編集
                    </h3>
                    <button
                      onClick={closeEditCustomerModal}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={isSavingCustomer}
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        お名前 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.name}
                        onChange={(e) =>
                          handleCustomerFieldChange("name", e.target.value)
                        }
                        placeholder="山田 太郎"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        フリガナ
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.name_kana}
                        onChange={(e) =>
                          handleCustomerFieldChange("name_kana", e.target.value)
                        }
                        placeholder="ヤマダ タロウ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.tell}
                        onChange={(e) =>
                          handleCustomerFieldChange("tell", e.target.value)
                        }
                        placeholder="09012345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.mail}
                        onChange={(e) =>
                          handleCustomerFieldChange("mail", e.target.value)
                        }
                        placeholder="example@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        住所
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.address}
                        onChange={(e) =>
                          handleCustomerFieldChange("address", e.target.value)
                        }
                        placeholder="東京都..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最終来店日
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        value={editCustomerData.last_enter_store_at}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "last_enter_store_at",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        所有ペット / 備考
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                        value={editCustomerData.remarks}
                        onChange={(e) =>
                          handleCustomerFieldChange("remarks", e.target.value)
                        }
                        placeholder="例: トイプードル"
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={closeEditCustomerModal}
                      disabled={isSavingCustomer}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveCustomer}
                      disabled={
                        isSavingCustomer || !editCustomerData.name.trim()
                      }
                      className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center ${
                        isSavingCustomer || !editCustomerData.name.trim()
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-blue-700 shadow-md"
                      }`}
                    >
                      <Save size={16} className="mr-2" />
                      {isSavingCustomer ? "保存中..." : "保存する"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {viewingCustomer && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                      <User size={22} className="mr-2 text-blue-600" />
                      顧客情報の詳細
                    </h3>
                    <button
                      onClick={closeDetailCustomerModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex items-center pb-4 border-b border-gray-100">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mr-4 flex-shrink-0">
                        <User size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-xl leading-tight">
                          {viewingCustomer.name || "—"}
                        </h4>
                        {viewingCustomer.name_kana && (
                          <p className="text-sm text-gray-400 mt-1">
                            {viewingCustomer.name_kana}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        電話番号
                      </label>
                      <div className="flex items-center text-gray-800">
                        <Phone
                          size={16}
                          className="text-gray-400 mr-2 flex-shrink-0"
                        />
                        <span>{viewingCustomer.tell || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        メールアドレス
                      </label>
                      <div className="flex items-center text-gray-800">
                        <Mail
                          size={16}
                          className="text-gray-400 mr-2 flex-shrink-0"
                        />
                        <span className="break-all">
                          {viewingCustomer.mail || "—"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        住所
                      </label>
                      <div className="flex items-start text-gray-800">
                        <MapPin
                          size={16}
                          className="text-gray-400 mr-2 mt-1 flex-shrink-0"
                        />
                        <span>{viewingCustomer.address || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        最終来店日
                      </label>
                      <div className="flex items-center text-gray-800">
                        <Calendar
                          size={16}
                          className="text-gray-400 mr-2 flex-shrink-0"
                        />
                        <span>
                          {viewingCustomer.last_enter_store_at
                            ? new Date(
                                viewingCustomer.last_enter_store_at,
                              ).toLocaleDateString("ja-JP")
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        所有ペット / 備考
                      </label>
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {viewingCustomer.remarks || "—"}
                      </p>
                    </div>
                    {viewingCustomer.create_at && (
                      <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
                        <p>
                          登録日時:{" "}
                          {new Date(viewingCustomer.create_at).toLocaleString(
                            "ja-JP",
                          )}
                        </p>
                        {viewingCustomer.update_at && (
                          <p className="mt-1">
                            最終更新:{" "}
                            {new Date(viewingCustomer.update_at).toLocaleString(
                              "ja-JP",
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={closeDetailCustomerModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={switchToEditFromDetail}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center"
                    >
                      <Edit2 size={16} className="mr-2" />
                      編集する
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "settings" && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-fit">
                <button
                  onClick={() => setSettingsTab("company")}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "company" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <Briefcase size={18} className="mr-3" /> 会社情報
                </button>
                <button
                  onClick={() => setSettingsTab("users")}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "users" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <Users size={18} className="mr-3" /> 権限・ユーザー管理
                </button>
                <button
                  onClick={() => setSettingsTab("other")}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === "other" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <Settings size={18} className="mr-3" /> その他
                </button>
              </div>
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">
                {settingsTab === "company" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4">
                      会社基本情報
                    </h3>
                    <div className="space-y-6 max-w-2xl">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          会社名 / 店舗名
                        </label>
                        <input
                          type="text"
                          value={tempCompanyInfo.name}
                          onChange={(e) =>
                            setTempCompanyInfo({
                              ...tempCompanyInfo,
                              name: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="pt-6">
                        <button
                          onClick={handleSaveCompany}
                          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center"
                        >
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
  const [customerId, setCustomerId] = useState(null);

  // === [feat/video-playback] ステップごとの視聴済み動画を保持 ===
  const [watchedVideosByStep, setWatchedVideosByStep] = useState({});
  const watchedVideoIds = watchedVideosByStep[currentStepIndex] || [];

  const handleFlowSelect = (flow) => {
    setSelectedFlow(flow);
    const template =
      staffTemplates.find((t) => t.id === flow.templateId) || staffTemplates[0];
    setStaffFields(JSON.parse(JSON.stringify(template.fields)));
  };

  if (!selectedFlow) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              接客メニュー選択
            </h1>
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
                  <List
                    size={28}
                    className="text-blue-600 group-hover:text-white"
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {flow.name}
                </h2>
                <p className="text-gray-500 text-sm mb-4">{flow.description}</p>
                <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                  {flow.steps.map((step, i) => (
                    <span key={i} className="bg-gray-100 px-2 py-1 rounded">
                      {step.title}
                    </span>
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
  // === [feat/signature-storage] ===
  // SIGNATURE ステップ通過時に署名画像を Supabase Storage にアップロードし、
  // sign_history テーブルへ履歴を保存する
  const nextStep = async () => {
    if (currentStepIndex < selectedFlow.steps.length - 1) {
      // === [feat/video-playback] ===
      if (currentStep.type === "VIDEO") {
        setCustomerData((prev) => ({ ...prev, checkVideo: false }));
      }

      // === [feat/signature-storage] ===
      if (currentStep.type === "SIGNATURE" && signatureImage) {
        const blob = await (await fetch(signatureImage)).blob();
        const filePath = `signatures/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("signatures")
          .upload(filePath, blob, { contentType: "image/png" });
        if (!uploadError) {
          await supabase.from("sign_history").insert({
            contract_id: selectedFlow.id,
            contract_name: selectedFlow.name || null,
            sign_customer_id: customerId || null,
            sign_path: filePath,
          });
        }
      }
 // === [feat/customer-db-save] ===
      if (currentStep.type === "CUSTOMER_INFO") {
        const { data } = await supabase
          .from("customers")
          .insert({...})
          .select("id")
          .maybeSingle();
        if (data?.id) setCustomerId(data.id);
      }

      // === [feat/save-staff-input-to-db] ===
      // スタッフ入力ステップを通過したら、
      // 1) 入力内容全体を sign_input テーブルに JSON で保存
      // 2) ペットの種類を customers.remarks カラムに保存
      if (currentStep.type === "STAFF_INPUT") {
        try {
          const signItemValue = JSON.stringify(
            staffFields.reduce((acc, field) => {
              acc[field.label] = field.value;
              return acc;
            }, {}),
          );
          const { error: signInputError } = await supabase
            .from("sign_input")
            .insert({
              sign_item_no: currentStepIndex,
              sign_item_value: signItemValue,
            });
          if (signInputError) {
            console.error("sign_input 保存エラー:", signInputError);
          }

          // ペットの種類を customers.remarks に保存
          const petTypeField = staffFields.find(
            (f) =>
              f.id === "pet_type" ||
              f.label === "ペットの種類" ||
              f.label === "種類",
          );
          if (petTypeField?.value && customerId) {
            const { error: remarksError } = await supabase
              .from("customers")
              .update({
                remarks: petTypeField.value,
                update_at: new Date().toISOString(),
              })
              .eq("id", customerId);
            if (remarksError) {
              console.error("remarks 更新エラー:", remarksError);
            } else {
              console.log("remarks を更新しました:", petTypeField.value);
            }
          } else if (!customerId) {
            console.warn("customerId が無いため remarks を更新できません");
          } else if (!petTypeField?.value) {
            console.warn(
              "ペットの種類が入力されていないため remarks を更新しません",
            );
          }
        } catch (err) {
          console.error("STAFF_INPUT 処理エラー:", err);
        }
      }

      setCurrentStepIndex((prev) => prev + 1);
    }
  };
  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevStepDef = selectedFlow.steps[prevIndex];

      // === [feat/video-playback] ===
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
        if (allDone) setCustomerData((prev) => ({ ...prev, checkVideo: true }));
      }
      setCurrentStepIndex(prevIndex);
    } else {
      if (
        window.confirm("メニュー選択に戻りますか？入力内容は破棄されます。")
      ) {
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
        setWatchedVideosByStep({});
      }
    }
  };
  const handleCustomerChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleStaffFieldChange = (id, value) => {
    setStaffFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, value } : field)),
    );
  };
  const addStaffField = () => {
    setStaffFields([
      ...staffFields,
      {
        id: `custom_${Date.now()}`,
        label: "新しい項目",
        value: "",
        type: "text",
        isCustom: true,
      },
    ]);
  };
  const removeStaffField = (id) =>
    setStaffFields((prev) => prev.filter((f) => f.id !== id));
  const updateFieldLabel = (id, newLabel) => {
    setStaffFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, label: newLabel } : field,
      ),
    );
  };
  const handlePrint = () => window.print();
  const templateName = staffTemplates.find(
    (t) => t.id === selectedFlow.templateId,
  )?.name;

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
            onVideoComplete={(updater) =>
              setWatchedVideosByStep((prev) => {
                const current = prev[currentStepIndex] || [];
                const next =
                  typeof updater === "function" ? updater(current) : updater;
                return { ...prev, [currentStepIndex]: next };
              })
            }
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
      case "STAFF_INPUT":
        return (
          <StaffInputStep
            fields={staffFields}
            onFieldChange={handleStaffFieldChange}
            onAdd={addStaffField}
            onRemove={removeStaffField}
            onUpdateLabel={updateFieldLabel}
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
            onPrint={handlePrint}
            // === [feat/update-last-enter-store-at] ===
            // 接客終了時に customers.last_enter_store_at を今日の日付で更新
            onFinish={async () => {
              if (customerId) {
                try {
                  const { error: lastEnterError } = await supabase
                    .from("customers")
                    .update({
                      last_enter_store_at: new Date().toISOString(),
                    })
                    .eq("id", customerId);
                  if (lastEnterError) {
                    console.error(
                      "last_enter_store_at 更新エラー:",
                      lastEnterError,
                    );
                  }
                } catch (err) {
                  console.error("接客終了処理エラー:", err);
                }
              }
              setSelectedFlow(null);
            }}
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
        <span className="text-sm font-medium opacity-70">
          接客中: {selectedFlow.name}
        </span>
        <button
          onClick={onLogout}
          className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700"
        >
          接客を終了してログアウト
        </button>
      </div>
      <ProgressBar
        steps={selectedFlow.steps}
        currentStepIndex={currentStepIndex}
      />
      <div className="container mx-auto px-4 print:p-0 print:w-full print:max-w-none">
        {renderStepContent()}
      </div>
    </div>
  );
};

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
  // === [feat/flow-db-storage] ===
  // DBからのフロー読み込み完了まで待つためのフラグ
  const [dataReady, setDataReady] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [remoteSession, setRemoteSession] = useState(null);

  // === [feat/flow-db-storage] ===
  // 起動時にDBから動画とフローを読み込む。
  // flow_header テーブルが空の場合は DEFAULT_FLOWS を seed する。
  useEffect(() => {
    const loadData = async () => {
      // 動画
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

      // フロー
      const { data: flowsData } = await supabase
        .from("flow_header")
        .select("*")
        .order("create_at", { ascending: false });
      if (flowsData && flowsData.length > 0) {
        const parsed = flowsData.map((row) => {
          let steps = [];
          try {
            steps = JSON.parse(row.description || "[]");
          } catch {
            steps = [];
          }
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
        // DBが空の場合はデフォルトフローをseedする
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
            try {
              steps = JSON.parse(row.description || "[]");
            } catch {
              steps = [];
            }
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

  // URLパラメータからセッションIDを取得（dataReady後に実行）
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
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: "completed", data } : s,
      ),
    );
    alert("送信が完了しました。店舗スタッフにお知らせください。");
    handleLogout();
  };

  // === [feat/flow-db-storage] ===
  // データ読み込み完了まではローディング表示
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
          onLogout={handleLogout}
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
