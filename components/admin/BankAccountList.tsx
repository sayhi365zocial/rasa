'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  bankBranch: string | null
  isDefault: boolean
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  initialAccounts: BankAccount[]
}

export function BankAccountList({ initialAccounts }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    bankBranch: '',
    isDefault: false,
  })

  const THAI_BANKS = [
    'ธนาคารกรุงไทย',
    'ธนาคารกรุงศรีอยุธยา',
    'ธนาคารออมสิน',
    'ธนาคารอาคารสงเคราะห์',
    'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
    'ธนาคารกสิกรไทย',
    'ธนาคารไทยพาณิชย์',
    'ธนาคารกรุงเทพ',
    'ธนาคารทหารไทยธนชาต',
    'ธนาคารยูโอบี',
    'ธนาคารซีไอเอ็มบีไทย',
    'ธนาคารทิสโก้',
    'ธนาคารไทยเครดิต',
    'ธนาคารแลนด์ แอนด์ เฮ้าส์',
    'ธนาคารไอซีบีซี (ไทย)',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create account')
      }

      // Reset form
      setFormData({
        bankName: '',
        accountNumber: '',
        accountName: '',
        bankBranch: '',
        isDefault: false,
      })
      setIsAdding(false)

      // Refresh data
      router.refresh()
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบบัญชีนี้หรือไม่?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/bank-accounts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      router.refresh()
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/bank-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to set default')
      }

      router.refresh()
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Add Button */}
      <div className="mb-6">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          {isAdding ? 'ยกเลิก' : '+ เพิ่มบัญชีธนาคาร'}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">เพิ่มบัญชีธนาคารใหม่</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ธนาคาร <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">เลือกธนาคาร</option>
                {THAI_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลขที่บัญชี <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                required
                placeholder="123-4-56789-0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบัญชี <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                required
                placeholder="บริษัท เมอร์เมด คลินิก จำกัด"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สาขาธนาคาร
              </label>
              <input
                type="text"
                value={formData.bankBranch}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                placeholder="สาขาราชวงศ์"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                ตั้งเป็นบัญชีหลัก
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md"
              >
                {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            ยังไม่มีบัญชีธนาคาร
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-4 ${
                account.status === 'INACTIVE'
                  ? 'bg-gray-50 border-gray-300'
                  : account.isDefault
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {account.bankName}
                    </h4>
                    {account.isDefault && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                        บัญชีหลัก
                      </span>
                    )}
                    {account.status === 'INACTIVE' && (
                      <span className="px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded">
                        ไม่ใช้งาน
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">เลขที่บัญชี:</span>{' '}
                      {account.accountNumber}
                    </p>
                    <p>
                      <span className="font-medium">ชื่อบัญชี:</span>{' '}
                      {account.accountName}
                    </p>
                    {account.bankBranch && (
                      <p>
                        <span className="font-medium">สาขา:</span>{' '}
                        {account.bankBranch}
                      </p>
                    )}
                  </div>
                </div>

                {account.status === 'ACTIVE' && (
                  <div className="flex space-x-2">
                    {!account.isDefault && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm border border-green-600 text-green-600 hover:bg-green-50 rounded-md"
                      >
                        ตั้งเป็นหลัก
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(account.id)}
                      disabled={isLoading}
                      className="px-3 py-1 text-sm border border-red-600 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
