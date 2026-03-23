'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function EditClosingPage() {
  const router = useRouter()
  const params = useParams()
  const closingId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState<any>(null)

  const [formData, setFormData] = useState({
    posTotalSales: 0,
    posCash: 0,
    posCredit: 0,
    posTransfer: 0,
    posExpenses: 0,
    handwrittenCashCount: 0,
    handwrittenExpenses: 0,
    handwrittenNetCash: 0,
    edcTotalAmount: 0,
  })

  // Fetch closing data
  useEffect(() => {
    async function fetchClosing() {
      try {
        const res = await fetch(`/api/closings/${closingId}`)
        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.error?.message || 'Failed to fetch closing')
        }

        const data = result.data
        setClosing(data)

        // Pre-fill form
        setFormData({
          posTotalSales: data.posTotalSales?.toNumber() || 0,
          posCash: data.posCash?.toNumber() || 0,
          posCredit: data.posCredit?.toNumber() || 0,
          posTransfer: data.posTransfer?.toNumber() || 0,
          posExpenses: data.posExpenses?.toNumber() || 0,
          handwrittenCashCount: data.handwrittenCashCount?.toNumber() || 0,
          handwrittenExpenses: data.handwrittenExpenses?.toNumber() || 0,
          handwrittenNetCash: data.handwrittenNetCash?.toNumber() || 0,
          edcTotalAmount: data.edcTotalAmount?.toNumber() || 0,
        })

        setLoading(false)
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load closing')
        setLoading(false)
      }
    }

    fetchClosing()
  }, [closingId])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      // Calculate net cash
      const cash = formData.posCash
      const transfer = formData.posTransfer
      const credit = formData.posCredit
      const creditFee = credit * 0.03
      const netCredit = credit - creditFee
      const expenses = formData.posExpenses
      const netCash = cash + transfer + netCredit - expenses

      const payload = {
        posTotalSales: formData.posTotalSales,
        posCash: formData.posCash,
        posCredit: formData.posCredit,
        posTransfer: formData.posTransfer,
        posExpenses: formData.posExpenses,
        handwrittenCashCount: cash - expenses,
        handwrittenExpenses: formData.handwrittenExpenses,
        handwrittenNetCash: netCash,
        edcTotalAmount: formData.edcTotalAmount,
      }

      const res = await fetch(`/api/closings/${closingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message || 'Failed to update closing')
      }

      // Success - redirect back to detail page
      alert('✅ บันทึกสำเร็จ!')
      router.push(`/dashboard/staff/closings/${closingId}`)
      router.refresh() // Force refresh to fetch new data
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (error && !closing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 font-medium mb-2">เกิดข้อผิดพลาด</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            กลับ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            กลับ
          </button>
          <h1 className="text-2xl font-bold text-gray-900">แก้ไขยอดปิดขาย</h1>
          <p className="text-gray-600 mt-1">
            {closing?.branch?.branchName} - {new Date(closing?.closingDate).toLocaleDateString('th-TH')}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            {/* 1. ยอดขายรวม */}
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                1. ยอดขายรวม
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.posTotalSales || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posTotalSales: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
            </div>

            {/* 2. เงินสด */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                2. เงินสด
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.posCash || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posCash: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
            </div>

            {/* 3. บัตรเครดิต */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                3. บัตรเครดิต
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.posCredit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posCredit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
              {(() => {
                const creditAmount = formData.posCredit || 0
                const fee = creditAmount * 0.03
                const netCredit = creditAmount - fee
                return creditAmount > 0 ? (
                  <p className="text-sm text-gray-600 mt-2">
                    ( {netCredit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                    หลังหักค่าธรรมเนียม 3% ={' '}
                    {fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท )
                  </p>
                ) : null
              })()}
            </div>

            {/* 4. โอนเงิน */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                4. โอนเงิน
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.posTransfer || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posTransfer: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
            </div>

            {/* 5. ค่าใช้จ่าย */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                5. ค่าใช้จ่าย
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.posExpenses || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      posExpenses: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
            </div>

            {/* 6. EDC Total (optional) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                6. ยอด EDC (ถ้ามี)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={formData.edcTotalAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      edcTotalAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="0.00"
                />
                <span className="text-gray-700 font-medium">บาท</span>
              </div>
            </div>

            {/* Summary */}
            <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                สรุปยอดคงเหลือสุทธิ (คำนวณอัตโนมัติ)
              </label>
              {(() => {
                const cash = formData.posCash || 0
                const transfer = formData.posTransfer || 0
                const credit = formData.posCredit || 0
                const creditFee = credit * 0.03
                const netCredit = credit - creditFee
                const expenses = formData.posExpenses || 0
                const netBalance = cash + transfer + netCredit - expenses

                return (
                  <>
                    <div className="text-3xl font-bold text-green-700 mb-2">
                      {netBalance.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      บาท
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        = เงินสด {cash.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                      <p>
                        + โอน{' '}
                        {transfer.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                      <p>
                        + เครดิตสุทธิ{' '}
                        {netCredit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}{' '}
                        (หลังหักค่าธรรมเนียม{' '}
                        {creditFee.toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                      </p>
                      <p>
                        - ค่าใช้จ่าย{' '}
                        {expenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.back()}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
