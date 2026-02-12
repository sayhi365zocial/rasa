import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // Get today's closing
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayClosing = await db.dailyClosing.findFirst({
    where: {
      branchId: user.branchId!,
      closingDate: today,
    },
  })

  // Get recent closings (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentClosings = await db.dailyClosing.findMany({
    where: {
      branchId: user.branchId!,
      closingDate: {
        gte: sevenDaysAgo,
      },
    },
    orderBy: {
      closingDate: 'desc',
    },
    take: 10,
  })

  // Get stats for current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const completedThisMonth = await db.dailyClosing.count({
    where: {
      branchId: user.branchId!,
      closingDate: {
        gte: startOfMonth,
      },
      status: 'COMPLETED',
    },
  })

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

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
          วันที่: {formatDate(new Date())}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ยอดวันนี้
          </div>
          {todayClosing ? (
            <>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(todayClosing.posTotalSales.toNumber())} บาท
              </div>
              <div className="mt-2">
                <StatusBadge status={todayClosing.status} />
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">ยังไม่ส่งยอด</div>
              <a
                href="/dashboard/staff/closings/new"
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors block text-center"
              >
                + สร้างใหม่
              </a>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">สถานะ</div>
          {todayClosing ? (
            <>
              <div className="text-lg text-gray-700">
                {STATUS_LABELS[todayClosing.status]}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {todayClosing.submittedAt
                  ? `ส่งเมื่อ ${formatDate(todayClosing.submittedAt)}`
                  : 'ยังไม่ได้ส่ง'}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg text-gray-700">รอส่งยอด</div>
              <div className="text-sm text-gray-500 mt-1">
                เวลา {new Date().toLocaleTimeString('th-TH')}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            สรุปเดือนนี้
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {completedThisMonth}/{daysInMonth}
          </div>
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
        <div className="overflow-x-auto">
          {recentClosings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดขาย
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เงินสดสุทธิ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentClosings.map((closing) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(closing.closingDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={closing.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(closing.posTotalSales.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(closing.handwrittenNetCash.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <a
                        href={`/dashboard/staff/closings/${closing.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        ดูรายละเอียด
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-12">
              ไม่มีรายการ
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray'
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      {label}
    </span>
  )
}
