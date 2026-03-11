'use client'

import { useState, useEffect } from 'react'
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
  handwrittenCashCount: number
  branch: Branch
}

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  bankBranch: string | null
  isDefault: boolean
}

interface DepositFormProps {
  closings: Closing[]
  selectedClosingId?: string
  redirectPath?: string
}

export function DepositForm({ closings, selectedClosingId, redirectPath = '/dashboard/auditor' }: DepositFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  const [formData, setFormData] = useState({
    closingId: selectedClosingId || '',
    bankAccountId: '',
    depositDate: new Date().toISOString().split('T')[0],
  })

  const [depositSlipFile, setDepositSlipFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const selectedClosing = closings.find((c) => c.id === formData.closingId)
  const selectedBankAccount = bankAccounts.find((b) => b.id === formData.bankAccountId)

  // Fetch bank accounts on mount
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const response = await fetch('/api/bank-accounts')
        const data = await response.json()
        setBankAccounts(data.accounts || [])

        // Auto-select default account
        const defaultAccount = data.accounts?.find((a: BankAccount) => a.isDefault)
        if (defaultAccount) {
          setFormData(prev => ({ ...prev, bankAccountId: defaultAccount.id }))
        }
      } catch (error) {
        console.error('Failed to fetch bank accounts:', error)
      }
    }

    fetchBankAccounts()
  }, [])

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
      if (!formData.bankAccountId) {
        throw new Error('กรุณาเลือกบัญชีธนาคาร')
      }
      if (!depositSlipFile) {
        throw new Error('กรุณาอัพโหลดสลิปการนำฝาก')
      }
      if (!selectedBankAccount) {
        throw new Error('ไม่พบข้อมูลบัญชีธนาคาร')
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

      if (!uploadData.success || !uploadData.data?.url) {
        throw new Error('ไม่สามารถอัพโหลดสลิปได้')
      }

      // Create deposit record
      const depositResponse = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closingId: formData.closingId,
          bankName: selectedBankAccount.bankName,
          accountNumber: selectedBankAccount.accountNumber,
          bankBranch: selectedBankAccount.bankBranch,
          depositDate: formData.depositDate,
          depositSlipUrl: uploadData.data.url,
        }),
      })

      const depositData = await depositResponse.json()

      if (!depositResponse.ok) {
        throw new Error(depositData.error || 'เกิดข้อผิดพลาด')
      }

      setUploadProgress(100)

      // Success - redirect to dashboard
      router.push(redirectPath)
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
              {formatCurrency(closing.handwrittenCashCount)}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Display */}
      {selectedClosing && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-800 mb-1">เงินสดที่ต้องนำฝาก</div>
          <div className="text-3xl font-bold text-purple-900">
            {formatCurrency(selectedClosing.handwrittenCashCount)}
          </div>
          <div className="text-xs text-purple-700 mt-1">
            💰 เงินสดรอนำฝาก (เงินสด - ค่าใช้จ่าย)
          </div>
        </div>
      )}

      {/* Bank Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          บัญชีธนาคารบริษัท <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.bankAccountId}
          onChange={(e) =>
            setFormData({ ...formData, bankAccountId: e.target.value })
          }
          disabled={isLoading}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">เลือกบัญชีธนาคาร</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName} - {account.accountNumber}
              {account.isDefault && ' (บัญชีหลัก)'}
            </option>
          ))}
        </select>
        {bankAccounts.length === 0 && (
          <p className="text-sm text-red-600 mt-1">
            ⚠️ ยังไม่มีบัญชีธนาคารในระบบ กรุณาติดต่อ Admin เพื่อเพิ่มบัญชี
          </p>
        )}
      </div>

      {/* Selected Account Details */}
      {selectedBankAccount && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">ข้อมูลบัญชี</div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">ธนาคาร:</span> {selectedBankAccount.bankName}
            </p>
            <p>
              <span className="font-medium">เลขที่บัญชี:</span> {selectedBankAccount.accountNumber}
            </p>
            <p>
              <span className="font-medium">ชื่อบัญชี:</span> {selectedBankAccount.accountName}
            </p>
            {selectedBankAccount.bankBranch && (
              <p>
                <span className="font-medium">สาขา:</span> {selectedBankAccount.bankBranch}
              </p>
            )}
          </div>
        </div>
      )}

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
          href={redirectPath}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
        >
          ยกเลิก
        </a>
      </div>
    </form>
  )
}
