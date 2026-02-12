'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface ReceiveCashButtonProps {
  closingId: string
  amount: number
}

export function ReceiveCashButton({ closingId, amount }: ReceiveCashButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReceiveCash = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/closings/${closingId}/receive-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      // Success - redirect back to auditor dashboard
      router.push('/dashboard/auditor')
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
        <div className="text-sm text-orange-800 mb-2">ยืนยันการรับเงิน</div>
        <div className="text-2xl font-bold text-orange-900">
          {formatCurrency(amount)}
        </div>
      </div>

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
