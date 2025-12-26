import React, { useState, useRef, useEffect } from 'react';
import { 
    Play, Pause, CheckCircle, FileText, PenTool, Printer, Plus, Trash2, Settings, 
    User, ShieldCheck, ChevronRight, ChevronLeft, LayoutDashboard, Upload, 
    LogOut, Lock, Users, BarChart3, Calendar, RotateCcw,
    SkipForward, List, Save, AlertCircle, Edit2, Film, X,
    ArrowUp, ArrowDown, MoreVertical, History, Search, Mail, Phone, MapPin, Briefcase,
    Bell, Database, Download, UserPlus, Key, Link, Smartphone, Send, ExternalLink, QrCode
} from 'lucide-react';

// --- 定数・初期値 ---

// ステップの型定義
const STEP_TYPES = {
    VIDEO: { label: '動画説明', icon: Play },
    CUSTOMER_INFO: { label: 'お客様情報', icon: User },
    SIGNATURE: { label: '署名', icon: PenTool },
    STAFF_INPUT: { label: '店舗入力', icon: Settings },
    CONTRACT_PREVIEW: { label: '契約書発行', icon: FileText }
};

// デフォルトのテンプレート定義
const DEFAULT_TEMPLATES = [
    {
        id: 'tpl_standard',
        name: '標準売買契約書',
        fields: [
            { id: 'pet_type', label: 'ペットの種類', value: '', type: 'text', placeholder: '例：トイプードル' },
            { id: 'pet_color', label: '毛色', value: '', type: 'text', placeholder: '例：レッド' },
            { id: 'pet_gender', label: '性別', value: '', type: 'select', options: ['オス', 'メス', '不明'] },
            { id: 'pet_birthday', label: '生年月日', value: '', type: 'date' },
            { id: 'pet_price', label: '生体価格 (円)', value: '', type: 'number' },
            { id: 'microchip', label: 'マイクロチップ番号', value: '', type: 'text' },
        ]
    },
    {
        id: 'tpl_adoption',
        name: '譲渡誓約書（里親用）',
        fields: [
            { id: 'pet_type', label: '種類', value: '', type: 'text', placeholder: '例：雑種（犬）' },
            { id: 'pet_name', label: '仮名', value: '', type: 'text', placeholder: '保護時の名前' },
            { id: 'pet_gender', label: '性別', value: '', type: 'select', options: ['オス', 'メス', '不明'] },
            { id: 'pet_age', label: '推定年齢', value: '', type: 'text', placeholder: '例：3歳くらい' },
            { id: 'health_condition', label: '健康状態', value: '', type: 'text', placeholder: '特記事項なし' },
            { id: 'transfer_fee', label: '譲渡費用 (円)', value: '', type: 'number', placeholder: 'ワクチン代等実費' },
        ]
    }
];

// デフォルト動画プレイリスト
const DEFAULT_VIDEO_PLAYLIST = [
    { id: 1, title: '1. 飼育環境の準備', duration: '1:30', description: 'ケージ、トイレ、食器などの配置について' },
    { id: 2, title: '2. 食事と健康管理', duration: '2:00', description: 'フードの与え方、ワクチン接種スケジュール' },
    { id: 3, title: '3. 法的責任とマナー', duration: '1:45', description: '狂犬病予防法、マイクロチップ登録について' },
    { id: 4, title: '里親制度について', duration: '3:00', description: '里親になるための条件と心構え' },
];

// デフォルトドキュメントリスト（PDF等）
const DEFAULT_DOCUMENTS = [
    { id: 'doc_1', title: '販売契約 共通条項（裏面）', filename: 'terms_common.pdf', type: 'PDF' },
    { id: 'doc_2', title: '飼育の注意点・マナー', filename: 'guide_manner.pdf', type: 'PDF' },
    { id: 'doc_3', title: '店舗連絡先・アフターケア', filename: 'shop_contact.pdf', type: 'PDF' },
    { id: 'doc_4', title: '里親譲渡規約', filename: 'adoption_rules.pdf', type: 'PDF' },
];

// デフォルトのフロー定義
const DEFAULT_FLOWS = [
    {
        id: 'flow_standard',
        name: '生体販売（標準）',
        description: '一般的なペット販売時の重要事項説明フロー',
        templateId: 'tpl_standard',
        attachmentIds: ['doc_1', 'doc_3'],
        steps: [
            { id: 's1', type: 'VIDEO', title: '重要事項説明動画', videoIds: [1, 2, 3] },
            { id: 's2', type: 'CUSTOMER_INFO', title: 'お客様情報入力' },
            { id: 's3', type: 'SIGNATURE', title: '電子署名' },
            { id: 's4', type: 'STAFF_INPUT', title: 'スタッフ確認・入力' },
            { id: 's5', type: 'CONTRACT_PREVIEW', title: '契約書発行' }
        ]
    },
    {
        id: 'flow_adoption',
        name: '里親募集・譲渡',
        description: '保護犬・保護猫の譲渡契約用フロー',
        templateId: 'tpl_adoption',
        attachmentIds: ['doc_4', 'doc_2', 'doc_3'],
        steps: [
            { id: 's1', type: 'VIDEO', title: '里親制度・心構え', videoIds: [4] },
            { id: 's2', type: 'VIDEO', title: '飼育環境・健康管理', videoIds: [1, 2] },
            { id: 's3', type: 'CUSTOMER_INFO', title: '里親希望者情報' },
            { id: 's4', type: 'SIGNATURE', title: '譲渡誓約書署名' },
            { id: 's5', type: 'STAFF_INPUT', title: '個体情報入力' },
            { id: 's6', type: 'CONTRACT_PREVIEW', title: '譲渡契約書発行' }
        ]
    }
];

// モックデータ
const MOCK_CONTRACTS = [
    { id: 'C001', date: '2024/05/20', customer: '山田 太郎', type: 'トイプードル', price: '¥480,000', staff: '佐藤 花子', status: '完了' },
    { id: 'C002', date: '2024/05/19', customer: '鈴木 一郎', type: 'チワワ', price: '¥350,000', staff: '田中 次郎', status: '完了' },
];
const MOCK_CUSTOMERS = [
    { id: 'U001', name: '山田 太郎', nameKana: 'ヤマダ タロウ', phone: '090-1234-5678', email: 'yamada@example.com', lastVisit: '2024/05/20', pet: 'トイプードル' },
    { id: 'U002', name: '鈴木 一郎', nameKana: 'スズキ イチロウ', phone: '080-9876-5432', email: 'suzuki@example.com', lastVisit: '2024/05/19', pet: 'チワワ' },
];
const MOCK_STAFF_USERS = [
    { id: 1, name: '本部 太郎', email: 'admin@petshop.co.jp', role: '管理者', lastLogin: '2024/05/21 09:00' },
    { id: 2, name: '佐藤 花子', email: 'sato@petshop.co.jp', role: '店長', lastLogin: '2024/05/21 08:45' },
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
                            <div className={`flex flex-col items-center min-w-[80px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${isActive ? 'bg-blue-100' : 'bg-gray-100'} ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-xs font-bold hidden sm:block truncate max-w-[100px]">{step.title}</span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[20px]">
                                    <div className={`absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300`} style={{width: index < currentStepIndex ? '100%' : '0%'}}></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    </div>
);

const VideoStep = ({ checkVideo, onCheckChange, onNext, videoPlaylist, stepConfig }) => {
    const targetVideoIds = stepConfig.videoIds || [];
    const targetVideos = videoPlaylist.filter(v => targetVideoIds.includes(v.id));
    const activePlaylist = targetVideos.length > 0 ? targetVideos : videoPlaylist;

    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completedVideoIds, setCompletedVideoIds] = useState([]);
    const timerRef = useRef(null);

    const currentVideo = activePlaylist[currentVideoIndex] || {};
    const isAllCompleted = activePlaylist.every(v => completedVideoIds.includes(v.id));
    const isCurrentCompleted = progress >= 100;
    const overallProgress = activePlaylist.length > 0 ? (completedVideoIds.length / activePlaylist.length) * 100 : 0;

    useEffect(() => { setProgress(0); setIsPlaying(false); clearInterval(timerRef.current); }, [currentVideoIndex]);
    useEffect(() => { return () => clearInterval(timerRef.current); }, []);

    const togglePlay = () => {
        if (progress >= 100) { setProgress(0); setIsPlaying(true); runTimer(); return; }
        if (isPlaying) { clearInterval(timerRef.current); setIsPlaying(false); } 
        else { setIsPlaying(true); runTimer(); }
    };

    const runTimer = () => {
        timerRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timerRef.current); setIsPlaying(false);
                    if (!completedVideoIds.includes(currentVideo.id)) { setCompletedVideoIds(prevIds => [...prevIds, currentVideo.id]); }
                    return 100;
                }
                return prev + 0.5;
            });
        }, 20);
    };

    const handleNextVideo = () => { if (currentVideoIndex < activePlaylist.length - 1) setCurrentVideoIndex(prev => prev + 1); };
    const selectVideo = (index) => { setCurrentVideoIndex(index); };

    if (activePlaylist.length === 0) return <div className="text-center p-10 text-gray-500">再生する動画が設定されていません。</div>;

    return (
        <div className="flex flex-col items-center max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">{stepConfig.title || '動画視聴'}</h2>
            <div className="w-full max-w-lg mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2"><span>視聴の進捗状況</span><span className="font-bold text-blue-600">{completedVideoIds.length} / {activePlaylist.length} 本完了</span></div>
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200"><div className="h-full bg-green-500 transition-all duration-500 ease-out flex items-center justify-end pr-1" style={{ width: `${overallProgress}%` }}>{overallProgress > 5 && <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse"></div>}</div></div>
            </div>
            <div className="flex flex-col md:flex-row w-full gap-6 mb-6">
                <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-lg flex flex-col">
                    <div className="aspect-video relative flex items-center justify-center bg-gray-800 cursor-pointer flex-grow" onClick={togglePlay}>
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-blue-600 to-gray-900 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                        {!isPlaying && !isCurrentCompleted && (<div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all z-10"><Play size={32} className="text-white ml-1" /></div>)}
                        {isPlaying && (<div className="opacity-0 hover:opacity-100 absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity z-10"><div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><Pause size={32} className="text-white" /></div></div>)}
                        {isCurrentCompleted && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10"><CheckCircle size={48} className="text-green-400 mb-2" /><span className="text-white font-bold mb-4">この動画は視聴完了しました</span>{currentVideoIndex < activePlaylist.length - 1 ? (<button onClick={(e) => { e.stopPropagation(); handleNextVideo(); }} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">次の動画へ <SkipForward size={16} className="ml-2" /></button>) : (<div className="text-blue-200 text-sm">全て完了しました。</div>)}<button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="mt-4 flex items-center text-xs text-gray-400 hover:text-white"><RotateCcw size={12} className="mr-1" /> もう一度見る</button></div>)}
                        <div className="absolute top-4 left-4 z-10"><span className="bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/20">再生中: {currentVideo.title}</span></div>
                    </div>
                    <div className="bg-gray-800 p-3">
                        <div className="flex items-center space-x-3 mb-2"><div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div></div></div>
                        <div className="flex justify-between items-center text-gray-400 text-xs"><span>{isPlaying ? '再生中' : '一時停止'}</span><span>{currentVideo.duration}</span></div>
                    </div>
                </div>
                <div className="w-full md:w-64 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center"><List size={16} className="text-gray-500 mr-2" /><span className="font-bold text-sm text-gray-700">再生リスト</span></div>
                    <div className="flex-1 overflow-y-auto">
                        {activePlaylist.map((video, index) => {
                            const isCompleted = completedVideoIds.includes(video.id);
                            const isActive = index === currentVideoIndex;
                            return (
                                <button key={video.id} onClick={() => selectVideo(index)} className={`w-full text-left p-3 border-b border-gray-100 transition-colors flex items-start ${isActive ? 'bg-blue-50' : 'hover:bg-white'}`}>
                                    <div className="mr-3 mt-0.5">{isCompleted ? (<CheckCircle size={16} className="text-green-500" />) : (<div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-blue-500' : 'border-gray-300'}`}>{isActive && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}</div>)}</div>
                                    <div><p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{video.title}</p><p className="text-xs text-gray-400 mt-0.5">{video.duration}</p></div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className={`w-full p-4 rounded-lg border transition-all duration-300 mb-6 ${isAllCompleted ? 'bg-blue-50 border-blue-100' : 'bg-gray-100 border-gray-200 opacity-70'}`}>
                <div className="flex flex-col">
                    {!isAllCompleted && (<p className="text-xs text-red-500 font-bold mb-2 flex items-center"><Lock size={12} className="mr-1" />全ての動画を最後まで視聴するとチェックが可能になります</p>)}
                    <label className={`flex items-center space-x-3 ${isAllCompleted ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input type="checkbox" name="checkVideo" checked={checkVideo} onChange={onCheckChange} disabled={!isAllCompleted} className={`w-6 h-6 rounded focus:ring-blue-500 ${isAllCompleted ? 'text-blue-600' : 'text-gray-400 bg-gray-200 border-gray-300'}`} />
                        <span className={`font-medium ${isAllCompleted ? 'text-gray-800' : 'text-gray-500'}`}>全ての動画を視聴し、内容を理解しました。</span>
                    </label>
                </div>
            </div>
            <button onClick={onNext} disabled={!checkVideo} className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all ${checkVideo ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>次へ進む <ChevronRight className="ml-2" /></button>
        </div>
    );
};

const CustomerFormStep = ({ data, onChange, onNext, onPrev }) => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">お客様情報の入力</h2>
        <div className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">お名前 (フルネーム)</label><input type="text" name="name" value={data.name} onChange={onChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="山田 太郎" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ご住所</label><input type="text" name="address" value={data.address} onChange={onChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="東京都..." /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label><input type="tel" name="phone" value={data.phone} onChange={onChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="090-1234-5678" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label><input type="email" name="email" value={data.email} onChange={onChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="example@email.com" /></div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mt-4"><h3 className="font-bold text-yellow-800 mb-2 flex items-center"><ShieldCheck size={18} className="mr-2"/> 確認事項</h3><ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mb-3"><li>動物愛護管理法に基づき、対面での説明を受けました。</li><li>ペットの飼育に必要な環境が整っています。</li></ul><label className="flex items-center space-x-3 cursor-pointer pt-2 border-t border-yellow-200"><input type="checkbox" name="checkTerms" checked={data.checkTerms} onChange={onChange} className="w-5 h-5 text-blue-600 rounded" /><span className="text-gray-800 font-medium text-sm">上記内容に同意します。</span></label></div>
        </div>
        <div className="flex justify-between mt-8"><button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">戻る</button><button onClick={onNext} disabled={!data.name || !data.address || !data.checkTerms} className={`px-8 py-3 rounded-lg font-bold text-white ${(!data.name || !data.address || !data.checkTerms) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>次へ (署名)</button></div>
    </div>
);

const SignatureStep = ({ signatureImage, onSaveSignature, onNext, onPrev }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    useEffect(() => { const canvas = canvasRef.current; if (canvas) { canvas.width = canvas.parentElement.clientWidth; canvas.height = 300; const ctx = canvas.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; if (signatureImage) { const img = new Image(); img.src = signatureImage; img.onload = () => ctx.drawImage(img, 0, 0); } } }, []);
    const startDrawing = (e) => { e.preventDefault(); setIsDrawing(true); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top; ctx.beginPath(); ctx.moveTo(x, y); };
    const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left; const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); };
    const stopDrawing = () => { setIsDrawing(false); if (canvasRef.current) onSaveSignature(canvasRef.current.toDataURL()); };
    const clearSignature = () => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); onSaveSignature(null); };
    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">ご署名</h2>
            <div className="border-2 border-dashed border-gray-400 rounded-lg mb-4 bg-gray-50 overflow-hidden touch-none relative" style={{ height: '304px' }}><canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full cursor-crosshair block" /><div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">署名欄</div></div>
            <div className="flex justify-end mb-6"><button onClick={clearSignature} className="text-sm text-red-600 flex items-center font-medium px-3 py-1 border border-red-200 rounded bg-red-50"><Trash2 size={14} className="mr-1"/> 書き直す</button></div>
            <div className="flex justify-between"><button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">戻る</button><button onClick={onNext} disabled={!signatureImage} className={`px-8 py-3 rounded-lg font-bold text-white ${!signatureImage ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>スタッフへ渡す</button></div>
        </div>
    );
};

const StaffInputStep = ({ fields, onFieldChange, onAdd, onRemove, onUpdateLabel, onNext, onPrev }) => {
    const [isEditingFields, setIsEditingFields] = useState(false);
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md border-t-4 border-indigo-500">
            <div className="flex justify-between items-start mb-6">
                <div><h2 className="text-2xl font-bold text-gray-800">店舗スタッフ入力画面</h2><p className="text-sm text-gray-500 mt-1">販売するペットの詳細情報を入力してください。</p></div>
                <div className="flex space-x-2">
                    <button onClick={() => setIsEditingFields(!isEditingFields)} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isEditingFields ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}><Settings size={16} className="mr-2" />{isEditingFields ? '入力完了' : '一時的な項目編集'}</button>
                </div>
            </div>
            {isEditingFields && <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-100 text-yellow-800 text-sm"><p className="font-bold mb-1">注意: ここでの編集はこの契約のみに適用されます</p>全ての契約に適用する項目変更は、管理画面の「契約書テンプレート」から行ってください。</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map((field) => (
                    <div key={field.id} className="relative group">
                        <div className="flex items-center justify-between mb-1">{isEditingFields ? <input type="text" value={field.label} onChange={(e) => onUpdateLabel(field.id, e.target.value)} className="text-sm font-bold text-indigo-700 bg-white border border-indigo-300 rounded px-2 py-1 w-full mr-2" /> : <label className="block text-sm font-bold text-gray-700">{field.label}</label>}{isEditingFields && <button onClick={() => onRemove(field.id)} className="text-red-500 p-1"><Trash2 size={16} /></button>}</div>
                        {field.type === 'select' ? <select value={field.value} onChange={(e) => onFieldChange(field.id, e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white"><option value="">選択してください</option>{field.options && field.options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select> : <input type={field.type} value={field.value} onChange={(e) => onFieldChange(field.id, e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder={field.placeholder || ''} />}
                    </div>
                ))}
                {isEditingFields && <button onClick={onAdd} className="flex items-center justify-center h-[74px] border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:bg-indigo-50"><Plus size={20} className="mr-2" />項目を追加</button>}
            </div>
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100"><button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600">戻る</button><button onClick={onNext} className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center shadow-lg"><FileText size={18} className="mr-2" />契約書を作成する</button></div>
        </div>
    );
};

const ContractPreviewStep = ({ customerData, staffFields, signatureImage, onPrev, onPrint, onFinish, companyInfo, templateName, documentsList, attachmentIds, isRemote = false }) => {
    const currentDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const attachedDocuments = documentsList.filter(doc => attachmentIds.includes(doc.id));

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl mb-6 flex justify-between items-center print:hidden">
                <h2 className="text-xl font-bold text-gray-800">契約内容の確認</h2>
                <div className="flex space-x-4">
                    <button onClick={onPrev} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white bg-white">修正する</button>
                    {!isRemote && <button onClick={onPrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"><Printer size={18} className="mr-2" /> 印刷 / 保存</button>}
                    {onFinish && <button onClick={onFinish} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md">{isRemote ? '送信する' : '接客終了'}</button>}
                </div>
            </div>
            
            {/* 契約書表面 */}
            <div id="contract-preview" className="bg-white p-12 shadow-2xl w-[210mm] min-h-[297mm] text-gray-900 leading-relaxed mx-auto print:shadow-none print:w-full print:m-0 print:p-0">
                <div className="text-center mb-10 border-b-2 border-gray-800 pb-4"><h1 className="text-3xl font-serif font-bold tracking-widest mb-2">{templateName || 'ペット生体売買契約書'}</h1><p className="text-sm text-right">作成日: {currentDate}</p></div>
                <div className="mb-8"><p className="mb-4">売主（以下「甲」という）と買主（以下「乙」という）は、以下の通りペット生体の売買契約を締結する。甲は乙に対し、動物愛護管理法に基づく現物確認および対面説明を行ったことを確認する。</p></div>
                <div className="mb-8"><h3 className="text-lg font-bold border-l-4 border-gray-800 pl-3 mb-4 bg-gray-100 py-1 print:bg-gray-100">1. 生体情報</h3>
                    <table className="w-full border-collapse border border-gray-400">
                        <tbody>
                            {staffFields.map(field => (
                                <tr key={field.id}>
                                    <th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">{field.label}</th>
                                    <td className="border border-gray-400 p-2">{field.value || (isRemote ? <span className="text-gray-400 italic">（店舗にて記入）</span> : 'ー')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mb-8"><h3 className="text-lg font-bold border-l-4 border-gray-800 pl-3 mb-4 bg-gray-100 py-1 print:bg-gray-100">2. 買主（乙）情報</h3><table className="w-full border-collapse border border-gray-400"><tbody><tr><th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">氏名</th><td className="border border-gray-400 p-2">{customerData.name}</td></tr><tr><th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">住所</th><td className="border border-gray-400 p-2">{customerData.address}</td></tr><tr><th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">電話番号</th><td className="border border-gray-400 p-2">{customerData.phone}</td></tr></tbody></table></div>
                <div className="mt-12 flex justify-end"><div className="w-1/2"><p className="mb-2 font-bold">署名（乙）:</p><div className="border-b border-gray-800 h-24 flex items-end justify-center relative">{signatureImage && (<img src={signatureImage} alt="Signature" className="max-h-20 object-contain absolute bottom-1" />)}<span className="text-xs text-gray-400 absolute bottom-0 right-0">電子署名</span></div><p className="text-right mt-1 text-sm">{currentDate}</p></div></div>
                <div className="mt-16 text-center text-sm text-gray-500 border-t pt-4"><p className="font-bold">{companyInfo?.name || '株式会社ペットショップ見本'}</p><p>{companyInfo?.address || '東京都渋谷区XX-XX'}</p><p>TEL: {companyInfo?.phone || '03-XXXX-XXXX'}</p></div>
            </div>

            {/* 裏面（添付資料）プレビュー */}
            {attachedDocuments.length > 0 && (
                <div className="mt-8 w-full max-w-4xl print:mt-0">
                    <p className="text-center text-gray-500 mb-2 print:hidden">--- 印刷時に以下の裏面/添付資料が含まれます ---</p>
                    {attachedDocuments.map(doc => (
                        <div key={doc.id} className="bg-white p-12 shadow-2xl w-[210mm] min-h-[297mm] mx-auto mb-8 print:shadow-none print:w-full print:m-0 print:p-0 print:break-before-page flex flex-col items-center justify-center border-2 border-dashed border-gray-200 print:border-none">
                            <div className="text-center p-10 border-4 border-gray-100 rounded-xl w-full h-full flex flex-col items-center justify-center">
                                <FileText size={64} className="text-gray-300 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-700 mb-2">{doc.title}</h2>
                                <p className="text-gray-500">{doc.filename}</p>
                                <p className="text-sm text-gray-400 mt-4">（実際の印刷時にはここにPDFの内容が印字されます）</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- リモート接客モード ---
const CustomerRemoteMode = ({ remoteSession, onComplete, videoPlaylist, staffTemplates, documentsList, flows, companyInfo }) => {
    const flow = flows.find(f => f.id === remoteSession.flowId) || flows[0];
    // リモート用のステップフィルタリング（スタッフ入力とプレビューを除く、またはプレビューを最後に持ってくる）
    // ここではシンプルに「動画」「顧客情報」「署名」「プレビュー（送信）」の順とする
    // 実際はflow定義に従うが、STAFF_INPUTはスキップする
    const remoteSteps = flow.steps.filter(s => s.type !== 'STAFF_INPUT');
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [customerData, setCustomerData] = useState({ name: '', address: '', phone: '', email: '', checkVideo: false, checkTerms: false });
    const [signatureImage, setSignatureImage] = useState(null);
    const [staffFields] = useState(JSON.parse(JSON.stringify(staffTemplates.find(t => t.id === flow.templateId)?.fields || [])));

    const currentStep = remoteSteps[currentStepIndex];
    const templateName = staffTemplates.find(t => t.id === flow.templateId)?.name;

    const nextStep = () => { if (currentStepIndex < remoteSteps.length - 1) setCurrentStepIndex(prev => prev + 1); };
    const prevStep = () => { if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1); };

    const handleCustomerChange = (e) => { const { name, value, type, checked } = e.target; setCustomerData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

    const renderStepContent = () => {
        switch (currentStep.type) {
            case 'VIDEO': return <VideoStep checkVideo={customerData.checkVideo} onCheckChange={handleCustomerChange} onNext={nextStep} videoPlaylist={videoPlaylist} stepConfig={currentStep} />;
            case 'CUSTOMER_INFO': return <CustomerFormStep data={customerData} onChange={handleCustomerChange} onNext={nextStep} onPrev={prevStep} />;
            case 'SIGNATURE': return <SignatureStep signatureImage={signatureImage} onSaveSignature={setSignatureImage} onNext={nextStep} onPrev={prevStep} />;
            case 'CONTRACT_PREVIEW': return <ContractPreviewStep customerData={customerData} staffFields={staffFields} signatureImage={signatureImage} onPrev={prevStep} onFinish={() => onComplete(remoteSession.id, { ...customerData, signatureImage })} companyInfo={companyInfo} templateName={templateName} documentsList={documentsList} attachmentIds={flow.attachmentIds} isRemote={true} />;
            default: return <div>Unknown Step</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <div className="bg-blue-600 text-white px-6 py-4 shadow-md mb-6">
                <h1 className="text-xl font-bold flex items-center"><Smartphone className="mr-2"/> 事前受付・入力</h1>
                <p className="text-blue-100 text-xs mt-1">ご自宅で事前に入力を済ませることで、当日の手続きがスムーズになります。</p>
            </div>
            <ProgressBar steps={remoteSteps} currentStepIndex={currentStepIndex} />
            <div className="container mx-auto px-4 pb-20">
                {renderStepContent()}
            </div>
        </div>
    );
};

// --- ログインページ（URLパラメータ対応） ---
const LoginPage = ({ onLoginAdmin, onLoginStaff, companyName }) => {
    // 簡易的なデモ用：URLパラメータ入力をエミュレート
    const [demoUrl, setDemoUrl] = useState('');
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-6 text-center"><h1 className="text-2xl font-bold text-white mb-2">{companyName || 'Pet Shop System'}</h1><p className="text-blue-100">販売管理・接客支援アプリ</p></div>
                <div className="p-8">
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><User className="text-blue-600" size={24} /></div><h3 className="font-bold text-gray-800 mb-2">接客スタッフの方</h3><p className="text-sm text-gray-500 mb-4">お客様への説明・契約作成を行います</p><button onClick={onLoginStaff} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-md flex items-center justify-center">接客を開始する <ChevronRight size={18} className="ml-1" /></button></div>
                        <div className="relative flex items-center py-2"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-sm">または</span><div className="flex-grow border-t border-gray-200"></div></div>
                        <div><button onClick={onLoginAdmin} className="w-full py-3 border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-bold rounded-lg transition-colors flex items-center justify-center"><Lock size={18} className="mr-2" />管理画面へログイン</button></div>
                        
                        {/* デモ用：顧客URLシミュレーター */}
                        <div className="pt-4 border-t mt-4">
                            <p className="text-xs text-gray-400 mb-2 text-center">デモ用: 発行されたURLを入力して移動</p>
                            <div className="flex">
                                <input type="text" placeholder="?sid=..." className="flex-1 border border-gray-300 rounded-l p-2 text-xs" value={demoUrl} onChange={(e)=>setDemoUrl(e.target.value)} />
                                <button onClick={() => window.location.search = demoUrl} className="bg-gray-200 px-3 rounded-r text-xs font-bold hover:bg-gray-300">GO</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400 border-t">© 2024 {companyName || 'Pet Shop Contract System'}</div>
            </div>
        </div>
    );
};

// --- 管理画面 (拡張) ---
const AdminDashboard = ({ onLogout, staffTemplates, setStaffTemplates, videoPlaylist, setVideoPlaylist, documentsList, setDocumentsList, flows, setFlows, companyInfo, setCompanyInfo, users, setUsers, sessions, setSessions }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedTemplateId, setSelectedTemplateId] = useState(staffTemplates[0]?.id);
    const [isSaved, setIsSaved] = useState(false);

    // ... (テンプレート、コンテンツ、フロー、設定のロジックは省略せずに記述) ...
    // --- 契約書テンプレート編集用 ---
    const activeTemplateIndex = staffTemplates.findIndex(t => t.id === selectedTemplateId);
    const activeTemplate = activeTemplateIndex >= 0 ? staffTemplates[activeTemplateIndex] : (staffTemplates.length > 0 ? staffTemplates[0] : null);
    const updateTemplateName = (name) => { if (!activeTemplate) return; const newTemplates = [...staffTemplates]; newTemplates.find(t => t.id === activeTemplate.id).name = name; setStaffTemplates(newTemplates); };
    const updateField = (fieldIndex, key, value) => { if (!activeTemplate) return; const newTemplates = [...staffTemplates]; newTemplates.find(t => t.id === activeTemplate.id).fields[fieldIndex][key] = value; setStaffTemplates(newTemplates); setIsSaved(false); };
    const addField = () => { if (!activeTemplate) return; const newTemplates = [...staffTemplates]; newTemplates.find(t => t.id === activeTemplate.id).fields.push({ id: `field_${Date.now()}`, label: '新しい項目', value: '', type: 'text', placeholder: '' }); setStaffTemplates(newTemplates); setIsSaved(false); };
    const removeField = (fieldIndex) => { if (!activeTemplate) return; const newTemplates = [...staffTemplates]; const tpl = newTemplates.find(t => t.id === activeTemplate.id); tpl.fields = tpl.fields.filter((_, i) => i !== fieldIndex); setStaffTemplates(newTemplates); setIsSaved(false); };
    const addNewTemplate = () => { const newId = `tpl_${Date.now()}`; const newTemplate = { id: newId, name: '新しいテンプレート', fields: [...DEFAULT_TEMPLATES[0].fields] }; setStaffTemplates([...staffTemplates, newTemplate]); setSelectedTemplateId(newId); };
    const deleteTemplate = (id) => { if (staffTemplates.length <= 1) return alert('最後のテンプレートは削除できません'); if (window.confirm('このテンプレートを削除してもよろしいですか？')) { setStaffTemplates(prev => prev.filter(t => t.id !== id)); if (selectedTemplateId === id) setSelectedTemplateId(staffTemplates[0].id); } };
    const saveTemplate = () => { setIsSaved(true); setTimeout(() => setIsSaved(false), 2000); };

    // --- コンテンツ管理用 ---
    const [contentTab, setContentTab] = useState('video');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [editingContentId, setEditingContentId] = useState(null);
    const [newContentData, setNewContentData] = useState({ title: '', duration: '', description: '', filename: '', type: 'PDF' });
    const openUploadModal = (content = null) => { if (content) { setEditingContentId(content.id); setNewContentData({ title: content.title, duration: content.duration || '', description: content.description || '', filename: content.filename || '', type: content.type || 'PDF' }); } else { setEditingContentId(null); setNewContentData({ title: '', duration: '', description: '', filename: '', type: 'PDF' }); } setUploadModalOpen(true); };
    const closeUploadModal = () => { setUploadModalOpen(false); setIsUploading(false); };
    const handleContentSave = () => { if (!newContentData.title) return; setIsUploading(true); setTimeout(() => { if (contentTab === 'video') { if (editingContentId) { setVideoPlaylist(prev => prev.map(v => v.id === editingContentId ? { ...v, ...newContentData } : v)); } else { const newVideo = { id: Date.now(), ...newContentData, duration: newContentData.duration || '2:00' }; setVideoPlaylist(prev => [...prev, newVideo]); } } else { if (editingContentId) { setDocumentsList(prev => prev.map(d => d.id === editingContentId ? { ...d, ...newContentData } : d)); } else { const newDoc = { id: `doc_${Date.now()}`, ...newContentData, filename: newContentData.filename || 'uploaded_file.pdf' }; setDocumentsList(prev => [...prev, newDoc]); } } closeUploadModal(); }, 800); };
    const deleteContent = (id) => { if (window.confirm('削除してもよろしいですか？')) { if (contentTab === 'video') setVideoPlaylist(prev => prev.filter(v => v.id !== id)); else setDocumentsList(prev => prev.filter(d => d.id !== id)); } };

    // --- フロー作成用 ---
    const [editingFlowId, setEditingFlowId] = useState(null);
    const [newFlowData, setNewFlowData] = useState({ name: '', description: '', templateId: '', attachmentIds: [] });
    const [editingSteps, setEditingSteps] = useState([]);
    const [flowModalOpen, setFlowModalOpen] = useState(false);
    const openFlowModal = (flow = null) => { if (flow) { setEditingFlowId(flow.id); setNewFlowData({ name: flow.name, description: flow.description || '', templateId: flow.templateId || staffTemplates[0].id, attachmentIds: flow.attachmentIds || [] }); setEditingSteps([...flow.steps]); } else { setEditingFlowId(null); setNewFlowData({ name: '', description: '', templateId: staffTemplates[0].id, attachmentIds: [] }); setEditingSteps([{ id: `s_${Date.now()}`, type: 'VIDEO', title: '動画ステップ', videoIds: [] }]); } setFlowModalOpen(true); };
    const addStep = () => { setEditingSteps([...editingSteps, { id: `s_${Date.now()}`, type: 'VIDEO', title: '新しいステップ', videoIds: [] }]); };
    const removeStep = (index) => { setEditingSteps(editingSteps.filter((_, i) => i !== index)); };
    const updateStep = (index, key, value) => { const newSteps = [...editingSteps]; newSteps[index][key] = value; setEditingSteps(newSteps); };
    const moveStep = (index, direction) => { if (direction === 'up' && index > 0) { const newSteps = [...editingSteps]; [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]; setEditingSteps(newSteps); } else if (direction === 'down' && index < editingSteps.length - 1) { const newSteps = [...editingSteps]; [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]]; setEditingSteps(newSteps); } };
    const handleVideoSelection = (stepIndex, videoId) => { const step = editingSteps[stepIndex]; const currentIds = step.videoIds || []; const newIds = currentIds.includes(videoId) ? currentIds.filter(id => id !== videoId) : [...currentIds, videoId]; updateStep(stepIndex, 'videoIds', newIds); };
    const handleAttachmentSelection = (docId) => { const currentIds = newFlowData.attachmentIds || []; const newIds = currentIds.includes(docId) ? currentIds.filter(id => id !== docId) : [...currentIds, docId]; setNewFlowData({ ...newFlowData, attachmentIds: newIds }); };
    const saveFlow = () => { if (!newFlowData.name) return; const flowData = { id: editingFlowId || `flow_${Date.now()}`, name: newFlowData.name, description: newFlowData.description, templateId: newFlowData.templateId, attachmentIds: newFlowData.attachmentIds, steps: editingSteps }; if (editingFlowId) { setFlows(prev => prev.map(f => f.id === editingFlowId ? flowData : f)); } else { setFlows(prev => [...prev, flowData]); } setFlowModalOpen(false); };
    const deleteFlow = (id) => { if (window.confirm('このフローを削除してもよろしいですか？')) { setFlows(prev => prev.filter(f => f.id !== id)); } };

    // --- 事前受付（リモートURL発行）管理 ---
    const [selectedFlowForSession, setSelectedFlowForSession] = useState(flows[0]?.id);
    
    const createSession = () => {
        const newSession = {
            id: Math.random().toString(36).substr(2, 9),
            flowId: selectedFlowForSession,
            flowName: flows.find(f => f.id === selectedFlowForSession)?.name,
            createdAt: new Date().toLocaleString(),
            status: 'unstarted', // unstarted, completed
            data: null
        };
        setSessions(prev => [newSession, ...prev]);
    };

    // --- 設定画面用 ---
    const [settingsTab, setSettingsTab] = useState('company');
    const [tempCompanyInfo, setTempCompanyInfo] = useState(companyInfo);
    const handleSaveCompany = () => { setCompanyInfo(tempCompanyInfo); alert('会社情報を保存しました'); };

    const MenuButton = ({ id, icon: Icon, label }) => (<button onClick={() => setActiveTab(id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Icon size={20} /><span className="font-medium">{label}</span></button>);
    
    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* サイドバー */}
            <div className="w-64 bg-white shadow-lg flex flex-col z-10">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800 flex items-center"><Settings className="mr-2 text-blue-600" />管理画面</h2></div>
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
                <div className="p-4 border-t bg-gray-50"><button onClick={onLogout} className="flex items-center text-red-600 hover:text-red-700 font-medium px-4 py-2 w-full"><LogOut size={18} className="mr-2" /> ログアウト</button></div>
            </div>
            
            {/* メインエリア */}
            <div className="flex-1 overflow-auto p-8 relative">
                {/* 事前受付管理画面 */}
                {activeTab === 'remote' && (
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">事前受付用URLの発行・管理</h2>
                        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                            <h3 className="font-bold text-lg mb-4">新規URL発行</h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">使用する接客フロー</label>
                                    <select 
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        value={selectedFlowForSession}
                                        onChange={(e) => setSelectedFlowForSession(e.target.value)}
                                    >
                                        {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={createSession} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center"><Link size={18} className="mr-2"/> URLを発行する</button>
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
                                        {sessions.map(session => (
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
                                                    <span className={`px-2 py-1 rounded-full text-xs ${session.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {session.status === 'completed' ? '入力完了' : '未実施'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {session.status === 'completed' && (
                                                        <button className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 px-2 py-1 rounded">内容確認・引継</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {sessions.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">発行済みのURLはありません</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 他のタブの中身（既存） */}
                {/* 簡略化のため、activeTabの条件分岐部分のみ再掲。中身は変更なし。 */}
                {activeTab === 'dashboard' && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]"><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-blue-50 p-6 rounded-xl border border-blue-100"><div className="flex items-center justify-between mb-4"><h3 className="text-blue-800 font-bold">今月の契約数</h3><FileText className="text-blue-500" /></div><p className="text-3xl font-bold text-gray-800">24 <span className="text-sm font-normal text-gray-500">件</span></p></div><div className="bg-green-50 p-6 rounded-xl border border-green-100"><div className="flex items-center justify-between mb-4"><h3 className="text-green-800 font-bold">売上高</h3><BarChart3 className="text-green-500" /></div><p className="text-3xl font-bold text-gray-800">¥4,820,000</p></div><div className="bg-purple-50 p-6 rounded-xl border border-purple-100"><div className="flex items-center justify-between mb-4"><h3 className="text-purple-800 font-bold">来店予約</h3><Calendar className="text-purple-500" /></div><p className="text-3xl font-bold text-gray-800">8 <span className="text-sm font-normal text-gray-500">組</span></p></div></div></div>)}
                {activeTab === 'template' && (<div className="max-w-5xl mx-auto"><div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"><div className="flex justify-between items-start mb-6"><div><h3 className="text-lg font-bold text-gray-800">契約書入力項目カスタマイズ</h3><p className="text-gray-500 text-sm mt-1">店舗スタッフが接客時に入力する項目のデフォルト設定を管理します。</p></div><div className="flex space-x-3"><button onClick={addField} className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"><Plus size={16} className="mr-2" /> 項目を追加</button><button onClick={saveTemplate} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md"><Save size={18} className="mr-2" /> 設定を保存</button></div></div>{isSaved && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200"><CheckCircle size={18} className="mr-2"/> 設定を保存しました</div>}<div className="flex gap-6 h-[600px]"><div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"><div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center"><span>テンプレート一覧</span><button onClick={addNewTemplate} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Plus size={18} /></button></div><div className="overflow-y-auto flex-1">{staffTemplates.map(tpl => (<button key={tpl.id} onClick={() => setSelectedTemplateId(tpl.id)} className={`w-full text-left px-4 py-3 border-b flex justify-between items-center ${selectedTemplateId === tpl.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}><span className="truncate">{tpl.name}</span></button>))}</div></div><div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">{activeTemplate ? (<><div className="flex justify-between items-start mb-6 border-b pb-4"><div className="flex-1 mr-4"><label className="block text-xs font-bold text-gray-500 mb-1">テンプレート名</label><input type="text" value={activeTemplate.name} onChange={(e) => updateTemplateName(e.target.value)} className="w-full text-xl font-bold text-gray-800 border-none focus:ring-0 p-0" /></div><div className="flex space-x-3"><button onClick={() => deleteTemplate(activeTemplate.id)} className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium border border-red-200"><Trash2 size={16} className="mr-2" /> 削除</button></div></div><div className="overflow-y-auto flex-1 pr-2"><table className="w-full text-left border-collapse"><thead className="bg-gray-50 sticky top-0 z-10"><tr><th className="p-3 text-sm font-semibold text-gray-600 w-1/4">項目名</th><th className="p-3 text-sm font-semibold text-gray-600 w-1/5">入力タイプ</th><th className="p-3 text-sm font-semibold text-gray-600 w-1/3">プレースホルダー</th><th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">削除</th></tr></thead><tbody className="divide-y divide-gray-100">{activeTemplate.fields.map((field, index) => (<tr key={field.id} className="hover:bg-gray-50"><td className="p-2"><input type="text" value={field.label} onChange={(e) => updateField(index, 'label', e.target.value)} className="w-full p-2 border border-gray-300 rounded" /></td><td className="p-2"><select value={field.type} onChange={(e) => updateField(index, 'type', e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white"><option value="text">テキスト</option><option value="number">数値</option><option value="date">日付</option><option value="select">選択肢</option></select></td><td className="p-2"><input type="text" value={field.placeholder || ''} onChange={(e) => updateField(index, 'placeholder', e.target.value)} className="w-full p-2 border border-gray-300 rounded" disabled={field.type === 'select' || field.type === 'date'} /></td><td className="p-2 text-center"><button onClick={() => removeField(index)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div></>) : (<div className="flex items-center justify-center h-full text-gray-400">テンプレートを選択してください</div>)}</div></div></div></div>)}
                {activeTab === 'upload' && (<div className="max-w-6xl mx-auto"><div className="flex space-x-1 mb-6 border-b"><button onClick={() => setContentTab('video')} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>動画コンテンツ</button><button onClick={() => setContentTab('document')} className={`px-6 py-3 font-bold rounded-t-lg transition-colors ${contentTab === 'document' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>ドキュメント (PDF等)</button></div><div className="flex justify-between items-center mb-6"><p className="text-gray-600">{contentTab === 'video' ? '接客時に再生する動画コンテンツを管理します。' : '契約書の裏面に印刷するPDF資料を管理します。'}</p><button onClick={() => openUploadModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"><Upload size={18} className="mr-2" /> 新規アップロード</button></div>{/* ... 省略 ... */ contentTab === 'video' ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{videoPlaylist.map((video) => (<div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow"><div className="aspect-video bg-gray-800 relative flex items-center justify-center"><div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div><Play size={40} className="text-white opacity-80" /><span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{video.duration}</span></div><div className="p-4"><h3 className="font-bold text-gray-800 mb-1 truncate">{video.title}</h3><p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden line-clamp-2">{video.description || '説明なし'}</p><div className="flex justify-between items-center border-t pt-3"><button onClick={() => openUploadModal(video)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"><Edit2 size={14} className="mr-1" /> 編集</button><button onClick={() => deleteContent(video.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"><Trash2 size={14} className="mr-1" /> 削除</button></div></div></div>))}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{documentsList.map((doc) => (<div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"><div className="h-40 bg-gray-100 flex items-center justify-center border-b"><FileText size={48} className="text-gray-400" /></div><div className="p-4"><div className="flex items-center mb-1"><span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded mr-2 font-bold">{doc.type}</span><h3 className="font-bold text-gray-800 truncate flex-1">{doc.title}</h3></div><p className="text-xs text-gray-500 mb-4">{doc.filename}</p><div className="flex justify-between items-center border-t pt-3"><button onClick={() => openUploadModal(doc)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"><Edit2 size={14} className="mr-1" /> 編集</button><button onClick={() => deleteContent(doc.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"><Trash2 size={14} className="mr-1" /> 削除</button></div></div></div>))}</div>)}
                {/* ... Upload Modal ... */}
                {uploadModalOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200"><div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800">{editingContentId ? '情報の編集' : '新規アップロード'} ({contentTab === 'video' ? '動画' : 'ドキュメント'})</h3><button onClick={closeUploadModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button></div><div className="p-6 space-y-4"><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors relative"><input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept={contentTab === 'video' ? "video/*" : "application/pdf"} /><div className="flex flex-col items-center justify-center">{contentTab === 'video' ? <Film size={32} className="text-blue-500 mb-2" /> : <FileText size={32} className="text-red-500 mb-2" />}<span className="text-sm font-medium text-gray-700">ファイルを選択</span></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label><input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={newContentData.title} onChange={(e) => setNewContentData({...newContentData, title: e.target.value})} placeholder={contentTab === 'video' ? "例: 1. 飼育環境の準備" : "例: 共通条項（裏面）"} /></div>{contentTab === 'video' && <div><label className="block text-sm font-medium text-gray-700 mb-1">再生時間 (分:秒)</label><input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" value={newContentData.duration} onChange={(e) => setNewContentData({...newContentData, duration: e.target.value})} placeholder="例: 3:45" /></div>}</div><div className="p-4 border-t bg-gray-50 flex justify-end space-x-3"><button onClick={closeUploadModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">キャンセル</button><button onClick={handleContentSave} disabled={!newContentData.title || isUploading} className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center ${(!newContentData.title || isUploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 shadow-md'}`}>{isUploading ? '保存中...' : '保存する'}</button></div></div></div>)}</div>)}
                {activeTab === 'flow' && (<div className="max-w-5xl mx-auto"><div className="flex justify-between items-center mb-6"><p className="text-gray-600">接客時の画面遷移フローを作成・編集します。</p><button onClick={() => openFlowModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md"><Plus size={18} className="mr-2" /> 新規フロー作成</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{flows.map(flow => (<div key={flow.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex justify-between items-start mb-4"><h3 className="text-lg font-bold text-gray-800">{flow.name}</h3><div className="flex space-x-2"><button onClick={() => openFlowModal(flow)} className="text-gray-400 hover:text-blue-600"><Edit2 size={18} /></button><button onClick={() => deleteFlow(flow.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button></div></div><p className="text-sm text-gray-500 mb-4 h-10">{flow.description}</p><div className="mb-2 text-xs bg-gray-100 p-2 rounded flex flex-col gap-1"><div><span className="font-bold text-gray-500 mr-2">テンプレート:</span>{staffTemplates.find(t => t.id === flow.templateId)?.name || '未設定'}</div><div><span className="font-bold text-gray-500 mr-2">添付資料:</span>{flow.attachmentIds?.length || 0} 件</div></div><div className="space-y-2">{flow.steps.map((step, idx) => (<div key={idx} className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded"><div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2">{idx + 1}</div>{step.title}</div>))}</div></div>))}</div>{flowModalOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"><div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800">{editingFlowId ? 'フロー編集' : '新規フロー作成'}</h3><button onClick={() => setFlowModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button></div><div className="flex-1 overflow-y-auto p-6"><div className="mb-6 grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">フロー名</label><input type="text" className="w-full p-2 border border-gray-300 rounded" value={newFlowData.name} onChange={(e) => setNewFlowData({...newFlowData, name: e.target.value})} placeholder="例: 里親募集用フロー" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">使用する契約書テンプレート</label><select className="w-full p-2 border border-gray-300 rounded bg-white" value={newFlowData.templateId} onChange={(e) => setNewFlowData({...newFlowData, templateId: e.target.value})}>{staffTemplates.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div><div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">説明</label><input type="text" className="w-full p-2 border border-gray-300 rounded" value={newFlowData.description} onChange={(e) => setNewFlowData({...newFlowData, description: e.target.value})} placeholder="用途などのメモ" /></div><div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200"><label className="block text-sm font-bold text-gray-700 mb-2">契約書の裏面・添付資料</label><div className="flex flex-wrap gap-2">{documentsList.map(doc => (<label key={doc.id} className={`flex items-center px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${(newFlowData.attachmentIds || []).includes(doc.id) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 hover:bg-gray-100'}`}><input type="checkbox" className="mr-2" checked={(newFlowData.attachmentIds || []).includes(doc.id)} onChange={() => handleAttachmentSelection(doc.id)} />{doc.title}</label>))}</div></div></div><div className="space-y-4"><div className="flex justify-between items-center"><h4 className="font-bold text-gray-700">ステップ構成</h4><button onClick={addStep} className="text-sm text-blue-600 hover:underline flex items-center"><Plus size={14} className="mr-1"/> ステップ追加</button></div>{editingSteps.map((step, index) => (<div key={step.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4"><div className="flex flex-col space-y-1 pt-2 text-gray-400"><button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30"><ArrowUp size={16} /></button><MoreVertical size={16} className="cursor-move" /><button onClick={() => moveStep(index, 'down')} disabled={index === editingSteps.length - 1} className="hover:text-blue-600 disabled:opacity-30"><ArrowDown size={16} /></button></div><div className="flex-1 space-y-3"><div className="flex gap-3"><div className="flex-1"><label className="text-xs text-gray-500">ステップ名</label><input type="text" value={step.title} onChange={(e) => updateStep(index, 'title', e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm bg-white" /></div><div className="w-1/3"><label className="text-xs text-gray-500">タイプ</label><select value={step.type} onChange={(e) => updateStep(index, 'type', e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm bg-white">{Object.entries(STEP_TYPES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}</select></div></div>{step.type === 'VIDEO' && (<div className="bg-white p-3 rounded border border-gray-200"><p className="text-xs font-bold text-gray-500 mb-2">再生する動画を選択</p><div className="space-y-2 max-h-32 overflow-y-auto">{videoPlaylist.map(video => (<label key={video.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={(step.videoIds || []).includes(video.id)} onChange={() => handleVideoSelection(index, video.id)} className="rounded text-blue-600" /><span>{video.title}</span><span className="text-gray-400 text-xs">({video.duration})</span></label>))}</div></div>)}</div><button onClick={() => removeStep(index)} className="text-gray-400 hover:text-red-500 pt-2"><Trash2 size={18} /></button></div>))}</div></div><div className="p-6 border-t bg-gray-50 flex justify-end space-x-3"><button onClick={() => setFlowModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white font-medium">キャンセル</button><button onClick={saveFlow} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">保存する</button></div></div></div>)}</div>)}
                {/* 既存の履歴・顧客・設定タブはそのまま */}
                {activeTab === 'history' && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]"><h3 className="text-lg font-bold text-gray-800 mb-4">契約履歴一覧</h3><div className="border rounded-lg overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-700 font-medium"><tr><th className="px-6 py-3">契約ID</th><th className="px-6 py-3">契約日</th><th className="px-6 py-3">お客様名</th><th className="px-6 py-3">ペット種類</th><th className="px-6 py-3">金額</th><th className="px-6 py-3">担当者</th><th className="px-6 py-3">ステータス</th><th className="px-6 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-gray-100">{MOCK_CONTRACTS.map((contract) => (<tr key={contract.id} className="hover:bg-gray-50"><td className="px-6 py-3 font-medium">{contract.id}</td><td className="px-6 py-3 text-gray-500">{contract.date}</td><td className="px-6 py-3">{contract.customer}</td><td className="px-6 py-3">{contract.type}</td><td className="px-6 py-3">{contract.price}</td><td className="px-6 py-3 text-gray-500">{contract.staff}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs ${contract.status === '完了' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{contract.status}</span></td><td className="px-6 py-3 text-right"><button className="text-blue-600 hover:text-blue-800 text-xs font-medium">詳細</button></td></tr>))}</tbody></table></div></div>)}
                {activeTab === 'customers' && (<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]"><h3 className="text-lg font-bold text-gray-800 mb-4">顧客情報管理</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{MOCK_CUSTOMERS.map((customer) => (<div key={customer.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"><div className="flex items-center mb-4"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-4"><User size={24} /></div><div><h4 className="font-bold text-gray-800">{customer.name}</h4><p className="text-xs text-gray-400">{customer.nameKana}</p></div></div><div className="space-y-2 text-sm text-gray-600 mb-4"><div className="flex items-center"><Phone size={14} className="mr-2 text-gray-400" /> {customer.phone}</div><div className="flex items-center"><Mail size={14} className="mr-2 text-gray-400" /> {customer.email}</div><div className="flex items-center"><Calendar size={14} className="mr-2 text-gray-400" /> 最終来店: {customer.lastVisit}</div><div className="mt-2 pt-2 border-t border-gray-100"><span className="text-xs text-gray-400">所有ペット:</span> <span className="font-medium">{customer.pet}</span></div></div><div className="flex justify-end space-x-2"><button className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50">編集</button><button className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 font-medium">詳細</button></div></div>))}</div></div>)}
                {activeTab === 'settings' && (<div className="max-w-6xl mx-auto"><div className="flex flex-col md:flex-row gap-6"><div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-2 h-fit"><button onClick={() => setSettingsTab('company')} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === 'company' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><Briefcase size={18} className="mr-3"/> 会社情報</button><button onClick={() => setSettingsTab('users')} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === 'users' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><Users size={18} className="mr-3"/> 権限・ユーザー管理</button><button onClick={() => setSettingsTab('other')} className={`w-full text-left px-4 py-3 rounded-lg mb-1 flex items-center ${settingsTab === 'other' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={18} className="mr-3"/> その他</button></div><div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[500px]">{settingsTab === 'company' && (<div><h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-4">会社基本情報</h3><div className="space-y-6 max-w-2xl"><div><label className="block text-sm font-bold text-gray-700 mb-2">会社名 / 店舗名</label><input type="text" value={tempCompanyInfo.name} onChange={(e) => setTempCompanyInfo({...tempCompanyInfo, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" /></div><div className="pt-6"><button onClick={handleSaveCompany} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md flex items-center"><Save size={18} className="mr-2" /> 保存する</button></div></div></div>)}</div></div></div>)}
            </div>
        </div>
    );
};

const CustomerServiceMode = ({ onLogout, staffTemplates, videoPlaylist, documentsList, flows, companyInfo }) => {
    const [selectedFlow, setSelectedFlow] = useState(null); 
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [customerData, setCustomerData] = useState({ name: '', address: '', phone: '', email: '', checkVideo: false, checkTerms: false });
    const [signatureImage, setSignatureImage] = useState(null);
    const [staffFields, setStaffFields] = useState([]);

    const handleFlowSelect = (flow) => {
        setSelectedFlow(flow);
        const template = staffTemplates.find(t => t.id === flow.templateId) || staffTemplates[0];
        setStaffFields(JSON.parse(JSON.stringify(template.fields)));
    };

    if (!selectedFlow) {
        return (
            <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl">
                    <div className="flex justify-between items-center mb-8"><h1 className="text-2xl font-bold text-gray-800">接客メニュー選択</h1><button onClick={onLogout} className="text-sm border border-gray-400 px-4 py-2 rounded-lg hover:bg-gray-200 text-gray-600">ログアウト</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {flows.map(flow => (
                            <button key={flow.id} onClick={() => handleFlowSelect(flow)} className="bg-white p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all text-left group">
                                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors"><List size={28} className="text-blue-600 group-hover:text-white" /></div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">{flow.name}</h2>
                                <p className="text-gray-500 text-sm mb-4">{flow.description}</p>
                                <div className="text-xs text-gray-400 flex flex-wrap gap-2">{flow.steps.map((step, i) => (<span key={i} className="bg-gray-100 px-2 py-1 rounded">{step.title}</span>))}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const currentStep = selectedFlow.steps[currentStepIndex];
    const nextStep = () => { if (currentStepIndex < selectedFlow.steps.length - 1) { setCurrentStepIndex(prev => prev + 1); } };
    const prevStep = () => { if (currentStepIndex > 0) { setCurrentStepIndex(prev => prev - 1); } else { if (window.confirm('メニュー選択に戻りますか？入力内容は破棄されます。')) { setSelectedFlow(null); setCustomerData({ name: '', address: '', phone: '', email: '', checkVideo: false, checkTerms: false }); setSignatureImage(null); } } };
    const handleCustomerChange = (e) => { const { name, value, type, checked } = e.target; setCustomerData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
    const handleStaffFieldChange = (id, value) => { setStaffFields(prev => prev.map(field => field.id === id ? { ...field, value } : field)); };
    const addStaffField = () => { const newId = `custom_${Date.now()}`; setStaffFields([...staffFields, { id: newId, label: '新しい項目', value: '', type: 'text', isCustom: true }]); };
    const removeStaffField = (id) => setStaffFields(prev => prev.filter(f => f.id !== id));
    const updateFieldLabel = (id, newLabel) => { setStaffFields(prev => prev.map(field => field.id === id ? { ...field, label: newLabel } : field)); };
    const handlePrint = () => window.print();
    const templateName = staffTemplates.find(t => t.id === selectedFlow.templateId)?.name;

    const renderStepContent = () => {
        switch (currentStep.type) {
            case 'VIDEO': return <VideoStep checkVideo={customerData.checkVideo} onCheckChange={handleCustomerChange} onNext={nextStep} videoPlaylist={videoPlaylist} stepConfig={currentStep} />;
            case 'CUSTOMER_INFO': return <CustomerFormStep data={customerData} onChange={handleCustomerChange} onNext={nextStep} onPrev={prevStep} />;
            case 'SIGNATURE': return <SignatureStep signatureImage={signatureImage} onSaveSignature={setSignatureImage} onNext={nextStep} onPrev={prevStep} />;
            case 'STAFF_INPUT': return <StaffInputStep fields={staffFields} onFieldChange={handleStaffFieldChange} onAdd={addStaffField} onRemove={removeStaffField} onUpdateLabel={updateFieldLabel} onNext={nextStep} onPrev={prevStep} />;
            case 'CONTRACT_PREVIEW': return <ContractPreviewStep customerData={customerData} staffFields={staffFields} signatureImage={signatureImage} onPrev={prevStep} onPrint={handlePrint} onFinish={() => setSelectedFlow(null)} companyInfo={companyInfo} templateName={templateName} documentsList={documentsList} attachmentIds={selectedFlow.attachmentIds} />;
            default: return <div>Unknown Step Type</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-10 print:bg-white print:pb-0 relative">
            <style>{`@media print { @page { margin: 15mm; size: A4; } body { -webkit-print-color-adjust: exact; } .print\\:break-before-page { break-before: page; } }`}</style>
            <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center print:hidden"><span className="text-sm font-medium opacity-70">接客中: {selectedFlow.name}</span><button onClick={onLogout} className="text-xs border border-gray-600 px-3 py-1 rounded hover:bg-gray-700">接客を終了してログアウト</button></div>
            <ProgressBar steps={selectedFlow.steps} currentStepIndex={currentStepIndex} />
            <div className="container mx-auto px-4 print:p-0 print:w-full print:max-w-none">{renderStepContent()}</div>
        </div>
    );
};

const App = () => {
    const [currentView, setCurrentView] = useState('login');
    const [staffTemplates, setStaffTemplates] = useState(DEFAULT_TEMPLATES);
    const [videoPlaylist, setVideoPlaylist] = useState(DEFAULT_VIDEO_PLAYLIST);
    const [documentsList, setDocumentsList] = useState(DEFAULT_DOCUMENTS);
    const [flows, setFlows] = useState(DEFAULT_FLOWS);
    const [companyInfo, setCompanyInfo] = useState({ name: '株式会社ペットショップ見本', address: '東京都渋谷区XX-XX', phone: '03-XXXX-XXXX' });
    const [users, setUsers] = useState(MOCK_STAFF_USERS);

    // リモートセッション管理
    const [sessions, setSessions] = useState([]);
    const [remoteSession, setRemoteSession] = useState(null);

    // URLパラメータからセッションIDを取得し、顧客用モードへ遷移
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sid = params.get('sid');
        if (sid) {
            // 本来はAPI経由でセッション確認するが、ここでは簡易的に既存データから検索
            // デモ用にセッションが見つからない場合はダミーを作成
            const session = sessions.find(s => s.id === sid) || { id: sid, flowId: flows[0].id, status: 'unstarted' };
            setRemoteSession(session);
            setCurrentView('remote_customer');
        }
    }, []);

    const handleLoginAdmin = () => setCurrentView('admin');
    const handleLoginStaff = () => setCurrentView('service');
    const handleLogout = () => {
        setCurrentView('login');
        setRemoteSession(null);
        window.history.pushState({}, '', window.location.pathname); // URLパラメータクリア
    };

    // リモート接客完了時の処理
    const handleRemoteComplete = (sessionId, data) => {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'completed', data } : s));
        alert('送信が完了しました。店舗スタッフにお知らせください。');
        handleLogout();
    };

    return (
        <>
            {currentView === 'login' && <LoginPage onLoginAdmin={handleLoginAdmin} onLoginStaff={handleLoginStaff} companyName={companyInfo.name} />}
            {currentView === 'admin' && (
                <AdminDashboard 
                    onLogout={handleLogout} 
                    staffTemplates={staffTemplates} setStaffTemplates={setStaffTemplates}
                    videoPlaylist={videoPlaylist} setVideoPlaylist={setVideoPlaylist}
                    documentsList={documentsList} setDocumentsList={setDocumentsList}
                    flows={flows} setFlows={setFlows}
                    companyInfo={companyInfo} setCompanyInfo={setCompanyInfo}
                    users={users} setUsers={setUsers}
                    sessions={sessions} setSessions={setSessions}
                />
            )}
            {currentView === 'service' && (
                <CustomerServiceMode 
                    onLogout={handleLogout} 
                    staffTemplates={staffTemplates}
                    videoPlaylist={videoPlaylist}
                    documentsList={documentsList}
                    flows={flows}
                    companyInfo={companyInfo}
                />
            )}
            {currentView === 'remote_customer' && remoteSession && (
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


