'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Branch {
  id: string
  branchName: string
  branchCode: string
}

interface Closing {
  id: string
  closingDate: Date
  handwrittenNetCash: any
  branch: Branch
}

interface DepositFormProps {
  closings: Closing[]
  selectedClosingId?: string
}

export function DepositForm({ closings, selectedClosingId }: DepositFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    closingId: selectedClosingId || '',
    bankName: '',
    accountNumber: '',
    depositDate: new Date().toISOString().split('T')[0],
  })

  const [depositSlipFile, setDepositSlipFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const selectedClosing = closings.find((c) => c.id === formData.closingId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Validate form
      if (!formData.closingId) {
        throw new Error('กรุณาเลือกรายการปิดยอด')
      }
      if (!formData.bankName) {
        throw new Error('กรุณากรอกชื่อธนาคาร')
      }
      if (!formData.accountNumber) {
        throw new Error('กรุณากรอกเลขที่บัญชี')
      }
      if (!depositSlipFile) {
        throw new Error('กรุณาอัพโหลดสลิปการนำฝาก')
      }

      // Upload deposit slip to Cloudflare R2
      setUploadProgress(10)
      const uploadFormData = new FormData()
      uploadFormData.append('file', depositSlipFile)
      uploadFormData.append('type', 'deposit-slip')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error('ไม่สามารถอัพโหลดสลิปได้')
      }

      const uploadData = await uploadResponse.json()
      setUploadProgress(50)

      // Create deposit record
      const depositResponse = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closingId: formData.closingId,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          depositDate: formData.depositDate,
          depositSlipUrl: uploadData.file.fileUrl,
        }),
      })

      const depositData = await depositResponse.json()

      if (!depositResponse.ok) {
        throw new Error(depositData.error || 'เกิดข้อผิดพลาด')
      }

      setUploadProgress(100)

      // Success - redirect to auditor dashboard
      router.push('/dashboard/auditor')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">ข้อมูลการนำฝาก</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Closing Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          รายการปิดยอด <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.closingId}
          onChange={(e) =>
            setFormData({ ...formData, closingId: e.target.value })
          }
          disabled={!!selectedClosingId || isLoading}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
        >
          <option value="">เลือกรายการปิดยอด</option>
          {closings.map((closing) => (
            <option key={closing.id} value={closing.id}>
              {closing.branch.branchName} -{' '}
              {new Date(closing.closingDate).toLocaleDateString('th-TH')} -{' '}
              {formatCurrency(closing.handwrittenNetCash.toNumber())}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Display */}
      {selectedClosing && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-800 mb-1">จำนวนเงินที่ต้องนำฝาก</div>
          <div className="text-3xl font-bold text-purple-900">
            {formatCurrency(selectedClosing.handwrittenNetCash.toNumber())}
          </div>
        </div>
      )}

      {/* Bank Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ธนาคาร <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.bankName}
          onChange={(e) =>
            setFormData({ ...formData, bankName: e.target.value })
          }
          disabled={isLoading}
          required
          placeholder="เช่น ธนาคารกสิกรไทย"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Account Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เลขที่บัญชี <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.accountNumber}
          onChange={(e) =>
            setFormData({ ...formData, accountNumber: e.target.value })
          }
          disabled={isLoading}
          required
          placeholder="เช่น 123-4-56789-0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Deposit Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          วันที่นำฝาก <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.depositDate}
          onChange={(e) =>
            setFormData({ ...formData, depositDate: e.target.value })
          }
          disabled={isLoading}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Deposit Slip Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          สลิปการนำฝาก <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setDepositSlipFile(e.target.files[0])
            }
          }}
          disabled={isLoading}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          อัพโหลดรูปถ่ายหรือสแกนสลิปการนำฝากธนาคาร
        </p>
        {depositSlipFile && (
          <div className="mt-2 text-sm text-gray-600">
            ไฟล์: {depositSlipFile.name} ({(depositSlipFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800 mb-2">
            กำลังอัพโหลด... {uploadProgress}%
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center space-x-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-md"
        >
          {isLoading ? 'กำลังบันทึก...' : 'บันทึกการนำฝาก'}
        </button>
        <a
          href="/dashboard/auditor"
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
        >
          ยกเลิก
        </a>
      </div>
    </form>
  )
}
