import { Play, User, PenTool, Settings, FileText } from "lucide-react";

export const STEP_TYPES = {
  VIDEO: { label: "動画説明", icon: Play },
  CUSTOMER_INFO: { label: "お客様情報", icon: User },
  SIGNATURE: { label: "署名", icon: PenTool },
  STAFF_INPUT: { label: "店舗入力", icon: Settings },
  CONTRACT_PREVIEW: { label: "契約書発行", icon: FileText },
};

export const DEFAULT_TEMPLATES = [
  {
    id: "tpl_standard",
    name: "標準売買契約書",
    fields: [
      { id: "pet_type", label: "ペットの種類", value: "", type: "text", placeholder: "例：トイプードル" },
      { id: "pet_color", label: "毛色", value: "", type: "text", placeholder: "例：レッド" },
      { id: "pet_gender", label: "性別", value: "", type: "select", options: ["オス", "メス", "不明"] },
      { id: "pet_birthday", label: "生年月日", value: "", type: "date" },
      { id: "pet_price", label: "生体価格 (円)", value: "", type: "number" },
      { id: "microchip", label: "マイクロチップ番号", value: "", type: "text" },
    ],
  },
  {
    id: "tpl_adoption",
    name: "譲渡誓約書（里親用）",
    fields: [
      { id: "pet_type", label: "種類", value: "", type: "text", placeholder: "例：雑種（犬）" },
      { id: "pet_name", label: "仮名", value: "", type: "text", placeholder: "保護時の名前" },
      { id: "pet_gender", label: "性別", value: "", type: "select", options: ["オス", "メス", "不明"] },
      { id: "pet_age", label: "推定年齢", value: "", type: "text", placeholder: "例：3歳くらい" },
      { id: "health_condition", label: "健康状態", value: "", type: "text", placeholder: "特記事項なし" },
      { id: "transfer_fee", label: "譲渡費用 (円)", value: "", type: "number", placeholder: "ワクチン代等実費" },
    ],
  },
];

export const DEFAULT_VIDEO_PLAYLIST = [];

export const DEFAULT_DOCUMENTS = [
  { id: "doc_1", title: "販売契約 共通条項（裏面）", filename: "terms_common.pdf", type: "PDF" },
  { id: "doc_2", title: "飼育の注意点・マナー", filename: "guide_manner.pdf", type: "PDF" },
  { id: "doc_3", title: "店舗連絡先・アフターケア", filename: "shop_contact.pdf", type: "PDF" },
  { id: "doc_4", title: "里親譲渡規約", filename: "adoption_rules.pdf", type: "PDF" },
];

export const DEFAULT_FLOWS = [
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

export const MOCK_CONTRACTS = [
  { id: "C001", date: "2024/05/20", customer: "山田 太郎", type: "トイプードル", price: "¥480,000", staff: "佐藤 花子", status: "完了" },
  { id: "C002", date: "2024/05/19", customer: "鈴木 一郎", type: "チワワ", price: "¥350,000", staff: "田中 次郎", status: "完了" },
];

export const MOCK_STAFF_USERS = [
  { id: 1, name: "本部 太郎", email: "admin@petshop.co.jp", role: "管理者", lastLogin: "2024/05/21 09:00" },
  { id: 2, name: "佐藤 花子", email: "sato@petshop.co.jp", role: "店長", lastLogin: "2024/05/21 08:45" },
];
