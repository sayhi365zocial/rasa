import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { BankAccountList } from '@/components/admin/BankAccountList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSettingsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  // Get all bank accounts
  const bankAccounts = await db.companyBankAccount.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { bankName: 'asc' },
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
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          ตั้งค่าระบบ
        </h2>
        <p className="text-gray-600 mt-1">
          จัดการข้อมูลบัญชีธนาคารของบริษัท
        </p>
      </div>

      {/* Bank Accounts Section */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            บัญชีธนาคารบริษัท
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            บัญชีที่ใช้สำหรับนำฝากเงินสดจากสาขา
          </p>
        </div>

        <BankAccountList
          initialAccounts={bankAccounts.map((acc: typeof bankAccounts[0]) => ({
            ...acc,
            createdAt: acc.createdAt.toISOString(),
            updatedAt: acc.updatedAt.toISOString(),
          }))}
        />
      </div>
    </DashboardShell>
  )
}
