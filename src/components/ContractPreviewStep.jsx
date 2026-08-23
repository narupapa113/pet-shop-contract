import React, { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import A4ScaledPreview from "./A4ScaledPreview";

async function downloadFromStorage(path) {
  const result = await supabase.storage.from("files").download(path);
  if (!result.error && result.data) return result.data;
  const fallback = await supabase.storage.from("documents").download(path);
  if (!fallback.error && fallback.data) return fallback.data;
  return null;
}

// iPadOS13+ はSafariがMacを偽装するため、touch判定を併用して見破る
function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// 端末によらず、Canvasが危険なサイズにならないようscaleを決める
function resolveCanvasScale(element) {
  // iOS/iPadOS Safari が安定して扱えるおおよその総ピクセル数の上限
  const MAX_CANVAS_PIXELS = isIOSDevice() ? 6_000_000 : 24_000_000;
  const baseScale = isIOSDevice() ? 1.5 : 2;

  const w = element.offsetWidth || 794;
  const h = element.offsetHeight || 1123;
  const estimated = w * h * baseScale * baseScale;

  if (estimated <= MAX_CANVAS_PIXELS) return baseScale;

  // 上限を超える場合は安全なscaleまで下げる
  const safeScale = Math.sqrt(MAX_CANVAS_PIXELS / (w * h));
  return Math.max(1, Math.min(baseScale, safeScale));
}

const DocPageImages = ({ doc }) => {
  const [pageUrls, setPageUrls] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!doc.path) { setLoaded(true); return; }
    const basename = doc.path.replace(/\.[^.]+$/, "");
    const pageCount = doc.pageCount || 1;
    let cancelled = false;
    (async () => {
      const urls = await Promise.all(
        Array.from({ length: pageCount }, async (_, i) => {
          const { data } = await supabase.storage.from("files").createSignedUrl(
            `thumbnails/${basename}_p${i + 1}.jpg`, 3600
          );
          return data?.signedUrl || null;
        })
      );
      if (!cancelled) {
        setPageUrls(urls.filter(Boolean));
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [doc.path, doc.pageCount]);

  if (!loaded) {
    return (
      <A4ScaledPreview>
        <div className="bg-white shadow-2xl w-[210mm] min-h-[297mm] mx-auto mb-8 flex items-center justify-center">
          <p className="text-sm text-gray-400">読み込み中...</p>
        </div>
      </A4ScaledPreview>
    );
  }

  if (pageUrls.length === 0) {
    return (
      <A4ScaledPreview>
        <div className="bg-white shadow-2xl w-[210mm] min-h-[100px] mx-auto mb-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 p-8">
          <FileText size={40} className="text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">{doc.title}</p>
        </div>
      </A4ScaledPreview>
    );
  }

  return (
    <>
      {pageUrls.map((url, i) => (
        <A4ScaledPreview key={i}>
          <div className="bg-white shadow-2xl w-[210mm] mx-auto mb-4 overflow-hidden">
            <img src={url} alt={`${doc.title} ${i + 1}ページ`} className="w-full block" />
          </div>
        </A4ScaledPreview>
      ))}
    </>
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
  // preserve selection order from attachmentIds
  const attachedDocuments = (attachmentIds || [])
    .map((id) => documentsList.find((doc) => doc.id === id))
    .filter(Boolean);

  const [generating, setGenerating] = useState(false);

  const generateMergedPdf = async () => {
    setGenerating(true);
    try {
      const element = document.getElementById("contract-preview");

      // iPad/iOSのCanvasメモリ制限を避けるためscaleを動的決定
      const scale = resolveCanvasScale(element);

      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      // PNGはデータ量が大きくiOSで破損しやすいためJPEGを使用
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      // iOS Safariでは容量超過時にtoDataURLが空/壊れた値を返すことがある
      if (!imgData || imgData === "data:," || imgData.length < 1000) {
        throw new Error(
          "Canvas画像の生成に失敗しました（端末のメモリ制限の可能性があります）"
        );
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidthMm = pageWidth;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      if (imgHeightMm <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidthMm, imgHeightMm);
      } else {
        const fitHeightMm = pageHeight;
        const fitWidthMm = (canvas.width * fitHeightMm) / canvas.height;
        const offsetX = (pageWidth - fitWidthMm) / 2;
        pdf.addImage(imgData, "JPEG", offsetX, 0, fitWidthMm, fitHeightMm);
      }

      const contractBytes = pdf.output("arraybuffer");
      const mergedPdf = await PDFDocument.create();
      const contractDoc = await PDFDocument.load(contractBytes);
      const contractPages = await mergedPdf.copyPages(
        contractDoc,
        contractDoc.getPageIndices()
      );
      contractPages.forEach((p) => mergedPdf.addPage(p));

      // attachmentIds order
      for (const doc of attachedDocuments) {
        if (!doc.path) continue;
        const data = await downloadFromStorage(doc.path);
        if (!data) {
          console.error("添付PDF取得エラー:", doc.path);
          continue;
        }
        const ab = await data.arrayBuffer();
        try {
          const attachDoc = await PDFDocument.load(ab);
          const attachPages = await mergedPdf.copyPages(
            attachDoc,
            attachDoc.getPageIndices()
          );
          attachPages.forEach((p) => mergedPdf.addPage(p));
        } catch (e) {
          // 1つの添付が壊れていても全体を止めないようにスキップ
          console.error("添付PDFの読み込みに失敗（スキップ）:", doc.path, e);
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // window.open はiPad Safariでブロックされやすいため、aタグでダウンロード保存する
      const safeName = (customerData?.name || "顧客").replace(/[\\/:*?"<>|]/g, "");
      const safeTemplate = (templateName || "契約書").replace(/[\\/:*?"<>|]/g, "");
      const storeName = (companyInfo?.name && companyInfo.name.trim())
        ? companyInfo.name.trim().replace(/[\\/:*?"<>|]/g, "")
        : "店舗未設定";
      const now = new Date();
      const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `${yyyymmdd}_${safeTemplate}_${safeName}様_${storeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("PDF生成エラー:", err);
      alert("PDFの生成に失敗しました: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  };

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
              onClick={generateMergedPdf}
              disabled={generating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md disabled:opacity-50"
            >
              <Download size={18} className="mr-2" />
              {generating ? "PDF生成中..." : "PDFを保存 / 印刷"}
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

      <A4ScaledPreview>
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
        <div className="mt-6 flex justify-end">
          <div className="w-1/2">
            <p className="mb-2 font-bold">署名（乙）:</p>
            <div className="border-b border-gray-800 h-20 flex items-end justify-center relative">
              {signatureImage && (
                <img
                  src={signatureImage}
                  alt="Signature"
                  className="max-h-16 object-contain absolute bottom-1"
                  crossOrigin="anonymous"
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
      </A4ScaledPreview>

      {/* 添付資料プレビュー（選択順で表示） */}
      {attachedDocuments.length > 0 && (
        <div className="mt-8 w-full print:hidden">
          <p className="text-center text-gray-500 mb-4 text-sm">
            --- 添付資料プレビュー（PDF保存ボタンで契約書と結合されます） ---
          </p>
          {attachedDocuments.map((doc) => (
            <DocPageImages key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractPreviewStep;
