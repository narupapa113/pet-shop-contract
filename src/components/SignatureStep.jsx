import React, { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

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
      <div className="border-2 border-dashed border-gray-400 rounded-lg mb-4 bg-gray-50 overflow-hidden touch-none relative" style={{ height: "304px" }}>
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
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">署名欄</div>
      </div>
      <div className="flex justify-end mb-6">
        <button onClick={clearSignature} className="text-sm text-red-600 flex items-center font-medium px-3 py-1 border border-red-200 rounded bg-red-50">
          <Trash2 size={14} className="mr-1" /> 書き直す
        </button>
      </div>
      <div className="flex justify-between">
        <button onClick={onPrev} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
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

export default SignatureStep;
