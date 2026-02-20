'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Branch {
  id: string
  branchCode: string
  branchName: string
}

interface Props {
  branches: Branch[]
}

export default function ManagerClosingForm({ branches }: Props) {
  const router = useRouter()
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBranch) {
      alert('กรุณาเลือกสาขา')
      return
    }

    // Redirect to staff closing form but store branch selection
    sessionStorage.setItem('manager_selected_branch', selectedBranch)
    sessionStorage.setItem('manager_closing_date', closingDate)

    // Use staff form but intercept submission
    router.push('/dashboard/staff/closings/new')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
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
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            สร้างรายการปิดยอดขาย (Manager)
          </h1>
          <p className="text-gray-600 mt-1">
            เลือกสาขาที่ต้องการสร้างรายการปิดยอด
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branch Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกสาขา <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- เลือกสาขา --</option>
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branchCode} - {branch.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่ปิดยอด
              </label>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                ถัดไป →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
