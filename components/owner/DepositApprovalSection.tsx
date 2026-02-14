'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DepositApprovalProps {
  depositId: string
  currentStatus: string
  approver?: {
    firstName: string
    lastName: string
  } | null
  approvedAt?: Date | null
  approvalRemark?: string | null
}

export function DepositApprovalSection({
  depositId,
  currentStatus,
  approver,
  approvedAt,
  approvalRemark,
}: DepositApprovalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [remark, setRemark] = useState('')

  const handleAction = async (action: 'APPROVED' | 'FLAGGED' | 'REJECTED') => {
    setSelectedAction(action)
    if (action === 'FLAGGED' || action === 'REJECTED') {
      // Show remark modal for flagged/rejected
      setShowRemarkModal(true)
    } else {
      // Approve directly
      await submitApproval(action, '')
    }
  }

  const submitApproval = async (action: string, remarkText: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/deposits/${depositId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remark: remarkText }),
      })

      if (!response.ok) {
        throw new Error('Failed to update approval')
      }

      // Close modal and refresh
      setShowRemarkModal(false)
      setRemark('')
      router.refresh()
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            ✓ อนุมัติแล้ว
          </span>
        )
      case 'FLAGGED':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
            ⚠ ทำ Flag ไว้
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
            ✕ ปฏิเสธ
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
            ⏳ รอตรวจสอบ
          </span>
        )
    }
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          การอนุมัติจากเจ้าของกิจการ
        </h3>

        <div className="space-y-4">
          {/* Current Status */}
          <div>
            <div className="text-sm text-gray-500 mb-2">สถานะการอนุมัติ</div>
            <div>{getStatusBadge()}</div>
          </div>

          {/* Approver Info */}
          {approver && approvedAt && (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500">ตรวจสอบโดย</div>
              <div className="font-medium text-gray-900">
                {approver.firstName} {approver.lastName}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                เมื่อ {new Date(approvedAt).toLocaleString('th-TH')}
              </div>
            </div>
          )}

          {/* Approval Remark */}
          {approvalRemark && (
            <div className={`border-t border-gray-200 pt-4 ${
              currentStatus === 'FLAGGED' ? 'bg-yellow-50' :
              currentStatus === 'REJECTED' ? 'bg-red-50' : ''
            } -mx-6 -mb-6 mt-4 px-6 py-4 rounded-b-lg`}>
              <div className="text-sm font-medium text-gray-700 mb-1">
                หมายเหตุ
              </div>
              <div className="text-sm text-gray-900">{approvalRemark}</div>
            </div>
          )}

          {/* Action Buttons (only if PENDING) */}
          {currentStatus === 'PENDING' && (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500 mb-3">
                กรุณาตรวจสอบความถูกต้องของเอกสารและการนำฝาก
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleAction('APPROVED')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                >
                  ✓ อนุมัติ
                </button>
                <button
                  onClick={() => handleAction('FLAGGED')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                >
                  ⚠ Flag
                </button>
                <button
                  onClick={() => handleAction('REJECTED')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                >
                  ✕ ปฏิเสธ
                </button>
              </div>
            </div>
          )}

          {/* Allow re-approval if flagged/rejected */}
          {(currentStatus === 'FLAGGED' || currentStatus === 'REJECTED') && (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-500 mb-3">
                ต้องการเปลี่ยนสถานะใหม่?
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleAction('APPROVED')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                >
                  ✓ อนุมัติ
                </button>
                {currentStatus === 'REJECTED' && (
                  <button
                    onClick={() => handleAction('FLAGGED')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                  >
                    ⚠ Flag
                  </button>
                )}
                {currentStatus === 'FLAGGED' && (
                  <button
                    onClick={() => handleAction('REJECTED')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-md"
                  >
                    ✕ ปฏิเสธ
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remark Modal */}
      {showRemarkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowRemarkModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedAction === 'FLAGGED' ? 'ทำ Flag พร้อมหมายเหตุ' : 'ปฏิเสธพร้อมเหตุผล'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุ / เหตุผล
                {(selectedAction === 'REJECTED') && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  selectedAction === 'FLAGGED'
                    ? 'ระบุรายละเอียดที่ต้องการตรวจสอบเพิ่มเติม...'
                    : 'ระบุเหตุผลที่ปฏิเสธ...'
                }
                required={selectedAction === 'REJECTED'}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => submitApproval(selectedAction, remark)}
                disabled={isLoading || (selectedAction === 'REJECTED' && !remark.trim())}
                className={`flex-1 px-4 py-2 disabled:bg-gray-400 text-white font-medium rounded-md ${
                  selectedAction === 'FLAGGED'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
              <button
                onClick={() => {
                  setShowRemarkModal(false)
                  setRemark('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
