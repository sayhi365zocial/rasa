'use client'

import { useState, useEffect } from 'react'

interface DayStatus {
  date: string
  status: string | null
  closingId: string | null
}

interface BranchMonthlyStatus {
  branchId: string
  branchCode: string
  branchName: string
  dailyStatuses: DayStatus[]
}

interface BranchMonthlyStatusGridProps {
  initialYear: number
  initialMonth: number
  initialBranchStatuses: BranchMonthlyStatus[]
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-300',
  SUBMITTED: 'bg-blue-400',
  CASH_RECEIVED: 'bg-purple-400',
  DEPOSITED: 'bg-green-500',
  COMPLETED: 'bg-green-600',
  REJECTED: 'bg-red-500',
}

const STATUS_LABELS = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งยอดแล้ว',
  CASH_RECEIVED: 'รับเงินแล้ว',
  DEPOSITED: 'ฝากเรียบร้อย',
  COMPLETED: 'เสร็จสมบูรณ์',
  REJECTED: 'ถูกปฏิเสธ',
}

export function BranchMonthlyStatusGrid({
  initialYear,
  initialMonth,
  initialBranchStatuses,
}: BranchMonthlyStatusGridProps) {
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [branchStatuses, setBranchStatuses] = useState(initialBranchStatuses)
  const [isLoading, setIsLoading] = useState(false)

  // Get days in month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleMonthChange = async (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/dashboard/branch-status-monthly?year=${year}&month=${month}`
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

  const handlePreviousMonth = () => {
    const newMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
    const newYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
    handleMonthChange(newYear, newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
    const newYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
    handleMonthChange(newYear, newMonth)
  }

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              สถานะการส่งยอดรายเดือน
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              ภาพรวมการส่งยอดของแต่ละสาขาตลอดทั้งเดือน
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousMonth}
              disabled={isLoading}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              ← เดือนก่อน
            </button>
            <div className="text-center min-w-[200px]">
              <div className="text-lg font-semibold text-gray-900">
                {monthNames[selectedMonth - 1]} {selectedYear + 543}
              </div>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={isLoading}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              เดือนถัดไป →
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4 text-xs">
          <span className="font-medium text-gray-700">สถานะ:</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300"></div>
            <span className="text-gray-600">ยังไม่ส่ง</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-blue-400"></div>
            <span className="text-gray-600">ส่งแล้ว</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-purple-400"></div>
            <span className="text-gray-600">รับเงินแล้ว</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-green-500"></div>
            <span className="text-gray-600">ฝากแล้ว</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-gray-600">กำลังโหลด...</div>
          </div>
        )}
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                สาขา
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 border-r border-gray-200 min-w-[40px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {branchStatuses.map((branch) => (
              <tr key={branch.branchId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm border-r border-gray-200 bg-white sticky left-0 z-10">
                  <div className="font-medium text-gray-900 whitespace-nowrap">
                    {branch.branchName}
                  </div>
                  <div className="text-xs text-gray-500">{branch.branchCode}</div>
                </td>
                {branch.dailyStatuses.map((dayStatus, index) => {
                  const status = dayStatus.status
                  const bgColor = status
                    ? STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                    : 'bg-gray-100'

                  return (
                    <td
                      key={index}
                      className="p-1 border-r border-gray-200 text-center"
                    >
                      {dayStatus.closingId ? (
                        <a
                          href={`/dashboard/auditor/closings/${dayStatus.closingId}`}
                          className={`block w-full h-8 ${bgColor} rounded hover:opacity-80 transition-opacity`}
                          title={`${index + 1} - ${status ? STATUS_LABELS[status as keyof typeof STATUS_LABELS] : 'ยังไม่ส่ง'}`}
                        />
                      ) : (
                        <div
                          className={`w-full h-8 ${bgColor} rounded border border-gray-300`}
                          title={`${index + 1} - ยังไม่ส่งยอด`}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-600">สาขาทั้งหมด: </span>
            <span className="font-semibold text-gray-900">
              {branchStatuses.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">วันทำการ: </span>
            <span className="font-semibold text-gray-900">{daysInMonth} วัน</span>
          </div>
          <div>
            <span className="text-gray-600">รวมทั้งหมด: </span>
            <span className="font-semibold text-gray-900">
              {branchStatuses.length * daysInMonth} รายการ
            </span>
          </div>
          <div>
            <span className="text-gray-600">ส่งแล้ว: </span>
            <span className="font-semibold text-green-600">
              {branchStatuses.reduce(
                (sum, branch) =>
                  sum + branch.dailyStatuses.filter((d) => d.status !== null).length,
                0
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-600">ยังไม่ส่ง: </span>
            <span className="font-semibold text-red-600">
              {branchStatuses.reduce(
                (sum, branch) =>
                  sum + branch.dailyStatuses.filter((d) => d.status === null).length,
                0
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
