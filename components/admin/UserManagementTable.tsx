'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/types'

interface Branch {
  branchCode: string
  branchName: string
}

interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  role: string
  status: string
  branchId: string | null
  branch: Branch | null
  createdAt: Date
  lastLoginAt: Date | null
}

interface BranchOption {
  id: string
  branchCode: string
  branchName: string
}

interface Props {
  users: User[]
  branches: BranchOption[]
  currentUserId: string
}

export function UserManagementTable({ users, branches, currentUserId }: Props) {
  const router = useRouter()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (userId: string) => {
    if (userId === currentUserId) {
      alert('ไม่สามารถลบบัญชีของตัวเองได้')
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      alert('ลบผู้ใช้งานสำเร็จ')
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
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">ใช้งาน</span>
      case 'SUSPENDED':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">ระงับ</span>
      case 'INACTIVE':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">ไม่ใช้งาน</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">{status}</span>
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          รายการผู้ใช้งาน
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ชื่อ-สกุล
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                อีเมล / Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                บทบาท
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                สาขา
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                เข้าสู่ระบบล่าสุด
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                การกระทำ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  {user.phoneNumber && (
                    <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.branch ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.branch.branchName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.branch.branchCode}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'ยังไม่เคยเข้าสู่ระบบ'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={`/dashboard/admin/users/${user.id}/edit`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      แก้ไข
                    </a>
                    {user.id !== currentUserId && (
                      deleteConfirm === user.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(user.id)}
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
                          onClick={() => setDeleteConfirm(user.id)}
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
