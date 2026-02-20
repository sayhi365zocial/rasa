'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Branch {
  id: string
  branchCode: string
  branchName: string
  address: string
  phoneNumber: string | null
  status: string
  userCount: number
  closingCount: number
  createdAt: Date
  updatedAt: Date
}

interface Props {
  branches: Branch[]
}

export function BranchManagementTable({ branches }: Props) {
  const router = useRouter()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (branchId: string, branch: Branch) => {
    if (branch.userCount > 0) {
      alert('ไม่สามารถลบสาขาที่มีพนักงานอยู่ได้ กรุณาโอนพนักงานออกก่อน')
      return
    }

    if (branch.closingCount > 0) {
      alert('ไม่สามารถลบสาขาที่มีประวัติการปิดยอดได้')
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/branches/${branchId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete branch')
      }

      alert('ลบสาขาสำเร็จ')
      router.refresh()
      setDeleteConfirm(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">เปิดใช้งาน</span>
      case 'INACTIVE':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">ปิดใช้งาน</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">{status}</span>
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          รายการสาขา
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                รหัสสาขา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ชื่อสาขา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ที่อยู่
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                เบอร์โทร
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                พนักงาน
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
            {branches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {branch.branchCode}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {branch.branchName}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs">
                    {branch.address}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {branch.phoneNumber || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-sm font-medium text-blue-600">
                    {branch.userCount} คน
                  </div>
                  <div className="text-xs text-gray-500">
                    {branch.closingCount} รายการปิดยอด
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(branch.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={`/dashboard/admin/branches/${branch.id}/edit`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      แก้ไข
                    </a>
                    {branch.userCount === 0 && branch.closingCount === 0 && (
                      deleteConfirm === branch.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(branch.id, branch)}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:bg-gray-400"
                          >
                            {isDeleting ? 'กำลังลบ...' : 'ยืนยัน'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(branch.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          ลบ
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
