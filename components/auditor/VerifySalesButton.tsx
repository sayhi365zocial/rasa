'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface VerifySalesButtonProps {
  closingId: string
  totalSales: number
}

export function VerifySalesButton({ closingId, totalSales }: VerifySalesButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerifySales = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/closings/${closingId}/verify-sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      // Success - refresh the page
      router.refresh()
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setIsLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
      >
        ยืนยันยอดขาย
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800 mb-2">ยืนยันยอดขายรวม</div>
        <div className="text-2xl font-bold text-blue-900">
          {formatCurrency(totalSales)}
        </div>
        <div className="text-xs text-blue-700 mt-1">
          (ตรวจสอบว่าสาขาขายได้เท่าไร)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={handleVerifySales}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md"
        >
          {isLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
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
