export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16">
      {/* 标题区 */}
      <h1 className="text-4xl font-bold text-gray-900">Visa Photo Crop</h1>
      <p className="mt-3 max-w-md text-center text-gray-500">
        Crop your visa photo to the exact official size — free, private, no sign-up.
      </p>

      {/* 上传区（占位，明天接逻辑） */}
      <div className="mt-10 w-full max-w-md rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
        Click to upload your photo
      </div>

      {/* 规格选择区 */}
      <div className="mt-6 flex gap-3">
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">
          US Visa 2×2 in
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">
          Schengen 35×45 mm
        </button>
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">
          China 33×48 mm
        </button>
      </div>

      {/* 主按钮 */}
      <button className="mt-8 rounded-lg bg-black px-8 py-3 font-medium text-white">
        Crop &amp; Download
      </button>

      {/* 隐私卖点 */}
      <p className="mt-6 text-xs text-gray-400">
        Your photo never leaves your device.
      </p>
    </main>
  );
}