export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">ไม่พบหน้าที่คุณต้องการ</p>
        <a
          href="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium inline-block"
        >
          กลับหน้าหลัก
        </a>
      </div>
    </div>
  )
}
