import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DepositForm } from '@/components/auditor/DepositForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: {
    closingId?: string
  }
}

export default async function NewDepositPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'AUDITOR' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
  })

  if (!user) {
    redirect('/login')
  }

  // Get all closings that are CASH_RECEIVED (ready for deposit)
  const dbClosings = await db.dailyClosing.findMany({
    where: {
      status: 'CASH_RECEIVED',
    },
    include: {
      branch: true,
    },
    orderBy: {
      closingDate: 'desc',
    },
  })

  // Convert Decimal objects to plain numbers for client component
  const availableClosings = dbClosings.map((closing: typeof dbClosings[0]) => ({
    id: closing.id,
    closingDate: closing.closingDate,
    handwrittenCashCount: closing.handwrittenCashCount.toNumber(),
    branch: {
      id: closing.branch.id,
      branchName: closing.branch.branchName,
      branchCode: closing.branch.branchCode,
    },
  }))

  // If closingId is provided, get that specific closing
  let selectedClosing = null
  if (searchParams.closingId) {
    const dbSelectedClosing = await db.dailyClosing.findUnique({
      where: { id: searchParams.closingId },
      include: {
        branch: true,
      },
    })

    if (!dbSelectedClosing || dbSelectedClosing.status !== 'CASH_RECEIVED') {
      redirect('/dashboard/auditor')
    }

    // Convert Decimal to number for client component
    selectedClosing = {
      id: dbSelectedClosing.id,
      closingDate: dbSelectedClosing.closingDate,
      handwrittenCashCount: dbSelectedClosing.handwrittenCashCount.toNumber(),
      branch: {
        id: dbSelectedClosing.branch.id,
        branchName: dbSelectedClosing.branch.branchName,
        branchCode: dbSelectedClosing.branch.branchCode,
      },
    }
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              บันทึกการนำฝากธนาคาร
            </h2>
            <p className="text-gray-600 mt-1">
              บันทึกข้อมูลการนำเงินสดฝากเข้าบัญชีธนาคาร
            </p>
          </div>
          <a
            href="/dashboard/auditor"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            ← กลับ
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <DepositForm
              closings={availableClosings}
              selectedClosingId={selectedClosing?.id}
            />
          </div>
        </div>

        {/* Sidebar - Selected Closing Summary */}
        {selectedClosing && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                รายละเอียดรายการ
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500">สาขา</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {selectedClosing.branch.branchName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedClosing.branch.branchCode}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">วันที่ปิดยอด</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(selectedClosing.closingDate)}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="text-xs text-gray-500 mb-1">
                    เงินสดที่ต้องนำฝาก
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(selectedClosing.handwrittenCashCount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    (เงินสดรอนำฝาก)
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                คำแนะนำ
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• กรอกข้อมูลธนาคารที่นำฝาก</li>
                <li>• ระบุเลขที่ใบนำฝาก</li>
                <li>• อัพโหลดรูปสลิปการโอนเงิน</li>
                <li>• ตรวจสอบจำนวนเงินให้ถูกต้อง</li>
              </ul>
            </div>
          </div>
        )}

        {/* Available Closings Info */}
        {!selectedClosing && availableClosings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              รายการรอนำฝาก
            </h3>
            <div className="space-y-3">
              {availableClosings.slice(0, 5).map((closing) => (
                <div
                  key={closing.id}
                  className="border-l-2 border-purple-400 pl-3"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {closing.branch.branchName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(closing.closingDate)}
                  </div>
                  <div className="text-sm font-semibold text-purple-600 mt-1">
                    {formatCurrency(closing.handwrittenCashCount)}
                  </div>
                </div>
              ))}
              {availableClosings.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  และอีก {availableClosings.length - 5} รายการ
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
