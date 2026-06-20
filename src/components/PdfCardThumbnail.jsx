import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { supabaseAdmin } from "../lib/supabase";
import { FileText } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PdfCardThumbnail = ({ path }) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) { setLoading(false); return; }
    let cancelled = false;

    const render = async () => {
      try {
        const { data, error } = await supabaseAdmin.storage.from("files").download(path);
        if (cancelled || error || !data) { if (!cancelled) setLoading(false); return; }

        const arrayBuffer = await data.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1 });
        const scale = 400 / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvasContext: canvas.getContext("2d"), viewport: scaledViewport }).promise;

        if (!cancelled) {
          setDataUrl(canvas.toDataURL("image/jpeg", 0.85));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [path]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <span className="text-xs text-gray-400">読み込み中...</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <FileText size={40} className="text-gray-300 mb-1" />
        <span className="text-xs text-gray-400">PDF</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden bg-white">
      <img src={dataUrl} alt="PDF thumbnail" className="w-full h-full object-cover object-top" />
    </div>
  );
};

export default PdfCardThumbnail;
