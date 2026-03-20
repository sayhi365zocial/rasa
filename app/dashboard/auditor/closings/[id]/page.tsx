import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReceiveCashButton } from '@/components/auditor/ReceiveCashButton'
import { VerifySalesButton } from '@/components/auditor/VerifySalesButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    id: string
  }
}

export default async function ClosingDetailPage({ params }: PageProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'AUDIT' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  const closing = await db.dailyClosing.findUnique({
    where: { id: params.id },
    include: {
      branch: true,
      submitter: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!closing) {
    redirect('/dashboard/auditor')
  }

  // Get audit log entries for this closing
  const auditLogs = await db.auditLog.findMany({
    where: {
      entityType: 'DailyClosing',
      entityId: closing.id,
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

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
              รับเงินจากสาขา
            </h2>
            <p className="text-gray-600 mt-1">
              {closing.branch.branchName} - {formatDate(closing.closingDate)}
            </p>
          </div>
          <a
            href="/dashboard/auditor"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            ← กลับ
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Branch Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ข้อมูลสาขา
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">สาขา</div>
                <div className="text-base font-medium text-gray-900 mt-1">
                  {closing.branch.branchName}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">รหัสสาขา</div>
                <div className="text-base font-medium text-gray-900 mt-1">
                  {closing.branch.branchCode}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">ที่อยู่</div>
                <div className="text-base font-medium text-gray-900 mt-1">
                  {closing.branch.address}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">ส่งโดย</div>
                <div className="text-base font-medium text-gray-900 mt-1">
                  {closing.submitter.firstName} {closing.submitter.lastName}
                </div>
              </div>
            </div>
          </div>

          {/* Sales Details from Branch */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              รายละเอียดยอดขายที่สาขาส่งมา
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">ยอดขายรวม</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(closing.posTotalSales.toNumber())}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">เงินสด</span>
                <span className="text-base font-medium text-gray-900">
                  {formatCurrency(closing.posCash.toNumber())}
                </span>
              </div>
              <div className="py-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">บัตรเครดิต</span>
                  <span className="text-base font-medium text-gray-900">
                    {formatCurrency(closing.posCredit.toNumber())}
                  </span>
                </div>
                {closing.posCredit.toNumber() > 0 && (
                  <div className="flex justify-between items-center mt-1 text-sm">
                    <span className="text-gray-500 ml-4">หักค่าธรรมเนียม 3%</span>
                    <span className="text-red-600">
                      - {formatCurrency(closing.posCredit.toNumber() * 0.03)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">โอนเงิน</span>
                <span className="text-base font-medium text-gray-900">
                  {formatCurrency(closing.posTransfer.toNumber())}
                </span>
              </div>
              {closing.otherIncome && closing.otherIncome.toNumber() > 0 && (
                <div className="py-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">รายรับอื่นๆ</span>
                    <span className="text-base font-medium text-green-600">
                      {formatCurrency(closing.otherIncome.toNumber())}
                    </span>
                  </div>
                  {closing.otherIncomeRemark && (
                    <div className="text-sm text-gray-500 mt-1 ml-4">
                      {closing.otherIncomeRemark}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">ค่าใช้จ่าย</span>
                <span className="text-base font-medium text-red-600">
                  {formatCurrency(closing.posExpenses.toNumber())}
                </span>
              </div>
            </div>
          </div>

          {/* Cash to Collect */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              เงินสดที่ต้องรับจากสาขา
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">เงินสด</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(closing.posCash.toNumber())}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">- ค่าใช้จ่าย</span>
                <span className="text-lg font-semibold text-red-600">
                  {formatCurrency(closing.posExpenses.toNumber())}
                </span>
              </div>
              <div className="border-t-2 border-orange-500 pt-3 mt-3 bg-orange-50 -mx-6 px-6 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">เงินสดรอนำฝาก</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(closing.handwrittenCashCount.toNumber())}
                  </span>
                </div>
                <p className="text-xs text-orange-700 mt-2">
                  💰 จำนวนเงินสดที่ Auditor ต้องรับจากสาขา
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">สถานะ</h3>
            <div className="flex items-center justify-between">
              {closing.status === 'SUBMITTED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  รอรับเงิน
                </span>
              ) : closing.status === 'CASH_RECEIVED' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  รับเงินแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  นำฝากแล้ว
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">วันที่</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500">วันที่ปิดยอด</div>
                <div className="text-sm font-medium text-gray-900 mt-1">
                  {formatDate(closing.closingDate)}
                </div>
              </div>
              {closing.submittedAt && (
                <div>
                  <div className="text-xs text-gray-500">วันที่ส่งยอด</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(closing.submittedAt)}
                  </div>
                </div>
              )}
              {closing.cashReceivedAt && (
                <div>
                  <div className="text-xs text-gray-500">วันที่รับเงิน</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(closing.cashReceivedAt)}
                  </div>
                </div>
              )}
              {closing.completedAt && (
                <div>
                  <div className="text-xs text-gray-500">วันที่นำฝาก</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(closing.completedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {closing.status === 'SUBMITTED' && (
            <>
              {/* ยืนยันยอดขาย */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  ยืนยันยอดขาย
                </h3>
                {closing.verifiedAt ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-800 font-medium">
                      ✓ ยืนยันแล้ว
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      {formatDate(closing.verifiedAt)}
                    </div>
                  </div>
                ) : (
                  <VerifySalesButton
                    closingId={closing.id}
                    totalSales={closing.posTotalSales.toNumber()}
                  />
                )}
              </div>

              {/* รับเงินสด */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  รับเงินสด
                </h3>
                <ReceiveCashButton
                  closingId={closing.id}
                  amount={closing.handwrittenNetCash.toNumber()}
                />
              </div>
            </>
          )}

          {closing.status === 'CASH_RECEIVED' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <a
                href={`/dashboard/auditor/deposits/new?closingId=${closing.id}`}
                className="block w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white text-center font-medium rounded-md"
              >
                นำฝากธนาคาร
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ประวัติการดำเนินการ
          </h3>
          <div className="space-y-3">
            {auditLogs.map((log: typeof auditLogs[0]) => (
              <div
                key={log.id}
                className="flex items-start space-x-3 text-sm border-l-2 border-gray-300 pl-4"
              >
                <div className="flex-1">
                  <div className="text-gray-900 font-medium">{log.action}</div>
                  {log.remark && (
                    <div className="text-gray-500 mt-1">{log.remark}</div>
                  )}
                  <div className="text-gray-400 text-xs mt-1">
                    {log.user.firstName} {log.user.lastName} •{' '}
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
