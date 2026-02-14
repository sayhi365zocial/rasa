'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface BranchRevenue {
  branchId: string
  branchName: string
  branchCode: string
  totalSales: number
  totalCash: number
  totalCredit: number
  totalTransfer: number
  totalExpenses: number
  totalCashDeposit: number
  closingCount: number
}

export function BranchRevenueReport() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [branchRevenues, setBranchRevenues] = useState<BranchRevenue[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchRevenue = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/reports/branch-revenue?startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch revenue')
      }

      setBranchRevenues(data.branchRevenues || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenue()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchRevenue()
  }

  // Calculate totals
  const totals = branchRevenues.reduce(
    (acc, branch) => ({
      totalSales: acc.totalSales + branch.totalSales,
      totalCash: acc.totalCash + branch.totalCash,
      totalCredit: acc.totalCredit + branch.totalCredit,
      totalTransfer: acc.totalTransfer + branch.totalTransfer,
      totalExpenses: acc.totalExpenses + branch.totalExpenses,
      totalCashDeposit: acc.totalCashDeposit + branch.totalCashDeposit,
      closingCount: acc.closingCount + branch.closingCount,
    }),
    {
      totalSales: 0,
      totalCash: 0,
      totalCredit: 0,
      totalTransfer: 0,
      totalExpenses: 0,
      totalCashDeposit: 0,
      closingCount: 0,
    }
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          สรุปรายได้แต่ละสาขา
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          รายงานยอดขายและรายได้ตามช่วงเวลา
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md"
          >
            {isLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : branchRevenues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            ไม่พบข้อมูลในช่วงเวลาที่เลือก
          </div>
        ) : (
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
              {branchRevenues.map((branch) => (
                <tr key={branch.branchId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {branch.branchName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {branch.branchCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {branch.closingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-base font-semibold text-blue-600">
                      {formatCurrency(branch.totalSales)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(branch.totalCash)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(branch.totalCredit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(branch.totalTransfer)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                    {formatCurrency(branch.totalExpenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-base font-semibold text-green-600">
                      {formatCurrency(branch.totalCashDeposit)}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-blue-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  รวมทั้งหมด
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                  {totals.closingCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-blue-700">
                    {formatCurrency(totals.totalSales)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.totalCash)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.totalCredit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                  {formatCurrency(totals.totalTransfer)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-red-700">
                  {formatCurrency(totals.totalExpenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-green-700">
                    {formatCurrency(totals.totalCashDeposit)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
