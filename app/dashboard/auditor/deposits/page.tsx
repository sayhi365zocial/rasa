import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DepositsListPage() {
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

  // Get all deposits
  const deposits = await db.deposit.findMany({
    include: {
      dailyClosing: {
        include: {
          branch: true,
        },
      },
      depositor: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      depositDate: 'desc',
    },
  })

  // Calculate summary stats
  const stats = {
    totalDeposits: deposits.length,
    totalAmount: deposits.reduce(
      (sum: number, d: typeof deposits[0]) => sum + d.depositAmount.toNumber(),
      0
    ),
    thisMonth: deposits.filter((d: typeof deposits[0]) => {
      const depositMonth = new Date(d.depositDate).getMonth()
      const currentMonth = new Date().getMonth()
      return depositMonth === currentMonth
    }).length,
    thisMonthAmount: deposits
      .filter((d: typeof deposits[0]) => {
        const depositMonth = new Date(d.depositDate).getMonth()
        const currentMonth = new Date().getMonth()
        return depositMonth === currentMonth
      })
      .reduce((sum: number, d: typeof deposits[0]) => sum + d.depositAmount.toNumber(), 0),
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ประวัติการนำฝากธนาคาร
            </h2>
            <p className="text-gray-600 mt-1">
              รายการการนำฝากเงินสดทั้งหมด
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/dashboard/auditor/deposits/new"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
            >
              + นำฝากธนาคาร
            </a>
            <a
              href="/dashboard/auditor"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              ← กลับ
            </a>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            จำนวนการนำฝาก
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalDeposits}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ยอดรวมทั้งหมด
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.totalAmount)}
          </div>
          <div className="text-sm text-gray-500 mt-1">บาท</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            เดือนนี้
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.thisMonth}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ยอดเดือนนี้
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.thisMonthAmount)}
          </div>
          <div className="text-sm text-gray-500 mt-1">บาท</div>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            รายการนำฝาก ({deposits.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          {deposits.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่นำฝาก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สาขา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ธนาคาร
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    จำนวนเงิน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    นำฝากโดย
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    สลิป
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deposits.map((deposit: typeof deposits[0]) => (
                  <tr key={deposit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(deposit.depositDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {deposit.dailyClosing.branch.branchName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {deposit.dailyClosing.branch.branchCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {deposit.bankName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {deposit.accountNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-base font-semibold text-gray-900">
                        {formatCurrency(deposit.depositAmount.toNumber())}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deposit.depositor.firstName}{' '}
                      {deposit.depositor.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <a
                        href={deposit.depositSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        ดูสลิป
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-12">
              ไม่มีรายการนำฝาก
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
