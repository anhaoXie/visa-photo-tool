"use client";

import { useRef, useState } from "react";
import { removeBackground } from "@imgly/background-removal";

const SPECS = [
  // oval: 椭圆参考线 = 官方头部要求。top/h 占框高比例，w 占框宽比例
  { id: "us", label: "US Visa 2×2 in", w: 600, h: 600, oval: { top: 0.11, h: 0.60, w: 0.45 } },
  { id: "schengen", label: "Schengen 35×45 mm", w: 413, h: 531, oval: { top: 0.07, h: 0.75, w: 0.69 } },
  { id: "china", label: "China 33×48 mm", w: 390, h: 567, oval: { top: 0.08, h: 0.63, w: 0.56 } },
];

export default function Home() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });  // 照片原始尺寸
  const [spec, setSpec] = useState(SPECS[0]);              // 当前规格
  const [scale, setScale] = useState(1);                   // 显示缩放
  const [baseScale, setBaseScale] = useState(1);           // "刚好铺满框"的缩放（缩放下限）
  const [offset, setOffset] = useState({ x: 0, y: 0 });    // 拖动的位移
  const [removeBg, setRemoveBg] = useState(false);  // 是否AI去背景
  const [busy, setBusy] = useState(false);          // 正在处理（防连点）
  const [progress, setProgress] = useState("");     // 进度提示

  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // 屏幕上的裁剪框：宽320px，高按规格比例算
  const frameW = 320;
  const frameH = Math.round((frameW * spec.h) / spec.w);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgSrc(URL.createObjectURL(file));
  }

  // 照片加载完：记住原始尺寸，算一个"刚好铺满框"的缩放
  function onImgLoad() {
    const img = imgRef.current!;
    const size = { w: img.naturalWidth, h: img.naturalHeight };
    setImgSize(size);
    const bs = Math.max(frameW / size.w, frameH / size.h);
    setBaseScale(bs);
    setScale(bs);
    setOffset({ x: 0, y: 0 });
  }

  // 换规格：框变形状，重新铺满
  function onSpecChange(s: (typeof SPECS)[number]) {
    setSpec(s);
    if (!imgSize.w) return;
    const fh = Math.round((frameW * s.h) / s.w);
    const bs = Math.max(frameW / imgSize.w, fh / imgSize.h);
    setBaseScale(bs);
    setScale(bs);
    setOffset({ x: 0, y: 0 });
  }

  // 限制位移：照片必须始终盖住整个框，不能拖出空洞
  function clamp(x: number, y: number) {
    const minX = Math.min(0, frameW - imgSize.w * scale);
    const minY = Math.min(0, frameH - imgSize.h * scale);
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };
  }

  // 拖动三件套
  function onPointerDown(e: React.PointerEvent) {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(clamp(
      drag.current.ox + (e.clientX - drag.current.sx),
      drag.current.oy + (e.clientY - drag.current.sy)
    ));
  }
  function onPointerUp() {
    drag.current = null;
  }
      // 核心：裁剪 →（可选）AI去背景贴白底 → 下载
  async function onCrop() {
    const img = imgRef.current;
    if (!img || busy) return;
    setBusy(true);
    setProgress("");

    // 第一步：裁剪（坐标换算和原来一样）
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = spec.w;
    cropCanvas.height = spec.h;
    const cctx = cropCanvas.getContext("2d")!;
    cctx.fillStyle = "#ffffff";
    cctx.fillRect(0, 0, spec.w, spec.h);
    cctx.drawImage(img, -offset.x / scale, -offset.y / scale, frameW / scale, frameH / scale, 0, 0, spec.w, spec.h);

    try {
      if (!removeBg) {
        // 不去背景：和原来一样直接导出
        cropCanvas.toBlob((blob) => blob && download(blob), "image/jpeg", 0.95);
      } else {
        // 去背景：裁剪结果 → AI → 贴到白底 → 导出
        const croppedBlob: Blob = await new Promise((res) => cropCanvas.toBlob((b) => res(b!), "image/jpeg", 0.95));
        const cutBlob = await removeBackground(croppedBlob, {
          progress: (key, current, total) => {
            const pct = total ? Math.round((current / total) * 100) : 0;
            setProgress(`AI removing background: ${pct}% (first run downloads model, please wait)`);
          },
        });
        const cutImg = new Image();
        cutImg.src = URL.createObjectURL(cutBlob);
        await cutImg.decode();
        const out = document.createElement("canvas");
        out.width = spec.w;
        out.height = spec.h;
        const octx = out.getContext("2d")!;
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, spec.w, spec.h);
        octx.drawImage(cutImg, 0, 0, spec.w, spec.h);
        out.toBlob((blob) => blob && download(blob), "image/jpeg", 0.95);
      }
    } catch (err) {
      setProgress("Background removal failed: " + String(err));
    }
    setBusy(false);
  }

  function download(blob: Blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `visa-photo-${spec.id}.jpg`;
    a.click();
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900">Visa Photo Crop</h1>
      <p className="mt-3 max-w-md text-center text-gray-500">
        Crop your visa photo to the exact official size — free, private, no sign-up.
      </p>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {!imgSrc ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="mt-10 w-full max-w-md cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center text-gray-400 hover:border-gray-500"
        >
          Click to upload your photo
        </div>
      ) : (
        <>
          {/* 裁剪框：overflow-hidden 是关键——超出框的部分被"剪掉"（视觉上） */}
          <div
            className="mt-10 cursor-move touch-none overflow-hidden rounded-lg border-2 border-black bg-gray-200"
            style={{ width: frameW, height: frameH, position: "relative" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={onImgLoad}
              draggable={false}
              alt="uploaded"
              className="absolute max-w-none select-none"
              style={{ left: offset.x, top: offset.y, width: imgSize.w * scale }}

            />
                                    {/* 人脸参考线：按各规格官方头部比例，位置偏上（下方留下巴和肩膀） */}
            <div
              className="pointer-events-none absolute rounded-[50%] border-2 border-dashed border-white/80"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                top: frameH * spec.oval.top,
                width: frameW * spec.oval.w,
                height: frameH * spec.oval.h,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
              }}
            />
          </div>
          <input
            type="range"
            min={baseScale}
            max={baseScale * 3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-4 w-80"
          />
          <p className="mt-2 text-xs text-gray-400">Drag to adjust · Align your head within the oval</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-3 text-sm text-gray-500 underline hover:text-gray-800"
          >
            Choose another photo
          </button>
        </>
      )}

      {/* 规格按钮：选中的变黑 */}
      <div className="mt-6 flex gap-3">
        {SPECS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSpecChange(s)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              spec.id === s.id ? "border-black bg-black text-white" : "border-gray-300 bg-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
        Remove background with AI (beta, slower)
      </label>

      <button
        onClick={onCrop}
        disabled={!imgSrc || busy}
        className="mt-4 rounded-lg bg-black px-8 py-3 font-medium text-white disabled:opacity-30"
      >
        {busy ? "Processing..." : "Crop & Download"}
      </button>
      {progress && <p className="mt-2 max-w-xs text-center text-xs text-gray-500">{progress}</p>}
      

      <p className="mt-6 text-xs text-gray-400">Your photo never leaves your device.</p>
    </main>
  );
}