import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  CircleCheck as CheckCircle,
  ChevronRight,
  SkipForward,
  RotateCcw,
  Lock,
  List,
  Minimize2,
} from "lucide-react";

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
      ? targetVideoIds.map((id) => videoPlaylist.find((v) => v.id === id)).filter(Boolean)
      : videoPlaylist;

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [insufficientModal, setInsufficientModal] = useState(null);
  const [midPauseShown, setMidPauseShown] = useState(false);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const videoStartTimesRef = useRef({});
  const shouldAutoPlayRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pauseIconTimeoutRef = useRef(null);

  const currentVideo = activePlaylist[currentVideoIndex] || {};
  const isAllCompleted = activePlaylist.every((v) => completedVideoIds.includes(v.id));
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
    setMidPauseShown(false);
    setShowPauseIcon(false);
    if (pauseIconTimeoutRef.current) clearTimeout(pauseIconTimeoutRef.current);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current._watchedSec = 0;
      videoRef.current._lastTime = 0;
      videoRef.current._midPaused = false;
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
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseIconTimeoutRef.current) clearTimeout(pauseIconTimeoutRef.current);
    };
  }, []);

  const enterFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const flashPauseIcon = () => {
    setShowPauseIcon(true);
    if (pauseIconTimeoutRef.current) clearTimeout(pauseIconTimeoutRef.current);
    pauseIconTimeoutRef.current = setTimeout(() => setShowPauseIcon(false), 2500);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);

    const now = v.currentTime;
    const prev = v._lastTime ?? now;
    const delta = now - prev;
    if (delta > 0 && delta < 2) {
      v._watchedSec = (v._watchedSec || 0) + delta;
    }
    v._lastTime = now;

    if (!v._midPaused && v.duration && v.currentTime >= v.duration / 2) {
      v._midPaused = true;
      v.pause();
      setMidPauseShown(true);
      exitFullscreen();
    }
  };

  const handleResumeFromMidPause = () => {
    const v = videoRef.current;
    if (!v) return;
    setMidPauseShown(false);
    v.play();
    setIsPlaying(true);
    enterFullscreen();
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
        exitFullscreen();
        const fmt = (s) => `${Math.floor(s / 60)}分${Math.round(s % 60)}秒`;
        if (v) {
          v._watchedSec = 0;
          v.currentTime = 0;
        }
        delete videoStartTimesRef.current[currentVideo.id];
        localStorage.removeItem(`videoStartTime_${currentVideo.id}`);
        localStorage.removeItem(`videoEndTime_${currentVideo.id}`);
        setProgress(0);
        setInsufficientModal({ title: currentVideo.title, required: fmt(threshold) });
        return;
      }

      if (v) v._watchedSec = 0;
      setProgress(100);
      exitFullscreen();
      onVideoComplete((prev) => [...prev, currentVideo.id]);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (midPauseShown) return;
    if (isCurrentCompleted) {
      v.currentTime = 0;
      setProgress(0);
      v._midPaused = false;
      setMidPauseShown(false);
      v.play();
      setIsPlaying(true);
      enterFullscreen();
      flashPauseIcon();
      return;
    }
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
      exitFullscreen();
    } else {
      if (!videoStartTimesRef.current[currentVideo.id]) {
        const startTime = Date.now();
        videoStartTimesRef.current[currentVideo.id] = startTime;
        localStorage.setItem(`videoStartTime_${currentVideo.id}`, String(startTime));
      }
      v.play();
      setIsPlaying(true);
      enterFullscreen();
      flashPauseIcon();
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < activePlaylist.length - 1) {
      shouldAutoPlayRef.current = true;
      setCurrentVideoIndex((prev) => prev + 1);
      enterFullscreen();
    }
  };

  const handleLoadedData = () => {
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      const v = videoRef.current;
      if (v) {
        v.play().then(() => {
          setIsPlaying(true);
          if (!document.fullscreenElement) enterFullscreen();
        }).catch(() => {});
      }
    }
  };

  const selectVideo = (index) => {
    if (index === 0 || completedVideoIds.includes(activePlaylist[index - 1]?.id)) {
      setCurrentVideoIndex(index);
    }
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
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">視聴時間が不足しています</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 text-sm mb-1">「{insufficientModal.title}」の視聴時間が不足しています。</p>
              <p className="text-gray-700 text-sm mb-1">必要な視聴時間: <span className="font-bold text-red-600">{insufficientModal.required}以上</span></p>
              <p className="text-gray-700 text-sm">もう一度最初から視聴してください。</p>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setInsufficientModal(null)} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-2 text-gray-800">{stepConfig.title || "動画視聴"}</h2>
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>視聴の進捗状況</span>
          <span className="font-bold text-blue-600">{completedVideoIds.length} / {activePlaylist.length} 本完了</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div className="h-full bg-green-500 transition-all duration-500 ease-out flex items-center justify-end pr-1" style={{ width: `${overallProgress}%` }}>
            {overallProgress > 5 && <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse"></div>}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full gap-6 mb-6">
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg flex flex-col">
          <div ref={videoContainerRef} className="aspect-video relative flex items-center justify-center bg-gray-800 cursor-pointer flex-grow" onClick={togglePlay}>
            {currentVideo.url ? (
              <video
                ref={videoRef}
                src={currentVideo.url}
                className="absolute inset-0 w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onLoadedData={handleLoadedData}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <span className="text-gray-400 text-sm z-10">動画を読み込めませんでした</span>
            )}
            {!isPlaying && !isCurrentCompleted && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            )}
            {isPlaying && showPauseIcon && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity z-10 pointer-events-none">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Pause size={32} className="text-white" />
                </div>
              </div>
            )}
            {midPauseShown && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                <div className="text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 mx-auto">
                    <Pause size={32} className="text-blue-300" />
                  </div>
                  <p className="text-white text-xl font-bold mb-2">途中チェック</p>
                  <p className="text-gray-300 text-sm mb-6">動画の中間地点に到達しました。<br/>続けて視聴するには下のボタンを押してください。</p>
                  <button onClick={(e) => { e.stopPropagation(); handleResumeFromMidPause(); }} className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg">
                    続けて見る
                  </button>
                </div>
              </div>
            )}
            {isCurrentCompleted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                <CheckCircle size={48} className="text-green-400 mb-2" />
                <span className="text-white font-bold mb-4">この動画は視聴完了しました</span>
                {currentVideoIndex < activePlaylist.length - 1 ? (
                  <button onClick={(e) => { e.stopPropagation(); handleNextVideo(); }} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                    次の動画へ <SkipForward size={16} className="ml-2" />
                  </button>
                ) : (
                  <div className="text-blue-200 text-sm">全て完了しました。</div>
                )}
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="mt-4 flex items-center text-xs text-gray-400 hover:text-white">
                  <RotateCcw size={12} className="mr-1" /> もう一度見る
                </button>
              </div>
            )}
            {isFullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); exitFullscreen(); }}
                className="absolute bottom-3 right-3 z-30 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-colors"
                aria-label="全画面解除"
              >
                <Minimize2 size={20} />
              </button>
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
                <div className="h-full bg-blue-500 transition-none" style={{ width: `${progress}%` }}></div>
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
              const isUnlocked = index === 0 || completedVideoIds.includes(activePlaylist[index - 1]?.id);
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
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? "border-blue-500" : "border-gray-300"}`}>
                        {isActive && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                      </div>
                    ) : (
                      <Lock size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-blue-700" : isUnlocked ? "text-gray-700" : "text-gray-400"}`}>{video.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{isUnlocked ? video.duration : "前の動画を視聴してください"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={`w-full p-4 rounded-lg border transition-all duration-300 mb-6 ${isAllCompleted ? "bg-blue-50 border-blue-100" : "bg-gray-100 border-gray-200 opacity-70"}`}>
        <div className="flex flex-col">
          {!isAllCompleted && (
            <p className="text-xs text-red-500 font-bold mb-2 flex items-center">
              <Lock size={12} className="mr-1" />
              全ての動画を最後まで視聴するとチェックが可能になります
            </p>
          )}
          <label className={`flex items-center space-x-3 ${isAllCompleted ? "cursor-pointer" : "cursor-not-allowed"}`}>
            <input
              type="checkbox"
              name="checkVideo"
              checked={checkVideo}
              onChange={onCheckChange}
              disabled={!isAllCompleted}
              className={`w-6 h-6 rounded focus:ring-blue-500 ${isAllCompleted ? "text-blue-600" : "text-gray-400 bg-gray-200 border-gray-300"}`}
            />
            <span className={`font-medium ${isAllCompleted ? "text-gray-800" : "text-gray-500"}`}>
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

export default VideoStep;
