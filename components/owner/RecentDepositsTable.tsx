'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Branch {
  branchName: string
  branchCode: string
}

interface DailyClosing {
  branch: Branch
}

interface Depositor {
  firstName: string
  lastName: string
}

interface Deposit {
  id: string
  depositDate: Date
  depositAmount: number
  bankName: string | null
  accountNumber: string | null
  approvalStatus: string
  approvalRemark: string | null
  dailyClosing: DailyClosing
  depositor: Depositor
}

interface Props {
  deposits: Deposit[]
}

export function RecentDepositsTable({ deposits }: Props) {
  const router = useRouter()

  const handleRowClick = (depositId: string) => {
    router.push(`/dashboard/owner/deposits/${depositId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">✓ อนุมัติ</span>
      case 'FLAGGED':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">⚠ Flag</span>
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">✕ ปฏิเสธ</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">⏳ รอตรวจสอบ</span>
    }
  }

  return (
    <div className="overflow-x-auto">
      {deposits.length > 0 ? (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                วันที่ฝาก
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
                ผู้ฝาก
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {deposits.map((deposit) => (
              <tr
                key={deposit.id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(deposit.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(deposit.depositDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {deposit.dailyClosing.branch.branchName}
                  </div>
                  <div className="text-sm text-gray-500">
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
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(deposit.depositAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {deposit.depositor.firstName} {deposit.depositor.lastName}
                  </div>
                  <div className="text-xs text-blue-600 hover:text-blue-700">
                    คลิกเพื่อดูรายละเอียด →
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {getStatusBadge(deposit.approvalStatus)}
                    {/* Show remark below status if FLAGGED or REJECTED */}
                    {(deposit.approvalStatus === 'FLAGGED' || deposit.approvalStatus === 'REJECTED') && deposit.approvalRemark && (
                      <div className={`text-xs mt-1 max-w-xs ${
                        deposit.approvalStatus === 'FLAGGED'
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}>
                        <span className="font-medium">หมายเหตุ:</span> {deposit.approvalRemark}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-gray-500 py-12">
          ยังไม่มีการนำฝาก
        </div>
      )}
    </div>
  )
}
