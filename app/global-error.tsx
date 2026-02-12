'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="th">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-xl text-gray-600 mb-4">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-gray-500 mb-8">{error.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                ลองอีกครั้ง
              </button>
              <a
                href="/"
                className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md font-medium inline-block"
              >
                กลับหน้าหลัก
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
