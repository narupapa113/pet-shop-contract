import React, { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";

async function downloadFromStorage(path) {
  const result = await supabase.storage.from("files").download(path);
  if (!result.error && result.data) return result.data;
  const fallback = await supabase.storage.from("documents").download(path);
  if (!fallback.error && fallback.data) return fallback.data;
  return null;
}

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

  const [pdfUrls, setPdfUrls] = useState({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let createdUrls = [];
    let cancelled = false;

    const fetchUrls = async () => {
      const entries = await Promise.all(
        attachedDocuments.map(async (doc) => {
          if (!doc.path) return [doc.id, null];
          const data = await downloadFromStorage(doc.path);
          if (!data) return [doc.id, null];
          const blobUrl = URL.createObjectURL(data);
          createdUrls.push(blobUrl);
          return [doc.id, blobUrl];
        })
      );
      if (!cancelled) setPdfUrls(Object.fromEntries(entries));
    };

    if (attachedDocuments.length > 0) fetchUrls();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [(attachmentIds || []).join(",")]);

  const generateMergedPdf = async () => {
    setGenerating(true);
    try {
      const element = document.getElementById("contract-preview");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidthMm = pageWidth;
      const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      if (imgHeightMm <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidthMm, imgHeightMm);
      } else {
        const fitHeightMm = pageHeight;
        const fitWidthMm = (canvas.width * fitHeightMm) / canvas.height;
        const offsetX = (pageWidth - fitWidthMm) / 2;
        pdf.addImage(imgData, "PNG", offsetX, 0, fitWidthMm, fitHeightMm);
      }

      const contractBytes = pdf.output("arraybuffer");
      const mergedPdf = await PDFDocument.create();
      const contractDoc = await PDFDocument.load(contractBytes);
      const contractPages = await mergedPdf.copyPages(contractDoc, contractDoc.getPageIndices());
      contractPages.forEach((p) => mergedPdf.addPage(p));

      // attachmentIds order
      for (const doc of attachedDocuments) {
        if (!doc.path) continue;
        const data = await downloadFromStorage(doc.path);
        if (!data) { console.error("添付PDF取得エラー:", doc.path); continue; }
        const ab = await data.arrayBuffer();
        const attachDoc = await PDFDocument.load(ab);
        const attachPages = await mergedPdf.copyPages(attachDoc, attachDoc.getPageIndices());
        attachPages.forEach((p) => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
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
          <button onClick={onPrev} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white bg-white">
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
            <button onClick={onFinish} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md">
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
                  <th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">{field.label}</th>
                  <td className="border border-gray-400 p-2">
                    {field.value || (isRemote ? <span className="text-gray-400 italic">（店舗にて記入）</span> : "ー")}
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
                <th className="border border-gray-400 p-2 bg-gray-50 w-1/3 text-left font-bold print:bg-gray-50">氏名</th>
                <td className="border border-gray-400 p-2">{customerData.name}</td>
              </tr>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">住所</th>
                <td className="border border-gray-400 p-2">{customerData.address}</td>
              </tr>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-50 text-left font-bold print:bg-gray-50">電話番号</th>
                <td className="border border-gray-400 p-2">{customerData.phone}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-1/2">
            <p className="mb-2 font-bold">署名（乙）:</p>
            <div className="border-b border-gray-800 h-20 flex items-end justify-center relative">
              {signatureImage && (
                <img src={signatureImage} alt="Signature" className="max-h-16 object-contain absolute bottom-1" crossOrigin="anonymous" />
              )}
              <span className="text-xs text-gray-400 absolute bottom-0 right-0">電子署名</span>
            </div>
            <p className="text-right mt-1 text-sm">{currentDate}</p>
          </div>
        </div>
        <div className="mt-16 text-center text-sm text-gray-500 border-t pt-4">
          <p className="font-bold">{companyInfo?.name || "株式会社ペットショップ見本"}</p>
          <p>{companyInfo?.address || "東京都渋谷区XX-XX"}</p>
          <p>TEL: {companyInfo?.phone || "03-XXXX-XXXX"}</p>
        </div>
      </div>

      {/* 添付資料プレビュー（選択順で表示） */}
      {attachedDocuments.length > 0 && (
        <div className="mt-8 w-full max-w-4xl print:hidden">
          <p className="text-center text-gray-500 mb-2">
            --- 添付資料プレビュー（PDF保存ボタンで契約書と結合されます） ---
          </p>
          {attachedDocuments.map((doc) => {
            const url = pdfUrls[doc.id];
            return (
              <div
                key={doc.id}
                className="bg-white shadow-2xl w-[210mm] min-h-[297mm] mx-auto mb-8 overflow-hidden"
              >
                {url ? (
                  <iframe src={`${url}#zoom=page-width`} title={doc.title} className="w-full h-[297mm] border-0" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[297mm] border-2 border-dashed border-gray-200 p-10">
                    <FileText size={64} className="text-gray-300 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-700 mb-2">{doc.title}</h2>
                    <p className="text-gray-500">{doc.filename}</p>
                    <p className="text-sm text-gray-400 mt-4">PDFを読み込み中...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContractPreviewStep;
