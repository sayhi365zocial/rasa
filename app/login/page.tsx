'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        return
      }

      // Redirect based on role
      const role = data.data.user.role
      if (role === 'STORE_STAFF') {
        router.push('/dashboard/staff')
      } else if (role === 'AUDITOR') {
        router.push('/dashboard/auditor')
      } else if (role === 'OWNER') {
        router.push('/dashboard/owner')
      } else {
        router.push('/dashboard/admin')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-lg mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MerMed Pharma</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pharmacy Sales Audit System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Email/Username Input */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                อีเมลหรือ Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="staff.rama9@mermed.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            ทดสอบระบบ (Demo Accounts)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <div className="font-medium text-gray-900">Store Staff (Rama9)</div>
                <div className="text-gray-600">staff.br001@mermed.com</div>
              </div>
              <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">Staff@2026</code>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <div className="font-medium text-gray-900">Auditor</div>
                <div className="text-gray-600">auditor@mermed.com</div>
              </div>
              <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">Auditor@2026</code>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <div className="font-medium text-gray-900">Owner</div>
                <div className="text-gray-600">owner@mermed.com</div>
              </div>
              <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">Owner@2026</code>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-900">Admin</div>
                <div className="text-gray-600">admin@mermed.com</div>
              </div>
              <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">Admin@2026</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          v1.2 © 2026 MerMed Pharma
        </p>
      </div>
    </div>
  )
}
