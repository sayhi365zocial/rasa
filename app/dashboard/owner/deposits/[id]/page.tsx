import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/storage/url-helper'
import { ImageModal } from '@/components/owner/ImageModal'
import { DepositApprovalSection } from '@/components/owner/DepositApprovalSection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    id: string
  }
}

export default async function DepositDetailPage({ params }: PageProps) {
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

  // Get deposit details
  const deposit = await db.deposit.findUnique({
    where: { id: params.id },
    include: {
      dailyClosing: {
        include: {
          branch: true,
          submitter: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          cashReceiver: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      depositor: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      approver: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!deposit) {
    redirect('/dashboard/owner')
  }

  const closing = deposit.dailyClosing

  // Convert R2 URL to proxied API URL
  const depositSlipImageUrl = getProxiedImageUrl(deposit.depositSlipUrl)

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
        <div className="flex items-center space-x-3 mb-4">
          <a
            href="/dashboard/owner"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← กลับไปหน้าหลัก
          </a>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          รายละเอียดการนำฝาก
        </h2>
        <p className="text-gray-600 mt-1">
          ข้อมูลการนำฝากเงินเข้าธนาคาร
        </p>
      </div>

      {/* Deposit Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left Column - Deposit Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ข้อมูลการนำฝาก
          </h3>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">สาขา</div>
              <div className="font-medium text-gray-900">
                {closing.branch.branchName}
              </div>
              <div className="text-sm text-gray-500">
                {closing.branch.branchCode}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">วันที่ปิดยอด</div>
              <div className="font-medium text-gray-900">
                {formatDate(closing.closingDate)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">จำนวนเงินฝาก</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(deposit.depositAmount.toNumber())}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">วันที่นำฝาก</div>
              <div className="font-medium text-gray-900">
                {formatDate(deposit.depositDate)}
                {deposit.depositTime && ` เวลา ${deposit.depositTime}`}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500 mb-2">ธนาคาร</div>
              <div className="font-medium text-gray-900">
                {deposit.bankName}
              </div>
              {deposit.bankBranch && (
                <div className="text-sm text-gray-600">
                  สาขา {deposit.bankBranch}
                </div>
              )}
              {deposit.accountNumber && (
                <div className="text-sm text-gray-600">
                  เลขที่บัญชี {deposit.accountNumber}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500">ผู้นำฝาก</div>
              <div className="font-medium text-gray-900">
                {deposit.depositor.firstName} {deposit.depositor.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {deposit.depositor.role}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                ฝากเมื่อ {formatDate(deposit.depositedAt)}
              </div>
            </div>

            {!deposit.amountMatched && deposit.varianceAmount && (
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800">
                    ⚠️ พบความแตกต่างของยอดเงิน
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    ส่วนต่าง: {formatCurrency(deposit.varianceAmount.toNumber())}
                  </div>
                  {deposit.varianceReason && (
                    <div className="text-xs text-yellow-600 mt-1">
                      เหตุผล: {deposit.varianceReason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Daily Closing Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            สรุปการปิดยอดประจำวัน
          </h3>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">ผู้ส่งยอด</div>
              <div className="font-medium text-gray-900">
                {closing.submitter.firstName} {closing.submitter.lastName}
              </div>
              <div className="text-xs text-gray-400">
                ส่งเมื่อ {closing.submittedAt ? formatDate(closing.submittedAt) : '-'}
              </div>
            </div>

            {closing.cashReceiver && (
              <div>
                <div className="text-sm text-gray-500">ผู้รับเงินสด</div>
                <div className="font-medium text-gray-900">
                  {closing.cashReceiver.firstName} {closing.cashReceiver.lastName}
                </div>
                <div className="text-xs text-gray-400">
                  รับเมื่อ {closing.cashReceivedAt ? formatDate(closing.cashReceivedAt) : '-'}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                ยอดขายจาก POS
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ยอดขายรวม</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(closing.posTotalSales.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">เงินสด</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(closing.posCash.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">บัตรเครดิต</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(closing.posCredit.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">โอนเงิน</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(closing.posTransfer.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ค่าใช้จ่าย</span>
                  <span className="text-sm text-red-600">
                    -{formatCurrency(closing.posExpenses.toNumber())}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-medium text-gray-700 mb-3">
                เงินสดจริง (นับมือ)
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">เงินสดนับได้</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(closing.handwrittenCashCount.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">หัก ค่าใช้จ่าย</span>
                  <span className="text-sm text-red-600">
                    -{formatCurrency(closing.handwrittenExpenses.toNumber())}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-700">เงินสดรอนำฝาก</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(closing.handwrittenCashCount.toNumber())}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">สถานะ</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  closing.status === 'DEPOSITED'
                    ? 'bg-green-100 text-green-800'
                    : closing.status === 'CASH_RECEIVED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {closing.status === 'DEPOSITED' && 'ฝากเรียบร้อย'}
                  {closing.status === 'CASH_RECEIVED' && 'รับเงินแล้ว'}
                  {closing.status === 'SUBMITTED' && 'ส่งยอดแล้ว'}
                  {closing.status === 'DRAFT' && 'ร่าง'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Approval Section */}
      <DepositApprovalSection
        depositId={deposit.id}
        currentStatus={deposit.approvalStatus}
        approver={deposit.approver}
        approvedAt={deposit.approvedAt}
        approvalRemark={deposit.approvalRemark}
      />

      {/* Deposit Slip Image */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          สลิปการนำฝาก
        </h3>

        <ImageModal imageUrl={depositSlipImageUrl} alt="สลิปการนำฝาก" />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center space-x-3">
        <a
          href="/dashboard/owner"
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
        >
          กลับไปหน้าหลัก
        </a>
      </div>
    </DashboardShell>
  )
}
