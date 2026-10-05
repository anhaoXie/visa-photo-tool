"use client";

import { useRef, useState } from "react";

const SPECS = [
  { id: "us", label: "US Visa 2×2 in", w: 600, h: 600 },
  { id: "schengen", label: "Schengen 35×45 mm", w: 413, h: 531 },
  { id: "china", label: "China 33×48 mm", w: 390, h: 567 },
];

export default function Home() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });  // 照片原始尺寸
  const [spec, setSpec] = useState(SPECS[0]);              // 当前规格
  const [scale, setScale] = useState(1);                   // 显示缩放
  const [baseScale, setBaseScale] = useState(1);           // "刚好铺满框"的缩放（缩放下限）
  const [offset, setOffset] = useState({ x: 0, y: 0 });    // 拖动的位移
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
    // 核心：把屏幕上框住的区域，按规格像素画到画布上，导出下载
    function onCrop() {
      const img = imgRef.current;
      if (!img) return;
  
      const canvas = document.createElement("canvas"); // 内存里造一块画布
      canvas.width = spec.w;   // 画布的尺寸 = 官方规格像素
      canvas.height = spec.h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";  // 先铺白底（防透明PNG变黑）
      ctx.fillRect(0, 0, spec.w, spec.h);
  
      // 屏幕框 → 原图区域的换算（除法 = 把显示像素还原成原始像素）
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = frameW / scale;
      const sh = frameH / scale;
  
      // 从原图的(sx, sy, sw, sh)区域，画到画布的(0, 0, 规格宽, 规格高)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, spec.w, spec.h);
  
      // 画布 → 文件 → 触发下载
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `visa-photo-${spec.id}.jpg`;
        a.click();
      }, "image/jpeg", 0.95);
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
            // 核心：把屏幕上框住的区域，按规格像素画到画布上，导出下载
            
            
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
          <p className="mt-2 text-xs text-gray-400">Drag to adjust</p>
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

      <button
        onClick={onCrop}
        disabled={!imgSrc}
        className="mt-8 rounded-lg bg-black px-8 py-3 font-medium text-white disabled:opacity-30"
      >
        Crop &amp; Download
      </button>
      

      <p className="mt-6 text-xs text-gray-400">Your photo never leaves your device.</p>
    </main>
  );
}