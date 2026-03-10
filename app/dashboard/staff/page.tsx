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

  if (currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN') {
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

  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  const todayClosing = await db.dailyClosing.findFirst({
    where: {
      branchId: user.branchId!,
      closingDate: {
        gte: today,
        lte: endOfToday,
      },
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
      status: {
        in: ['SUBMITTED', 'CASH_RECEIVED', 'DEPOSITED', 'COMPLETED'],
      },
    },
  })

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // Get deposits pending staff confirmation
  const pendingStaffConfirmation = await db.deposit.findMany({
    where: {
      dailyClosing: {
        branchId: user.branchId!,
      },
      isStaffConfirmed: false,
      approvalStatus: {
        in: ['APPROVED', 'BANK_CONFIRMED'],
      },
    },
    include: {
      dailyClosing: {
        include: {
          branch: true,
        },
      },
      depositor: true,
    },
    orderBy: {
      depositedAt: 'desc',
    },
    take: 5,
  })

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ยินดีต้อนรับ, {user.firstName}! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              {user.branch?.branchName} • {formatDate(new Date())}
            </p>
          </div>
          {!todayClosing && (
            <a
              href="/dashboard/staff/closings/new"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              + ส่งยอดวันนี้
            </a>
          )}
          {todayClosing && todayClosing.status === 'DRAFT' && (
            <a
              href={`/dashboard/staff/closings/${todayClosing.id}`}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              ส่งยอดที่บันทึกไว้
            </a>
          )}
        </div>
      </div>

      {/* Alert if not submitted today */}
      {!todayClosing && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-orange-800">ยังไม่ได้ส่งยอดวันนี้</h3>
              <p className="mt-1 text-sm text-orange-700">กรุณาส่งยอดขายประจำวันให้เรียบร้อย</p>
            </div>
            <a
              href="/dashboard/staff/closings/new"
              className="ml-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md whitespace-nowrap"
            >
              ส่งยอดเลย
            </a>
          </div>
        </div>
      )}

      {todayClosing && todayClosing.status === 'DRAFT' && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">มีฉบับร่างยังไม่ได้ส่ง</h3>
              <p className="mt-1 text-sm text-yellow-700">คุณมีรายการปิดยอดที่บันทึกไว้แต่ยังไม่ได้ส่ง</p>
            </div>
            <a
              href={`/dashboard/staff/closings/${todayClosing.id}`}
              className="ml-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md whitespace-nowrap"
            >
              แก้ไขและส่ง
            </a>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ยอดวันนี้
          </div>
          {todayClosing ? (
            <>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(todayClosing.posTotalSales.toNumber())}
              </div>
              <div className="text-sm text-gray-500 mt-1">บาท</div>
              <div className="mt-3">
                <StatusBadge status={todayClosing.status} />
              </div>
              {todayClosing.status === 'DRAFT' && (
                <a
                  href={`/dashboard/staff/closings/${todayClosing.id}`}
                  className="mt-3 w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors block text-center"
                >
                  แก้ไขและส่ง
                </a>
              )}
              {todayClosing.status !== 'DRAFT' && (
                <a
                  href={`/dashboard/staff/closings/${todayClosing.id}`}
                  className="mt-3 w-full border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 px-4 rounded-md transition-colors block text-center"
                >
                  ดูรายละเอียด
                </a>
              )}
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-400">-</div>
              <div className="text-sm text-gray-500 mt-1">ยังไม่ได้ส่งยอด</div>
              <a
                href="/dashboard/staff/closings/new"
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors block text-center"
              >
                + เริ่มส่งยอด
              </a>
            </>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">สถานะ</div>
          {todayClosing ? (
            <>
              <div className="text-lg text-gray-700">
                {STATUS_LABELS[todayClosing.status as keyof typeof STATUS_LABELS]}
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

      {/* Pending Staff Confirmation */}
      {pendingStaffConfirmation.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-blue-900">
                รอยืนยันการฝากเงิน ({pendingStaffConfirmation.length})
              </h3>
              <span className="text-sm text-blue-700">
                กรุณาตรวจสอบยอดที่ผู้ตรวจสอบนำฝากว่าตรงกับยอดที่ส่งหรือไม่
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่ฝาก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่ส่งยอด
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดที่ส่ง
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดที่ฝาก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้นำฝาก
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingStaffConfirmation.map((deposit: typeof pendingStaffConfirmation[0]) => {
                  const submittedAmount = deposit.dailyClosing.handwrittenNetCash.toNumber()
                  const depositedAmount = deposit.depositAmount.toNumber()
                  const difference = depositedAmount - submittedAmount
                  const hasVariance = Math.abs(difference) > 0.01

                  return (
                    <tr key={deposit.id} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(deposit.depositDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(deposit.dailyClosing.closingDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(submittedAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <div className={hasVariance ? 'text-orange-600 font-semibold' : 'text-gray-900'}>
                          {formatCurrency(depositedAmount)}
                        </div>
                        {hasVariance && (
                          <div className="text-xs text-orange-600 mt-0.5">
                            ({difference > 0 ? '+' : ''}{formatCurrency(difference)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {deposit.depositor.firstName} {deposit.depositor.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <a
                          href={`/dashboard/staff/deposits/${deposit.id}/confirm`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          ตรวจสอบและยืนยัน
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    เงินสดนำส่ง
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentClosings.map((closing: typeof recentClosings[0]) => (
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
                      {formatCurrency(closing.handwrittenCashCount.toNumber())}
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
