"use client";

import { useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";

export default function BgTest() {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [seconds, setSeconds] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBefore(URL.createObjectURL(file));
    setAfter(null);
    setSeconds(null);
    setStatus("准备中……");

    const t0 = performance.now();
    try {
        const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : 0;
          setStatus(`模型下载/处理中：${pct}%（首次要下几十MB模型，耐心等）`);
        },
      });
      setAfter(URL.createObjectURL(blob));
      setSeconds(Math.round((performance.now() - t0) / 1000));
      setStatus("完成 ✅");
    } catch (err) {
      setStatus("报错：" + String(err));
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Background Removal Demo</h1>
      <p className="mt-2 text-sm text-gray-400">技术验证页 · 不进主界面</p>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <button
        onClick={() => inputRef.current?.click()}
        className="mt-8 rounded-lg bg-black px-6 py-3 font-medium text-white"
      >
        选一张人像照片
      </button>

      {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
      {seconds !== null && <p className="mt-1 text-sm text-gray-500">耗时 {seconds} 秒</p>}

      <div className="mt-8 flex flex-wrap justify-center gap-8">
        {before && (
          <div>
            <p className="mb-2 text-center text-xs text-gray-400">原图</p>
            <img src={before} alt="before" className="max-h-96 rounded-lg border border-gray-300" />
          </div>
        )}
        {after && (
          <div>
            <p className="mb-2 text-center text-xs text-gray-400">去背景后（白底预览）</p>
            <img src={after} alt="after" className="max-h-96 rounded-lg border border-gray-300 bg-white" />
          </div>
        )}
      </div>
    </main>
  );
}