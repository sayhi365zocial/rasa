import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BranchDailyStatusTable } from '@/components/dashboard/BranchDailyStatusTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ManagerDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
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

  // Get manager's authorized branches (ADMIN and OWNER can see all branches)
  let authorizedBranchIds: string[] = []

  if (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') {
    // ADMIN and OWNER can see all branches
    const allBranches = await db.branch.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })
    authorizedBranchIds = allBranches.map((branch: any) => branch.id)
  } else {
    // MANAGER can only see authorized branches
    const authorizedBranches = await db.managerBranchAccess.findMany({
      where: { userId: currentUser.userId },
      select: { branchId: true },
    })
    authorizedBranchIds = authorizedBranches.map((access: any) => access.branchId)
  }

  // Get closings waiting for cash collection (SUBMITTED)
  const pendingCollection = await db.dailyClosing.findMany({
    where: {
      status: 'SUBMITTED',
      branchId: {
        in: authorizedBranchIds,
      },
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
      branchId: {
        in: authorizedBranchIds,
      },
    },
    include: {
      branch: true,
    },
    orderBy: {
      submittedAt: 'asc',
    },
    take: 20,
  })

  // Get stats (filtered by authorized branches)
  const stats = {
    pendingCollection: await db.dailyClosing.count({
      where: {
        status: 'SUBMITTED',
        branchId: { in: authorizedBranchIds },
      },
    }),
    pendingDeposit: await db.dailyClosing.count({
      where: {
        status: 'CASH_RECEIVED',
        branchId: { in: authorizedBranchIds },
      },
    }),
    completedToday: await db.dailyClosing.count({
      where: {
        status: 'DEPOSITED',
        branchId: { in: authorizedBranchIds },
        updatedAt: {
          gte: today,
        },
      },
    }),
    totalCashToCollect: await db.dailyClosing.aggregate({
      where: {
        status: 'SUBMITTED',
        branchId: { in: authorizedBranchIds },
      },
      _sum: {
        handwrittenCashCount: true,
      },
    }),
  }

  // Get all branches for status table
  const branches = await db.branch.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { branchName: 'asc' },
  })

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ยินดีต้อนรับ, {user.firstName}! 👋
            </h2>
            <p className="text-gray-600 mt-1">
              จัดการและตรวจสอบทุกสาขา • {formatDate(new Date())}
            </p>
          </div>
          <a
            href="/dashboard/manager/closings/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            + สร้างรายการปิดยอด
          </a>
        </div>
      </div>

      {/* Manager Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">สิทธิ์การใช้งานของผู้จัดการ</h3>
            <p className="mt-1 text-sm text-blue-700">
              คุณสามารถสร้างและส่งยอดได้ทุกสาขา, รับเงินและนำฝากได้เหมือนผู้ตรวจสอบ แต่ไม่สามารถยืนยันการฝากเงินแทนพนักงานสาขาได้
            </p>
          </div>
        </div>
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
            {formatCurrency(stats.totalCashToCollect._sum.handwrittenCashCount?.toNumber() || 0)}
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

      {/* Branch Daily Status - Today */}
      <div className="mb-8">
        <BranchDailyStatusTable
          initialDate={todayDate}
          initialBranchStatuses={branchStatuses}
          userRole={user.role}
        />
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
                        href={`/dashboard/manager/closings/${closing.id}`}
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
                        href={`/dashboard/manager/deposits/new?closingId=${closing.id}`}
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
