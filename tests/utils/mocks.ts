import { UserRole } from '@prisma/client'
import { JWTPayload } from '@/lib/auth/jwt'

/**
 * Create a mock user payload for testing
 */
export function mockUserPayload(
  role: UserRole,
  options?: {
    userId?: string
    email?: string
    branchId?: string | null
  }
): JWTPayload {
  return {
    userId: options?.userId || `user-${role.toLowerCase()}-123`,
    email: options?.email || `${role.toLowerCase()}@test.com`,
    role,
    branchId: options?.branchId !== undefined ? options.branchId : 'branch-123',
  }
}

/**
 * Mock database client for testing
 */
export const mockDb = {
  dailyClosing: {
    findUnique: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  deposit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  managerBranchAccess: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  branch: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}

/**
 * Create a mock daily closing
 */
export function mockDailyClosing(overrides?: any) {
  return {
    id: 'closing-123',
    closingDate: new Date('2024-01-15'),
    branchId: 'branch-123',
    submittedBy: 'user-staff-123',
    status: 'DRAFT',
    posTotalSales: 10000,
    posCash: 3000,
    posCredit: 5000,
    posTransfer: 2000,
    posExpenses: 500,
    handwrittenCashCount: 2500,
    handwrittenExpenses: 500,
    handwrittenNetCash: 2000,
    edcTotalAmount: 5000,
    hasDiscrepancy: false,
    ...overrides,
  }
}

/**
 * Create a mock deposit
 */
export function mockDeposit(overrides?: any) {
  return {
    id: 'deposit-123',
    dailyClosingId: 'closing-123',
    depositSlipUrl: 'https://example.com/slip.jpg',
    depositAmount: 2000,
    depositDate: new Date('2024-01-16'),
    bankName: 'Test Bank',
    accountNumber: '1234567890',
    amountMatched: true,
    depositedBy: 'user-audit-123',
    depositedAt: new Date(),
    approvalStatus: 'PENDING',
    ...overrides,
  }
}

/**
 * Create a mock manager branch access
 */
export function mockManagerAccess(overrides?: any) {
  return {
    id: 'access-123',
    userId: 'user-manager-123',
    branchId: 'branch-456',
    createdAt: new Date(),
    createdBy: 'user-owner-123',
    ...overrides,
  }
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  Object.values(mockDb).forEach(model => {
    Object.values(model).forEach(method => {
      if (typeof method === 'function' && 'mockReset' in method) {
        (method as jest.Mock).mockReset()
      }
    })
  })
}
