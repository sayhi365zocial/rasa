'use client'

import { useRouter } from 'next/navigation'

interface DashboardShellProps {
  user: {
    firstName: string
    lastName: string
    role: string
    branch?: {
      branchName: string
    } | null
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Title */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                  M
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">
                    MerMed PSARS
                  </h1>
                  {user.branch && (
                    <p className="text-xs text-gray-500">
                      สาขา: {user.branch.branchName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500">{getRoleLabel(user.role)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
                title="ออกจากระบบ"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    STORE_STAFF: 'พนักงานหน้าร้าน',
    AUDITOR: 'ผู้ตรวจสอบ',
    OWNER: 'เจ้าของ',
    ADMIN: 'ผู้ดูแลระบบ',
  }
  return labels[role] || role
}
