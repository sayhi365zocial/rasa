'use client'

import { useState } from 'react'

interface CreditCardFeeConfigProps {
  initialFeeRate: number
}

export function CreditCardFeeConfig({ initialFeeRate }: CreditCardFeeConfigProps) {
  const [feeRate, setFeeRate] = useState(initialFeeRate)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (feeRate < 0 || feeRate > 100) {
      alert('กรุณากรอกค่าธรรมเนียมระหว่าง 0-100%')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/config/credit-card-fee', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feeRate }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
        return
      }

      alert('บันทึกค่าธรรมเนียมสำเร็จ')
      setIsEditing(false)
    } catch (error) {
      console.error('Save credit card fee error:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFeeRate(initialFeeRate)
    setIsEditing(false)
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            อัตราค่าธรรมเนียมบัตรเครดิต (%)
          </label>
          <p className="text-sm text-gray-500 mb-4">
            ค่าธรรมเนียมที่ธนาคารหักจากยอดบัตรเครดิต (เช่น 2.5%)
          </p>

          {isEditing ? (
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={feeRate}
                onChange={(e) => setFeeRate(parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">%</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-blue-600">
              {feeRate.toFixed(2)}%
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            ตัวอย่างการคำนวณ
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex justify-between">
              <span>ยอดบัตรเครดิต:</span>
              <span className="font-medium">10,000.00 บาท</span>
            </div>
            <div className="flex justify-between">
              <span>ค่าธรรมเนียม ({feeRate.toFixed(2)}%):</span>
              <span className="font-medium text-red-600">
                -{((10000 * feeRate) / 100).toFixed(2)} บาท
              </span>
            </div>
            <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
              <span className="font-semibold">ยอดสุทธิที่ได้รับ:</span>
              <span className="font-semibold text-green-600">
                {(10000 - (10000 * feeRate) / 100).toFixed(2)} บาท
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md font-medium disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              แก้ไข
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
