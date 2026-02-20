import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ROLE_LABELS } from '@/lib/types'
import { UserManagementTable } from '@/components/admin/UserManagementTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  // Get all users
  const users = await db.user.findMany({
    include: {
      branch: true,
    },
    orderBy: [
      { status: 'asc' },
      { role: 'asc' },
      { firstName: 'asc' },
    ],
  })

  // Get all branches for the create/edit form
  const branches = await db.branch.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { branchName: 'asc' },
  })

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: null,
      }}
    >
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
            <p className="text-gray-600 mt-1">
              สร้าง แก้ไข และจัดการผู้ใช้งานในระบบ
            </p>
          </div>
          <a
            href="/dashboard/admin/users/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            + เพิ่มผู้ใช้งาน
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ผู้ใช้งานทั้งหมด
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {users.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">คน</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            ผู้ใช้งานที่ Active
          </div>
          <div className="text-3xl font-bold text-green-600">
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-gray-500 mt-1">คน</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            พนักงานหน้าร้าน
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {users.filter(u => u.role === 'STORE_STAFF').length}
          </div>
          <div className="text-sm text-gray-500 mt-1">คน</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            สาขาที่ใช้งาน
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {branches.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">สาขา</div>
        </div>
      </div>

      {/* User Management Table */}
      <UserManagementTable
        users={users.map(u => ({
          id: u.id,
          email: u.email,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          phoneNumber: u.phoneNumber,
          role: u.role,
          status: u.status,
          branchId: u.branchId,
          branch: u.branch ? {
            branchCode: u.branch.branchCode,
            branchName: u.branch.branchName,
          } : null,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
        }))}
        branches={branches.map(b => ({
          id: b.id,
          branchCode: b.branchCode,
          branchName: b.branchName,
        }))}
        currentUserId={currentUser.userId}
      />
    </DashboardShell>
  )
}
