'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Branch {
  id: string
  branchName: string
  branchCode: string
}

interface ClosingFiltersProps {
  branches: Branch[]
  currentFilters: {
    status?: string
    branchId?: string
    startDate?: string
    endDate?: string
  }
}

export function ClosingFilters({ branches, currentFilters }: ClosingFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState(currentFilters.status || '')
  const [branchId, setBranchId] = useState(currentFilters.branchId || '')
  const [startDate, setStartDate] = useState(currentFilters.startDate || '')
  const [endDate, setEndDate] = useState(currentFilters.endDate || '')

  const handleFilter = () => {
    const params = new URLSearchParams()

    if (status) params.set('status', status)
    if (branchId) params.set('branchId', branchId)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    router.push(`/dashboard/auditor/closings?${params.toString()}`)
  }

  const handleReset = () => {
    setStatus('')
    setBranchId('')
    setStartDate('')
    setEndDate('')
    router.push('/dashboard/auditor/closings')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">กรองข้อมูล</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">สถานะ</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            <option value="DRAFT">ฉบับร่าง</option>
            <option value="SUBMITTED">รอรับเงิน</option>
            <option value="CASH_RECEIVED">รอนำฝาก</option>
            <option value="DEPOSITED">นำฝากแล้ว</option>
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">สาขา</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branchName} ({branch.branchCode})
              </option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          กรองข้อมูล
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </div>
  )
}
