'use client'

import { formatDate } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BranchStatus {
  branchId: string
  branchCode: string
  branchName: string
  status: string | null
  closingId: string | null
  submittedAt: Date | null
}

interface BranchDailyStatusTableProps {
  initialDate: Date
  initialBranchStatuses: BranchStatus[]
}

const STATUS_CONFIG = {
  DRAFT: {
    label: 'ร่าง',
    color: 'bg-gray-100 text-gray-800',
    icon: '📝',
  },
  SUBMITTED: {
    label: 'ส่งยอดแล้ว',
    color: 'bg-blue-100 text-blue-800',
    icon: '📤',
  },
  CASH_RECEIVED: {
    label: 'รับเงินแล้ว',
    color: 'bg-purple-100 text-purple-800',
    icon: '💰',
  },
  DEPOSITED: {
    label: 'ฝากเรียบร้อย',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
  COMPLETED: {
    label: 'เสร็จสมบูรณ์',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
  REJECTED: {
    label: 'ถูกปฏิเสธ',
    color: 'bg-red-100 text-red-800',
    icon: '❌',
  },
}

export function BranchDailyStatusTable({
  initialDate,
  initialBranchStatuses,
}: BranchDailyStatusTableProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(
    initialDate.toISOString().split('T')[0]
  )
  const [branchStatuses, setBranchStatuses] = useState(initialBranchStatuses)
  const [isLoading, setIsLoading] = useState(false)

  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate)
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/dashboard/branch-status?date=${newDate}`
      )
      const data = await response.json()

      if (data.success) {
        setBranchStatuses(data.data.branchStatuses)
      }
    } catch (error) {
      console.error('Error fetching branch status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              สถานะการส่งยอดประจำวัน
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              ติดตามสถานะการส่งยอดของแต่ละสาขา
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">
              เลือกวันที่:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-gray-600">กำลังโหลด...</div>
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                รหัสสาขา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ชื่อสาขา
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                เวลาส่ง
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                ดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {branchStatuses.map((branch) => {
              const statusConfig = branch.status
                ? STATUS_CONFIG[branch.status as keyof typeof STATUS_CONFIG]
                : null

              return (
                <tr key={branch.branchId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {branch.branchCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {branch.branchName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {statusConfig ? (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                      >
                        <span className="mr-1">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <span className="mr-1">⚠️</span>
                        ยังไม่ส่งยอด
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-600">
                      {branch.submittedAt
                        ? new Date(branch.submittedAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {branch.closingId ? (
                      <a
                        href={`/dashboard/auditor/closings/${branch.closingId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        ดูรายละเอียด →
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex space-x-6">
            <div>
              <span className="text-gray-600">สาขาทั้งหมด: </span>
              <span className="font-semibold text-gray-900">
                {branchStatuses.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ส่งยอดแล้ว: </span>
              <span className="font-semibold text-green-600">
                {branchStatuses.filter((b) => b.status !== null).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ยังไม่ส่ง: </span>
              <span className="font-semibold text-red-600">
                {branchStatuses.filter((b) => b.status === null).length}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')}
          </div>
        </div>
      </div>
    </div>
  )
}
