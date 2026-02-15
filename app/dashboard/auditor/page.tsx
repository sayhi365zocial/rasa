import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuditorDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'AUDITOR' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  // Get today's date for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get closings waiting for cash collection (SUBMITTED)
  const pendingCollection = await db.dailyClosing.findMany({
    where: {
      status: 'SUBMITTED',
    },
    include: {
      branch: true,
      submitter: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'asc',
    },
    take: 20,
  })

  // Get closings with cash received, waiting for deposit (CASH_RECEIVED)
  const pendingDeposit = await db.dailyClosing.findMany({
    where: {
      status: 'CASH_RECEIVED',
    },
    include: {
      branch: true,
    },
    orderBy: {
      submittedAt: 'asc',
    },
    take: 20,
  })

  // Get stats
  const stats = {
    pendingCollection: await db.dailyClosing.count({
      where: { status: 'SUBMITTED' },
    }),
    pendingDeposit: await db.dailyClosing.count({
      where: { status: 'CASH_RECEIVED' },
    }),
    completedToday: await db.dailyClosing.count({
      where: {
        status: 'DEPOSITED',
        updatedAt: {
          gte: today,
        },
      },
    }),
    totalCashToCollect: await db.dailyClosing.aggregate({
      where: { status: 'SUBMITTED' },
      _sum: {
        handwrittenNetCash: true,
      },
    }),
  }

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: null,
      }}
    >
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          ยินดีต้อนรับ, {user.firstName}! 👋
        </h2>
        <p className="text-gray-600 mt-1">ตรวจสอบและรับเงินจากสาขา</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            รอรับเงิน
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.pendingCollection}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            รอนำฝาก
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.pendingDeposit}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            เงินที่ต้องเก็บ
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.totalCashToCollect._sum.handwrittenNetCash?.toNumber() || 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">บาท</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ฝากวันนี้
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats.completedToday}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
        </div>
      </div>

      {/* Pending Cash Collection */}
      <div className="bg-white border border-gray-200 rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              รอรับเงินจากสาขา
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              สาขาส่งยอดแล้ว รอการเก็บเงิน
            </p>
          </div>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
            {stats.pendingCollection} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          {pendingCollection.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สาขา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    เงินสดรอนำฝาก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ส่งโดย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ส่งเมื่อ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingCollection.map((closing: typeof pendingCollection[0]) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {closing.branch.branchName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {closing.branch.branchCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(closing.closingDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(closing.handwrittenCashCount.toNumber())}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {closing.submitter.firstName} {closing.submitter.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {closing.submittedAt
                        ? formatDate(closing.submittedAt)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <a
                        href={`/dashboard/auditor/closings/${closing.id}`}
                        className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md"
                      >
                        รับเงิน
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-12">
              ไม่มีรายการรอรับเงิน
            </div>
          )}
        </div>
      </div>

      {/* Pending Deposit */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              รอนำฝากธนาคาร
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              รับเงินแล้ว รอนำฝากธนาคาร
            </p>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
            {stats.pendingDeposit} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          {pendingDeposit.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สาขา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    เงินสดรอนำฝาก
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingDeposit.map((closing: typeof pendingDeposit[0]) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {closing.branch.branchName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {closing.branch.branchCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(closing.closingDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(closing.handwrittenCashCount.toNumber())}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <a
                        href={`/dashboard/auditor/deposits/new?closingId=${closing.id}`}
                        className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md"
                      >
                        นำฝาก
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-12">
              ไม่มีรายการรอนำฝาก
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
