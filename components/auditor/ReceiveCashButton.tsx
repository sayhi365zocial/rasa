'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface ReceiveCashButtonProps {
  closingId: string
  amount: number
  hasDiscrepancy?: boolean
}

export function ReceiveCashButton({ closingId, amount, hasDiscrepancy }: ReceiveCashButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discrepancyNote, setDiscrepancyNote] = useState('')

  const handleReceiveCash = async () => {
    // Validate discrepancy note if there's a discrepancy
    if (hasDiscrepancy && !discrepancyNote.trim()) {
      setError('กรุณาระบุหมายเหตุเมื่อพบความผิดปกติ')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/closings/${closingId}/receive-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discrepancyNote: discrepancyNote.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      // Success - redirect back (router.back or specific dashboard based on role)
      router.back()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setIsLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md"
      >
        รับเงินจากสาขา
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="text-sm text-orange-800 mb-2">ยืนยันการรับเงินสด</div>
        <div className="text-2xl font-bold text-orange-900">
          {formatCurrency(amount)}
        </div>
        <div className="text-xs text-orange-700 mt-1">
          (เฉพาะเงินสด)
        </div>
      </div>

      {hasDiscrepancy && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-yellow-900 mb-2">
            พบความผิดปกติ - กรุณาระบุหมายเหตุ *
          </label>
          <textarea
            value={discrepancyNote}
            onChange={(e) => setDiscrepancyNote(e.target.value)}
            placeholder="ระบุหมายเหตุเกี่ยวกับความผิดปกติที่พบ..."
            className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
            rows={3}
            disabled={isLoading}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleReceiveCash}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-md"
        >
          {isLoading ? 'กำลังบันทึก...' : 'ยืนยันรับเงิน'}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false)
            setError(null)
            setDiscrepancyNote('')
          }}
          disabled={isLoading}
          className="w-full px-4 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 rounded-md"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
