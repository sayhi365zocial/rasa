import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function StaffDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'STORE_STAFF' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
    include: { branch: true },
  })

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: user.branch,
      }}
    >
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          ยินดีต้อนรับ, {user.firstName}! 👋
        </h2>
        <p className="text-gray-600 mt-1">
          วันที่: {new Date().toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ยอดวันนี้
          </div>
          <div className="text-2xl font-bold text-gray-900">ยังไม่ส่งยอด</div>
          <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            + สร้างใหม่
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">สถานะ</div>
          <div className="text-lg text-gray-700">รอส่งยอด</div>
          <div className="text-sm text-gray-500 mt-1">เวลา 23:30 น.</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            สรุปเดือนนี้
          </div>
          <div className="text-2xl font-bold text-gray-900">12/12</div>
          <div className="text-sm text-gray-500 mt-1">ส่งยอดแล้ว</div>
        </div>
      </div>

      {/* Recent List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            รายการย้อนหลัง (7 วัน)
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            ไม่มีรายการ
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
