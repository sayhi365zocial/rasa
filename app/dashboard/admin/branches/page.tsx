import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { BranchManagementTable } from '@/components/admin/BranchManagementTable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminBranchesPage() {
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

  // Get all branches with counts
  const branches = await db.branch.findMany({
    include: {
      _count: {
        select: {
          users: true,
          dailyClosings: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { branchName: 'asc' },
    ],
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
            <h1 className="text-2xl font-bold text-gray-900">จัดการสาขา</h1>
            <p className="text-gray-600 mt-1">
              เพิ่ม แก้ไข และจัดการสาขาในระบบ
            </p>
          </div>
          <a
            href="/dashboard/admin/branches/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            + เพิ่มสาขา
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            สาขาทั้งหมด
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {branches.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">สาขา</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            สาขาที่เปิดใช้งาน
          </div>
          <div className="text-3xl font-bold text-green-600">
            {branches.filter((b: typeof branches[0]) => b.status === 'ACTIVE').length}
          </div>
          <div className="text-sm text-gray-500 mt-1">สาขา</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">
            พนักงานทั้งหมด
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {branches.reduce((sum: number, b: typeof branches[0]) => sum + b._count.users, 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">คน</div>
        </div>
      </div>

      {/* Branch Management Table */}
      <BranchManagementTable
        branches={branches.map((b: typeof branches[0]) => ({
          id: b.id,
          branchCode: b.branchCode,
          branchName: b.branchName,
          address: b.address,
          phoneNumber: b.phoneNumber,
          status: b.status,
          userCount: b._count.users,
          closingCount: b._count.dailyClosings,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }))}
      />
    </DashboardShell>
  )
}
