import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { supabase } from "../lib/supabase";
import { FileText } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

async function renderPdfToDataUrl(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = 400 / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: scaledViewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}

const PdfCardThumbnail = ({ path, thumbnailPath }) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path && !thumbnailPath) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      try {
        if (thumbnailPath) {
          const { data, error } = await supabase.storage.from("files").download(thumbnailPath);
          if (!cancelled && !error && data) {
            const url = URL.createObjectURL(data);
            setDataUrl(url);
            setLoading(false);
            return;
          }
        }
        if (path) {
          const { data, error } = await supabase.storage.from("files").download(path);
          if (!cancelled && !error && data) {
            const ab = await data.arrayBuffer();
            const url = await renderPdfToDataUrl(ab);
            if (!cancelled) setDataUrl(url);
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [path, thumbnailPath]);

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
