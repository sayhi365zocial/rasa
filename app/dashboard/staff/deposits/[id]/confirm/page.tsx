import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StaffConfirmForm } from './StaffConfirmForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StaffConfirmDepositPage({
  params,
}: {
  params: { id: string }
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'STORE_STAFF' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const user = await db.user.findUnique({
    where: { id: currentUser.userId },
    include: { branch: true },
  })

  if (!user) {
    redirect('/login')
  }

  const deposit = await db.deposit.findUnique({
    where: { id: params.id },
    include: {
      dailyClosing: {
        include: {
          branch: true,
          submitter: true,
        },
      },
      depositor: true,
      approver: true,
    },
  })

  if (!deposit) {
    return (
      <DashboardShell
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branch: user.branch,
        }}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">ไม่พบข้อมูลการฝากเงิน</h2>
          <a href="/dashboard/staff" className="mt-4 text-blue-600 hover:text-blue-700">
            กลับหน้าหลัก
          </a>
        </div>
      </DashboardShell>
    )
  }

  // Check if staff belongs to the same branch
  if (user.branchId !== deposit.dailyClosing.branchId) {
    return (
      <DashboardShell
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branch: user.branch,
        }}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-900">คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้</h2>
          <p className="mt-2 text-gray-600">คุณสามารถยืนยันได้เฉพาะการฝากเงินของสาขาตัวเองเท่านั้น</p>
          <a href="/dashboard/staff" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            กลับหน้าหลัก
          </a>
        </div>
      </DashboardShell>
    )
  }

  const submittedAmount = deposit.dailyClosing.handwrittenNetCash.toNumber()
  const depositedAmount = deposit.depositAmount.toNumber()
  const difference = depositedAmount - submittedAmount
  const hasVariance = Math.abs(difference) > 0.01

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: user.branch,
      }}
    >
      <div className="mb-6">
        <a
          href="/dashboard/staff"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center"
        >
          ← กลับหน้าหลัก
        </a>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ยืนยันการฝากเงิน</h1>
        <p className="text-gray-600 mt-1">
          กรุณาตรวจสอบยอดที่ผู้ตรวจสอบนำฝากว่าตรงกับยอดที่คุณส่งหรือไม่
        </p>
      </div>

      {deposit.isStaffConfirmed && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-6 w-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">ยืนยันแล้ว</h3>
              <p className="mt-1 text-sm text-green-700">
                การฝากเงินนี้ได้รับการยืนยันจากพนักงานแล้ว
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Comparison */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              เปรียบเทียบยอดเงิน
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">ยอดที่คุณส่ง</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(submittedAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">ยอดที่ผู้ตรวจสอบนำฝาก</span>
                <span className={`text-lg font-bold ${hasVariance ? 'text-orange-600' : 'text-gray-900'}`}>
                  {formatCurrency(depositedAmount)}
                </span>
              </div>

              <div className={`flex justify-between items-center py-3 ${hasVariance ? 'bg-orange-50 -mx-6 px-6 rounded-md' : ''}`}>
                <span className="text-sm font-medium text-gray-700">ผลต่าง</span>
                <span className={`text-xl font-bold ${hasVariance ? 'text-orange-600' : 'text-green-600'}`}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              </div>

              {hasVariance && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">พบความผิดพลาด</h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        ยอดที่นำฝากไม่ตรงกับยอดที่ส่ง กรุณาตรวจสอบและระบุหมายเหตุ
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasVariance && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">ยอดถูกต้อง</h3>
                      <p className="mt-1 text-sm text-green-700">
                        ยอดที่นำฝากตรงกับยอดที่คุณส่ง
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ข้อมูลการฝาก
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">วันที่ปิดยอด</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(deposit.dailyClosing.closingDate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">วันที่นำฝาก</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(deposit.depositDate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">ผู้นำฝาก</span>
                <span className="text-gray-900 font-medium">
                  {deposit.depositor.firstName} {deposit.depositor.lastName}
                </span>
              </div>
              {deposit.bankName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ธนาคาร</span>
                  <span className="text-gray-900 font-medium">{deposit.bankName}</span>
                </div>
              )}
              {deposit.accountNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">เลขบัญชี</span>
                  <span className="text-gray-900 font-medium font-mono">{deposit.accountNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Form & Image */}
        <div className="space-y-6">
          {/* Deposit Slip Image */}
          {deposit.depositSlipUrl && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                สลิปการฝาก
              </h2>
              <img
                src={deposit.depositSlipUrl}
                alt="สลิปการฝากเงิน"
                className="w-full h-auto rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Confirmation Form */}
          {!deposit.isStaffConfirmed && (
            <StaffConfirmForm
              depositId={deposit.id}
              hasVariance={hasVariance}
            />
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
