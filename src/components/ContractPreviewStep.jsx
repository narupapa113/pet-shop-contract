import React from "react";
import { FileText, Printer } from "lucide-react";

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
  const attachedDocuments = documentsList.filter((doc) => attachmentIds.includes(doc.id));

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold text-gray-800">契約内容の確認</h2>
        <div className="flex space-x-4">
          <button onClick={onPrev} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-white bg-white">
            修正する
          </button>
          {!isRemote && (
            <button onClick={onPrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-md">
              <Printer size={18} className="mr-2" /> 印刷 / 保存
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
        <div className="mt-12 flex justify-end">
          <div className="w-1/2">
            <p className="mb-2 font-bold">署名（乙）:</p>
            <div className="border-b border-gray-800 h-24 flex items-end justify-center relative">
              {signatureImage && (
                <img src={signatureImage} alt="Signature" className="max-h-20 object-contain absolute bottom-1" />
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

export default ContractPreviewStep;
