'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StaffConfirmFormProps {
  depositId: string
  hasVariance: boolean
}

export function StaffConfirmForm({ depositId, hasVariance }: StaffConfirmFormProps) {
  const router = useRouter()
  const [remark, setRemark] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate remark if there's variance
    if (hasVariance && !remark.trim()) {
      setError('กรุณาระบุหมายเหตุเนื่องจากยอดไม่ตรงกัน')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/deposits/${depositId}/staff-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remark: remark.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      // Success - redirect back to dashboard
      alert('ยืนยันการฝากเงินเรียบร้อยแล้ว')
      router.push('/dashboard/staff')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        ยืนยันการฝากเงิน
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-2">
            หมายเหตุ {hasVariance && <span className="text-red-600">*</span>}
          </label>
          <textarea
            id="remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
            placeholder={
              hasVariance
                ? 'กรุณาระบุเหตุผลที่ยอดไม่ตรงกัน...'
                : 'หมายเหตุเพิ่มเติม (ถ้ามี)...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={hasVariance}
          />
          {hasVariance && (
            <p className="mt-1 text-sm text-orange-600">
              จำเป็นต้องระบุหมายเหตุเนื่องจากยอดไม่ตรงกัน
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? 'กำลังยืนยัน...' : 'ยืนยันการฝากเงิน'}
        </button>

        <p className="mt-3 text-xs text-gray-500 text-center">
          การยืนยันนี้จะแจ้งให้ทราบว่าคุณได้ตรวจสอบยอดที่ผู้ตรวจสอบนำฝากแล้ว
        </p>
      </form>
    </div>
  )
}
