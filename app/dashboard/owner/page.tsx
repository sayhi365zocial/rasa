import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RecentDepositsTable } from '@/components/owner/RecentDepositsTable'
import { BranchRevenueReport } from '@/components/owner/BranchRevenueReport'
import { BranchDailyStatusTable } from '@/components/dashboard/BranchDailyStatusTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OwnerDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  // Get date range for last 30 days
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  // Get all branches
  const branches = await db.branch.findMany({
    orderBy: { branchName: 'asc' },
  })

  // Get overall stats
  const stats = {
    totalBranches: branches.length,
    // รอ Auditor ไปรับเงินที่สาขา (สาขากดส่งยอดแล้ว)
    waitingForCollection: await db.dailyClosing.count({
      where: { status: 'SUBMITTED' },
    }),
    // รอนำฝาก (Auditor รับเงินแล้ว รอไปฝากธนาคาร)
    waitingForDeposit: await db.dailyClosing.count({
      where: { status: 'CASH_RECEIVED' },
    }),
    // ฝากเรียบร้อยแล้ว
    deposited: await db.dailyClosing.count({
      where: { status: 'DEPOSITED' },
    }),
    // ยอดเงินฝากเรียบร้อยแล้ว (30 วัน)
    depositedAmount30Days: await db.deposit.aggregate({
      where: {
        depositDate: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      _sum: {
        depositAmount: true,
      },
    }),
    // ยอดเงินรอนำฝาก
    waitingDepositAmount: await db.dailyClosing.aggregate({
      where: { status: 'CASH_RECEIVED' },
      _sum: {
        handwrittenCashCount: true,
      },
    }),
    // ยอดเงินรอรับจากสาขา
    waitingCollectionAmount: await db.dailyClosing.aggregate({
      where: { status: 'SUBMITTED' },
      _sum: {
        handwrittenCashCount: true,
      },
    }),
  }

  // Get recent deposits (last 10)
  const recentDeposits = await db.deposit.findMany({
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
      approver: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      depositDate: 'desc',
    },
    take: 10,
  })

  // Get daily sales summary per branch (last 30 days)
  const branchDailySales = await Promise.all(
    branches.map(async (branch: typeof branches[0]) => {
      const salesSummary = await db.dailyClosing.aggregate({
        where: {
          branchId: branch.id,
          closingDate: {
            gte: thirtyDaysAgo,
            lte: today,
          },
          status: {
            in: ['SUBMITTED', 'CASH_RECEIVED', 'DEPOSITED'],
          },
        },
        _sum: {
          posTotalSales: true,
          posCash: true,
          posCredit: true,
          posTransfer: true,
          posExpenses: true,
          handwrittenCashCount: true,
        },
        _count: {
          id: true,
        },
      })

      return {
        branch,
        summary: salesSummary,
      }
    })
  )

  // Get today's closing status for each branch
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const branchStatuses = await Promise.all(
    branches.map(async (branch: typeof branches[0]) => {
      const closing = await db.dailyClosing.findFirst({
        where: {
          branchId: branch.id,
          closingDate: todayDate,
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
        },
      })

      return {
        branchId: branch.id,
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        status: closing?.status || null,
        closingId: closing?.id || null,
        submittedAt: closing?.submittedAt || null,
      }
    })
  )

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
          ภาพรวมระบบ
        </h2>
        <p className="text-gray-600 mt-1">ติดตามประสิทธิภาพทุกสาขา</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* รอ Auditor ไปรับ */}
        <div className="bg-white border border-orange-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            รอ Auditor ไปรับเงิน
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.waitingForCollection}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
          <div className="text-lg font-semibold text-orange-700 mt-2">
            {formatCurrency(stats.waitingCollectionAmount._sum.handwrittenCashCount?.toNumber() || 0)}
          </div>
          <div className="text-xs text-gray-500">สาขากดส่งยอดแล้ว</div>
        </div>

        {/* รอนำฝาก */}
        <div className="bg-white border border-purple-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            รอนำฝากธนาคาร
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.waitingForDeposit}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
          <div className="text-lg font-semibold text-purple-700 mt-2">
            {formatCurrency(stats.waitingDepositAmount._sum.handwrittenCashCount?.toNumber() || 0)}
          </div>
          <div className="text-xs text-gray-500">Auditor รับเงินแล้ว</div>
        </div>

        {/* ฝากเรียบร้อย */}
        <div className="bg-white border border-green-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ฝากเรียบร้อยแล้ว
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats.deposited}
          </div>
          <div className="text-sm text-gray-500 mt-1">รายการ</div>
          <div className="text-lg font-semibold text-green-700 mt-2">
            {formatCurrency(stats.depositedAmount30Days._sum.depositAmount?.toNumber() || 0)}
          </div>
          <div className="text-xs text-gray-500">ยอดฝาก 30 วันล่าสุด</div>
        </div>
      </div>

      {/* Branch Daily Status - Today */}
      <div className="mb-8">
        <BranchDailyStatusTable initialDate={todayDate} initialBranchStatuses={branchStatuses} />
      </div>

      {/* Branch Revenue Report */}
      <div className="mb-8">
        <BranchRevenueReport />
      </div>

      {/* Branch Daily Sales Summary */}
      <div className="bg-white border border-gray-200 rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            สรุปยอดขายรายวันแต่ละสาขา (30 วันล่าสุด)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            ยอดขายรวมและช่องทางการชำระเงินของแต่ละสาขา
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  สาขา
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  จำนวนวัน
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  ยอดขายรวม
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  เงินสด
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  บัตรเครดิต
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  โอนเงิน
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  ค่าใช้จ่าย
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  เงินนำฝาก
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branchDailySales.map(({ branch, summary }: typeof branchDailySales[0]) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {branch.branchName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {branch.branchCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {summary._count.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-base font-semibold text-blue-600">
                      {formatCurrency(summary._sum.posTotalSales?.toNumber() || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(summary._sum.posCash?.toNumber() || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(summary._sum.posCredit?.toNumber() || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(summary._sum.posTransfer?.toNumber() || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                    {formatCurrency(summary._sum.posExpenses?.toNumber() || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-base font-semibold text-green-600">
                      {formatCurrency(summary._sum.handwrittenCashCount?.toNumber() || 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Deposits */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            การนำฝากล่าสุด
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            10 รายการล่าสุด
          </p>
        </div>

        <RecentDepositsTable
          deposits={recentDeposits.map((deposit: typeof recentDeposits[0]) => ({
            id: deposit.id,
            depositDate: deposit.depositDate,
            depositAmount: deposit.depositAmount.toNumber(),
            bankName: deposit.bankName,
            accountNumber: deposit.accountNumber,
            approvalStatus: deposit.approvalStatus,
            approvalRemark: deposit.approvalRemark,
            dailyClosing: {
              branch: {
                branchName: deposit.dailyClosing.branch.branchName,
                branchCode: deposit.dailyClosing.branch.branchCode,
              },
            },
            depositor: {
              firstName: deposit.depositor.firstName,
              lastName: deposit.depositor.lastName,
            },
          }))}
        />
      </div>
    </DashboardShell>
  )
}
