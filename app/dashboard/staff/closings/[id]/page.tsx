import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

export default async function ClosingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
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
    redirect('/dashboard/staff')
  }

  // Check permission
  if (
    currentUser.role === 'STORE_STAFF' &&
    closing.branchId !== currentUser.branchId
  ) {
    redirect('/dashboard/staff')
  }

  const canEdit = closing.status === 'DRAFT'
  const canSubmit = closing.status === 'DRAFT'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard/staff"
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center w-fit"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            กลับ
          </a>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายละเอียดการปิดยอด
              </h1>
              <p className="text-gray-600 mt-1">
                {closing.branch.branchName} -{' '}
                {formatDate(closing.closingDate)}
              </p>
            </div>
            <StatusBadge status={closing.status} />
          </div>
        </div>

        {/* Actions */}
        {canSubmit && (
          <div className="mb-6 flex gap-3">
            <form action={`/api/closings/${closing.id}/submit`} method="POST">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
              >
                ส่งยอด
              </button>
            </form>
            {canEdit && (
              <a
                href={`/dashboard/staff/closings/${closing.id}/edit`}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                แก้ไข
              </a>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">ยอดขายรวม</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(closing.posTotalSales.toNumber())}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {closing.posBillCount} บิล
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">เงินสด (POS)</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(closing.posCash.toNumber())}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">บัตรเครดิต</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(closing.posCredit.toNumber())}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">เงินสดสุทธิ</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(closing.handwrittenNetCash.toNumber())}
            </div>
          </div>
        </div>

        {/* Discrepancy Alert */}
        {closing.hasDiscrepancy && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">
              ⚠️ พบความผิดปกติ
            </h3>
            <p className="text-sm text-orange-800 mb-2">
              ยอดบัตรเครดิต POS กับ EDC ต่างกัน{' '}
              {formatCurrency(closing.posCreditVsEdcDiff?.toNumber() || 0)} บาท
            </p>
            {closing.discrepancyRemark && (
              <div className="mt-3 bg-white rounded p-3">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ:
                </div>
                <div className="text-sm text-gray-900">
                  {closing.discrepancyRemark}
                </div>
              </div>
            )}
          </div>
        )}

        {/* POS Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              📊 ข้อมูล POS
            </h2>
            {closing.posImageUrl && (
              <a
                href={closing.posImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ดูรูปภาพ →
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">ยอดขายรวม</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posTotalSales.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">เงินสด</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posCash.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">บัตรเครดิต</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posCredit.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">โอนเงิน</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posTransfer.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ค่าใช้จ่าย</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posExpenses.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">จำนวนบิล</div>
              <div className="text-lg font-semibold text-gray-900">
                {closing.posBillCount} บิล
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ค่าเฉลี่ยต่อบิล</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.posAvgPerBill?.toNumber() || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">เวลาเริ่ม</div>
              <div className="text-sm text-gray-900">
                {closing.posStartTime || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">เวลาสิ้นสุด</div>
              <div className="text-sm text-gray-900">
                {closing.posEndTime || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Handwritten Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              ✍️ ใบสรุปลายมือ
            </h2>
            {closing.handwrittenImageUrl && (
              <a
                href={closing.handwrittenImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ดูรูปภาพ →
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">นับเงินสด</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.handwrittenCashCount.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">ค่าใช้จ่าย</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.handwrittenExpenses.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">เงินสดสุทธิ</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(closing.handwrittenNetCash.toNumber())}
              </div>
            </div>
          </div>

          {closing.handwrittenExpensesList &&
            Array.isArray(closing.handwrittenExpensesList) &&
            closing.handwrittenExpensesList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  รายการค่าใช้จ่าย:
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {(closing.handwrittenExpensesList as any[]).map(
                    (item: any, i: number) => (
                      <li key={i}>
                        • {item.description}:{' '}
                        {formatCurrency(item.amount || 0)}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>

        {/* EDC Data */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              💳 ข้อมูล EDC
            </h2>
            {closing.edcImageUrl && (
              <a
                href={closing.edcImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ดูรูปภาพ →
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">ยอดรวม EDC</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(closing.edcTotalAmount.toNumber())}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Batch Number</div>
              <div className="text-sm text-gray-900">
                {closing.edcBatchNumber || '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">
                วันที่ Settlement
              </div>
              <div className="text-sm text-gray-900">
                {closing.edcSettlementDate
                  ? formatDate(closing.edcSettlementDate)
                  : '-'}
              </div>
            </div>
          </div>

          {closing.edcBreakdown &&
            Array.isArray(closing.edcBreakdown) &&
            closing.edcBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  รายละเอียดบัตร:
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700">
                          ประเภทบัตร
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700">
                          จำนวนเงิน
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(closing.edcBreakdown as any[]).map(
                        (item: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-900">
                              {item.cardType || '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              {formatCurrency(item.amount || 0)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        {/* Metadata */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ข้อมูลเพิ่มเติม
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-600 mb-1">ส่งโดย</div>
              <div className="text-gray-900">
                {closing.submitter.firstName} {closing.submitter.lastName}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">วันที่สร้าง</div>
              <div className="text-gray-900">
                {formatDateTime(closing.createdAt)}
              </div>
            </div>
            {closing.submittedAt && (
              <div>
                <div className="text-gray-600 mb-1">วันที่ส่งยอด</div>
                <div className="text-gray-900">
                  {formatDateTime(closing.submittedAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      {label}
    </span>
  )
}
