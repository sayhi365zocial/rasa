import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ClosingFilters } from '@/components/auditor/ClosingFilters'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: {
    status?: string
    branchId?: string
    startDate?: string
    endDate?: string
  }
}

export default async function ClosingsListPage({ searchParams }: PageProps) {
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

  // Get all branches for filter dropdown
  const branches = await db.branch.findMany({
    orderBy: {
      branchName: 'asc',
    },
  })

  // Build filter conditions
  const where: any = {}

  if (searchParams.status) {
    where.status = searchParams.status
  }

  if (searchParams.branchId) {
    where.branchId = searchParams.branchId
  }

  if (searchParams.startDate || searchParams.endDate) {
    where.closingDate = {}
    if (searchParams.startDate) {
      where.closingDate.gte = new Date(searchParams.startDate)
    }
    if (searchParams.endDate) {
      where.closingDate.lte = new Date(searchParams.endDate)
    }
  }

  // Get closings with filters
  const closings = await db.dailyClosing.findMany({
    where,
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
      closingDate: 'desc',
    },
  })

  // Get summary stats
  const stats = {
    total: closings.length,
    submitted: closings.filter((c: typeof closings[0]) => c.status === 'SUBMITTED').length,
    cashReceived: closings.filter((c: typeof closings[0]) => c.status === 'CASH_RECEIVED').length,
    deposited: closings.filter((c: typeof closings[0]) => c.status === 'DEPOSITED').length,
    totalAmount: closings.reduce(
      (sum: number, c: typeof closings[0]) => sum + c.handwrittenNetCash.toNumber(),
      0
    ),
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
              รายการปิดยอดทั้งหมด
            </h2>
            <p className="text-gray-600 mt-1">ค้นหาและจัดการรายการปิดยอด</p>
          </div>
          <a
            href="/dashboard/auditor"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            ← กลับ
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">ทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">รอรับเงิน</div>
          <div className="text-2xl font-bold text-orange-600">
            {stats.submitted}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">รอนำฝาก</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.cashReceived}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">นำฝากแล้ว</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.deposited}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">ยอดรวม</div>
          <div className="text-lg font-bold text-blue-600">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <ClosingFilters
          branches={branches}
          currentFilters={searchParams}
        />
      </div>

      {/* Closings Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            รายการปิดยอด ({closings.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          {closings.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    สาขา
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    เงินสดสุทธิ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ส่งโดย
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {closings.map((closing) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(closing.closingDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {closing.branch.branchName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {closing.branch.branchCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-base font-semibold text-gray-900">
                        {formatCurrency(closing.handwrittenNetCash.toNumber())}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {closing.submitter.firstName} {closing.submitter.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={closing.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {closing.status === 'SUBMITTED' ? (
                        <a
                          href={`/dashboard/auditor/closings/${closing.id}`}
                          className="inline-block px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded"
                        >
                          รับเงิน
                        </a>
                      ) : closing.status === 'CASH_RECEIVED' ? (
                        <a
                          href={`/dashboard/auditor/deposits/new?closingId=${closing.id}`}
                          className="inline-block px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded"
                        >
                          นำฝาก
                        </a>
                      ) : (
                        <a
                          href={`/dashboard/auditor/closings/${closing.id}`}
                          className="inline-block px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded"
                        >
                          ดูรายละเอียด
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-500 py-12">
              ไม่พบรายการปิดยอด
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
